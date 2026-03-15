package com.example.backend.controllers.finance.incomingPayments;

import com.example.backend.config.JwtService;
import com.example.backend.dto.finance.incomingPayments.ConfirmIncomingPaymentRequestDTO;
import com.example.backend.dto.finance.incomingPayments.IncomingPaymentRequestResponseDTO;
import com.example.backend.models.finance.balances.AccountType;
import com.example.backend.models.finance.incomingPayments.IncomingPaymentSource;
import com.example.backend.models.finance.incomingPayments.IncomingPaymentStatus;
import com.example.backend.services.finance.incomingPayments.IncomingPaymentRequestService;
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
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = IncomingPaymentRequestController.class)
@AutoConfigureMockMvc(addFilters = false)
public class IncomingPaymentRequestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private IncomingPaymentRequestService incomingPaymentRequestService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String BASE_URL = "/api/v1/finance/incoming-payments";

    @BeforeEach
    void setUp() {
        objectMapper.registerModule(new JavaTimeModule());
    }

    // ==================== Helper builders ====================

    private IncomingPaymentRequestResponseDTO buildResponseDTO(UUID id,
                                                                IncomingPaymentStatus status,
                                                                IncomingPaymentSource source) {
        IncomingPaymentRequestResponseDTO dto = new IncomingPaymentRequestResponseDTO();
        dto.setId(id);
        dto.setPurchaseOrderId(UUID.randomUUID());
        dto.setPurchaseOrderNumber("PO-2025-00001");
        dto.setMerchantId(UUID.randomUUID());
        dto.setMerchantName("Test Merchant");
        dto.setMerchantContactPhone("+1-555-0100");
        dto.setMerchantContactEmail("merchant@test.com");
        dto.setSource(source);
        dto.setSourceReferenceId(UUID.randomUUID());
        dto.setTotalAmount(BigDecimal.valueOf(5000.00));
        dto.setStatus(status);
        dto.setCreatedAt(LocalDateTime.now());
        dto.setUpdatedAt(LocalDateTime.now());
        dto.setItems(Collections.emptyList());
        return dto;
    }

    private Map<String, Object> buildConfirmRequestBody() {
        Map<String, Object> body = new HashMap<>();
        body.put("balanceType", "BANK_ACCOUNT");
        body.put("balanceAccountId", UUID.randomUUID().toString());
        body.put("dateReceived", "2026-03-10");
        body.put("financeNotes", "Payment received in full");
        return body;
    }

    // ==================== GET /api/v1/finance/incoming-payments ====================

    @Test
    @WithMockUser
    void getAllIncomingPayments_shouldReturn200WithList() throws Exception {
        UUID id = UUID.randomUUID();
        IncomingPaymentRequestResponseDTO dto =
                buildResponseDTO(id, IncomingPaymentStatus.PENDING, IncomingPaymentSource.REFUND);

        given(incomingPaymentRequestService.getAllIncomingPaymentRequests())
                .willReturn(List.of(dto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get(BASE_URL)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value(id.toString()))
                .andExpect(jsonPath("$[0].status").value("PENDING"))
                .andExpect(jsonPath("$[0].source").value("REFUND"));
    }

    @Test
    @WithMockUser
    void getAllIncomingPayments_emptyList_shouldReturn200WithEmptyArray() throws Exception {
        given(incomingPaymentRequestService.getAllIncomingPaymentRequests())
                .willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get(BASE_URL)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @WithMockUser
    void getAllIncomingPayments_whenServiceThrows_shouldReturn500() throws Exception {
        given(incomingPaymentRequestService.getAllIncomingPaymentRequests())
                .willThrow(new RuntimeException("Database connection lost"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get(BASE_URL)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/finance/incoming-payments/status/{status} ====================

    @Test
    @WithMockUser
    void getIncomingPaymentsByStatus_pending_shouldReturn200WithList() throws Exception {
        UUID id = UUID.randomUUID();
        IncomingPaymentRequestResponseDTO dto =
                buildResponseDTO(id, IncomingPaymentStatus.PENDING, IncomingPaymentSource.PO_RETURN);

        given(incomingPaymentRequestService.getIncomingPaymentRequestsByStatus(IncomingPaymentStatus.PENDING))
                .willReturn(List.of(dto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get(BASE_URL + "/status/PENDING")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value(id.toString()))
                .andExpect(jsonPath("$[0].status").value("PENDING"));
    }

    @Test
    @WithMockUser
    void getIncomingPaymentsByStatus_confirmed_shouldReturn200WithList() throws Exception {
        UUID id = UUID.randomUUID();
        IncomingPaymentRequestResponseDTO dto =
                buildResponseDTO(id, IncomingPaymentStatus.CONFIRMED, IncomingPaymentSource.REFUND);
        dto.setConfirmedBy("finance.user");
        dto.setConfirmedAt(LocalDateTime.now());
        dto.setDateReceived(LocalDate.of(2026, 3, 10));

        given(incomingPaymentRequestService.getIncomingPaymentRequestsByStatus(IncomingPaymentStatus.CONFIRMED))
                .willReturn(List.of(dto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get(BASE_URL + "/status/CONFIRMED")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].status").value("CONFIRMED"));
    }

    @Test
    @WithMockUser
    void getIncomingPaymentsByStatus_noResults_shouldReturn200WithEmptyArray() throws Exception {
        given(incomingPaymentRequestService.getIncomingPaymentRequestsByStatus(IncomingPaymentStatus.CONFIRMED))
                .willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get(BASE_URL + "/status/CONFIRMED")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @WithMockUser
    void getIncomingPaymentsByStatus_whenServiceThrows_shouldReturn500() throws Exception {
        given(incomingPaymentRequestService.getIncomingPaymentRequestsByStatus(any()))
                .willThrow(new RuntimeException("Unexpected error"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get(BASE_URL + "/status/PENDING")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    @Test
    @WithMockUser
    void getIncomingPaymentsByStatus_invalidStatus_shouldReturn400() throws Exception {
        // Spring cannot convert an unrecognised enum value - returns 400 before reaching the service
        mockMvc.perform(MockMvcRequestBuilders
                        .get(BASE_URL + "/status/INVALID_STATUS")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }

    // ==================== GET /api/v1/finance/incoming-payments/source/{source} ====================

    @Test
    @WithMockUser
    void getIncomingPaymentsBySource_refund_shouldReturn200WithList() throws Exception {
        UUID id = UUID.randomUUID();
        IncomingPaymentRequestResponseDTO dto =
                buildResponseDTO(id, IncomingPaymentStatus.PENDING, IncomingPaymentSource.REFUND);
        dto.setIssueId("ISS-2025-00042");

        given(incomingPaymentRequestService.getIncomingPaymentRequestsBySource(IncomingPaymentSource.REFUND))
                .willReturn(List.of(dto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get(BASE_URL + "/source/REFUND")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].source").value("REFUND"))
                .andExpect(jsonPath("$[0].issueId").value("ISS-2025-00042"));
    }

    @Test
    @WithMockUser
    void getIncomingPaymentsBySource_poReturn_shouldReturn200WithList() throws Exception {
        UUID id = UUID.randomUUID();
        IncomingPaymentRequestResponseDTO dto =
                buildResponseDTO(id, IncomingPaymentStatus.PENDING, IncomingPaymentSource.PO_RETURN);
        dto.setPurchaseOrderReturnId("RET-000001");

        given(incomingPaymentRequestService.getIncomingPaymentRequestsBySource(IncomingPaymentSource.PO_RETURN))
                .willReturn(List.of(dto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get(BASE_URL + "/source/PO_RETURN")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].source").value("PO_RETURN"))
                .andExpect(jsonPath("$[0].purchaseOrderReturnId").value("RET-000001"));
    }

    @Test
    @WithMockUser
    void getIncomingPaymentsBySource_noResults_shouldReturn200WithEmptyArray() throws Exception {
        given(incomingPaymentRequestService.getIncomingPaymentRequestsBySource(IncomingPaymentSource.PO_RETURN))
                .willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get(BASE_URL + "/source/PO_RETURN")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @WithMockUser
    void getIncomingPaymentsBySource_whenServiceThrows_shouldReturn500() throws Exception {
        given(incomingPaymentRequestService.getIncomingPaymentRequestsBySource(any()))
                .willThrow(new RuntimeException("Unexpected error"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get(BASE_URL + "/source/REFUND")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    @Test
    @WithMockUser
    void getIncomingPaymentsBySource_invalidSource_shouldReturn400() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders
                        .get(BASE_URL + "/source/UNKNOWN_SOURCE")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }

    // ==================== GET /api/v1/finance/incoming-payments/{id} ====================

    @Test
    @WithMockUser
    void getIncomingPaymentById_shouldReturn200WithDTO() throws Exception {
        UUID id = UUID.randomUUID();
        IncomingPaymentRequestResponseDTO dto =
                buildResponseDTO(id, IncomingPaymentStatus.PENDING, IncomingPaymentSource.REFUND);

        given(incomingPaymentRequestService.getIncomingPaymentRequestById(id)).willReturn(dto);

        mockMvc.perform(MockMvcRequestBuilders
                        .get(BASE_URL + "/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.merchantName").value("Test Merchant"))
                .andExpect(jsonPath("$.purchaseOrderNumber").value("PO-2025-00001"));
    }

    @Test
    @WithMockUser
    void getIncomingPaymentById_whenNotFound_shouldReturn404WithMessage() throws Exception {
        UUID id = UUID.randomUUID();

        given(incomingPaymentRequestService.getIncomingPaymentRequestById(id))
                .willThrow(new RuntimeException("Incoming payment request not found"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get(BASE_URL + "/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Incoming payment request not found"))
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @WithMockUser
    void getIncomingPaymentById_whenUnexpectedError_shouldReturn500WithMessage() throws Exception {
        UUID id = UUID.randomUUID();

        given(incomingPaymentRequestService.getIncomingPaymentRequestById(id))
                .willThrow(new Error("JVM crash simulation"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get(BASE_URL + "/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value("Error fetching incoming payment request"))
                .andExpect(jsonPath("$.success").value(false));
    }

    // ==================== POST /api/v1/finance/incoming-payments/{id}/confirm ====================

    @Test
    @WithMockUser(username = "finance.user")
    void confirmIncomingPayment_shouldReturn200WithSuccessResponse() throws Exception {
        UUID id = UUID.randomUUID();

        IncomingPaymentRequestResponseDTO confirmedDTO =
                buildResponseDTO(id, IncomingPaymentStatus.CONFIRMED, IncomingPaymentSource.REFUND);
        confirmedDTO.setConfirmedBy("finance.user");
        confirmedDTO.setConfirmedAt(LocalDateTime.now());
        confirmedDTO.setBalanceType(AccountType.BANK_ACCOUNT);
        confirmedDTO.setDateReceived(LocalDate.of(2026, 3, 10));
        confirmedDTO.setFinanceNotes("Payment received in full");

        given(incomingPaymentRequestService.confirmIncomingPayment(
                eq(id), any(ConfirmIncomingPaymentRequestDTO.class), eq("finance.user")))
                .willReturn(confirmedDTO);

        Map<String, Object> requestBody = buildConfirmRequestBody();

        mockMvc.perform(MockMvcRequestBuilders
                        .post(BASE_URL + "/{id}/confirm", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Incoming payment confirmed successfully"))
                .andExpect(jsonPath("$.data.id").value(id.toString()))
                .andExpect(jsonPath("$.data.status").value("CONFIRMED"));
    }

    @Test
    @WithMockUser(username = "finance.user")
    void confirmIncomingPayment_whenAlreadyConfirmed_shouldReturn400WithMessage() throws Exception {
        UUID id = UUID.randomUUID();

        given(incomingPaymentRequestService.confirmIncomingPayment(
                eq(id), any(ConfirmIncomingPaymentRequestDTO.class), eq("finance.user")))
                .willThrow(new RuntimeException("Payment has already been confirmed"));

        Map<String, Object> requestBody = buildConfirmRequestBody();

        mockMvc.perform(MockMvcRequestBuilders
                        .post(BASE_URL + "/{id}/confirm", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Payment has already been confirmed"))
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @WithMockUser(username = "finance.user")
    void confirmIncomingPayment_whenPaymentNotFound_shouldReturn400WithMessage() throws Exception {
        UUID id = UUID.randomUUID();

        given(incomingPaymentRequestService.confirmIncomingPayment(
                eq(id), any(ConfirmIncomingPaymentRequestDTO.class), eq("finance.user")))
                .willThrow(new RuntimeException("Incoming payment request not found with id: " + id));

        Map<String, Object> requestBody = buildConfirmRequestBody();

        mockMvc.perform(MockMvcRequestBuilders
                        .post(BASE_URL + "/{id}/confirm", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @WithMockUser(username = "finance.user")
    void confirmIncomingPayment_whenUnexpectedError_shouldReturn500WithMessage() throws Exception {
        UUID id = UUID.randomUUID();

        // Simulate a non-RuntimeException (e.g., infrastructure failure)
        given(incomingPaymentRequestService.confirmIncomingPayment(
                eq(id), any(ConfirmIncomingPaymentRequestDTO.class), eq("finance.user")))
                .willAnswer(invocation -> {
                    throw new Exception("Database connection reset");
                });

        Map<String, Object> requestBody = buildConfirmRequestBody();

        mockMvc.perform(MockMvcRequestBuilders
                        .post(BASE_URL + "/{id}/confirm", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value("Error confirming incoming payment"))
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @WithMockUser(username = "finance.user")
    void confirmIncomingPayment_withCashSafeBalanceType_shouldReturn200() throws Exception {
        UUID id = UUID.randomUUID();

        IncomingPaymentRequestResponseDTO confirmedDTO =
                buildResponseDTO(id, IncomingPaymentStatus.CONFIRMED, IncomingPaymentSource.PO_RETURN);
        confirmedDTO.setConfirmedBy("finance.user");
        confirmedDTO.setBalanceType(AccountType.CASH_SAFE);

        given(incomingPaymentRequestService.confirmIncomingPayment(
                eq(id), any(ConfirmIncomingPaymentRequestDTO.class), eq("finance.user")))
                .willReturn(confirmedDTO);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("balanceType", "CASH_SAFE");
        requestBody.put("balanceAccountId", UUID.randomUUID().toString());
        requestBody.put("dateReceived", "2026-03-12");
        requestBody.put("financeNotes", "Cash received from safe");

        mockMvc.perform(MockMvcRequestBuilders
                        .post(BASE_URL + "/{id}/confirm", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.balanceType").value("CASH_SAFE"));
    }
}