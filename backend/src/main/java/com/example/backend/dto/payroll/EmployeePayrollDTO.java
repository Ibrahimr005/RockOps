package com.example.backend.dto.payroll;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeePayrollDTO {
    private UUID id;
    private UUID payrollId;
    private UUID employeeId;
    private String employeeName;
    private String jobPositionName;
    private String departmentName;
    private String contractType;

    // Compensation snapshot
    private BigDecimal monthlyBaseSalary;
    private BigDecimal dailyRate;
    private BigDecimal hourlyRate;

    // Deduction settings (MONTHLY)
    private BigDecimal absentDeduction;
    private BigDecimal lateDeduction;
    private Integer lateForgivenessMinutes;
    private Integer lateForgivenessCountPerQuarter;
    private BigDecimal leaveDeduction;

    // Calculated amounts
    private BigDecimal grossPay;
    private BigDecimal totalDeductions;
    private BigDecimal netPay;

    // Attendance summary
    private Integer totalWorkingDays;
    private Integer attendedDays;
    private Integer absentDays;
    private Integer lateDays;
    private Integer forgivenLateDays;
    private Integer chargedLateDays;
    private Integer excessLeaveDays;
    private BigDecimal totalWorkedHours;
    private BigDecimal overtimeHours;
    private BigDecimal overtimePay;

    // Deduction breakdown
    private BigDecimal absenceDeductionAmount;
    private BigDecimal lateDeductionAmount;
    private BigDecimal leaveDeductionAmount;
    private BigDecimal loanDeductionAmount;
    private BigDecimal otherDeductionAmount;

    private LocalDateTime calculatedAt;

    private List<PayrollAttendanceSnapshotDTO> attendanceSnapshots;
}
