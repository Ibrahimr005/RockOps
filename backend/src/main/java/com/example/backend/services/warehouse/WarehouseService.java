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
        List<Warehouse> warehouses = warehouseRepository.findAll();
        List<Map<String, Object>> warehouseList = new ArrayList<>();

        for (Warehouse warehouse : warehouses) {
            Map<String, Object> warehouseData = new HashMap<>();
            warehouseData.put("id", warehouse.getId());
            warehouseData.put("name", warehouse.getName());

            // Add site details
            if (warehouse.getSite() != null) {
                Map<String, Object> siteDetails = new HashMap<>();
                siteDetails.put("id", warehouse.getSite().getId());
                siteDetails.put("name", warehouse.getSite().getName());
                warehouseData.put("site", siteDetails);
            }

            // Add employees
            List<Map<String, Object>> employeesList = new ArrayList<>();
            for (Employee employee : warehouse.getEmployees()) {
                Map<String, Object> employeeData = new HashMap<>();
                employeeData.put("id", employee.getId());

                employeesList.add(employeeData);
            }
            warehouseData.put("employees", employeesList);

            warehouseList.add(warehouseData);
        }
        return warehouseList;
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
        response.put("capacity", warehouse.getCapacity()); // ✅ Add this line

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












}
