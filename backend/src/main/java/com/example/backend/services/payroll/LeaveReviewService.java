// ========================================
// FILE: LeaveReviewService.java
// Service for processing leave requests in payroll
// ========================================

package com.example.backend.services.payroll;

import com.example.backend.dto.payroll.LeaveRequestDTO;
import com.example.backend.dto.payroll.LeaveReviewSummaryDTO;
import com.example.backend.models.hr.LeaveRequest;
import com.example.backend.models.payroll.EmployeePayroll;
import com.example.backend.models.payroll.Payroll;
import com.example.backend.repositories.hr.LeaveRequestRepository;
import com.example.backend.repositories.payroll.EmployeePayrollRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LeaveReviewService {

    private final LeaveRequestRepository leaveRequestRepository;
    private final EmployeePayrollRepository employeePayrollRepository;

    /**
     * Process leave review for a payroll period
     * Calculates excess leave days and applies deductions
     */
    @Transactional
    public LeaveReviewSummaryDTO processLeaveReview(Payroll payroll) {
        log.info("Processing leave review for payroll period: {} to {}", payroll.getStartDate(), payroll.getEndDate());

        try {
            // Get all leave requests that overlap with the payroll period
            List<LeaveRequest> allLeaves = leaveRequestRepository
                    .findByStartDateLessThanEqualAndEndDateGreaterThanEqual(
                            payroll.getEndDate(),
                            payroll.getStartDate()
                    );

            log.info("Found {} leave requests overlapping with payroll period", allLeaves.size());

            // Separate by status
            Map<LeaveRequest.LeaveStatus, List<LeaveRequest>> leavesByStatus = allLeaves.stream()
                    .collect(Collectors.groupingBy(LeaveRequest::getStatus));

            List<LeaveRequest> approvedLeaves = leavesByStatus.getOrDefault(
                    LeaveRequest.LeaveStatus.APPROVED, new ArrayList<>());
            List<LeaveRequest> pendingLeaves = leavesByStatus.getOrDefault(
                    LeaveRequest.LeaveStatus.PENDING, new ArrayList<>());
            List<LeaveRequest> rejectedLeaves = leavesByStatus.getOrDefault(
                    LeaveRequest.LeaveStatus.REJECTED, new ArrayList<>());

            int totalRequests = allLeaves.size();
            int approvedCount = approvedLeaves.size();
            int pendingCount = pendingLeaves.size();
            int rejectedCount = rejectedLeaves.size();

            log.info("Leave requests breakdown: {} approved, {} pending, {} rejected",
                    approvedCount, pendingCount, rejectedCount);

            int totalExcessLeaveDays = 0;
            int employeesAffected = 0;
            List<LeaveReviewSummaryDTO.LeaveIssueDTO> issues = new ArrayList<>();

            // Group approved leaves by employee
            Map<UUID, List<LeaveRequest>> leavesByEmployee = approvedLeaves.stream()
                    .collect(Collectors.groupingBy(leave -> leave.getEmployee().getId()));

            for (Map.Entry<UUID, List<LeaveRequest>> entry : leavesByEmployee.entrySet()) {
                UUID employeeId = entry.getKey();
                List<LeaveRequest> employeeLeaves = entry.getValue();

                try {
                    // Get employee payroll record
                    EmployeePayroll employeePayroll = employeePayrollRepository
                            .findByPayrollIdAndEmployeeId(payroll.getId(), employeeId)
                            .orElse(null);

                    if (employeePayroll == null) {
                        log.warn("No employee payroll found for employee {}, skipping", employeeId);
                        continue;
                    }

                    // Calculate total leave days for this payroll period
                    int totalLeaveDaysInPeriod = employeeLeaves.stream()
                            .mapToInt(leave -> calculateOverlappingDays(
                                    leave.getStartDate(),
                                    leave.getEndDate(),
                                    payroll.getStartDate(),
                                    payroll.getEndDate()
                            ))
                            .sum();

                    log.info("Employee {}: {} total leave days in payroll period",
                            employeePayroll.getEmployeeName(), totalLeaveDaysInPeriod);

                    // Calculate excess leave days (assuming 21 annual leave balance)
                    // This should ideally come from Employee entity or contract
                    int annualLeaveBalance = 21; // Default, you should fetch from Employee
                    int usedLeaveDays = totalLeaveDaysInPeriod; // Simplified, should track year-to-date
                    int excessDays = Math.max(0, usedLeaveDays - annualLeaveBalance);

                    if (excessDays > 0) {
                        // Apply leave deduction
                        employeePayroll.setExcessLeaveDays(excessDays);
                        totalExcessLeaveDays += excessDays;
                        employeesAffected++;

                        // Create issue
                        issues.add(LeaveReviewSummaryDTO.LeaveIssueDTO.builder()
                                .employeeId(employeeId.toString())
                                .employeeName(employeePayroll.getEmployeeName())
                                .severity("WARNING")
                                .description(String.format(
                                        "%d excess leave day(s) detected (used: %d, balance: %d)",
                                        excessDays, usedLeaveDays, annualLeaveBalance))
                                .leaveType(employeeLeaves.get(0).getLeaveType().name())
                                .daysAffected(excessDays)
                                .build());

                        log.info("Employee {} has {} excess leave days",
                                employeePayroll.getEmployeeName(), excessDays);
                    }

                    employeePayrollRepository.save(employeePayroll);

                } catch (Exception e) {
                    log.error("Error processing leave for employee {}: {}", employeeId, e.getMessage(), e);

                    // Add error issue
                    issues.add(LeaveReviewSummaryDTO.LeaveIssueDTO.builder()
                            .employeeId(employeeId.toString())
                            .employeeName("Unknown")
                            .severity("ERROR")
                            .description("Failed to process leave: " + e.getMessage())
                            .build());
                }
            }

            // Mark as processed
            payroll.markLeaveProcessed();

            // Create summary JSON
            String summaryJson = createSummaryJson(totalRequests, approvedCount, pendingCount,
                    rejectedCount, totalExcessLeaveDays, employeesAffected);
            payroll.setLeaveSummary(summaryJson);

            // Build response
            String status = issues.isEmpty() ? "SUCCESS" : "SUCCESS_WITH_WARNINGS";
            String message = String.format(
                    "Processed %d leave request(s): %d approved, %d pending, %d rejected. " +
                            "%d excess day(s) found affecting %d employee(s).",
                    totalRequests, approvedCount, pendingCount, rejectedCount,
                    totalExcessLeaveDays, employeesAffected);

            return LeaveReviewSummaryDTO.builder()
                    .status(status)
                    .message(message)
                    .totalRequests(totalRequests)
                    .approvedRequests(approvedCount)
                    .pendingRequests(pendingCount)
                    .rejectedRequests(rejectedCount)
                    .excessLeaveDays(totalExcessLeaveDays)
                    .employeesAffected(employeesAffected)
                    .issues(issues)
                    .build();

        } catch (Exception e) {
            log.error("Error processing leave review", e);
            return LeaveReviewSummaryDTO.builder()
                    .status("FAILURE")
                    .message("Failed to process leave review: " + e.getMessage())
                    .totalRequests(0)
                    .approvedRequests(0)
                    .pendingRequests(0)
                    .rejectedRequests(0)
                    .excessLeaveDays(0)
                    .employeesAffected(0)
                    .issues(new ArrayList<>())
                    .build();
        }
    }

    /**
     * Get leave requests for a specific period
     */
    public List<LeaveRequestDTO> getLeaveRequestsForPeriod(LocalDate startDate, LocalDate endDate) {
        log.info("Fetching leave requests for period {} to {}", startDate, endDate);

        try {
            // Find all leave requests that overlap with the period
            List<LeaveRequest> leaves = leaveRequestRepository
                    .findByStartDateLessThanEqualAndEndDateGreaterThanEqual(endDate, startDate);

            log.info("Found {} leave requests", leaves.size());

            return leaves.stream()
                    .map(this::convertToDTO)
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Error fetching leave requests", e);
            return new ArrayList<>();
        }
    }

    // Helper methods

    /**
     * Calculate how many days a leave request overlaps with a given period
     */
    private int calculateOverlappingDays(LocalDate leaveStart, LocalDate leaveEnd,
                                         LocalDate periodStart, LocalDate periodEnd) {
        LocalDate overlapStart = leaveStart.isBefore(periodStart) ? periodStart : leaveStart;
        LocalDate overlapEnd = leaveEnd.isAfter(periodEnd) ? periodEnd : leaveEnd;

        if (overlapStart.isAfter(overlapEnd)) {
            return 0;
        }

        // Count working days (excluding Friday and Saturday)
        int workingDays = 0;
        LocalDate current = overlapStart;

        while (!current.isAfter(overlapEnd)) {
            int dayValue = current.getDayOfWeek().getValue();
            // Exclude Friday (5) and Saturday (6)
            if (dayValue != 5 && dayValue != 6) {
                workingDays++;
            }
            current = current.plusDays(1);
        }

        return workingDays;
    }

    private String createSummaryJson(int total, int approved, int pending, int rejected,
                                     int excessDays, int employeesAffected) {
        return String.format(
                "{\"totalRequests\":%d,\"approvedRequests\":%d,\"pendingRequests\":%d," +
                        "\"rejectedRequests\":%d,\"excessLeaveDays\":%d,\"employeesAffected\":%d}",
                total, approved, pending, rejected, excessDays, employeesAffected
        );
    }

    private LeaveRequestDTO convertToDTO(LeaveRequest leave) {
        return LeaveRequestDTO.builder()
                .id(leave.getId())
                .employeeId(leave.getEmployee().getId())
                .employeeName(leave.getEmployee().getFullName())
                .leaveType(leave.getLeaveType().name())
                .startDate(leave.getStartDate())
                .endDate(leave.getEndDate())
                .numberOfDays(leave.getDaysRequested())
                .status(leave.getStatus().name())
                .reason(leave.getReason())
                .approvedBy(leave.getStatus() == LeaveRequest.LeaveStatus.APPROVED ? leave.getReviewedBy() : null)
                .approvedAt(leave.getStatus() == LeaveRequest.LeaveStatus.APPROVED ?
                        (leave.getReviewedAt() != null ? leave.getReviewedAt().toLocalDate() : null) : null)
                .rejectedBy(leave.getStatus() == LeaveRequest.LeaveStatus.REJECTED ? leave.getReviewedBy() : null)
                .rejectedAt(leave.getStatus() == LeaveRequest.LeaveStatus.REJECTED ?
                        (leave.getReviewedAt() != null ? leave.getReviewedAt().toLocalDate() : null) : null)
                .rejectionReason(leave.getStatus() == LeaveRequest.LeaveStatus.REJECTED ? leave.getReviewComments() : null)
                .build();
    }
}