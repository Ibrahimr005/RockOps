package com.example.backend.services.hr;

import com.example.backend.dto.hr.leave.LeaveRequestCreateDTO;
import com.example.backend.dto.hr.leave.LeaveRequestFilterDTO;
import com.example.backend.dto.hr.leave.VacationBalanceResponseDTO;
import com.example.backend.exceptions.InsufficientVacationBalanceException;
import com.example.backend.models.hr.Attendance;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.LeaveRequest;
import com.example.backend.models.hr.LeaveRequest.LeaveStatus;
import com.example.backend.models.hr.LeaveRequest.LeaveType;
import com.example.backend.repositories.hr.AttendanceRepository;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.hr.LeaveRequestRepository;
import com.example.backend.repositories.hr.VacationBalanceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LeaveRequestServiceTest {

    @Mock
    private LeaveRequestRepository leaveRequestRepository;

    @Mock
    private VacationBalanceRepository vacationBalanceRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private AttendanceService attendanceService;

    @Mock
    private VacationBalanceService vacationBalanceService;

    @Mock
    private AttendanceRepository attendanceRepository;

    @InjectMocks
    private LeaveRequestService leaveRequestService;

    private Employee employee;
    private UUID employeeId;
    private LeaveRequest leaveRequest;
    private UUID leaveRequestId;

    @BeforeEach
    void setUp() {
        employeeId = UUID.randomUUID();
        leaveRequestId = UUID.randomUUID();

        employee = Employee.builder()
                .id(employeeId)
                .firstName("John")
                .lastName("Doe")
                .status("ACTIVE")
                .build();

        leaveRequest = LeaveRequest.builder()
                .id(leaveRequestId)
                .employee(employee)
                .leaveType(LeaveType.VACATION)
                .startDate(LocalDate.now().plusDays(5))
                .endDate(LocalDate.now().plusDays(10))
                .status(LeaveStatus.PENDING)
                .reason("Family vacation")
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Nested
    @DisplayName("submitLeaveRequest")
    class SubmitLeaveRequest {

        @Test
        @DisplayName("should submit leave request for balance-requiring type")
        void shouldSubmitWithBalanceCheck() {
            LeaveRequestCreateDTO dto = new LeaveRequestCreateDTO();
            dto.setEmployeeId(employeeId.toString());
            dto.setLeaveType(LeaveType.VACATION);
            dto.setStartDate(LocalDate.now().plusDays(5));
            dto.setEndDate(LocalDate.now().plusDays(10));
            dto.setReason("Vacation");

            VacationBalanceResponseDTO balance = VacationBalanceResponseDTO.builder()
                    .remainingDays(20)
                    .build();

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(leaveRequestRepository.findOverlappingRequests(eq(employeeId), any(), any(), any()))
                    .thenReturn(Collections.emptyList());
            when(vacationBalanceService.getVacationBalance(employeeId)).thenReturn(balance);
            when(leaveRequestRepository.save(any(LeaveRequest.class))).thenAnswer(inv -> {
                LeaveRequest lr = inv.getArgument(0);
                lr.setId(UUID.randomUUID());
                return lr;
            });

            LeaveRequest result = leaveRequestService.submitLeaveRequest(dto, "admin");

            assertThat(result).isNotNull();
            assertThat(result.getStatus()).isEqualTo(LeaveStatus.PENDING);
            verify(vacationBalanceService).getVacationBalance(employeeId);
            verify(vacationBalanceService).addPendingDays(eq(employeeId), anyInt());
        }

        @Test
        @DisplayName("should submit leave request for non-balance type")
        void shouldSubmitWithoutBalanceCheck() {
            LeaveRequestCreateDTO dto = new LeaveRequestCreateDTO();
            dto.setEmployeeId(employeeId.toString());
            dto.setLeaveType(LeaveType.SICK);
            dto.setStartDate(LocalDate.now().plusDays(1));
            dto.setEndDate(LocalDate.now().plusDays(2));
            dto.setReason("Feeling sick");

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(leaveRequestRepository.findOverlappingRequests(eq(employeeId), any(), any(), any()))
                    .thenReturn(Collections.emptyList());
            when(leaveRequestRepository.save(any(LeaveRequest.class))).thenAnswer(inv -> {
                LeaveRequest lr = inv.getArgument(0);
                lr.setId(UUID.randomUUID());
                return lr;
            });

            LeaveRequest result = leaveRequestService.submitLeaveRequest(dto, "admin");

            assertThat(result).isNotNull();
            verify(vacationBalanceService, never()).getVacationBalance(any());
        }

        @Test
        @DisplayName("should throw when employee not found")
        void shouldThrowWhenEmployeeNotFound() {
            LeaveRequestCreateDTO dto = new LeaveRequestCreateDTO();
            dto.setEmployeeId(UUID.randomUUID().toString());
            dto.setStartDate(LocalDate.now().plusDays(1));
            dto.setEndDate(LocalDate.now().plusDays(2));
            dto.setLeaveType(LeaveType.SICK);

            when(employeeRepository.findById(any(UUID.class))).thenReturn(Optional.empty());

            assertThatThrownBy(() -> leaveRequestService.submitLeaveRequest(dto, "admin"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Employee not found");
        }

        @Test
        @DisplayName("should throw when start date is null")
        void shouldThrowWhenStartDateNull() {
            LeaveRequestCreateDTO dto = new LeaveRequestCreateDTO();
            dto.setEmployeeId(employeeId.toString());
            dto.setLeaveType(LeaveType.SICK);
            dto.setEndDate(LocalDate.now().plusDays(2));

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));

            assertThatThrownBy(() -> leaveRequestService.submitLeaveRequest(dto, "admin"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Start date and end date are required");
        }

        @Test
        @DisplayName("should throw when start date is after end date")
        void shouldThrowWhenStartAfterEnd() {
            LeaveRequestCreateDTO dto = new LeaveRequestCreateDTO();
            dto.setEmployeeId(employeeId.toString());
            dto.setLeaveType(LeaveType.SICK);
            dto.setStartDate(LocalDate.now().plusDays(10));
            dto.setEndDate(LocalDate.now().plusDays(5));

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));

            assertThatThrownBy(() -> leaveRequestService.submitLeaveRequest(dto, "admin"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Start date cannot be after end date");
        }

        @Test
        @DisplayName("should throw for past dates")
        void shouldThrowForPastDates() {
            LeaveRequestCreateDTO dto = new LeaveRequestCreateDTO();
            dto.setEmployeeId(employeeId.toString());
            dto.setLeaveType(LeaveType.SICK);
            dto.setStartDate(LocalDate.now().minusDays(5));
            dto.setEndDate(LocalDate.now().minusDays(2));

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));

            assertThatThrownBy(() -> leaveRequestService.submitLeaveRequest(dto, "admin"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Cannot request leave for past dates");
        }

        @Test
        @DisplayName("should throw for overlapping requests")
        void shouldThrowForOverlap() {
            LeaveRequestCreateDTO dto = new LeaveRequestCreateDTO();
            dto.setEmployeeId(employeeId.toString());
            dto.setLeaveType(LeaveType.SICK);
            dto.setStartDate(LocalDate.now().plusDays(5));
            dto.setEndDate(LocalDate.now().plusDays(10));

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(leaveRequestRepository.findOverlappingRequests(eq(employeeId), any(), any(), any()))
                    .thenReturn(List.of(leaveRequest));

            assertThatThrownBy(() -> leaveRequestService.submitLeaveRequest(dto, "admin"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("overlaps");
        }

        @Test
        @DisplayName("should throw for insufficient vacation balance")
        void shouldThrowForInsufficientBalance() {
            LeaveRequestCreateDTO dto = new LeaveRequestCreateDTO();
            dto.setEmployeeId(employeeId.toString());
            dto.setLeaveType(LeaveType.VACATION);
            dto.setStartDate(LocalDate.now().plusDays(1));
            dto.setEndDate(LocalDate.now().plusDays(20));

            VacationBalanceResponseDTO balance = VacationBalanceResponseDTO.builder()
                    .remainingDays(2)
                    .build();

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(leaveRequestRepository.findOverlappingRequests(eq(employeeId), any(), any(), any()))
                    .thenReturn(Collections.emptyList());
            when(vacationBalanceService.getVacationBalance(employeeId)).thenReturn(balance);

            assertThatThrownBy(() -> leaveRequestService.submitLeaveRequest(dto, "admin"))
                    .isInstanceOf(InsufficientVacationBalanceException.class);
        }
    }

    @Nested
    @DisplayName("approveLeaveRequest")
    class ApproveLeaveRequest {

        @Test
        @DisplayName("should approve pending request")
        void shouldApprove() {
            when(leaveRequestRepository.findById(leaveRequestId)).thenReturn(Optional.of(leaveRequest));
            when(leaveRequestRepository.save(any(LeaveRequest.class))).thenAnswer(inv -> inv.getArgument(0));

            LeaveRequest result = leaveRequestService.approveLeaveRequest(leaveRequestId, "manager", "Approved");

            assertThat(result.getStatus()).isEqualTo(LeaveStatus.APPROVED);
            assertThat(result.getReviewedBy()).isEqualTo("manager");
            assertThat(result.getReviewComments()).isEqualTo("Approved");
        }

        @Test
        @DisplayName("should throw when request not found")
        void shouldThrowWhenNotFound() {
            UUID unknownId = UUID.randomUUID();
            when(leaveRequestRepository.findById(unknownId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> leaveRequestService.approveLeaveRequest(unknownId, "manager", "ok"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Leave request not found");
        }

        @Test
        @DisplayName("should throw when request is not pending")
        void shouldThrowWhenNotPending() {
            leaveRequest.setStatus(LeaveStatus.APPROVED);
            when(leaveRequestRepository.findById(leaveRequestId)).thenReturn(Optional.of(leaveRequest));

            assertThatThrownBy(() -> leaveRequestService.approveLeaveRequest(leaveRequestId, "manager", "ok"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Only pending requests can be approved");
        }
    }

    @Nested
    @DisplayName("rejectLeaveRequest")
    class RejectLeaveRequest {

        @Test
        @DisplayName("should reject pending request")
        void shouldReject() {
            when(leaveRequestRepository.findById(leaveRequestId)).thenReturn(Optional.of(leaveRequest));
            when(leaveRequestRepository.save(any(LeaveRequest.class))).thenAnswer(inv -> inv.getArgument(0));

            LeaveRequest result = leaveRequestService.rejectLeaveRequest(leaveRequestId, "manager", "Insufficient staffing");

            assertThat(result.getStatus()).isEqualTo(LeaveStatus.REJECTED);
            assertThat(result.getReviewedBy()).isEqualTo("manager");
        }

        @Test
        @DisplayName("should throw when request is not pending")
        void shouldThrowWhenNotPending() {
            leaveRequest.setStatus(LeaveStatus.REJECTED);
            when(leaveRequestRepository.findById(leaveRequestId)).thenReturn(Optional.of(leaveRequest));

            assertThatThrownBy(() -> leaveRequestService.rejectLeaveRequest(leaveRequestId, "manager", "reason"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Only pending requests can be rejected");
        }
    }

    @Nested
    @DisplayName("getLeaveRequests")
    class GetLeaveRequests {

        @Test
        @DisplayName("should return paginated results")
        void shouldReturnPage() {
            LeaveRequestFilterDTO filterDTO = new LeaveRequestFilterDTO();
            filterDTO.setPage(0);
            filterDTO.setSize(10);
            filterDTO.setSortBy("createdAt");
            filterDTO.setSortDirection("desc");

            Page<LeaveRequest> page = new PageImpl<>(List.of(leaveRequest));
            when(leaveRequestRepository.findAll(any(Pageable.class))).thenReturn(page);

            Page<LeaveRequest> result = leaveRequestService.getLeaveRequests(filterDTO);

            assertThat(result.getContent()).hasSize(1);
        }
    }

    @Nested
    @DisplayName("getEmployeeLeaveRequests")
    class GetEmployeeLeaveRequests {

        @Test
        @DisplayName("should return employee leave requests")
        void shouldReturnList() {
            when(leaveRequestRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId))
                    .thenReturn(List.of(leaveRequest));

            List<LeaveRequest> result = leaveRequestService.getEmployeeLeaveRequests(employeeId);

            assertThat(result).hasSize(1);
        }
    }

    @Nested
    @DisplayName("getPendingLeaveRequests")
    class GetPendingLeaveRequests {

        @Test
        @DisplayName("should return pending requests")
        void shouldReturnPending() {
            when(leaveRequestRepository.findByStatusOrderByCreatedAtDesc(LeaveStatus.PENDING))
                    .thenReturn(List.of(leaveRequest));

            List<LeaveRequest> result = leaveRequestService.getPendingLeaveRequests();

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getStatus()).isEqualTo(LeaveStatus.PENDING);
        }
    }

    @Nested
    @DisplayName("cancelLeaveRequest")
    class CancelLeaveRequest {

        @Test
        @DisplayName("should cancel pending request")
        void shouldCancel() {
            when(leaveRequestRepository.findById(leaveRequestId)).thenReturn(Optional.of(leaveRequest));
            when(leaveRequestRepository.save(any(LeaveRequest.class))).thenAnswer(inv -> inv.getArgument(0));

            LeaveRequest result = leaveRequestService.cancelLeaveRequest(leaveRequestId, "employee");

            assertThat(result.getStatus()).isEqualTo(LeaveStatus.CANCELLED);
            assertThat(result.getUpdatedBy()).isEqualTo("employee");
        }

        @Test
        @DisplayName("should throw when request not found")
        void shouldThrowWhenNotFound() {
            UUID unknownId = UUID.randomUUID();
            when(leaveRequestRepository.findById(unknownId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> leaveRequestService.cancelLeaveRequest(unknownId, "employee"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Leave request not found");
        }

        @Test
        @DisplayName("should throw when request cannot be modified")
        void shouldThrowWhenCannotModify() {
            leaveRequest.setStatus(LeaveStatus.APPROVED);
            when(leaveRequestRepository.findById(leaveRequestId)).thenReturn(Optional.of(leaveRequest));

            assertThatThrownBy(() -> leaveRequestService.cancelLeaveRequest(leaveRequestId, "employee"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("cannot be cancelled");
        }
    }

    @Nested
    @DisplayName("markLeaveDay")
    class MarkLeaveDay {

        @Test
        @DisplayName("should create new attendance record for leave")
        void shouldCreateNewRecord() {
            LocalDate date = LocalDate.now().plusDays(5);
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(attendanceRepository.findByEmployeeIdAndDate(employeeId, date)).thenReturn(Optional.empty());
            when(attendanceRepository.save(any(Attendance.class))).thenAnswer(inv -> {
                Attendance a = inv.getArgument(0);
                a.setId(UUID.randomUUID());
                return a;
            });

            leaveRequestService.markLeaveDay(employeeId, date, "VACATION", true);

            verify(attendanceRepository).save(argThat(attendance ->
                    attendance.getStatus() == Attendance.AttendanceStatus.ON_LEAVE &&
                            attendance.getLeaveType().equals("VACATION") &&
                            attendance.getLeaveApproved()
            ));
        }

        @Test
        @DisplayName("should update existing attendance record")
        void shouldUpdateExistingRecord() {
            LocalDate date = LocalDate.now().plusDays(5);
            Attendance existing = Attendance.builder()
                    .id(UUID.randomUUID())
                    .employee(employee)
                    .date(date)
                    .status(Attendance.AttendanceStatus.ABSENT)
                    .build();

            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(attendanceRepository.findByEmployeeIdAndDate(employeeId, date)).thenReturn(Optional.of(existing));
            when(attendanceRepository.save(any(Attendance.class))).thenReturn(existing);

            leaveRequestService.markLeaveDay(employeeId, date, "SICK", true);

            verify(attendanceRepository).save(argThat(attendance ->
                    attendance.getStatus() == Attendance.AttendanceStatus.ON_LEAVE &&
                            attendance.getLeaveType().equals("SICK")
            ));
        }
    }

    @Nested
    @DisplayName("getLeaveStatistics")
    class GetLeaveStatistics {

        @Test
        @DisplayName("should return statistics for given year")
        void shouldReturnStatsForYear() {
            int year = 2026;
            when(leaveRequestRepository.getLeaveTypeStatistics(any(LocalDateTime.class), any(LocalDateTime.class)))
                    .thenReturn(Collections.emptyList());
            when(leaveRequestRepository.getMonthlyLeaveStatistics(year)).thenReturn(Collections.emptyList());

            Map<String, Object> stats = leaveRequestService.getLeaveStatistics(year);

            assertThat(stats).containsEntry("year", year);
            assertThat(stats).containsKey("leaveTypeBreakdown");
            assertThat(stats).containsKey("monthlyTrends");
        }

        @Test
        @DisplayName("should use current year when year is null")
        void shouldUseCurrentYearWhenNull() {
            int currentYear = LocalDate.now().getYear();
            when(leaveRequestRepository.getLeaveTypeStatistics(any(LocalDateTime.class), any(LocalDateTime.class)))
                    .thenReturn(Collections.emptyList());
            when(leaveRequestRepository.getMonthlyLeaveStatistics(currentYear)).thenReturn(Collections.emptyList());

            Map<String, Object> stats = leaveRequestService.getLeaveStatistics(null);

            assertThat(stats).containsEntry("year", currentYear);
        }
    }
}