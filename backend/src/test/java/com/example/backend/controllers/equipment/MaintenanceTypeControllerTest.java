package com.example.backend.controllers.equipment;

import com.example.backend.dto.equipment.MaintenanceTypeDTO;
import com.example.backend.models.equipment.MaintenanceType;
import com.example.backend.services.equipment.MaintenanceTypeService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doNothing;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = MaintenanceTypeController.class)
@AutoConfigureMockMvc(addFilters = false)
public class MaintenanceTypeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private MaintenanceTypeService maintenanceTypeService;

    // -----------------------------------------------------------------------
    // GET /api/v1/maintenancetypes
    // -----------------------------------------------------------------------

    @Test
    @WithMockUser
    void getAllMaintenanceTypes_returns200WithList() throws Exception {
        MaintenanceTypeDTO dto = new MaintenanceTypeDTO(UUID.randomUUID(), "Oil Change", "Regular oil change", true);
        given(maintenanceTypeService.getAllMaintenanceTypes()).willReturn(List.of(dto));

        mockMvc.perform(get("/api/v1/maintenancetypes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    void getAllMaintenanceTypes_returnsEmptyList_returns200() throws Exception {
        given(maintenanceTypeService.getAllMaintenanceTypes()).willReturn(List.of());

        mockMvc.perform(get("/api/v1/maintenancetypes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/maintenancetypes/management
    // -----------------------------------------------------------------------

    @Test
    @WithMockUser
    void getAllMaintenanceTypesForManagement_returns200WithList() throws Exception {
        MaintenanceTypeDTO active = new MaintenanceTypeDTO(UUID.randomUUID(), "Tire Change", "Tire change", true);
        MaintenanceTypeDTO inactive = new MaintenanceTypeDTO(UUID.randomUUID(), "Old Type", "Deprecated", false);
        given(maintenanceTypeService.getAllMaintenanceTypesForManagement()).willReturn(List.of(active, inactive));

        mockMvc.perform(get("/api/v1/maintenancetypes/management"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/maintenancetypes/{id}
    // -----------------------------------------------------------------------

    @Test
    @WithMockUser
    void getMaintenanceTypeById_returns200WithObject() throws Exception {
        UUID id = UUID.randomUUID();
        MaintenanceTypeDTO dto = new MaintenanceTypeDTO(id, "Filter Change", "Air filter change", true);
        given(maintenanceTypeService.getMaintenanceTypeById(id)).willReturn(dto);

        mockMvc.perform(get("/api/v1/maintenancetypes/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").exists())
                .andExpect(jsonPath("$.id").exists());
    }

    // -----------------------------------------------------------------------
    // POST /api/v1/maintenancetypes
    // -----------------------------------------------------------------------

    @Test
    @WithMockUser
    void createMaintenanceType_returns201WithCreatedDTO() throws Exception {
        MaintenanceTypeDTO request = new MaintenanceTypeDTO(null, "Brake Check", "Brake inspection", true);
        MaintenanceTypeDTO response = new MaintenanceTypeDTO(UUID.randomUUID(), "Brake Check", "Brake inspection", true);
        given(maintenanceTypeService.createMaintenanceType(any(MaintenanceTypeDTO.class))).willReturn(response);

        mockMvc.perform(post("/api/v1/maintenancetypes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").exists());
    }

    @Test
    @WithMockUser
    void createMaintenanceType_whenDuplicate_returns400WithMessage() throws Exception {
        MaintenanceTypeDTO request = new MaintenanceTypeDTO(null, "Duplicate", "Desc", true);
        given(maintenanceTypeService.createMaintenanceType(any(MaintenanceTypeDTO.class)))
                .willThrow(new IllegalArgumentException("Maintenance type already exists"));

        mockMvc.perform(post("/api/v1/maintenancetypes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }

    // -----------------------------------------------------------------------
    // PUT /api/v1/maintenancetypes/{id}
    // -----------------------------------------------------------------------

    @Test
    @WithMockUser
    void updateMaintenanceType_returns200WithUpdatedDTO() throws Exception {
        UUID id = UUID.randomUUID();
        MaintenanceTypeDTO request = new MaintenanceTypeDTO(id, "Updated Name", "Updated desc", true);
        MaintenanceTypeDTO response = new MaintenanceTypeDTO(id, "Updated Name", "Updated desc", true);
        given(maintenanceTypeService.updateMaintenanceType(any(UUID.class), any(MaintenanceTypeDTO.class)))
                .willReturn(response);

        mockMvc.perform(put("/api/v1/maintenancetypes/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").exists());
    }

    @Test
    @WithMockUser
    void updateMaintenanceType_whenInvalid_returns400WithMessage() throws Exception {
        UUID id = UUID.randomUUID();
        MaintenanceTypeDTO request = new MaintenanceTypeDTO(id, "", "desc", true);
        given(maintenanceTypeService.updateMaintenanceType(any(UUID.class), any(MaintenanceTypeDTO.class)))
                .willThrow(new IllegalArgumentException("Name cannot be empty"));

        mockMvc.perform(put("/api/v1/maintenancetypes/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }

    // -----------------------------------------------------------------------
    // DELETE /api/v1/maintenancetypes/{id}
    // -----------------------------------------------------------------------

    @Test
    @WithMockUser
    void deleteMaintenanceType_returns204() throws Exception {
        UUID id = UUID.randomUUID();
        doNothing().when(maintenanceTypeService).deleteMaintenanceType(id);

        mockMvc.perform(delete("/api/v1/maintenancetypes/{id}", id))
                .andExpect(status().isNoContent());
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/maintenancetypes/active  (legacy)
    // -----------------------------------------------------------------------

    @Test
    @WithMockUser
    void getAllActiveMaintenanceTypes_returns200WithList() throws Exception {
        MaintenanceType entity = new MaintenanceType();
        given(maintenanceTypeService.getAllActiveMaintenanceTypes()).willReturn(List.of(entity));

        mockMvc.perform(get("/api/v1/maintenancetypes/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    // -----------------------------------------------------------------------
    // POST /api/v1/maintenancetypes/legacy  (legacy)
    // -----------------------------------------------------------------------

    @Test
    @WithMockUser
    void addMaintenanceTypeLegacy_returns201WithEntity() throws Exception {
        MaintenanceType entity = new MaintenanceType();
        given(maintenanceTypeService.addMaintenanceType(anyString(), anyString())).willReturn(entity);

        Map<String, String> body = new HashMap<>();
        body.put("name", "Legacy Type");
        body.put("description", "A legacy maintenance type");

        mockMvc.perform(post("/api/v1/maintenancetypes/legacy")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated());
    }

    // -----------------------------------------------------------------------
    // PUT /api/v1/maintenancetypes/legacy/{id}  (legacy)
    // -----------------------------------------------------------------------

    @Test
    @WithMockUser
    void updateMaintenanceTypeLegacy_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        MaintenanceType entity = new MaintenanceType();
        given(maintenanceTypeService.updateMaintenanceType(any(UUID.class), anyString(), anyString(), any()))
                .willReturn(entity);

        Map<String, Object> body = new HashMap<>();
        body.put("name", "Updated Legacy");
        body.put("description", "Updated description");
        body.put("active", true);

        mockMvc.perform(put("/api/v1/maintenancetypes/legacy/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/maintenancetypes/search?name=...
    // -----------------------------------------------------------------------

    @Test
    @WithMockUser
    void searchMaintenanceTypes_returns200WithList() throws Exception {
        MaintenanceType entity = new MaintenanceType();
        given(maintenanceTypeService.searchMaintenanceTypes("oil")).willReturn(List.of(entity));

        mockMvc.perform(get("/api/v1/maintenancetypes/search").param("name", "oil"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    // -----------------------------------------------------------------------
    // POST /api/v1/maintenancetypes/reactivate
    // -----------------------------------------------------------------------

    @Test
    @WithMockUser
    void reactivateMaintenanceTypeByName_returns200WithDTO() throws Exception {
        MaintenanceTypeDTO response = new MaintenanceTypeDTO(UUID.randomUUID(), "Reactivated", "desc", true);
        given(maintenanceTypeService.reactivateMaintenanceTypeByName(anyString(), any(MaintenanceTypeDTO.class)))
                .willReturn(response);

        MaintenanceTypeController.ReactivateRequest request = new MaintenanceTypeController.ReactivateRequest();
        request.setName("Reactivated");
        request.setMaintenanceTypeData(new MaintenanceTypeDTO(null, "Reactivated", "desc", true));

        mockMvc.perform(post("/api/v1/maintenancetypes/reactivate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").exists());
    }
}