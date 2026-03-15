package com.example.backend.controllers.finance.balances;

import com.example.backend.config.JwtService;
import com.example.backend.dto.finance.balances.CashSafeResponseDTO;
import com.example.backend.services.finance.balances.CashSafeService;
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

@WebMvcTest(controllers = CashSafeController.class)
@AutoConfigureMockMvc(addFilters = false)
public class CashSafeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private CashSafeService cashSafeService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String BASE_URL = "/api/v1/finance/balances/cash-safes";

    private CashSafeResponseDTO buildResponse(UUID id) {
        return CashSafeResponseDTO.builder()
                .id(id)
                .safeName("Main Safe")
                .location("Warehouse A")
                .currentBalance(BigDecimal.valueOf(10000))
                .isActive(true)
                .build();
    }

    private Map<String, Object> buildValidRequestBody() {
        Map<String, Object> body = new HashMap<>();
        body.put("safeName", "Main Safe");
        body.put("location", "Warehouse A");
        body.put("currentBalance", 10000.00);
        return body;
    }

    // ==================== POST /api/v1/finance/balances/cash-safes ====================

    @Test
    @WithMockUser
    void create_validRequest_returns201() throws Exception {
        UUID id = UUID.randomUUID();
        CashSafeResponseDTO response = buildResponse(id);

        given(cashSafeService.create(any(), anyString())).willReturn(response);

        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(buildValidRequestBody())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.safeName").value("Main Safe"));
    }

    @Test
    @WithMockUser
    void create_missingRequiredFields_returns400() throws Exception {
        Map<String, Object> body = new HashMap<>();
        // safeName, location, and currentBalance are missing

        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void create_serviceThrows_returns500() throws Exception {
        given(cashSafeService.create(any(), anyString()))
                .willThrow(new RuntimeException("Unexpected error"));

        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(buildValidRequestBody())))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/finance/balances/cash-safes/{id} ====================

    @Test
    @WithMockUser
    void getById_existingId_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        CashSafeResponseDTO response = buildResponse(id);

        given(cashSafeService.getById(id)).willReturn(response);

        mockMvc.perform(get(BASE_URL + "/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.safeName").value("Main Safe"))
                .andExpect(jsonPath("$.location").value("Warehouse A"));
    }

    @Test
    @WithMockUser
    void getById_serviceThrows_returns500() throws Exception {
        UUID id = UUID.randomUUID();

        given(cashSafeService.getById(id))
                .willThrow(new RuntimeException("Cash safe not found"));

        mockMvc.perform(get(BASE_URL + "/{id}", id))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/finance/balances/cash-safes ====================

    @Test
    @WithMockUser
    void getAll_returnsListWith200() throws Exception {
        List<CashSafeResponseDTO> list = List.of(
                buildResponse(UUID.randomUUID()),
                buildResponse(UUID.randomUUID())
        );

        given(cashSafeService.getAll()).willReturn(list);

        mockMvc.perform(get(BASE_URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    @WithMockUser
    void getAll_emptyList_returnsEmptyArrayWith200() throws Exception {
        given(cashSafeService.getAll()).willReturn(List.of());

        mockMvc.perform(get(BASE_URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // ==================== GET /api/v1/finance/balances/cash-safes/active ====================

    @Test
    @WithMockUser
    void getAllActive_returnsActiveListWith200() throws Exception {
        List<CashSafeResponseDTO> active = List.of(buildResponse(UUID.randomUUID()));

        given(cashSafeService.getAllActive()).willReturn(active);

        mockMvc.perform(get(BASE_URL + "/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    // ==================== PUT /api/v1/finance/balances/cash-safes/{id} ====================

    @Test
    @WithMockUser
    void update_validRequest_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        CashSafeResponseDTO response = buildResponse(id);

        given(cashSafeService.update(eq(id), any())).willReturn(response);

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
        // Missing required safeName, location, currentBalance

        mockMvc.perform(put(BASE_URL + "/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void update_serviceThrows_returns500() throws Exception {
        UUID id = UUID.randomUUID();

        given(cashSafeService.update(eq(id), any()))
                .willThrow(new RuntimeException("Cash safe not found"));

        mockMvc.perform(put(BASE_URL + "/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(buildValidRequestBody())))
                .andExpect(status().isInternalServerError());
    }

    // ==================== DELETE /api/v1/finance/balances/cash-safes/{id} ====================

    @Test
    @WithMockUser
    void delete_existingId_returns204() throws Exception {
        UUID id = UUID.randomUUID();

        willDoNothing().given(cashSafeService).delete(id);

        mockMvc.perform(delete(BASE_URL + "/{id}", id))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser
    void delete_serviceThrows_returns500() throws Exception {
        UUID id = UUID.randomUUID();

        willThrow(new RuntimeException("Cash safe not found"))
                .given(cashSafeService).delete(id);

        mockMvc.perform(delete(BASE_URL + "/{id}", id))
                .andExpect(status().isInternalServerError());
    }

    // ==================== PATCH /api/v1/finance/balances/cash-safes/{id}/deactivate ====================

    @Test
    @WithMockUser
    void deactivate_existingId_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        CashSafeResponseDTO response = buildResponse(id);
        response.setIsActive(false);

        given(cashSafeService.deactivate(id)).willReturn(response);

        mockMvc.perform(patch(BASE_URL + "/{id}/deactivate", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.isActive").value(false));
    }

    @Test
    @WithMockUser
    void deactivate_serviceThrows_returns500() throws Exception {
        UUID id = UUID.randomUUID();

        given(cashSafeService.deactivate(id))
                .willThrow(new RuntimeException("Cash safe not found"));

        mockMvc.perform(patch(BASE_URL + "/{id}/deactivate", id))
                .andExpect(status().isInternalServerError());
    }

    // ==================== PATCH /api/v1/finance/balances/cash-safes/{id}/activate ====================

    @Test
    @WithMockUser
    void activate_existingId_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        CashSafeResponseDTO response = buildResponse(id);
        response.setIsActive(true);

        given(cashSafeService.activate(id)).willReturn(response);

        mockMvc.perform(patch(BASE_URL + "/{id}/activate", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.isActive").value(true));
    }

    @Test
    @WithMockUser
    void activate_serviceThrows_returns500() throws Exception {
        UUID id = UUID.randomUUID();

        given(cashSafeService.activate(id))
                .willThrow(new RuntimeException("Cash safe not found"));

        mockMvc.perform(patch(BASE_URL + "/{id}/activate", id))
                .andExpect(status().isInternalServerError());
    }
}