package com.example.backend.controllers.payroll;

import com.example.backend.config.JwtService;
import com.example.backend.dto.payroll.EmployeeDeductionDTO;
import com.example.backend.models.payroll.DeductionType;
import com.example.backend.models.payroll.EmployeeDeduction;
import com.example.backend.services.payroll.EmployeeDeductionService;
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
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doNothing;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = EmployeeDeductionController.class)
@AutoConfigureMockMvc(addFilters = false)
public class EmployeeDeductionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private EmployeeDeductionService employeeDeductionService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    private UUID deductionId;
    private UUID employeeId;
    private UUID deductionTypeId;
    private EmployeeDeductionDTO sampleDeductionDto;

    @BeforeEach
    void setUp() {
        objectMapper.registerModule(new JavaTimeModule());

        deductionId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        deductionTypeId = UUID.randomUUID();

        sampleDeductionDto = EmployeeDeductionDTO.builder()
                .id(deductionId)
                .deductionNumber("TAX-000001")
                .employeeId(employeeId)
                .employeeName("John Doe")
                .employeeNumber("EMP-2026-00001")
                .deductionTypeId(deductionTypeId)
                .deductionTypeName("Income Tax")
                .deductionTypeCode("TAX")
                .deductionCategory(DeductionType.DeductionCategory.STATUTORY)
                .categoryDisplayName("Statutory")
                .amount(new BigDecimal("500.00"))
                .calculationMethod(EmployeeDeduction.CalculationMethod.FIXED_AMOUNT)
                .calculationMethodDisplayName("Fixed Amount")
                .frequency(EmployeeDeduction.DeductionFrequency.MONTHLY)
                .frequencyDisplayName("Monthly")
                .effectiveStartDate(LocalDate.of(2026, 1, 1))
                .isActive(true)
                .totalDeducted(new BigDecimal("1000.00"))
                .deductionCount(2)
                .priority(100)
                .createdBy("hr_manager")
                .createdAt(LocalDateTime.now())
                .build();
    }

    // ==================== GET /api/v1/payroll/employee-deductions/employee/{employeeId} ====================

    @Test
    @WithMockUser
    public void getDeductionsByEmployee_shouldReturn200WithList() throws Exception {
        given(employeeDeductionService.getDeductionsByEmployee(employeeId))
                .willReturn(List.of(sampleDeductionDto));

        mockMvc.perform(get("/api/v1/payroll/employee-deductions/employee/{employeeId}", employeeId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value(deductionId.toString()))
                .andExpect(jsonPath("$[0].deductionNumber").value("TAX-000001"))
                .andExpect(jsonPath("$[0].employeeId").value(employeeId.toString()));
    }

    @Test
    @WithMockUser
    public void getDeductionsByEmployee_emptyList_shouldReturn200() throws Exception {
        given(employeeDeductionService.getDeductionsByEmployee(employeeId))
                .willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/payroll/employee-deductions/employee/{employeeId}", employeeId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/v1/payroll/employee-deductions/employee/{employeeId}/active ====================

    @Test
    @WithMockUser
    public void getActiveDeductionsByEmployee_shouldReturn200WithList() throws Exception {
        given(employeeDeductionService.getActiveDeductionsByEmployee(employeeId))
                .willReturn(List.of(sampleDeductionDto));

        mockMvc.perform(get("/api/v1/payroll/employee-deductions/employee/{employeeId}/active", employeeId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].isActive").value(true));
    }

    @Test
    @WithMockUser
    public void getActiveDeductionsByEmployee_emptyList_shouldReturn200() throws Exception {
        given(employeeDeductionService.getActiveDeductionsByEmployee(employeeId))
                .willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/payroll/employee-deductions/employee/{employeeId}/active", employeeId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/v1/payroll/employee-deductions/{id} ====================

    @Test
    @WithMockUser
    public void getDeductionById_shouldReturn200WithDto() throws Exception {
        given(employeeDeductionService.getById(deductionId)).willReturn(sampleDeductionDto);

        mockMvc.perform(get("/api/v1/payroll/employee-deductions/{id}", deductionId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(deductionId.toString()))
                .andExpect(jsonPath("$.deductionNumber").value("TAX-000001"))
                .andExpect(jsonPath("$.calculationMethod").value("FIXED_AMOUNT"));
    }

    @Test
    @WithMockUser
    public void getDeductionById_notFound_shouldReturn5xx() throws Exception {
        UUID unknownId = UUID.randomUUID();
        given(employeeDeductionService.getById(unknownId))
                .willThrow(new RuntimeException("Deduction not found"));

        mockMvc.perform(get("/api/v1/payroll/employee-deductions/{id}", unknownId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().is5xxServerError());
    }

    // ==================== GET /api/v1/payroll/employee-deductions/employee/{employeeId}/period ====================

    @Test
    @WithMockUser
    public void getDeductionsForPayrollPeriod_shouldReturn200WithList() throws Exception {
        LocalDate start = LocalDate.of(2026, 3, 1);
        LocalDate end = LocalDate.of(2026, 3, 31);

        given(employeeDeductionService.getDeductionsForPayrollPeriod(employeeId, start, end))
                .willReturn(List.of(sampleDeductionDto));

        mockMvc.perform(get("/api/v1/payroll/employee-deductions/employee/{employeeId}/period", employeeId)
                        .param("startDate", "2026-03-01")
                        .param("endDate", "2026-03-31")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value(deductionId.toString()));
    }

    @Test
    @WithMockUser
    public void getDeductionsForPayrollPeriod_emptyList_shouldReturn200() throws Exception {
        LocalDate start = LocalDate.of(2026, 3, 1);
        LocalDate end = LocalDate.of(2026, 3, 31);

        given(employeeDeductionService.getDeductionsForPayrollPeriod(employeeId, start, end))
                .willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/payroll/employee-deductions/employee/{employeeId}/period", employeeId)
                        .param("startDate", "2026-03-01")
                        .param("endDate", "2026-03-31")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== POST /api/v1/payroll/employee-deductions ====================

    @Test
    @WithMockUser
    public void createDeduction_shouldReturn201WithCreatedDto() throws Exception {
        EmployeeDeductionDTO requestDto = EmployeeDeductionDTO.builder()
                .employeeId(employeeId)
                .deductionTypeId(deductionTypeId)
                .amount(new BigDecimal("500.00"))
                .calculationMethod(EmployeeDeduction.CalculationMethod.FIXED_AMOUNT)
                .frequency(EmployeeDeduction.DeductionFrequency.MONTHLY)
                .effectiveStartDate(LocalDate.of(2026, 1, 1))
                .build();

        given(employeeDeductionService.create(any(EmployeeDeductionDTO.class), anyString()))
                .willReturn(sampleDeductionDto);

        mockMvc.perform(post("/api/v1/payroll/employee-deductions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(deductionId.toString()))
                .andExpect(jsonPath("$.deductionNumber").value("TAX-000001"))
                .andExpect(jsonPath("$.frequency").value("MONTHLY"));
    }

    // ==================== PUT /api/v1/payroll/employee-deductions/{id} ====================

    @Test
    @WithMockUser
    public void updateDeduction_shouldReturn200WithUpdatedDto() throws Exception {
        EmployeeDeductionDTO updateRequest = EmployeeDeductionDTO.builder()
                .employeeId(employeeId)
                .deductionTypeId(deductionTypeId)
                .amount(new BigDecimal("600.00"))
                .calculationMethod(EmployeeDeduction.CalculationMethod.FIXED_AMOUNT)
                .frequency(EmployeeDeduction.DeductionFrequency.MONTHLY)
                .effectiveStartDate(LocalDate.of(2026, 1, 1))
                .build();

        EmployeeDeductionDTO updatedDto = EmployeeDeductionDTO.builder()
                .id(deductionId)
                .deductionNumber("TAX-000001")
                .employeeId(employeeId)
                .amount(new BigDecimal("600.00"))
                .calculationMethod(EmployeeDeduction.CalculationMethod.FIXED_AMOUNT)
                .frequency(EmployeeDeduction.DeductionFrequency.MONTHLY)
                .effectiveStartDate(LocalDate.of(2026, 1, 1))
                .isActive(true)
                .build();

        given(employeeDeductionService.update(eq(deductionId), any(EmployeeDeductionDTO.class), anyString()))
                .willReturn(updatedDto);

        mockMvc.perform(put("/api/v1/payroll/employee-deductions/{id}", deductionId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(deductionId.toString()));
    }

    // ==================== DELETE /api/v1/payroll/employee-deductions/{id} ====================

    @Test
    @WithMockUser
    public void deactivateDeduction_shouldReturn204() throws Exception {
        doNothing().when(employeeDeductionService).deactivate(eq(deductionId), anyString());

        mockMvc.perform(delete("/api/v1/payroll/employee-deductions/{id}", deductionId))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser
    public void deactivateDeduction_notFound_shouldReturn5xx() throws Exception {
        UUID unknownId = UUID.randomUUID();
        org.mockito.Mockito.doThrow(new RuntimeException("Not found"))
                .when(employeeDeductionService).deactivate(eq(unknownId), anyString());

        mockMvc.perform(delete("/api/v1/payroll/employee-deductions/{id}", unknownId))
                .andExpect(status().is5xxServerError());
    }

    // ==================== POST /api/v1/payroll/employee-deductions/{id}/reactivate ====================

    @Test
    @WithMockUser
    public void reactivateDeduction_shouldReturn200() throws Exception {
        doNothing().when(employeeDeductionService).reactivate(eq(deductionId), anyString());

        mockMvc.perform(post("/api/v1/payroll/employee-deductions/{id}/reactivate", deductionId))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    public void reactivateDeduction_notFound_shouldReturn5xx() throws Exception {
        UUID unknownId = UUID.randomUUID();
        org.mockito.Mockito.doThrow(new RuntimeException("Not found"))
                .when(employeeDeductionService).reactivate(eq(unknownId), anyString());

        mockMvc.perform(post("/api/v1/payroll/employee-deductions/{id}/reactivate", unknownId))
                .andExpect(status().is5xxServerError());
    }

    // ==================== DELETE /api/v1/payroll/employee-deductions/{id}/permanent ====================

    @Test
    @WithMockUser
    public void deleteDeduction_permanent_shouldReturn204() throws Exception {
        doNothing().when(employeeDeductionService).delete(deductionId);

        mockMvc.perform(delete("/api/v1/payroll/employee-deductions/{id}/permanent", deductionId))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser
    public void deleteDeduction_permanent_notFound_shouldReturn5xx() throws Exception {
        UUID unknownId = UUID.randomUUID();
        org.mockito.Mockito.doThrow(new RuntimeException("Not found"))
                .when(employeeDeductionService).delete(unknownId);

        mockMvc.perform(delete("/api/v1/payroll/employee-deductions/{id}/permanent", unknownId))
                .andExpect(status().is5xxServerError());
    }

    // ==================== GET /api/v1/payroll/employee-deductions/calculation-methods ====================

    @Test
    @WithMockUser
    public void getCalculationMethods_shouldReturn200WithMethodList() throws Exception {
        // No service mock needed — controller builds the list directly from the enum
        mockMvc.perform(get("/api/v1/payroll/employee-deductions/calculation-methods")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].code").isNotEmpty())
                .andExpect(jsonPath("$[0].displayName").isNotEmpty());
    }

    // ==================== GET /api/v1/payroll/employee-deductions/frequencies ====================

    @Test
    @WithMockUser
    public void getFrequencies_shouldReturn200WithFrequencyList() throws Exception {
        // No service mock needed — controller builds the list directly from the enum
        mockMvc.perform(get("/api/v1/payroll/employee-deductions/frequencies")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].code").isNotEmpty())
                .andExpect(jsonPath("$[0].displayName").isNotEmpty());
    }

    // ==================== POST /api/v1/payroll/employee-deductions/calculate-preview ====================

    @Test
    @WithMockUser
    public void calculateDeductionsPreview_shouldReturn200WithCalculatedList() throws Exception {
        EmployeeDeductionService.CalculatedDeduction calculatedDeduction =
                new EmployeeDeductionService.CalculatedDeduction(
                        deductionId,
                        "TAX-000001",
                        "Income Tax",
                        DeductionType.DeductionCategory.STATUTORY,
                        new BigDecimal("500.00"),
                        EmployeeDeduction.CalculationMethod.FIXED_AMOUNT,
                        null,
                        null
                );

        given(employeeDeductionService.calculateDeductionsForPayroll(
                eq(employeeId),
                any(LocalDate.class),
                any(LocalDate.class),
                any(BigDecimal.class),
                any(BigDecimal.class)
        )).willReturn(List.of(calculatedDeduction));

        Map<String, Object> requestBody = Map.of(
                "employeeId", employeeId.toString(),
                "periodStart", "2026-03-01",
                "periodEnd", "2026-03-31",
                "grossSalary", "5000.00",
                "basicSalary", "4000.00"
        );

        mockMvc.perform(post("/api/v1/payroll/employee-deductions/calculate-preview")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    public void calculateDeductionsPreview_emptyResult_shouldReturn200() throws Exception {
        given(employeeDeductionService.calculateDeductionsForPayroll(
                any(UUID.class),
                any(LocalDate.class),
                any(LocalDate.class),
                any(BigDecimal.class),
                any(BigDecimal.class)
        )).willReturn(Collections.emptyList());

        Map<String, Object> requestBody = Map.of(
                "employeeId", employeeId.toString(),
                "periodStart", "2026-03-01",
                "periodEnd", "2026-03-31",
                "grossSalary", "5000.00",
                "basicSalary", "4000.00"
        );

        mockMvc.perform(post("/api/v1/payroll/employee-deductions/calculate-preview")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }
}