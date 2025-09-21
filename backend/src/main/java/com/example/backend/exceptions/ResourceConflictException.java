package com.example.backend.exceptions;

/**
 * Exception thrown when there's a conflict with existing resources,
 * including cases where inactive/deleted resources exist with the same name
 */
public class ResourceConflictException extends RuntimeException {
    
    private final String conflictType;
    private final String resourceName;
    private final boolean isInactive;
    
    public ResourceConflictException(String message) {
        super(message);
        this.conflictType = "GENERAL";
        this.resourceName = null;
        this.isInactive = false;
    }
    
    public ResourceConflictException(String message, String conflictType, String resourceName, boolean isInactive) {
        super(message);
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
    
    public boolean isInactive() {
        return isInactive;
    }
    
    /**
     * Create exception for duplicate active resource
     */
    public static ResourceConflictException duplicateActive(String resourceType, String name) {
        return new ResourceConflictException(
            String.format("%s with name '%s' already exists", resourceType, name),
            "DUPLICATE_ACTIVE",
            name,
            false
        );
    }
    
    /**
     * Create exception for duplicate inactive/deleted resource
     */
    public static ResourceConflictException duplicateInactive(String resourceType, String name) {
        return new ResourceConflictException(
            String.format("%s with name '%s' already exists but was previously deleted", resourceType, name),
            "DUPLICATE_INACTIVE",
            name,
            true
        );
    }
}
