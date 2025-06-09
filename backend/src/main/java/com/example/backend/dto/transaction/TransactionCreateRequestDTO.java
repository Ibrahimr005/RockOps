package com.example.backend.dto.transaction;

import com.example.backend.models.PartyType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransactionCreateRequestDTO {
    private PartyType senderType;
    private UUID senderId;
    private PartyType receiverType;
    private UUID receiverId;
    private String username;
    private Integer batchNumber;
    private UUID sentFirst;
    private LocalDateTime transactionDate;
    private List<TransactionItemRequestDTO> items;
} 