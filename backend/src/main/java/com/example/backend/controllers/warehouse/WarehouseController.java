package com.example.backend.controllers.warehouse;


import com.example.backend.dto.warehouse.WarehouseAssignmentDTO;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.models.warehouse.WarehouseEmployee;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import com.example.backend.services.MinioService;
import com.example.backend.services.warehouse.WarehouseEmployeeService;
import com.example.backend.services.warehouse.WarehouseService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;
import java.util.stream.Collectors;


@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/v1/warehouses")
public class WarehouseController {

    @Autowired
    private WarehouseService warehouseService;
    @Autowired
    private WarehouseRepository warehouseRepository;
    @Autowired
    private WarehouseEmployeeService warehouseEmployeeService;
    @Autowired
    private MinioService minioService;



    @GetMapping
    public List<Map<String, Object>> getAllWarehouses() {
        List<Warehouse> warehouses = warehouseRepository.findAll();
        List<Map<String, Object>> result = new ArrayList<>();

        for (Warehouse warehouse : warehouses) {
            Map<String, Object> warehouseMap = new HashMap<>();
            warehouseMap.put("id", warehouse.getId());
            warehouseMap.put("name", warehouse.getName());
            warehouseMap.put("photoUrl", warehouse.getPhotoUrl());

            // Handle site
            if (warehouse.getSite() != null) {
                Map<String, Object> siteMap = new HashMap<>();
                siteMap.put("id", warehouse.getSite().getId());
                siteMap.put("name", warehouse.getSite().getName());
                warehouseMap.put("site", siteMap);
            }

            // Handle employees with full details
            List<Map<String, Object>> employeesList = new ArrayList<>();
            if (warehouse.getEmployees() != null) {
                for (Employee employee : warehouse.getEmployees()) {
                    Map<String, Object> employeeMap = new HashMap<>();
                    employeeMap.put("id", employee.getId());
                    employeeMap.put("firstName", employee.getFirstName());
                    employeeMap.put("lastName", employee.getLastName());
                    employeeMap.put("email", employee.getEmail());
                    employeeMap.put("photoUrl", employee.getPhotoUrl());

                    // Add job position if available - renamed from position to jobPosition
                    if (employee.getJobPosition() != null) {
                        Map<String, Object> jobPositionMap = new HashMap<>();
                        jobPositionMap.put("id", employee.getJobPosition().getId());
                        jobPositionMap.put("positionName", employee.getJobPosition().getPositionName());
                        employeeMap.put("jobPosition", jobPositionMap); // Renamed from position to jobPosition
                    }

                    employeesList.add(employeeMap);
                }
            }
            warehouseMap.put("employees", employeesList);

            result.add(warehouseMap);
        }

        return result;
    }



    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getWarehouseDetails(@PathVariable UUID id) {
        Map<String, Object> warehouseDetails = warehouseService.getWarehouseDetails(id);
        return ResponseEntity.ok(warehouseDetails);
    }



    @GetMapping("/employees/{warehouseId}")
    public List<Employee> getEmployeesByWarehouseId(@PathVariable UUID warehouseId) {
        return warehouseService.getEmployeesByWarehouseId(warehouseId);
    }

    @GetMapping("/site/{siteId}")
    public ResponseEntity<List<Map<String, Object>>> getWarehousesBySite(@PathVariable UUID siteId) {
        try {
            List<Warehouse> warehouses = warehouseService.getWarehousesBySite(siteId);

            List<Map<String, Object>> result = warehouses.stream()
                    .map(warehouse -> {
                        Map<String, Object> warehouseData = new HashMap<>();
                        warehouseData.put("id", warehouse.getId());
                        warehouseData.put("name", warehouse.getName());
                        warehouseData.put("photoUrl", warehouse.getPhotoUrl());
                        return warehouseData;
                    })
                    .collect(Collectors.toList());

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    @GetMapping("/{warehouseId}/assigned-users")
    public ResponseEntity<List<WarehouseEmployee>> getAssignedEmployeesWithDetails(@PathVariable UUID warehouseId) {
        try {
            List<WarehouseEmployee> assignments = warehouseEmployeeService.getEmployeeAssignmentsForWarehouse(warehouseId);
            return ResponseEntity.ok(assignments);
        } catch (Exception e) {
            System.err.println("Error fetching assigned employees: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/{warehouseId}/assigned-users-dto")
    public ResponseEntity<List<WarehouseAssignmentDTO>> getAssignedEmployeesAsDTO(@PathVariable UUID warehouseId) {
        try {
            List<WarehouseAssignmentDTO> assignments = warehouseEmployeeService.getEmployeeAssignmentDTOsForWarehouse(warehouseId);
            return ResponseEntity.ok(assignments);
        } catch (Exception e) {
            System.err.println("Error fetching assigned employees as DTO: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }


// Add these methods to your WarehouseController class

    // Replace your existing PUT endpoint in WarehouseController with this one:

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> updateWarehouse(
            @PathVariable UUID id,
            @RequestParam("warehouseData") String warehouseDataJson,
            @RequestParam(value = "photo", required = false) MultipartFile photo) {
        try {
            // Convert JSON String to a Map
            ObjectMapper objectMapper = new ObjectMapper();
            Map<String, Object> warehouseData = objectMapper.readValue(warehouseDataJson, new TypeReference<>() {});

            // Upload photo if provided
            if (photo != null && !photo.isEmpty()) {
                String fileName = minioService.uploadFile(photo);
                String fileUrl = minioService.getFileUrl(fileName);
                warehouseData.put("photoUrl", fileUrl);
            }

            // Update the warehouse
            Warehouse warehouse = warehouseService.updateWarehouse(id, warehouseData);

            // Return updated warehouse details
            Map<String, Object> response = new HashMap<>();
            response.put("id", warehouse.getId());
            response.put("name", warehouse.getName());
            response.put("photoUrl", warehouse.getPhotoUrl());

            // Add site details
            if (warehouse.getSite() != null) {
                Map<String, Object> siteDetails = new HashMap<>();
                siteDetails.put("id", warehouse.getSite().getId());
                siteDetails.put("name", warehouse.getSite().getName());
                response.put("site", siteDetails);
            }

            // Add employees
            List<Map<String, Object>> employeesList = new ArrayList<>();
            if (warehouse.getEmployees() != null) {
                for (Employee employee : warehouse.getEmployees()) {
                    Map<String, Object> employeeData = new HashMap<>();
                    employeeData.put("id", employee.getId());
                    employeeData.put("firstName", employee.getFirstName());
                    employeeData.put("lastName", employee.getLastName());
                    if (employee.getJobPosition() != null) {
                        employeeData.put("jobPosition", Map.of(
                                "id", employee.getJobPosition().getId(),
                                "positionName", employee.getJobPosition().getPositionName()
                        ));
                    }
                    employeesList.add(employeeData);
                }
            }
            response.put("employees", employeesList);

            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            System.err.println("Error updating warehouse: " + e.getMessage());
            e.printStackTrace();
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Internal server error");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }


    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteWarehouse(@PathVariable UUID id) {
        try {
            warehouseService.deleteWarehouse(id);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Warehouse deleted successfully");
            response.put("deletedId", id);

            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            System.err.println("Error deleting warehouse: " + e.getMessage());
            e.printStackTrace();
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Internal server error");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }



}
