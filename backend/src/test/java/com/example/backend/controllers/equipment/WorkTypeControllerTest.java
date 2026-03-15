package com.example.backend.controllers.equipment;

import com.example.backend.config.JwtService;
import com.example.backend.dto.equipment.WorkTypeDTO;
import com.example.backend.services.equipment.WorkTypeService;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = WorkTypeController.class,
        excludeAutoConfiguration = {SecurityAutoConfiguration.class, SecurityFilterAutoConfiguration.class}
)
@AutoConfigureMockMvc(addFilters = false)
public class WorkTypeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private WorkTypeService workTypeService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    // --- Helpers ---

    private WorkTypeDTO buildWorkTypeDTO(UUID id, String name, boolean active) {
        WorkTypeDTO dto = new WorkTypeDTO();
        dto.setId(id);
        dto.setName(name);
        dto.setDescription("Description for " + name);
        dto.setActive(active);
        return dto;
    }

    // --- GET /api/v1/worktypes ---

    @Test
    @WithMockUser
    void getAllWorkTypes_returns200WithList() throws Exception {
        List<WorkTypeDTO> types = Arrays.asList(
                buildWorkTypeDTO(UUID.randomUUID(), "Mining", true),
                buildWorkTypeDTO(UUID.randomUUID(), "Drilling", true)
        );
        given(workTypeService.getAllWorkTypes()).willReturn(types);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/v1/worktypes")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("Mining"))
                .andExpect(jsonPath("$[1].name").value("Drilling"));
    }

    @Test
    @WithMockUser
    void getAllWorkTypes_returnsEmptyList_whenNoActiveTypes() throws Exception {
        given(workTypeService.getAllWorkTypes()).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders.get("/api/v1/worktypes")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // --- GET /api/v1/worktypes/management ---

    @Test
    @WithMockUser
    void getAllWorkTypesForManagement_returns200WithAllTypes() throws Exception {
        List<WorkTypeDTO> allTypes = Arrays.asList(
                buildWorkTypeDTO(UUID.randomUUID(), "Mining", true),
                buildWorkTypeDTO(UUID.randomUUID(), "Blasting", false)
        );
        given(workTypeService.getAllWorkTypesForManagement()).willReturn(allTypes);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/v1/worktypes/management")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[1].active").value(false));
    }

    @Test
    @WithMockUser
    void getAllWorkTypesForManagement_returnsEmptyList_whenNoTypes() throws Exception {
        given(workTypeService.getAllWorkTypesForManagement()).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders.get("/api/v1/worktypes/management")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // --- GET /api/v1/worktypes/{id} ---

    @Test
    @WithMockUser
    void getWorkTypeById_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        WorkTypeDTO dto = buildWorkTypeDTO(id, "Excavation", true);
        given(workTypeService.getWorkTypeById(id)).willReturn(dto);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/v1/worktypes/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.name").value("Excavation"))
                .andExpect(jsonPath("$.active").value(true));
    }

    @Test
    @WithMockUser
    void getWorkTypeById_returns500_whenNotFound() throws Exception {
        UUID id = UUID.randomUUID();
        given(workTypeService.getWorkTypeById(id))
                .willThrow(new RuntimeException("Work type not found with id: " + id));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/v1/worktypes/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().is5xxServerError());
    }

    // --- POST /api/v1/worktypes ---

    @Test
    @WithMockUser
    void createWorkType_returns201() throws Exception {
        UUID id = UUID.randomUUID();
        WorkTypeDTO request = buildWorkTypeDTO(null, "Blasting", true);
        WorkTypeDTO saved = buildWorkTypeDTO(id, "Blasting", true);
        given(workTypeService.createWorkType(request)).willReturn(saved);

        mockMvc.perform(MockMvcRequestBuilders.post("/api/v1/worktypes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.name").value("Blasting"));
    }

    @Test
    @WithMockUser
    void createWorkType_returns500_whenDuplicateName() throws Exception {
        WorkTypeDTO request = buildWorkTypeDTO(null, "Mining", true);
        given(workTypeService.createWorkType(request))
                .willThrow(new RuntimeException("Work type with name 'Mining' already exists"));

        mockMvc.perform(MockMvcRequestBuilders.post("/api/v1/worktypes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().is5xxServerError());
    }

    // --- PUT /api/v1/worktypes/{id} ---

    @Test
    @WithMockUser
    void updateWorkType_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        WorkTypeDTO request = buildWorkTypeDTO(id, "Updated Drilling", true);
        WorkTypeDTO updated = buildWorkTypeDTO(id, "Updated Drilling", true);
        given(workTypeService.updateWorkType(id, request)).willReturn(updated);

        mockMvc.perform(MockMvcRequestBuilders.put("/api/v1/worktypes/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Drilling"));
    }

    @Test
    @WithMockUser
    void updateWorkType_returns500_whenNotFound() throws Exception {
        UUID id = UUID.randomUUID();
        WorkTypeDTO request = buildWorkTypeDTO(id, "Nonexistent", true);
        given(workTypeService.updateWorkType(id, request))
                .willThrow(new RuntimeException("Work type not found with id: " + id));

        mockMvc.perform(MockMvcRequestBuilders.put("/api/v1/worktypes/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().is5xxServerError());
    }

    // --- DELETE /api/v1/worktypes/{id} ---

    @Test
    @WithMockUser
    void deleteWorkType_returns204() throws Exception {
        UUID id = UUID.randomUUID();
        willDoNothing().given(workTypeService).deleteWorkType(id);

        mockMvc.perform(MockMvcRequestBuilders.delete("/api/v1/worktypes/{id}", id))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser
    void deleteWorkType_returns500_whenNotFound() throws Exception {
        UUID id = UUID.randomUUID();
        org.mockito.Mockito.doThrow(new RuntimeException("Work type not found with id: " + id))
                .when(workTypeService).deleteWorkType(id);

        mockMvc.perform(MockMvcRequestBuilders.delete("/api/v1/worktypes/{id}", id))
                .andExpect(status().is5xxServerError());
    }

    // --- POST /api/v1/worktypes/reactivate ---

    @Test
    @WithMockUser
    void reactivateWorkTypeByName_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        WorkTypeDTO workTypeData = buildWorkTypeDTO(null, "Blasting", true);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("name", "Blasting");
        requestBody.put("workTypeData", workTypeData);

        WorkTypeDTO reactivated = buildWorkTypeDTO(id, "Blasting", true);
        given(workTypeService.reactivateWorkTypeByName("Blasting", workTypeData)).willReturn(reactivated);

        mockMvc.perform(MockMvcRequestBuilders.post("/api/v1/worktypes/reactivate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Blasting"))
                .andExpect(jsonPath("$.active").value(true));
    }

    @Test
    @WithMockUser
    void reactivateWorkTypeByName_returns500_whenWorkTypeNotFound() throws Exception {
        WorkTypeDTO workTypeData = buildWorkTypeDTO(null, "Unknown", true);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("name", "Unknown");
        requestBody.put("workTypeData", workTypeData);

        given(workTypeService.reactivateWorkTypeByName("Unknown", workTypeData))
                .willThrow(new RuntimeException("Work type not found with name: Unknown"));

        mockMvc.perform(MockMvcRequestBuilders.post("/api/v1/worktypes/reactivate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().is5xxServerError());
    }

    @Test
    @WithMockUser
    void reactivateWorkTypeByName_returns400_whenAlreadyActive() throws Exception {
        WorkTypeDTO workTypeData = buildWorkTypeDTO(null, "Mining", true);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("name", "Mining");
        requestBody.put("workTypeData", workTypeData);

        given(workTypeService.reactivateWorkTypeByName("Mining", workTypeData))
                .willThrow(new IllegalStateException("Work type is already active"));

        mockMvc.perform(MockMvcRequestBuilders.post("/api/v1/worktypes/reactivate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }
}