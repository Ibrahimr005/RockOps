package com.example.backend.dto.finance.accountsPayable;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApproveRejectPaymentRequestDTO {

    @NotNull(message = "Payment Request ID is required")
    private UUID paymentRequestId;

    @NotBlank(message = "Action is required (APPROVE or REJECT)")
    private String action; // "APPROVE" or "REJECT"

    private String notes;

    private String rejectionReason; // Required if action is REJECT
}