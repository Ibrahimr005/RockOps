package com.example.backend.dtos;


import com.example.backend.models.transaction.Transaction;

public class TransactionValidationResponseDto {
    private String status;
    private String message;
    private Transaction transaction;
    private String error;

    // Constructors
    public TransactionValidationResponseDto() {}

    public TransactionValidationResponseDto(String status, String message, Transaction transaction) {
        this.status = status;
        this.message = message;
        this.transaction = transaction;
    }

    public TransactionValidationResponseDto(String error) {
        this.error = error;
    }

    // Getters and Setters
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public Transaction getTransaction() { return transaction; }
    public void setTransaction(Transaction transaction) { this.transaction = transaction; }

    public String getError() { return error; }
    public void setError(String error) { this.error = error; }
} 