package com.example.backend.controllers.equipment;

import com.example.backend.config.JwtService;
import com.example.backend.dto.equipment.EquipmentTypeDTO;
import com.example.backend.dto.equipment.WorkTypeDTO;
import com.example.backend.services.equipment.EquipmentTypeService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.SecurityFilterAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = EquipmentTypeController.class,
        excludeAutoConfiguration = {SecurityAutoConfiguration.class, SecurityFilterAutoConfiguration.class}
)
@AutoConfigureMockMvc(addFilters = false)
public class EquipmentTypeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private EquipmentTypeService equipmentTypeService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    // --- Helpers ---

    private EquipmentTypeDTO buildEquipmentTypeDTO(UUID id, String name) {
        EquipmentTypeDTO dto = new EquipmentTypeDTO();
        dto.setId(id);
        dto.setName(name);
        dto.setDescription("Test description");
        dto.setDrivable(true);
        return dto;
    }

    private WorkTypeDTO buildWorkTypeDTO(UUID id, String name) {
        WorkTypeDTO dto = new WorkTypeDTO();
        dto.setId(id);
        dto.setName(name);
        dto.setDescription("Work type description");
        dto.setActive(true);
        return dto;
    }

    // --- GET /api/equipment-types ---

    @Test
    @WithMockUser
    void getAllEquipmentTypes_returns200WithList() throws Exception {
        UUID id = UUID.randomUUID();
        List<EquipmentTypeDTO> types = Arrays.asList(
                buildEquipmentTypeDTO(id, "Excavator"),
                buildEquipmentTypeDTO(UUID.randomUUID(), "Crane")
        );
        given(equipmentTypeService.getAllEquipmentTypes()).willReturn(types);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/equipment-types")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("Excavator"));
    }

    @Test
    @WithMockUser
    void getAllEquipmentTypes_returnsEmptyList_when_noTypes() throws Exception {
        given(equipmentTypeService.getAllEquipmentTypes()).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders.get("/api/equipment-types")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // --- GET /api/equipment-types/{id} ---

    @Test
    @WithMockUser
    void getEquipmentTypeById_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        EquipmentTypeDTO dto = buildEquipmentTypeDTO(id, "Bulldozer");
        given(equipmentTypeService.getEquipmentTypeById(id)).willReturn(dto);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/equipment-types/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.name").value("Bulldozer"));
    }

    @Test
    @WithMockUser
    void getEquipmentTypeById_returns500_whenServiceThrows() throws Exception {
        UUID id = UUID.randomUUID();
        given(equipmentTypeService.getEquipmentTypeById(id))
                .willThrow(new RuntimeException("Equipment type not found with id: " + id));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/equipment-types/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().is5xxServerError());
    }

    // --- GET /api/equipment-types/name/{name} ---

    @Test
    @WithMockUser
    void getEquipmentTypeByName_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        EquipmentTypeDTO dto = buildEquipmentTypeDTO(id, "Loader");
        given(equipmentTypeService.getEquipmentTypeByName("Loader")).willReturn(dto);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/equipment-types/name/{name}", "Loader")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Loader"));
    }

    @Test
    @WithMockUser
    void getEquipmentTypeByName_returns500_whenNotFound() throws Exception {
        given(equipmentTypeService.getEquipmentTypeByName("Unknown"))
                .willThrow(new RuntimeException("Equipment type not found with name: Unknown"));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/equipment-types/name/{name}", "Unknown")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().is5xxServerError());
    }

    // --- POST /api/equipment-types ---

    @Test
    @WithMockUser
    void createEquipmentType_returns201() throws Exception {
        UUID id = UUID.randomUUID();
        EquipmentTypeDTO request = buildEquipmentTypeDTO(null, "Grader");
        EquipmentTypeDTO saved = buildEquipmentTypeDTO(id, "Grader");
        given(equipmentTypeService.createEquipmentType(request)).willReturn(saved);

        mockMvc.perform(MockMvcRequestBuilders.post("/api/equipment-types")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.name").value("Grader"));
    }

    @Test
    @WithMockUser
    void createEquipmentType_returns500_whenServiceThrows() throws Exception {
        EquipmentTypeDTO request = buildEquipmentTypeDTO(null, "Grader");
        given(equipmentTypeService.createEquipmentType(request))
                .willThrow(new RuntimeException("Duplicate equipment type"));

        mockMvc.perform(MockMvcRequestBuilders.post("/api/equipment-types")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().is5xxServerError());
    }

    // --- PUT /api/equipment-types/{id} ---

    @Test
    @WithMockUser
    void updateEquipmentType_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        EquipmentTypeDTO request = buildEquipmentTypeDTO(id, "Updated Excavator");
        EquipmentTypeDTO updated = buildEquipmentTypeDTO(id, "Updated Excavator");
        given(equipmentTypeService.updateEquipmentType(id, request)).willReturn(updated);

        mockMvc.perform(MockMvcRequestBuilders.put("/api/equipment-types/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Excavator"));
    }

    @Test
    @WithMockUser
    void updateEquipmentType_returns500_whenNotFound() throws Exception {
        UUID id = UUID.randomUUID();
        EquipmentTypeDTO request = buildEquipmentTypeDTO(id, "Nonexistent");
        given(equipmentTypeService.updateEquipmentType(id, request))
                .willThrow(new RuntimeException("Equipment type not found with id: " + id));

        mockMvc.perform(MockMvcRequestBuilders.put("/api/equipment-types/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().is5xxServerError());
    }

    // --- DELETE /api/equipment-types/{id} ---

    @Test
    @WithMockUser
    void deleteEquipmentType_returns204() throws Exception {
        UUID id = UUID.randomUUID();
        willDoNothing().given(equipmentTypeService).deleteEquipmentType(id);

        mockMvc.perform(MockMvcRequestBuilders.delete("/api/equipment-types/{id}", id))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser
    void deleteEquipmentType_returns500_whenServiceThrows() throws Exception {
        UUID id = UUID.randomUUID();
        given(equipmentTypeService.getAllEquipmentTypes())
                .willThrow(new RuntimeException("Type in use"));
        // Trigger the delete and expect server error propagation
        org.mockito.Mockito.doThrow(new RuntimeException("Equipment type in use"))
                .when(equipmentTypeService).deleteEquipmentType(id);

        mockMvc.perform(MockMvcRequestBuilders.delete("/api/equipment-types/{id}", id))
                .andExpect(status().is5xxServerError());
    }

    // --- GET /api/equipment-types/{id}/supported-work-types ---

    @Test
    @WithMockUser
    void getSupportedWorkTypes_returns200() throws Exception {
        UUID typeId = UUID.randomUUID();
        List<WorkTypeDTO> workTypes = Arrays.asList(
                buildWorkTypeDTO(UUID.randomUUID(), "Mining"),
                buildWorkTypeDTO(UUID.randomUUID(), "Drilling")
        );
        given(equipmentTypeService.getSupportedWorkTypes(typeId)).willReturn(workTypes);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/equipment-types/{id}/supported-work-types", typeId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("Mining"));
    }

    @Test
    @WithMockUser
    void getSupportedWorkTypes_returnsEmptyList_whenNone() throws Exception {
        UUID typeId = UUID.randomUUID();
        given(equipmentTypeService.getSupportedWorkTypes(typeId)).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders.get("/api/equipment-types/{id}/supported-work-types", typeId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // --- PUT /api/equipment-types/{id}/supported-work-types ---

    @Test
    @WithMockUser
    void setSupportedWorkTypes_returns200() throws Exception {
        UUID typeId = UUID.randomUUID();
        UUID workTypeId1 = UUID.randomUUID();
        UUID workTypeId2 = UUID.randomUUID();
        List<UUID> workTypeIds = Arrays.asList(workTypeId1, workTypeId2);

        EquipmentTypeDTO updated = buildEquipmentTypeDTO(typeId, "Excavator");
        given(equipmentTypeService.setSupportedWorkTypes(typeId, workTypeIds)).willReturn(updated);

        mockMvc.perform(MockMvcRequestBuilders.put("/api/equipment-types/{id}/supported-work-types", typeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(workTypeIds))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(typeId.toString()));
    }

    @Test
    @WithMockUser
    void setSupportedWorkTypes_returns500_whenWorkTypeNotFound() throws Exception {
        UUID typeId = UUID.randomUUID();
        UUID workTypeId = UUID.randomUUID();
        List<UUID> workTypeIds = Collections.singletonList(workTypeId);

        given(equipmentTypeService.setSupportedWorkTypes(typeId, workTypeIds))
                .willThrow(new RuntimeException("Work type not found with id: " + workTypeId));

        mockMvc.perform(MockMvcRequestBuilders.put("/api/equipment-types/{id}/supported-work-types", typeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(workTypeIds))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().is5xxServerError());
    }

    // --- POST /api/equipment-types/{id}/supported-work-types ---

    @Test
    @WithMockUser
    void addSupportedWorkTypes_returns200() throws Exception {
        UUID typeId = UUID.randomUUID();
        UUID workTypeId = UUID.randomUUID();
        List<UUID> workTypeIds = Collections.singletonList(workTypeId);

        EquipmentTypeDTO updated = buildEquipmentTypeDTO(typeId, "Crane");
        given(equipmentTypeService.addSupportedWorkTypes(typeId, workTypeIds)).willReturn(updated);

        mockMvc.perform(MockMvcRequestBuilders.post("/api/equipment-types/{id}/supported-work-types", typeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(workTypeIds))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(typeId.toString()));
    }

    @Test
    @WithMockUser
    void addSupportedWorkTypes_returns500_whenEquipmentTypeNotFound() throws Exception {
        UUID typeId = UUID.randomUUID();
        List<UUID> workTypeIds = Collections.singletonList(UUID.randomUUID());

        given(equipmentTypeService.addSupportedWorkTypes(typeId, workTypeIds))
                .willThrow(new RuntimeException("Equipment type not found with id: " + typeId));

        mockMvc.perform(MockMvcRequestBuilders.post("/api/equipment-types/{id}/supported-work-types", typeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(workTypeIds))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().is5xxServerError());
    }

    // --- DELETE /api/equipment-types/{id}/supported-work-types ---

    @Test
    @WithMockUser
    void removeSupportedWorkTypes_returns200() throws Exception {
        UUID typeId = UUID.randomUUID();
        UUID workTypeId = UUID.randomUUID();
        List<UUID> workTypeIds = Collections.singletonList(workTypeId);

        EquipmentTypeDTO updated = buildEquipmentTypeDTO(typeId, "Loader");
        given(equipmentTypeService.removeSupportedWorkTypes(typeId, workTypeIds)).willReturn(updated);

        mockMvc.perform(MockMvcRequestBuilders.delete("/api/equipment-types/{id}/supported-work-types", typeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(workTypeIds))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(typeId.toString()));
    }

    @Test
    @WithMockUser
    void removeSupportedWorkTypes_returns500_whenEquipmentTypeNotFound() throws Exception {
        UUID typeId = UUID.randomUUID();
        List<UUID> workTypeIds = Collections.singletonList(UUID.randomUUID());

        given(equipmentTypeService.removeSupportedWorkTypes(typeId, workTypeIds))
                .willThrow(new RuntimeException("Equipment type not found with id: " + typeId));

        mockMvc.perform(MockMvcRequestBuilders.delete("/api/equipment-types/{id}/supported-work-types", typeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(workTypeIds))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().is5xxServerError());
    }
}