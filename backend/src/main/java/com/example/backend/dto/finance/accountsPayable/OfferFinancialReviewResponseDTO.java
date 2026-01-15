package com.example.backend.dto.finance.accountsPayable;

import com.example.backend.models.finance.accountsPayable.enums.FinanceReviewStatus;
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
public class OfferFinancialReviewResponseDTO {
    private UUID id;
    private UUID offerId;
    private String offerNumber;
    private BigDecimal totalAmount;
    private String currency;
    private String budgetCategory;
    private String department;
    private UUID reviewedByUserId;
    private String reviewedByUserName;
    private LocalDateTime reviewedAt;
    private FinanceReviewStatus status;
    private String approvalNotes;
    private String rejectionReason;
    private LocalDate expectedPaymentDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}