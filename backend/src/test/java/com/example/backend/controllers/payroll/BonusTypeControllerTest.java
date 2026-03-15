package com.example.backend.controllers.payroll;

import com.example.backend.config.JwtService;
import com.example.backend.dto.payroll.BonusTypeDTO;
import com.example.backend.services.payroll.BonusTypeService;
import com.fasterxml.jackson.databind.ObjectMapper;
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

import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doNothing;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = BonusTypeController.class)
@AutoConfigureMockMvc(addFilters = false)
public class BonusTypeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private BonusTypeService bonusTypeService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    private BonusTypeDTO sampleBonusType;
    private UUID bonusTypeId;

    @BeforeEach
    void setUp() {
        bonusTypeId = UUID.randomUUID();
        sampleBonusType = BonusTypeDTO.builder()
                .id(bonusTypeId)
                .code("PERF")
                .name("Performance Bonus")
                .description("Awarded for exceptional performance")
                .isActive(true)
                .build();
    }

    // ==================== POST /api/v1/payroll/bonus-types ====================

    @Test
    @WithMockUser
    public void createBonusType_shouldReturn201WithCreatedDto() throws Exception {
        BonusTypeDTO requestDto = BonusTypeDTO.builder()
                .code("PERF")
                .name("Performance Bonus")
                .description("Awarded for exceptional performance")
                .build();

        given(bonusTypeService.create(any(BonusTypeDTO.class), anyString()))
                .willReturn(sampleBonusType);

        mockMvc.perform(post("/api/v1/payroll/bonus-types")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(bonusTypeId.toString()))
                .andExpect(jsonPath("$.code").value("PERF"))
                .andExpect(jsonPath("$.name").value("Performance Bonus"))
                .andExpect(jsonPath("$.isActive").value(true));
    }

    // ==================== GET /api/v1/payroll/bonus-types ====================

    @Test
    @WithMockUser
    public void getAllBonusTypes_shouldReturn200WithList() throws Exception {
        given(bonusTypeService.getAllBonusTypes()).willReturn(List.of(sampleBonusType));

        mockMvc.perform(get("/api/v1/payroll/bonus-types")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value(bonusTypeId.toString()))
                .andExpect(jsonPath("$[0].name").value("Performance Bonus"));
    }

    @Test
    @WithMockUser
    public void getAllBonusTypes_emptyList_shouldReturn200() throws Exception {
        given(bonusTypeService.getAllBonusTypes()).willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/payroll/bonus-types")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/v1/payroll/bonus-types/active ====================

    @Test
    @WithMockUser
    public void getActiveBonusTypes_shouldReturn200WithList() throws Exception {
        given(bonusTypeService.getActiveBonusTypes()).willReturn(List.of(sampleBonusType));

        mockMvc.perform(get("/api/v1/payroll/bonus-types/active")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].isActive").value(true));
    }

    @Test
    @WithMockUser
    public void getActiveBonusTypes_emptyList_shouldReturn200() throws Exception {
        given(bonusTypeService.getActiveBonusTypes()).willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/payroll/bonus-types/active")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/v1/payroll/bonus-types/{id} ====================

    @Test
    @WithMockUser
    public void getBonusTypeById_shouldReturn200WithDto() throws Exception {
        given(bonusTypeService.getById(bonusTypeId)).willReturn(sampleBonusType);

        mockMvc.perform(get("/api/v1/payroll/bonus-types/{id}", bonusTypeId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(bonusTypeId.toString()))
                .andExpect(jsonPath("$.code").value("PERF"))
                .andExpect(jsonPath("$.name").value("Performance Bonus"));
    }

    @Test
    @WithMockUser
    public void getBonusTypeById_notFound_shouldReturn404() throws Exception {
        UUID unknownId = UUID.randomUUID();
        given(bonusTypeService.getById(unknownId))
                .willThrow(new RuntimeException("Bonus type not found"));

        mockMvc.perform(get("/api/v1/payroll/bonus-types/{id}", unknownId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().is5xxServerError());
    }

    // ==================== PUT /api/v1/payroll/bonus-types/{id} ====================

    @Test
    @WithMockUser
    public void updateBonusType_shouldReturn200WithUpdatedDto() throws Exception {
        BonusTypeDTO updateRequest = BonusTypeDTO.builder()
                .code("PERF")
                .name("Updated Performance Bonus")
                .description("Updated description")
                .build();

        BonusTypeDTO updatedDto = BonusTypeDTO.builder()
                .id(bonusTypeId)
                .code("PERF")
                .name("Updated Performance Bonus")
                .description("Updated description")
                .isActive(true)
                .build();

        given(bonusTypeService.update(eq(bonusTypeId), any(BonusTypeDTO.class), anyString()))
                .willReturn(updatedDto);

        mockMvc.perform(put("/api/v1/payroll/bonus-types/{id}", bonusTypeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(bonusTypeId.toString()))
                .andExpect(jsonPath("$.name").value("Updated Performance Bonus"));
    }

    // ==================== DELETE /api/v1/payroll/bonus-types/{id} ====================

    @Test
    @WithMockUser
    public void deactivateBonusType_shouldReturn204() throws Exception {
        doNothing().when(bonusTypeService).deactivate(eq(bonusTypeId), anyString());

        mockMvc.perform(delete("/api/v1/payroll/bonus-types/{id}", bonusTypeId))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser
    public void deactivateBonusType_notFound_shouldReturn5xx() throws Exception {
        UUID unknownId = UUID.randomUUID();
        org.mockito.Mockito.doThrow(new RuntimeException("Not found"))
                .when(bonusTypeService).deactivate(eq(unknownId), anyString());

        mockMvc.perform(delete("/api/v1/payroll/bonus-types/{id}", unknownId))
                .andExpect(status().is5xxServerError());
    }
}