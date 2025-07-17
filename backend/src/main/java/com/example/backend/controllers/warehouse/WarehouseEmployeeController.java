package com.example.backend.controllers.warehouse;

import com.example.backend.models.user.Role;
import com.example.backend.models.user.User;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.models.warehouse.WarehouseEmployee;
import com.example.backend.repositories.user.UserRepository;
import com.example.backend.repositories.warehouse.WarehouseEmployeeRepository;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import com.example.backend.services.warehouse.WarehouseEmployeeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/warehouseEmployees")
public class WarehouseEmployeeController {

    @Autowired
    private WarehouseEmployeeService warehouseEmployeeService;

    @Autowired
    WarehouseEmployeeRepository warehouseEmployeeRepository;


    @Autowired
    private UserRepository userRepository;

    /**
     * Get all warehouse employees (users with WAREHOUSE_EMPLOYEE role)
     */
    @GetMapping("/warehouse-employees")
    public ResponseEntity<?> getAllWarehouseEmployees() {
        try {
            System.out.println("Fetching all warehouse employees...");
            List<User> employees = warehouseEmployeeService.getAllWarehouseEmployees();

            // Create simple response to avoid circular reference issues
            List<Map<String, Object>> response = employees.stream()
                    .map(emp -> {
                        Map<String, Object> empData = new HashMap<>();
                        empData.put("id", emp.getId());
                        empData.put("firstName", emp.getFirstName());
                        empData.put("lastName", emp.getLastName());
                        empData.put("username", emp.getUsername());
                        empData.put("role", emp.getRole().toString());
                        return empData;
                    })
                    .collect(Collectors.toList());

            System.out.println("Successfully fetched " + response.size() + " warehouse employees");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("Error fetching warehouse employees: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch warehouse employees: " + e.getMessage()));
        }
    }

    /**
     * Assign an employee to a warehouse
     */
    @PostMapping("/{employeeId}/assign-warehouse")
    public ResponseEntity<?> assignEmployeeToWarehouse(
            @PathVariable UUID employeeId,
            @RequestBody Map<String, Object> requestBody,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            // Validate request body
            if (!requestBody.containsKey("warehouseId")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "warehouseId is required"));
            }

            UUID warehouseId = UUID.fromString((String) requestBody.get("warehouseId"));
            String assignedBy = userDetails.getUsername(); // Get current user's username

            WarehouseEmployee assignment = warehouseEmployeeService.assignEmployeeToWarehouse(
                    employeeId, warehouseId, assignedBy);

            return ResponseEntity.ok(Map.of(
                    "message", "Employee assigned successfully",
                    "assignmentId", assignment.getId(),
                    "assignedAt", assignment.getAssignedAt().toString(),
                    "assignedBy", assignment.getAssignedBy()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Invalid UUID format"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            System.err.println("Error assigning employee to warehouse: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "An unexpected error occurred"));
        }
    }

    /**
     * Unassign an employee from a warehouse
     */
    @DeleteMapping("/{employeeId}/unassign-warehouse")
    public ResponseEntity<?> unassignEmployeeFromWarehouse(
            @PathVariable UUID employeeId,
            @RequestBody Map<String, Object> requestBody) {
        try {
            // Validate request body
            if (!requestBody.containsKey("warehouseId")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "warehouseId is required"));
            }

            UUID warehouseId = UUID.fromString((String) requestBody.get("warehouseId"));

            warehouseEmployeeService.unassignEmployeeFromWarehouse(employeeId, warehouseId);

            return ResponseEntity.ok(Map.of("message", "Employee unassigned successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Invalid UUID format"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            System.err.println("Error unassigning employee from warehouse: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "An unexpected error occurred"));
        }
    }

    /**
     * Get warehouses assigned to an employee
     */
    @GetMapping("/{employeeId}/warehouses")
    public ResponseEntity<List<Warehouse>> getWarehousesForEmployee(@PathVariable UUID employeeId) {
        try {
            List<Warehouse> warehouses = warehouseEmployeeService.getWarehousesForEmployee(employeeId);
            return ResponseEntity.ok(warehouses);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        } catch (Exception e) {
            System.err.println("Error fetching warehouses for employee: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    /**
     * Get assignment details for an employee and warehouse
     */
    @GetMapping("/{employeeId}/warehouses/{warehouseId}/assignment")
    public ResponseEntity<WarehouseEmployee> getAssignmentDetails(
            @PathVariable UUID employeeId,
            @PathVariable UUID warehouseId) {
        try {
            WarehouseEmployee assignment = warehouseEmployeeService.getAssignmentDetails(employeeId, warehouseId);
            return ResponseEntity.ok(assignment);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(null);
        } catch (Exception e) {
            System.err.println("Error fetching assignment details: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    /**
     * Get all assignments for an employee
     */
    @GetMapping("/{employeeId}/assignments")
    public ResponseEntity<List<WarehouseEmployee>> getEmployeeAssignments(@PathVariable UUID employeeId) {
        try {
            List<WarehouseEmployee> assignments = warehouseEmployeeService.getEmployeeAssignments(employeeId);
            return ResponseEntity.ok(assignments);
        } catch (Exception e) {
            System.err.println("Error fetching employee assignments: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    /**
     * Check if employee has access to a specific warehouse
     */
    @GetMapping("/{employeeId}/warehouses/{warehouseId}/access")
    public ResponseEntity<Map<String, Boolean>> checkWarehouseAccess(
            @PathVariable UUID employeeId,
            @PathVariable UUID warehouseId) {
        try {
            boolean hasAccess = warehouseEmployeeService.hasWarehouseAccess(employeeId, warehouseId);
            return ResponseEntity.ok(Map.of("hasAccess", hasAccess));
        } catch (Exception e) {
            System.err.println("Error checking warehouse access: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    /**
     * Get employee assignments by username (returns WarehouseEmployee objects)
     */
    @GetMapping("/by-username/{username}/assignments")
    public ResponseEntity<?> getEmployeeAssignmentsByUsername(@PathVariable String username) {
        try {
            System.out.println("Getting assignments for username: " + username);

            // Find user by username
            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("User not found with username: " + username));

            // Verify user is a warehouse employee
            if (user.getRole() != Role.WAREHOUSE_EMPLOYEE) {
                System.out.println("User " + username + " is not a warehouse employee");
                return ResponseEntity.ok(new ArrayList<>()); // Return empty list
            }

            // Get all assignments for this user
            List<WarehouseEmployee> assignments = warehouseEmployeeRepository.findByUserIdWithWarehouse(user.getId());

            // Convert to DTOs to avoid circular references
            List<Map<String, Object>> assignmentDTOs = assignments.stream()
                    .map(assignment -> {
                        Map<String, Object> dto = new HashMap<>();
                        dto.put("id", assignment.getId());
                        dto.put("assignedAt", assignment.getAssignedAt());
                        dto.put("assignedBy", assignment.getAssignedBy());

                        // Add warehouse info
                        if (assignment.getWarehouse() != null) {
                            Map<String, Object> warehouseInfo = new HashMap<>();
                            warehouseInfo.put("id", assignment.getWarehouse().getId());
                            warehouseInfo.put("name", assignment.getWarehouse().getName());
                            warehouseInfo.put("photoUrl", assignment.getWarehouse().getPhotoUrl());

                            // Add site info if available
                            if (assignment.getWarehouse().getSite() != null) {
                                Map<String, Object> siteInfo = new HashMap<>();
                                siteInfo.put("id", assignment.getWarehouse().getSite().getId());
                                siteInfo.put("name", assignment.getWarehouse().getSite().getName());
                                warehouseInfo.put("site", siteInfo);
                            }

                            dto.put("warehouse", warehouseInfo);
                        }

                        return dto;
                    })
                    .collect(Collectors.toList());

            System.out.println("Found " + assignmentDTOs.size() + " assignments for user " + username);
            return ResponseEntity.ok(assignmentDTOs);

        } catch (Exception e) {
            System.err.println("Error getting assignments for username " + username + ": " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to get user assignments: " + e.getMessage()));
        }
    }
}