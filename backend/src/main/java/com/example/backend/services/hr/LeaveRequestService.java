package com.example.backend.services.hr;

import com.example.backend.dto.hr.leave.*;
import com.example.backend.models.hr.*;
import com.example.backend.repositories.hr.*;
import com.example.backend.models.hr.LeaveRequest.LeaveStatus;
import com.example.backend.models.hr.LeaveRequest.LeaveType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class LeaveRequestService {

    private final LeaveRequestRepository leaveRequestRepository;
    private final VacationBalanceRepository vacationBalanceRepository;
    private final EmployeeRepository employeeRepository;
    private final AttendanceService attendanceService;
    private final VacationBalanceService vacationBalanceService;
    private final AttendanceRepository attendanceRepository;


    /**
     * Submit a new leave request
     */
    public LeaveRequest submitLeaveRequest(LeaveRequestCreateDTO createDTO, String createdBy) {
        log.info("Submitting leave request for employee: {}", createDTO.getEmployeeId());

        // Get employee
        UUID employeeId = createDTO.getEmployeeId() != null ?
                UUID.fromString(createDTO.getEmployeeId()) :
                getEmployeeIdFromUsername(createdBy);

        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        // Validate dates
        validateLeaveDates(createDTO.getStartDate(), createDTO.getEndDate());

        // Check for overlapping requests
        checkOverlappingRequests(employeeId, createDTO.getStartDate(), createDTO.getEndDate());

        // Check vacation balance if required
        if (createDTO.getLeaveType().requiresVacationBalance()) {
            int requestedDays = calculateWorkingDays(createDTO.getStartDate(), createDTO.getEndDate());
            checkVacationBalance(employeeId, requestedDays);
        }

        // Create leave request
        LeaveRequest leaveRequest = LeaveRequest.builder()
                .employee(employee)
                .leaveType(createDTO.getLeaveType())
                .startDate(createDTO.getStartDate())
                .endDate(createDTO.getEndDate())
                .reason(createDTO.getReason())
                .emergencyContact(createDTO.getEmergencyContact())
                .emergencyPhone(createDTO.getEmergencyPhone())
                .workDelegatedTo(createDTO.getWorkDelegatedTo())
                .delegationNotes(createDTO.getDelegationNotes())
                .status(LeaveStatus.PENDING)
                .createdBy(createdBy)
                .build();

        LeaveRequest savedRequest = leaveRequestRepository.save(leaveRequest);

        // Update pending days in vacation balance if applicable
        if (createDTO.getLeaveType().requiresVacationBalance()) {
            int workingDays = calculateWorkingDays(createDTO.getStartDate(), createDTO.getEndDate());
            vacationBalanceService.addPendingDays(employeeId, workingDays);
        }

        log.info("Leave request submitted successfully: {}", savedRequest.getId());
        return savedRequest;
    }

    /**
     * Approve a leave request
     */
    @Transactional
    public LeaveRequest approveLeaveRequest(UUID requestId, String reviewedBy, String comments) {
        log.info("Approving leave request: {} by: {}", requestId, reviewedBy);

        LeaveRequest leaveRequest = leaveRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Leave request not found"));

        if (leaveRequest.getStatus() != LeaveStatus.PENDING) {
            throw new RuntimeException("Only pending requests can be approved");
        }

        // Update request status
        leaveRequest.setStatus(LeaveStatus.APPROVED);
        leaveRequest.setReviewedBy(reviewedBy);
        leaveRequest.setReviewedAt(LocalDateTime.now());
        leaveRequest.setReviewComments(comments);

        LeaveRequest approvedRequest = leaveRequestRepository.save(leaveRequest);

        try {
            // Update vacation balance
            if (leaveRequest.getLeaveType().requiresVacationBalance()) {
                int workingDays = leaveRequest.calculateWorkingDays();
                vacationBalanceService.processApprovedLeave(
                        leaveRequest.getEmployee().getId(), workingDays);
            }

            // Update attendance records - with improved error handling
            updateAttendanceForApprovedLeave(leaveRequest);

        } catch (Exception e) {
            log.error("Error in post-approval processing for leave request {}: {}", requestId, e.getMessage(), e);
            // Consider whether you want to roll back the approval or continue
            // For now, we'll continue but log the error
        }

        log.info("Leave request approved successfully: {}", requestId);
        return approvedRequest;
    }


    /**
     * Reject a leave request
     */
    public LeaveRequest rejectLeaveRequest(UUID requestId, String reviewedBy, String comments) {
        log.info("Rejecting leave request: {} by: {}", requestId, reviewedBy);

        LeaveRequest leaveRequest = leaveRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Leave request not found"));

        if (leaveRequest.getStatus() != LeaveStatus.PENDING) {
            throw new RuntimeException("Only pending requests can be rejected");
        }

        // Update request status
        leaveRequest.setStatus(LeaveStatus.REJECTED);
        leaveRequest.setReviewedBy(reviewedBy);
        leaveRequest.setReviewedAt(LocalDateTime.now());
        leaveRequest.setReviewComments(comments);

        LeaveRequest rejectedRequest = leaveRequestRepository.save(leaveRequest);

        // Remove pending days from vacation balance if applicable
        if (leaveRequest.getLeaveType().requiresVacationBalance()) {
            int workingDays = leaveRequest.calculateWorkingDays();
            vacationBalanceService.removePendingDays(
                    leaveRequest.getEmployee().getId(), workingDays);
        }

        log.info("Leave request rejected successfully: {}", requestId);
        return rejectedRequest;
    }

    /**
     * Get leave requests with filtering
     */
    public Page<LeaveRequest> getLeaveRequests(LeaveRequestFilterDTO filterDTO) {
        Pageable pageable = PageRequest.of(
                filterDTO.getPage(),
                filterDTO.getSize(),
                Sort.by(Sort.Direction.fromString(filterDTO.getSortDirection()), filterDTO.getSortBy())
        );

        // TODO: Implement complex filtering based on filterDTO
        // For now, return all requests
        return leaveRequestRepository.findAll(pageable);
    }

    /**
     * Get leave requests by employee
     */
    public List<LeaveRequest> getEmployeeLeaveRequests(UUID employeeId) {
        return leaveRequestRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId);
    }

    /**
     * Get pending leave requests
     */
    public List<LeaveRequest> getPendingLeaveRequests() {
        return leaveRequestRepository.findByStatusOrderByCreatedAtDesc(LeaveStatus.PENDING);
    }

    /**
     * Cancel a leave request (by employee)
     */
    public LeaveRequest cancelLeaveRequest(UUID requestId, String cancelledBy) {
        log.info("Cancelling leave request: {} by: {}", requestId, cancelledBy);

        LeaveRequest leaveRequest = leaveRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Leave request not found"));

        if (!leaveRequest.canBeModified()) {
            throw new RuntimeException("Request cannot be cancelled in current status");
        }

        leaveRequest.setStatus(LeaveStatus.CANCELLED);
        leaveRequest.setUpdatedBy(cancelledBy);

        // Remove pending days if applicable
        if (leaveRequest.getLeaveType().requiresVacationBalance()) {
            int workingDays = leaveRequest.calculateWorkingDays();
            vacationBalanceService.removePendingDays(
                    leaveRequest.getEmployee().getId(), workingDays);
        }

        return leaveRequestRepository.save(leaveRequest);
    }

    // Private helper methods

    private void validateLeaveDates(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            throw new RuntimeException("Start date and end date are required");
        }
        if (startDate.isAfter(endDate)) {
            throw new RuntimeException("Start date cannot be after end date");
        }
        if (startDate.isBefore(LocalDate.now())) {
            throw new RuntimeException("Cannot request leave for past dates");
        }
    }

    private void checkOverlappingRequests(UUID employeeId, LocalDate startDate, LocalDate endDate) {
        List<LeaveStatus> activeStatuses = Arrays.asList(
                LeaveStatus.PENDING, LeaveStatus.APPROVED, LeaveStatus.IN_PROGRESS
        );

        List<LeaveRequest> overlappingRequests = leaveRequestRepository.findOverlappingRequests(
                employeeId, startDate, endDate, activeStatuses);

        if (!overlappingRequests.isEmpty()) {
            throw new RuntimeException("Leave request overlaps with existing request(s)");
        }
    }

    private void checkVacationBalance(UUID employeeId, int requestedDays) {
        VacationBalance balance = vacationBalanceService.getOrCreateBalance(employeeId, LocalDate.now().getYear());

        if (!balance.hasSufficientBalance(requestedDays)) {
            throw new RuntimeException(
                    String.format("Insufficient vacation balance. Requested: %d, Available: %d",
                            requestedDays, balance.getRemainingDays()));
        }
    }

    private void updateAttendanceForApprovedLeave(LeaveRequest leaveRequest) {
        log.info("Starting attendance update for approved leave request: {}", leaveRequest.getId());
        log.info("Leave period: {} to {}", leaveRequest.getStartDate(), leaveRequest.getEndDate());

        try {
            LocalDate currentDate = leaveRequest.getStartDate();
            int daysUpdated = 0;
            int daysSkipped = 0;

            while (!currentDate.isAfter(leaveRequest.getEndDate())) {
                // Log each date being processed
                log.debug("Processing date: {} (day of week: {})", currentDate, currentDate.getDayOfWeek());

                // Check if it's a working day (Monday=1 to Friday=5, or include Saturday=6 if needed)
                boolean isWorkingDay = currentDate.getDayOfWeek().getValue() <= 5; // Adjust if Saturday is working day

                if (isWorkingDay) {
                    try {
                        markLeaveDay(
                                leaveRequest.getEmployee().getId(),
                                currentDate,
                                leaveRequest.getLeaveType().name(),
                                true // approved
                        );
                        daysUpdated++;
                        log.debug("Successfully marked {} as leave day", currentDate);
                    } catch (Exception e) {
                        log.error("Failed to mark {} as leave day: {}", currentDate, e.getMessage(), e);
                        // Continue with other dates even if one fails
                    }
                } else {
                    daysSkipped++;
                    log.debug("Skipped {} (weekend)", currentDate);
                }

                currentDate = currentDate.plusDays(1);
            }

            log.info("Attendance update completed. Days updated: {}, Days skipped: {}", daysUpdated, daysSkipped);

        } catch (Exception e) {
            log.error("Error updating attendance for approved leave {}: {}", leaveRequest.getId(), e.getMessage(), e);
            throw e; // Re-throw to handle at higher level
        }
    }

    public void markLeaveDay(UUID employeeId, LocalDate date, String leaveType, boolean approved) {
        log.debug("Marking leave day - Employee: {}, Date: {}, Type: {}, Approved: {}",
                employeeId, date, leaveType, approved);

        try {
            // Use the employee from the leave request if available to avoid extra DB call
            Employee employee = employeeRepository.findById(employeeId)
                    .orElseThrow(() -> new RuntimeException("Employee not found: " + employeeId));

            // Check if attendance record already exists
            Optional<Attendance> existingAttendance = attendanceRepository
                    .findByEmployeeIdAndDate(employeeId, date);

            Attendance attendance;
            if (existingAttendance.isPresent()) {
                attendance = existingAttendance.get();
                log.debug("Found existing attendance record for {} on {}", employeeId, date);
            } else {
                attendance = Attendance.builder()
                        .employee(employee)
                        .date(date)
                        .dayType(Attendance.DayType.WORKING_DAY)
                        .createdAt(LocalDateTime.now())
                        .build();
                log.debug("Created new attendance record for {} on {}", employeeId, date);
            }

            // Update attendance for leave
            attendance.setStatus(Attendance.AttendanceStatus.ON_LEAVE);
            attendance.setLeaveType(leaveType);
            attendance.setLeaveApproved(approved);
            attendance.setUpdatedAt(LocalDateTime.now());

            Attendance savedAttendance = attendanceRepository.save(attendance);
            log.info("Successfully marked {} as {} leave for employee {} (ID: {})",
                    date, leaveType, employeeId, savedAttendance.getId());

        } catch (Exception e) {
            log.error("Error marking leave day for employee {} on {}: {}", employeeId, date, e.getMessage(), e);
            throw new RuntimeException("Failed to update attendance for date " + date + ": " + e.getMessage(), e);
        }
    }


    private int calculateWorkingDays(LocalDate startDate, LocalDate endDate) {
        int workingDays = 0;
        LocalDate current = startDate;

        while (!current.isAfter(endDate)) {
            if (current.getDayOfWeek().getValue() < 6) { // Monday to Friday
                workingDays++;
            }
            current = current.plusDays(1);
        }

        return workingDays;
    }

    private UUID getEmployeeIdFromUsername(String username) {
        // This should be implemented based on your authentication system
        // For now, throwing an exception to indicate it needs implementation
        throw new RuntimeException("Employee ID lookup by username not implemented");
    }

    /**
     * Get leave statistics for analytics
     */
    public Map<String, Object> getLeaveStatistics(Integer year) {
        if (year == null) {
            year = LocalDate.now().getYear();
        }

        Map<String, Object> stats = new HashMap<>();

        LocalDateTime startOfYear = LocalDateTime.of(year, 1, 1, 0, 0);
        LocalDateTime endOfYear = LocalDateTime.of(year, 12, 31, 23, 59);

        // Leave type breakdown
        List<Object[]> leaveTypeStats = leaveRequestRepository.getLeaveTypeStatistics(startOfYear, endOfYear);
        Map<String, Long> leaveTypeMap = leaveTypeStats.stream()
                .collect(Collectors.toMap(
                        obj -> ((LeaveType) obj[0]).getDisplayName(),
                        obj -> (Long) obj[1]
                ));

        // Monthly trends
        List<Object[]> monthlyStats = leaveRequestRepository.getMonthlyLeaveStatistics(year);
        Map<Integer, Long> monthlyMap = monthlyStats.stream()
                .collect(Collectors.toMap(
                        obj -> (Integer) obj[0],
                        obj -> (Long) obj[1]
                ));

        stats.put("year", year);
        stats.put("leaveTypeBreakdown", leaveTypeMap);
        stats.put("monthlyTrends", monthlyMap);

        return stats;
    }
}