package com.example.backend.services.payroll;

import com.example.backend.dto.hr.attendance.AttendanceData;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.payroll.Earning;
import com.example.backend.models.payroll.EmployerContribution;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SalaryCalculationService {
    
    /**
     * Calculate gross salary based on job position and employee overrides
     */
    public BigDecimal calculateGrossSalary(Employee employee, AttendanceData attendanceData) {
        JobPosition jobPosition = employee.getJobPosition();
        
        if (jobPosition == null) {
            throw new RuntimeException("Employee must have a job position to calculate salary");
        }
        
        // Check for employee-specific salary override
        if (employee.getBaseSalaryOverride() != null) {
            return calculateSalaryByContractType(employee.getBaseSalaryOverride(), 
                                               jobPosition.getContractType(), 
                                               jobPosition, 
                                               attendanceData);
        }
        
        // Use job position base salary
        if (jobPosition.getBaseSalary() != null) {
            return calculateSalaryByContractType(BigDecimal.valueOf(jobPosition.getBaseSalary()), 
                                               jobPosition.getContractType(), 
                                               jobPosition, 
                                               attendanceData);
        }
        
        throw new RuntimeException("No salary information found for employee");
    }
    
    private BigDecimal calculateSalaryByContractType(BigDecimal baseSalary, 
                                                   JobPosition.ContractType contractType,
                                                   JobPosition jobPosition,
                                                   AttendanceData attendanceData) {
        
        switch (contractType) {
            case MONTHLY:
                return calculateMonthlySalary(baseSalary, attendanceData);
            case DAILY:
                return calculateDailySalary(baseSalary, jobPosition, attendanceData);
            case HOURLY:
                return calculateHourlySalary(baseSalary, jobPosition, attendanceData);
            default:
                throw new RuntimeException("Unsupported contract type: " + contractType);
        }
    }
    
    private BigDecimal calculateMonthlySalary(BigDecimal monthlySalary, AttendanceData attendanceData) {
        // For monthly contracts, calculate pro-rated salary based on days worked
        int totalWorkingDays = attendanceData.getTotalWorkingDays();
        int daysWorked = attendanceData.getDaysWorked();
        
        if (totalWorkingDays == 0) {
            return monthlySalary;
        }
        
        BigDecimal dailyRate = monthlySalary.divide(BigDecimal.valueOf(totalWorkingDays), 2, RoundingMode.HALF_UP);
        return dailyRate.multiply(BigDecimal.valueOf(daysWorked));
    }
    
    private BigDecimal calculateDailySalary(BigDecimal dailyRate, JobPosition jobPosition, AttendanceData attendanceData) {
        return dailyRate.multiply(BigDecimal.valueOf(attendanceData.getDaysWorked()));
    }
    
    private BigDecimal calculateHourlySalary(BigDecimal hourlyRate, JobPosition jobPosition, AttendanceData attendanceData) {
        BigDecimal totalHours = attendanceData.getTotalHours();
        return hourlyRate.multiply(totalHours);
    }
    
    /**
     * Calculate earnings (overtime, bonuses, etc.)
     */
    public List<Earning> calculateEarnings(Employee employee, AttendanceData attendanceData, BigDecimal grossSalary) {
        List<Earning> earnings = new ArrayList<>();
        
        // Calculate overtime earnings
        if (attendanceData.getOvertimeHours().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal overtimeEarning = calculateOvertimeEarning(employee, attendanceData);
            if (overtimeEarning.compareTo(BigDecimal.ZERO) > 0) {
                earnings.add(Earning.builder()
                    .earningType("OVERTIME")
                    .description("Overtime Pay (" + attendanceData.getOvertimeHours() + " hours)")
                    .amount(overtimeEarning)
                    .isTaxable(true)
                    .build());
            }
        }
        
        // Add other earnings as needed (bonuses, allowances, etc.)
        
        return earnings;
    }
    
    private BigDecimal calculateOvertimeEarning(Employee employee, AttendanceData attendanceData) {
        JobPosition jobPosition = employee.getJobPosition();
        
        if (jobPosition.getContractType() == JobPosition.ContractType.HOURLY) {
            BigDecimal hourlyRate = BigDecimal.valueOf(jobPosition.getHourlyRate());
            BigDecimal overtimeMultiplier = jobPosition.getOvertimeMultiplier() != null ? 
                BigDecimal.valueOf(jobPosition.getOvertimeMultiplier()) : BigDecimal.valueOf(1.5);
            
            return hourlyRate.multiply(overtimeMultiplier).multiply(attendanceData.getOvertimeHours());
        } else {
            // For monthly/daily contracts, calculate overtime based on base hourly rate
            BigDecimal baseSalary = employee.getBaseSalaryOverride() != null ? 
                employee.getBaseSalaryOverride() : BigDecimal.valueOf(jobPosition.getBaseSalary());
            
            BigDecimal monthlyWorkingHours = BigDecimal.valueOf(160); // Assume 160 hours per month
            BigDecimal baseHourlyRate = baseSalary.divide(monthlyWorkingHours, 2, RoundingMode.HALF_UP);
            
            return baseHourlyRate.multiply(BigDecimal.valueOf(1.5)).multiply(attendanceData.getOvertimeHours());
        }
    }
    
    /**
     * Calculate employer contributions (social security, insurance, etc.)
     */
    public List<EmployerContribution> calculateEmployerContributions(Employee employee, BigDecimal grossSalary) {
        List<EmployerContribution> contributions = new ArrayList<>();
        
        // Social Security contribution (example: 15% of gross salary)
        BigDecimal socialSecurityContribution = grossSalary.multiply(BigDecimal.valueOf(0.15));
        contributions.add(EmployerContribution.builder()
            .contributionType("SOCIAL_SECURITY")
            .description("Social Security Contribution")
            .amount(socialSecurityContribution)
            .build());
        
        // Health insurance contribution (example: 5% of gross salary)
        BigDecimal healthInsuranceContribution = grossSalary.multiply(BigDecimal.valueOf(0.05));
        contributions.add(EmployerContribution.builder()
            .contributionType("HEALTH_INSURANCE")
            .description("Health Insurance Contribution")
            .amount(healthInsuranceContribution)
            .build());
        
        return contributions;
    }
}