package com.example.backend.dto.finance.accountsPayable;

import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class ReviewOfferItemsDTO {
    private UUID offerId;
    private UUID reviewerUserId;
    private String reviewerName;
    private String budgetCategory;
    private String notes;
    private List<ItemReviewDecision> itemDecisions;
}


