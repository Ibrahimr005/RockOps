package com.example.backend.dto.finance.accountsPayable;

import com.example.backend.models.finance.accountsPayable.enums.AccountType;
import com.example.backend.models.finance.accountsPayable.enums.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProcessPaymentRequestDTO {

    @NotNull(message = "Payment Request ID is required")
    private UUID paymentRequestId;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    private BigDecimal amount;

    @NotNull(message = "Payment method is required")
    private PaymentMethod paymentMethod;

    @NotNull(message = "Payment account ID is required")
    private UUID paymentAccountId;

    @NotNull(message = "Payment account type is required")
    private AccountType paymentAccountType;

    @NotNull(message = "Payment date is required")
    private LocalDate paymentDate;

    private String transactionReference;

    private String notes;

    private String receiptFilePath; // Optional file path for receipt
}