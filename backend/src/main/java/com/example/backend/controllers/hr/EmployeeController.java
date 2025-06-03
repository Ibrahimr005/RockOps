package com.example.backend.controllers.hr;

import com.example.backend.models.hr.Employee;
import com.example.backend.services.hr.EmployeeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/employees")
public class EmployeeController {

    @Autowired
    private EmployeeService employeeService;

    @GetMapping("/warehouse-workers")
    public List<Employee> getWarehouseWorkers() {
        return employeeService.getWarehouseWorkers();
    }

    @GetMapping("/warehouse-managers")
    public List<Employee> getWarehouseManagers() {
        return employeeService.getWarehouseManagers();
    }

    @GetMapping("/drivers")
    public List<Employee> getDrivers() {
        return employeeService.getDrivers();
    }

    @GetMapping("/technicians")
    public List<Employee> getTechnicians() {
        return employeeService.getTechnicians();
    }

    /**
     * Get employees by contract type with minimal data for attendance operations
     * @param contractType Contract type (HOURLY, DAILY, MONTHLY)
     * @return List of employees with minimal data
     */
    @GetMapping("/by-contract-type/{contractType}")
    public ResponseEntity<List<Map<String, Object>>> getEmployeesByContractType(
            @PathVariable String contractType) {
        try {
            List<Employee> employees = employeeService.getEmployeesByContractType(contractType);

            List<Map<String, Object>> minimalEmployeeData = employees.stream()
                    .filter(emp -> emp.getJobPosition() != null) // Only include employees with job positions
                    .map(this::createMinimalEmployeeData)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(minimalEmployeeData);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get all employees grouped by contract type with minimal data
     * @return Map of contract types to employee lists
     */
    @GetMapping("/grouped-by-contract")
    public ResponseEntity<Map<String, List<Map<String, Object>>>> getEmployeesGroupedByContractType() {
        try {
            List<Employee> allEmployees = employeeService.getEmployees();

            Map<String, List<Map<String, Object>>> groupedEmployees = allEmployees.stream()
                    .filter(emp -> emp.getJobPosition() != null && emp.getJobPosition().getContractType() != null)
                    .collect(Collectors.groupingBy(
                            emp -> emp.getJobPosition().getContractType().name(),
                            Collectors.mapping(this::createMinimalEmployeeData, Collectors.toList())
                    ));

            return ResponseEntity.ok(groupedEmployees);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get employees with minimal data for attendance operations
     * @return List of employees with essential attendance-related data only
     */
    @GetMapping("/minimal")
    public ResponseEntity<List<Map<String, Object>>> getEmployeesMinimal() {
        try {
            List<Employee> employees = employeeService.getEmployees();

            List<Map<String, Object>> minimalEmployeeData = employees.stream()
                    .map(this::createMinimalEmployeeData)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(minimalEmployeeData);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get active employees by contract type with minimal data
     * @param contractType Contract type (HOURLY, DAILY, MONTHLY)
     * @return List of active employees with minimal data
     */
    @GetMapping("/active/by-contract-type/{contractType}")
    public ResponseEntity<List<Map<String, Object>>> getActiveEmployeesByContractType(
            @PathVariable String contractType) {
        try {
            List<Employee> employees = employeeService.getEmployeesByContractType(contractType);

            List<Map<String, Object>> activeEmployeeData = employees.stream()
                    .filter(emp -> emp.getJobPosition() != null && "ACTIVE".equalsIgnoreCase(emp.getStatus()))
                    .map(this::createMinimalEmployeeData)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(activeEmployeeData);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getEmployees() {
        List<Map<String, Object>> employeeList = employeeService.getEmployees().stream().map(emp -> {
            Map<String, Object> employeeData = new HashMap<>();

            // Basic information
            employeeData.put("id", emp.getId());
            employeeData.put("firstName", emp.getFirstName());
            employeeData.put("lastName", emp.getLastName());
            employeeData.put("middleName", emp.getMiddleName());
            employeeData.put("fullName", emp.getFullName());

            employeeData.put("status", emp.getStatus());

            // Contact information
            employeeData.put("email", emp.getEmail());
            employeeData.put("phoneNumber", emp.getPhoneNumber());
            employeeData.put("address", emp.getAddress());
            employeeData.put("city", emp.getCity());

            // Personal details
            employeeData.put("birthDate", emp.getBirthDate());
            employeeData.put("gender", emp.getGender());
            employeeData.put("maritalStatus", emp.getMaritalStatus());
            employeeData.put("militaryStatus", emp.getMilitaryStatus());
            employeeData.put("nationalIDNumber", emp.getNationalIDNumber());
            employeeData.put("license", emp.getLicense());

            // Employment details
            employeeData.put("hireDate", emp.getHireDate());

            // Additional details
            employeeData.put("education", emp.getEducation());

            // Financial information
            employeeData.put("baseSalary", emp.getBaseSalary());
            employeeData.put("monthlySalary", emp.getMonthlySalary());
            employeeData.put("annualTotalCompensation", emp.getAnnualTotalCompensation());

            // Images
            employeeData.put("photoUrl", emp.getPhotoUrl());
            employeeData.put("idFrontImage", emp.getIdFrontImage());
            employeeData.put("idBackImage", emp.getIdBackImage());

            // Related entities
            if (emp.getSite() != null) {
                employeeData.put("siteId", emp.getSite().getId());
                employeeData.put("siteName", emp.getSite().getName());
            }

            if (emp.getWarehouse() != null) {
                employeeData.put("warehouseId", emp.getWarehouse().getId());
                employeeData.put("warehouseName", emp.getWarehouse().getName());
            }

            if (emp.getJobPosition() != null) {
                employeeData.put("jobPositionId", emp.getJobPosition().getId());
                employeeData.put("jobPositionName", emp.getJobPosition().getPositionName());
                employeeData.put("jobPositionDepartment", emp.getJobPosition().getDepartment().getName());
                employeeData.put("jobPositionType", emp.getJobPosition().getType());
            }

            return employeeData;
        }).toList();

        return ResponseEntity.ok(employeeList);
    }
    /**
     * Helper method to create minimal employee data for attendance operations
     * @param employee Employee entity
     * @return Map with minimal employee data
     */
    private Map<String, Object> createMinimalEmployeeData(Employee employee) {
        Map<String, Object> employeeData = new HashMap<>();

        // Essential identification
        employeeData.put("id", employee.getId());
        employeeData.put("fullName", employee.getFullName());
        employeeData.put("firstName", employee.getFirstName());
        employeeData.put("lastName", employee.getLastName());
        employeeData.put("status", employee.getStatus());

        // Photo for UI
        employeeData.put("photoUrl", employee.getPhotoUrl());

        // Site information
        if (employee.getSite() != null) {
            employeeData.put("siteId", employee.getSite().getId());
            employeeData.put("siteName", employee.getSite().getName());
        } else {
            employeeData.put("siteId", null);
            employeeData.put("siteName", "Unassigned");
        }

        // Job position and contract information
        if (employee.getJobPosition() != null) {
            employeeData.put("jobPositionId", employee.getJobPosition().getId());
            employeeData.put("jobPositionName", employee.getJobPosition().getPositionName());
            employeeData.put("contractType", employee.getJobPosition().getContractType() != null ?
                    employee.getJobPosition().getContractType().name() : "N/A");

            // Department information
            if (employee.getJobPosition().getDepartment() != null) {
                employeeData.put("departmentId", employee.getJobPosition().getDepartment().getId());
                employeeData.put("departmentName", employee.getJobPosition().getDepartment().getName());
            } else {
                employeeData.put("departmentId", null);
                employeeData.put("departmentName", "Unassigned");
            }
        } else {
            employeeData.put("jobPositionId", null);
            employeeData.put("jobPositionName", "Unassigned");
            employeeData.put("contractType", "MONTHLY");
            employeeData.put("departmentId", null);
            employeeData.put("departmentName", "Unassigned");
        }

        // Warehouse information (if applicable)
        if (employee.getWarehouse() != null) {
            employeeData.put("warehouseId", employee.getWarehouse().getId());
            employeeData.put("warehouseName", employee.getWarehouse().getName());
        } else {
            employeeData.put("warehouseId", null);
            employeeData.put("warehouseName", null);
        }

        return employeeData;
    }

//    @GetMapping("/drivers/byEquipmentType/{equipmentType}")
//    public ResponseEntity<List<Employee>> getDriversByEquipmentType(@PathVariable String equipmentType) {
//        return ResponseEntity.ok(employeeService.getDriversByEquipmentType(equipmentType));
//    }
//
//    @GetMapping("/drivers/{driverId}/validateForEquipment/{equipmentId}")
//    public ResponseEntity<Boolean> validateDriverForEquipment(
//            @PathVariable UUID driverId,
//            @PathVariable UUID equipmentId) {
//        try {
//            boolean isValid = employeeService.validateDriverForEquipment(driverId, equipmentId);
//            return ResponseEntity.ok(isValid);
//        } catch (RuntimeException e) {
//            return ResponseEntity.notFound().build();
//        }
//    }
}