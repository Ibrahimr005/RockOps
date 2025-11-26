package com.example.backend.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * HR Manager Dashboard DTO
 * Provides comprehensive HR metrics and analytics
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class HRManagerDashboardDTO {
    // Employee Overview
    private Long totalEmployees;
    private Long activeEmployees;
    private Long inactiveEmployees;
    private Long newHiresThisMonth;
    private Map<String, Long> employeesByDepartment;
    private Map<String, Long> employeesByPosition;
    private Map<String, Long> employeesBySite;
    
    // Recruitment Metrics
    private Long totalVacancies;
    private Long activeVacancies;
    private Long filledVacancies;
    private Long totalCandidates;
    private Long pendingCandidates;
    private Map<String, Long> vacanciesByDepartment;
    
    // Attendance Metrics
    private Double averageAttendanceRate;
    private Long presentToday;
    private Long absentToday;
    private Long lateToday;
    private Map<String, Object> attendanceTrends;
    
    // Leave Management
    private Long pendingLeaveRequests;
    private Long approvedLeavesThisMonth;
    private Long rejectedLeavesThisMonth;
    private Map<String, Long> leavesByType;
    
    // Promotion Metrics
    private Long pendingPromotions;
    private Long approvedPromotionsThisYear;

    // Performance Metrics
    private Double employeeTurnoverRate;
    private Double averageTenure;
    private Map<String, Object> performanceDistribution;
    
    // Payroll Overview
    private Double totalMonthlySalary;
    private Long employeesOnPayroll;
    private Map<String, Object> salaryDistribution;
    
    // Alerts and Actions
    private Long expiringContracts;
    private Long missingDocuments;
    private Long pendingOnboarding;
    private List<String> urgentActions;
    
    // Recent Activities
    private List<Map<String, Object>> recentHires;
    private List<Map<String, Object>> recentPromotions;
    private List<Map<String, Object>> recentLeaveRequests;
}


