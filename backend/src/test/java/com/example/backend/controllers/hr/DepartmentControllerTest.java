package com.example.backend.controllers.hr;

import com.example.backend.config.JwtService;
import com.example.backend.services.hr.DepartmentService;
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

@WebMvcTest(controllers = DepartmentController.class)
@AutoConfigureMockMvc(addFilters = false)
public class DepartmentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DepartmentService departmentService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper.registerModule(new JavaTimeModule());
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/departments
    // -----------------------------------------------------------------------

    @Test
    void getAllDepartments_happyPath_returns200() throws Exception {
        Map<String, Object> dept = Map.of("id", UUID.randomUUID().toString(), "name", "Engineering");
        given(departmentService.getAllDepartmentsAsMap()).willReturn(List.of(dept));

        mockMvc.perform(get("/api/v1/departments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].name").value("Engineering"));
    }

    @Test
    void getAllDepartments_serviceThrows_returns500() throws Exception {
        given(departmentService.getAllDepartmentsAsMap())
                .willThrow(new RuntimeException("DB error"));

        mockMvc.perform(get("/api/v1/departments"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Failed to fetch departments"));
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/departments/{id}
    // -----------------------------------------------------------------------

    @Test
    void getDepartmentById_happyPath_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        Map<String, Object> dept = Map.of("id", id.toString(), "name", "Finance");
        given(departmentService.getDepartmentByIdAsMap(id)).willReturn(dept);

        mockMvc.perform(get("/api/v1/departments/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Finance"));
    }

    @Test
    void getDepartmentById_notFound_returns404() throws Exception {
        UUID id = UUID.randomUUID();
        given(departmentService.getDepartmentByIdAsMap(id)).willReturn(null);

        mockMvc.perform(get("/api/v1/departments/{id}", id))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Department not found"));
    }

    @Test
    void getDepartmentById_serviceThrows_returns500() throws Exception {
        UUID id = UUID.randomUUID();
        given(departmentService.getDepartmentByIdAsMap(id))
                .willThrow(new RuntimeException("Unexpected DB error"));

        mockMvc.perform(get("/api/v1/departments/{id}", id))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Failed to fetch department"));
    }

    // -----------------------------------------------------------------------
    // POST /api/v1/departments
    // -----------------------------------------------------------------------

    @Test
    void createDepartment_happyPath_returns201() throws Exception {
        Map<String, Object> body = Map.of("name", "HR", "description", "Human Resources");
        Map<String, Object> created = Map.of("id", UUID.randomUUID().toString(), "name", "HR");
        given(departmentService.createDepartmentFromMap(anyMap())).willReturn(created);

        mockMvc.perform(post("/api/v1/departments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("HR"));
    }

    @Test
    void createDepartment_validationError_returns400() throws Exception {
        Map<String, Object> body = Map.of("name", "");
        given(departmentService.createDepartmentFromMap(anyMap()))
                .willThrow(new IllegalArgumentException("Department name cannot be empty"));

        mockMvc.perform(post("/api/v1/departments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Department name cannot be empty"));
    }

    @Test
    void createDepartment_serviceThrows_returns500() throws Exception {
        Map<String, Object> body = Map.of("name", "Engineering");
        given(departmentService.createDepartmentFromMap(anyMap()))
                .willThrow(new RuntimeException("DB error"));

        mockMvc.perform(post("/api/v1/departments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Failed to create department"));
    }

    // -----------------------------------------------------------------------
    // PUT /api/v1/departments/{id}
    // -----------------------------------------------------------------------

    @Test
    void updateDepartment_happyPath_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        Map<String, Object> body = Map.of("name", "Updated Engineering");
        Map<String, Object> updated = Map.of("id", id.toString(), "name", "Updated Engineering");
        given(departmentService.updateDepartmentFromMap(eq(id), anyMap())).willReturn(updated);

        mockMvc.perform(put("/api/v1/departments/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Engineering"));
    }

    @Test
    void updateDepartment_validationError_returns400() throws Exception {
        UUID id = UUID.randomUUID();
        Map<String, Object> body = Map.of("name", "");
        given(departmentService.updateDepartmentFromMap(eq(id), anyMap()))
                .willThrow(new IllegalArgumentException("Name is required"));

        mockMvc.perform(put("/api/v1/departments/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Name is required"));
    }

    @Test
    void updateDepartment_notFound_returns404() throws Exception {
        UUID id = UUID.randomUUID();
        Map<String, Object> body = Map.of("name", "Ghost Dept");
        given(departmentService.updateDepartmentFromMap(eq(id), anyMap()))
                .willThrow(new RuntimeException("Department not found with id: " + id));

        mockMvc.perform(put("/api/v1/departments/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isNotFound());
    }

    @Test
    void updateDepartment_genericRuntimeError_returns500() throws Exception {
        UUID id = UUID.randomUUID();
        Map<String, Object> body = Map.of("name", "Test");
        given(departmentService.updateDepartmentFromMap(eq(id), anyMap()))
                .willThrow(new RuntimeException("Some other error"));

        mockMvc.perform(put("/api/v1/departments/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isInternalServerError());
    }

    // -----------------------------------------------------------------------
    // DELETE /api/v1/departments/{id}
    // -----------------------------------------------------------------------

    @Test
    void deleteDepartment_happyPath_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        willDoNothing().given(departmentService).deleteDepartment(id);

        mockMvc.perform(delete("/api/v1/departments/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Department deleted successfully"));
    }

    @Test
    void deleteDepartment_hasEmployees_returns409() throws Exception {
        UUID id = UUID.randomUUID();
        willThrow(new IllegalStateException("Cannot delete department with active employees"))
                .given(departmentService).deleteDepartment(id);

        mockMvc.perform(delete("/api/v1/departments/{id}", id))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("Cannot delete department with active employees"));
    }

    @Test
    void deleteDepartment_notFound_returns404() throws Exception {
        UUID id = UUID.randomUUID();
        willThrow(new RuntimeException("Department not found with id: " + id))
                .given(departmentService).deleteDepartment(id);

        mockMvc.perform(delete("/api/v1/departments/{id}", id))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteDepartment_genericError_returns500() throws Exception {
        UUID id = UUID.randomUUID();
        willThrow(new RuntimeException("Unexpected failure"))
                .given(departmentService).deleteDepartment(id);

        mockMvc.perform(delete("/api/v1/departments/{id}", id))
                .andExpect(status().isInternalServerError());
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/departments/test
    // -----------------------------------------------------------------------

    @Test
    void testEndpoint_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/departments/test"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"));
    }
}