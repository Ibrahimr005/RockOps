package com.example.backend.controllers.finance.balances;

import com.example.backend.config.JwtService;
import com.example.backend.dto.finance.balances.BankAccountResponseDTO;
import com.example.backend.services.finance.balances.BankAccountService;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = BankAccountController.class)
@AutoConfigureMockMvc(addFilters = false)
public class BankAccountControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private BankAccountService bankAccountService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String BASE_URL = "/api/v1/finance/balances/bank-accounts";

    private BankAccountResponseDTO buildResponse(UUID id) {
        return BankAccountResponseDTO.builder()
                .id(id)
                .bankName("Test Bank")
                .accountNumber("123456789")
                .accountHolderName("John Doe")
                .currentBalance(BigDecimal.valueOf(5000))
                .isActive(true)
                .build();
    }

    private Map<String, Object> buildValidRequestBody() {
        Map<String, Object> body = new HashMap<>();
        body.put("bankName", "Test Bank");
        body.put("accountNumber", "123456789");
        body.put("accountHolderName", "John Doe");
        body.put("currentBalance", 5000.00);
        return body;
    }

    // ==================== POST /api/v1/finance/balances/bank-accounts ====================

    @Test
    @WithMockUser
    void create_validRequest_returns201() throws Exception {
        UUID id = UUID.randomUUID();
        BankAccountResponseDTO response = buildResponse(id);

        given(bankAccountService.create(any(), anyString())).willReturn(response);

        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(buildValidRequestBody())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.bankName").value("Test Bank"));
    }

    @Test
    @WithMockUser
    void create_missingRequiredFields_returns400() throws Exception {
        Map<String, Object> body = new HashMap<>();
        // bankName, accountNumber, accountHolderName, and currentBalance are missing

        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    // ==================== GET /api/v1/finance/balances/bank-accounts/{id} ====================

    @Test
    @WithMockUser
    void getById_existingId_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        BankAccountResponseDTO response = buildResponse(id);

        given(bankAccountService.getById(id)).willReturn(response);

        mockMvc.perform(get(BASE_URL + "/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.bankName").value("Test Bank"));
    }

    @Test
    @WithMockUser
    void getById_serviceThrows_returns500() throws Exception {
        UUID id = UUID.randomUUID();

        given(bankAccountService.getById(id))
                .willThrow(new RuntimeException("Bank account not found"));

        mockMvc.perform(get(BASE_URL + "/{id}", id))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/finance/balances/bank-accounts ====================

    @Test
    @WithMockUser
    void getAll_returnsListWith200() throws Exception {
        List<BankAccountResponseDTO> list = List.of(
                buildResponse(UUID.randomUUID()),
                buildResponse(UUID.randomUUID())
        );

        given(bankAccountService.getAll()).willReturn(list);

        mockMvc.perform(get(BASE_URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    @WithMockUser
    void getAll_emptyList_returnsEmptyArrayWith200() throws Exception {
        given(bankAccountService.getAll()).willReturn(List.of());

        mockMvc.perform(get(BASE_URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // ==================== GET /api/v1/finance/balances/bank-accounts/active ====================

    @Test
    @WithMockUser
    void getAllActive_returnsActiveListWith200() throws Exception {
        List<BankAccountResponseDTO> active = List.of(buildResponse(UUID.randomUUID()));

        given(bankAccountService.getAllActive()).willReturn(active);

        mockMvc.perform(get(BASE_URL + "/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    // ==================== PUT /api/v1/finance/balances/bank-accounts/{id} ====================

    @Test
    @WithMockUser
    void update_validRequest_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        BankAccountResponseDTO response = buildResponse(id);
        response.setBankName("Updated Bank");

        given(bankAccountService.update(eq(id), any())).willReturn(response);

        mockMvc.perform(put(BASE_URL + "/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(buildValidRequestBody())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()));
    }

    @Test
    @WithMockUser
    void update_missingRequiredFields_returns400() throws Exception {
        UUID id = UUID.randomUUID();
        Map<String, Object> body = new HashMap<>();
        // Missing required fields

        mockMvc.perform(put(BASE_URL + "/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    // ==================== DELETE /api/v1/finance/balances/bank-accounts/{id} ====================

    @Test
    @WithMockUser
    void delete_existingId_returns204() throws Exception {
        UUID id = UUID.randomUUID();

        willDoNothing().given(bankAccountService).delete(id);

        mockMvc.perform(delete(BASE_URL + "/{id}", id))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser
    void delete_serviceThrows_returns500() throws Exception {
        UUID id = UUID.randomUUID();

        willThrow(new RuntimeException("Not found"))
                .given(bankAccountService).delete(id);

        mockMvc.perform(delete(BASE_URL + "/{id}", id))
                .andExpect(status().isInternalServerError());
    }

    // ==================== PATCH /api/v1/finance/balances/bank-accounts/{id}/deactivate ====================

    @Test
    @WithMockUser
    void deactivate_existingId_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        BankAccountResponseDTO response = buildResponse(id);
        response.setIsActive(false);

        given(bankAccountService.deactivate(id)).willReturn(response);

        mockMvc.perform(patch(BASE_URL + "/{id}/deactivate", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.isActive").value(false));
    }

    @Test
    @WithMockUser
    void deactivate_serviceThrows_returns500() throws Exception {
        UUID id = UUID.randomUUID();

        given(bankAccountService.deactivate(id))
                .willThrow(new RuntimeException("Bank account not found"));

        mockMvc.perform(patch(BASE_URL + "/{id}/deactivate", id))
                .andExpect(status().isInternalServerError());
    }

    // ==================== PATCH /api/v1/finance/balances/bank-accounts/{id}/activate ====================

    @Test
    @WithMockUser
    void activate_existingId_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        BankAccountResponseDTO response = buildResponse(id);
        response.setIsActive(true);

        given(bankAccountService.activate(id)).willReturn(response);

        mockMvc.perform(patch(BASE_URL + "/{id}/activate", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.isActive").value(true));
    }

    @Test
    @WithMockUser
    void activate_serviceThrows_returns500() throws Exception {
        UUID id = UUID.randomUUID();

        given(bankAccountService.activate(id))
                .willThrow(new RuntimeException("Bank account not found"));

        mockMvc.perform(patch(BASE_URL + "/{id}/activate", id))
                .andExpect(status().isInternalServerError());
    }
}