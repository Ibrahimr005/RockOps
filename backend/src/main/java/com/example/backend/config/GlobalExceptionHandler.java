package com.example.backend.config;

import com.example.backend.authentication.AuthenticationController.*;
import com.example.backend.authentication.AuthenticationService.*;
import com.example.backend.exceptions.ResourceConflictException;
import com.example.backend.exceptions.ResourceInUseException;
import com.example.backend.exceptions.UserNotFoundException;
import com.example.backend.exceptions.UsernameAlreadyExistsException;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@ControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(UsernameAlreadyExistsException.class)
    public ResponseEntity<ErrorResponse> handleUsernameAlreadyExists(UsernameAlreadyExistsException ex) {
        ErrorResponse errorResponse = new ErrorResponse("Registration Failed", ex.getMessage());
        return new ResponseEntity<>(errorResponse, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFound(UserNotFoundException ex) {
        ErrorResponse errorResponse = new ErrorResponse("User Not Found", ex.getMessage());
        return new ResponseEntity<>(errorResponse, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentials(BadCredentialsException ex) {
        ErrorResponse errorResponse = new ErrorResponse("Authentication Failed", "Invalid username or password");
        return new ResponseEntity<>(errorResponse, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthenticationException(AuthenticationException ex) {
        ErrorResponse errorResponse = new ErrorResponse("Authentication Failed", ex.getMessage());
        return new ResponseEntity<>(errorResponse, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        ErrorResponse errorResponse = new ErrorResponse("Access Denied",
                "You don't have permission to access this resource");
        return new ResponseEntity<>(errorResponse, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(ResourceConflictException.class)
    public ResponseEntity<ConflictErrorResponse> handleResourceConflict(ResourceConflictException ex) {
        ConflictErrorResponse errorResponse = new ConflictErrorResponse(
            "Resource Conflict",
            ex.getMessage(),
            ex.getConflictType(),
            ex.getResourceName(),
            ex.isInactive()
        );
        return new ResponseEntity<>(errorResponse, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(ResourceInUseException.class)
    public ResponseEntity<ResourceInUseErrorResponse> handleResourceInUse(ResourceInUseException ex) {
        ResourceInUseErrorResponse errorResponse = new ResourceInUseErrorResponse(
            "Resource In Use",
            ex.getMessage(),
            ex.getResourceType(),
            ex.getResourceName(),
            ex.getUsageCount(),
            ex.getDependentType()
        );
        return new ResponseEntity<>(errorResponse, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGlobalException(Exception ex, WebRequest request) {
        ErrorResponse errorResponse = new ErrorResponse("Server Error",
                "An unexpected error occurred. Please try again later.");
        return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    public static class ErrorResponse {
        private final String error;
        private final String message;

        public ErrorResponse(String error, String message) {
            this.error = error;
            this.message = message;
        }

        public String getError() {
            return error;
        }

        public String getMessage() {
            return message;
        }
    }

    public static class ConflictErrorResponse extends ErrorResponse {
        private final String conflictType;
        private final String resourceName;
        private final boolean isInactive;

        public ConflictErrorResponse(String error, String message, String conflictType, String resourceName, boolean isInactive) {
            super(error, message);
            this.conflictType = conflictType;
            this.resourceName = resourceName;
            this.isInactive = isInactive;
        }

        public String getConflictType() {
            return conflictType;
        }

        public String getResourceName() {
            return resourceName;
        }

        @JsonProperty("isInactive")
        public boolean isInactive() {
            return isInactive;
        }
    }

    public static class ResourceInUseErrorResponse extends ErrorResponse {
        private final String resourceType;
        private final String resourceName;
        private final int usageCount;
        private final String dependentType;

        public ResourceInUseErrorResponse(String error, String message, String resourceType, String resourceName, int usageCount, String dependentType) {
            super(error, message);
            this.resourceType = resourceType;
            this.resourceName = resourceName;
            this.usageCount = usageCount;
            this.dependentType = dependentType;
        }

        public String getResourceType() {
            return resourceType;
        }

        public String getResourceName() {
            return resourceName;
        }

        public int getUsageCount() {
            return usageCount;
        }

        public String getDependentType() {
            return dependentType;
        }
    }
}