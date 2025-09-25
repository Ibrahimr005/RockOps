package com.example.backend.services.hr;

import com.example.backend.dto.hr.leave.LeaveRequestResponseDTO;
import com.example.backend.models.hr.LeaveRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class LeaveRequestMapperService {

    public LeaveRequestResponseDTO mapToResponseDTO(LeaveRequest leaveRequest) {
        return LeaveRequestResponseDTO.builder()
            .id(leaveRequest.getId())
            .employeeId(leaveRequest.getEmployee().getId())
            .employeeName(leaveRequest.getEmployee().getFullName())
            .employeeDepartment(leaveRequest.getEmployee().getJobPosition() != null &&
                               leaveRequest.getEmployee().getJobPosition().getDepartment() != null ?
                               leaveRequest.getEmployee().getJobPosition().getDepartment().getName() : "N/A")
            .employeePosition(leaveRequest.getEmployee().getJobPosition() != null ?
                             leaveRequest.getEmployee().getJobPosition().getPositionName() : "N/A")
            .leaveType(leaveRequest.getLeaveType())
            .leaveTypeDisplay(leaveRequest.getLeaveType().getDisplayName())
            .startDate(leaveRequest.getStartDate())
            .endDate(leaveRequest.getEndDate())
            .status(leaveRequest.getStatus())
            .statusDisplay(leaveRequest.getStatus().getDisplayName())
            .reason(leaveRequest.getReason())
            .daysRequested(leaveRequest.getDaysRequested())
            .reviewedBy(leaveRequest.getReviewedBy())
            .reviewedAt(leaveRequest.getReviewedAt())
            .reviewComments(leaveRequest.getReviewComments())
            .emergencyContact(leaveRequest.getEmergencyContact())
            .emergencyPhone(leaveRequest.getEmergencyPhone())
            .workDelegatedTo(leaveRequest.getWorkDelegatedTo())
            .delegationNotes(leaveRequest.getDelegationNotes())
            .createdAt(leaveRequest.getCreatedAt())
            .updatedAt(leaveRequest.getUpdatedAt())
            .createdBy(leaveRequest.getCreatedBy())
            .canBeModified(leaveRequest.canBeModified())
            .isOverdue(leaveRequest.getCreatedAt().isBefore(LocalDate.now().minusDays(3).atStartOfDay()))
            .workingDaysRequested(leaveRequest.calculateWorkingDays())
            .build();
    }

    public List<LeaveRequestResponseDTO> mapToResponseDTOList(List<LeaveRequest> leaveRequests) {
        return leaveRequests.stream()
            .map(this::mapToResponseDTO)
            .collect(Collectors.toList());
    }
}