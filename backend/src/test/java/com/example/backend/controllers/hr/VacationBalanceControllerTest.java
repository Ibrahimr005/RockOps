package com.example.backend.controllers.hr;

import com.example.backend.config.JwtService;
import com.example.backend.dto.hr.leave.VacationBalanceResponseDTO;
import com.example.backend.services.hr.VacationBalanceService;
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
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = VacationBalanceController.class)
@AutoConfigureMockMvc(addFilters = false)
public class VacationBalanceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private VacationBalanceService vacationBalanceService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    private UUID employeeId;
    private VacationBalanceResponseDTO sampleBalance;

    @BeforeEach
    void setUp() {
        objectMapper.registerModule(new JavaTimeModule());
        employeeId = UUID.randomUUID();
        sampleBalance = new VacationBalanceResponseDTO();
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/vacation-balance
    // -----------------------------------------------------------------------

    @Test
    void getAllVacationBalances_noYear_returns200() throws Exception {
        given(vacationBalanceService.getAllVacationBalances(null))
                .willReturn(List.of(sampleBalance));

        mockMvc.perform(get("/api/v1/vacation-balance"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.count").value(1))
                .andExpect(jsonPath("$.year").value("current"));
    }

    @Test
    void getAllVacationBalances_withYear_returns200() throws Exception {
        given(vacationBalanceService.getAllVacationBalances(2026))
                .willReturn(List.of(sampleBalance, sampleBalance));

        mockMvc.perform(get("/api/v1/vacation-balance")
                        .param("year", "2026"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.count").value(2))
                .andExpect(jsonPath("$.year").value(2026));
    }

    @Test
    void getAllVacationBalances_emptyList_returns200() throws Exception {
        given(vacationBalanceService.getAllVacationBalances(null)).willReturn(List.of());

        mockMvc.perform(get("/api/v1/vacation-balance"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.count").value(0));
    }

    @Test
    void getAllVacationBalances_serviceThrows_returns500() throws Exception {
        given(vacationBalanceService.getAllVacationBalances(any()))
                .willThrow(new RuntimeException("DB error"));

        mockMvc.perform(get("/api/v1/vacation-balance"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false));
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/vacation-balance/{employeeId}
    // -----------------------------------------------------------------------

    @Test
    void getVacationBalance_happyPath_returns200() throws Exception {
        given(vacationBalanceService.getVacationBalance(employeeId)).willReturn(sampleBalance);

        mockMvc.perform(get("/api/v1/vacation-balance/{employeeId}", employeeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").exists());
    }

    @Test
    void getVacationBalance_notFound_returns404() throws Exception {
        given(vacationBalanceService.getVacationBalance(employeeId))
                .willThrow(new RuntimeException("Vacation balance not found for employee"));

        mockMvc.perform(get("/api/v1/vacation-balance/{employeeId}", employeeId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    // -----------------------------------------------------------------------
    // POST /api/v1/vacation-balance/initialize/{year}
    // -----------------------------------------------------------------------

    @Test
    void initializeYearlyBalances_happyPath_returns200() throws Exception {
        willDoNothing().given(vacationBalanceService).initializeYearlyBalances(2026);

        mockMvc.perform(post("/api/v1/vacation-balance/initialize/{year}", 2026))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Vacation balances initialized successfully for year 2026"));
    }

    @Test
    void initializeYearlyBalances_serviceThrows_returns500() throws Exception {
        willThrow(new RuntimeException("Year already initialized"))
                .given(vacationBalanceService).initializeYearlyBalances(2026);

        mockMvc.perform(post("/api/v1/vacation-balance/initialize/{year}", 2026))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false));
    }

    // -----------------------------------------------------------------------
    // POST /api/v1/vacation-balance/carry-forward
    // -----------------------------------------------------------------------

    @Test
    void carryForwardBalances_happyPath_returns200() throws Exception {
        willDoNothing().given(vacationBalanceService).carryForwardBalances(2025, 2026, 5);

        mockMvc.perform(post("/api/v1/vacation-balance/carry-forward")
                        .param("fromYear", "2025")
                        .param("toYear", "2026"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value(
                        "Vacation balances carried forward from 2025 to 2026 (max 5 days)"));
    }

    @Test
    void carryForwardBalances_customMaxDays_returns200() throws Exception {
        willDoNothing().given(vacationBalanceService).carryForwardBalances(2025, 2026, 10);

        mockMvc.perform(post("/api/v1/vacation-balance/carry-forward")
                        .param("fromYear", "2025")
                        .param("toYear", "2026")
                        .param("maxCarryForward", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value(
                        "Vacation balances carried forward from 2025 to 2026 (max 10 days)"));
    }

    @Test
    void carryForwardBalances_serviceThrows_returns500() throws Exception {
        willThrow(new RuntimeException("Target year not initialized"))
                .given(vacationBalanceService).carryForwardBalances(anyInt(), anyInt(), anyInt());

        mockMvc.perform(post("/api/v1/vacation-balance/carry-forward")
                        .param("fromYear", "2025")
                        .param("toYear", "2026"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void carryForwardBalances_missingRequiredParam_returns400() throws Exception {
        // fromYear is required
        mockMvc.perform(post("/api/v1/vacation-balance/carry-forward")
                        .param("toYear", "2026"))
                .andExpect(status().isBadRequest());
    }

    // -----------------------------------------------------------------------
    // POST /api/v1/vacation-balance/{employeeId}/bonus
    // Note: the controller reads requestBody.get("year") as a nested map,
    // so we pass the body as { "year": { "year": 2026, "bonusDays": 3, "reason": "..." } }
    // -----------------------------------------------------------------------

    @Test
    void awardBonusDays_happyPath_returns200() throws Exception {
        // The controller does: Map data = (Map) requestBody.get("year")
        // then reads data.get("year"), data.get("bonusDays"), data.get("reason")
        Map<String, Object> innerData = Map.of("year", 2026, "bonusDays", 3, "reason", "Outstanding performance");
        Map<String, Object> body = Map.of("year", innerData);

        willDoNothing().given(vacationBalanceService).awardBonusDays(eq(employeeId), eq(2026), eq(3), anyString());

        mockMvc.perform(post("/api/v1/vacation-balance/{employeeId}/bonus", employeeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Awarded 3 bonus days to employee for: Outstanding performance"));
    }

    @Test
    void awardBonusDays_missingFields_returns400() throws Exception {
        // Pass inner data without "reason" so validation fails
        Map<String, Object> innerData = Map.of("year", 2026, "bonusDays", 3);
        Map<String, Object> body = Map.of("year", innerData);

        mockMvc.perform(post("/api/v1/vacation-balance/{employeeId}/bonus", employeeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("Year, bonusDays, and reason are required"));
    }

    @Test
    void awardBonusDays_zeroBonusDays_returns400() throws Exception {
        Map<String, Object> innerData = Map.of("year", 2026, "bonusDays", 0, "reason", "Test");
        Map<String, Object> body = Map.of("year", innerData);

        mockMvc.perform(post("/api/v1/vacation-balance/{employeeId}/bonus", employeeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("Bonus days must be between 1 and 30"));
    }

    @Test
    void awardBonusDays_tooManyBonusDays_returns400() throws Exception {
        Map<String, Object> innerData = Map.of("year", 2026, "bonusDays", 31, "reason", "Test");
        Map<String, Object> body = Map.of("year", innerData);

        mockMvc.perform(post("/api/v1/vacation-balance/{employeeId}/bonus", employeeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("Bonus days must be between 1 and 30"));
    }

    @Test
    void awardBonusDays_serviceThrows_returns400() throws Exception {
        Map<String, Object> innerData = Map.of("year", 2026, "bonusDays", 5, "reason", "Special award");
        Map<String, Object> body = Map.of("year", innerData);

        willThrow(new RuntimeException("Balance record not found"))
                .given(vacationBalanceService).awardBonusDays(eq(employeeId), anyInt(), anyInt(), anyString());

        mockMvc.perform(post("/api/v1/vacation-balance/{employeeId}/bonus", employeeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/vacation-balance/low-balance
    // -----------------------------------------------------------------------

    @Test
    void getEmployeesWithLowBalance_defaultThreshold_returns200() throws Exception {
        given(vacationBalanceService.getEmployeesWithLowBalance(null, 5))
                .willReturn(List.of(sampleBalance));

        mockMvc.perform(get("/api/v1/vacation-balance/low-balance"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.count").value(1))
                .andExpect(jsonPath("$.threshold").value(5));
    }

    @Test
    void getEmployeesWithLowBalance_withYearAndCustomThreshold_returns200() throws Exception {
        given(vacationBalanceService.getEmployeesWithLowBalance(2026, 3))
                .willReturn(List.of());

        mockMvc.perform(get("/api/v1/vacation-balance/low-balance")
                        .param("year", "2026")
                        .param("threshold", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.count").value(0))
                .andExpect(jsonPath("$.threshold").value(3));
    }

    @Test
    void getEmployeesWithLowBalance_serviceThrows_returns500() throws Exception {
        given(vacationBalanceService.getEmployeesWithLowBalance(any(), anyInt()))
                .willThrow(new RuntimeException("Query failed"));

        mockMvc.perform(get("/api/v1/vacation-balance/low-balance"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false));
    }
}