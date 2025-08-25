package com.example.backend.services.warehouse;

import com.example.backend.models.user.Role;
import com.example.backend.models.user.User;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.models.warehouse.WarehouseEmployee;
import com.example.backend.repositories.user.UserRepository;
import com.example.backend.repositories.warehouse.WarehouseEmployeeRepository;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.backend.dto.warehouse.WarehouseAssignmentDTO;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class WarehouseEmployeeService {

    @Autowired
    private WarehouseEmployeeRepository warehouseEmployeeRepository;

    @Autowired
    private WarehouseRepository warehouseRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * Assign a warehouse employee to a warehouse
     */
    public WarehouseEmployee assignEmployeeToWarehouse(UUID employeeId, UUID warehouseId, String assignedBy) {
        System.out.println("Assigning employee " + employeeId + " to warehouse " + warehouseId + " by " + assignedBy);

        // Validate employee exists and has correct role
        User employee = userRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found with ID: " + employeeId));

        if (employee.getRole() != Role.WAREHOUSE_EMPLOYEE) {
            throw new RuntimeException("User must have WAREHOUSE_EMPLOYEE role to be assigned to a warehouse");
        }

        // Validate warehouse exists
        Warehouse warehouse = warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new RuntimeException("Warehouse not found with ID: " + warehouseId));

        // Check if assignment already exists
        if (warehouseEmployeeRepository.existsByUserIdAndWarehouseId(employeeId, warehouseId)) {
            throw new RuntimeException("Employee is already assigned to this warehouse");
        }

        // Create assignment
        WarehouseEmployee assignment = WarehouseEmployee.builder()
                .user(employee)
                .warehouse(warehouse)
                .assignedBy(assignedBy)
                .assignedAt(LocalDateTime.now())
                .build();

        WarehouseEmployee saved = warehouseEmployeeRepository.save(assignment);
        System.out.println("Successfully assigned employee to warehouse. Assignment ID: " + saved.getId());

        return saved;
    }

    /**
     * Unassign a warehouse employee from a warehouse
     */
    public void unassignEmployeeFromWarehouse(UUID employeeId, UUID warehouseId) {
        System.out.println("Unassigning employee " + employeeId + " from warehouse " + warehouseId);

        WarehouseEmployee assignment = warehouseEmployeeRepository
                .findByUserIdAndWarehouseId(employeeId, warehouseId)
                .orElseThrow(() -> new RuntimeException("No assignment found for this employee and warehouse"));

        warehouseEmployeeRepository.delete(assignment);
        System.out.println("Successfully unassigned employee from warehouse");
    }

    /**
     * Get all warehouses assigned to an employee
     */
    public List<Warehouse> getWarehousesForEmployee(UUID employeeId) {
        System.out.println("Getting warehouses for employee: " + employeeId);

        List<WarehouseEmployee> assignments = warehouseEmployeeRepository.findByUserIdWithWarehouse(employeeId);
        List<Warehouse> warehouses = assignments.stream()
                .map(WarehouseEmployee::getWarehouse)
                .toList();

        System.out.println("Found " + warehouses.size() + " warehouses for employee");
        return warehouses;
    }

    /**
     * Get all employee assignments for a warehouse (with assignment details)
     */
    public List<WarehouseEmployee> getEmployeeAssignmentsForWarehouse(UUID warehouseId) {
        System.out.println("Getting employee assignments for warehouse: " + warehouseId);

        List<WarehouseEmployee> assignments = warehouseEmployeeRepository.findByWarehouseIdWithUser(warehouseId);
        System.out.println("Found " + assignments.size() + " employee assignments for warehouse");

        return assignments;
    }

    /**
     * Get all employees assigned to a warehouse (just the users)
     */
    public List<User> getEmployeesForWarehouse(UUID warehouseId) {
        System.out.println("Getting employees for warehouse: " + warehouseId);

        List<WarehouseEmployee> assignments = getEmployeeAssignmentsForWarehouse(warehouseId);
        List<User> employees = assignments.stream()
                .map(WarehouseEmployee::getUser)
                .toList();

        System.out.println("Found " + employees.size() + " employees for warehouse");
        return employees;
    }

    /**
     * Get all warehouse employees (users with WAREHOUSE_EMPLOYEE role)
     */
    public List<User> getAllWarehouseEmployees() {
        System.out.println("Getting all warehouse employees");

        List<User> employees = userRepository.findByRole(Role.WAREHOUSE_EMPLOYEE);
        System.out.println("Found " + employees.size() + " warehouse employees");

        return employees;
    }

    /**
     * Check if employee has access to warehouse
     */
    public boolean hasWarehouseAccess(UUID employeeId, UUID warehouseId) {
        boolean hasAccess = warehouseEmployeeRepository.existsByUserIdAndWarehouseId(employeeId, warehouseId);
        System.out.println("Employee " + employeeId + " has access to warehouse " + warehouseId + ": " + hasAccess);

        return hasAccess;
    }

    /**
     * Get warehouse IDs that an employee has access to
     */
    public List<UUID> getAccessibleWarehouseIds(UUID employeeId) {
        System.out.println("Getting accessible warehouse IDs for employee: " + employeeId);

        List<UUID> warehouseIds = warehouseEmployeeRepository.findWarehouseIdsByUserId(employeeId);
        System.out.println("Employee has access to " + warehouseIds.size() + " warehouses");

        return warehouseIds;
    }

    /**
     * Get assignment details for a specific employee and warehouse
     */
    public WarehouseEmployee getAssignmentDetails(UUID employeeId, UUID warehouseId) {
        System.out.println("Getting assignment details for employee " + employeeId + " and warehouse " + warehouseId);

        return warehouseEmployeeRepository.findByUserIdAndWarehouseId(employeeId, warehouseId)
                .orElseThrow(() -> new RuntimeException("Assignment not found for employee and warehouse"));
    }

    /**
     * Get all assignments for an employee with details
     */
    public List<WarehouseEmployee> getEmployeeAssignments(UUID employeeId) {
        System.out.println("Getting all assignments for employee: " + employeeId);

        List<WarehouseEmployee> assignments = warehouseEmployeeRepository.findByUserIdWithWarehouse(employeeId);
        System.out.println("Found " + assignments.size() + " assignments for employee");

        return assignments;
    }

    /**
     * Check if employee is assigned to any warehouse
     */
    public boolean isEmployeeAssignedToAnyWarehouse(UUID employeeId) {
        List<WarehouseEmployee> assignments = warehouseEmployeeRepository.findByUserId(employeeId);
        boolean isAssigned = !assignments.isEmpty();

        System.out.println("Employee " + employeeId + " is assigned to warehouses: " + isAssigned);
        return isAssigned;
    }

    /**
     * Get count of employees assigned to a warehouse
     */
    public long getEmployeeCountForWarehouse(UUID warehouseId) {
        List<WarehouseEmployee> assignments = warehouseEmployeeRepository.findByWarehouseId(warehouseId);
        long count = assignments.size();

        System.out.println("Warehouse " + warehouseId + " has " + count + " assigned employees");
        return count;
    }

    /**
     * Get count of warehouses an employee is assigned to
     */
    public long getWarehouseCountForEmployee(UUID employeeId) {
        List<WarehouseEmployee> assignments = warehouseEmployeeRepository.findByUserId(employeeId);
        long count = assignments.size();

        System.out.println("Employee " + employeeId + " is assigned to " + count + " warehouses");
        return count;
    }

    public List<WarehouseAssignmentDTO> getEmployeeAssignmentDTOsForWarehouse(UUID warehouseId) {
        System.out.println("Getting employee assignment DTOs for warehouse: " + warehouseId);

        List<WarehouseEmployee> assignments = warehouseEmployeeRepository.findByWarehouseIdWithUser(warehouseId);

        List<WarehouseAssignmentDTO> dtos = assignments.stream()
                .map(assignment -> {
                    System.out.println("Converting assignment: " + assignment.getId() +
                            ", assignedAt: " + assignment.getAssignedAt() +
                            ", assignedBy: " + assignment.getAssignedBy());

                    return new WarehouseAssignmentDTO(
                            assignment.getId(),
                            assignment.getUser().getId(),
                            assignment.getUser().getFirstName(),
                            assignment.getUser().getLastName(),
                            assignment.getUser().getUsername(),
                            assignment.getUser().getRole().toString(),
                            assignment.getAssignedAt(),
                            assignment.getAssignedBy()
                    );
                })
                .toList();

        System.out.println("Created " + dtos.size() + " DTOs");
        return dtos;
    }


}