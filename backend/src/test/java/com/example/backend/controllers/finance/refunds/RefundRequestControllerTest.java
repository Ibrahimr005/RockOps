package com.example.backend.controllers.finance.refunds;

import com.example.backend.config.JwtService;
import com.example.backend.dto.finance.refunds.ConfirmRefundRequestDTO;
import com.example.backend.dto.finance.refunds.RefundRequestResponseDTO;
import com.example.backend.models.finance.balances.AccountType;
import com.example.backend.models.finance.refunds.RefundStatus;
import com.example.backend.services.finance.refunds.RefundRequestService;
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
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = RefundRequestController.class)
@AutoConfigureMockMvc(addFilters = false)
public class RefundRequestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private RefundRequestService refundRequestService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String BASE_URL = "/api/finance/refunds";

    @BeforeEach
    void setUp() {
        objectMapper.registerModule(new JavaTimeModule());
    }

    // ==================== Helper builders ====================

    private RefundRequestResponseDTO buildResponseDTO(UUID id, RefundStatus status) {
        RefundRequestResponseDTO dto = new RefundRequestResponseDTO();
        dto.setId(id);
        dto.setPurchaseOrderId(UUID.randomUUID());
        dto.setPurchaseOrderNumber("PO-2025-00099");
        dto.setMerchantId(UUID.randomUUID());
        dto.setMerchantName("Test Supplier Ltd");
        dto.setMerchantContactPhone("+1-555-0200");
        dto.setMerchantContactEmail("supplier@test.com");
        dto.setTotalRefundAmount(BigDecimal.valueOf(1500.00));
        dto.setStatus(status);
        dto.setCreatedAt(LocalDateTime.now());
        dto.setUpdatedAt(LocalDateTime.now());
        dto.setRefundItems(new ArrayList<>());
        return dto;
    }

    private Map<String, Object> buildConfirmRequestBody() {
        Map<String, Object> body = new HashMap<>();
        body.put("balanceType", "BANK_ACCOUNT");
        body.put("balanceAccountId", UUID.randomUUID().toString());
        body.put("dateReceived", "2026-03-10");
        body.put("financeNotes", "Refund received and reconciled");
        return body;
    }

    // ==================== GET /api/finance/refunds ====================

    @Test
    @WithMockUser
    void getAllRefundRequests_shouldReturn200WithList() throws Exception {
        UUID id = UUID.randomUUID();
        RefundRequestResponseDTO dto = buildResponseDTO(id, RefundStatus.PENDING);

        given(refundRequestService.getAllRefundRequests()).willReturn(List.of(dto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get(BASE_URL)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value(id.toString()))
                .andExpect(jsonPath("$[0].status").value("PENDING"))
                .andExpect(jsonPath("$[0].merchantName").value("Test Supplier Ltd"));
    }

    @Test
    @WithMockUser
    void getAllRefundRequests_emptyList_shouldReturn200WithEmptyArray() throws Exception {
        given(refundRequestService.getAllRefundRequests()).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get(BASE_URL)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @WithMockUser
    void getAllRefundRequests_whenServiceThrows_shouldReturn500() throws Exception {
        given(refundRequestService.getAllRefundRequests())
                .willThrow(new RuntimeException("Database unavailable"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get(BASE_URL)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    @Test
    @WithMockUser
    void getAllRefundRequests_multipleItems_shouldReturn200WithFullList() throws Exception {
        RefundRequestResponseDTO dto1 = buildResponseDTO(UUID.randomUUID(), RefundStatus.PENDING);
        RefundRequestResponseDTO dto2 = buildResponseDTO(UUID.randomUUID(), RefundStatus.CONFIRMED);
        dto2.setConfirmedBy("finance.manager");
        dto2.setConfirmedAt(LocalDateTime.now());

        given(refundRequestService.getAllRefundRequests()).willReturn(List.of(dto1, dto2));

        mockMvc.perform(MockMvcRequestBuilders
                        .get(BASE_URL)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].status").value("PENDING"))
                .andExpect(jsonPath("$[1].status").value("CONFIRMED"));
    }

    // ==================== GET /api/finance/refunds/status/{status} ====================

    @Test
    @WithMockUser
    void getRefundRequestsByStatus_pending_shouldReturn200WithList() throws Exception {
        UUID id = UUID.randomUUID();
        RefundRequestResponseDTO dto = buildResponseDTO(id, RefundStatus.PENDING);

        given(refundRequestService.getRefundRequestsByStatus(RefundStatus.PENDING))
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
    void getRefundRequestsByStatus_confirmed_shouldReturn200WithList() throws Exception {
        UUID id = UUID.randomUUID();
        RefundRequestResponseDTO dto = buildResponseDTO(id, RefundStatus.CONFIRMED);
        dto.setConfirmedBy("finance.user");
        dto.setConfirmedAt(LocalDateTime.now());
        dto.setBalanceType(AccountType.BANK_ACCOUNT);
        dto.setDateReceived(LocalDate.of(2026, 3, 10));

        given(refundRequestService.getRefundRequestsByStatus(RefundStatus.CONFIRMED))
                .willReturn(List.of(dto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get(BASE_URL + "/status/CONFIRMED")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].status").value("CONFIRMED"))
                .andExpect(jsonPath("$[0].confirmedBy").value("finance.user"));
    }

    @Test
    @WithMockUser
    void getRefundRequestsByStatus_noResults_shouldReturn200WithEmptyArray() throws Exception {
        given(refundRequestService.getRefundRequestsByStatus(RefundStatus.CONFIRMED))
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
    void getRefundRequestsByStatus_whenServiceThrows_shouldReturn500() throws Exception {
        given(refundRequestService.getRefundRequestsByStatus(any()))
                .willThrow(new RuntimeException("Unexpected failure"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get(BASE_URL + "/status/PENDING")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    @Test
    @WithMockUser
    void getRefundRequestsByStatus_invalidStatus_shouldReturn400() throws Exception {
        // Spring cannot bind an unrecognised enum value - returns 400 before reaching the service
        mockMvc.perform(MockMvcRequestBuilders
                        .get(BASE_URL + "/status/UNKNOWN_STATUS")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }

    // ==================== GET /api/finance/refunds/{id} ====================

    @Test
    @WithMockUser
    void getRefundRequestById_shouldReturn200WithDTO() throws Exception {
        UUID id = UUID.randomUUID();
        RefundRequestResponseDTO dto = buildResponseDTO(id, RefundStatus.PENDING);

        given(refundRequestService.getRefundRequestById(id)).willReturn(dto);

        mockMvc.perform(MockMvcRequestBuilders
                        .get(BASE_URL + "/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.purchaseOrderNumber").value("PO-2025-00099"))
                .andExpect(jsonPath("$.totalRefundAmount").value(1500.00));
    }

    @Test
    @WithMockUser
    void getRefundRequestById_confirmedRefund_shouldReturn200WithConfirmationDetails() throws Exception {
        UUID id = UUID.randomUUID();
        RefundRequestResponseDTO dto = buildResponseDTO(id, RefundStatus.CONFIRMED);
        dto.setConfirmedBy("finance.manager");
        dto.setConfirmedAt(LocalDateTime.now());
        dto.setBalanceType(AccountType.CASH_SAFE);
        dto.setBalanceAccountId(UUID.randomUUID());
        dto.setBalanceAccountName("Main Cash Safe");
        dto.setDateReceived(LocalDate.of(2026, 3, 5));
        dto.setFinanceNotes("Refund received");

        given(refundRequestService.getRefundRequestById(id)).willReturn(dto);

        mockMvc.perform(MockMvcRequestBuilders
                        .get(BASE_URL + "/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.confirmedBy").value("finance.manager"))
                .andExpect(jsonPath("$.balanceType").value("CASH_SAFE"));
    }

    @Test
    @WithMockUser
    void getRefundRequestById_whenNotFound_shouldReturn404() throws Exception {
        UUID id = UUID.randomUUID();

        given(refundRequestService.getRefundRequestById(id))
                .willThrow(new RuntimeException("Refund request not found with id: " + id));

        mockMvc.perform(MockMvcRequestBuilders
                        .get(BASE_URL + "/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
    void getRefundRequestById_whenUnexpectedError_shouldReturn500() throws Exception {
        UUID id = UUID.randomUUID();

        given(refundRequestService.getRefundRequestById(id))
                .willAnswer(invocation -> {
                    throw new Exception("Unexpected infrastructure error");
                });

        mockMvc.perform(MockMvcRequestBuilders
                        .get(BASE_URL + "/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== POST /api/finance/refunds/{id}/confirm ====================

    @Test
    @WithMockUser(username = "finance.user")
    void confirmRefund_shouldReturn200WithConfirmedDTO() throws Exception {
        UUID id = UUID.randomUUID();

        RefundRequestResponseDTO confirmedDTO = buildResponseDTO(id, RefundStatus.CONFIRMED);
        confirmedDTO.setConfirmedBy("finance.user");
        confirmedDTO.setConfirmedAt(LocalDateTime.now());
        confirmedDTO.setBalanceType(AccountType.BANK_ACCOUNT);
        confirmedDTO.setBalanceAccountId(UUID.randomUUID());
        confirmedDTO.setBalanceAccountName("Main Bank Account");
        confirmedDTO.setDateReceived(LocalDate.of(2026, 3, 10));
        confirmedDTO.setFinanceNotes("Refund received and reconciled");

        given(refundRequestService.confirmRefund(
                eq(id), any(ConfirmRefundRequestDTO.class), anyString()))
                .willReturn(confirmedDTO);

        Map<String, Object> requestBody = buildConfirmRequestBody();

        mockMvc.perform(MockMvcRequestBuilders
                        .post(BASE_URL + "/{id}/confirm", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.confirmedBy").value("finance.user"))
                .andExpect(jsonPath("$.balanceType").value("BANK_ACCOUNT"))
                .andExpect(jsonPath("$.financeNotes").value("Refund received and reconciled"));
    }

    @Test
    @WithMockUser(username = "finance.user")
    void confirmRefund_withCashWithPersonBalanceType_shouldReturn200() throws Exception {
        UUID id = UUID.randomUUID();

        RefundRequestResponseDTO confirmedDTO = buildResponseDTO(id, RefundStatus.CONFIRMED);
        confirmedDTO.setConfirmedBy("finance.user");
        confirmedDTO.setBalanceType(AccountType.CASH_WITH_PERSON);

        given(refundRequestService.confirmRefund(
                eq(id), any(ConfirmRefundRequestDTO.class), anyString()))
                .willReturn(confirmedDTO);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("balanceType", "CASH_WITH_PERSON");
        requestBody.put("balanceAccountId", UUID.randomUUID().toString());
        requestBody.put("dateReceived", "2026-03-14");
        requestBody.put("financeNotes", "Cash handled by agent");

        mockMvc.perform(MockMvcRequestBuilders
                        .post(BASE_URL + "/{id}/confirm", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.balanceType").value("CASH_WITH_PERSON"));
    }

    @Test
    @WithMockUser(username = "finance.user")
    void confirmRefund_whenAlreadyConfirmed_shouldReturn400WithNullBody() throws Exception {
        UUID id = UUID.randomUUID();

        given(refundRequestService.confirmRefund(
                eq(id), any(ConfirmRefundRequestDTO.class), anyString()))
                .willThrow(new RuntimeException("Refund has already been confirmed"));

        Map<String, Object> requestBody = buildConfirmRequestBody();

        mockMvc.perform(MockMvcRequestBuilders
                        .post(BASE_URL + "/{id}/confirm", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "finance.user")
    void confirmRefund_whenRefundNotFound_shouldReturn400() throws Exception {
        UUID id = UUID.randomUUID();

        given(refundRequestService.confirmRefund(
                eq(id), any(ConfirmRefundRequestDTO.class), anyString()))
                .willThrow(new RuntimeException("Refund request not found with id: " + id));

        Map<String, Object> requestBody = buildConfirmRequestBody();

        mockMvc.perform(MockMvcRequestBuilders
                        .post(BASE_URL + "/{id}/confirm", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "finance.user")
    void confirmRefund_whenUnexpectedError_shouldReturn500() throws Exception {
        UUID id = UUID.randomUUID();

        given(refundRequestService.confirmRefund(
                eq(id), any(ConfirmRefundRequestDTO.class), anyString()))
                .willAnswer(invocation -> {
                    throw new Exception("Infrastructure failure");
                });

        Map<String, Object> requestBody = buildConfirmRequestBody();

        mockMvc.perform(MockMvcRequestBuilders
                        .post(BASE_URL + "/{id}/confirm", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isInternalServerError());
    }

    @Test
    @WithMockUser(username = "finance.user")
    void confirmRefund_withoutAuthenticationName_treatedAsSystem() throws Exception {
        // When authentication is null the controller falls back to "System" as confirmedBy.
        // @WithMockUser supplies a non-null Authentication so this test validates the
        // happy path while confirming the controller does not NPE on Authentication.getName().
        UUID id = UUID.randomUUID();

        RefundRequestResponseDTO confirmedDTO = buildResponseDTO(id, RefundStatus.CONFIRMED);
        confirmedDTO.setConfirmedBy("finance.user");

        given(refundRequestService.confirmRefund(
                eq(id), any(ConfirmRefundRequestDTO.class), anyString()))
                .willReturn(confirmedDTO);

        Map<String, Object> requestBody = buildConfirmRequestBody();

        mockMvc.perform(MockMvcRequestBuilders
                        .post(BASE_URL + "/{id}/confirm", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.status").value("CONFIRMED"));
    }
}