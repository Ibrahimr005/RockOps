package com.example.backend.dto.finance.accountsPayable;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OfferFinancialReviewRequestDTO {

    @NotNull(message = "Offer ID is required")
    private UUID offerId;

    private String budgetCategory;

    private LocalDate expectedPaymentDate;

    private String approvalNotes;

    @NotBlank(message = "Action is required (APPROVE or REJECT)")
    private String action; // "APPROVE" or "REJECT"

    private String rejectionReason; // Required if action is REJECT
}