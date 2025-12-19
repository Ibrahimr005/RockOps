package com.example.backend.dto.finance.balances;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransactionApprovalDTO {

    private boolean approved;
    private String rejectionReason; // Only used if approved = false
}