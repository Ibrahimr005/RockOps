package com.example.backend.controllers.equipment;

import com.example.backend.config.JwtService;
import com.example.backend.dto.equipment.DailySarkySummaryDTO;
import com.example.backend.dto.equipment.SarkyLogRangeResponseDTO;
import com.example.backend.dto.equipment.SarkyLogResponseDTO;
import com.example.backend.dto.equipment.SarkyValidationInfoDTO;
import com.example.backend.services.equipment.SarkyLogService;
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
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doNothing;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = SarkyLogController.class)
@AutoConfigureMockMvc(addFilters = false)
public class SarkyLogControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SarkyLogService sarkyLogService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    // ==================== GET /api/v1/equipment/{equipmentId}/sarky ====================

    @Test
    @WithMockUser
    public void getSarkyLogsByEquipmentId_shouldReturn200WithList() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        SarkyLogResponseDTO dto = new SarkyLogResponseDTO();
        dto.setId(UUID.randomUUID());
        dto.setEquipmentId(equipmentId);

        given(sarkyLogService.getSarkyLogsByEquipmentId(equipmentId))
                .willReturn(List.of(dto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/equipment/{equipmentId}/sarky", equipmentId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].equipmentId").value(equipmentId.toString()));
    }

    @Test
    @WithMockUser
    public void getSarkyLogsByEquipmentId_emptyList_shouldReturn200() throws Exception {
        UUID equipmentId = UUID.randomUUID();

        given(sarkyLogService.getSarkyLogsByEquipmentId(equipmentId))
                .willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/equipment/{equipmentId}/sarky", equipmentId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/v1/equipment/{equipmentId}/sarky/range ====================

    @Test
    @WithMockUser
    public void getSarkyLogRangesByEquipmentId_shouldReturn200WithList() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        SarkyLogRangeResponseDTO dto = new SarkyLogRangeResponseDTO();
        dto.setId(UUID.randomUUID());
        dto.setEquipmentId(equipmentId);

        given(sarkyLogService.getSarkyLogRangesByEquipmentId(equipmentId))
                .willReturn(List.of(dto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/equipment/{equipmentId}/sarky/range", equipmentId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].equipmentId").value(equipmentId.toString()));
    }

    @Test
    @WithMockUser
    public void getSarkyLogRangesByEquipmentId_emptyList_shouldReturn200() throws Exception {
        UUID equipmentId = UUID.randomUUID();

        given(sarkyLogService.getSarkyLogRangesByEquipmentId(equipmentId))
                .willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/equipment/{equipmentId}/sarky/range", equipmentId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/v1/equipment/{equipmentId}/sarky/latest-date ====================

    @Test
    @WithMockUser
    public void getLatestSarkyDateForEquipment_shouldReturn200WithDateString() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        LocalDate latestDate = LocalDate.of(2024, 5, 20);

        given(sarkyLogService.getLatestSarkyDateForEquipment(equipmentId))
                .willReturn(latestDate);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/equipment/{equipmentId}/sarky/latest-date", equipmentId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    public void getLatestSarkyDateForEquipment_noDate_shouldReturn200WithNull() throws Exception {
        UUID equipmentId = UUID.randomUUID();

        given(sarkyLogService.getLatestSarkyDateForEquipment(equipmentId))
                .willReturn(null);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/equipment/{equipmentId}/sarky/latest-date", equipmentId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    // ==================== GET /api/v1/sarky/{id} ====================

    @Test
    @WithMockUser
    public void getSarkyLogById_shouldReturn200() throws Exception {
        UUID id = UUID.randomUUID();
        SarkyLogResponseDTO dto = new SarkyLogResponseDTO();
        dto.setId(id);

        given(sarkyLogService.getSarkyLogById(id)).willReturn(dto);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/sarky/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()));
    }

    // ==================== GET /api/v1/sarky/range/{id} ====================

    @Test
    @WithMockUser
    public void getSarkyLogRangeById_shouldReturn200() throws Exception {
        UUID id = UUID.randomUUID();
        SarkyLogRangeResponseDTO dto = new SarkyLogRangeResponseDTO();
        dto.setId(id);

        given(sarkyLogService.getSarkyLogRangeById(id)).willReturn(dto);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/sarky/range/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()));
    }

    // ==================== DELETE /api/v1/sarky/{id} ====================

    @Test
    @WithMockUser
    public void deleteSarkyLog_shouldReturn204() throws Exception {
        UUID id = UUID.randomUUID();

        doNothing().when(sarkyLogService).deleteSarkyLog(id);

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/v1/sarky/{id}", id))
                .andExpect(status().isNoContent());
    }

    // ==================== DELETE /api/v1/sarky/range/{id} ====================

    @Test
    @WithMockUser
    public void deleteSarkyLogRange_shouldReturn204() throws Exception {
        UUID id = UUID.randomUUID();

        doNothing().when(sarkyLogService).deleteSarkyLogRange(id);

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/v1/sarky/range/{id}", id))
                .andExpect(status().isNoContent());
    }

    // ==================== GET /api/v1/equipment/{equipmentId}/sarky/date/{date} ====================

    @Test
    @WithMockUser
    public void getSarkyLogsByEquipmentIdAndDate_shouldReturn200WithList() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        String date = "2024-01-15";
        LocalDate localDate = LocalDate.parse(date);

        SarkyLogResponseDTO dto = new SarkyLogResponseDTO();
        dto.setId(UUID.randomUUID());
        dto.setEquipmentId(equipmentId);
        dto.setDate(localDate);

        given(sarkyLogService.getSarkyLogsByEquipmentIdAndDate(equipmentId, localDate))
                .willReturn(List.of(dto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/equipment/{equipmentId}/sarky/date/{date}", equipmentId, date)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].equipmentId").value(equipmentId.toString()));
    }

    @Test
    @WithMockUser
    public void getSarkyLogsByEquipmentIdAndDate_noResults_shouldReturn200EmptyList() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        String date = "2024-01-15";
        LocalDate localDate = LocalDate.parse(date);

        given(sarkyLogService.getSarkyLogsByEquipmentIdAndDate(equipmentId, localDate))
                .willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/equipment/{equipmentId}/sarky/date/{date}", equipmentId, date)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/v1/equipment/{equipmentId}/sarky/daily-summary/{date} ====================

    @Test
    @WithMockUser
    public void getDailySarkySummary_shouldReturn200() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        String date = "2024-01-15";
        LocalDate localDate = LocalDate.parse(date);

        DailySarkySummaryDTO dto = new DailySarkySummaryDTO();
        dto.setEquipmentId(equipmentId);
        dto.setDate(localDate);
        dto.setTotalEntries(3);
        dto.setTotalHours(12.0);

        given(sarkyLogService.getDailySarkySummary(equipmentId, localDate))
                .willReturn(dto);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/equipment/{equipmentId}/sarky/daily-summary/{date}", equipmentId, date)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.equipmentId").value(equipmentId.toString()))
                .andExpect(jsonPath("$.totalEntries").value(3));
    }

    // ==================== GET /api/v1/equipment/{equipmentId}/sarky/existing-dates ====================

    @Test
    @WithMockUser
    public void getExistingSarkyDatesForEquipment_shouldReturn200WithStringList() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        List<LocalDate> dates = List.of(
                LocalDate.of(2024, 1, 10),
                LocalDate.of(2024, 1, 11),
                LocalDate.of(2024, 1, 12)
        );

        given(sarkyLogService.getExistingSarkyDatesForEquipment(equipmentId))
                .willReturn(dates);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/equipment/{equipmentId}/sarky/existing-dates", equipmentId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0]").value("2024-01-10"))
                .andExpect(jsonPath("$[1]").value("2024-01-11"))
                .andExpect(jsonPath("$[2]").value("2024-01-12"));
    }

    @Test
    @WithMockUser
    public void getExistingSarkyDatesForEquipment_noDates_shouldReturn200EmptyList() throws Exception {
        UUID equipmentId = UUID.randomUUID();

        given(sarkyLogService.getExistingSarkyDatesForEquipment(equipmentId))
                .willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/equipment/{equipmentId}/sarky/existing-dates", equipmentId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/v1/equipment/{equipmentId}/sarky/validation-info ====================

    @Test
    @WithMockUser
    public void getSarkyValidationInfo_shouldReturn200() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        SarkyValidationInfoDTO dto = new SarkyValidationInfoDTO();
        dto.setEquipmentId(equipmentId);
        dto.setLatestDate(LocalDate.of(2024, 1, 15));
        dto.setNextAllowedDate(LocalDate.of(2024, 1, 16));
        dto.setCanAddToLatestDate(true);
        dto.setExistingDates(List.of(LocalDate.of(2024, 1, 14), LocalDate.of(2024, 1, 15)));

        given(sarkyLogService.getSarkyValidationInfo(equipmentId))
                .willReturn(dto);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/equipment/{equipmentId}/sarky/validation-info", equipmentId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.equipmentId").value(equipmentId.toString()))
                .andExpect(jsonPath("$.canAddToLatestDate").value(true));
    }

    @Test
    @WithMockUser
    public void getSarkyValidationInfo_noExistingLogs_shouldReturn200() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        SarkyValidationInfoDTO dto = new SarkyValidationInfoDTO();
        dto.setEquipmentId(equipmentId);
        dto.setLatestDate(null);
        dto.setNextAllowedDate(null);
        dto.setCanAddToLatestDate(false);
        dto.setExistingDates(Collections.emptyList());

        given(sarkyLogService.getSarkyValidationInfo(equipmentId))
                .willReturn(dto);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/equipment/{equipmentId}/sarky/validation-info", equipmentId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.equipmentId").value(equipmentId.toString()))
                .andExpect(jsonPath("$.canAddToLatestDate").value(false));
    }
}