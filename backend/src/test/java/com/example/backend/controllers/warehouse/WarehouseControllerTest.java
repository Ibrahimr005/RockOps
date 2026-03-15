package com.example.backend.controllers.warehouse;

import com.example.backend.config.JwtService;
import com.example.backend.dto.warehouse.WarehouseAssignmentDTO;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.models.warehouse.WarehouseEmployee;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import com.example.backend.services.MinioService;
import com.example.backend.services.warehouse.WarehouseEmployeeService;
import com.example.backend.services.warehouse.WarehouseService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = WarehouseController.class)
@AutoConfigureMockMvc(addFilters = false)
public class WarehouseControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private WarehouseService warehouseService;

    @MockBean
    private WarehouseRepository warehouseRepository;

    @MockBean
    private WarehouseEmployeeService warehouseEmployeeService;

    @MockBean
    private MinioService minioService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    // ==================== GET /api/v1/warehouses ====================

    @Test
    @WithMockUser
    public void getAllWarehouses_shouldReturn200WithList() throws Exception {
        Warehouse warehouse = new Warehouse();
        warehouse.setId(UUID.randomUUID());
        warehouse.setName("Main Warehouse");
        warehouse.setEmployees(Collections.emptyList());

        given(warehouseRepository.findAll()).willReturn(List.of(warehouse));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/warehouses")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].name").value("Main Warehouse"));
    }

    @Test
    @WithMockUser
    public void getAllWarehouses_emptyList_shouldReturn200() throws Exception {
        given(warehouseRepository.findAll()).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/warehouses")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @WithMockUser
    public void getAllWarehouses_withSiteAndEmployees_shouldReturn200WithDetails() throws Exception {
        Warehouse warehouse = new Warehouse();
        warehouse.setId(UUID.randomUUID());
        warehouse.setName("Site Warehouse");

        Employee employee = new Employee();
        employee.setId(UUID.randomUUID());
        employee.setFirstName("John");
        employee.setLastName("Doe");
        warehouse.setEmployees(List.of(employee));

        given(warehouseRepository.findAll()).willReturn(List.of(warehouse));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/warehouses")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].employees").isArray());
    }

    // ==================== GET /api/v1/warehouses/{id} ====================

    @Test
    @WithMockUser
    public void getWarehouseDetails_shouldReturn200WithDetails() throws Exception {
        UUID id = UUID.randomUUID();
        Map<String, Object> details = new HashMap<>();
        details.put("id", id.toString());
        details.put("name", "Warehouse Alpha");

        given(warehouseService.getWarehouseDetails(id)).willReturn(details);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/warehouses/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Warehouse Alpha"));
    }

    // ==================== GET /api/v1/warehouses/{warehouseId}/employees ====================

    @Test
    @WithMockUser
    public void getWarehouseEmployees_shouldReturn200WithList() throws Exception {
        UUID warehouseId = UUID.randomUUID();

        Employee employee = new Employee();
        employee.setId(UUID.randomUUID());
        employee.setFirstName("Alice");
        employee.setLastName("Smith");

        given(warehouseService.getEmployeesByWarehouseId(warehouseId)).willReturn(List.of(employee));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/warehouses/{warehouseId}/employees", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].name").value("Alice Smith"));
    }

    @Test
    @WithMockUser
    public void getWarehouseEmployees_emptyList_shouldReturn200() throws Exception {
        UUID warehouseId = UUID.randomUUID();

        given(warehouseService.getEmployeesByWarehouseId(warehouseId)).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/warehouses/{warehouseId}/employees", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @WithMockUser
    public void getWarehouseEmployees_whenException_shouldReturn500() throws Exception {
        UUID warehouseId = UUID.randomUUID();

        given(warehouseService.getEmployeesByWarehouseId(warehouseId))
                .willThrow(new RuntimeException("Database error"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/warehouses/{warehouseId}/employees", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/warehouses/site/{siteId} ====================

    @Test
    @WithMockUser
    public void getWarehousesBySite_shouldReturn200WithList() throws Exception {
        UUID siteId = UUID.randomUUID();

        Warehouse warehouse = new Warehouse();
        warehouse.setId(UUID.randomUUID());
        warehouse.setName("Site Storage");

        given(warehouseService.getWarehousesBySite(siteId)).willReturn(List.of(warehouse));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/warehouses/site/{siteId}", siteId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].name").value("Site Storage"));
    }

    @Test
    @WithMockUser
    public void getWarehousesBySite_whenException_shouldReturn200WithEmptyList() throws Exception {
        UUID siteId = UUID.randomUUID();

        given(warehouseService.getWarehousesBySite(siteId))
                .willThrow(new RuntimeException("Unexpected error"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/warehouses/site/{siteId}", siteId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/v1/warehouses/{warehouseId}/assigned-users ====================

    @Test
    @WithMockUser
    public void getAssignedEmployeesWithDetails_shouldReturn200WithList() throws Exception {
        UUID warehouseId = UUID.randomUUID();

        WarehouseEmployee assignment = WarehouseEmployee.builder()
                .id(UUID.randomUUID())
                .assignedAt(LocalDateTime.now())
                .assignedBy("admin")
                .build();

        given(warehouseEmployeeService.getEmployeeAssignmentsForWarehouse(warehouseId))
                .willReturn(List.of(assignment));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/warehouses/{warehouseId}/assigned-users", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    public void getAssignedEmployeesWithDetails_whenException_shouldReturn500() throws Exception {
        UUID warehouseId = UUID.randomUUID();

        given(warehouseEmployeeService.getEmployeeAssignmentsForWarehouse(warehouseId))
                .willThrow(new RuntimeException("Service failure"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/warehouses/{warehouseId}/assigned-users", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/warehouses/{warehouseId}/assigned-users-dto ====================

    @Test
    @WithMockUser
    public void getAssignedEmployeesAsDTO_shouldReturn200WithList() throws Exception {
        UUID warehouseId = UUID.randomUUID();

        WarehouseAssignmentDTO dto = new WarehouseAssignmentDTO();

        given(warehouseEmployeeService.getEmployeeAssignmentDTOsForWarehouse(warehouseId))
                .willReturn(List.of(dto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/warehouses/{warehouseId}/assigned-users-dto", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    public void getAssignedEmployeesAsDTO_whenException_shouldReturn500() throws Exception {
        UUID warehouseId = UUID.randomUUID();

        given(warehouseEmployeeService.getEmployeeAssignmentDTOsForWarehouse(warehouseId))
                .willThrow(new RuntimeException("Service failure"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/warehouses/{warehouseId}/assigned-users-dto", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== PUT /api/v1/warehouses/{id} (multipart) ====================

    @Test
    @WithMockUser
    public void updateWarehouse_withoutPhoto_shouldReturn200() throws Exception {
        UUID id = UUID.randomUUID();

        Warehouse warehouse = new Warehouse();
        warehouse.setId(id);
        warehouse.setName("Updated Warehouse");
        warehouse.setEmployees(Collections.emptyList());

        given(warehouseService.updateWarehouse(eq(id), anyMap())).willReturn(warehouse);

        String warehouseDataJson = objectMapper.writeValueAsString(Map.of("name", "Updated Warehouse"));

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/api/v1/warehouses/{id}", id)
                        .param("warehouseData", warehouseDataJson)
                        .with(request -> {
                            request.setMethod("PUT");
                            return request;
                        }))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Warehouse"));
    }

    @Test
    @WithMockUser
    public void updateWarehouse_withPhoto_shouldReturn200() throws Exception {
        UUID id = UUID.randomUUID();

        Warehouse warehouse = new Warehouse();
        warehouse.setId(id);
        warehouse.setName("Photo Warehouse");
        warehouse.setPhotoUrl("http://storage/photo.jpg");
        warehouse.setEmployees(Collections.emptyList());

        given(minioService.uploadFile(any())).willReturn("photo.jpg");
        given(minioService.getFileUrl("photo.jpg")).willReturn("http://storage/photo.jpg");
        given(warehouseService.updateWarehouse(eq(id), anyMap())).willReturn(warehouse);

        String warehouseDataJson = objectMapper.writeValueAsString(Map.of("name", "Photo Warehouse"));
        MockMultipartFile photo = new MockMultipartFile(
                "photo", "photo.jpg", MediaType.IMAGE_JPEG_VALUE, "image-bytes".getBytes());

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/api/v1/warehouses/{id}", id)
                        .file(photo)
                        .param("warehouseData", warehouseDataJson)
                        .with(request -> {
                            request.setMethod("PUT");
                            return request;
                        }))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Photo Warehouse"));
    }

    @Test
    @WithMockUser
    public void updateWarehouse_whenRuntimeException_shouldReturn400() throws Exception {
        UUID id = UUID.randomUUID();

        given(warehouseService.updateWarehouse(eq(id), anyMap()))
                .willThrow(new RuntimeException("Warehouse not found"));

        String warehouseDataJson = objectMapper.writeValueAsString(Map.of("name", "Bad Name"));

        mockMvc.perform(MockMvcRequestBuilders
                        .multipart("/api/v1/warehouses/{id}", id)
                        .param("warehouseData", warehouseDataJson)
                        .with(request -> {
                            request.setMethod("PUT");
                            return request;
                        }))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Warehouse not found"));
    }

    // ==================== DELETE /api/v1/warehouses/{id} ====================

    @Test
    @WithMockUser
    public void deleteWarehouse_shouldReturn200WithMessage() throws Exception {
        UUID id = UUID.randomUUID();

        willDoNothing().given(warehouseService).deleteWarehouse(id);

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/v1/warehouses/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Warehouse deleted successfully"))
                .andExpect(jsonPath("$.deletedId").value(id.toString()));
    }

    @Test
    @WithMockUser
    public void deleteWarehouse_whenRuntimeException_shouldReturn400() throws Exception {
        UUID id = UUID.randomUUID();

        willThrow(new RuntimeException("Cannot delete warehouse with active inventory"))
                .given(warehouseService).deleteWarehouse(id);

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/v1/warehouses/{id}", id))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Cannot delete warehouse with active inventory"));
    }

    @Test
    @WithMockUser
    public void deleteWarehouse_whenUnexpectedException_shouldReturn500() throws Exception {
        UUID id = UUID.randomUUID();

        willThrow(new Error("Critical JVM error"))
                .given(warehouseService).deleteWarehouse(id);

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/v1/warehouses/{id}", id))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Internal server error"));
    }
}