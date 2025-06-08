package com.example.backend.dtos;

import java.util.List;
import java.util.UUID;

public class TransactionValidationRequestDto {
    private String action; // "accept" or "reject"
    private String comments;
    private String rejectionReason;
    private List<ReceivedItemDto> receivedItems;

    // Constructors
    public TransactionValidationRequestDto() {}

    // Getters and Setters
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getComments() { return comments; }
    public void setComments(String comments) { this.comments = comments; }

    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }

    public List<ReceivedItemDto> getReceivedItems() { return receivedItems; }
    public void setReceivedItems(List<ReceivedItemDto> receivedItems) { this.receivedItems = receivedItems; }

    public static class ReceivedItemDto {
        private UUID transactionItemId;
        private Integer receivedQuantity;
        private Boolean itemNotReceived;

        // Constructors
        public ReceivedItemDto() {}

        // Getters and Setters
        public UUID getTransactionItemId() { return transactionItemId; }
        public void setTransactionItemId(UUID transactionItemId) { this.transactionItemId = transactionItemId; }

        public Integer getReceivedQuantity() { return receivedQuantity; }
        public void setReceivedQuantity(Integer receivedQuantity) { this.receivedQuantity = receivedQuantity; }

        public Boolean getItemNotReceived() { return itemNotReceived; }
        public void setItemNotReceived(Boolean itemNotReceived) { this.itemNotReceived = itemNotReceived; }
    }
} 