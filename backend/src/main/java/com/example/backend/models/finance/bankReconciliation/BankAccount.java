package com.example.backend.models.finance.bankReconciliation;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "bank_accounts")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class BankAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    // Account name (what you call it)
    // Example: "Main Checking", "Payroll Account", "Equipment Savings"
    @Column(name = "account_name", nullable = false)
    @NotBlank(message = "Account name is required")
    private String accountName;

    // Bank name
    // Example: "Chase Bank", "Wells Fargo", "Local Credit Union"
    @Column(name = "bank_name", nullable = false)
    @NotBlank(message = "Bank name is required")
    private String bankName;

    // Account number
    // Example: "****1234" (last 4 digits for security)
    @Column(name = "account_number", nullable = false)
    @NotBlank(message = "Account number is required")
    private String accountNumber;

    // Current balance according to your records
    @Column(name = "current_balance", precision = 15, scale = 2, nullable = false)
    private BigDecimal currentBalance = BigDecimal.ZERO;

    // Whether this account is still active
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    // Audit fields
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}