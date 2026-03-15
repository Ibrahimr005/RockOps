package com.example.backend.controllers.hr;

import com.example.backend.config.JwtService;
import com.example.backend.dto.hr.salary.SalaryHistoryDTO;
import com.example.backend.dto.hr.salary.SalaryIncreaseCreateDTO;
import com.example.backend.dto.hr.salary.SalaryIncreaseRequestDTO;
import com.example.backend.dto.hr.salary.SalaryIncreaseReviewDTO;
import com.example.backend.models.user.User;
import com.example.backend.services.hr.SalaryIncreaseRequestService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = SalaryIncreaseRequestController.class)
@AutoConfigureMockMvc(addFilters = false)
public class SalaryIncreaseRequestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SalaryIncreaseRequestService salaryIncreaseRequestService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    private UUID requestId;
    private UUID employeeId;
    private UUID jobPositionId;
    private SalaryIncreaseRequestDTO sampleDTO;
    private SalaryIncreaseCreateDTO createDTO;
    private SalaryIncreaseReviewDTO reviewDTO;
    private UsernamePasswordAuthenticationToken authToken;

    @BeforeEach
    void setUp() {
        objectMapper.registerModule(new JavaTimeModule());

        requestId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        jobPositionId = UUID.randomUUID();

        sampleDTO = SalaryIncreaseRequestDTO.builder()
                .id(requestId)
                .requestNumber("SAL-2026-00001")
                .requestType("EMPLOYEE_LEVEL")
                .status("PENDING_HR")
                .statusDisplayName("Pending HR Approval")
                .employeeId(employeeId)
                .employeeName("Bob Smith")
                .employeeNumber("EMP-2025-00002")
                .currentSalary(new BigDecimal("5000.00"))
                .requestedSalary(new BigDecimal("6000.00"))
                .increaseAmount(new BigDecimal("1000.00"))
                .increasePercentage(new BigDecimal("20.00"))
                .effectiveDate(LocalDate.of(2026, 4, 1))
                .reason("Annual performance increase")
                .createdBy("hr.manager")
                .createdAt(LocalDateTime.of(2026, 3, 15, 9, 0))
                .build();

        createDTO = SalaryIncreaseCreateDTO.builder()
                .requestType("EMPLOYEE_LEVEL")
                .employeeId(employeeId)
                .requestedSalary(new BigDecimal("6000.00"))
                .effectiveDate(LocalDate.of(2026, 4, 1))
                .reason("Annual performance increase")
                .build();

        reviewDTO = SalaryIncreaseReviewDTO.builder()
                .approved(true)
                .comments("Approved - meets performance criteria")
                .build();

        User mockUser = User.builder()
                .id(UUID.randomUUID())
                .username("hr.manager")
                .password("password")
                .firstName("HR")
                .lastName("Manager")
                .build();

        authToken = new UsernamePasswordAuthenticationToken(
                mockUser, null, mockUser.getAuthorities());
    }

    // ==================== POST /api/v1/hr/salary-increase-requests ====================

    @Test
    void createRequest_validData_shouldReturn201() throws Exception {
        given(salaryIncreaseRequestService.createRequest(any(SalaryIncreaseCreateDTO.class), anyString()))
                .willReturn(sampleDTO);

        mockMvc.perform(post("/api/v1/hr/salary-increase-requests")
                        .with(authentication(authToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createDTO)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.requestNumber").value("SAL-2026-00001"))
                .andExpect(jsonPath("$.status").value("PENDING_HR"))
                .andExpect(jsonPath("$.employeeName").value("Bob Smith"));
    }

    @Test
    void createRequest_noPrincipal_usesSystemUsername_shouldReturn201() throws Exception {
        given(salaryIncreaseRequestService.createRequest(any(SalaryIncreaseCreateDTO.class), eq("SYSTEM")))
                .willReturn(sampleDTO);

        mockMvc.perform(post("/api/v1/hr/salary-increase-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createDTO)))
                .andExpect(status().isCreated());
    }

    @Test
    void createRequest_serviceThrowsException_shouldReturn500() throws Exception {
        given(salaryIncreaseRequestService.createRequest(any(SalaryIncreaseCreateDTO.class), anyString()))
                .willThrow(new RuntimeException("Employee not found"));

        mockMvc.perform(post("/api/v1/hr/salary-increase-requests")
                        .with(authentication(authToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createDTO)))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/hr/salary-increase-requests ====================

    @Test
    void getAll_noFilters_shouldReturn200WithList() throws Exception {
        given(salaryIncreaseRequestService.getAll()).willReturn(List.of(sampleDTO));

        mockMvc.perform(get("/api/v1/hr/salary-increase-requests")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].requestNumber").value("SAL-2026-00001"));
    }

    @Test
    void getAll_emptyList_shouldReturn200() throws Exception {
        given(salaryIncreaseRequestService.getAll()).willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/hr/salary-increase-requests")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void getAll_filterByValidEmployeeId_shouldReturn200() throws Exception {
        given(salaryIncreaseRequestService.getByEmployee(employeeId)).willReturn(List.of(sampleDTO));

        mockMvc.perform(get("/api/v1/hr/salary-increase-requests")
                        .param("employeeId", employeeId.toString())
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].employeeId").value(employeeId.toString()));
    }

    @Test
    void getAll_filterByInvalidEmployeeId_fallsBackToGetAll_shouldReturn200() throws Exception {
        // Invalid UUID format causes fallback to getAll()
        given(salaryIncreaseRequestService.getAll()).willReturn(List.of(sampleDTO));

        mockMvc.perform(get("/api/v1/hr/salary-increase-requests")
                        .param("employeeId", "not-a-uuid")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    void getAll_filterByValidStatus_shouldReturn200() throws Exception {
        given(salaryIncreaseRequestService.getByStatus(any())).willReturn(List.of(sampleDTO));

        mockMvc.perform(get("/api/v1/hr/salary-increase-requests")
                        .param("status", "PENDING_HR")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void getAll_filterByInvalidStatus_fallsBackToGetAll_shouldReturn200() throws Exception {
        // Invalid status enum value causes fallback to getAll()
        given(salaryIncreaseRequestService.getAll()).willReturn(List.of(sampleDTO));

        mockMvc.perform(get("/api/v1/hr/salary-increase-requests")
                        .param("status", "INVALID_STATUS")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    // ==================== GET /api/v1/hr/salary-increase-requests/{id} ====================

    @Test
    void getById_existingId_shouldReturn200() throws Exception {
        given(salaryIncreaseRequestService.getById(requestId)).willReturn(sampleDTO);

        mockMvc.perform(get("/api/v1/hr/salary-increase-requests/{id}", requestId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(requestId.toString()))
                .andExpect(jsonPath("$.requestNumber").value("SAL-2026-00001"))
                .andExpect(jsonPath("$.statusDisplayName").value("Pending HR Approval"));
    }

    @Test
    void getById_serviceThrowsException_shouldReturn500() throws Exception {
        given(salaryIncreaseRequestService.getById(requestId))
                .willThrow(new RuntimeException("Request not found"));

        mockMvc.perform(get("/api/v1/hr/salary-increase-requests/{id}", requestId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/hr/salary-increase-requests/statistics ====================

    @Test
    void getStatistics_shouldReturn200() throws Exception {
        Map<String, Object> stats = Map.of(
                "total", 15,
                "pendingHr", 4,
                "pendingFinance", 3,
                "approved", 6,
                "rejected", 2
        );
        given(salaryIncreaseRequestService.getStatistics()).willReturn(stats);

        mockMvc.perform(get("/api/v1/hr/salary-increase-requests/statistics")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(15))
                .andExpect(jsonPath("$.pendingHr").value(4));
    }

    @Test
    void getStatistics_serviceThrowsException_shouldReturn500() throws Exception {
        given(salaryIncreaseRequestService.getStatistics())
                .willThrow(new RuntimeException("DB error"));

        mockMvc.perform(get("/api/v1/hr/salary-increase-requests/statistics")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/hr/salary-increase-requests/employee/{employeeId}/history ====================

    @Test
    void getEmployeeSalaryHistory_existingEmployee_shouldReturn200() throws Exception {
        SalaryHistoryDTO historyDTO = SalaryHistoryDTO.builder()
                .id(UUID.randomUUID())
                .employeeId(employeeId)
                .employeeName("Bob Smith")
                .employeeNumber("EMP-2025-00002")
                .previousSalary(new BigDecimal("4500.00"))
                .newSalary(new BigDecimal("5000.00"))
                .changeType("SALARY_INCREASE")
                .changeReason("Annual performance increase")
                .effectiveDate(LocalDate.of(2025, 4, 1))
                .changedBy("hr.manager")
                .createdAt(LocalDateTime.of(2025, 3, 15, 10, 0))
                .build();

        given(salaryIncreaseRequestService.getEmployeeSalaryHistory(employeeId))
                .willReturn(List.of(historyDTO));

        mockMvc.perform(get("/api/v1/hr/salary-increase-requests/employee/{employeeId}/history", employeeId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].employeeId").value(employeeId.toString()))
                .andExpect(jsonPath("$[0].changeType").value("SALARY_INCREASE"))
                .andExpect(jsonPath("$[0].newSalary").value(5000.00));
    }

    @Test
    void getEmployeeSalaryHistory_emptyHistory_shouldReturn200() throws Exception {
        given(salaryIncreaseRequestService.getEmployeeSalaryHistory(employeeId))
                .willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/hr/salary-increase-requests/employee/{employeeId}/history", employeeId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void getEmployeeSalaryHistory_serviceThrowsException_shouldReturn500() throws Exception {
        given(salaryIncreaseRequestService.getEmployeeSalaryHistory(employeeId))
                .willThrow(new RuntimeException("Employee not found"));

        mockMvc.perform(get("/api/v1/hr/salary-increase-requests/employee/{employeeId}/history", employeeId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== PUT /api/v1/hr/salary-increase-requests/{id}/hr-decision ====================

    @Test
    void hrDecision_approve_shouldReturn200() throws Exception {
        SalaryIncreaseRequestDTO approvedDTO = SalaryIncreaseRequestDTO.builder()
                .id(requestId)
                .requestNumber("SAL-2026-00001")
                .status("PENDING_FINANCE")
                .statusDisplayName("Pending Finance Approval")
                .hrApprovedBy("hr.manager")
                .hrComments("Approved - meets performance criteria")
                .hrDecisionDate(LocalDateTime.of(2026, 3, 16, 10, 0))
                .build();

        given(salaryIncreaseRequestService.hrDecision(eq(requestId), any(SalaryIncreaseReviewDTO.class), anyString()))
                .willReturn(approvedDTO);

        mockMvc.perform(put("/api/v1/hr/salary-increase-requests/{id}/hr-decision", requestId)
                        .with(authentication(authToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reviewDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING_FINANCE"))
                .andExpect(jsonPath("$.hrApprovedBy").value("hr.manager"));
    }

    @Test
    void hrDecision_reject_shouldReturn200() throws Exception {
        SalaryIncreaseReviewDTO rejectDTO = SalaryIncreaseReviewDTO.builder()
                .approved(false)
                .rejectionReason("Budget constraints")
                .build();

        SalaryIncreaseRequestDTO rejectedDTO = SalaryIncreaseRequestDTO.builder()
                .id(requestId)
                .requestNumber("SAL-2026-00001")
                .status("REJECTED")
                .statusDisplayName("Rejected")
                .hrRejectionReason("Budget constraints")
                .build();

        given(salaryIncreaseRequestService.hrDecision(eq(requestId), any(SalaryIncreaseReviewDTO.class), anyString()))
                .willReturn(rejectedDTO);

        mockMvc.perform(put("/api/v1/hr/salary-increase-requests/{id}/hr-decision", requestId)
                        .with(authentication(authToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(rejectDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.hrRejectionReason").value("Budget constraints"));
    }

    @Test
    void hrDecision_noPrincipal_usesSystemUsername_shouldReturn200() throws Exception {
        given(salaryIncreaseRequestService.hrDecision(eq(requestId), any(SalaryIncreaseReviewDTO.class), eq("SYSTEM")))
                .willReturn(sampleDTO);

        mockMvc.perform(put("/api/v1/hr/salary-increase-requests/{id}/hr-decision", requestId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reviewDTO)))
                .andExpect(status().isOk());
    }

    @Test
    void hrDecision_serviceThrowsException_shouldReturn500() throws Exception {
        given(salaryIncreaseRequestService.hrDecision(eq(requestId), any(SalaryIncreaseReviewDTO.class), anyString()))
                .willThrow(new RuntimeException("Request is not in PENDING_HR status"));

        mockMvc.perform(put("/api/v1/hr/salary-increase-requests/{id}/hr-decision", requestId)
                        .with(authentication(authToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reviewDTO)))
                .andExpect(status().isInternalServerError());
    }

    // ==================== PUT /api/v1/hr/salary-increase-requests/{id}/finance-decision ====================

    @Test
    void financeDecision_approve_shouldReturn200() throws Exception {
        SalaryIncreaseRequestDTO approvedDTO = SalaryIncreaseRequestDTO.builder()
                .id(requestId)
                .requestNumber("SAL-2026-00001")
                .status("APPROVED")
                .statusDisplayName("Approved")
                .financeApprovedBy("finance.manager")
                .financeComments("Budget available, approved")
                .financeDecisionDate(LocalDateTime.of(2026, 3, 17, 14, 0))
                .build();

        SalaryIncreaseReviewDTO financeReviewDTO = SalaryIncreaseReviewDTO.builder()
                .approved(true)
                .comments("Budget available, approved")
                .build();

        given(salaryIncreaseRequestService.financeDecision(eq(requestId), any(SalaryIncreaseReviewDTO.class), anyString()))
                .willReturn(approvedDTO);

        User financeUser = User.builder()
                .id(UUID.randomUUID())
                .username("finance.manager")
                .password("password")
                .firstName("Finance")
                .lastName("Manager")
                .build();
        UsernamePasswordAuthenticationToken financeAuth = new UsernamePasswordAuthenticationToken(
                financeUser, null, financeUser.getAuthorities());

        mockMvc.perform(put("/api/v1/hr/salary-increase-requests/{id}/finance-decision", requestId)
                        .with(authentication(financeAuth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(financeReviewDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.financeApprovedBy").value("finance.manager"));
    }

    @Test
    void financeDecision_reject_shouldReturn200() throws Exception {
        SalaryIncreaseReviewDTO rejectDTO = SalaryIncreaseReviewDTO.builder()
                .approved(false)
                .rejectionReason("Exceeds annual budget allocation")
                .build();

        SalaryIncreaseRequestDTO rejectedDTO = SalaryIncreaseRequestDTO.builder()
                .id(requestId)
                .requestNumber("SAL-2026-00001")
                .status("REJECTED")
                .financeRejectionReason("Exceeds annual budget allocation")
                .build();

        given(salaryIncreaseRequestService.financeDecision(eq(requestId), any(SalaryIncreaseReviewDTO.class), anyString()))
                .willReturn(rejectedDTO);

        mockMvc.perform(put("/api/v1/hr/salary-increase-requests/{id}/finance-decision", requestId)
                        .with(authentication(authToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(rejectDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));
    }

    @Test
    void financeDecision_noPrincipal_usesSystemUsername_shouldReturn200() throws Exception {
        given(salaryIncreaseRequestService.financeDecision(eq(requestId), any(SalaryIncreaseReviewDTO.class), eq("SYSTEM")))
                .willReturn(sampleDTO);

        mockMvc.perform(put("/api/v1/hr/salary-increase-requests/{id}/finance-decision", requestId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reviewDTO)))
                .andExpect(status().isOk());
    }

    @Test
    void financeDecision_serviceThrowsException_shouldReturn500() throws Exception {
        given(salaryIncreaseRequestService.financeDecision(eq(requestId), any(SalaryIncreaseReviewDTO.class), anyString()))
                .willThrow(new RuntimeException("Request is not in PENDING_FINANCE status"));

        mockMvc.perform(put("/api/v1/hr/salary-increase-requests/{id}/finance-decision", requestId)
                        .with(authentication(authToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reviewDTO)))
                .andExpect(status().isInternalServerError());
    }
}