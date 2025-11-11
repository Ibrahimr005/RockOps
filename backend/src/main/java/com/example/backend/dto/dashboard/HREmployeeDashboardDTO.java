package com.example.backend.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * HR Employee Dashboard DTO
 * Provides HR employee-specific metrics and task management
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class HREmployeeDashboardDTO {
    // Quick Stats
    private Long totalEmployees;
    private Long newHiresThisMonth;
    private Long pendingTasks;
    
    // Recruitment Tasks
    private Long activeVacancies;
    private Long pendingCandidateReviews;
    private Long scheduledInterviews;
    private List<Map<String, Object>> upcomingInterviews;
    
    // Leave Management Tasks
    private Long pendingLeaveApprovals;
    private List<Map<String, Object>> recentLeaveRequests;
    
    // Document Management
    private Long pendingDocumentVerifications;
    private Long missingEmployeeDocuments;
    
    // Onboarding
    private Long pendingOnboardingTasks;
    private List<Map<String, Object>> newEmployeesToOnboard;
    
    // Employee Queries
    private Long pendingEmployeeQueries;
    
    // My Tasks
    private List<Map<String, Object>> assignedTasks;
    private List<Map<String, Object>> upcomingDeadlines;
    
    // Recent Activities
    private List<Map<String, Object>> recentActivities;
}

