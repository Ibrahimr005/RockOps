package com.example.backend.controllers.payroll;

import com.example.backend.config.JwtService;
import com.example.backend.dto.payroll.LoanResolutionRequestDTO;
import com.example.backend.models.payroll.LoanResolutionRequest;
import com.example.backend.services.payroll.LoanResolutionRequestService;
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
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = LoanResolutionRequestController.class)
@AutoConfigureMockMvc(addFilters = false)
public class LoanResolutionRequestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private LoanResolutionRequestService resolutionService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    private UUID requestId;
    private UUID loanId;
    private UUID employeeId;
    private LoanResolutionRequestDTO sampleRequest;

    @BeforeEach
    void setUp() {
        objectMapper.registerModule(new JavaTimeModule());

        requestId = UUID.randomUUID();
        loanId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        sampleRequest = LoanResolutionRequestDTO.builder()
                .id(requestId)
                .loanId(loanId)
                .loanNumber("LOAN-2026-00001")
                .loanAmount(new BigDecimal("5000.00"))
                .employeeId(employeeId)
                .employeeName("John Doe")
                .reason("Employee is leaving the company")
                .remainingBalance(new BigDecimal("3000.00"))
                .status(LoanResolutionRequest.ResolutionStatus.PENDING_HR)
                .createdAt(LocalDateTime.now())
                .createdBy("hr_manager")
                .build();
    }

    // ===================================================
    // POST - CREATE RESOLUTION REQUEST
    // ===================================================

    @Test
    @WithMockUser
    void createRequest_validBody_returnsCreated() throws Exception {
        LoanResolutionRequestDTO inputDto = LoanResolutionRequestDTO.builder()
                .loanId(loanId)
                .reason("Employee is leaving the company")
                .build();

        given(resolutionService.createRequest(eq(loanId), anyString(), anyString()))
                .willReturn(sampleRequest);

        mockMvc.perform(post("/api/v1/payroll/loan-resolution-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(inputDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(requestId.toString()));
    }

    // ===================================================
    // GET - LIST BY STATUS / LOAN ID
    // ===================================================

    @Test
    @WithMockUser
    void getByStatus_noParams_returnsOk() throws Exception {
        given(resolutionService.getByStatus(null)).willReturn(List.of(sampleRequest));

        mockMvc.perform(get("/api/v1/payroll/loan-resolution-requests"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void getByStatus_withStatus_returnsOk() throws Exception {
        given(resolutionService.getByStatus(LoanResolutionRequest.ResolutionStatus.PENDING_HR))
                .willReturn(List.of(sampleRequest));

        mockMvc.perform(get("/api/v1/payroll/loan-resolution-requests")
                        .param("status", "PENDING_HR"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void getByStatus_withLoanId_returnsOk() throws Exception {
        given(resolutionService.getByLoanId(loanId)).willReturn(List.of(sampleRequest));

        mockMvc.perform(get("/api/v1/payroll/loan-resolution-requests")
                        .param("loanId", loanId.toString()))
                .andExpect(status().isOk());
    }

    // ===================================================
    // GET - BY ID
    // ===================================================

    @Test
    @WithMockUser
    void getById_exists_returnsOk() throws Exception {
        given(resolutionService.getById(requestId)).willReturn(sampleRequest);

        mockMvc.perform(get("/api/v1/payroll/loan-resolution-requests/{id}", requestId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(requestId.toString()));
    }

    // ===================================================
    // PUT - HR DECISION (APPROVE)
    // ===================================================

    @Test
    @WithMockUser
    void hrDecision_approve_returnsOk() throws Exception {
        LoanResolutionRequestDTO approved = LoanResolutionRequestDTO.builder()
                .id(requestId)
                .status(LoanResolutionRequest.ResolutionStatus.PENDING_FINANCE)
                .build();

        given(resolutionService.hrDecision(eq(requestId), eq(true), anyString())).willReturn(approved);

        Map<String, Object> body = new HashMap<>();
        body.put("approved", true);

        mockMvc.perform(put("/api/v1/payroll/loan-resolution-requests/{id}/hr-decision", requestId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());
    }

    // ===================================================
    // PUT - HR DECISION (REJECT)
    // ===================================================

    @Test
    @WithMockUser
    void hrDecision_reject_returnsOk() throws Exception {
        LoanResolutionRequestDTO rejected = LoanResolutionRequestDTO.builder()
                .id(requestId)
                .status(LoanResolutionRequest.ResolutionStatus.REJECTED)
                .build();

        given(resolutionService.hrReject(eq(requestId), anyString(), anyString())).willReturn(rejected);

        Map<String, Object> body = new HashMap<>();
        body.put("approved", false);
        body.put("reason", "Loan must be fully paid first");

        mockMvc.perform(put("/api/v1/payroll/loan-resolution-requests/{id}/hr-decision", requestId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());
    }

    // ===================================================
    // PUT - FINANCE DECISION (APPROVE)
    // ===================================================

    @Test
    @WithMockUser
    void financeDecision_approve_returnsOk() throws Exception {
        LoanResolutionRequestDTO approved = LoanResolutionRequestDTO.builder()
                .id(requestId)
                .status(LoanResolutionRequest.ResolutionStatus.APPROVED)
                .build();

        given(resolutionService.financeDecision(eq(requestId), eq(true), anyString())).willReturn(approved);

        Map<String, Object> body = new HashMap<>();
        body.put("approved", true);

        mockMvc.perform(put("/api/v1/payroll/loan-resolution-requests/{id}/finance-decision", requestId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());
    }

    // ===================================================
    // PUT - FINANCE DECISION (REJECT)
    // ===================================================

    @Test
    @WithMockUser
    void financeDecision_reject_returnsOk() throws Exception {
        LoanResolutionRequestDTO rejected = LoanResolutionRequestDTO.builder()
                .id(requestId)
                .status(LoanResolutionRequest.ResolutionStatus.REJECTED)
                .build();

        given(resolutionService.financeReject(eq(requestId), anyString(), anyString())).willReturn(rejected);

        Map<String, Object> body = new HashMap<>();
        body.put("approved", false);
        body.put("reason", "Insufficient budget for waiver");

        mockMvc.perform(put("/api/v1/payroll/loan-resolution-requests/{id}/finance-decision", requestId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());
    }
}