package com.example.backend.dto.transaction;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransactionAcceptRequestDTO {
    private String username;
    private String acceptanceComment;
    private List<ReceivedItemDTO> receivedItems;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReceivedItemDTO {
        private String transactionItemId;
        private Integer receivedQuantity;
    }
} 