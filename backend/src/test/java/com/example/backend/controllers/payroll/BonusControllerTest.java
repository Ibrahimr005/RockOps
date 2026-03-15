package com.example.backend.controllers.payroll;

import com.example.backend.config.JwtService;
import com.example.backend.dto.payroll.BonusResponseDTO;
import com.example.backend.dto.payroll.BulkCreateBonusDTO;
import com.example.backend.dto.payroll.CreateBonusDTO;
import com.example.backend.services.payroll.BonusService;
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
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = BonusController.class)
@AutoConfigureMockMvc(addFilters = false)
public class BonusControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private BonusService bonusService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    private UUID bonusId;
    private UUID employeeId;
    private UUID bonusTypeId;
    private UUID siteId;
    private BonusResponseDTO sampleBonusResponse;

    @BeforeEach
    void setUp() {
        objectMapper.registerModule(new JavaTimeModule());

        bonusId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        bonusTypeId = UUID.randomUUID();
        siteId = UUID.randomUUID();

        sampleBonusResponse = BonusResponseDTO.builder()
                .id(bonusId)
                .bonusNumber("BON-2026-00001")
                .employeeId(employeeId)
                .employeeName("John Doe")
                .bonusTypeId(bonusTypeId)
                .bonusTypeName("Performance Bonus")
                .bonusTypeCode("PERF")
                .amount(new BigDecimal("1000.00"))
                .effectiveMonth(3)
                .effectiveYear(2026)
                .status("PENDING_HR_APPROVAL")
                .statusDisplayName("Pending HR Approval")
                .reason("Outstanding performance")
                .siteId(siteId)
                .createdBy("hr_manager")
                .createdAt(LocalDateTime.now())
                .build();
    }

    // ==================== POST /api/v1/payroll/bonuses ====================

    @Test
    @WithMockUser
    public void createBonus_shouldReturn201WithBonusResponse() throws Exception {
        CreateBonusDTO requestDto = CreateBonusDTO.builder()
                .employeeId(employeeId)
                .bonusTypeId(bonusTypeId)
                .amount(new BigDecimal("1000.00"))
                .effectiveMonth(3)
                .effectiveYear(2026)
                .reason("Outstanding performance")
                .build();

        given(bonusService.createBonus(any(CreateBonusDTO.class), anyString()))
                .willReturn(sampleBonusResponse);

        mockMvc.perform(post("/api/v1/payroll/bonuses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(bonusId.toString()))
                .andExpect(jsonPath("$.bonusNumber").value("BON-2026-00001"))
                .andExpect(jsonPath("$.employeeName").value("John Doe"))
                .andExpect(jsonPath("$.status").value("PENDING_HR_APPROVAL"));
    }

    // ==================== POST /api/v1/payroll/bonuses/bulk ====================

    @Test
    @WithMockUser
    public void createBulkBonus_shouldReturn201WithList() throws Exception {
        UUID emp2 = UUID.randomUUID();
        BulkCreateBonusDTO requestDto = BulkCreateBonusDTO.builder()
                .employeeIds(List.of(employeeId, emp2))
                .bonusTypeId(bonusTypeId)
                .amount(new BigDecimal("500.00"))
                .effectiveMonth(3)
                .effectiveYear(2026)
                .reason("Team achievement bonus")
                .build();

        BonusResponseDTO secondBonus = BonusResponseDTO.builder()
                .id(UUID.randomUUID())
                .bonusNumber("BON-2026-00002")
                .employeeId(emp2)
                .employeeName("Jane Smith")
                .amount(new BigDecimal("500.00"))
                .status("PENDING_HR_APPROVAL")
                .build();

        given(bonusService.createBulkBonus(any(BulkCreateBonusDTO.class), anyString()))
                .willReturn(List.of(sampleBonusResponse, secondBonus));

        mockMvc.perform(post("/api/v1/payroll/bonuses/bulk")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].bonusNumber").value("BON-2026-00001"))
                .andExpect(jsonPath("$[1].bonusNumber").value("BON-2026-00002"));
    }

    // ==================== GET /api/v1/payroll/bonuses ====================

    @Test
    @WithMockUser
    public void getAllBonuses_bySite_shouldReturn200WithList() throws Exception {
        given(bonusService.getAllBonuses(siteId)).willReturn(List.of(sampleBonusResponse));

        mockMvc.perform(get("/api/v1/payroll/bonuses")
                        .param("siteId", siteId.toString())
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value(bonusId.toString()));
    }

    @Test
    @WithMockUser
    public void getAllBonuses_byEmployee_shouldDelegateToGetByEmployee() throws Exception {
        given(bonusService.getBonusesByEmployee(employeeId)).willReturn(List.of(sampleBonusResponse));

        mockMvc.perform(get("/api/v1/payroll/bonuses")
                        .param("siteId", siteId.toString())
                        .param("employeeId", employeeId.toString())
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].employeeId").value(employeeId.toString()));
    }

    @Test
    @WithMockUser
    public void getAllBonuses_byMonthAndYear_shouldDelegateToGetForPayroll() throws Exception {
        given(bonusService.getBonusesForPayroll(3, 2026, siteId)).willReturn(List.of(sampleBonusResponse));

        mockMvc.perform(get("/api/v1/payroll/bonuses")
                        .param("siteId", siteId.toString())
                        .param("month", "3")
                        .param("year", "2026")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].effectiveMonth").value(3))
                .andExpect(jsonPath("$[0].effectiveYear").value(2026));
    }

    @Test
    @WithMockUser
    public void getAllBonuses_emptyList_shouldReturn200() throws Exception {
        given(bonusService.getAllBonuses(siteId)).willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/payroll/bonuses")
                        .param("siteId", siteId.toString())
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/v1/payroll/bonuses/{id} ====================

    @Test
    @WithMockUser
    public void getBonusById_shouldReturn200WithBonus() throws Exception {
        given(bonusService.getBonusById(bonusId)).willReturn(sampleBonusResponse);

        mockMvc.perform(get("/api/v1/payroll/bonuses/{id}", bonusId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(bonusId.toString()))
                .andExpect(jsonPath("$.bonusNumber").value("BON-2026-00001"));
    }

    @Test
    @WithMockUser
    public void getBonusById_notFound_shouldReturn5xx() throws Exception {
        UUID unknownId = UUID.randomUUID();
        given(bonusService.getBonusById(unknownId))
                .willThrow(new RuntimeException("Bonus not found"));

        mockMvc.perform(get("/api/v1/payroll/bonuses/{id}", unknownId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().is5xxServerError());
    }

    // ==================== GET /api/v1/payroll/bonuses/employee/{employeeId} ====================

    @Test
    @WithMockUser
    public void getBonusesByEmployee_shouldReturn200WithList() throws Exception {
        given(bonusService.getBonusesByEmployee(employeeId)).willReturn(List.of(sampleBonusResponse));

        mockMvc.perform(get("/api/v1/payroll/bonuses/employee/{employeeId}", employeeId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].employeeId").value(employeeId.toString()));
    }

    @Test
    @WithMockUser
    public void getBonusesByEmployee_emptyList_shouldReturn200() throws Exception {
        given(bonusService.getBonusesByEmployee(employeeId)).willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/payroll/bonuses/employee/{employeeId}", employeeId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== POST /api/v1/payroll/bonuses/{id}/approve ====================

    @Test
    @WithMockUser
    public void hrApproveBonus_shouldReturn200WithUpdatedBonus() throws Exception {
        BonusResponseDTO approvedBonus = BonusResponseDTO.builder()
                .id(bonusId)
                .bonusNumber("BON-2026-00001")
                .status("HR_APPROVED")
                .hrApprovedBy("hr_manager")
                .hrApprovedAt(LocalDateTime.now())
                .build();

        given(bonusService.hrApproveBonus(eq(bonusId), anyString())).willReturn(approvedBonus);

        mockMvc.perform(post("/api/v1/payroll/bonuses/{id}/approve", bonusId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(bonusId.toString()))
                .andExpect(jsonPath("$.status").value("HR_APPROVED"));
    }

    @Test
    @WithMockUser
    public void hrApproveBonus_notFound_shouldReturn5xx() throws Exception {
        UUID unknownId = UUID.randomUUID();
        given(bonusService.hrApproveBonus(eq(unknownId), anyString()))
                .willThrow(new RuntimeException("Bonus not found"));

        mockMvc.perform(post("/api/v1/payroll/bonuses/{id}/approve", unknownId))
                .andExpect(status().is5xxServerError());
    }

    // ==================== POST /api/v1/payroll/bonuses/{id}/reject ====================

    @Test
    @WithMockUser
    public void hrRejectBonus_shouldReturn200WithRejectedBonus() throws Exception {
        BonusResponseDTO rejectedBonus = BonusResponseDTO.builder()
                .id(bonusId)
                .bonusNumber("BON-2026-00001")
                .status("HR_REJECTED")
                .hrRejectedBy("hr_manager")
                .hrRejectionReason("Duplicate submission")
                .build();

        given(bonusService.hrRejectBonus(eq(bonusId), anyString(), anyString()))
                .willReturn(rejectedBonus);

        Map<String, String> body = Map.of("reason", "Duplicate submission");

        mockMvc.perform(post("/api/v1/payroll/bonuses/{id}/reject", bonusId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("HR_REJECTED"))
                .andExpect(jsonPath("$.hrRejectionReason").value("Duplicate submission"));
    }

    // ==================== POST /api/v1/payroll/bonuses/{id}/cancel ====================

    @Test
    @WithMockUser
    public void cancelBonus_shouldReturn200WithCancelledBonus() throws Exception {
        BonusResponseDTO cancelledBonus = BonusResponseDTO.builder()
                .id(bonusId)
                .bonusNumber("BON-2026-00001")
                .status("CANCELLED")
                .build();

        given(bonusService.cancelBonus(bonusId)).willReturn(cancelledBonus);

        mockMvc.perform(post("/api/v1/payroll/bonuses/{id}/cancel", bonusId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(bonusId.toString()))
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    @Test
    @WithMockUser
    public void cancelBonus_notFound_shouldReturn5xx() throws Exception {
        UUID unknownId = UUID.randomUUID();
        given(bonusService.cancelBonus(unknownId))
                .willThrow(new RuntimeException("Bonus not found"));

        mockMvc.perform(post("/api/v1/payroll/bonuses/{id}/cancel", unknownId))
                .andExpect(status().is5xxServerError());
    }

    // ==================== GET /api/v1/payroll/bonuses/statistics ====================

    @Test
    @WithMockUser
    public void getStatistics_shouldReturn200WithStatsMap() throws Exception {
        Map<String, Object> stats = Map.of(
                "totalBonuses", 10,
                "totalAmount", new BigDecimal("15000.00"),
                "pendingApproval", 3
        );

        given(bonusService.getStatistics(siteId)).willReturn(stats);

        mockMvc.perform(get("/api/v1/payroll/bonuses/statistics")
                        .param("siteId", siteId.toString())
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalBonuses").value(10))
                .andExpect(jsonPath("$.pendingApproval").value(3));
    }

    @Test
    @WithMockUser
    public void getStatistics_emptyMap_shouldReturn200() throws Exception {
        given(bonusService.getStatistics(siteId)).willReturn(Collections.emptyMap());

        mockMvc.perform(get("/api/v1/payroll/bonuses/statistics")
                        .param("siteId", siteId.toString())
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isMap());
    }
}