package com.example.backend.controllers.finance.balances;

import com.example.backend.config.JwtService;
import com.example.backend.dto.finance.balances.BalanceTransactionResponseDTO;
import com.example.backend.models.finance.balances.AccountType;
import com.example.backend.models.finance.balances.TransactionStatus;
import com.example.backend.models.finance.balances.TransactionType;
import com.example.backend.repositories.user.UserRepository;
import com.example.backend.services.finance.balances.BalanceTransactionService;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = BalanceTransactionController.class)
@AutoConfigureMockMvc(addFilters = false)
public class BalanceTransactionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private BalanceTransactionService balanceTransactionService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String BASE_URL = "/api/v1/finance/balances/transactions";

    private BalanceTransactionResponseDTO buildResponse(UUID id) {
        return BalanceTransactionResponseDTO.builder()
                .id(id)
                .transactionType(TransactionType.DEPOSIT)
                .amount(BigDecimal.valueOf(1000))
                .accountType(AccountType.BANK_ACCOUNT)
                .accountId(UUID.randomUUID())
                .status(TransactionStatus.PENDING)
                .createdBy("testuser")
                .createdAt(LocalDateTime.now())
                .build();
    }

    // ==================== POST /api/v1/finance/balances/transactions ====================

    @Test
    @WithMockUser
    void createTransaction_validRequest_returns201() throws Exception {
        UUID accountId = UUID.randomUUID();
        Map<String, Object> body = new HashMap<>();
        body.put("transactionType", "DEPOSIT");
        body.put("amount", 500.00);
        body.put("accountType", "BANK_ACCOUNT");
        body.put("accountId", accountId.toString());

        BalanceTransactionResponseDTO response = buildResponse(UUID.randomUUID());

        given(userRepository.findByUsername(anyString())).willReturn(Optional.empty());
        given(balanceTransactionService.createTransaction(any(), anyString(), any()))
                .willReturn(response);

        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.transactionType").value("DEPOSIT"));
    }

    @Test
    @WithMockUser
    void createTransaction_missingRequiredFields_returns400() throws Exception {
        Map<String, Object> body = new HashMap<>();
        // amount and accountType and accountId are missing

        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    // ==================== POST /api/v1/finance/balances/transactions/{id}/approve ====================

    @Test
    @WithMockUser
    void approveTransaction_existingId_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        BalanceTransactionResponseDTO response = buildResponse(id);
        response.setStatus(TransactionStatus.APPROVED);

        given(balanceTransactionService.approveTransaction(any(UUID.class), anyString()))
                .willReturn(response);

        mockMvc.perform(post(BASE_URL + "/{id}/approve", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    @WithMockUser
    void approveTransaction_serviceThrows_returns500() throws Exception {
        UUID id = UUID.randomUUID();

        given(balanceTransactionService.approveTransaction(any(UUID.class), anyString()))
                .willThrow(new RuntimeException("Transaction not found"));

        mockMvc.perform(post(BASE_URL + "/{id}/approve", id))
                .andExpect(status().isInternalServerError());
    }

    // ==================== POST /api/v1/finance/balances/transactions/{id}/reject ====================

    @Test
    @WithMockUser
    void rejectTransaction_existingId_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        BalanceTransactionResponseDTO response = buildResponse(id);
        response.setStatus(TransactionStatus.REJECTED);
        response.setRejectionReason("Duplicate entry");

        Map<String, Object> body = new HashMap<>();
        body.put("approved", false);
        body.put("rejectionReason", "Duplicate entry");

        given(balanceTransactionService.rejectTransaction(any(UUID.class), anyString(), anyString()))
                .willReturn(response);

        mockMvc.perform(post(BASE_URL + "/{id}/reject", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.rejectionReason").value("Duplicate entry"));
    }

    @Test
    @WithMockUser
    void rejectTransaction_serviceThrows_returns500() throws Exception {
        UUID id = UUID.randomUUID();

        Map<String, Object> body = new HashMap<>();
        body.put("approved", false);
        body.put("rejectionReason", "Not valid");

        given(balanceTransactionService.rejectTransaction(any(UUID.class), anyString(), anyString()))
                .willThrow(new RuntimeException("Transaction not found"));

        mockMvc.perform(post(BASE_URL + "/{id}/reject", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/finance/balances/transactions/{id} ====================

    @Test
    @WithMockUser
    void getById_existingId_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        BalanceTransactionResponseDTO response = buildResponse(id);

        given(balanceTransactionService.getById(id)).willReturn(response);

        mockMvc.perform(get(BASE_URL + "/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()));
    }

    @Test
    @WithMockUser
    void getById_serviceThrows_returns500() throws Exception {
        UUID id = UUID.randomUUID();

        given(balanceTransactionService.getById(id))
                .willThrow(new RuntimeException("Not found"));

        mockMvc.perform(get(BASE_URL + "/{id}", id))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/finance/balances/transactions ====================

    @Test
    @WithMockUser
    void getAll_returnsListWith200() throws Exception {
        List<BalanceTransactionResponseDTO> list = List.of(
                buildResponse(UUID.randomUUID()),
                buildResponse(UUID.randomUUID())
        );

        given(balanceTransactionService.getAll()).willReturn(list);

        mockMvc.perform(get(BASE_URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    @WithMockUser
    void getAll_emptyList_returnsEmptyArrayWith200() throws Exception {
        given(balanceTransactionService.getAll()).willReturn(List.of());

        mockMvc.perform(get(BASE_URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // ==================== GET /api/v1/finance/balances/transactions/pending ====================

    @Test
    @WithMockUser
    void getPendingTransactions_returnsPendingListWith200() throws Exception {
        List<BalanceTransactionResponseDTO> pending = List.of(buildResponse(UUID.randomUUID()));

        given(balanceTransactionService.getPendingTransactions()).willReturn(pending);

        mockMvc.perform(get(BASE_URL + "/pending"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    // ==================== GET /api/v1/finance/balances/transactions/pending/count ====================

    @Test
    @WithMockUser
    void getPendingTransactionCount_returnsCountWith200() throws Exception {
        given(balanceTransactionService.getPendingTransactionCount()).willReturn(5L);

        mockMvc.perform(get(BASE_URL + "/pending/count"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(5));
    }

    // ==================== GET /api/v1/finance/balances/transactions/account/{accountType}/{accountId} ====================

    @Test
    @WithMockUser
    void getTransactionsByAccount_returns200() throws Exception {
        UUID accountId = UUID.randomUUID();
        List<BalanceTransactionResponseDTO> list = List.of(buildResponse(UUID.randomUUID()));

        given(balanceTransactionService.getTransactionsByAccount(
                any(AccountType.class), any(UUID.class)))
                .willReturn(list);

        mockMvc.perform(get(BASE_URL + "/account/{accountType}/{accountId}",
                        "BANK_ACCOUNT", accountId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    @WithMockUser
    void getTransactionsByAccount_invalidAccountType_returns400() throws Exception {
        UUID accountId = UUID.randomUUID();

        mockMvc.perform(get(BASE_URL + "/account/{accountType}/{accountId}",
                        "INVALID_TYPE", accountId))
                .andExpect(status().isBadRequest());
    }

    // ==================== GET /api/v1/finance/balances/transactions/date-range ====================

    @Test
    @WithMockUser
    void getTransactionsByDateRange_validDates_returns200() throws Exception {
        List<BalanceTransactionResponseDTO> list = List.of(buildResponse(UUID.randomUUID()));

        given(balanceTransactionService.getTransactionsByDateRange(any(), any()))
                .willReturn(list);

        mockMvc.perform(get(BASE_URL + "/date-range")
                        .param("startDate", "2026-01-01T00:00:00")
                        .param("endDate", "2026-03-01T23:59:59"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    @WithMockUser
    void getTransactionsByDateRange_missingParams_returns400() throws Exception {
        mockMvc.perform(get(BASE_URL + "/date-range"))
                .andExpect(status().isBadRequest());
    }
}