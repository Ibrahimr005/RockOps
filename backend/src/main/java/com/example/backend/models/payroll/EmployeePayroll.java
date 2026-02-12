package com.example.backend.models.payroll;

import com.example.backend.models.hr.JobPosition;
import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "employee_payrolls", indexes = {
    @Index(name = "idx_emp_payroll_employee", columnList = "employee_id"),
    @Index(name = "idx_emp_payroll_payroll", columnList = "payroll_id"),
    @Index(name = "idx_emp_payroll_number", columnList = "employee_payroll_number"),
    @Index(name = "idx_emp_payroll_batch", columnList = "payroll_batch_id"),
    @Index(name = "idx_emp_payroll_composite", columnList = "payroll_id,employee_id", unique = true)
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = {"payroll", "payrollBatch", "attendanceSnapshots", "deductions"})
@ToString(exclude = {"payroll", "payrollBatch", "attendanceSnapshots", "deductions"})
public class EmployeePayroll {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    /**
     * Human-readable employee payroll number (format: EPRL-YYYY-NNNNNN)
     */
    @Column(name = "employee_payroll_number", nullable = false, unique = true, length = 50)
    private String employeePayrollNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payroll_id", nullable = false, foreignKey = @ForeignKey(name = "fk_emp_payroll_payroll"))
    @JsonBackReference
    private Payroll payroll;

    /**
     * The batch this employee payroll belongs to (grouped by payment type)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payroll_batch_id", foreignKey = @ForeignKey(name = "fk_emp_payroll_batch"))
    @JsonBackReference
    private PayrollBatch payrollBatch;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;
    
    // Snapshot of employee data at payroll creation time
    @Column(name = "employee_name", nullable = false, length = 200)
    private String employeeName;
    
    @Column(name = "job_position_id", nullable = false)
    private UUID jobPositionId;
    
    @Column(name = "job_position_name", length = 200)
    private String jobPositionName;
    
    @Column(name = "department_name", length = 200)
    private String departmentName;

    // Payment type snapshot (how this employee will be paid)
    @Column(name = "payment_type_id")
    private UUID paymentTypeId;

    @Column(name = "payment_type_code", length = 50)
    private String paymentTypeCode;

    @Column(name = "payment_type_name", length = 100)
    private String paymentTypeName;

    // Employee bank details snapshot (for bank transfer payments)
    @Column(name = "bank_name", length = 100)
    private String bankName;

    @Column(name = "bank_account_number", length = 50)
    private String bankAccountNumber;

    @Column(name = "bank_account_holder_name", length = 200)
    private String bankAccountHolderName;

    @Column(name = "wallet_number", length = 50)
    private String walletNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "contract_type", nullable = false, length = 20)
    private JobPosition.ContractType contractType;
    
    // Base compensation snapshots (from JobPosition at time of payroll)
    @Column(name = "monthly_base_salary", precision = 15, scale = 2)
    private BigDecimal monthlyBaseSalary; // For MONTHLY
    
    @Column(name = "daily_rate", precision = 10, scale = 2)
    private BigDecimal dailyRate; // For DAILY
    
    @Column(name = "hourly_rate", precision = 10, scale = 2)
    private BigDecimal hourlyRate; // For HOURLY
    
    // Attendance-based deduction settings (MONTHLY only - from JobPosition)
    @Column(name = "absent_deduction", precision = 10, scale = 2)
    private BigDecimal absentDeduction;
    
    @Column(name = "late_deduction", precision = 10, scale = 2)
    private BigDecimal lateDeduction;
    
    @Column(name = "late_forgiveness_minutes")
    private Integer lateForgivenessMinutes;
    
    @Column(name = "late_forgiveness_count_per_quarter")
    private Integer lateForgivenessCountPerQuarter;
    
    @Column(name = "leave_deduction", precision = 10, scale = 2)
    private BigDecimal leaveDeduction;
    
    // Calculated amounts
    @Column(name = "gross_pay", precision = 15, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal grossPay = BigDecimal.ZERO;

    @Column(name = "total_deductions", precision = 15, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal totalDeductions = BigDecimal.ZERO;

    @Column(name = "net_pay", precision = 15, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal netPay = BigDecimal.ZERO;
    
    // Attendance summary
    @Column(name = "total_working_days")
    private Integer totalWorkingDays;
    
    @Column(name = "attended_days")
    private Integer attendedDays;
    
    @Column(name = "absent_days")
    private Integer absentDays;
    
    @Column(name = "late_days")
    private Integer lateDays;
    
    @Column(name = "forgiven_late_days")
    private Integer forgivenLateDays;
    
    @Column(name = "charged_late_days")
    private Integer chargedLateDays;
    
    @Column(name = "excess_leave_days")
    private Integer excessLeaveDays;
    
    @Column(name = "total_worked_hours", precision = 10, scale = 2)
    private BigDecimal totalWorkedHours;
    
    @Column(name = "overtime_hours", precision = 10, scale = 2)
    private BigDecimal overtimeHours;
    
    @Column(name = "overtime_pay", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal overtimePay = BigDecimal.ZERO;

    // Bonus amount
    @Column(name = "bonus_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal bonusAmount = BigDecimal.ZERO;

    // Deduction breakdown
    @Column(name = "absence_deduction_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal absenceDeductionAmount = BigDecimal.ZERO;
    
    @Column(name = "late_deduction_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal lateDeductionAmount = BigDecimal.ZERO;
    
    @Column(name = "leave_deduction_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal leaveDeductionAmount = BigDecimal.ZERO;
    
    @Column(name = "loan_deduction_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal loanDeductionAmount = BigDecimal.ZERO;
    
    @Column(name = "other_deduction_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal otherDeductionAmount = BigDecimal.ZERO;
    
    @Column(name = "calculated_at")
    private LocalDateTime calculatedAt;

    @OneToMany(mappedBy = "employeePayroll", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PayrollAttendanceSnapshot> attendanceSnapshots = new ArrayList<>();
    
    @OneToMany(mappedBy = "employeePayroll", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PayrollDeduction> deductions = new ArrayList<>();
    
    @Version
    private Long version;
    
    public void addAttendanceSnapshot(PayrollAttendanceSnapshot snapshot) {
        attendanceSnapshots.add(snapshot);
        snapshot.setEmployeePayroll(this);
    }
    
    public void addDeduction(PayrollDeduction deduction) {
        deductions.add(deduction);
        deduction.setEmployeePayroll(this);
    }


}