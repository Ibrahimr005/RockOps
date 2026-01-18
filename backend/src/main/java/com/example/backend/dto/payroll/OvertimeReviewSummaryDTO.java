package com.example.backend.dto.payroll;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * DTO for Overtime Review Summary
 * Contains the results of processing overtime for a payroll period
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OvertimeReviewSummaryDTO {
    
    /**
     * Status of the overtime processing
     * Values: SUCCESS, SUCCESS_WITH_WARNINGS, FAILURE
     */
    private String status;
    
    /**
     * Human-readable message describing the result
     */
    private String message;
    
    /**
     * Total number of overtime records processed
     */
    private int totalRecords;
    
    /**
     * Total overtime hours across all employees
     */
    private Double totalOvertimeHours;
    
    /**
     * Number of employees who have overtime
     */
    private int employeesWithOvertime;
    
    /**
     * Total overtime pay calculated
     */
    private BigDecimal totalOvertimePay;
    
    /**
     * List of issues found during processing
     */
    private List<OvertimeIssueDTO> issues;
}