package com.example.backend.dto.finance.payables;

import com.example.backend.models.finance.payables.PaymentMethod;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentRequestDTO {


    // Which invoice are we paying?
    @NotNull(message = "Invoice ID is required")
    private UUID invoiceId;

    // How much are we paying?
    @NotNull(message = "Payment amount is required")
    @DecimalMin(value = "0.01", message = "Payment amount must be greater than 0")
    private BigDecimal amount;

    // When did we make the payment?
    @NotNull(message = "Payment date is required")
    private LocalDate paymentDate;

    // How did we pay? (cash, check, etc.)
    @NotNull(message = "Payment method is required")
    private PaymentMethod paymentMethod;

    // Reference number (optional)
    // Example: Check number, wire confirmation, etc.
    @Size(max = 100, message = "Reference number cannot exceed 100 characters")
    private String referenceNumber;

    // Any notes about this payment (optional)
    @Size(max = 500, message = "Notes cannot exceed 500 characters")
    private String notes;

    // User tracking fields
    private String createdBy;
    private String updatedBy;
}