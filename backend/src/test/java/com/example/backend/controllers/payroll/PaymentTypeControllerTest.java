package com.example.backend.controllers.payroll;

import com.example.backend.config.JwtService;
import com.example.backend.dto.payroll.PaymentTypeDTO;
import com.example.backend.services.payroll.PaymentTypeService;
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

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = PaymentTypeController.class)
@AutoConfigureMockMvc(addFilters = false)
public class PaymentTypeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PaymentTypeService paymentTypeService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    private UUID paymentTypeId;
    private PaymentTypeDTO samplePaymentType;

    @BeforeEach
    void setUp() {
        objectMapper.registerModule(new JavaTimeModule());

        paymentTypeId = UUID.randomUUID();

        samplePaymentType = PaymentTypeDTO.builder()
                .id(paymentTypeId)
                .code("BANK_TRANSFER")
                .name("Bank Transfer")
                .description("Direct bank transfer to employee account")
                .isActive(true)
                .requiresBankDetails(true)
                .requiresWalletDetails(false)
                .displayOrder(1)
                .createdAt(LocalDateTime.of(2026, 1, 1, 0, 0))
                .createdBy("admin")
                .build();
    }

    // ===================================================
    // GET ALL ACTIVE
    // ===================================================

    @Test
    @WithMockUser
    void getAllActive_returnsOk() throws Exception {
        given(paymentTypeService.getAllActive()).willReturn(List.of(samplePaymentType));

        mockMvc.perform(get("/api/v1/payment-types"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].code").value("BANK_TRANSFER"));
    }

    @Test
    @WithMockUser
    void getAllActive_emptyList_returnsOk() throws Exception {
        given(paymentTypeService.getAllActive()).willReturn(List.of());

        mockMvc.perform(get("/api/v1/payment-types"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ===================================================
    // GET ALL (ADMIN VIEW)
    // ===================================================

    @Test
    @WithMockUser
    void getAll_returnsOk() throws Exception {
        given(paymentTypeService.getAll()).willReturn(List.of(samplePaymentType));

        mockMvc.perform(get("/api/v1/payment-types/all"))
                .andExpect(status().isOk());
    }

    // ===================================================
    // GET BY ID
    // ===================================================

    @Test
    @WithMockUser
    void getById_exists_returnsOk() throws Exception {
        given(paymentTypeService.getById(paymentTypeId)).willReturn(samplePaymentType);

        mockMvc.perform(get("/api/v1/payment-types/{id}", paymentTypeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(paymentTypeId.toString()))
                .andExpect(jsonPath("$.name").value("Bank Transfer"));
    }

    // ===================================================
    // GET BY CODE
    // ===================================================

    @Test
    @WithMockUser
    void getByCode_exists_returnsOk() throws Exception {
        given(paymentTypeService.getByCode("BANK_TRANSFER")).willReturn(samplePaymentType);

        mockMvc.perform(get("/api/v1/payment-types/code/{code}", "BANK_TRANSFER"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("BANK_TRANSFER"));
    }

    // ===================================================
    // CREATE
    // ===================================================

    @Test
    @WithMockUser
    void create_validRequest_returnsOk() throws Exception {
        PaymentTypeDTO input = PaymentTypeDTO.builder()
                .code("CASH")
                .name("Cash")
                .description("Cash payment")
                .isActive(true)
                .build();

        PaymentTypeDTO created = PaymentTypeDTO.builder()
                .id(UUID.randomUUID())
                .code("CASH")
                .name("Cash")
                .isActive(true)
                .build();

        given(paymentTypeService.create(any(PaymentTypeDTO.class), anyString())).willReturn(created);

        mockMvc.perform(post("/api/v1/payment-types")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(input)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("CASH"));
    }

    // ===================================================
    // UPDATE
    // ===================================================

    @Test
    @WithMockUser
    void update_validRequest_returnsOk() throws Exception {
        PaymentTypeDTO updated = PaymentTypeDTO.builder()
                .id(paymentTypeId)
                .code("BANK_TRANSFER")
                .name("Bank Transfer Updated")
                .isActive(true)
                .build();

        given(paymentTypeService.update(eq(paymentTypeId), any(PaymentTypeDTO.class), anyString()))
                .willReturn(updated);

        mockMvc.perform(put("/api/v1/payment-types/{id}", paymentTypeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(samplePaymentType)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Bank Transfer Updated"));
    }

    // ===================================================
    // DEACTIVATE
    // ===================================================

    @Test
    @WithMockUser
    void deactivate_returnsOk() throws Exception {
        willDoNothing().given(paymentTypeService).deactivate(eq(paymentTypeId), anyString());

        mockMvc.perform(post("/api/v1/payment-types/{id}/deactivate", paymentTypeId))
                .andExpect(status().isOk());
    }

    // ===================================================
    // ACTIVATE
    // ===================================================

    @Test
    @WithMockUser
    void activate_returnsOk() throws Exception {
        willDoNothing().given(paymentTypeService).activate(eq(paymentTypeId), anyString());

        mockMvc.perform(post("/api/v1/payment-types/{id}/activate", paymentTypeId))
                .andExpect(status().isOk());
    }
}