package com.example.backend.dto.transaction;

import com.example.backend.models.PartyType;
import com.example.backend.models.transaction.TransactionPurpose;
import com.example.backend.models.transaction.TransactionStatus;
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
public class TransactionDTO {
    private UUID id;
    private LocalDateTime createdAt;
    private LocalDateTime transactionDate;
    private LocalDateTime completedAt;
    private TransactionStatus status;
    
    // Enhanced with names
    private PartyType senderType;
    private UUID senderId;
    private String senderName;
    
    private PartyType receiverType;
    private UUID receiverId;
    private String receiverName;
    
    private String rejectionReason;
    private String acceptanceComment;
    private String description;
    private String addedBy;
    private String handledBy;
    private String approvedBy;
    
    private Integer batchNumber;
    private UUID sentFirst;
    private TransactionPurpose purpose;
    

    private List<TransactionItemDTO> items;
} 