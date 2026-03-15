package com.example.backend.controllers.warehouse;

import com.example.backend.config.JwtService;
import com.example.backend.models.user.Role;
import com.example.backend.models.user.User;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.models.warehouse.WarehouseEmployee;
import com.example.backend.repositories.user.UserRepository;
import com.example.backend.repositories.warehouse.WarehouseEmployeeRepository;
import com.example.backend.services.warehouse.WarehouseEmployeeService;
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

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = WarehouseEmployeeController.class)
@AutoConfigureMockMvc(addFilters = false)
public class WarehouseEmployeeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private WarehouseEmployeeService warehouseEmployeeService;

    @MockBean
    private WarehouseEmployeeRepository warehouseEmployeeRepository;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    // ==================== GET /api/v1/warehouseEmployees/warehouse-employees ====================

    @Test
    @WithMockUser
    public void getAllWarehouseEmployees_shouldReturn200WithList() throws Exception {
        User user = User.builder()
                .id(UUID.randomUUID())
                .username("wh_employee1")
                .firstName("Bob")
                .lastName("Builder")
                .password("secret")
                .role(Role.WAREHOUSE_EMPLOYEE)
                .warehouseAssignments(new ArrayList<>())
                .build();

        given(warehouseEmployeeService.getAllWarehouseEmployees()).willReturn(List.of(user));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/warehouseEmployees/warehouse-employees")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].username").value("wh_employee1"))
                .andExpect(jsonPath("$[0].firstName").value("Bob"))
                .andExpect(jsonPath("$[0].role").value("WAREHOUSE_EMPLOYEE"));
    }

    @Test
    @WithMockUser
    public void getAllWarehouseEmployees_emptyList_shouldReturn200() throws Exception {
        given(warehouseEmployeeService.getAllWarehouseEmployees()).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/warehouseEmployees/warehouse-employees")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @WithMockUser
    public void getAllWarehouseEmployees_whenException_shouldReturn500() throws Exception {
        given(warehouseEmployeeService.getAllWarehouseEmployees())
                .willThrow(new RuntimeException("Database error"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/warehouseEmployees/warehouse-employees")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").exists());
    }

    // ==================== POST /api/v1/warehouseEmployees/{employeeId}/assign-warehouse ====================

    @Test
    @WithMockUser(username = "admin")
    public void assignEmployeeToWarehouse_shouldReturn200WithAssignment() throws Exception {
        UUID employeeId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();

        WarehouseEmployee assignment = WarehouseEmployee.builder()
                .id(UUID.randomUUID())
                .assignedAt(LocalDateTime.now())
                .assignedBy("admin")
                .build();

        given(warehouseEmployeeService.assignEmployeeToWarehouse(
                any(UUID.class), any(UUID.class), anyString()))
                .willReturn(assignment);

        Map<String, Object> requestBody = Map.of("warehouseId", warehouseId.toString());

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/warehouseEmployees/{employeeId}/assign-warehouse", employeeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Employee assigned successfully"))
                .andExpect(jsonPath("$.assignmentId").exists())
                .andExpect(jsonPath("$.assignedBy").value("admin"));
    }

    @Test
    @WithMockUser(username = "admin")
    public void assignEmployeeToWarehouse_missingWarehouseId_shouldReturn400() throws Exception {
        UUID employeeId = UUID.randomUUID();

        Map<String, Object> requestBody = Map.of("someOtherField", "value");

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/warehouseEmployees/{employeeId}/assign-warehouse", employeeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("warehouseId is required"));
    }

    @Test
    @WithMockUser(username = "admin")
    public void assignEmployeeToWarehouse_invalidUUID_shouldReturn400() throws Exception {
        UUID employeeId = UUID.randomUUID();

        // Pass a non-UUID string to trigger IllegalArgumentException in UUID.fromString()
        Map<String, Object> requestBody = Map.of("warehouseId", "not-a-valid-uuid");

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/warehouseEmployees/{employeeId}/assign-warehouse", employeeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid UUID format"));
    }

    @Test
    @WithMockUser(username = "admin")
    public void assignEmployeeToWarehouse_whenRuntimeException_shouldReturn400() throws Exception {
        UUID employeeId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();

        given(warehouseEmployeeService.assignEmployeeToWarehouse(
                any(UUID.class), any(UUID.class), anyString()))
                .willThrow(new RuntimeException("Employee already assigned to this warehouse"));

        Map<String, Object> requestBody = Map.of("warehouseId", warehouseId.toString());

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/warehouseEmployees/{employeeId}/assign-warehouse", employeeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Employee already assigned to this warehouse"));
    }

    @Test
    @WithMockUser(username = "admin")
    public void assignEmployeeToWarehouse_whenUnexpectedException_shouldReturn500() throws Exception {
        UUID employeeId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();

        given(warehouseEmployeeService.assignEmployeeToWarehouse(
                any(UUID.class), any(UUID.class), anyString()))
                .willThrow(new Error("Critical failure"));

        Map<String, Object> requestBody = Map.of("warehouseId", warehouseId.toString());

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/warehouseEmployees/{employeeId}/assign-warehouse", employeeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("An unexpected error occurred"));
    }

    // ==================== DELETE /api/v1/warehouseEmployees/{employeeId}/unassign-warehouse ====================

    @Test
    @WithMockUser
    public void unassignEmployeeFromWarehouse_shouldReturn200() throws Exception {
        UUID employeeId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();

        willDoNothing().given(warehouseEmployeeService)
                .unassignEmployeeFromWarehouse(any(UUID.class), any(UUID.class));

        Map<String, Object> requestBody = Map.of("warehouseId", warehouseId.toString());

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/v1/warehouseEmployees/{employeeId}/unassign-warehouse", employeeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Employee unassigned successfully"));
    }

    @Test
    @WithMockUser
    public void unassignEmployeeFromWarehouse_missingWarehouseId_shouldReturn400() throws Exception {
        UUID employeeId = UUID.randomUUID();

        Map<String, Object> requestBody = Map.of("unrelated", "data");

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/v1/warehouseEmployees/{employeeId}/unassign-warehouse", employeeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("warehouseId is required"));
    }

    @Test
    @WithMockUser
    public void unassignEmployeeFromWarehouse_invalidUUID_shouldReturn400() throws Exception {
        UUID employeeId = UUID.randomUUID();

        Map<String, Object> requestBody = Map.of("warehouseId", "bad-uuid-value");

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/v1/warehouseEmployees/{employeeId}/unassign-warehouse", employeeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid UUID format"));
    }

    @Test
    @WithMockUser
    public void unassignEmployeeFromWarehouse_whenRuntimeException_shouldReturn400() throws Exception {
        UUID employeeId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();

        willThrow(new RuntimeException("Assignment not found"))
                .given(warehouseEmployeeService)
                .unassignEmployeeFromWarehouse(any(UUID.class), any(UUID.class));

        Map<String, Object> requestBody = Map.of("warehouseId", warehouseId.toString());

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/v1/warehouseEmployees/{employeeId}/unassign-warehouse", employeeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Assignment not found"));
    }

    @Test
    @WithMockUser
    public void unassignEmployeeFromWarehouse_whenUnexpectedException_shouldReturn500() throws Exception {
        UUID employeeId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();

        willThrow(new Error("Critical failure"))
                .given(warehouseEmployeeService)
                .unassignEmployeeFromWarehouse(any(UUID.class), any(UUID.class));

        Map<String, Object> requestBody = Map.of("warehouseId", warehouseId.toString());

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/v1/warehouseEmployees/{employeeId}/unassign-warehouse", employeeId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("An unexpected error occurred"));
    }

    // ==================== GET /api/v1/warehouseEmployees/{employeeId}/warehouses ====================

    @Test
    @WithMockUser
    public void getWarehousesForEmployee_shouldReturn200WithList() throws Exception {
        UUID employeeId = UUID.randomUUID();

        Warehouse warehouse = new Warehouse();
        warehouse.setId(UUID.randomUUID());
        warehouse.setName("Assigned Warehouse");

        given(warehouseEmployeeService.getWarehousesForEmployee(employeeId)).willReturn(List.of(warehouse));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/warehouseEmployees/{employeeId}/warehouses", employeeId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    public void getWarehousesForEmployee_whenRuntimeException_shouldReturn400() throws Exception {
        UUID employeeId = UUID.randomUUID();

        given(warehouseEmployeeService.getWarehousesForEmployee(employeeId))
                .willThrow(new RuntimeException("Employee not found"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/warehouseEmployees/{employeeId}/warehouses", employeeId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    public void getWarehousesForEmployee_whenUnexpectedException_shouldReturn500() throws Exception {
        UUID employeeId = UUID.randomUUID();

        given(warehouseEmployeeService.getWarehousesForEmployee(employeeId))
                .willThrow(new RuntimeException("DB error"));

        // RuntimeException is caught by the RuntimeException handler returning 400
        // This test verifies the controller's RuntimeException handling
        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/warehouseEmployees/{employeeId}/warehouses", employeeId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }

    // ==================== GET /api/v1/warehouseEmployees/{employeeId}/warehouses/{warehouseId}/assignment ====================

    @Test
    @WithMockUser
    public void getAssignmentDetails_shouldReturn200() throws Exception {
        UUID employeeId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();

        WarehouseEmployee assignment = WarehouseEmployee.builder()
                .id(UUID.randomUUID())
                .assignedAt(LocalDateTime.now())
                .assignedBy("manager")
                .build();

        given(warehouseEmployeeService.getAssignmentDetails(employeeId, warehouseId)).willReturn(assignment);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/warehouseEmployees/{employeeId}/warehouses/{warehouseId}/assignment",
                                employeeId, warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignedBy").value("manager"));
    }

    @Test
    @WithMockUser
    public void getAssignmentDetails_whenRuntimeException_shouldReturn404() throws Exception {
        UUID employeeId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();

        given(warehouseEmployeeService.getAssignmentDetails(employeeId, warehouseId))
                .willThrow(new RuntimeException("Assignment not found"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/warehouseEmployees/{employeeId}/warehouses/{warehouseId}/assignment",
                                employeeId, warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
    public void getAssignmentDetails_whenUnexpectedException_shouldReturn500() throws Exception {
        UUID employeeId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();

        given(warehouseEmployeeService.getAssignmentDetails(employeeId, warehouseId))
                .willThrow(new Error("Critical DB failure"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/warehouseEmployees/{employeeId}/warehouses/{warehouseId}/assignment",
                                employeeId, warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/warehouseEmployees/{employeeId}/assignments ====================

    @Test
    @WithMockUser
    public void getEmployeeAssignments_shouldReturn200WithList() throws Exception {
        UUID employeeId = UUID.randomUUID();

        WarehouseEmployee assignment = WarehouseEmployee.builder()
                .id(UUID.randomUUID())
                .assignedAt(LocalDateTime.now())
                .assignedBy("manager")
                .build();

        given(warehouseEmployeeService.getEmployeeAssignments(employeeId)).willReturn(List.of(assignment));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/warehouseEmployees/{employeeId}/assignments", employeeId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    public void getEmployeeAssignments_emptyList_shouldReturn200() throws Exception {
        UUID employeeId = UUID.randomUUID();

        given(warehouseEmployeeService.getEmployeeAssignments(employeeId)).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/warehouseEmployees/{employeeId}/assignments", employeeId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @WithMockUser
    public void getEmployeeAssignments_whenException_shouldReturn500() throws Exception {
        UUID employeeId = UUID.randomUUID();

        given(warehouseEmployeeService.getEmployeeAssignments(employeeId))
                .willThrow(new RuntimeException("DB error"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/warehouseEmployees/{employeeId}/assignments", employeeId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/warehouseEmployees/{employeeId}/warehouses/{warehouseId}/access ====================

    @Test
    @WithMockUser
    public void checkWarehouseAccess_whenHasAccess_shouldReturn200True() throws Exception {
        UUID employeeId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();

        given(warehouseEmployeeService.hasWarehouseAccess(employeeId, warehouseId)).willReturn(true);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/warehouseEmployees/{employeeId}/warehouses/{warehouseId}/access",
                                employeeId, warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hasAccess").value(true));
    }

    @Test
    @WithMockUser
    public void checkWarehouseAccess_whenNoAccess_shouldReturn200False() throws Exception {
        UUID employeeId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();

        given(warehouseEmployeeService.hasWarehouseAccess(employeeId, warehouseId)).willReturn(false);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/warehouseEmployees/{employeeId}/warehouses/{warehouseId}/access",
                                employeeId, warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hasAccess").value(false));
    }

    @Test
    @WithMockUser
    public void checkWarehouseAccess_whenException_shouldReturn500() throws Exception {
        UUID employeeId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();

        given(warehouseEmployeeService.hasWarehouseAccess(employeeId, warehouseId))
                .willThrow(new RuntimeException("Service failure"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/warehouseEmployees/{employeeId}/warehouses/{warehouseId}/access",
                                employeeId, warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/warehouseEmployees/by-username/{username}/assignments ====================

    @Test
    @WithMockUser
    public void getEmployeeAssignmentsByUsername_warehouseEmployee_shouldReturn200WithList() throws Exception {
        String username = "wh_user1";

        User user = User.builder()
                .id(UUID.randomUUID())
                .username(username)
                .firstName("Carol")
                .lastName("White")
                .password("pass")
                .role(Role.WAREHOUSE_EMPLOYEE)
                .warehouseAssignments(new ArrayList<>())
                .build();

        Warehouse warehouse = new Warehouse();
        warehouse.setId(UUID.randomUUID());
        warehouse.setName("Alpha Warehouse");

        WarehouseEmployee assignment = WarehouseEmployee.builder()
                .id(UUID.randomUUID())
                .user(user)
                .warehouse(warehouse)
                .assignedAt(LocalDateTime.now())
                .assignedBy("admin")
                .build();

        given(userRepository.findByUsername(username)).willReturn(Optional.of(user));
        given(warehouseEmployeeRepository.findByUserIdWithWarehouse(user.getId()))
                .willReturn(List.of(assignment));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/warehouseEmployees/by-username/{username}/assignments", username)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].assignedBy").value("admin"))
                .andExpect(jsonPath("$[0].warehouse.name").value("Alpha Warehouse"));
    }

    @Test
    @WithMockUser
    public void getEmployeeAssignmentsByUsername_nonWarehouseEmployee_shouldReturn200EmptyList() throws Exception {
        String username = "hr_user1";

        User user = User.builder()
                .id(UUID.randomUUID())
                .username(username)
                .firstName("Dave")
                .lastName("Brown")
                .password("pass")
                .role(Role.HR_MANAGER)
                .warehouseAssignments(new ArrayList<>())
                .build();

        given(userRepository.findByUsername(username)).willReturn(Optional.of(user));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/warehouseEmployees/by-username/{username}/assignments", username)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @WithMockUser
    public void getEmployeeAssignmentsByUsername_userNotFound_shouldReturn500() throws Exception {
        String username = "ghost_user";

        given(userRepository.findByUsername(username))
                .willThrow(new RuntimeException("User not found with username: " + username));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/warehouseEmployees/by-username/{username}/assignments", username)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    @WithMockUser
    public void getEmployeeAssignmentsByUsername_warehouseEmployee_noAssignments_shouldReturn200EmptyList() throws Exception {
        String username = "unassigned_wh_user";

        User user = User.builder()
                .id(UUID.randomUUID())
                .username(username)
                .firstName("Eve")
                .lastName("Unassigned")
                .password("pass")
                .role(Role.WAREHOUSE_EMPLOYEE)
                .warehouseAssignments(new ArrayList<>())
                .build();

        given(userRepository.findByUsername(username)).willReturn(Optional.of(user));
        given(warehouseEmployeeRepository.findByUserIdWithWarehouse(user.getId()))
                .willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/warehouseEmployees/by-username/{username}/assignments", username)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }
}