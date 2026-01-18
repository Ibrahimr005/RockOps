package com.example.backend.dto.payroll;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * DTO for Overtime Issue
 * Represents an issue found during overtime processing
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OvertimeIssueDTO {
    
    /**
     * Employee ID associated with this issue
     */
    private UUID employeeId;
    
    /**
     * Employee name
     */
    private String employeeName;
    
    /**
     * Severity of the issue
     * Values: WARNING, ERROR
     */
    private String severity;
    
    /**
     * Description of the issue
     */
    private String description;
    
    /**
     * Number of overtime hours affected by this issue
     */
    private Double hoursAffected;
    
    /**
     * Type of overtime issue
     * Examples: EXCESSIVE_HOURS, UNAPPROVED, INVALID_RATE, etc.
     */
    private String issueType;
}