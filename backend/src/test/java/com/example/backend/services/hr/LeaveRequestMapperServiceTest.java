package com.example.backend.services.hr;

import com.example.backend.dto.hr.leave.LeaveRequestResponseDTO;
import com.example.backend.models.hr.Department;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.hr.LeaveRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

class LeaveRequestMapperServiceTest {

    private LeaveRequestMapperService mapperService;

    @BeforeEach
    void setUp() {
        mapperService = new LeaveRequestMapperService();
    }

    private Employee createEmployee(boolean withJobPosition, boolean withDepartment) {
        Employee employee = new Employee();
        employee.setId(UUID.randomUUID());
        employee.setFirstName("John");
        employee.setLastName("Doe");

        if (withJobPosition) {
            JobPosition jobPosition = new JobPosition();
            jobPosition.setPositionName("Software Engineer");

            if (withDepartment) {
                Department department = new Department();
                department.setName("Engineering");
                jobPosition.setDepartment(department);
            }

            employee.setJobPosition(jobPosition);
        }

        return employee;
    }

    private LeaveRequest createLeaveRequest(Employee employee, LocalDateTime createdAt) {
        return LeaveRequest.builder()
                .id(UUID.randomUUID())
                .employee(employee)
                .leaveType(LeaveRequest.LeaveType.VACATION)
                .startDate(LocalDate.of(2026, 4, 1))
                .endDate(LocalDate.of(2026, 4, 5))
                .status(LeaveRequest.LeaveStatus.PENDING)
                .reason("Family vacation")
                .daysRequested(5)
                .reviewedBy("admin")
                .reviewedAt(LocalDateTime.of(2026, 3, 25, 10, 0))
                .reviewComments("Looks good")
                .emergencyContact("Jane Doe")
                .emergencyPhone("+1234567890")
                .workDelegatedTo("Bob Smith")
                .delegationNotes("Handle tickets")
                .createdAt(createdAt)
                .updatedAt(LocalDateTime.now())
                .createdBy("self")
                .build();
    }

    @Nested
    @DisplayName("mapToResponseDTO")
    class MapToResponseDTO {

        @Test
        @DisplayName("should map leave request with full data correctly")
        void shouldMapFullData() {
            Employee employee = createEmployee(true, true);
            LeaveRequest leaveRequest = createLeaveRequest(employee, LocalDateTime.now());

            LeaveRequestResponseDTO result = mapperService.mapToResponseDTO(leaveRequest);

            assertThat(result.getId()).isEqualTo(leaveRequest.getId());
            assertThat(result.getEmployeeId()).isEqualTo(employee.getId());
            assertThat(result.getEmployeeName()).isEqualTo(employee.getFullName());
            assertThat(result.getEmployeeDepartment()).isEqualTo("Engineering");
            assertThat(result.getEmployeePosition()).isEqualTo("Software Engineer");
            assertThat(result.getLeaveType()).isEqualTo(LeaveRequest.LeaveType.VACATION);
            assertThat(result.getLeaveTypeDisplay()).isEqualTo("Vacation Leave");
            assertThat(result.getStartDate()).isEqualTo(LocalDate.of(2026, 4, 1));
            assertThat(result.getEndDate()).isEqualTo(LocalDate.of(2026, 4, 5));
            assertThat(result.getStatus()).isEqualTo(LeaveRequest.LeaveStatus.PENDING);
            assertThat(result.getStatusDisplay()).isEqualTo("Pending Review");
            assertThat(result.getReason()).isEqualTo("Family vacation");
            assertThat(result.getDaysRequested()).isEqualTo(5);
            assertThat(result.getReviewedBy()).isEqualTo("admin");
            assertThat(result.getEmergencyContact()).isEqualTo("Jane Doe");
            assertThat(result.getWorkDelegatedTo()).isEqualTo("Bob Smith");
            assertThat(result.isCanBeModified()).isTrue(); // PENDING status
            assertThat(result.getWorkingDaysRequested()).isGreaterThan(0);
        }

        @Test
        @DisplayName("should handle null department gracefully")
        void shouldHandleNullDepartment() {
            Employee employee = createEmployee(true, false);
            LeaveRequest leaveRequest = createLeaveRequest(employee, LocalDateTime.now());

            LeaveRequestResponseDTO result = mapperService.mapToResponseDTO(leaveRequest);

            assertThat(result.getEmployeeDepartment()).isEqualTo("N/A");
            assertThat(result.getEmployeePosition()).isEqualTo("Software Engineer");
        }

        @Test
        @DisplayName("should handle null job position gracefully")
        void shouldHandleNullJobPosition() {
            Employee employee = createEmployee(false, false);
            LeaveRequest leaveRequest = createLeaveRequest(employee, LocalDateTime.now());

            LeaveRequestResponseDTO result = mapperService.mapToResponseDTO(leaveRequest);

            assertThat(result.getEmployeeDepartment()).isEqualTo("N/A");
            assertThat(result.getEmployeePosition()).isEqualTo("N/A");
        }

        @Test
        @DisplayName("should mark as overdue when created more than 3 days ago")
        void shouldMarkAsOverdue() {
            Employee employee = createEmployee(true, true);
            // Created 10 days ago - should be overdue
            LocalDateTime oldCreatedAt = LocalDate.now().minusDays(10).atStartOfDay();
            LeaveRequest leaveRequest = createLeaveRequest(employee, oldCreatedAt);

            LeaveRequestResponseDTO result = mapperService.mapToResponseDTO(leaveRequest);

            assertThat(result.isOverdue()).isTrue();
        }

        @Test
        @DisplayName("should not mark as overdue when created recently")
        void shouldNotMarkAsOverdueWhenRecent() {
            Employee employee = createEmployee(true, true);
            // Created just now - should not be overdue
            LocalDateTime recentCreatedAt = LocalDateTime.now();
            LeaveRequest leaveRequest = createLeaveRequest(employee, recentCreatedAt);

            LeaveRequestResponseDTO result = mapperService.mapToResponseDTO(leaveRequest);

            assertThat(result.isOverdue()).isFalse();
        }
    }

    @Nested
    @DisplayName("mapToResponseDTOList")
    class MapToResponseDTOList {

        @Test
        @DisplayName("should map list of leave requests")
        void shouldMapList() {
            Employee employee = createEmployee(true, true);
            LeaveRequest lr1 = createLeaveRequest(employee, LocalDateTime.now());
            LeaveRequest lr2 = createLeaveRequest(employee, LocalDateTime.now());

            List<LeaveRequestResponseDTO> result = mapperService.mapToResponseDTOList(List.of(lr1, lr2));

            assertThat(result).hasSize(2);
        }

        @Test
        @DisplayName("should return empty list for empty input")
        void shouldReturnEmptyList() {
            List<LeaveRequestResponseDTO> result = mapperService.mapToResponseDTOList(Collections.emptyList());

            assertThat(result).isEmpty();
        }
    }
}