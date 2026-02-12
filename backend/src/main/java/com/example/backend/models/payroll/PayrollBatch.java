package com.example.backend.models.payroll;

import com.example.backend.models.finance.accountsPayable.PaymentRequest;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * PayrollBatch groups employee payrolls by payment type.
 * When a payroll is sent to finance, batches are created based on
 * how each employee is paid (bank transfer, cash, etc.)
 *
 * Each batch generates one PaymentRequest for Finance to process.
 */
@Entity
@Table(name = "payroll_batches", indexes = {
    @Index(name = "idx_payroll_batches_payroll", columnList = "payroll_id"),
    @Index(name = "idx_payroll_batches_status", columnList = "status"),
    @Index(name = "idx_payroll_batches_payment_type", columnList = "payment_type_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = {"payroll", "paymentType", "employeePayrolls", "paymentRequest"})
@ToString(exclude = {"payroll", "paymentType", "employeePayrolls", "paymentRequest"})
public class PayrollBatch {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "batch_number", nullable = false, unique = true, length = 50)
    private String batchNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payroll_id", nullable = false)
    @JsonBackReference
    private Payroll payroll;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "payment_type_id", nullable = false)
    private PaymentType paymentType;

    /**
     * Total amount to be paid in this batch (sum of all employee net pays)
     */
    @Column(name = "total_amount", precision = 15, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;

    /**
     * Number of employees in this batch
     */
    @Column(name = "employee_count", nullable = false)
    @Builder.Default
    private Integer employeeCount = 0;

    /**
     * Batch status mirrors PayrollStatus for finance workflow:
     * PENDING_FINANCE_REVIEW, FINANCE_APPROVED, FINANCE_REJECTED, PARTIALLY_PAID, PAID
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    @Builder.Default
    private PayrollStatus status = PayrollStatus.PENDING_FINANCE_REVIEW;

    /**
     * Link to the payment request created when batch is sent to finance
     */
    @OneToOne
    @JoinColumn(name = "payment_request_id")
    private PaymentRequest paymentRequest;

    /**
     * Employee payrolls in this batch
     */
    @OneToMany(mappedBy = "payrollBatch", fetch = FetchType.LAZY)
    @JsonManagedReference
    @Builder.Default
    private List<EmployeePayroll> employeePayrolls = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "sent_to_finance_at")
    private LocalDateTime sentToFinanceAt;

    @Column(name = "sent_to_finance_by", length = 100)
    private String sentToFinanceBy;

    /**
     * Add an employee payroll to this batch and update totals
     */
    public void addEmployeePayroll(EmployeePayroll employeePayroll) {
        if (employeePayrolls == null) {
            employeePayrolls = new ArrayList<>();
        }
        employeePayrolls.add(employeePayroll);
        employeePayroll.setPayrollBatch(this);
        recalculateTotals();
    }

    /**
     * Recalculate batch totals from employee payrolls
     */
    public void recalculateTotals() {
        if (employeePayrolls == null || employeePayrolls.isEmpty()) {
            this.totalAmount = BigDecimal.ZERO;
            this.employeeCount = 0;
            return;
        }

        this.totalAmount = employeePayrolls.stream()
            .map(ep -> ep.getNetPay() != null ? ep.getNetPay() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        this.employeeCount = employeePayrolls.size();
    }
}
