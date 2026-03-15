package com.example.backend.controllers.finance.accountsPayable;

import com.example.backend.config.JwtService;
import com.example.backend.dto.finance.accountsPayable.ApproveRejectPaymentRequestDTO;
import com.example.backend.dto.finance.accountsPayable.PaymentRequestResponseDTO;
import com.example.backend.models.finance.accountsPayable.enums.PaymentRequestStatus;
import com.example.backend.models.user.User;
import com.example.backend.services.finance.accountsPayable.PaymentRequestService;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = PaymentRequestController.class)
@AutoConfigureMockMvc(addFilters = false)
public class PaymentRequestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PaymentRequestService paymentRequestService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    private UUID paymentRequestId;
    private UUID merchantId;
    private UUID purchaseOrderId;
    private UUID offerId;
    private PaymentRequestResponseDTO sampleRequest;
    private User mockUser;

    @BeforeEach
    void setUp() {
        objectMapper.registerModule(new JavaTimeModule());

        paymentRequestId = UUID.randomUUID();
        merchantId = UUID.randomUUID();
        purchaseOrderId = UUID.randomUUID();
        offerId = UUID.randomUUID();

        sampleRequest = PaymentRequestResponseDTO.builder()
                .id(paymentRequestId)
                .requestNumber("PR-2026-00001")
                .merchantId(merchantId)
                .merchantName("Acme Supplies Ltd")
                .requestedAmount(new BigDecimal("15000.00"))
                .currency("USD")
                .status(PaymentRequestStatus.PENDING)
                .description("Payment for PO-2026-00001")
                .build();

        mockUser = User.builder()
                .id(UUID.randomUUID())
                .username("finance.manager")
                .password("password")
                .firstName("Finance")
                .lastName("Manager")
                .build();
    }

    // ==================== GET /api/v1/finance/payment-requests/pending ====================

    @Test
    @WithMockUser
    void getPendingPaymentRequests_shouldReturn200WithList() throws Exception {
        given(paymentRequestService.getPendingPaymentRequests())
                .willReturn(List.of(sampleRequest));

        mockMvc.perform(get("/api/v1/finance/payment-requests/pending")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].requestNumber").value("PR-2026-00001"))
                .andExpect(jsonPath("$[0].status").value("PENDING"));
    }

    @Test
    @WithMockUser
    void getPendingPaymentRequests_emptyList_shouldReturn200() throws Exception {
        given(paymentRequestService.getPendingPaymentRequests())
                .willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/finance/payment-requests/pending")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @WithMockUser
    void getPendingPaymentRequests_serviceThrowsException_shouldReturn500() throws Exception {
        given(paymentRequestService.getPendingPaymentRequests())
                .willThrow(new RuntimeException("Database error"));

        mockMvc.perform(get("/api/v1/finance/payment-requests/pending")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/finance/payment-requests/ready-to-pay ====================

    @Test
    @WithMockUser
    void getReadyToPay_shouldReturn200WithList() throws Exception {
        PaymentRequestResponseDTO approvedRequest = PaymentRequestResponseDTO.builder()
                .id(UUID.randomUUID())
                .requestNumber("PR-2026-00002")
                .status(PaymentRequestStatus.APPROVED)
                .requestedAmount(new BigDecimal("8000.00"))
                .build();

        given(paymentRequestService.getApprovedAndReadyToPay())
                .willReturn(List.of(approvedRequest));

        mockMvc.perform(get("/api/v1/finance/payment-requests/ready-to-pay")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].status").value("APPROVED"));
    }

    @Test
    @WithMockUser
    void getReadyToPay_emptyList_shouldReturn200() throws Exception {
        given(paymentRequestService.getApprovedAndReadyToPay())
                .willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/finance/payment-requests/ready-to-pay")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @WithMockUser
    void getReadyToPay_serviceThrowsException_shouldReturn500() throws Exception {
        given(paymentRequestService.getApprovedAndReadyToPay())
                .willThrow(new RuntimeException("Failed to fetch approved requests"));

        mockMvc.perform(get("/api/v1/finance/payment-requests/ready-to-pay")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/finance/payment-requests ====================

    @Test
    @WithMockUser
    void getAllPaymentRequests_shouldReturn200WithList() throws Exception {
        given(paymentRequestService.getAllPaymentRequests())
                .willReturn(List.of(sampleRequest));

        mockMvc.perform(get("/api/v1/finance/payment-requests")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].requestNumber").value("PR-2026-00001"));
    }

    @Test
    @WithMockUser
    void getAllPaymentRequests_emptyList_shouldReturn200() throws Exception {
        given(paymentRequestService.getAllPaymentRequests())
                .willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/finance/payment-requests")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @WithMockUser
    void getAllPaymentRequests_serviceThrowsException_shouldReturn500() throws Exception {
        given(paymentRequestService.getAllPaymentRequests())
                .willThrow(new RuntimeException("Database failure"));

        mockMvc.perform(get("/api/v1/finance/payment-requests")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/finance/payment-requests/{id} ====================

    @Test
    @WithMockUser
    void getPaymentRequestById_existingRequest_shouldReturn200() throws Exception {
        given(paymentRequestService.getPaymentRequestById(paymentRequestId))
                .willReturn(sampleRequest);

        mockMvc.perform(get("/api/v1/finance/payment-requests/{id}", paymentRequestId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(paymentRequestId.toString()))
                .andExpect(jsonPath("$.requestNumber").value("PR-2026-00001"));
    }

    @Test
    @WithMockUser
    void getPaymentRequestById_notFound_shouldReturn404() throws Exception {
        given(paymentRequestService.getPaymentRequestById(paymentRequestId))
                .willThrow(new RuntimeException("Payment request not found"));

        mockMvc.perform(get("/api/v1/finance/payment-requests/{id}", paymentRequestId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    // ==================== GET /api/v1/finance/payment-requests/merchant/{merchantId} ====================

    @Test
    @WithMockUser
    void getPaymentRequestsByMerchant_shouldReturn200WithList() throws Exception {
        given(paymentRequestService.getPaymentRequestsByMerchant(merchantId))
                .willReturn(List.of(sampleRequest));

        mockMvc.perform(get("/api/v1/finance/payment-requests/merchant/{merchantId}", merchantId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].merchantId").value(merchantId.toString()));
    }

    @Test
    @WithMockUser
    void getPaymentRequestsByMerchant_emptyList_shouldReturn200() throws Exception {
        given(paymentRequestService.getPaymentRequestsByMerchant(merchantId))
                .willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/finance/payment-requests/merchant/{merchantId}", merchantId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @WithMockUser
    void getPaymentRequestsByMerchant_serviceThrowsException_shouldReturn500() throws Exception {
        given(paymentRequestService.getPaymentRequestsByMerchant(merchantId))
                .willThrow(new RuntimeException("Failed to load merchant requests"));

        mockMvc.perform(get("/api/v1/finance/payment-requests/merchant/{merchantId}", merchantId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== POST /api/v1/finance/payment-requests/approve-reject ====================

    @Test
    @WithMockUser
    void approveOrRejectPaymentRequest_approveAction_shouldReturn200() throws Exception {
        PaymentRequestResponseDTO approvedRequest = PaymentRequestResponseDTO.builder()
                .id(paymentRequestId)
                .requestNumber("PR-2026-00001")
                .status(PaymentRequestStatus.APPROVED)
                .build();

        given(paymentRequestService.approveOrRejectPaymentRequest(
                any(ApproveRejectPaymentRequestDTO.class),
                any(UUID.class),
                anyString()
        )).willReturn(approvedRequest);

        ApproveRejectPaymentRequestDTO request = ApproveRejectPaymentRequestDTO.builder()
                .paymentRequestId(paymentRequestId)
                .action("APPROVE")
                .notes("Funds available, approved for payment")
                .build();

        mockMvc.perform(post("/api/v1/finance/payment-requests/approve-reject")
                        .with(user(mockUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    @WithMockUser
    void approveOrRejectPaymentRequest_rejectAction_shouldReturn200() throws Exception {
        PaymentRequestResponseDTO rejectedRequest = PaymentRequestResponseDTO.builder()
                .id(paymentRequestId)
                .requestNumber("PR-2026-00001")
                .status(PaymentRequestStatus.REJECTED)
                .rejectionReason("Insufficient documentation")
                .build();

        given(paymentRequestService.approveOrRejectPaymentRequest(
                any(ApproveRejectPaymentRequestDTO.class),
                any(UUID.class),
                anyString()
        )).willReturn(rejectedRequest);

        ApproveRejectPaymentRequestDTO request = ApproveRejectPaymentRequestDTO.builder()
                .paymentRequestId(paymentRequestId)
                .action("REJECT")
                .rejectionReason("Insufficient documentation")
                .build();

        mockMvc.perform(post("/api/v1/finance/payment-requests/approve-reject")
                        .with(user(mockUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));
    }

    @Test
    @WithMockUser
    void approveOrRejectPaymentRequest_serviceThrowsRuntimeException_shouldReturn400() throws Exception {
        given(paymentRequestService.approveOrRejectPaymentRequest(
                any(ApproveRejectPaymentRequestDTO.class),
                any(UUID.class),
                anyString()
        )).willThrow(new RuntimeException("Request is already in a terminal state"));

        ApproveRejectPaymentRequestDTO request = ApproveRejectPaymentRequestDTO.builder()
                .paymentRequestId(paymentRequestId)
                .action("APPROVE")
                .build();

        mockMvc.perform(post("/api/v1/finance/payment-requests/approve-reject")
                        .with(user(mockUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void approveOrRejectPaymentRequest_serviceThrowsException_shouldReturn500() throws Exception {
        given(paymentRequestService.approveOrRejectPaymentRequest(
                any(ApproveRejectPaymentRequestDTO.class),
                any(UUID.class),
                anyString()
        )).willThrow(new Exception("Internal failure"));

        ApproveRejectPaymentRequestDTO request = ApproveRejectPaymentRequestDTO.builder()
                .paymentRequestId(paymentRequestId)
                .action("APPROVE")
                .build();

        mockMvc.perform(post("/api/v1/finance/payment-requests/approve-reject")
                        .with(user(mockUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isInternalServerError());
    }

    // ==================== POST /api/v1/finance/payment-requests/create-from-po/{purchaseOrderId}/{offerId} ====================

    @Test
    @WithMockUser
    void createPaymentRequestFromPO_validRequest_shouldReturn200() throws Exception {
        given(paymentRequestService.createPaymentRequestFromPO(
                any(UUID.class),
                any(UUID.class),
                anyString()
        )).willReturn(sampleRequest);

        Map<String, String> body = new HashMap<>();
        body.put("username", "finance.manager");

        mockMvc.perform(post("/api/v1/finance/payment-requests/create-from-po/{purchaseOrderId}/{offerId}",
                        purchaseOrderId, offerId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requestNumber").value("PR-2026-00001"));
    }

    @Test
    @WithMockUser
    void createPaymentRequestFromPO_noBody_usesSystemUsername_shouldReturn200() throws Exception {
        given(paymentRequestService.createPaymentRequestFromPO(
                any(UUID.class),
                any(UUID.class),
                anyString()
        )).willReturn(sampleRequest);

        mockMvc.perform(post("/api/v1/finance/payment-requests/create-from-po/{purchaseOrderId}/{offerId}",
                        purchaseOrderId, offerId)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requestNumber").value("PR-2026-00001"));
    }

    @Test
    @WithMockUser
    void createPaymentRequestFromPO_serviceThrowsRuntimeException_shouldReturn400() throws Exception {
        given(paymentRequestService.createPaymentRequestFromPO(
                any(UUID.class),
                any(UUID.class),
                anyString()
        )).willThrow(new RuntimeException("Purchase order not found"));

        Map<String, String> body = new HashMap<>();
        body.put("username", "finance.manager");

        mockMvc.perform(post("/api/v1/finance/payment-requests/create-from-po/{purchaseOrderId}/{offerId}",
                        purchaseOrderId, offerId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void createPaymentRequestFromPO_serviceThrowsException_shouldReturn500() throws Exception {
        given(paymentRequestService.createPaymentRequestFromPO(
                any(UUID.class),
                any(UUID.class),
                anyString()
        )).willThrow(new Exception("Internal server error"));

        Map<String, String> body = new HashMap<>();
        body.put("username", "finance.manager");

        mockMvc.perform(post("/api/v1/finance/payment-requests/create-from-po/{purchaseOrderId}/{offerId}",
                        purchaseOrderId, offerId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isInternalServerError());
    }
}