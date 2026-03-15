package com.example.backend.controllers.payroll;

import com.example.backend.config.JwtService;
import com.example.backend.dto.payroll.LoanDTO;
import com.example.backend.dto.payroll.LoanFinanceActionDTO;
import com.example.backend.dto.payroll.LoanFinanceRequestDTO;
import com.example.backend.models.payroll.Loan;
import com.example.backend.services.payroll.LoanService;
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
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = LoanController.class)
@AutoConfigureMockMvc(addFilters = false)
public class LoanControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private LoanService loanService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    private UUID loanId;
    private UUID employeeId;
    private UUID financeRequestId;
    private LoanDTO sampleLoan;
    private LoanFinanceRequestDTO sampleFinanceRequest;

    @BeforeEach
    void setUp() {
        objectMapper.registerModule(new JavaTimeModule());

        loanId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        financeRequestId = UUID.randomUUID();

        sampleLoan = LoanDTO.builder()
                .id(loanId)
                .loanNumber("LOAN-2026-00001")
                .employeeId(employeeId)
                .employeeName("John Doe")
                .loanAmount(new BigDecimal("5000.00"))
                .installmentMonths(12)
                .loanEffectiveDate(LocalDate.of(2026, 1, 1))
                .status(Loan.LoanStatus.DRAFT)
                .build();

        sampleFinanceRequest = LoanFinanceRequestDTO.builder()
                .id(financeRequestId)
                .loanId(loanId)
                .build();
    }

    // ===================================================
    // GET ALL LOANS
    // ===================================================

    @Test
    @WithMockUser
    void getAllLoans_noParams_returnsOk() throws Exception {
        given(loanService.getAllLoans()).willReturn(List.of(sampleLoan));

        mockMvc.perform(get("/api/v1/payroll/loans"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].loanNumber").value("LOAN-2026-00001"));
    }

    @Test
    @WithMockUser
    void getAllLoans_byEmployeeId_returnsOk() throws Exception {
        given(loanService.getLoansByEmployee(employeeId)).willReturn(List.of(sampleLoan));

        mockMvc.perform(get("/api/v1/payroll/loans")
                        .param("employeeId", employeeId.toString()))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void getAllLoans_byStatus_returnsOk() throws Exception {
        given(loanService.getLoansByStatus(Loan.LoanStatus.ACTIVE)).willReturn(List.of(sampleLoan));

        mockMvc.perform(get("/api/v1/payroll/loans")
                        .param("status", "ACTIVE"))
                .andExpect(status().isOk());
    }

    // ===================================================
    // GET LOAN BY ID
    // ===================================================

    @Test
    @WithMockUser
    void getLoanById_exists_returnsOk() throws Exception {
        given(loanService.getLoanById(loanId)).willReturn(sampleLoan);

        mockMvc.perform(get("/api/v1/payroll/loans/{id}", loanId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(loanId.toString()));
    }

    // ===================================================
    // GET LOAN BY NUMBER
    // ===================================================

    @Test
    @WithMockUser
    void getLoanByNumber_exists_returnsOk() throws Exception {
        given(loanService.getLoanByNumber("LOAN-2026-00001")).willReturn(sampleLoan);

        mockMvc.perform(get("/api/v1/payroll/loans/number/{loanNumber}", "LOAN-2026-00001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.loanNumber").value("LOAN-2026-00001"));
    }

    // ===================================================
    // GET LOANS BY EMPLOYEE
    // ===================================================

    @Test
    @WithMockUser
    void getLoansByEmployee_returnsOk() throws Exception {
        given(loanService.getLoansByEmployee(employeeId)).willReturn(List.of(sampleLoan));

        mockMvc.perform(get("/api/v1/payroll/loans/employee/{employeeId}", employeeId))
                .andExpect(status().isOk());
    }

    // ===================================================
    // GET ACTIVE LOANS
    // ===================================================

    @Test
    @WithMockUser
    void getActiveLoans_returnsOk() throws Exception {
        given(loanService.getActiveLoans()).willReturn(List.of(sampleLoan));

        mockMvc.perform(get("/api/v1/payroll/loans/active"))
                .andExpect(status().isOk());
    }

    // ===================================================
    // CREATE LOAN
    // ===================================================

    @Test
    @WithMockUser
    void createLoan_validRequest_returnsCreated() throws Exception {
        given(loanService.createLoan(any(LoanDTO.class), anyString())).willReturn(sampleLoan);

        mockMvc.perform(post("/api/v1/payroll/loans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleLoan)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.loanNumber").value("LOAN-2026-00001"));
    }

    @Test
    @WithMockUser
    void createLoan_withCreatedByParam_returnsCreated() throws Exception {
        given(loanService.createLoan(any(LoanDTO.class), anyString())).willReturn(sampleLoan);

        mockMvc.perform(post("/api/v1/payroll/loans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .param("createdBy", "hr_manager")
                        .content(objectMapper.writeValueAsString(sampleLoan)))
                .andExpect(status().isCreated());
    }

    // ===================================================
    // UPDATE LOAN
    // ===================================================

    @Test
    @WithMockUser
    void updateLoan_validRequest_returnsOk() throws Exception {
        given(loanService.updateLoan(any(UUID.class), any(LoanDTO.class), anyString()))
                .willReturn(sampleLoan);

        mockMvc.perform(put("/api/v1/payroll/loans/{id}", loanId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleLoan)))
                .andExpect(status().isOk());
    }

    // ===================================================
    // CANCEL LOAN
    // ===================================================

    @Test
    @WithMockUser
    void cancelLoan_returnsOk() throws Exception {
        LoanDTO cancelled = LoanDTO.builder()
                .id(loanId)
                .status(Loan.LoanStatus.CANCELLED)
                .build();
        given(loanService.cancelLoan(any(UUID.class), anyString(), anyString())).willReturn(cancelled);

        mockMvc.perform(delete("/api/v1/payroll/loans/{id}", loanId))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void cancelLoan_withReason_returnsOk() throws Exception {
        given(loanService.cancelLoan(any(UUID.class), anyString(), anyString())).willReturn(sampleLoan);

        mockMvc.perform(delete("/api/v1/payroll/loans/{id}", loanId)
                        .param("reason", "Employee resigned"))
                .andExpect(status().isOk());
    }

    // ===================================================
    // HR APPROVE LOAN
    // ===================================================

    @Test
    @WithMockUser
    void hrApproveLoan_returnsOk() throws Exception {
        LoanDTO approved = LoanDTO.builder()
                .id(loanId)
                .status(Loan.LoanStatus.HR_APPROVED)
                .build();
        given(loanService.hrApproveLoan(any(UUID.class), anyString())).willReturn(approved);

        mockMvc.perform(post("/api/v1/payroll/loans/{id}/approve", loanId))
                .andExpect(status().isOk());
    }

    // ===================================================
    // HR REJECT LOAN
    // ===================================================

    @Test
    @WithMockUser
    void hrRejectLoan_returnsOk() throws Exception {
        LoanDTO rejected = LoanDTO.builder()
                .id(loanId)
                .status(Loan.LoanStatus.HR_REJECTED)
                .build();
        given(loanService.hrRejectLoan(any(UUID.class), anyString(), anyString())).willReturn(rejected);

        mockMvc.perform(post("/api/v1/payroll/loans/{id}/reject", loanId)
                        .param("reason", "Insufficient tenure"))
                .andExpect(status().isOk());
    }

    // ===================================================
    // SEND TO FINANCE
    // ===================================================

    @Test
    @WithMockUser
    void sendToFinance_returnsOk() throws Exception {
        given(loanService.sendToFinance(any(UUID.class), any(), anyString()))
                .willReturn(sampleFinanceRequest);

        mockMvc.perform(post("/api/v1/payroll/loans/{id}/send-to-finance", loanId))
                .andExpect(status().isOk());
    }

    // ===================================================
    // GET PENDING FINANCE REQUESTS
    // ===================================================

    @Test
    @WithMockUser
    void getPendingFinanceRequests_returnsOk() throws Exception {
        given(loanService.getPendingFinanceRequests()).willReturn(List.of(sampleFinanceRequest));

        mockMvc.perform(get("/api/v1/payroll/loans/finance/pending"))
                .andExpect(status().isOk());
    }

    // ===================================================
    // GET ACTIVE FINANCE REQUESTS
    // ===================================================

    @Test
    @WithMockUser
    void getActiveFinanceRequests_returnsOk() throws Exception {
        given(loanService.getActiveFinanceRequests()).willReturn(List.of(sampleFinanceRequest));

        mockMvc.perform(get("/api/v1/payroll/loans/finance/active"))
                .andExpect(status().isOk());
    }

    // ===================================================
    // GET FINANCE REQUEST BY ID
    // ===================================================

    @Test
    @WithMockUser
    void getFinanceRequestById_returnsOk() throws Exception {
        given(loanService.getFinanceRequestById(financeRequestId)).willReturn(sampleFinanceRequest);

        mockMvc.perform(get("/api/v1/payroll/loans/finance/{id}", financeRequestId))
                .andExpect(status().isOk());
    }

    // ===================================================
    // FINANCE APPROVE LOAN
    // ===================================================

    @Test
    @WithMockUser
    void financeApproveLoan_validRequest_returnsOk() throws Exception {
        LoanFinanceActionDTO.ApproveRequest approveRequest = LoanFinanceActionDTO.ApproveRequest.builder()
                .requestId(financeRequestId)
                .installments(12)
                .monthlyAmount(new BigDecimal("420.00"))
                .firstDeductionDate(LocalDate.of(2026, 2, 1))
                .build();

        given(loanService.financeApproveLoan(any(LoanFinanceActionDTO.ApproveRequest.class), any(), anyString()))
                .willReturn(sampleFinanceRequest);

        mockMvc.perform(post("/api/v1/payroll/loans/finance/approve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(approveRequest)))
                .andExpect(status().isOk());
    }

    // ===================================================
    // FINANCE REJECT LOAN
    // ===================================================

    @Test
    @WithMockUser
    void financeRejectLoan_validRequest_returnsOk() throws Exception {
        LoanFinanceActionDTO.RejectRequest rejectRequest = LoanFinanceActionDTO.RejectRequest.builder()
                .requestId(financeRequestId)
                .reason("Does not meet eligibility criteria")
                .build();

        given(loanService.financeRejectLoan(any(LoanFinanceActionDTO.RejectRequest.class), any(), anyString()))
                .willReturn(sampleFinanceRequest);

        mockMvc.perform(post("/api/v1/payroll/loans/finance/reject")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(rejectRequest)))
                .andExpect(status().isOk());
    }

    // ===================================================
    // SET DISBURSEMENT SOURCE
    // ===================================================

    @Test
    @WithMockUser
    void setDisbursementSource_validRequest_returnsOk() throws Exception {
        LoanFinanceActionDTO.SetDisbursementSourceRequest request =
                LoanFinanceActionDTO.SetDisbursementSourceRequest.builder()
                        .requestId(financeRequestId)
                        .paymentSourceType("BANK_ACCOUNT")
                        .paymentSourceId(UUID.randomUUID())
                        .paymentSourceName("Main Bank Account")
                        .build();

        given(loanService.setDisbursementSource(any(LoanFinanceActionDTO.SetDisbursementSourceRequest.class), anyString()))
                .willReturn(sampleFinanceRequest);

        mockMvc.perform(post("/api/v1/payroll/loans/finance/set-disbursement-source")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    // ===================================================
    // DISBURSE LOAN
    // ===================================================

    @Test
    @WithMockUser
    void disburseLoan_validRequest_returnsOk() throws Exception {
        LoanFinanceActionDTO.DisbursementRequest request = LoanFinanceActionDTO.DisbursementRequest.builder()
                .requestId(financeRequestId)
                .disbursementReference("TXN-2026-001")
                .build();

        given(loanService.disburseLoan(any(LoanFinanceActionDTO.DisbursementRequest.class), any(), anyString()))
                .willReturn(sampleFinanceRequest);

        mockMvc.perform(post("/api/v1/payroll/loans/finance/disburse")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    // ===================================================
    // GET FINANCE DASHBOARD SUMMARY
    // ===================================================

    @Test
    @WithMockUser
    void getFinanceDashboardSummary_returnsOk() throws Exception {
        LoanFinanceActionDTO.DashboardSummary summary = LoanFinanceActionDTO.DashboardSummary.builder()
                .pendingCount(3L)
                .approvedCount(5L)
                .totalPendingAmount(new BigDecimal("15000.00"))
                .build();

        given(loanService.getFinanceDashboardSummary()).willReturn(summary);

        mockMvc.perform(get("/api/v1/payroll/loans/finance/dashboard-summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pendingCount").value(3));
    }

    // ===================================================
    // GET LOAN STATUSES
    // ===================================================

    @Test
    @WithMockUser
    void getLoanStatuses_returnsOk() throws Exception {
        mockMvc.perform(get("/api/v1/payroll/loans/statuses"))
                .andExpect(status().isOk());
    }

    // ===================================================
    // GET FINANCE STATUSES
    // ===================================================

    @Test
    @WithMockUser
    void getFinanceStatuses_returnsOk() throws Exception {
        mockMvc.perform(get("/api/v1/payroll/loans/finance-statuses"))
                .andExpect(status().isOk());
    }
}