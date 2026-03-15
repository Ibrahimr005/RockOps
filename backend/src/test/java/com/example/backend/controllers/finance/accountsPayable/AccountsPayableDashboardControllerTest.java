package com.example.backend.controllers.finance.accountsPayable;

import com.example.backend.config.JwtService;
import com.example.backend.dto.finance.accountsPayable.AccountsPayableDashboardSummaryResponseDTO;
import com.example.backend.dto.finance.accountsPayable.BalanceSummaryResponseDTO;
import com.example.backend.dto.finance.accountsPayable.MerchantPaymentSummaryResponseDTO;
import com.example.backend.services.finance.accountsPayable.AccountsPayableDashboardService;
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
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AccountsPayableDashboardController.class)
@AutoConfigureMockMvc(addFilters = false)
public class AccountsPayableDashboardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AccountsPayableDashboardService dashboardService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper.registerModule(new JavaTimeModule());
    }

    // ==================== GET /api/v1/finance/dashboard/summary ====================

    @Test
    @WithMockUser
    void getDashboardSummary_shouldReturn200WithSummary() throws Exception {
        AccountsPayableDashboardSummaryResponseDTO summary =
                new AccountsPayableDashboardSummaryResponseDTO();

        given(dashboardService.getDashboardSummary()).willReturn(summary);

        mockMvc.perform(get("/api/v1/finance/dashboard/summary")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void getDashboardSummary_serviceThrowsException_shouldReturn500() throws Exception {
        given(dashboardService.getDashboardSummary())
                .willThrow(new RuntimeException("Database error"));

        mockMvc.perform(get("/api/v1/finance/dashboard/summary")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/finance/dashboard/balances ====================

    @Test
    @WithMockUser
    void getBalanceSummary_shouldReturn200WithBalances() throws Exception {
        BalanceSummaryResponseDTO balances = new BalanceSummaryResponseDTO();

        given(dashboardService.getBalanceSummary()).willReturn(balances);

        mockMvc.perform(get("/api/v1/finance/dashboard/balances")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void getBalanceSummary_serviceThrowsException_shouldReturn500() throws Exception {
        given(dashboardService.getBalanceSummary())
                .willThrow(new RuntimeException("Failed to compute balances"));

        mockMvc.perform(get("/api/v1/finance/dashboard/balances")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/finance/dashboard/merchants ====================

    @Test
    @WithMockUser
    void getMerchantPaymentSummaries_shouldReturn200WithList() throws Exception {
        MerchantPaymentSummaryResponseDTO merchantSummary =
                new MerchantPaymentSummaryResponseDTO();

        given(dashboardService.getMerchantPaymentSummaries())
                .willReturn(List.of(merchantSummary));

        mockMvc.perform(get("/api/v1/finance/dashboard/merchants")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    void getMerchantPaymentSummaries_emptyList_shouldReturn200() throws Exception {
        given(dashboardService.getMerchantPaymentSummaries())
                .willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/finance/dashboard/merchants")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @WithMockUser
    void getMerchantPaymentSummaries_serviceThrowsException_shouldReturn500() throws Exception {
        given(dashboardService.getMerchantPaymentSummaries())
                .willThrow(new RuntimeException("Failed to load merchant summaries"));

        mockMvc.perform(get("/api/v1/finance/dashboard/merchants")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }
}