package com.example.backend.exceptions;

public class ContactException extends RuntimeException {
    
    public ContactException(String message) {
        super(message);
    }
    
    public ContactException(String message, Throwable cause) {
        super(message, cause);
    }
} 