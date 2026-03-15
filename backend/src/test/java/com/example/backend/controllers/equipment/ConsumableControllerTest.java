package com.example.backend.controllers.equipment;

import com.example.backend.dto.equipment.ConsumableResolutionDTO;
import com.example.backend.models.equipment.Consumable;
import com.example.backend.models.equipment.ConsumableResolution;
import com.example.backend.models.warehouse.ResolutionType;
import com.example.backend.services.equipment.ConsumablesService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ConsumableController.class)
@AutoConfigureMockMvc(addFilters = false)
public class ConsumableControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ConsumablesService consumablesService;

    // -----------------------------------------------------------------------
    // POST /api/v1/consumables/resolve-discrepancy
    // -----------------------------------------------------------------------

    @Test
    @WithMockUser
    void resolveDiscrepancy_returns200WithResolution() throws Exception {
        ConsumableResolution resolution = new ConsumableResolution();
        given(consumablesService.resolveDiscrepancy(any(ConsumableResolutionDTO.class)))
                .willReturn(resolution);

        ConsumableResolutionDTO request = new ConsumableResolutionDTO();
        request.setConsumableId(UUID.randomUUID());
        request.setResolutionType(ResolutionType.ACKNOWLEDGE_LOSS);
        request.setNotes("Acknowledged loss after audit");
        request.setResolvedBy("user@example.com");

        mockMvc.perform(post("/api/v1/consumables/resolve-discrepancy")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void resolveDiscrepancy_whenIllegalArgument_returns400() throws Exception {
        given(consumablesService.resolveDiscrepancy(any(ConsumableResolutionDTO.class)))
                .willThrow(new IllegalArgumentException("Consumable not found"));

        ConsumableResolutionDTO request = new ConsumableResolutionDTO();
        request.setConsumableId(UUID.randomUUID());
        request.setResolutionType(ResolutionType.COUNTING_ERROR);
        request.setNotes("Invalid consumable");
        request.setResolvedBy("user@example.com");

        mockMvc.perform(post("/api/v1/consumables/resolve-discrepancy")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void resolveDiscrepancy_whenUnexpectedException_returns500() throws Exception {
        given(consumablesService.resolveDiscrepancy(any(ConsumableResolutionDTO.class)))
                .willThrow(new RuntimeException("Database failure"));

        ConsumableResolutionDTO request = new ConsumableResolutionDTO();
        request.setConsumableId(UUID.randomUUID());
        request.setResolutionType(ResolutionType.RETURN_TO_SENDER);
        request.setNotes("Returning surplus items");
        request.setResolvedBy("user@example.com");

        mockMvc.perform(post("/api/v1/consumables/resolve-discrepancy")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isInternalServerError());
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/consumables/resolution-history/equipment/{equipmentId}
    // -----------------------------------------------------------------------

    @Test
    @WithMockUser
    void getResolutionHistory_returns200WithList() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        ConsumableResolution resolution = new ConsumableResolution();
        given(consumablesService.getEquipmentResolutionHistory(equipmentId))
                .willReturn(List.of(resolution));

        mockMvc.perform(get("/api/v1/consumables/resolution-history/equipment/{equipmentId}", equipmentId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    void getResolutionHistory_whenEmptyHistory_returns200EmptyList() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        given(consumablesService.getEquipmentResolutionHistory(equipmentId))
                .willReturn(List.of());

        mockMvc.perform(get("/api/v1/consumables/resolution-history/equipment/{equipmentId}", equipmentId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    void getResolutionHistory_whenServiceThrows_returns500() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        given(consumablesService.getEquipmentResolutionHistory(equipmentId))
                .willThrow(new RuntimeException("Unexpected error"));

        mockMvc.perform(get("/api/v1/consumables/resolution-history/equipment/{equipmentId}", equipmentId))
                .andExpect(status().isInternalServerError());
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/consumables/equipment/{equipmentId}/discrepancies
    // -----------------------------------------------------------------------

    @Test
    @WithMockUser
    void getDiscrepancyConsumables_returns200WithList() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        Consumable consumable = new Consumable();
        given(consumablesService.getDiscrepancyConsumables(equipmentId))
                .willReturn(List.of(consumable));

        mockMvc.perform(get("/api/v1/consumables/equipment/{equipmentId}/discrepancies", equipmentId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    void getDiscrepancyConsumables_whenNoneExist_returns200EmptyList() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        given(consumablesService.getDiscrepancyConsumables(equipmentId))
                .willReturn(List.of());

        mockMvc.perform(get("/api/v1/consumables/equipment/{equipmentId}/discrepancies", equipmentId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    void getDiscrepancyConsumables_whenServiceThrows_returns500() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        given(consumablesService.getDiscrepancyConsumables(equipmentId))
                .willThrow(new RuntimeException("Service error"));

        mockMvc.perform(get("/api/v1/consumables/equipment/{equipmentId}/discrepancies", equipmentId))
                .andExpect(status().isInternalServerError());
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/consumables/equipment/{equipmentId}/resolved
    // -----------------------------------------------------------------------

    @Test
    @WithMockUser
    void getResolvedConsumables_returns200WithList() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        Consumable consumable = new Consumable();
        given(consumablesService.getResolvedConsumables(equipmentId))
                .willReturn(List.of(consumable));

        mockMvc.perform(get("/api/v1/consumables/equipment/{equipmentId}/resolved", equipmentId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    void getResolvedConsumables_whenNoneExist_returns200EmptyList() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        given(consumablesService.getResolvedConsumables(equipmentId))
                .willReturn(List.of());

        mockMvc.perform(get("/api/v1/consumables/equipment/{equipmentId}/resolved", equipmentId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    void getResolvedConsumables_whenServiceThrows_returns500() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        given(consumablesService.getResolvedConsumables(equipmentId))
                .willThrow(new RuntimeException("Service error"));

        mockMvc.perform(get("/api/v1/consumables/equipment/{equipmentId}/resolved", equipmentId))
                .andExpect(status().isInternalServerError());
    }
}