package com.example.backend.dto.merchant;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MerchantTransactionDTO {
    private UUID id;
    private String itemTypeName;
    private String itemCategoryName;
    private double quantityReceived;
    private String status; // GOOD, HAS_ISSUES
    private String issueType; // DAMAGED, WRONG_ITEM, MISSING, etc.
    private double issueQuantity;
    private String receivedBy;
    private LocalDateTime receivedAt;
    private String poNumber;
    private String resolutionType; // REDELIVERY, REFUND, etc.
    private String resolutionStatus; // REPORTED, RESOLVED
    private boolean isRedelivery;
}