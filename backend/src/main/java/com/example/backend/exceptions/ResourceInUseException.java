package com.example.backend.exceptions;

/**
 * Exception thrown when attempting to delete a resource that is currently in use by other entities
 */
public class ResourceInUseException extends RuntimeException {
    
    private final String resourceType;
    private final String resourceName;
    private final int usageCount;
    private final String dependentType;
    
    public ResourceInUseException(String message) {
        super(message);
        this.resourceType = null;
        this.resourceName = null;
        this.usageCount = 0;
        this.dependentType = null;
    }
    
    public ResourceInUseException(String message, String resourceType, String resourceName, int usageCount, String dependentType) {
        super(message);
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
    
    /**
     * Create exception for resource in use scenario
     */
    public static ResourceInUseException create(String resourceType, String resourceName, int usageCount, String dependentType) {
        String message = String.format("Cannot delete %s '%s' because it is currently used by %d %s%s", 
            resourceType, resourceName, usageCount, dependentType, usageCount != 1 ? "s" : "");
        return new ResourceInUseException(message, resourceType, resourceName, usageCount, dependentType);
    }
}
