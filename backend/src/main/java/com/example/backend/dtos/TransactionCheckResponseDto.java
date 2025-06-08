package com.example.backend.dtos;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class TransactionCheckResponseDto {
    private String scenario;
    private boolean exists;
    private String message;
    private TransactionSummaryDto transaction;

    // Constructors
    public TransactionCheckResponseDto() {}

    public TransactionCheckResponseDto(String scenario, boolean exists, String message) {
        this.scenario = scenario;
        this.exists = exists;
        this.message = message;
    }

    public TransactionCheckResponseDto(String scenario, boolean exists, String message, TransactionSummaryDto transaction) {
        this.scenario = scenario;
        this.exists = exists;
        this.message = message;
        this.transaction = transaction;
    }

    // Getters and Setters
    public String getScenario() { return scenario; }
    public void setScenario(String scenario) { this.scenario = scenario; }

    public boolean isExists() { return exists; }
    public void setExists(boolean exists) { this.exists = exists; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public TransactionSummaryDto getTransaction() { return transaction; }
    public void setTransaction(TransactionSummaryDto transaction) { this.transaction = transaction; }

    // Nested DTOs
    public static class TransactionSummaryDto {
        private UUID id;
        private int batchNumber;
        private LocalDateTime transactionDate;
        private String status;
        private String senderName;
        private String addedBy;
        private List<TransactionItemDto> items;

        // Constructors
        public TransactionSummaryDto() {}

        // Getters and Setters
        public UUID getId() { return id; }
        public void setId(UUID id) { this.id = id; }

        public int getBatchNumber() { return batchNumber; }
        public void setBatchNumber(int batchNumber) { this.batchNumber = batchNumber; }

        public LocalDateTime getTransactionDate() { return transactionDate; }
        public void setTransactionDate(LocalDateTime transactionDate) { this.transactionDate = transactionDate; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public String getSenderName() { return senderName; }
        public void setSenderName(String senderName) { this.senderName = senderName; }

        public String getAddedBy() { return addedBy; }
        public void setAddedBy(String addedBy) { this.addedBy = addedBy; }

        public List<TransactionItemDto> getItems() { return items; }
        public void setItems(List<TransactionItemDto> items) { this.items = items; }
    }

    public static class TransactionItemDto {
        private UUID id;
        private String itemTypeName;
        private String category;
        private int quantity;
        private String measuringUnit;

        // Constructors
        public TransactionItemDto() {}

        // Getters and Setters
        public UUID getId() { return id; }
        public void setId(UUID id) { this.id = id; }

        public String getItemTypeName() { return itemTypeName; }
        public void setItemTypeName(String itemTypeName) { this.itemTypeName = itemTypeName; }

        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }

        public int getQuantity() { return quantity; }
        public void setQuantity(int quantity) { this.quantity = quantity; }

        public String getMeasuringUnit() { return measuringUnit; }
        public void setMeasuringUnit(String measuringUnit) { this.measuringUnit = measuringUnit; }
    }
} 