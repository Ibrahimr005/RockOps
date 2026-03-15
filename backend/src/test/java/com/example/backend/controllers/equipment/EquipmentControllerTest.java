package com.example.backend.controllers.equipment;

import com.example.backend.config.JwtService;
import com.example.backend.dto.equipment.ConsumableDetailDTO;
import com.example.backend.dto.equipment.EquipmentDTO;
import com.example.backend.dto.equipment.EquipmentSarkyAnalyticsDTO;
import com.example.backend.dto.equipment.WorkTypeDTO;
import com.example.backend.dto.hr.employee.EmployeeSummaryDTO;
import com.example.backend.services.equipment.ConsumablesService;
import com.example.backend.services.equipment.EquipmentService;
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

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doNothing;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = EquipmentController.class)
@AutoConfigureMockMvc(addFilters = false)
public class EquipmentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private EquipmentService equipmentService;

    @MockBean
    private ConsumablesService consumablesService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    // ==================== GET /api/equipment ====================

    @Test
    @WithMockUser
    public void getAllEquipment_shouldReturn200WithList() throws Exception {
        EquipmentDTO dto = new EquipmentDTO();
        dto.setId(UUID.randomUUID());
        dto.setName("Excavator 01");

        given(equipmentService.getAllEquipment()).willReturn(List.of(dto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/equipment")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].name").value("Excavator 01"));
    }

    @Test
    @WithMockUser
    public void getAllEquipment_emptyList_shouldReturn200() throws Exception {
        given(equipmentService.getAllEquipment()).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/equipment")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/equipment/status-options ====================

    @Test
    @WithMockUser
    public void getEquipmentStatusOptions_shouldReturn200WithList() throws Exception {
        // No service mock needed - controller builds list from enum directly
        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/equipment/status-options")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    // ==================== GET /api/equipment/{id} ====================

    @Test
    @WithMockUser
    public void getEquipmentById_shouldReturn200() throws Exception {
        UUID id = UUID.randomUUID();
        EquipmentDTO dto = new EquipmentDTO();
        dto.setId(id);
        dto.setName("Bulldozer B1");

        given(equipmentService.getEquipmentById(id)).willReturn(dto);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/equipment/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.name").value("Bulldozer B1"));
    }

    // ==================== GET /api/equipment/type/{typeId} ====================

    @Test
    @WithMockUser
    public void getEquipmentByType_shouldReturn200WithList() throws Exception {
        UUID typeId = UUID.randomUUID();
        EquipmentDTO dto = new EquipmentDTO();
        dto.setId(UUID.randomUUID());
        dto.setTypeId(typeId);
        dto.setName("Crane C1");

        given(equipmentService.getEquipmentByType(typeId)).willReturn(List.of(dto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/equipment/type/{typeId}", typeId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].typeId").value(typeId.toString()));
    }

    @Test
    @WithMockUser
    public void getEquipmentByType_noEquipment_shouldReturn200EmptyList() throws Exception {
        UUID typeId = UUID.randomUUID();

        given(equipmentService.getEquipmentByType(typeId)).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/equipment/type/{typeId}", typeId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/equipment/{equipmentId}/consumables ====================

    @Test
    @WithMockUser
    public void getEquipmentConsumables_shouldReturn200WithList() throws Exception {
        UUID equipmentId = UUID.randomUUID();

        // consumablesService returns an empty list (no real Consumable entities needed)
        given(consumablesService.getConsumablesByEquipmentId(equipmentId))
                .willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/equipment/{equipmentId}/consumables", equipmentId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== DELETE /api/equipment/{id} ====================

    @Test
    @WithMockUser
    public void deleteEquipment_shouldReturn204() throws Exception {
        UUID id = UUID.randomUUID();

        doNothing().when(equipmentService).deleteEquipment(id);

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/equipment/{id}", id))
                .andExpect(status().isNoContent());
    }

    // ==================== GET /api/equipment/type/{typeId}/eligible-drivers ====================

    @Test
    @WithMockUser
    public void getEligibleDriversForEquipmentType_shouldReturn200WithList() throws Exception {
        UUID typeId = UUID.randomUUID();
        EmployeeSummaryDTO driverDto = new EmployeeSummaryDTO();
        driverDto.setId(UUID.randomUUID());
        driverDto.setFullName("John Doe");

        given(equipmentService.getEligibleDriversForEquipmentType(typeId))
                .willReturn(List.of(driverDto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/equipment/type/{typeId}/eligible-drivers", typeId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].fullName").value("John Doe"));
    }

    @Test
    @WithMockUser
    public void getEligibleDriversForEquipmentType_noDrivers_shouldReturn200EmptyList() throws Exception {
        UUID typeId = UUID.randomUUID();

        given(equipmentService.getEligibleDriversForEquipmentType(typeId))
                .willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/equipment/type/{typeId}/eligible-drivers", typeId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/equipment/type/{typeId}/sarky-drivers ====================

    @Test
    @WithMockUser
    public void getDriversForSarkyByEquipmentType_shouldReturn200WithList() throws Exception {
        UUID typeId = UUID.randomUUID();
        EmployeeSummaryDTO driverDto = new EmployeeSummaryDTO();
        driverDto.setId(UUID.randomUUID());
        driverDto.setFullName("Jane Smith");

        given(equipmentService.getDriversForSarkyByEquipmentType(typeId))
                .willReturn(List.of(driverDto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/equipment/type/{typeId}/sarky-drivers", typeId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].fullName").value("Jane Smith"));
    }

    @Test
    @WithMockUser
    public void getDriversForSarkyByEquipmentType_noDrivers_shouldReturn200EmptyList() throws Exception {
        UUID typeId = UUID.randomUUID();

        given(equipmentService.getDriversForSarkyByEquipmentType(typeId))
                .willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/equipment/type/{typeId}/sarky-drivers", typeId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/equipment/{equipmentId}/drivers ====================

    @Test
    @WithMockUser
    public void getEquipmentDrivers_withMainDriver_shouldReturn200WithDriverList() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        UUID mainDriverId = UUID.randomUUID();

        EquipmentDTO equipmentDTO = new EquipmentDTO();
        equipmentDTO.setId(equipmentId);
        equipmentDTO.setName("Loader L1");
        equipmentDTO.setModel("CAT 950");
        equipmentDTO.setMainDriverId(mainDriverId);
        equipmentDTO.setMainDriverName("Ahmad Ali");

        given(equipmentService.getEquipmentById(equipmentId)).willReturn(equipmentDTO);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/equipment/{equipmentId}/drivers", equipmentId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.equipmentId").value(equipmentId.toString()))
                .andExpect(jsonPath("$.equipmentName").value("Loader L1"))
                .andExpect(jsonPath("$.drivers").isArray())
                .andExpect(jsonPath("$.driverCount").value(1));
    }

    @Test
    @WithMockUser
    public void getEquipmentDrivers_noDrivers_shouldReturn200WithEmptyDriverList() throws Exception {
        UUID equipmentId = UUID.randomUUID();

        EquipmentDTO equipmentDTO = new EquipmentDTO();
        equipmentDTO.setId(equipmentId);
        equipmentDTO.setName("Dumper D1");
        equipmentDTO.setModel("Komatsu HD785");
        // mainDriverId and subDriverId remain null

        given(equipmentService.getEquipmentById(equipmentId)).willReturn(equipmentDTO);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/equipment/{equipmentId}/drivers", equipmentId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.driverCount").value(0))
                .andExpect(jsonPath("$.drivers").isArray())
                .andExpect(jsonPath("$.drivers").isEmpty());
    }

    // ==================== PATCH /api/equipment/status/{id} ====================

    @Test
    @WithMockUser
    public void updateEquipmentStatus_shouldReturn200() throws Exception {
        UUID id = UUID.randomUUID();

        EquipmentDTO updatedDto = new EquipmentDTO();
        updatedDto.setId(id);
        updatedDto.setName("Grader G1");

        given(equipmentService.updateEquipmentStatus(any(UUID.class), anyMap()))
                .willReturn(updatedDto);

        Map<String, Object> requestBody = Map.of("status", "AVAILABLE");

        mockMvc.perform(MockMvcRequestBuilders
                        .patch("/api/equipment/status/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()));
    }

    // ==================== POST /api/equipment - error scenarios ====================

    @Test
    @WithMockUser
    public void addEquipment_whenIllegalArgumentException_shouldReturn400() throws Exception {
        given(equipmentService.createEquipment(anyMap(), isNull()))
                .willThrow(new IllegalArgumentException("Serial number must be unique"));

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/api/equipment")
                        .param("name", "Bad Equipment"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("Serial number must be unique"));
    }

    @Test
    @WithMockUser
    public void addEquipment_whenRuntimeException_shouldReturn500() throws Exception {
        given(equipmentService.createEquipment(anyMap(), isNull()))
                .willThrow(new RuntimeException("Unexpected failure"));

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/api/equipment")
                        .param("name", "Bad Equipment"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Internal Server Error"));
    }
}