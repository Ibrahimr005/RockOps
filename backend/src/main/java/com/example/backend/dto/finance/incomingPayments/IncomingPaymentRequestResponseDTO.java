package com.example.backend.dto.finance.incomingPayments;

import com.example.backend.models.finance.balances.AccountType;
import com.example.backend.models.finance.incomingPayments.IncomingPaymentSource;
import com.example.backend.models.finance.incomingPayments.IncomingPaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class IncomingPaymentRequestResponseDTO {

    private UUID id;

    // PO info
    private UUID purchaseOrderId;
    private String purchaseOrderNumber;

    // Merchant info
    private UUID merchantId;
    private String merchantName;
    private String merchantContactPhone;
    private String merchantContactEmail;

    // Payment details
    private IncomingPaymentSource source;
    private UUID sourceReferenceId;
    private BigDecimal totalAmount;
    private IncomingPaymentStatus status;

    // Balance info
    private AccountType balanceType;
    private UUID balanceAccountId;
    private String balanceAccountName;
    private LocalDate dateReceived;
    private String financeNotes;

    // Confirmation info
    private String confirmedBy;
    private LocalDateTime confirmedAt;

    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Items
    private List<IncomingPaymentRequestItemResponseDTO> items;
}