package com.example.backend.controllers.payroll;

import com.example.backend.config.JwtService;
import com.example.backend.dto.payroll.*;
import com.example.backend.models.payroll.*;
import com.example.backend.services.hr.LeaveRequestService;
import com.example.backend.services.payroll.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = PayrollController.class)
@AutoConfigureMockMvc(addFilters = false)
public class PayrollControllerTest {

    @Autowired
    private MockMvc mockMvc;

    // All services the controller injects via @RequiredArgsConstructor
    @MockBean
    private PayrollService payrollService;

    @MockBean
    private PayrollSnapshotService snapshotService;

    @MockBean
    private PayrollNotificationService notificationService;

    @MockBean
    private LeaveReviewService leaveReviewService;

    @MockBean
    private OvertimeReviewService overtimeReviewService;

    @MockBean
    private DeductionReviewService deductionReviewService;

    @MockBean
    private PayrollBatchService batchService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    private UUID payrollId;
    private UUID employeeId;
    private Payroll mockPayroll;
    private PayrollDTO samplePayrollDTO;

    @BeforeEach
    void setUp() {
        objectMapper.registerModule(new JavaTimeModule());

        payrollId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        mockPayroll = new Payroll();
        mockPayroll.setId(payrollId);
        mockPayroll.setPayrollNumber("PAY-2026-001");
        mockPayroll.setStartDate(LocalDate.of(2026, 1, 1));
        mockPayroll.setEndDate(LocalDate.of(2026, 1, 31));
        mockPayroll.setStatus(PayrollStatus.ATTENDANCE_IMPORT);
        mockPayroll.setAttendanceImported(false);
        mockPayroll.setAttendanceFinalized(false);
        mockPayroll.setLeaveProcessed(false);
        mockPayroll.setLeaveFinalized(false);
        mockPayroll.setOvertimeProcessed(false);
        mockPayroll.setOvertimeFinalized(false);
        mockPayroll.setBonusProcessed(false);
        mockPayroll.setBonusFinalized(false);
        mockPayroll.setDeductionProcessed(false);
        mockPayroll.setDeductionFinalized(false);
        mockPayroll.setTotalGrossAmount(BigDecimal.ZERO);
        mockPayroll.setTotalDeductions(BigDecimal.ZERO);
        mockPayroll.setTotalNetAmount(BigDecimal.ZERO);
        mockPayroll.setEmployeeCount(0);

        samplePayrollDTO = PayrollDTO.builder()
                .id(payrollId)
                .payrollNumber("PAY-2026-001")
                .startDate(LocalDate.of(2026, 1, 1))
                .endDate(LocalDate.of(2026, 1, 31))
                .status("ATTENDANCE_IMPORT")
                .totalGrossAmount(BigDecimal.ZERO)
                .totalDeductions(BigDecimal.ZERO)
                .totalNetAmount(BigDecimal.ZERO)
                .employeeCount(0)
                .build();

        // Default payroll service stubs used across multiple tests
        given(payrollService.getPayrollById(payrollId)).willReturn(mockPayroll);
        given(batchService.getBatchesForPayroll(any())).willReturn(Collections.emptyList());
        given(batchService.toDTO(any())).willReturn(null);
    }

    // ===================================================
    // GET LATEST PAYROLL
    // ===================================================

