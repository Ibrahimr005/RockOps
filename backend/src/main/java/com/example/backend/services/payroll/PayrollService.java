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

        // FIX: Get LIST of active employees, not Optional<Employee>
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
        return payslipRepository.findByEmployeeIdOrderByPayDateDesc(employeeId)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get payslips by period
     */
    public List<PayslipDTO> getPayslipsByPeriod(LocalDate startDate, LocalDate endDate) {
        return payslipRepository.findByPayPeriodStartBetweenOrderByPayDateDesc(startDate, endDate)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
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