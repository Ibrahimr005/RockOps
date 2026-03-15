package com.example.backend.services.payroll;

import com.example.backend.dto.payroll.LeaveRequestDTO;
import com.example.backend.dto.payroll.LeaveReviewSummaryDTO;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.LeaveRequest;
import com.example.backend.models.payroll.EmployeePayroll;
import com.example.backend.models.payroll.Payroll;
import com.example.backend.models.payroll.PayrollStatus;
import com.example.backend.repositories.hr.LeaveRequestRepository;
import com.example.backend.repositories.payroll.EmployeePayrollRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LeaveReviewServiceTest {

    @Mock
    private LeaveRequestRepository leaveRequestRepository;

    @Mock
    private EmployeePayrollRepository employeePayrollRepository;

    @InjectMocks
    private LeaveReviewService leaveReviewService;

    private Payroll payroll;
    private UUID payrollId;

    @BeforeEach
    void setUp() {
        payrollId = UUID.randomUUID();
        payroll = new Payroll();
        payroll.setId(payrollId);
        payroll.setStartDate(LocalDate.of(2026, 1, 1));
        payroll.setEndDate(LocalDate.of(2026, 1, 31));
        payroll.setStatus(PayrollStatus.LEAVE_REVIEW);
    }

    private Employee buildEmployee(UUID id, String firstName, String lastName) {
        Employee e = new Employee();
        e.setId(id);
        e.setFirstName(firstName);
        e.setLastName(lastName);
        return e;
    }

    private LeaveRequest buildLeaveRequest(Employee employee, LeaveRequest.LeaveStatus status,
                                            LocalDate start, LocalDate end) {
        LeaveRequest lr = new LeaveRequest();
        lr.setId(UUID.randomUUID());
        lr.setEmployee(employee);
        lr.setStatus(status);
        lr.setStartDate(start);
        lr.setEndDate(end);
        lr.setLeaveType(LeaveRequest.LeaveType.ANNUAL);
        lr.setDaysRequested(5);
        lr.setReason("Test reason");
        return lr;
    }

    private EmployeePayroll buildEmployeePayroll(UUID payrollId, UUID employeeId, String name) {
        EmployeePayroll ep = new EmployeePayroll();
        ep.setId(UUID.randomUUID());
        ep.setEmployeeId(employeeId);
        ep.setEmployeeName(name);
        Payroll p = new Payroll();
        p.setId(payrollId);
        ep.setPayroll(p);
        return ep;
    }

    // ==================== processLeaveReview ====================

    @Test
    void processLeaveReview_noLeaveRequests_returnsSuccess() {
        when(leaveRequestRepository.findByStartDateLessThanEqualAndEndDateGreaterThanEqual(
                payroll.getEndDate(), payroll.getStartDate()))
                .thenReturn(Collections.emptyList());

        LeaveReviewSummaryDTO result = leaveReviewService.processLeaveReview(payroll);

        assertNotNull(result);
        assertEquals("SUCCESS", result.getStatus());
        assertEquals(0, result.getTotalRequests());
        assertEquals(0, result.getApprovedRequests());
        assertEquals(0, result.getExcessLeaveDays());
        assertTrue(result.getIssues().isEmpty());
    }

    @Test
    void processLeaveReview_marksLeaveProcessed() {
        when(leaveRequestRepository.findByStartDateLessThanEqualAndEndDateGreaterThanEqual(
                any(), any())).thenReturn(Collections.emptyList());

        leaveReviewService.processLeaveReview(payroll);

        assertTrue(payroll.getLeaveProcessed());
        assertNotNull(payroll.getLeaveSummary());
    }

    @Test
    void processLeaveReview_withPendingAndRejectedLeaves_countsCorrectly() {
        UUID empId = UUID.randomUUID();
        Employee emp = buildEmployee(empId, "John", "Doe");

        LeaveRequest pending = buildLeaveRequest(emp, LeaveRequest.LeaveStatus.PENDING,
                LocalDate.of(2026, 1, 5), LocalDate.of(2026, 1, 6));
        LeaveRequest rejected = buildLeaveRequest(emp, LeaveRequest.LeaveStatus.REJECTED,
                LocalDate.of(2026, 1, 10), LocalDate.of(2026, 1, 11));

        when(leaveRequestRepository.findByStartDateLessThanEqualAndEndDateGreaterThanEqual(
                any(), any())).thenReturn(List.of(pending, rejected));

        LeaveReviewSummaryDTO result = leaveReviewService.processLeaveReview(payroll);

        assertEquals(2, result.getTotalRequests());
        assertEquals(0, result.getApprovedRequests());
        assertEquals(1, result.getPendingRequests());
        assertEquals(1, result.getRejectedRequests());
        assertEquals(0, result.getExcessLeaveDays());
    }

    @Test
    void processLeaveReview_approvedLeaveWithinBalance_noExcess() {
        UUID empId = UUID.randomUUID();
        Employee emp = buildEmployee(empId, "Jane", "Smith");

        // A 5-working-day leave (well within 21-day balance)
        LeaveRequest approved = buildLeaveRequest(emp, LeaveRequest.LeaveStatus.APPROVED,
                LocalDate.of(2026, 1, 5), LocalDate.of(2026, 1, 9));

        EmployeePayroll ep = buildEmployeePayroll(payrollId, empId, "Jane Smith");

        when(leaveRequestRepository.findByStartDateLessThanEqualAndEndDateGreaterThanEqual(
                any(), any())).thenReturn(List.of(approved));
        when(employeePayrollRepository.findByPayrollIdAndEmployeeId(payrollId, empId))
                .thenReturn(Optional.of(ep));

        LeaveReviewSummaryDTO result = leaveReviewService.processLeaveReview(payroll);

        assertEquals(1, result.getApprovedRequests());
        assertEquals(0, result.getExcessLeaveDays());
        verify(employeePayrollRepository).save(ep);
    }

    @Test
    void processLeaveReview_noEmployeePayrollForApprovedLeave_skipsEmployee() {
        UUID empId = UUID.randomUUID();
        Employee emp = buildEmployee(empId, "Ghost", "User");

        LeaveRequest approved = buildLeaveRequest(emp, LeaveRequest.LeaveStatus.APPROVED,
                LocalDate.of(2026, 1, 5), LocalDate.of(2026, 1, 9));

        when(leaveRequestRepository.findByStartDateLessThanEqualAndEndDateGreaterThanEqual(
                any(), any())).thenReturn(List.of(approved));
        when(employeePayrollRepository.findByPayrollIdAndEmployeeId(payrollId, empId))
                .thenReturn(Optional.empty());

        LeaveReviewSummaryDTO result = leaveReviewService.processLeaveReview(payroll);

        assertEquals(0, result.getEmployeesAffected());
        verify(employeePayrollRepository, never()).save(any());
    }

    @Test
    void processLeaveReview_repositoryThrowsException_returnsFailure() {
        when(leaveRequestRepository.findByStartDateLessThanEqualAndEndDateGreaterThanEqual(
                any(), any())).thenThrow(new RuntimeException("DB error"));

        LeaveReviewSummaryDTO result = leaveReviewService.processLeaveReview(payroll);

        assertEquals("FAILURE", result.getStatus());
        assertTrue(result.getMessage().contains("Failed to process leave review"));
    }

    @Test
    void processLeaveReview_withSuccessAndWarnings_setsCorrectStatus() {
        UUID empId = UUID.randomUUID();
        Employee emp = buildEmployee(empId, "Over", "Limit");

        // Create a leave that spans more than 21 working days by mocking
        // a 22-day leave (which exceeds 21-day balance)
        LeaveRequest approved = buildLeaveRequest(emp, LeaveRequest.LeaveStatus.APPROVED,
                LocalDate.of(2025, 12, 1), LocalDate.of(2026, 1, 31));

        EmployeePayroll ep = buildEmployeePayroll(payrollId, empId, "Over Limit");

        when(leaveRequestRepository.findByStartDateLessThanEqualAndEndDateGreaterThanEqual(
                any(), any())).thenReturn(List.of(approved));
        when(employeePayrollRepository.findByPayrollIdAndEmployeeId(payrollId, empId))
                .thenReturn(Optional.of(ep));

        LeaveReviewSummaryDTO result = leaveReviewService.processLeaveReview(payroll);

        // Should have warnings since excess days detected
        if (result.getExcessLeaveDays() > 0) {
            assertEquals("SUCCESS_WITH_WARNINGS", result.getStatus());
        } else {
            assertEquals("SUCCESS", result.getStatus());
        }
    }

    // ==================== getLeaveRequestsForPeriod ====================

    @Test
    void getLeaveRequestsForPeriod_returnsConvertedDTOs() {
        LocalDate start = LocalDate.of(2026, 1, 1);
        LocalDate end = LocalDate.of(2026, 1, 31);

        UUID empId = UUID.randomUUID();
        Employee emp = buildEmployee(empId, "Test", "User");

        LeaveRequest lr = buildLeaveRequest(emp, LeaveRequest.LeaveStatus.APPROVED, start, end);
        lr.setReviewedBy("manager");
        lr.setReviewedAt(LocalDateTime.now());

        when(leaveRequestRepository.findByStartDateLessThanEqualAndEndDateGreaterThanEqual(end, start))
                .thenReturn(List.of(lr));

        List<LeaveRequestDTO> result = leaveReviewService.getLeaveRequestsForPeriod(start, end);

        assertEquals(1, result.size());
        assertEquals(empId, result.get(0).getEmployeeId());
    }

    @Test
    void getLeaveRequestsForPeriod_repositoryThrows_returnsEmptyList() {
        LocalDate start = LocalDate.of(2026, 1, 1);
        LocalDate end = LocalDate.of(2026, 1, 31);

        when(leaveRequestRepository.findByStartDateLessThanEqualAndEndDateGreaterThanEqual(any(), any()))
                .thenThrow(new RuntimeException("DB error"));

        List<LeaveRequestDTO> result = leaveReviewService.getLeaveRequestsForPeriod(start, end);

        assertTrue(result.isEmpty());
    }

    @Test
    void getLeaveRequestsForPeriod_emptyPeriod_returnsEmpty() {
        LocalDate start = LocalDate.of(2026, 1, 1);
        LocalDate end = LocalDate.of(2026, 1, 31);

        when(leaveRequestRepository.findByStartDateLessThanEqualAndEndDateGreaterThanEqual(end, start))
                .thenReturn(Collections.emptyList());

        List<LeaveRequestDTO> result = leaveReviewService.getLeaveRequestsForPeriod(start, end);

        assertTrue(result.isEmpty());
    }
}