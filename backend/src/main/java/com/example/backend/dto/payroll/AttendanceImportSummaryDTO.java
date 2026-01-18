package com.example.backend.dto.payroll;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO for attendance import results
 * Returns summary of import/re-import operation with statistics and issues
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceImportSummaryDTO {

    /**
     * Total number of employees processed
     */
    private Integer totalEmployees;

    /**
     * Number of employee payrolls created (first import)
     */
    private Integer employeePayrollsCreated;

    /**
     * Number of employee payrolls updated (re-import)
     */
    private Integer employeePayrollsUpdated;

    /**
     * Number of attendance snapshots created
     */
    private Integer attendanceSnapshotsCreated;

    /**
     * Total working days in the period (excluding public holidays)
     */
    private Integer totalWorkingDays;

    /**
     * Number of public holidays in the period
     */
    private Integer publicHolidaysCount;

    /**
     * Whether this was a re-import (true) or first import (false)
     */
    private Boolean isReImport;

    /**
     * Import count (how many times this payroll has been imported)
     */
    private Integer importCount;

    /**
     * Timestamp of this import
     */
    private LocalDateTime importedAt;

    /**
     * List of issues found during import
     */
    private List<AttendanceIssueDTO> issues;

    /**
     * Overall status: SUCCESS, SUCCESS_WITH_WARNINGS, PARTIAL_FAILURE
     */
    private String status;

    /**
     * Human-readable message
     */
    private String message;

    /**
     * Detailed breakdown by contract type
     */
    private ContractTypeBreakdownDTO breakdown;

    // ========================================
    // NESTED DTO: AttendanceIssueDTO
    // ========================================

    /**
     * Represents an issue found during import
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AttendanceIssueDTO {

        /**
         * Employee ID (UUID as string)
         */
        private String employeeId;

        /**
         * Employee name
         */
        private String employeeName;

        /**
         * Issue type: MISSING_PUNCH, LATE_DAYS, ABSENT_DAYS, EXCESSIVE_ABSENCES, PROCESSING_ERROR
         */
        private String issueType;

        /**
         * Detailed description of the issue
         */
        private String description;

        /**
         * Severity: WARNING, ERROR, INFO
         */
        private String severity;
    }

    // ========================================
    // NESTED DTO: ContractTypeBreakdownDTO
    // ========================================

    /**
     * Breakdown of employees by contract type
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ContractTypeBreakdownDTO {

        /**
         * Number of monthly-contract employees
         */
        private Integer monthlyEmployees;

        /**
         * Number of daily-contract employees
         */
        private Integer dailyEmployees;

        /**
         * Number of hourly-contract employees
         */
        private Integer hourlyEmployees;
    }
}