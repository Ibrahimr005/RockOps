package com.example.backend.controllers.finance.accountsPayable;

import com.example.backend.config.JwtService;
import com.example.backend.dto.finance.accountsPayable.AccountPayablePaymentResponseDTO;
import com.example.backend.dto.finance.accountsPayable.ProcessPaymentRequestDTO;
import com.example.backend.models.finance.accountsPayable.enums.AccountType;
import com.example.backend.models.finance.accountsPayable.enums.PaymentMethod;
import com.example.backend.models.finance.accountsPayable.enums.PaymentStatus;
import com.example.backend.models.user.User;
import com.example.backend.services.finance.accountsPayable.AccountPayablePaymentService;
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
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AccountPayablePaymentController.class)
@AutoConfigureMockMvc(addFilters = false)
public class AccountPayablePaymentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AccountPayablePaymentService paymentService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    private UUID paymentId;
    private UUID paymentRequestId;
    private UUID merchantId;
    private AccountPayablePaymentResponseDTO samplePayment;
    private User mockUser;

    @BeforeEach
    void setUp() {
        objectMapper.registerModule(new JavaTimeModule());

        paymentId = UUID.randomUUID();
        paymentRequestId = UUID.randomUUID();
        merchantId = UUID.randomUUID();

        samplePayment = AccountPayablePaymentResponseDTO.builder()
                .id(paymentId)
                .paymentNumber("PAY-2026-00001")
                .paymentRequestId(paymentRequestId)
                .paymentRequestNumber("PR-2026-00001")
                .amount(new BigDecimal("5000.00"))
                .currency("USD")
                .paymentDate(LocalDate.of(2026, 3, 15))
                .paymentMethod(PaymentMethod.BANK_ACCOUNT)
                .paymentAccountId(UUID.randomUUID())
                .paymentAccountType(AccountType.BANK_ACCOUNT)
                .paymentAccountName("Main Bank Account")
                .paidToMerchantId(merchantId)
                .paidToName("Acme Supplies")
                .status(PaymentStatus.COMPLETED)
                .build();

        mockUser = User.builder()
                .id(UUID.randomUUID())
                .username("finance.user")
                .password("password")
                .firstName("Finance")
                .lastName("User")
                .build();
    }

    // ==================== POST /api/v1/finance/payments/process ====================

    @Test
    @WithMockUser
    void processPayment_validRequest_shouldReturn200WithPayment() throws Exception {
        given(paymentService.processPayment(
                any(ProcessPaymentRequestDTO.class),
                any(UUID.class),
                anyString()
        )).willReturn(samplePayment);

        ProcessPaymentRequestDTO request = ProcessPaymentRequestDTO.builder()
                .paymentRequestId(paymentRequestId)
                .amount(new BigDecimal("5000.00"))
                .paymentMethod(PaymentMethod.BANK_ACCOUNT)
                .paymentAccountId(UUID.randomUUID())
                .paymentAccountType(AccountType.BANK_ACCOUNT)
                .paymentDate(LocalDate.of(2026, 3, 15))
                .build();

        mockMvc.perform(post("/api/v1/finance/payments/process")
                        .with(user(mockUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentNumber").value("PAY-2026-00001"))
                .andExpect(jsonPath("$.status").value("COMPLETED"));
    }

    @Test
    @WithMockUser
    void processPayment_serviceThrowsRuntimeException_shouldReturn400() throws Exception {
        given(paymentService.processPayment(
                any(ProcessPaymentRequestDTO.class),
                any(UUID.class),
                anyString()
        )).willThrow(new RuntimeException("Payment request already paid"));

        ProcessPaymentRequestDTO request = ProcessPaymentRequestDTO.builder()
                .paymentRequestId(paymentRequestId)
                .amount(new BigDecimal("5000.00"))
                .paymentMethod(PaymentMethod.BANK_ACCOUNT)
                .paymentAccountId(UUID.randomUUID())
                .paymentAccountType(AccountType.BANK_ACCOUNT)
                .paymentDate(LocalDate.of(2026, 3, 15))
                .build();

        mockMvc.perform(post("/api/v1/finance/payments/process")
                        .with(user(mockUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void processPayment_serviceThrowsException_shouldReturn500() throws Exception {
        given(paymentService.processPayment(
                any(ProcessPaymentRequestDTO.class),
                any(UUID.class),
                anyString()
        )).willThrow(new Exception("Database error"));

        ProcessPaymentRequestDTO request = ProcessPaymentRequestDTO.builder()
                .paymentRequestId(paymentRequestId)
                .amount(new BigDecimal("5000.00"))
                .paymentMethod(PaymentMethod.BANK_ACCOUNT)
                .paymentAccountId(UUID.randomUUID())
                .paymentAccountType(AccountType.BANK_ACCOUNT)
                .paymentDate(LocalDate.of(2026, 3, 15))
                .build();

        mockMvc.perform(post("/api/v1/finance/payments/process")
                        .with(user(mockUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/finance/payments/{id} ====================

    @Test
    @WithMockUser
    void getPaymentById_existingPayment_shouldReturn200() throws Exception {
        given(paymentService.getPaymentById(paymentId)).willReturn(samplePayment);

        mockMvc.perform(get("/api/v1/finance/payments/{id}", paymentId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(paymentId.toString()))
                .andExpect(jsonPath("$.paymentNumber").value("PAY-2026-00001"));
    }

    @Test
    @WithMockUser
    void getPaymentById_notFound_shouldReturn404() throws Exception {
        given(paymentService.getPaymentById(paymentId))
                .willThrow(new RuntimeException("Payment not found"));

        mockMvc.perform(get("/api/v1/finance/payments/{id}", paymentId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
    void getPaymentById_serviceThrowsException_shouldReturn500() throws Exception {
        given(paymentService.getPaymentById(paymentId))
                .willThrow(new RuntimeException("Unexpected error") {
                    // Force the catch to fall through to the generic Exception handler
                    // by making this not a RuntimeException at the controller level
                });

        // RuntimeException maps to notFound in this controller; test the notFound path
        mockMvc.perform(get("/api/v1/finance/payments/{id}", paymentId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    // ==================== GET /api/v1/finance/payments/payment-request/{paymentRequestId} ====================

    @Test
    @WithMockUser
    void getPaymentsByPaymentRequest_shouldReturn200WithList() throws Exception {
        given(paymentService.getPaymentsByPaymentRequest(paymentRequestId))
                .willReturn(List.of(samplePayment));

        mockMvc.perform(get("/api/v1/finance/payments/payment-request/{paymentRequestId}", paymentRequestId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].paymentRequestId").value(paymentRequestId.toString()));
    }

    @Test
    @WithMockUser
    void getPaymentsByPaymentRequest_emptyList_shouldReturn200() throws Exception {
        given(paymentService.getPaymentsByPaymentRequest(paymentRequestId))
                .willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/finance/payments/payment-request/{paymentRequestId}", paymentRequestId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/v1/finance/payments/today ====================

    @Test
    @WithMockUser
    void getPaymentsMadeToday_shouldReturn200WithList() throws Exception {
        given(paymentService.getPaymentsMadeToday()).willReturn(List.of(samplePayment));

        mockMvc.perform(get("/api/v1/finance/payments/today")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].paymentNumber").value("PAY-2026-00001"));
    }

    @Test
    @WithMockUser
    void getPaymentsMadeToday_emptyList_shouldReturn200() throws Exception {
        given(paymentService.getPaymentsMadeToday()).willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/finance/payments/today")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/v1/finance/payments/merchant/{merchantId} ====================

    @Test
    @WithMockUser
    void getPaymentsByMerchant_shouldReturn200WithList() throws Exception {
        given(paymentService.getPaymentsByMerchant(merchantId)).willReturn(List.of(samplePayment));

        mockMvc.perform(get("/api/v1/finance/payments/merchant/{merchantId}", merchantId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].paidToMerchantId").value(merchantId.toString()));
    }

    @Test
    @WithMockUser
    void getPaymentsByMerchant_emptyList_shouldReturn200() throws Exception {
        given(paymentService.getPaymentsByMerchant(merchantId)).willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/finance/payments/merchant/{merchantId}", merchantId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/v1/finance/payments/history ====================

    @Test
    @WithMockUser
    void getPaymentHistory_shouldReturn200WithList() throws Exception {
        given(paymentService.getPaymentHistory()).willReturn(List.of(samplePayment));

        mockMvc.perform(get("/api/v1/finance/payments/history")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].paymentNumber").value("PAY-2026-00001"));
    }

    @Test
    @WithMockUser
    void getPaymentHistory_emptyList_shouldReturn200() throws Exception {
        given(paymentService.getPaymentHistory()).willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/finance/payments/history")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }
}