package com.example.backend.dto.finance.accountsPayable;

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
public class PaymentRequestStatusHistoryResponseDTO {
    private UUID id;
    private UUID paymentRequestId;
    private String fromStatus;
    private String toStatus;
    private UUID changedByUserId;
    private String changedByUserName;
    private LocalDateTime changedAt;
    private String notes;
    private String metadata;
}