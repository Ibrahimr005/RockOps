package com.example.backend.dto.finance.accountsPayable;

import lombok.Data;

import java.util.UUID;

@Data
public class ItemReviewDecision {
    private UUID offerItemId;
    private String decision;  // "ACCEPTED" or "REJECTED"
    private String rejectionReason;  // Required if REJECTED
}
