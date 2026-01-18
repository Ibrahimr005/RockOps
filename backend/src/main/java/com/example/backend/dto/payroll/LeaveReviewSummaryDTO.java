// ========================================
// FILE: LeaveReviewSummaryDTO.java
// Similar to AttendanceImportSummaryDTO
// ========================================

package com.example.backend.dto.payroll;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaveReviewSummaryDTO {
    private String status; // SUCCESS, SUCCESS_WITH_WARNINGS, FAILURE
    private String message;
    
    // Statistics
    private Integer totalRequests;
    private Integer approvedRequests;
    private Integer pendingRequests;
    private Integer rejectedRequests;
    private Integer excessLeaveDays;
    private Integer employeesAffected;
    
    // Issues detected
    private List<LeaveIssueDTO> issues;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LeaveIssueDTO {
        private String employeeId;
        private String employeeName;
        private String severity; // WARNING, ERROR
        private String description;
        private String leaveType;
        private Integer daysAffected;
    }
}
