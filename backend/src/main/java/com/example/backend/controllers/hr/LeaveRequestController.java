package com.example.backend.controllers.hr;

import com.example.backend.dto.hr.leave.*;
import com.example.backend.models.hr.LeaveRequest;
import com.example.backend.services.hr.LeaveRequestService;
import com.example.backend.services.hr.LeaveRequestMapperService;
import com.example.backend.services.hr.VacationBalanceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/leave-requests")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*", maxAge = 3600)
public class LeaveRequestController {

    private final LeaveRequestService leaveRequestService;
    private final LeaveRequestMapperService mapperService;
    private final VacationBalanceService vacationBalanceService;

    /**
     * Submit a new leave request
     * POST /leave-requests
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'MANAGER', 'EMPLOYEE')")
    public ResponseEntity<?> submitLeaveRequest(
            @RequestBody LeaveRequestCreateDTO createDTO,
            Authentication authentication) {
        try {
            String createdBy = authentication.getName();
            LeaveRequest leaveRequest = leaveRequestService.submitLeaveRequest(createDTO, createdBy);
            LeaveRequestResponseDTO responseDTO = mapperService.mapToResponseDTO(leaveRequest);

            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "success", true,
                "message", "Leave request submitted successfully",
                "data", responseDTO
            ));
        } catch (Exception e) {
            log.error("Error submitting leave request", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    /**
     * Get leave requests with filtering
     * GET /leave-requests
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'MANAGER')")
    public ResponseEntity<?> getLeaveRequests(
            @RequestParam(required = false) String employeeId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String leaveType,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDirection) {
        try {
            LeaveRequestFilterDTO filterDTO = new LeaveRequestFilterDTO();
            if (employeeId != null) filterDTO.setEmployeeId(UUID.fromString(employeeId));
            // Set other filters...
            filterDTO.setPage(page);
            filterDTO.setSize(size);
            filterDTO.setSortBy(sortBy);
            filterDTO.setSortDirection(sortDirection);

            Page<LeaveRequest> leaveRequests = leaveRequestService.getLeaveRequests(filterDTO);
            List<LeaveRequestResponseDTO> responseDTOs = mapperService.mapToResponseDTOList(leaveRequests.getContent());

            return ResponseEntity.ok(Map.of(
                "success", true,
                "data", responseDTOs,
                "totalElements", leaveRequests.getTotalElements(),
                "totalPages", leaveRequests.getTotalPages(),
                "currentPage", leaveRequests.getNumber(),
                "size", leaveRequests.getSize()
            ));
        } catch (Exception e) {
            log.error("Error fetching leave requests", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    /**
     * Get leave request by ID
     * GET /leave-requests/{id}
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'MANAGER', 'EMPLOYEE')")
    public ResponseEntity<?> getLeaveRequest(@PathVariable UUID id) {
        try {
            // TODO: Add authorization check - employees can only see their own requests
            LeaveRequest leaveRequest = leaveRequestService.getLeaveRequests(new LeaveRequestFilterDTO())
                .getContent().stream()
                .filter(lr -> lr.getId().equals(id))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Leave request not found"));

            LeaveRequestResponseDTO responseDTO = mapperService.mapToResponseDTO(leaveRequest);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "data", responseDTO
            ));
        } catch (Exception e) {
            log.error("Error fetching leave request", e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    /**
     * Approve a leave request
     * PUT /leave-requests/{id}/approve
     */
    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'MANAGER')")
    public ResponseEntity<?> approveLeaveRequest(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> requestBody,
            Authentication authentication) {
        try {
            String reviewedBy = authentication.getName();
            String comments = requestBody != null ? requestBody.get("comments") : "";

            LeaveRequest approvedRequest = leaveRequestService.approveLeaveRequest(id, reviewedBy, comments);
            LeaveRequestResponseDTO responseDTO = mapperService.mapToResponseDTO(approvedRequest);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Leave request approved successfully",
                "data", responseDTO
            ));
        } catch (Exception e) {
            log.error("Error approving leave request", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    /**
     * Reject a leave request
     * PUT /leave-requests/{id}/reject
     */
    @PutMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'MANAGER')")
    public ResponseEntity<?> rejectLeaveRequest(
            @PathVariable UUID id,
            @RequestBody Map<String, String> requestBody,
            Authentication authentication) {
        try {
            String reviewedBy = authentication.getName();
            String comments = requestBody.get("comments");

            if (comments == null || comments.trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "success", false,
                    "error", "Comments are required when rejecting a leave request"
                ));
            }

            LeaveRequest rejectedRequest = leaveRequestService.rejectLeaveRequest(id, reviewedBy, comments);
            LeaveRequestResponseDTO responseDTO = mapperService.mapToResponseDTO(rejectedRequest);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Leave request rejected successfully",
                "data", responseDTO
            ));
        } catch (Exception e) {
            log.error("Error rejecting leave request", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    /**
     * Cancel a leave request (by employee)
     * PUT /leave-requests/{id}/cancel
     */
    @PutMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'MANAGER', 'EMPLOYEE')")
    public ResponseEntity<?> cancelLeaveRequest(
            @PathVariable UUID id,
            Authentication authentication) {
        try {
            String cancelledBy = authentication.getName();
            // TODO: Add authorization check - employees can only cancel their own requests

            LeaveRequest cancelledRequest = leaveRequestService.cancelLeaveRequest(id, cancelledBy);
            LeaveRequestResponseDTO responseDTO = mapperService.mapToResponseDTO(cancelledRequest);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Leave request cancelled successfully",
                "data", responseDTO
            ));
        } catch (Exception e) {
            log.error("Error cancelling leave request", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    /**
     * Get pending leave requests (for managers/HR)
     * GET /leave-requests/pending
     */
    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'MANAGER')")
    public ResponseEntity<?> getPendingLeaveRequests() {
        try {
            List<LeaveRequest> pendingRequests = leaveRequestService.getPendingLeaveRequests();
            List<LeaveRequestResponseDTO> responseDTOs = mapperService.mapToResponseDTOList(pendingRequests);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "data", responseDTOs,
                "count", responseDTOs.size()
            ));
        } catch (Exception e) {
            log.error("Error fetching pending leave requests", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    /**
     * Get employee's leave requests
     * GET /leave-requests/employee/{employeeId}
     */
    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER', 'HR_EMPLOYEE', 'MANAGER', 'EMPLOYEE')")
    public ResponseEntity<?> getEmployeeLeaveRequests(@PathVariable UUID employeeId) {
        try {
            // TODO: Add authorization check - employees can only see their own requests
            List<LeaveRequest> employeeRequests = leaveRequestService.getEmployeeLeaveRequests(employeeId);
            List<LeaveRequestResponseDTO> responseDTOs = mapperService.mapToResponseDTOList(employeeRequests);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "data", responseDTOs,
                "count", responseDTOs.size()
            ));
        } catch (Exception e) {
            log.error("Error fetching employee leave requests", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    /**
     * Get leave statistics
     * GET /leave-requests/statistics
     */
    @GetMapping("/statistics")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR_MANAGER')")
    public ResponseEntity<?> getLeaveStatistics(
            @RequestParam(required = false) Integer year) {
        try {
            Map<String, Object> statistics = leaveRequestService.getLeaveStatistics(year);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "data", statistics
            ));
        } catch (Exception e) {
            log.error("Error fetching leave statistics", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }
}
