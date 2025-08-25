package com.example.backend.services.payroll;

import com.example.backend.dto.payroll.PayrollReportDTO;
import com.example.backend.dto.payroll.PayslipDTO;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.payroll.Payslip;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.payroll.PayslipRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PayrollService {

    private final PayslipRepository payslipRepository;
    private final EmployeeRepository employeeRepository;
    private final PayslipService payslipService;

    /**
     * Generate payslips for all active employees for a given period
     */
    @Transactional
    public List<PayslipDTO> generateMonthlyPayslips(YearMonth payPeriod, String createdBy) {
        log.info("Generating monthly payslips for period: {}", payPeriod);

        LocalDate payPeriodStart = payPeriod.atDay(1);
        LocalDate payPeriodEnd = payPeriod.atEndOfMonth();
        LocalDate payDate = payPeriodEnd.plusDays(1); // Pay on first day of next month

        // Get LIST of active employees
        List<Employee> activeEmployees = employeeRepository.findByStatus("ACTIVE");

        if (activeEmployees.isEmpty()) {
            log.warn("No active employees found for payroll generation");
            return List.of(); // Return empty list instead of null
        }

        log.info("Found {} active employees for payroll generation", activeEmployees.size());

        return activeEmployees.stream()
                .map(employee -> {
                    try {
                        // Check if payslip already exists
                        if (payslipRepository.existsByEmployeeIdAndPayPeriodStartAndPayPeriodEnd(
                                employee.getId(), payPeriodStart, payPeriodEnd)) {
                            log.warn("Payslip already exists for employee {} for period {}",
                                    employee.getId(), payPeriod);
                            return null;
                        }

                        log.info("Generating payslip for employee: {} {}",
                                employee.getFirstName(), employee.getLastName());

                        return payslipService.generatePayslip(employee, payPeriodStart, payPeriodEnd, payDate, createdBy);
                    } catch (Exception e) {
                        log.error("Error generating payslip for employee {} ({}): {}",
                                employee.getId(), employee.getFirstName() + " " + employee.getLastName(), e.getMessage());
                        // Don't throw here - continue processing other employees
                        return null;
                    }
                })
                .filter(payslip -> payslip != null)
                .collect(Collectors.toList());
    }

    /**
     * Get payroll report for a specific period
     */
    public PayrollReportDTO getPayrollReport(LocalDate startDate, LocalDate endDate) {
        log.info("Generating payroll report for period: {} to {}", startDate, endDate);

        List<Payslip> payslips = payslipRepository.findByPayPeriodStartBetweenOrderByPayDateDesc(startDate, endDate);

        BigDecimal totalGrossPayroll = payslips.stream()
                .map(Payslip::getGrossSalary)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalNetPayroll = payslips.stream()
                .map(Payslip::getNetPay)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalDeductions = payslips.stream()
                .map(Payslip::getTotalDeductions)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalEmployerContributions = payslips.stream()
                .map(Payslip::getTotalEmployerContributions)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return PayrollReportDTO.builder()
                .reportPeriodStart(startDate)
                .reportPeriodEnd(endDate)
                .totalEmployees(payslips.size())
                .totalGrossPayroll(totalGrossPayroll)
                .totalNetPayroll(totalNetPayroll)
                .totalDeductions(totalDeductions)
                .totalEmployerContributions(totalEmployerContributions)
                .build();
    }

    /**
     * Get payslips by employee
     */
    public List<PayslipDTO> getPayslipsByEmployee(UUID employeeId) {
        log.info("Getting payslips for employee: {}", employeeId);
        return payslipRepository.findByEmployeeIdOrderByPayDateDesc(employeeId)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get payslips by period
     */
    public List<PayslipDTO> getPayslipsByPeriod(LocalDate startDate, LocalDate endDate) {
        log.info("Getting payslips for period: {} to {}", startDate, endDate);
        return payslipRepository.findByPayPeriodStartBetweenOrderByPayDateDesc(startDate, endDate)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Bulk finalize payslips for a period
     */
    @Transactional
    public List<PayslipDTO> finalizePayslipsForPeriod(LocalDate startDate, LocalDate endDate, String approvedBy) {
        log.info("Finalizing payslips for period: {} to {}", startDate, endDate);

        List<Payslip> draftPayslips = payslipRepository.findByPayPeriodStartBetweenOrderByPayDateDesc(startDate, endDate)
                .stream()
                .filter(p -> p.getStatus() == Payslip.PayslipStatus.DRAFT)
                .collect(Collectors.toList());

        if (draftPayslips.isEmpty()) {
            log.warn("No draft payslips found for period: {} to {}", startDate, endDate);
            return List.of();
        }

        log.info("Found {} draft payslips to finalize", draftPayslips.size());

        return draftPayslips.stream()
                .map(payslip -> {
                    try {
                        return payslipService.finalizePayslip(payslip.getId(), approvedBy);
                    } catch (Exception e) {
                        log.error("Error finalizing payslip {} for employee {}: {}",
                                payslip.getId(), payslip.getEmployee().getFullName(), e.getMessage());
                        return null;
                    }
                })
                .filter(payslip -> payslip != null)
                .collect(Collectors.toList());
    }

    /**
     * Bulk send payslips for a period
     */
    @Transactional
    public List<PayslipDTO> sendPayslipsForPeriod(LocalDate startDate, LocalDate endDate) {
        log.info("Sending payslips for period: {} to {}", startDate, endDate);

        List<Payslip> approvedPayslips = payslipRepository.findByPayPeriodStartBetweenOrderByPayDateDesc(startDate, endDate)
                .stream()
                .filter(p -> p.getStatus() == Payslip.PayslipStatus.APPROVED)
                .collect(Collectors.toList());

        if (approvedPayslips.isEmpty()) {
            log.warn("No approved payslips found for period: {} to {}", startDate, endDate);
            return List.of();
        }

        log.info("Found {} approved payslips to send", approvedPayslips.size());

        return approvedPayslips.stream()
                .map(payslip -> {
                    try {
                        return payslipService.sendPayslip(payslip.getId());
                    } catch (Exception e) {
                        log.error("Error sending payslip {} for employee {}: {}",
                                payslip.getId(), payslip.getEmployee().getFullName(), e.getMessage());
                        return null;
                    }
                })
                .filter(payslip -> payslip != null)
                .collect(Collectors.toList());
    }

    /**
     * Get payroll summary statistics
     */
    public PayrollReportDTO getPayrollSummary(LocalDate startDate, LocalDate endDate) {
        log.info("Getting payroll summary for period: {} to {}", startDate, endDate);

        // Get totals using repository aggregation methods (more efficient)
        BigDecimal totalGrossPayroll = payslipRepository.getTotalGrossPayrollByPeriod(startDate, endDate);
        BigDecimal totalNetPayroll = payslipRepository.getTotalNetPayrollByPeriod(startDate, endDate);
        BigDecimal totalDeductions = payslipRepository.getTotalDeductionsByPeriod(startDate, endDate);

        // Count payslips
        long totalPayslips = payslipRepository.countByPayPeriodStartBetween(startDate, endDate);

        // Handle null values from aggregation
        totalGrossPayroll = totalGrossPayroll != null ? totalGrossPayroll : BigDecimal.ZERO;
        totalNetPayroll = totalNetPayroll != null ? totalNetPayroll : BigDecimal.ZERO;
        totalDeductions = totalDeductions != null ? totalDeductions : BigDecimal.ZERO;

        return PayrollReportDTO.builder()
                .reportPeriodStart(startDate)
                .reportPeriodEnd(endDate)
                .totalEmployees((int) totalPayslips)
                .totalGrossPayroll(totalGrossPayroll)
                .totalNetPayroll(totalNetPayroll)
                .totalDeductions(totalDeductions)
                .totalEmployerContributions(BigDecimal.ZERO) // Calculate this if needed
                .build();
    }

    /**
     * Get payslips by status for a period
     */
    public List<PayslipDTO> getPayslipsByStatusAndPeriod(Payslip.PayslipStatus status,
                                                         LocalDate startDate, LocalDate endDate) {
        log.info("Getting payslips with status {} for period: {} to {}", status, startDate, endDate);

        return payslipRepository.findByPayPeriodStartBetweenOrderByPayDateDesc(startDate, endDate)
                .stream()
                .filter(p -> p.getStatus() == status)
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get employee count by payroll status for a period
     */
    public Map<String, Long> getPayrollStatusSummary(LocalDate startDate, LocalDate endDate) {
        log.info("Getting payroll status summary for period: {} to {}", startDate, endDate);

        List<Payslip> payslips = payslipRepository.findByPayPeriodStartBetweenOrderByPayDateDesc(startDate, endDate);

        Map<String, Long> statusCounts = payslips.stream()
                .collect(Collectors.groupingBy(
                        p -> p.getStatus().name(),
                        Collectors.counting()
                ));

        // Ensure all statuses are represented
        for (Payslip.PayslipStatus status : Payslip.PayslipStatus.values()) {
            statusCounts.putIfAbsent(status.name(), 0L);
        }

        return statusCounts;
    }

    /**
     * Check if payroll exists for period
     */
    public boolean payrollExistsForPeriod(YearMonth payPeriod) {
        LocalDate startDate = payPeriod.atDay(1);
        LocalDate endDate = payPeriod.atEndOfMonth();

        return payslipRepository.countByPayPeriodStartBetween(startDate, endDate) > 0;
    }

    /**
     * Get employees without payslips for a period
     */
    public List<Employee> getEmployeesWithoutPayslipsForPeriod(YearMonth payPeriod) {
        log.info("Finding employees without payslips for period: {}", payPeriod);

        LocalDate startDate = payPeriod.atDay(1);
        LocalDate endDate = payPeriod.atEndOfMonth();

        List<Employee> activeEmployees = employeeRepository.findByStatus("ACTIVE");
        List<Payslip> existingPayslips = payslipRepository.findByPayPeriodStartBetweenOrderByPayDateDesc(startDate, endDate);

        List<UUID> employeesWithPayslips = existingPayslips.stream()
                .map(p -> p.getEmployee().getId())
                .collect(Collectors.toList());

        return activeEmployees.stream()
                .filter(e -> !employeesWithPayslips.contains(e.getId()))
                .collect(Collectors.toList());
    }

    /**
     * Enhanced convert to DTO method to match PayslipService
     */
    private PayslipDTO convertToDTO(Payslip payslip) {
        return PayslipDTO.builder()
                .id(payslip.getId())
                .employeeId(payslip.getEmployee().getId())
                .employeeName(payslip.getEmployee().getFullName()) // Use getFullName() method
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
                .createdBy(payslip.getCreatedBy())
                .build();
    }
}