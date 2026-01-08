package com.example.backend.dto.finance.refunds;

import com.example.backend.models.finance.balances.AccountType;
import com.example.backend.models.finance.refunds.RefundStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RefundRequestResponseDTO {
    private UUID id;

    // Purchase Order info
    private UUID purchaseOrderId;
    private String purchaseOrderNumber;

    // Merchant info
    private UUID merchantId;
    private String merchantName;
    private String merchantContactPhone;
    private String merchantContactEmail;

    // Refund details
    private BigDecimal totalRefundAmount;
    private RefundStatus status;

    // Balance info (when confirmed)
    private AccountType balanceType;
    private UUID balanceAccountId;
    private String balanceAccountName;
    private LocalDate dateReceived;
    private String financeNotes;

    // Confirmation details
    private String confirmedBy;
    private LocalDateTime confirmedAt;

    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Items
    private List<RefundRequestItemResponseDTO> refundItems = new ArrayList<>();
}