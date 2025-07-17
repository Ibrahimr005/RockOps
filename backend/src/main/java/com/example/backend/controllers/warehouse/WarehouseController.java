package com.example.backend.controllers.warehouse;


import com.example.backend.dto.warehouse.WarehouseAssignmentDTO;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.models.warehouse.WarehouseEmployee;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import com.example.backend.services.warehouse.WarehouseEmployeeService;
import com.example.backend.services.warehouse.WarehouseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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






}
