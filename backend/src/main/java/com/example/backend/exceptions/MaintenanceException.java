package com.example.backend.exceptions;

public class MaintenanceException extends RuntimeException {
    
    public MaintenanceException(String message) {
        super(message);
    }
    
    public MaintenanceException(String message, Throwable cause) {
        super(message, cause);
    }
    
    public MaintenanceException(Throwable cause) {
        super(cause);
    }
} 