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
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PayslipService {

    private final PayslipRepository payslipRepository;
    private final SalaryCalculationService salaryCalculationService;
    private final DeductionCalculationService deductionCalculationService;
    private final PayrollAttendanceService attendanceService;
    private final PayslipPdfService payslipPdfService;

    /**
     * Generate payslip for an employee
     */
    @Transactional
    public PayslipDTO generatePayslip(Employee employee, LocalDate payPeriodStart,
                                      LocalDate payPeriodEnd, LocalDate payDate, String createdBy) {
        log.info("Generating payslip for employee {} for period {} to {}",
                employee.getId(), payPeriodStart, payPeriodEnd);

        // Get attendance data for the period
        AttendanceData attendanceData = attendanceService.getAttendanceDataForPeriod(
                employee.getId(), payPeriodStart, payPeriodEnd);

        // Calculate gross salary
        BigDecimal grossSalary = salaryCalculationService.calculateGrossSalary(employee, attendanceData);

        // Calculate earnings
        List<Earning> earnings = salaryCalculationService.calculateEarnings(employee, attendanceData, grossSalary);

        // Calculate deductions
        List<Deduction> deductions = deductionCalculationService.calculateDeductions(
                employee, grossSalary, attendanceData, payPeriodStart, payPeriodEnd);

        // Calculate employer contributions
        List<EmployerContribution> employerContributions = salaryCalculationService.calculateEmployerContributions(
                employee, grossSalary);

        // Calculate totals
        BigDecimal totalEarnings = earnings.stream()
                .map(Earning::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalDeductions = deductions.stream()
                .map(Deduction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalEmployerContributions = employerContributions.stream()
                .map(EmployerContribution::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal netPay = grossSalary.add(totalEarnings).subtract(totalDeductions);

        // Create payslip
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

        // Save payslip
        payslip = payslipRepository.save(payslip);

        // Set payslip reference in related entities
        final Payslip savedPayslip = payslip;
        earnings.forEach(earning -> earning.setPayslip(savedPayslip));
        deductions.forEach(deduction -> deduction.setPayslip(savedPayslip));
        employerContributions.forEach(contribution -> contribution.setPayslip(savedPayslip));

        // Set the relationships
        payslip.setEarnings(earnings);
        payslip.setDeductions(deductions);
        payslip.setEmployerContributions(employerContributions);

        // Save again to persist relationships
        payslip = payslipRepository.save(payslip);

        log.info("Payslip generated successfully for employee {}", employee.getId());

        return convertToDTO(payslip);
    }

    /**
     * Get all payslips with pagination
     */
    public Page<PayslipDTO> getPayslips(Pageable pageable) {
        log.info("Getting all payslips with pagination");
        return payslipRepository.findAll(pageable)
                .map(this::convertToDTO);
    }

    /**
     * Get payslip by ID
     */
    public PayslipDTO getPayslipById(UUID payslipId) {
        log.info("Getting payslip by ID: {}", payslipId);
        Payslip payslip = payslipRepository.findById(payslipId)
                .orElseThrow(() -> new RuntimeException("Payslip not found"));
        return convertToDTO(payslip);
    }

    /**
     * Get payslips by employee with pagination
     */
    public Page<PayslipDTO> getPayslipsByEmployee(UUID employeeId, Pageable pageable) {
        log.info("Getting payslips for employee: {}", employeeId);
        return payslipRepository.findByEmployeeId(employeeId, pageable)
                .map(this::convertToDTO);
    }

    /**
     * Get payslips by period with pagination
     */
    public Page<PayslipDTO> getPayslipsByPeriod(LocalDate startDate, LocalDate endDate, Pageable pageable) {
        log.info("Getting payslips for period: {} to {}", startDate, endDate);
        return payslipRepository.findByPayPeriodStartBetween(startDate, endDate, pageable)
                .map(this::convertToDTO);
    }

    /**
     * Get payslips by status
     */
    public Page<PayslipDTO> getPayslipsByStatus(String status, Pageable pageable) {
        log.info("Getting payslips with status: {}", status);
        Payslip.PayslipStatus payslipStatus = Payslip.PayslipStatus.valueOf(status);
        return payslipRepository.findByStatus(payslipStatus, pageable)
                .map(this::convertToDTO);
    }

    /**
     * Get payslip status
     */
    public String getPayslipStatus(UUID payslipId) {
        log.info("Getting status for payslip: {}", payslipId);
        Payslip payslip = payslipRepository.findById(payslipId)
                .orElseThrow(() -> new RuntimeException("Payslip not found"));
        return payslip.getStatus().name();
    }

    /**
     * Update payslip status
     */
    @Transactional
    public PayslipDTO updatePayslipStatus(UUID payslipId, String status) {
        log.info("Updating payslip {} status to: {}", payslipId, status);
        Payslip payslip = payslipRepository.findById(payslipId)
                .orElseThrow(() -> new RuntimeException("Payslip not found"));

        payslip.setStatus(Payslip.PayslipStatus.valueOf(status));
        payslip = payslipRepository.save(payslip);

        return convertToDTO(payslip);
    }

    /**
     * Get pending payslips
     */
    public List<PayslipDTO> getPendingPayslips() {
        log.info("Getting pending payslips");
        return payslipRepository.findByStatus(Payslip.PayslipStatus.DRAFT)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get sent payslips with pagination
     */
    public Page<PayslipDTO> getSentPayslips(Pageable pageable) {
        log.info("Getting sent payslips");
        return payslipRepository.findByStatus(Payslip.PayslipStatus.SENT, pageable)
                .map(this::convertToDTO);
    }

    /**
     * Get acknowledged payslips with pagination
     */
    public Page<PayslipDTO> getAcknowledgedPayslips(Pageable pageable) {
        log.info("Getting acknowledged payslips");
        return payslipRepository.findByStatus(Payslip.PayslipStatus.ACKNOWLEDGED, pageable)
                .map(this::convertToDTO);
    }

    /**
     * Generate PDF for payslip
     */
    @Transactional
    public String generatePayslipPdf(UUID payslipId) {
        log.info("Generating PDF for payslip: {}", payslipId);
        Payslip payslip = payslipRepository.findById(payslipId)
                .orElseThrow(() -> new RuntimeException("Payslip not found"));

        String pdfPath = payslipPdfService.generatePayslipPdf(payslip);

        payslip.setPdfPath(pdfPath);
        payslip.setStatus(Payslip.PayslipStatus.GENERATED);
        payslip.setGeneratedAt(LocalDateTime.now());

        payslipRepository.save(payslip);

        return pdfPath;
    }

    /**
     * Send payslip via email
     */
    @Transactional
    public void sendPayslipEmail(UUID payslipId) {
        log.info("Sending payslip email for: {}", payslipId);
        Payslip payslip = payslipRepository.findById(payslipId)
                .orElseThrow(() -> new RuntimeException("Payslip not found"));

        if (payslip.getStatus() != Payslip.PayslipStatus.GENERATED) {
            throw new RuntimeException("Payslip PDF must be generated before sending");
        }

        // Send email (implement when EmailService is ready)
        // emailService.sendPayslipEmail(payslip);

        payslip.setStatus(Payslip.PayslipStatus.SENT);
        payslip.setSentAt(LocalDateTime.now());

        payslipRepository.save(payslip);
    }

    /**
     * Mark payslip as acknowledged
     */
    @Transactional
    public void acknowledgePayslip(UUID payslipId) {
        log.info("Acknowledging payslip: {}", payslipId);
        Payslip payslip = payslipRepository.findById(payslipId)
                .orElseThrow(() -> new RuntimeException("Payslip not found"));

        payslip.setStatus(Payslip.PayslipStatus.ACKNOWLEDGED);
        payslip.setAcknowledgedAt(LocalDateTime.now());

        payslipRepository.save(payslip);
    }

    /**
     * Download payslip PDF
     */
    public byte[] downloadPayslipPdf(UUID payslipId) {
        log.info("Downloading PDF for payslip: {}", payslipId);
        Payslip payslip = payslipRepository.findById(payslipId)
                .orElseThrow(() -> new RuntimeException("Payslip not found"));

        if (payslip.getPdfPath() == null) {
            throw new RuntimeException("PDF not generated for this payslip");
        }

        // Read the PDF file and return as byte array
        // This would typically involve file system operations
        // For now, return empty byte array
        return new byte[0];
    }

    /**
     * Bulk generate PDFs for multiple payslips
     */
    @Transactional
    public void bulkGeneratePdfs(List<UUID> payslipIds) {
        log.info("Bulk generating PDFs for {} payslips", payslipIds.size());

        for (UUID payslipId : payslipIds) {
            try {
                generatePayslipPdf(payslipId);
            } catch (Exception e) {
                log.error("Error generating PDF for payslip {}: {}", payslipId, e.getMessage());
            }
        }
    }

    /**
     * Bulk send emails for multiple payslips
     */
    @Transactional
    public void bulkSendEmails(List<UUID> payslipIds) {
        log.info("Bulk sending emails for {} payslips", payslipIds.size());

        for (UUID payslipId : payslipIds) {
            try {
                sendPayslipEmail(payslipId);
            } catch (Exception e) {
                log.error("Error sending email for payslip {}: {}", payslipId, e.getMessage());
            }
        }
    }

    /**
     * Search payslips based on criteria
     */
    public Page<PayslipDTO> searchPayslips(Object searchCriteria, Pageable pageable) {
        log.info("Searching payslips with criteria: {}", searchCriteria);

        // For now, return all payslips
        // In a real implementation, you would parse the searchCriteria
        // and build a dynamic query
        return payslipRepository.findAll(pageable)
                .map(this::convertToDTO);
    }

    /**
     * Regenerate payslip
     */
    @Transactional
    public PayslipDTO regeneratePayslip(UUID payslipId) {
        log.info("Regenerating payslip: {}", payslipId);
        Payslip payslip = payslipRepository.findById(payslipId)
                .orElseThrow(() -> new RuntimeException("Payslip not found"));

        // Reset status to draft
        payslip.setStatus(Payslip.PayslipStatus.DRAFT);
        payslip.setPdfPath(null);
        payslip.setGeneratedAt(null);
        payslip.setSentAt(null);
        payslip.setAcknowledgedAt(null);

        payslip = payslipRepository.save(payslip);

        return convertToDTO(payslip);
    }

    /**
     * Cancel payslip
     */
    @Transactional
    public void cancelPayslip(UUID payslipId) {
        log.info("Cancelling payslip: {}", payslipId);
        Payslip payslip = payslipRepository.findById(payslipId)
                .orElseThrow(() -> new RuntimeException("Payslip not found"));

        // Only allow cancellation if not yet sent
        if (payslip.getStatus() == Payslip.PayslipStatus.SENT ||
                payslip.getStatus() == Payslip.PayslipStatus.ACKNOWLEDGED) {
            throw new RuntimeException("Cannot cancel payslip that has been sent or acknowledged");
        }

        payslipRepository.delete(payslip);
    }

    /**
     * Export payslips to Excel or CSV
     */
    public byte[] exportPayslips(LocalDate startDate, LocalDate endDate, String format) {
        log.info("Exporting payslips from {} to {} in {} format", startDate, endDate, format);

        List<Payslip> payslips = payslipRepository.findByPayPeriodStartBetweenOrderByPayDateDesc(startDate, endDate);

        // Generate export data based on format
        // This would typically involve a library like Apache POI for Excel
        // For now, return empty byte array
        return new byte[0];
    }

    private PayslipDTO convertToDTO(Payslip payslip) {
        return PayslipDTO.builder()
                .id(payslip.getId())
                .employeeId(payslip.getEmployee().getId())
                .employeeName(payslip.getEmployee().getFirstName() + " " + payslip.getEmployee().getLastName())
                .employeeEmail(payslip.getEmployee().getEmail())
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
                .build();
    }
}