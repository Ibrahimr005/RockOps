package com.example.backend.services.warehouse;


import com.example.backend.models.hr.Employee;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.site.SiteRepository;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class WarehouseService {

    @Autowired
    private WarehouseRepository warehouseRepository;

    @Autowired
    private SiteRepository siteRepository;

    @Autowired
    private EmployeeRepository employeeRepository;


    public List<Map<String, Object>> getAllWarehouses() {
        try {
            List<Warehouse> warehouses = warehouseRepository.findAll();
            List<Map<String, Object>> warehouseList = new ArrayList<>();

            for (Warehouse warehouse : warehouses) {
                Map<String, Object> warehouseData = new HashMap<>();
                warehouseData.put("id", warehouse.getId());
                warehouseData.put("name", warehouse.getName());
                warehouseData.put("photoUrl", warehouse.getPhotoUrl());

                // Add site details safely
                if (warehouse.getSite() != null) {
                    Map<String, Object> siteDetails = new HashMap<>();
                    siteDetails.put("id", warehouse.getSite().getId());
                    siteDetails.put("name", warehouse.getSite().getName());
                    warehouseData.put("site", siteDetails);
                } else {
                    warehouseData.put("site", null);
                }

                // Add employees safely (avoid circular references)
                List<Map<String, Object>> employeesList = new ArrayList<>();
                if (warehouse.getEmployees() != null) {
                    for (Employee employee : warehouse.getEmployees()) {
                        Map<String, Object> employeeData = new HashMap<>();
                        employeeData.put("id", employee.getId());
                        employeeData.put("firstName", employee.getFirstName());
                        employeeData.put("lastName", employee.getLastName());

                        if (employee.getJobPosition() != null) {
                            Map<String, Object> jobPosition = new HashMap<>();
                            jobPosition.put("positionName", employee.getJobPosition().getPositionName());
                            employeeData.put("jobPosition", jobPosition);
                        }

                        employeesList.add(employeeData);
                    }
                }
                warehouseData.put("employees", employeesList);

                warehouseList.add(warehouseData);
            }

            System.out.println("Successfully processed " + warehouseList.size() + " warehouses");
            return warehouseList;

        } catch (Exception e) {
            System.err.println("Error in getAllWarehouses: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to fetch warehouses", e);
        }
    }

    public Warehouse getWarehouseById(UUID id) {
        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Warehouse not found"));

        List<Employee> employees = new ArrayList<>(warehouse.getEmployees());
        warehouse.setEmployees(employees); // Ensures employees are included

        return warehouse;
    }

    public Map<String, Object> getWarehouseDetails(UUID warehouseId) {
        Warehouse warehouse = warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new RuntimeException("Warehouse not found"));

        Map<String, Object> response = new HashMap<>();
        response.put("id", warehouse.getId());
        response.put("name", warehouse.getName());
//        response.put("capacity", warehouse.getCapacity()); // ✅ Add this line
        response.put("photoUrl", warehouse.getPhotoUrl());

        // Manually add site details
        if (warehouse.getSite() != null) {
            Map<String, Object> siteDetails = new HashMap<>();
            siteDetails.put("id", warehouse.getSite().getId());
            siteDetails.put("name", warehouse.getSite().getName());
            response.put("site", siteDetails);
        }

        // Manually add employees with their job positions
        List<Map<String, Object>> employeesList = new ArrayList<>();
        for (Employee employee : warehouse.getEmployees()) {
            Map<String, Object> employeeData = new HashMap<>();
            employeeData.put("id", employee.getId());
            employeeData.put("name", employee.getFullName());

            if (employee.getJobPosition() != null) {
                employeeData.put("position", employee.getJobPosition().getPositionName());
            }

            employeesList.add(employeeData);
        }
        response.put("employees", employeesList);

        return response;
    }



    public List<Employee> getEmployeesByWarehouseId(UUID warehouseId) {
        Warehouse warehouse = warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new RuntimeException("Warehouse not found"));

        return new ArrayList<>(warehouse.getEmployees());
    }

    public List<Warehouse> getWarehousesBySite(UUID siteId) {
        return warehouseRepository.findBySiteId(siteId);
    }


// Add these methods to your WarehouseService class

// Update your WarehouseService updateWarehouse method to this:

    public Warehouse updateWarehouse(UUID id, Map<String, Object> warehouseData) {
        try {
            Warehouse existingWarehouse = warehouseRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Warehouse not found with id: " + id));

            // Update basic fields
            if (warehouseData.containsKey("name")) {
                existingWarehouse.setName((String) warehouseData.get("name"));
            }

            if (warehouseData.containsKey("photoUrl")) {
                existingWarehouse.setPhotoUrl((String) warehouseData.get("photoUrl"));
            }

            // Handle manager assignment
            if (warehouseData.containsKey("managerId")) {
                String managerIdStr = (String) warehouseData.get("managerId");
                if (managerIdStr != null && !managerIdStr.isEmpty()) {
                    UUID managerId = UUID.fromString(managerIdStr);
                    Employee manager = employeeRepository.findById(managerId)
                            .orElseThrow(() -> new RuntimeException("Manager not found with id: " + managerId));

                    // Remove current manager if exists
                    if (existingWarehouse.getEmployees() != null) {
                        existingWarehouse.getEmployees().removeIf(emp ->
                                emp.getJobPosition() != null &&
                                        "warehouse manager".equalsIgnoreCase(emp.getJobPosition().getPositionName())
                        );
                    }

                    // Add new manager
                    manager.setWarehouse(existingWarehouse);
                    if (existingWarehouse.getEmployees() == null) {
                        existingWarehouse.setEmployees(new ArrayList<>());
                    }
                    existingWarehouse.getEmployees().add(manager);
                    employeeRepository.save(manager);
                }
            }

            return warehouseRepository.save(existingWarehouse);

        } catch (Exception e) {
            System.err.println("Error updating warehouse: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to update warehouse", e);
        }
    }

    public void deleteWarehouse(UUID id) {
        try {
            Warehouse warehouse = warehouseRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Warehouse not found with id: " + id));

            // Check if warehouse has employees
            if (warehouse.getEmployees() != null && !warehouse.getEmployees().isEmpty()) {
                throw new RuntimeException("Cannot delete warehouse with assigned employees. Please reassign employees first.");
            }

            // Check if warehouse has items
            if (warehouse.getItems() != null && !warehouse.getItems().isEmpty()) {
                throw new RuntimeException("Cannot delete warehouse with items. Please move or remove items first.");
            }

            // Check if warehouse has employee assignments
            if (warehouse.getEmployeeAssignments() != null && !warehouse.getEmployeeAssignments().isEmpty()) {
                throw new RuntimeException("Cannot delete warehouse with employee assignments. Please remove assignments first.");
            }

            warehouseRepository.delete(warehouse);
            System.out.println("Successfully deleted warehouse with id: " + id);

        } catch (Exception e) {
            System.err.println("Error deleting warehouse: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to delete warehouse: " + e.getMessage(), e);
        }
    }









}
