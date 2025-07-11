package com.example.backend.models.finance.payables;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Entity
@Table(name = "invoices")
@Data
@AllArgsConstructor
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    // Invoice number from supplier
    // Example: "INV-2024-001" from ABC Lumber Company
    @Column(name = "invoice_number", nullable = false, unique = true)
    @NotBlank(message = "Invoice number is required")
    private String invoiceNumber;

    // Who sent us this invoice
    // Example: "ABC Lumber Company", "Smith Electrical Contractors"
    @Column(name = "vendor_name", nullable = false)
    @NotBlank(message = "Vendor name is required")
    private String vendorName;

    // Total amount of the invoice
    // Example: $5,000.00 for lumber delivery
    @Column(name = "total_amount", precision = 15, scale = 2, nullable = false)
    @DecimalMin(value = "0.01", message = "Invoice amount must be greater than 0")
    @NotNull(message = "Invoice amount is required")
    private BigDecimal totalAmount;

    // How much has been paid so far
    // Example: $2,500.00 if partially paid
    @Column(name = "paid_amount", precision = 15, scale = 2, nullable = false)
    private BigDecimal paidAmount = BigDecimal.ZERO;

    // When the invoice was issued by vendor
    @Column(name = "invoice_date", nullable = false)
    @NotNull(message = "Invoice date is required")
    private LocalDate invoiceDate;

    // When payment is due
    @Column(name = "due_date", nullable = false)
    @NotNull(message = "Due date is required")
    private LocalDate dueDate;

    // Description of what this invoice is for
    // Example: "Lumber materials for Oak Street residential project"
    @Column(name = "description", length = 1000)
    private String description;

    // Current status of invoice
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private InvoiceStatus status = InvoiceStatus.PENDING;

    // All payments made against this invoice
    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Payment> payments = new ArrayList<>();

    // Audit fields
    @Column(name = "created_by", nullable = false)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_by")
    private String updatedBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_by")
    private String deletedBy;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    public Invoice() {
        this.createdAt = LocalDateTime.now();
    }

    // Helper method to calculate remaining balance
    public BigDecimal getRemainingBalance() {
        return totalAmount.subtract(paidAmount);
    }

    // Helper method to check if invoice is overdue
    public boolean isOverdue() {
        return LocalDate.now().isAfter(dueDate) && !isFullyPaid();
    }

    // Helper method to check if invoice is fully paid
    public boolean isFullyPaid() {
        return paidAmount.compareTo(totalAmount) >= 0;
    }

    // Method to add payment and update status
    public void addPayment(Payment payment) {
        payments.add(payment);
        payment.setInvoice(this);
        updatePaidAmountAndStatus();
    }

    // Update paid amount and status based on payments
    public void updatePaidAmountAndStatus() {
        // Calculate total paid amount from PROCESSED payments
        this.paidAmount = payments.stream()
                .filter(p -> p.getStatus() == PaymentStatus.PROCESSED)
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Update status based on payment amount
        if (paidAmount.compareTo(BigDecimal.ZERO) == 0) {
            // No payments made
            this.status = isOverdue() ? InvoiceStatus.OVERDUE : InvoiceStatus.PENDING;
        } else if (paidAmount.compareTo(totalAmount) >= 0) {
            // Fully paid
            this.status = InvoiceStatus.FULLY_PAID;
        } else {
            // Partially paid
            this.status = InvoiceStatus.PARTIALLY_PAID;
        }

        // Debug output (remove later)
        System.out.println("Updated invoice " + invoiceNumber +
                " - Paid: $" + paidAmount +
                " - Status: " + status);
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}