    @Test
    @WithMockUser
    void getLatestPayroll_exists_returnsOk() throws Exception {
        given(payrollService.getLastPayroll()).willReturn(Optional.of(mockPayroll));

        mockMvc.perform(get("/api/v1/payroll/latest"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void getLatestPayroll_noPayroll_returnsNoContent() throws Exception {
        given(payrollService.getLastPayroll()).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/payroll/latest"))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser
    void getLatestPayroll_serviceThrows_returnsInternalServerError() throws Exception {
        given(payrollService.getLastPayroll()).willThrow(new RuntimeException("DB error"));

        mockMvc.perform(get("/api/v1/payroll/latest"))
                .andExpect(status().isInternalServerError());
    }

    // ===================================================
    // CREATE PAYROLL
    // ===================================================

    @Test
    @WithMockUser
    void createPayroll_validRequest_returnsCreated() throws Exception {
        given(payrollService.createPayroll(any(), any(), any())).willReturn(mockPayroll);

        Map<String, Object> request = new HashMap<>();
        request.put("startDate", "2026-01-01");
        request.put("endDate", "2026-01-31");
        request.put("createdBy", "hr_manager");

        mockMvc.perform(post("/api/v1/payroll")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());
    }

    @Test
    @WithMockUser
    void createPayroll_withOverrideContinuity_returnsCreated() throws Exception {
        given(payrollService.createPayrollWithOverride(any(), any(), any(), any())).willReturn(mockPayroll);

        Map<String, Object> request = new HashMap<>();
        request.put("startDate", "2026-01-01");
        request.put("endDate", "2026-01-31");
        request.put("createdBy", "admin");
        request.put("overrideContinuity", true);
        request.put("overrideReason", "Manual override for testing");

        mockMvc.perform(post("/api/v1/payroll")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());
    }

    @Test
    @WithMockUser
    void createPayroll_illegalState_returnsBadRequest() throws Exception {
        given(payrollService.createPayroll(any(), any(), any()))
                .willThrow(new IllegalStateException("Payroll already exists for this period"));

        Map<String, Object> request = new HashMap<>();
        request.put("startDate", "2026-01-01");
        request.put("endDate", "2026-01-31");

        mockMvc.perform(post("/api/v1/payroll")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void createPayroll_continuityException_returnsConflict() throws Exception {
        given(payrollService.createPayroll(any(), any(), any()))
                .willThrow(new PayrollService.PayrollContinuityException("Gap in payroll continuity"));

        Map<String, Object> request = new HashMap<>();
        request.put("startDate", "2026-03-01");
        request.put("endDate", "2026-03-31");

        mockMvc.perform(post("/api/v1/payroll")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict());
    }

    // ===================================================
    // GET ALL PAYROLLS
    // ===================================================

    @Test
    @WithMockUser
    void getAllPayrolls_returnsOk() throws Exception {
        given(payrollService.getAllPayrolls()).willReturn(List.of(mockPayroll));

        mockMvc.perform(get("/api/v1/payroll"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void getAllPayrolls_serviceThrows_returnsInternalServerError() throws Exception {
        given(payrollService.getAllPayrolls()).willThrow(new RuntimeException("DB error"));

        mockMvc.perform(get("/api/v1/payroll"))
                .andExpect(status().isInternalServerError());
    }

    // ===================================================
    // GET PAYROLL BY ID
    // ===================================================

    @Test
    @WithMockUser
    void getPayrollById_exists_returnsOk() throws Exception {
        mockMvc.perform(get("/api/v1/payroll/{id}", payrollId))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void getPayrollById_notFound_returnsNotFound() throws Exception {
        UUID unknownId = UUID.randomUUID();
        given(payrollService.getPayrollById(unknownId))
                .willThrow(new PayrollService.PayrollNotFoundException("Not found"));

        mockMvc.perform(get("/api/v1/payroll/{id}", unknownId))
                .andExpect(status().isNotFound());
    }

    // ===================================================
    // GET PAYROLL BY DATE RANGE
    // ===================================================

    @Test
    @WithMockUser
    void getPayrollByDateRange_exists_returnsOk() throws Exception {
        given(payrollService.getPayrollByDateRange(any(), any())).willReturn(mockPayroll);

        mockMvc.perform(get("/api/v1/payroll/period")
                        .param("startDate", "2026-01-01")
                        .param("endDate", "2026-01-31"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void getPayrollByDateRange_notFound_returnsNotFound() throws Exception {
        given(payrollService.getPayrollByDateRange(any(), any()))
                .willThrow(new PayrollService.PayrollNotFoundException("No payroll for period"));

        mockMvc.perform(get("/api/v1/payroll/period")
                        .param("startDate", "2025-01-01")
                        .param("endDate", "2025-01-31"))
                .andExpect(status().isNotFound());
    }

    // ===================================================
    // IMPORT ATTENDANCE
    // ===================================================

    @Test
    @WithMockUser
    void importAttendance_validState_returnsOk() throws Exception {
        AttendanceImportSummaryDTO summary = AttendanceImportSummaryDTO.builder()
                .message("Imported 50 records")
                .totalEmployees(50)
                .build();

        given(snapshotService.importAttendanceWithUpsert(any())).willReturn(summary);
        willDoNothing().given(payrollService).recalculateTotals(any());

        mockMvc.perform(post("/api/v1/payroll/{id}/import-attendance", payrollId))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void importAttendance_attendanceAlreadyFinalized_returnsConflict() throws Exception {
        mockPayroll.setAttendanceFinalized(true);

        mockMvc.perform(post("/api/v1/payroll/{id}/import-attendance", payrollId))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser
    void importAttendance_invalidStatus_returnsConflict() throws Exception {
        mockPayroll.setStatus(PayrollStatus.CONFIRMED_AND_LOCKED);

        mockMvc.perform(post("/api/v1/payroll/{id}/import-attendance", payrollId))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser
    void importAttendance_notFound_returnsNotFound() throws Exception {
        UUID unknownId = UUID.randomUUID();
        given(payrollService.getPayrollById(unknownId))
                .willThrow(new PayrollService.PayrollNotFoundException("Not found"));

        mockMvc.perform(post("/api/v1/payroll/{id}/import-attendance", unknownId))
                .andExpect(status().isNotFound());
    }

    // ===================================================
    // GET ATTENDANCE STATUS
    // ===================================================

    @Test
    @WithMockUser
    void getAttendanceStatus_returnsOk() throws Exception {
        mockMvc.perform(get("/api/v1/payroll/{id}/attendance-status", payrollId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.attendanceImported").exists())
                .andExpect(jsonPath("$.attendanceFinalized").exists());
    }

    @Test
    @WithMockUser
    void getAttendanceStatus_notFound_returnsNotFound() throws Exception {
        UUID unknownId = UUID.randomUUID();
        given(payrollService.getPayrollById(unknownId))
                .willThrow(new PayrollService.PayrollNotFoundException("Not found"));

        mockMvc.perform(get("/api/v1/payroll/{id}/attendance-status", unknownId))
                .andExpect(status().isNotFound());
    }

    // ===================================================
    // FINALIZE ATTENDANCE
    // ===================================================

    @Test
    @WithMockUser
    void finalizeAttendance_canFinalize_returnsOk() throws Exception {
        // canFinalizeAttendance() returns true when imported=true and not finalized
        mockPayroll.setAttendanceImported(true);
        mockPayroll.setAttendanceFinalized(false);
        willDoNothing().given(payrollService).save(any());
        willDoNothing().given(notificationService).notifyHRAttendanceFinalized(any(), anyString());

        mockMvc.perform(post("/api/v1/payroll/{id}/finalize-attendance", payrollId))
                .andExpect(status().isOk());
    }

    // ===================================================
    // NOTIFY HR
    // ===================================================

    @Test
    @WithMockUser
    void notifyHR_returnsOk() throws Exception {
        mockPayroll.setAttendanceFinalized(false);
        willDoNothing().given(notificationService).notifyHRForAttendanceReview(any(), anyString());
        willDoNothing().given(payrollService).save(any());

        mockMvc.perform(post("/api/v1/payroll/{id}/notify-hr", payrollId))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void notifyHR_attendanceFinalized_returnsConflict() throws Exception {
        mockPayroll.setAttendanceFinalized(true);

        mockMvc.perform(post("/api/v1/payroll/{id}/notify-hr", payrollId))
                .andExpect(status().isConflict());
    }

    // ===================================================
    // RESET ATTENDANCE
    // ===================================================

    @Test
    @WithMockUser
    void resetAttendanceImport_notFinalized_returnsOk() throws Exception {
        mockPayroll.setAttendanceFinalized(false);
        willDoNothing().given(payrollService).resetAttendanceData(any());
        willDoNothing().given(payrollService).save(any());

        mockMvc.perform(delete("/api/v1/payroll/{id}/reset-attendance", payrollId))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void resetAttendanceImport_alreadyFinalized_returnsConflict() throws Exception {
        mockPayroll.setAttendanceFinalized(true);

        mockMvc.perform(delete("/api/v1/payroll/{id}/reset-attendance", payrollId))
                .andExpect(status().isConflict());
    }

    // ===================================================
    // RECALCULATE TOTALS
    // ===================================================

    @Test
    @WithMockUser
    void recalculateTotals_returnsOk() throws Exception {
        willDoNothing().given(payrollService).recalculateTotals(payrollId);

        mockMvc.perform(post("/api/v1/payroll/{id}/recalculate-totals", payrollId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @WithMockUser
    void recalculateTotals_notFound_returnsNotFound() throws Exception {
        UUID unknownId = UUID.randomUUID();
        given(payrollService.getPayrollById(unknownId))
                .willThrow(new PayrollService.PayrollNotFoundException("Not found"));
        willDoNothing().given(payrollService).recalculateTotals(unknownId);

        mockMvc.perform(post("/api/v1/payroll/{id}/recalculate-totals", unknownId))
                .andExpect(status().isNotFound());
    }

    // ===================================================
    // WORKFLOW PHASE TRANSITIONS
    // ===================================================

    @Test
    @WithMockUser
    void moveToLeaveReview_returnsOk() throws Exception {
        willDoNothing().given(payrollService).moveToLeaveReview(any(), anyString());

        mockMvc.perform(post("/api/v1/payroll/{id}/leave-review", payrollId)
                        .param("username", "hr_manager"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void moveToLeaveReview_serviceThrows_returnsBadRequest() throws Exception {
        org.mockito.BDDMockito.willThrow(new RuntimeException("Cannot transition"))
                .given(payrollService).moveToLeaveReview(eq(payrollId), anyString());

        mockMvc.perform(post("/api/v1/payroll/{id}/leave-review", payrollId)
                        .param("username", "hr_manager"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void moveToOvertimeReview_returnsOk() throws Exception {
        willDoNothing().given(payrollService).moveToOvertimeReview(any(), anyString());

        mockMvc.perform(post("/api/v1/payroll/{id}/overtime-review", payrollId)
                        .param("username", "hr_manager"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void moveToDeductionReview_returnsOk() throws Exception {
        willDoNothing().given(payrollService).moveToDeductionReview(any(), anyString());

        mockMvc.perform(post("/api/v1/payroll/{id}/deduction-review", payrollId)
                        .param("username", "hr_manager"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void confirmAndLock_returnsOk() throws Exception {
        willDoNothing().given(payrollService).confirmAndLock(any(), anyString());

        mockMvc.perform(post("/api/v1/payroll/{id}/confirm-lock", payrollId)
                        .param("username", "hr_manager"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void moveToBonusReview_returnsOk() throws Exception {
        willDoNothing().given(payrollService).moveToBonusReview(any(), anyString());

        mockMvc.perform(post("/api/v1/payroll/{id}/bonus-review", payrollId)
                        .param("username", "hr_manager"))
                .andExpect(status().isOk());
    }

    // ===================================================
    // SEND TO FINANCE
    // ===================================================

    @Test
    @WithMockUser
    void sendToFinance_validRequest_returnsOk() throws Exception {
        mockPayroll.setStatus(PayrollStatus.CONFIRMED_AND_LOCKED);
        willDoNothing().given(payrollService).save(any());
        willDoNothing().given(notificationService).notifyFinancePayrollReady(any(), anyString());

        Map<String, Object> request = new HashMap<>();
        request.put("paymentSourceType", "BANK_ACCOUNT");
        request.put("paymentSourceId", UUID.randomUUID().toString());
        request.put("paymentSourceName", "Main Operations Account");

        mockMvc.perform(post("/api/v1/payroll/{id}/send-to-finance", payrollId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @WithMockUser
    void sendToFinance_wrongStatus_returnsConflict() throws Exception {
        mockPayroll.setStatus(PayrollStatus.ATTENDANCE_IMPORT);

        Map<String, Object> request = new HashMap<>();
        request.put("paymentSourceType", "BANK_ACCOUNT");
        request.put("paymentSourceId", UUID.randomUUID().toString());

        mockMvc.perform(post("/api/v1/payroll/{id}/send-to-finance", payrollId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser
    void sendToFinance_missingPaymentSource_returnsBadRequest() throws Exception {
        mockPayroll.setStatus(PayrollStatus.CONFIRMED_AND_LOCKED);

        Map<String, Object> request = new HashMap<>();
        // Missing paymentSourceType and paymentSourceId

        mockMvc.perform(post("/api/v1/payroll/{id}/send-to-finance", payrollId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void sendToFinance_invalidPaymentSourceType_returnsBadRequest() throws Exception {
        mockPayroll.setStatus(PayrollStatus.CONFIRMED_AND_LOCKED);

        Map<String, Object> request = new HashMap<>();
        request.put("paymentSourceType", "INVALID_TYPE");
        request.put("paymentSourceId", UUID.randomUUID().toString());

        mockMvc.perform(post("/api/v1/payroll/{id}/send-to-finance", payrollId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    // ===================================================
    // BATCH OPERATIONS
    // ===================================================

    @Test
    @WithMockUser
    void createBatches_returnsOk() throws Exception {
        given(batchService.createBatchesForPayroll(any(), anyString())).willReturn(List.of());

        mockMvc.perform(post("/api/v1/payroll/{id}/create-batches", payrollId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @WithMockUser
    void createBatches_notFound_returnsNotFound() throws Exception {
        UUID unknownId = UUID.randomUUID();
        given(payrollService.getPayrollById(unknownId))
                .willThrow(new PayrollService.PayrollNotFoundException("Not found"));

        mockMvc.perform(post("/api/v1/payroll/{id}/create-batches", unknownId))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
    void getBatches_returnsOk() throws Exception {
        given(batchService.getBatchesForPayroll(payrollId)).willReturn(List.of());

        mockMvc.perform(get("/api/v1/payroll/{id}/batches", payrollId))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void sendBatchesToFinance_returnsOk() throws Exception {
        given(batchService.sendBatchesToFinance(any(), anyString())).willReturn(List.of());

        mockMvc.perform(post("/api/v1/payroll/{id}/send-batches-to-finance", payrollId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    // ===================================================
    // EMPLOYEES WITHOUT PAYMENT TYPE
    // ===================================================

    @Test
    @WithMockUser
    void getEmployeesWithoutPaymentType_returnsOk() throws Exception {
        given(payrollService.getEmployeePayrolls(payrollId)).willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/payroll/{id}/employees-without-payment-type", payrollId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(0));
    }

    // ===================================================
    // EMPLOYEE PAYROLL HISTORY
    // ===================================================

    @Test
    @WithMockUser
    void getEmployeePayrollHistory_returnsOk() throws Exception {
        given(payrollService.getPayrollHistoryByEmployee(employeeId)).willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/payroll/employee/{employeeId}/history", employeeId))
                .andExpect(status().isOk());
    }

    // ===================================================
    // GET EMPLOYEE PAYROLLS
    // ===================================================

    @Test
    @WithMockUser
    void getEmployeePayrolls_returnsOk() throws Exception {
        given(payrollService.getEmployeePayrolls(payrollId)).willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/payroll/{id}/employees", payrollId))
                .andExpect(status().isOk());
    }

    // ===================================================
    // DELETE PAYROLL
    // ===================================================

    @Test
    @WithMockUser
    void deletePayroll_returnsOk() throws Exception {
        willDoNothing().given(payrollService).deletePayroll(any(), anyString());

        mockMvc.perform(delete("/api/v1/payroll/{id}", payrollId)
                        .param("username", "admin"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void deletePayroll_illegalState_returnsBadRequest() throws Exception {
        org.mockito.BDDMockito.willThrow(new IllegalStateException("Cannot delete locked payroll"))
                .given(payrollService).deletePayroll(eq(payrollId), anyString());

        mockMvc.perform(delete("/api/v1/payroll/{id}", payrollId)
                        .param("username", "admin"))
                .andExpect(status().isBadRequest());
    }

    // ===================================================
    // PUBLIC HOLIDAYS
    // ===================================================

    @Test
    @WithMockUser
    void getPublicHolidays_returnsOk() throws Exception {
        mockPayroll.setPublicHolidays(Collections.emptyList());

        mockMvc.perform(get("/api/v1/payroll/{id}/public-holidays", payrollId))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void getPublicHolidays_notFound_returnsNotFound() throws Exception {
        UUID unknownId = UUID.randomUUID();
        given(payrollService.getPayrollById(unknownId))
                .willThrow(new PayrollService.PayrollNotFoundException("Not found"));

        mockMvc.perform(get("/api/v1/payroll/{id}/public-holidays", unknownId))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
    void addPublicHolidays_returnsOk() throws Exception {
        willDoNothing().given(payrollService).addPublicHolidays(any(), any(), anyString());
        mockPayroll.setPublicHolidays(Collections.emptyList());

        List<PublicHolidayDTO> holidays = List.of(
                PublicHolidayDTO.builder()
                        .startDate(LocalDate.of(2026, 1, 1))
                        .endDate(LocalDate.of(2026, 1, 1))
                        .name("New Year")
                        .isPaid(true)
                        .build()
        );

        mockMvc.perform(post("/api/v1/payroll/{id}/add-public-holidays", payrollId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(holidays)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void addPublicHolidays_notFound_returnsNotFound() throws Exception {
        UUID unknownId = UUID.randomUUID();
        given(payrollService.getPayrollById(unknownId))
                .willThrow(new PayrollService.PayrollNotFoundException("Not found"));

        mockMvc.perform(post("/api/v1/payroll/{id}/add-public-holidays", unknownId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("[]"))
                .andExpect(status().isNotFound());
    }

    // ===================================================
    // LEAVE REVIEW WORKFLOW
    // ===================================================

    @Test
    @WithMockUser
    void processLeaveReview_validState_returnsOk() throws Exception {
        mockPayroll.setStatus(PayrollStatus.LEAVE_REVIEW);
        mockPayroll.setLeaveFinalized(false);

        LeaveReviewSummaryDTO summary = LeaveReviewSummaryDTO.builder()
                .message("Leave review processed")
                .totalRequests(10)
                .build();

        given(leaveReviewService.processLeaveReview(any())).willReturn(summary);
        willDoNothing().given(payrollService).recalculateTotals(any());

        mockMvc.perform(post("/api/v1/payroll/{id}/process-leave-review", payrollId))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void processLeaveReview_leaveFinalized_returnsConflict() throws Exception {
        mockPayroll.setStatus(PayrollStatus.LEAVE_REVIEW);
        mockPayroll.setLeaveFinalized(true);

        mockMvc.perform(post("/api/v1/payroll/{id}/process-leave-review", payrollId))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser
    void processLeaveReview_wrongStatus_returnsConflict() throws Exception {
        mockPayroll.setStatus(PayrollStatus.ATTENDANCE_IMPORT);
        mockPayroll.setLeaveFinalized(false);

        mockMvc.perform(post("/api/v1/payroll/{id}/process-leave-review", payrollId))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser
    void getLeaveStatus_returnsOk() throws Exception {
        mockMvc.perform(get("/api/v1/payroll/{id}/leave-status", payrollId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.leaveProcessed").exists())
                .andExpect(jsonPath("$.leaveFinalized").exists());
    }

    @Test
    @WithMockUser
    void finalizeLeave_canFinalize_returnsOk() throws Exception {
        mockPayroll.setStatus(PayrollStatus.LEAVE_REVIEW);
        mockPayroll.setLeaveProcessed(true);
        mockPayroll.setLeaveFinalized(false);
        willDoNothing().given(payrollService).save(any());
        willDoNothing().given(notificationService).notifyHRLeaveFinalized(any(), anyString());

        mockMvc.perform(post("/api/v1/payroll/{id}/finalize-leave", payrollId))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void notifyHRForLeave_returnsOk() throws Exception {
        mockPayroll.setLeaveFinalized(false);
        willDoNothing().given(notificationService).notifyHRForLeaveReview(any(), anyString());
        willDoNothing().given(payrollService).save(any());

        mockMvc.perform(post("/api/v1/payroll/{id}/notify-hr-leave", payrollId))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void notifyHRForLeave_leaveFinalized_returnsConflict() throws Exception {
        mockPayroll.setLeaveFinalized(true);

        mockMvc.perform(post("/api/v1/payroll/{id}/notify-hr-leave", payrollId))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser
    void getLeaveRequestsForPayroll_returnsOk() throws Exception {
        given(leaveReviewService.getLeaveRequestsForPeriod(any(), any())).willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/payroll/{id}/leave-requests", payrollId))
                .andExpect(status().isOk());
    }

    // ===================================================
    // OVERTIME REVIEW WORKFLOW
    // ===================================================

    @Test
    @WithMockUser
    void getOvertimeStatus_returnsOk() throws Exception {
        mockMvc.perform(get("/api/v1/payroll/{id}/overtime-status", payrollId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.overtimeProcessed").exists())
                .andExpect(jsonPath("$.overtimeFinalized").exists());
    }

    @Test
    @WithMockUser
    void processOvertimeReview_validState_returnsOk() throws Exception {
        mockPayroll.setStatus(PayrollStatus.OVERTIME_REVIEW);
        mockPayroll.setOvertimeFinalized(false);

        OvertimeReviewSummaryDTO summary = OvertimeReviewSummaryDTO.builder()
                .message("Overtime processed")
                .totalRecords(5)
                .build();

        given(overtimeReviewService.processOvertimeReview(any())).willReturn(summary);
        willDoNothing().given(payrollService).recalculateTotals(any());

        mockMvc.perform(post("/api/v1/payroll/{id}/process-overtime-review", payrollId))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void processOvertimeReview_overtimeFinalized_returnsConflict() throws Exception {
        mockPayroll.setStatus(PayrollStatus.OVERTIME_REVIEW);
        mockPayroll.setOvertimeFinalized(true);

        mockMvc.perform(post("/api/v1/payroll/{id}/process-overtime-review", payrollId))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser
    void processOvertimeReview_wrongStatus_returnsConflict() throws Exception {
        mockPayroll.setStatus(PayrollStatus.LEAVE_REVIEW);
        mockPayroll.setOvertimeFinalized(false);

        mockMvc.perform(post("/api/v1/payroll/{id}/process-overtime-review", payrollId))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser
    void finalizeOvertime_canFinalize_returnsOk() throws Exception {
        mockPayroll.setStatus(PayrollStatus.OVERTIME_REVIEW);
        mockPayroll.setOvertimeProcessed(true);
        mockPayroll.setOvertimeFinalized(false);
        willDoNothing().given(payrollService).save(any());
        willDoNothing().given(notificationService).notifyHROvertimeFinalized(any(), anyString());

        mockMvc.perform(post("/api/v1/payroll/{id}/finalize-overtime", payrollId))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void notifyHRForOvertime_returnsOk() throws Exception {
        mockPayroll.setOvertimeFinalized(false);
        willDoNothing().given(notificationService).notifyHRForOvertimeReview(any(), anyString());
        willDoNothing().given(payrollService).save(any());

        mockMvc.perform(post("/api/v1/payroll/{id}/notify-hr-overtime", payrollId))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void notifyHRForOvertime_overtimeFinalized_returnsConflict() throws Exception {
        mockPayroll.setOvertimeFinalized(true);

        mockMvc.perform(post("/api/v1/payroll/{id}/notify-hr-overtime", payrollId))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser
    void getOvertimeRecordsForPayroll_returnsOk() throws Exception {
        given(overtimeReviewService.getOvertimeRecordsForPeriod(any(), any())).willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/payroll/{id}/overtime-records", payrollId))
                .andExpect(status().isOk());
    }

    // ===================================================
    // BONUS REVIEW WORKFLOW
    // ===================================================

    @Test
    @WithMockUser
    void getBonusStatus_returnsOk() throws Exception {
        mockMvc.perform(get("/api/v1/payroll/{id}/bonus-status", payrollId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bonusProcessed").exists())
                .andExpect(jsonPath("$.bonusFinalized").exists());
    }

    @Test
    @WithMockUser
    void processBonusReview_validState_returnsOk() throws Exception {
        mockPayroll.setStatus(PayrollStatus.BONUS_REVIEW);
        mockPayroll.setBonusFinalized(false);

        BonusReviewSummaryDTO summary = BonusReviewSummaryDTO.builder()
                .message("Bonuses processed")
                .totalBonusAmount(BigDecimal.valueOf(5000))
                .build();

        given(payrollService.processBonusReview(payrollId)).willReturn(summary);
        willDoNothing().given(payrollService).recalculateTotals(any());

        mockMvc.perform(post("/api/v1/payroll/{id}/process-bonus-review", payrollId))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void processBonusReview_bonusFinalized_returnsConflict() throws Exception {
        mockPayroll.setStatus(PayrollStatus.BONUS_REVIEW);
        mockPayroll.setBonusFinalized(true);

        mockMvc.perform(post("/api/v1/payroll/{id}/process-bonus-review", payrollId))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser
    void processBonusReview_wrongStatus_returnsConflict() throws Exception {
        mockPayroll.setStatus(PayrollStatus.LEAVE_REVIEW);
        mockPayroll.setBonusFinalized(false);

        mockMvc.perform(post("/api/v1/payroll/{id}/process-bonus-review", payrollId))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser
    void finalizeBonus_canFinalize_returnsOk() throws Exception {
        mockPayroll.setStatus(PayrollStatus.BONUS_REVIEW);
        mockPayroll.setBonusProcessed(true);
        mockPayroll.setBonusFinalized(false);

        given(payrollService.finalizeBonusReview(eq(payrollId), anyString())).willReturn(mockPayroll);

        mockMvc.perform(post("/api/v1/payroll/{id}/finalize-bonus", payrollId))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void getBonusSummariesForPayroll_returnsOk() throws Exception {
        mockPayroll.setStatus(PayrollStatus.DEDUCTION_REVIEW);

        mockMvc.perform(get("/api/v1/payroll/{id}/bonus-summaries", payrollId))
                .andExpect(status().isOk());
    }

    // ===================================================
    // DEDUCTION REVIEW WORKFLOW
    // ===================================================

    @Test
    @WithMockUser
    void getDeductionStatus_returnsOk() throws Exception {
        mockMvc.perform(get("/api/v1/payroll/{id}/deduction-status", payrollId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deductionProcessed").exists())
                .andExpect(jsonPath("$.deductionFinalized").exists());
    }

    @Test
    @WithMockUser
    void processDeductionReview_validState_returnsOk() throws Exception {
        mockPayroll.setStatus(PayrollStatus.DEDUCTION_REVIEW);
        mockPayroll.setDeductionFinalized(false);

        DeductionReviewSummaryDTO summary = DeductionReviewSummaryDTO.builder()
                .message("Deductions processed")
                .build();

        given(deductionReviewService.processDeductionReview(any())).willReturn(summary);
        willDoNothing().given(payrollService).recalculateTotals(any());

        mockMvc.perform(post("/api/v1/payroll/{id}/process-deduction-review", payrollId))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void processDeductionReview_deductionFinalized_returnsConflict() throws Exception {
        mockPayroll.setStatus(PayrollStatus.DEDUCTION_REVIEW);
        mockPayroll.setDeductionFinalized(true);

        mockMvc.perform(post("/api/v1/payroll/{id}/process-deduction-review", payrollId))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser
    void processDeductionReview_wrongStatus_returnsConflict() throws Exception {
        mockPayroll.setStatus(PayrollStatus.LEAVE_REVIEW);
        mockPayroll.setDeductionFinalized(false);

        mockMvc.perform(post("/api/v1/payroll/{id}/process-deduction-review", payrollId))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser
    void finalizeDeduction_canFinalize_returnsOk() throws Exception {
        mockPayroll.setStatus(PayrollStatus.DEDUCTION_REVIEW);
        mockPayroll.setDeductionProcessed(true);
        mockPayroll.setDeductionFinalized(false);
        willDoNothing().given(payrollService).save(any());
        willDoNothing().given(notificationService).notifyHRDeductionFinalized(any(), anyString());

        mockMvc.perform(post("/api/v1/payroll/{id}/finalize-deduction", payrollId))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void notifyHRForDeduction_returnsOk() throws Exception {
        mockPayroll.setDeductionFinalized(false);
        willDoNothing().given(notificationService).notifyHRForDeductionReview(any(), anyString());
        willDoNothing().given(payrollService).save(any());

        mockMvc.perform(post("/api/v1/payroll/{id}/notify-hr-deduction", payrollId))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void notifyHRForDeduction_deductionFinalized_returnsConflict() throws Exception {
        mockPayroll.setDeductionFinalized(true);

        mockMvc.perform(post("/api/v1/payroll/{id}/notify-hr-deduction", payrollId))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser
    void getDeductionSummariesForPayroll_returnsOk() throws Exception {
        given(deductionReviewService.getPayrollDeductionSummaries(payrollId)).willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/payroll/{id}/deduction-summaries", payrollId))
                .andExpect(status().isOk());
    }

    // ===================================================
    // GET SPECIFIC EMPLOYEE PAYROLL
    // ===================================================

    @Test
    @WithMockUser
    void getEmployeePayroll_notFound_returnsNotFound() throws Exception {
        UUID unknownPayrollId = UUID.randomUUID();
        given(payrollService.getPayrollById(unknownPayrollId))
                .willThrow(new PayrollService.PayrollNotFoundException("Not found"));

        mockMvc.perform(get("/api/v1/payroll/{payrollId}/employee/{employeeId}", unknownPayrollId, employeeId))
                .andExpect(status().isNotFound());
    }
}