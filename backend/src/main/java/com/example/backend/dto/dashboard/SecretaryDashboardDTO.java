package com.example.backend.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Secretary Dashboard DTO
 * Provides administrative support metrics and task management
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SecretaryDashboardDTO {
    // Document Management
    private Long totalDocuments;
    private Long pendingDocuments;
    private Long approvedDocuments;
    private Long recentUploads;
    private Map<String, Long> documentsByType;
    
    // Communication Tasks
    private Long pendingNotifications;
    private Long sentNotificationsToday;
    private Long pendingAnnouncements;
    
    // Approval Workflows
    private Long pendingApprovals;
    private Long requestsAwaitingReview;
    private Map<String, Long> approvalsByType;
    
    // Visitor Management
    private Long visitorsToday;
    private Long scheduledVisits;
    private List<Map<String, Object>> upcomingVisitors;
    
    // Meeting Management
    private Long meetingsToday;
    private Long upcomingMeetings;
    private List<Map<String, Object>> todaySchedule;
    
    // Employee Support
    private Long employeeQueries;
    private Long pendingTickets;
    private Long resolvedTicketsToday;
    
    // Calendar Management
    private List<Map<String, Object>> upcomingEvents;
    private List<Map<String, Object>> deadlines;
    
    // Task Overview
    private Long totalTasks;
    private Long completedTasks;
    private Long pendingTasks;
    private Long overdueTask;
    private List<Map<String, Object>> priorityTasks;
    
    // Alerts
    private List<String> urgentAlerts;
    private List<Map<String, Object>> reminders;
    
    // Recent Activities
    private List<Map<String, Object>> recentActivities;
}

