package com.example.backend.controllers.payroll;

import com.example.backend.config.JwtService;
import com.example.backend.dto.payroll.DeductionTypeDTO;
import com.example.backend.models.payroll.DeductionType;
import com.example.backend.services.payroll.DeductionTypeService;
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

@WebMvcTest(controllers = DeductionTypeController.class)
@AutoConfigureMockMvc(addFilters = false)
public class DeductionTypeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DeductionTypeService deductionTypeService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    private UUID deductionTypeId;
    private UUID siteId;
    private DeductionTypeDTO sampleDeductionType;

    @BeforeEach
    void setUp() {
        objectMapper.registerModule(new JavaTimeModule());

        deductionTypeId = UUID.randomUUID();
        siteId = UUID.randomUUID();

        sampleDeductionType = DeductionTypeDTO.builder()
                .id(deductionTypeId)
                .code("TAX")
                .name("Income Tax")
                .description("Statutory income tax deduction")
                .category(DeductionType.DeductionCategory.STATUTORY)
                .categoryDisplayName("Statutory")
                .isSystemDefined(true)
                .isActive(true)
                .isTaxable(false)
                .showOnPayslip(true)
                .siteId(siteId)
                .siteName("Main Site")
                .build();
    }

    // ==================== GET /api/v1/payroll/deduction-types ====================

    @Test
    @WithMockUser
    public void getAllDeductionTypes_shouldReturn200WithList() throws Exception {
        given(deductionTypeService.getAllActiveDeductionTypes()).willReturn(List.of(sampleDeductionType));

        mockMvc.perform(get("/api/v1/payroll/deduction-types")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value(deductionTypeId.toString()))
                .andExpect(jsonPath("$[0].code").value("TAX"))
                .andExpect(jsonPath("$[0].name").value("Income Tax"));
    }

    @Test
    @WithMockUser
    public void getAllDeductionTypes_emptyList_shouldReturn200() throws Exception {
        given(deductionTypeService.getAllActiveDeductionTypes()).willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/payroll/deduction-types")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/v1/payroll/deduction-types/site/{siteId} ====================

    @Test
    @WithMockUser
    public void getDeductionTypesForSite_shouldReturn200WithList() throws Exception {
        given(deductionTypeService.getDeductionTypesForSite(siteId)).willReturn(List.of(sampleDeductionType));

        mockMvc.perform(get("/api/v1/payroll/deduction-types/site/{siteId}", siteId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].siteId").value(siteId.toString()));
    }

    @Test
    @WithMockUser
    public void getDeductionTypesForSite_emptyList_shouldReturn200() throws Exception {
        given(deductionTypeService.getDeductionTypesForSite(siteId)).willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/payroll/deduction-types/site/{siteId}", siteId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/v1/payroll/deduction-types/{id} ====================

    @Test
    @WithMockUser
    public void getDeductionTypeById_shouldReturn200WithDto() throws Exception {
        given(deductionTypeService.getById(deductionTypeId)).willReturn(sampleDeductionType);

        mockMvc.perform(get("/api/v1/payroll/deduction-types/{id}", deductionTypeId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(deductionTypeId.toString()))
                .andExpect(jsonPath("$.code").value("TAX"))
                .andExpect(jsonPath("$.isActive").value(true));
    }

    @Test
    @WithMockUser
    public void getDeductionTypeById_notFound_shouldReturn5xx() throws Exception {
        UUID unknownId = UUID.randomUUID();
        given(deductionTypeService.getById(unknownId))
                .willThrow(new RuntimeException("Deduction type not found"));

        mockMvc.perform(get("/api/v1/payroll/deduction-types/{id}", unknownId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().is5xxServerError());
    }

    // ==================== GET /api/v1/payroll/deduction-types/category/{category} ====================

    @Test
    @WithMockUser
    public void getByCategory_shouldReturn200WithList() throws Exception {
        given(deductionTypeService.getByCategory(DeductionType.DeductionCategory.STATUTORY))
                .willReturn(List.of(sampleDeductionType));

        mockMvc.perform(get("/api/v1/payroll/deduction-types/category/{category}", "STATUTORY")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].code").value("TAX"));
    }

    @Test
    @WithMockUser
    public void getByCategory_emptyList_shouldReturn200() throws Exception {
        given(deductionTypeService.getByCategory(DeductionType.DeductionCategory.BENEFITS))
                .willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/payroll/deduction-types/category/{category}", "BENEFITS")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/v1/payroll/deduction-types/categories ====================

    @Test
    @WithMockUser
    public void getCategories_shouldReturn200WithCategoryList() throws Exception {
        // No service mock needed — controller builds categories from the enum directly
        mockMvc.perform(get("/api/v1/payroll/deduction-types/categories")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].code").isNotEmpty())
                .andExpect(jsonPath("$[0].displayName").isNotEmpty());
    }

    // ==================== POST /api/v1/payroll/deduction-types ====================

    @Test
    @WithMockUser
    public void createDeductionType_shouldReturn201WithCreatedDto() throws Exception {
        DeductionTypeDTO requestDto = DeductionTypeDTO.builder()
                .code("INS")
                .name("Health Insurance")
                .description("Employee health insurance premium")
                .category(DeductionType.DeductionCategory.BENEFITS)
                .build();

        DeductionTypeDTO createdDto = DeductionTypeDTO.builder()
                .id(UUID.randomUUID())
                .code("INS")
                .name("Health Insurance")
                .description("Employee health insurance premium")
                .category(DeductionType.DeductionCategory.BENEFITS)
                .isActive(true)
                .build();

        given(deductionTypeService.create(any(DeductionTypeDTO.class), anyString()))
                .willReturn(createdDto);

        mockMvc.perform(post("/api/v1/payroll/deduction-types")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("INS"))
                .andExpect(jsonPath("$.name").value("Health Insurance"))
                .andExpect(jsonPath("$.isActive").value(true));
    }

    // ==================== PUT /api/v1/payroll/deduction-types/{id} ====================

    @Test
    @WithMockUser
    public void updateDeductionType_shouldReturn200WithUpdatedDto() throws Exception {
        DeductionTypeDTO updateRequest = DeductionTypeDTO.builder()
                .code("TAX")
                .name("Updated Income Tax")
                .category(DeductionType.DeductionCategory.STATUTORY)
                .build();

        DeductionTypeDTO updatedDto = DeductionTypeDTO.builder()
                .id(deductionTypeId)
                .code("TAX")
                .name("Updated Income Tax")
                .category(DeductionType.DeductionCategory.STATUTORY)
                .isActive(true)
                .build();

        given(deductionTypeService.update(eq(deductionTypeId), any(DeductionTypeDTO.class), anyString()))
                .willReturn(updatedDto);

        mockMvc.perform(put("/api/v1/payroll/deduction-types/{id}", deductionTypeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(deductionTypeId.toString()))
                .andExpect(jsonPath("$.name").value("Updated Income Tax"));
    }

    // ==================== DELETE /api/v1/payroll/deduction-types/{id} ====================

    @Test
    @WithMockUser
    public void deactivateDeductionType_shouldReturn204() throws Exception {
        doNothing().when(deductionTypeService).deactivate(eq(deductionTypeId), anyString());

        mockMvc.perform(delete("/api/v1/payroll/deduction-types/{id}", deductionTypeId))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser
    public void deactivateDeductionType_notFound_shouldReturn5xx() throws Exception {
        UUID unknownId = UUID.randomUUID();
        org.mockito.Mockito.doThrow(new RuntimeException("Not found"))
                .when(deductionTypeService).deactivate(eq(unknownId), anyString());

        mockMvc.perform(delete("/api/v1/payroll/deduction-types/{id}", unknownId))
                .andExpect(status().is5xxServerError());
    }

    // ==================== POST /api/v1/payroll/deduction-types/{id}/reactivate ====================

    @Test
    @WithMockUser
    public void reactivateDeductionType_shouldReturn200() throws Exception {
        doNothing().when(deductionTypeService).reactivate(eq(deductionTypeId), anyString());

        mockMvc.perform(post("/api/v1/payroll/deduction-types/{id}/reactivate", deductionTypeId))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    public void reactivateDeductionType_notFound_shouldReturn5xx() throws Exception {
        UUID unknownId = UUID.randomUUID();
        org.mockito.Mockito.doThrow(new RuntimeException("Not found"))
                .when(deductionTypeService).reactivate(eq(unknownId), anyString());

        mockMvc.perform(post("/api/v1/payroll/deduction-types/{id}/reactivate", unknownId))
                .andExpect(status().is5xxServerError());
    }

    // ==================== POST /api/v1/payroll/deduction-types/initialize-system-types ====================

    @Test
    @WithMockUser
    public void initializeSystemTypes_shouldReturn200WithMessage() throws Exception {
        doNothing().when(deductionTypeService).initializeSystemDeductionTypes();

        mockMvc.perform(post("/api/v1/payroll/deduction-types/initialize-system-types"))
                .andExpect(status().isOk())
                .andExpect(content().string("System deduction types initialized successfully"));
    }
}