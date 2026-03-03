package com.example.backend.dto.payroll;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * DTO for Overtime Record
 * Represents a single overtime record for an employee
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OvertimeRecordDTO {
    
    /**
     * Unique identifier for the overtime record
     */
    private UUID id;
    
    /**
     * Employee ID
     */
    private UUID employeeId;
    
    /**
     * Employee name
     */
    private String employeeName;
    
    /**
     * Date of the overtime work
     */
    private LocalDate date;
    
    /**
     * Regular hours worked on this date
     */
    private Double regularHours;
    
    /**
     * Overtime hours worked on this date
     */
    private Double overtimeHours;
    
    /**
     * Overtime rate multiplier (e.g., 1.5 for time-and-a-half)
     */
    private Double overtimeRate;
    
    /**
     * Calculated overtime pay for this record
     */
    private BigDecimal overtimePay;
    
    /**
     * Status of the overtime record
     * Values: APPROVED, PENDING, REJECTED
     */
    private String status;
    
    /**
     * Reason/notes for the overtime
     */
    private String reason;
    
    /**
     * Who approved the overtime
     */
    private String approvedBy;
    
    /**
     * When the overtime was approved
     */
    private LocalDate approvedAt;
}