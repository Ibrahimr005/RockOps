package com.example.backend.dto.finance.accountsPayable;

import com.example.backend.models.finance.accountsPayable.enums.AccountType;
import com.example.backend.models.finance.accountsPayable.enums.PaymentMethod;
import com.example.backend.models.finance.accountsPayable.enums.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountPayablePaymentResponseDTO {
    private UUID id;
    private String paymentNumber;
    private UUID paymentRequestId;
    private String paymentRequestNumber;
    private BigDecimal amount;
    private String currency;
    private LocalDate paymentDate;

    // Payment method info
    private PaymentMethod paymentMethod;
    private UUID paymentAccountId;
    private AccountType paymentAccountType;
    private String paymentAccountName; // Name of the bank/safe/person

    private String transactionReference;

    // Merchant info
    private UUID paidToMerchantId;
    private String paidToName;

    // Processor info
    private UUID processedByUserId;
    private String processedByUserName;
    private LocalDateTime processedAt;

    private String notes;
    private String receiptFilePath;
    private PaymentStatus status;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}