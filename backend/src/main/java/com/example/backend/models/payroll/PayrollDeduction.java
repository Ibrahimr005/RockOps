package com.example.backend.models.payroll;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "payroll_deductions", indexes = {
    @Index(name = "idx_deduction_emp_payroll", columnList = "employee_payroll_id"),
    @Index(name = "idx_deduction_type", columnList = "deduction_type")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = {"employeePayroll"})
@ToString(exclude = {"employeePayroll"})
public class PayrollDeduction {
    
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_payroll_id", nullable = false,
                foreignKey = @ForeignKey(name = "fk_deduction_emp_payroll"))
    @JsonBackReference
    private EmployeePayroll employeePayroll;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "deduction_type", nullable = false, length = 50)
    private DeductionType deductionType;
    
    @Column(name = "deduction_amount", precision = 15, scale = 2, nullable = false)
    private BigDecimal deductionAmount;
    
    @Column(name = "reference_id")
    private UUID referenceId; // e.g., loan_id from Loan entity
    
    @Column(name = "description", length = 500)
    private String description;
    
    @Column(name = "calculation_details", columnDefinition = "TEXT")
    private String calculationDetails; // JSON or detailed breakdown
    
    public enum DeductionType {
        ABSENCE("Unexcused Absence"),
        LATE_ARRIVAL("Late Arrival"),
        EXCESS_LEAVE("Excess Leave Days"),
        LOAN_REPAYMENT("Loan Repayment"),
        TAX("Tax Deduction"),
        INSURANCE("Insurance"),
        PENSION("Pension Contribution"),
        ADVANCE_SALARY("Advance Salary Deduction"),
        OTHER("Other Deduction");
        
        private final String displayName;
        
        DeductionType(String displayName) {
            this.displayName = displayName;
        }
        
        public String getDisplayName() {
            return displayName;
        }
    }
}