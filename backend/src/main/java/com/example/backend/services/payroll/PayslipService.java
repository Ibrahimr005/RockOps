package com.example.backend.services.payroll;

import com.example.backend.dto.hr.attendance.AttendanceData;
import com.example.backend.dto.payroll.PayslipDTO;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.payroll.*;
import com.example.backend.repositories.payroll.PayslipRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class PayslipService {

    private final PayslipRepository payslipRepository;
    private final SalaryCalculationService salaryCalculationService;
    private final DeductionCalculationService deductionCalculationService;
    private final PayrollAttendanceService attendanceService;
    private final PayslipPdfService payslipPdfService;
    private final LoanService loanService;

    // Maximum deduction percentage (50% of gross salary)
    private static final BigDecimal MAX_DEDUCTION_PERCENTAGE = new BigDecimal("0.50");

    /**
     * ENHANCED: Generate payslip with full deduction and loan integration
     * FLOW: PayslipService → DeductionCalculationService → LoanService (for period-specific repayments)
     */
    @Transactional
    public PayslipDTO generatePayslip(Employee employee, LocalDate payPeriodStart,
                                      LocalDate payPeriodEnd, LocalDate payDate, String createdBy) {
        log.info("Generating payslip for employee {} for period {} to {} (PAYSLIP-ONLY LOAN DEDUCTIONS)",
                employee.getId(), payPeriodStart, payPeriodEnd);

        try {
            // STEP 1: Validate payslip period
            validatePayslipPeriod(payPeriodStart, payPeriodEnd);

            // STEP 2: Get attendance data for the period
            AttendanceData attendanceData = attendanceService.getAttendanceDataForPeriod(
                    employee.getId(), payPeriodStart, payPeriodEnd);

            // STEP 3: Calculate gross salary
            BigDecimal grossSalary = salaryCalculationService.calculateGrossSalary(employee, attendanceData);
            log.debug("Calculated gross salary: ${} for employee: {}", grossSalary, employee.getFullName());

            // STEP 4: Pre-validate loan affordability (before calculating all deductions)
            if (!canAffordLoanDeductionsInPeriod(employee, grossSalary, payPeriodStart, payPeriodEnd)) {
                log.warn("Employee {} cannot afford loan deductions in period {} to {} with gross salary ${}",
                        employee.getFullName(), payPeriodStart, payPeriodEnd, grossSalary);
                // Continue but log warning - DeductionCalculationService will handle limits
            }

            // STEP 5: Calculate earnings
            List<Earning> earnings = salaryCalculationService.calculateEarnings(employee, attendanceData, grossSalary);

            // STEP 6: ENHANCED - Calculate ALL deductions with payslip-period loan integration
            List<Deduction> deductions = deductionCalculationService.calculateDeductions(
                    employee, grossSalary, attendanceData, payPeriodStart, payPeriodEnd);

            // STEP 7: Log loan deductions for traceability
            List<Deduction> loanDeductions = deductions.stream()
                    .filter(d -> d.getDeductionType() != null &&
                            d.getDeductionType().getType() == DeductionType.DeductionTypeEnum.LOAN_REPAYMENT)
                    .collect(Collectors.toList());

            if (!loanDeductions.isEmpty()) {
                log.info("Processing {} loan deductions totaling ${} for employee {} in payslip period",
                        loanDeductions.size(),
                        loanDeductions.stream().map(Deduction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add),
                        employee.getFullName());
            }

            // STEP 8: Validate total deductions against 50% limit
            BigDecimal totalDeductions = deductions.stream()
                    .map(Deduction::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal maxAllowedDeductions = grossSalary.multiply(MAX_DEDUCTION_PERCENTAGE);

            if (totalDeductions.compareTo(maxAllowedDeductions) > 0) {
                log.warn("Total deductions ${} exceed 50% limit ${} for employee: {} - DeductionCalculationService should have handled this",
                        totalDeductions, maxAllowedDeductions, employee.getFullName());
            }

            // STEP 9: Calculate employer contributions
            List<EmployerContribution> employerContributions = salaryCalculationService.calculateEmployerContributions(
                    employee, grossSalary);

            // STEP 10: Calculate totals
            BigDecimal totalEarnings = earnings.stream()
                    .map(Earning::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal totalEmployerContributions = employerContributions.stream()
                    .map(EmployerContribution::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            // STEP 11: Calculate net pay
            BigDecimal netPay = grossSalary.add(totalEarnings).subtract(totalDeductions);

            // Ensure net pay is not negative
            if (netPay.compareTo(BigDecimal.ZERO) < 0) {
                log.warn("Net pay would be negative (${}) for employee: {}. Setting to zero.", netPay, employee.getFullName());
                netPay = BigDecimal.ZERO;
            }

            // STEP 12: Create payslip entity
            Payslip payslip = Payslip.builder()
                    .employee(employee)
                    .payPeriodStart(payPeriodStart)
                    .payPeriodEnd(payPeriodEnd)
                    .payDate(payDate)
                    .grossSalary(grossSalary)
                    .netPay(netPay)
                    .totalEarnings(totalEarnings)
                    .totalDeductions(totalDeductions)
                    .totalEmployerContributions(totalEmployerContributions)
                    .daysWorked(attendanceData.getDaysWorked())
                    .daysAbsent(attendanceData.getDaysAbsent())
                    .overtimeHours(attendanceData.getOvertimeHours())
                    .status(Payslip.PayslipStatus.DRAFT)
                    .createdBy(createdBy)
                    .build();

            // STEP 13: Save payslip first to get ID
            payslip = payslipRepository.save(payslip);

            // STEP 14: Set payslip reference in related entities
            final Payslip savedPayslip = payslip;
            earnings.forEach(earning -> earning.setPayslip(savedPayslip));
            deductions.forEach(deduction -> deduction.setPayslip(savedPayslip));
            employerContributions.forEach(contribution -> contribution.setPayslip(savedPayslip));

            // STEP 15: Set relationships and save
            payslip.setEarnings(earnings);
            payslip.setDeductions(deductions);
            payslip.setEmployerContributions(employerContributions);
            payslip = payslipRepository.save(payslip);

            log.info("Payslip generated successfully for employee {} - Gross: ${}, Deductions: ${}, Net Pay: ${}",
                    employee.getId(), grossSalary, totalDeductions, netPay);

            return convertToDTO(payslip);

        } catch (Exception e) {
            log.error("Error generating payslip for employee {}: {}", employee.getId(), e.getMessage(), e);
            throw new RuntimeException("Failed to generate payslip for employee: " + employee.getFullName(), e);
        }
    }

    /**
     * ENHANCED: Finalize payslip and update loan balances
     * CRITICAL: Loan balances are ONLY updated after payslip finalization
     */
    @Transactional
    public PayslipDTO finalizePayslip(UUID payslipId, String approvedBy) {
        log.info("Finalizing payslip: {} (will update loan balances)", payslipId);

        try {
            Payslip payslip = payslipRepository.findById(payslipId)
                    .orElseThrow(() -> new IllegalArgumentException("Payslip not found with ID: " + payslipId));

            if (payslip.getStatus() != Payslip.PayslipStatus.DRAFT) {
                throw new IllegalStateException("Only draft payslips can be finalized");
            }

            // STEP 1: Update payslip status
            payslip.setStatus(Payslip.PayslipStatus.APPROVED);

            // STEP 2: CRITICAL - Update loan balances and repayment schedules
            updateLoanBalancesAfterPayslipFinalization(payslip);

            // STEP 3: Generate PDF
            String pdfPath = payslipPdfService.generatePayslipPdf(payslip);
            payslip.setPdfPath(pdfPath);

            // STEP 4: Save finalized payslip
            payslip = payslipRepository.save(payslip);

            log.info("Payslip finalized successfully: {} (loan balances updated)", payslipId);

            return convertToDTO(payslip);

        } catch (Exception e) {
            log.error("Error finalizing payslip {}: {}", payslipId, e.getMessage(), e);
            throw e;
        }
    }

    /**
     * NEW: Update loan balances after payslip finalization
     * This is where loan repayments are actually processed
     */
    private void updateLoanBalancesAfterPayslipFinalization(Payslip payslip) {
        try {
            log.info("Processing loan repayments from finalized payslip: {}", payslip.getId());

            // Find loan deductions in this payslip
            List<Deduction> loanDeductions = payslip.getDeductions().stream()
                    .filter(deduction -> deduction.getDeductionType() != null &&
                            deduction.getDeductionType().getType() == DeductionType.DeductionTypeEnum.LOAN_REPAYMENT)
                    .collect(Collectors.toList());

            if (loanDeductions.isEmpty()) {
                log.debug("No loan deductions found in payslip: {}", payslip.getId());
                return;
            }

            log.info("Found {} loan deductions to process for payslip: {} (total: ${})",
                    loanDeductions.size(),
                    payslip.getId(),
                    loanDeductions.stream().map(Deduction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add));

            // Process loan deductions through LoanService
            loanService.processLoanDeductionsFromPayslip(
                    payslip.getId(),
                    loanDeductions,
                    payslip.getPayPeriodStart(),
                    payslip.getPayPeriodEnd()
            );

            log.info("Successfully processed loan deductions for payslip: {}", payslip.getId());

        } catch (Exception e) {
            log.error("Error updating loan balances for payslip {}: {}", payslip.getId(), e.getMessage());
            // Don't fail payslip finalization if loan update fails, but log error
            throw new RuntimeException("Failed to update loan balances after payslip finalization", e);
        }
    }

    /**
     * NEW: Check if employee can afford loan deductions in the payslip period
     */
    private boolean canAffordLoanDeductionsInPeriod(Employee employee, BigDecimal grossSalary,
                                                    LocalDate payPeriodStart, LocalDate payPeriodEnd) {
        try {
            return deductionCalculationService.canAffordLoanDeductions(
                    employee, grossSalary, payPeriodStart, payPeriodEnd);
        } catch (Exception e) {
            log.warn("Error checking loan affordability for employee {}: {}", employee.getId(), e.getMessage());
            return false;
        }
    }

    /**
     * Validate payslip period
     */
    private void validatePayslipPeriod(LocalDate periodStart, LocalDate periodEnd) {
        if (periodStart == null || periodEnd == null) {
            throw new IllegalArgumentException("Payslip period start and end dates are required");
        }

        if (periodStart.isAfter(periodEnd)) {
            throw new IllegalArgumentException("Payslip period start date cannot be after end date");
        }

        if (periodStart.isBefore(LocalDate.now().minusYears(1))) {
            throw new IllegalArgumentException("Payslip period cannot be more than 1 year in the past");
        }

        // Ensure period is not too long (max 3 months)
        if (ChronoUnit.MONTHS.between(periodStart, periodEnd) > 3) {
            throw new IllegalArgumentException("Payslip period cannot exceed 3 months");
        }
    }

    /**
     * Get payslip with loan deduction summary
     */
    public PayslipDTO getPayslipWithLoanSummary(UUID payslipId) {
        log.debug("Getting payslip with loan summary: {}", payslipId);

        Payslip payslip = payslipRepository.findById(payslipId)
                .orElseThrow(() -> new IllegalArgumentException("Payslip not found with ID: " + payslipId));

        PayslipDTO payslipDTO = convertToDTO(payslip);

        // Add loan deduction summary
        List<Deduction> loanDeductions = payslip.getDeductions().stream()
                .filter(d -> d.getDeductionType() != null &&
                        d.getDeductionType().getType() == DeductionType.DeductionTypeEnum.LOAN_REPAYMENT)
                .collect(Collectors.toList());

        if (!loanDeductions.isEmpty()) {
            Map<String, Object> loanSummary = deductionCalculationService.getLoanDeductionSummary(
                    payslip.getEmployee(), payslip.getPayPeriodStart(), payslip.getPayPeriodEnd());

            // Add to DTO (you might need to extend PayslipDTO to include this)
            log.debug("Loan deduction summary for payslip {}: {}", payslipId, loanSummary);
        }

        return payslipDTO;
    }

    // FIXED: Compatible methods for controller
    public Page<PayslipDTO> getPayslips(Pageable pageable) {
        log.debug("Getting all payslips with pagination");
        return payslipRepository.findAll(pageable).map(this::convertToDTO);
    }

    public PayslipDTO getPayslipById(UUID payslipId) {
        log.debug("Getting payslip by ID: {}", payslipId);
        Payslip payslip = payslipRepository.findById(payslipId)
                .orElseThrow(() -> new IllegalArgumentException("Payslip not found with ID: " + payslipId));
        return convertToDTO(payslip);
    }

    public Page<PayslipDTO> getPayslipsForEmployee(UUID employeeId, Pageable pageable) {
        log.debug("Getting payslips for employee: {}", employeeId);
        return payslipRepository.findByEmployeeIdOrderByPayDateDesc(employeeId, pageable)
                .map(this::convertToDTO);
    }

    // FIXED: Method signature to match controller
    public Page<PayslipDTO> getPayslipsByEmployee(UUID employeeId, Pageable pageable) {
        return getPayslipsForEmployee(employeeId, pageable);
    }

    public Page<PayslipDTO> getPayslipsByPeriod(LocalDate startDate, LocalDate endDate, Pageable pageable) {
        log.debug("Getting payslips by period: {} to {} with pagination", startDate, endDate);

        try {
            if (startDate == null || endDate == null) {
                throw new IllegalArgumentException("Start date and end date are required");
            }

            if (startDate.isAfter(endDate)) {
                throw new IllegalArgumentException("Start date cannot be after end date");
            }

            Page<Payslip> payslipsPage = payslipRepository.findByPayPeriodStartBetweenOrderByPayDateDesc(
                    startDate, endDate, pageable);

            return payslipsPage.map(this::convertToDTO);

        } catch (Exception e) {
            log.error("Error getting payslips by period {} to {}: {}", startDate, endDate, e.getMessage());
            throw e;
        }
    }

    // FIXED: Method signatures to match controller expectations
    public String getPayslipStatus(UUID payslipId) {
        log.debug("Getting status for payslip: {}", payslipId);

        try {
            Payslip payslip = payslipRepository.findById(payslipId)
                    .orElseThrow(() -> new IllegalArgumentException("Payslip not found with ID: " + payslipId));

            return payslip.getStatus().name();

        } catch (Exception e) {
            log.error("Error getting payslip status for {}: {}", payslipId, e.getMessage());
            throw e;
        }
    }

    // FIXED: Method signature to match controller
    @Transactional
    public PayslipDTO updatePayslipStatus(UUID payslipId, String newStatus) {
        log.info("Updating payslip {} status to: {}", payslipId, newStatus);

        try {
            Payslip payslip = payslipRepository.findById(payslipId)
                    .orElseThrow(() -> new IllegalArgumentException("Payslip not found with ID: " + payslipId));

            // Validate status transition
            Payslip.PayslipStatus currentStatus = payslip.getStatus();
            Payslip.PayslipStatus targetStatus = Payslip.PayslipStatus.valueOf(newStatus);

            validateStatusTransition(currentStatus, targetStatus);

            // Update status and timestamps
            payslip.setStatus(targetStatus);

            // Set appropriate timestamps based on status
            switch (targetStatus) {
                case SENT:
                    if (payslip.getSentAt() == null) {
                        payslip.setSentAt(LocalDateTime.now());
                    }
                    break;
                case ACKNOWLEDGED:
                    if (payslip.getAcknowledgedAt() == null) {
                        payslip.setAcknowledgedAt(LocalDateTime.now());
                    }
                    break;
            }

            payslip = payslipRepository.save(payslip);

            log.info("Payslip {} status updated from {} to {}", payslipId, currentStatus, targetStatus);

            return convertToDTO(payslip);

        } catch (Exception e) {
            log.error("Error updating payslip {} status: {}", payslipId, e.getMessage());
            throw e;
        }
    }

    // FIXED: Method signature to match controller
    public Page<PayslipDTO> getPayslipsByStatus(Payslip.PayslipStatus status, Pageable pageable) {
        log.debug("Getting payslips by status: {} with pagination", status);

        return payslipRepository.findByStatusOrderByPayDateDesc(status, pageable)
                .map(this::convertToDTO);
    }

    // FIXED: Overloaded method for controller that accepts String
    public Page<PayslipDTO> getPayslipsByStatus(String status, Pageable pageable) {
        Payslip.PayslipStatus payslipStatus = Payslip.PayslipStatus.valueOf(status);
        return getPayslipsByStatus(payslipStatus, pageable);
    }

    public List<PayslipDTO> getPendingPayslips() {
        log.debug("Getting pending payslips");

        List<Payslip> draftPayslips = payslipRepository.findByStatusOrderByPayDateDesc(Payslip.PayslipStatus.DRAFT);
        List<Payslip> approvedPayslips = payslipRepository.findByStatusOrderByPayDateDesc(Payslip.PayslipStatus.APPROVED);

        List<Payslip> allPending = new ArrayList<>();
        allPending.addAll(draftPayslips);
        allPending.addAll(approvedPayslips);

        return allPending.stream()
                .sorted((p1, p2) -> p2.getCreatedAt().compareTo(p1.getCreatedAt()))
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    // FIXED: Methods that return Page instead of List for controller compatibility
    public Page<PayslipDTO> getSentPayslips(Pageable pageable) {
        log.debug("Getting sent payslips");
        return getPayslipsByStatus(Payslip.PayslipStatus.SENT, pageable);
    }

    public Page<PayslipDTO> getAcknowledgedPayslips(Pageable pageable) {
        log.debug("Getting acknowledged payslips");
        return getPayslipsByStatus(Payslip.PayslipStatus.ACKNOWLEDGED, pageable);
    }

    @Transactional
    public String generatePayslipPdf(UUID payslipId) {
        log.info("Generating PDF for payslip: {}", payslipId);

        try {
            Payslip payslip = payslipRepository.findById(payslipId)
                    .orElseThrow(() -> new IllegalArgumentException("Payslip not found with ID: " + payslipId));

            if (payslip.getStatus() == Payslip.PayslipStatus.DRAFT) {
                throw new IllegalStateException("Cannot generate PDF for draft payslips");
            }

            // Generate PDF using PDF service
            String pdfPath = payslipPdfService.generatePayslipPdf(payslip);

            // Update payslip with PDF path
            payslip.setPdfPath(pdfPath);
            payslipRepository.save(payslip);

            log.info("PDF generated successfully for payslip: {} at path: {}", payslipId, pdfPath);

            return pdfPath;

        } catch (Exception e) {
            log.error("Error generating PDF for payslip {}: {}", payslipId, e.getMessage());
            throw e;
        }
    }

    // FIXED: Method signature to match controller
    @Transactional
    public void acknowledgePayslip(UUID payslipId) {
        log.info("Acknowledging payslip: {}", payslipId);

        try {
            Payslip payslip = payslipRepository.findById(payslipId)
                    .orElseThrow(() -> new IllegalArgumentException("Payslip not found with ID: " + payslipId));

            if (payslip.getStatus() != Payslip.PayslipStatus.SENT) {
                throw new IllegalStateException("Only sent payslips can be acknowledged");
            }

            payslip.setStatus(Payslip.PayslipStatus.ACKNOWLEDGED);
            payslip.setAcknowledgedAt(LocalDateTime.now());

            payslipRepository.save(payslip);

            log.info("Payslip acknowledged successfully: {}", payslipId);

        } catch (Exception e) {
            log.error("Error acknowledging payslip {}: {}", payslipId, e.getMessage());
            throw e;
        }
    }

    public byte[] downloadPayslipPdf(UUID payslipId) {
        log.info("Downloading PDF for payslip: {}", payslipId);

        try {
            Payslip payslip = payslipRepository.findById(payslipId)
                    .orElseThrow(() -> new IllegalArgumentException("Payslip not found with ID: " + payslipId));

            if (payslip.getPdfPath() == null || payslip.getPdfPath().isEmpty()) {
                // Generate PDF if it doesn't exist
                generatePayslipPdf(payslipId);
                // Refresh payslip to get updated PDF path
                payslip = payslipRepository.findById(payslipId).orElseThrow();
            }

            // Download PDF file using PDF service
            byte[] pdfBytes = payslipPdfService.downloadPdf(payslip.getPdfPath());

            log.info("PDF downloaded successfully for payslip: {}", payslipId);

            return pdfBytes;

        } catch (Exception e) {
            log.error("Error downloading PDF for payslip {}: {}", payslipId, e.getMessage());
            throw e;
        }
    }

    // FIXED: Method signature to match controller
    @Transactional
    public List<String> bulkGeneratePdfs(List<UUID> payslipIds) {
        log.info("Bulk generating PDFs for {} payslips", payslipIds.size());

        List<String> results = new ArrayList<>();

        for (UUID payslipId : payslipIds) {
            try {
                String pdfPath = generatePayslipPdf(payslipId);
                results.add("SUCCESS: " + payslipId + " -> " + pdfPath);
            } catch (Exception e) {
                log.error("Failed to generate PDF for payslip {}: {}", payslipId, e.getMessage());
                results.add("FAILED: " + payslipId + " -> " + e.getMessage());
            }
        }

        log.info("Bulk PDF generation completed: {} success, {} failed",
                results.stream().filter(r -> r.startsWith("SUCCESS")).count(),
                results.stream().filter(r -> r.startsWith("FAILED")).count());

        return results;
    }

    // FIXED: Method signature to match controller
    public Page<PayslipDTO> searchPayslips(Object searchCriteria, Pageable pageable) {
        log.debug("Searching payslips with criteria: {}", searchCriteria);

        try {
            // For now, return all payslips - you can implement proper search logic
            // based on your searchCriteria object structure
            return payslipRepository.findAll(pageable).map(this::convertToDTO);

        } catch (Exception e) {
            log.error("Error searching payslips: {}", e.getMessage());
            throw e;
        }
    }

    // FIXED: Method signature to match controller
    @Transactional
    public PayslipDTO regeneratePayslip(UUID payslipId) {
        log.info("Regenerating payslip: {}", payslipId);

        try {
            Payslip originalPayslip = payslipRepository.findById(payslipId)
                    .orElseThrow(() -> new IllegalArgumentException("Payslip not found with ID: " + payslipId));

            if (originalPayslip.getStatus() == Payslip.PayslipStatus.ACKNOWLEDGED) {
                throw new IllegalStateException("Cannot regenerate acknowledged payslips");
            }

            // Delete the original payslip
            payslipRepository.delete(originalPayslip);

            // Generate new payslip with same parameters
            PayslipDTO newPayslip = generatePayslip(
                    originalPayslip.getEmployee(),
                    originalPayslip.getPayPeriodStart(),
                    originalPayslip.getPayPeriodEnd(),
                    originalPayslip.getPayDate(),
                    "REGENERATED"
            );

            log.info("Payslip regenerated successfully: old={}, new={}", payslipId, newPayslip.getId());

            return newPayslip;

        } catch (Exception e) {
            log.error("Error regenerating payslip {}: {}", payslipId, e.getMessage());
            throw e;
        }
    }

    // FIXED: Method signature to match controller
    @Transactional
    public void cancelPayslip(UUID payslipId) {
        log.info("Cancelling payslip: {}", payslipId);

        try {
            Payslip payslip = payslipRepository.findById(payslipId)
                    .orElseThrow(() -> new IllegalArgumentException("Payslip not found with ID: " + payslipId));

            if (payslip.getStatus() == Payslip.PayslipStatus.ACKNOWLEDGED) {
                throw new IllegalStateException("Cannot cancel acknowledged payslips");
            }

            // Delete the payslip
            payslipRepository.delete(payslip);

            log.info("Payslip cancelled successfully: {}", payslipId);

        } catch (Exception e) {
            log.error("Error cancelling payslip {}: {}", payslipId, e.getMessage());
            throw e;
        }
    }

    // FIXED: Method signature to match controller
    public byte[] exportPayslips(LocalDate startDate, LocalDate endDate, String format) {
        log.info("Exporting payslips from {} to {} in {} format", startDate, endDate, format);

        // For now, return empty byte array - implement actual export logic
        return new byte[0];
    }

    @Transactional
    public void deletePayslip(UUID payslipId) {
        log.info("Deleting payslip: {}", payslipId);
        try {
            Payslip payslip = payslipRepository.findById(payslipId)
                    .orElseThrow(() -> new IllegalArgumentException("Payslip not found with ID: " + payslipId));

            if (payslip.getStatus() != Payslip.PayslipStatus.DRAFT) {
                throw new IllegalStateException("Only draft payslips can be deleted");
            }

            payslipRepository.delete(payslip);
            log.info("Payslip deleted successfully: {}", payslipId);
        } catch (Exception e) {
            log.error("Error deleting payslip {}: {}", payslipId, e.getMessage());
            throw e;
        }
    }

    @Transactional
    public PayslipDTO sendPayslip(UUID payslipId) {
        log.info("Sending payslip: {}", payslipId);
        try {
            Payslip payslip = payslipRepository.findById(payslipId)
                    .orElseThrow(() -> new IllegalArgumentException("Payslip not found with ID: " + payslipId));

            if (payslip.getStatus() != Payslip.PayslipStatus.APPROVED) {
                throw new IllegalStateException("Only approved payslips can be sent");
            }

            // Update status and timestamp
            payslip.setStatus(Payslip.PayslipStatus.SENT);
            payslip.setSentAt(LocalDateTime.now());

            // Send notification to employee (implement email/notification service)
            // notificationService.sendPayslipNotification(payslip);

            payslip = payslipRepository.save(payslip);

            log.info("Payslip sent successfully: {}", payslipId);
            return convertToDTO(payslip);

        } catch (Exception e) {
            log.error("Error sending payslip {}: {}", payslipId, e.getMessage());
            throw e;
        }
    }

    /**
     * Validate status transition
     */
    private void validateStatusTransition(Payslip.PayslipStatus currentStatus, Payslip.PayslipStatus newStatus) {
        // Define valid transitions
        Map<Payslip.PayslipStatus, List<Payslip.PayslipStatus>> validTransitions = Map.of(
                Payslip.PayslipStatus.DRAFT, List.of(Payslip.PayslipStatus.APPROVED),
                Payslip.PayslipStatus.APPROVED, List.of(Payslip.PayslipStatus.SENT),
                Payslip.PayslipStatus.SENT, List.of(Payslip.PayslipStatus.ACKNOWLEDGED)
        );

        List<Payslip.PayslipStatus> allowedStatuses = validTransitions.get(currentStatus);

        if (allowedStatuses == null || !allowedStatuses.contains(newStatus)) {
            throw new IllegalStateException(
                    String.format("Invalid status transition from %s to %s", currentStatus, newStatus));
        }
    }

    private boolean canPayslipBeModified(Payslip.PayslipStatus status) {
        return status == Payslip.PayslipStatus.DRAFT || status == Payslip.PayslipStatus.APPROVED;
    }

    /**
     * Get payslip status info
     */
    public Map<String, Object> getPayslipStatusInfo(UUID payslipId) {
        log.debug("Getting status info for payslip: {}", payslipId);

        Map<String, Object> statusInfo = new HashMap<>();

        try {
            Optional<Payslip> payslipOpt = payslipRepository.findById(payslipId);

            if (payslipOpt.isPresent()) {
                Payslip payslip = payslipOpt.get();
                statusInfo.put("exists", true);
                statusInfo.put("status", payslip.getStatus().name());
                statusInfo.put("statusDescription", getStatusDescription(payslip.getStatus()));
                statusInfo.put("lastUpdated", payslip.getUpdatedAt());
                statusInfo.put("canBeModified", canPayslipBeModified(payslip.getStatus()));
            } else {
                statusInfo.put("exists", false);
                statusInfo.put("status", null);
                statusInfo.put("statusDescription", "Payslip not found");
                statusInfo.put("canBeModified", false);
            }

            return statusInfo;

        } catch (Exception e) {
            log.error("Error getting payslip status info for {}: {}", payslipId, e.getMessage());
            statusInfo.put("exists", false);
            statusInfo.put("error", e.getMessage());
            return statusInfo;
        }
    }

    /**
     * Advanced search with pagination
     */
    public Page<PayslipDTO> searchPayslips(String employeeName, Payslip.PayslipStatus status,
                                           LocalDate startDate, LocalDate endDate,
                                           BigDecimal minAmount, BigDecimal maxAmount,
                                           Pageable pageable) {
        log.debug("Searching payslips with pagination: employee={}, status={}, period={} to {}, amount={} to {}",
                employeeName, status, startDate, endDate, minAmount, maxAmount);

        try {
            // Validate date range if both provided
            if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
                throw new IllegalArgumentException("Start date cannot be after end date");
            }

            // Validate amount range if both provided
            if (minAmount != null && maxAmount != null && minAmount.compareTo(maxAmount) > 0) {
                throw new IllegalArgumentException("Minimum amount cannot be greater than maximum amount");
            }

            Page<Payslip> payslipsPage = payslipRepository.searchPayslips(
                    employeeName, status, startDate, endDate, minAmount, maxAmount, pageable);

            return payslipsPage.map(this::convertToDTO);

        } catch (Exception e) {
            log.error("Error searching payslips with pagination: {}", e.getMessage());
            throw e;
        }
    }

    /**
     * Get count of payslips matching search criteria
     */
    public long countPayslipsBySearchCriteria(String employeeName, Payslip.PayslipStatus status,
                                              LocalDate startDate, LocalDate endDate,
                                              BigDecimal minAmount, BigDecimal maxAmount) {
        log.debug("Counting payslips by search criteria");

        try {
            List<Payslip> matchingPayslips = payslipRepository.searchPayslips(
                    employeeName, status, startDate, endDate, minAmount, maxAmount);

            return matchingPayslips.size();

        } catch (Exception e) {
            log.error("Error counting payslips by search criteria: {}", e.getMessage());
            return 0;
        }
    }

    // Helper methods
    private String getStatusDescription(Payslip.PayslipStatus status) {
        switch (status) {
            case DRAFT:
                return "Draft - Not yet approved";
            case APPROVED:
                return "Approved - Ready to be sent";
            case SENT:
                return "Sent - Delivered to employee";
            case ACKNOWLEDGED:
                return "Acknowledged - Confirmed by employee";
            default:
                return "Unknown status";
        }
    }

    /**
     * ENHANCED: Convert Payslip entity to DTO with detailed deduction information
     */
    private PayslipDTO convertToDTO(Payslip payslip) {
        return PayslipDTO.builder()
                .id(payslip.getId())
                .employeeId(payslip.getEmployee().getId())
                .employeeName(payslip.getEmployee().getFullName())
                .jobPositionName(payslip.getEmployee().getJobPosition() != null ?
                        payslip.getEmployee().getJobPosition().getPositionName() : "")
                .departmentName(payslip.getEmployee().getJobPosition() != null &&
                        payslip.getEmployee().getJobPosition().getDepartment() != null ?
                        payslip.getEmployee().getJobPosition().getDepartment().getName() : "")
                .payPeriodStart(payslip.getPayPeriodStart())
                .payPeriodEnd(payslip.getPayPeriodEnd())
                .payDate(payslip.getPayDate())
                .grossSalary(payslip.getGrossSalary())
                .netPay(payslip.getNetPay())
                .totalEarnings(payslip.getTotalEarnings())
                .totalDeductions(payslip.getTotalDeductions())
                .totalEmployerContributions(payslip.getTotalEmployerContributions())
                .daysWorked(payslip.getDaysWorked())
                .daysAbsent(payslip.getDaysAbsent())
                .overtimeHours(payslip.getOvertimeHours())
                .status(payslip.getStatus().name())
                .pdfPath(payslip.getPdfPath())
                .generatedAt(payslip.getGeneratedAt())
                .sentAt(payslip.getSentAt())
                .acknowledgedAt(payslip.getAcknowledgedAt())
                .createdBy(payslip.getCreatedBy())
                .build();
    }
}