package com.example.backend.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * User Dashboard DTO
 * Provides basic user-level metrics and personal information
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserDashboardDTO {
    // Personal Information
    private String userName;
    private String userRole;
    private String department;
    private String site;
    
    // Attendance
    private String attendanceStatus;
    private Double attendanceRate;
    private Long daysPresent;
    private Long daysAbsent;
    
    // Leave Balance
    private Double availableLeaveBalance;
    private Double usedLeaveBalance;
    private Long pendingLeaveRequests;
    
    // Tasks
    private Long assignedTasks;
    private Long completedTasks;
    private Long pendingTasks;
    
    // Notifications
    private Long unreadNotifications;
    private List<Map<String, Object>> recentNotifications;
    
    // Announcements
    private List<Map<String, Object>> recentAnnouncements;
    
    // Schedule
    private List<Map<String, Object>> upcomingEvents;
    
    // Quick Links
    private List<String> frequentlyUsedModules;
}

