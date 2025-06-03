package com.example.backend.services.hr;

import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.equipment.EquipmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class EmployeeService {

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private EquipmentRepository equipmentRepository;

    public List<Employee> getWarehouseWorkers() {
        return employeeRepository.findByJobPositionName("Warehouse Worker");
    }

    public List<Employee> getWarehouseManagers() {
        return employeeRepository.findByJobPositionName("Warehouse Manager");
}

    public List<Employee> getDrivers() {
        return employeeRepository.findByJobPositionName("Driver");

    }

    public List<Employee> getTechnicians() {
        return employeeRepository.findByJobPositionName("Technician");
    }

    public List<Employee> getEmployees() {
        return employeeRepository.findAll();
    }

    /**
     * Get employees by contract type
     * @param contractType The contract type (HOURLY, DAILY, MONTHLY)
     * @return List of employees with the specified contract type
     * @throws IllegalArgumentException if contractType is invalid
     */
    public List<Employee> getEmployeesByContractType(String contractType) {
        try {
            // Validate and convert contract type
            JobPosition.ContractType contractTypeEnum = JobPosition.ContractType.valueOf(contractType.toUpperCase());

            // Use repository method to find employees by contract type
            return employeeRepository.findByJobPositionContractType(contractTypeEnum);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid contract type: " + contractType +
                    ". Valid types are: HOURLY, DAILY, MONTHLY");
        }
    }
    // In your existing EmployeeService.java file, add these methods:

//    public List<Employee> getDriversByEquipmentType(String equipmentType) {
//        String driverPositionName = equipmentType + " Driver";
//        return employeeRepository.findByJobPositionName(driverPositionName);
//    }
//
//    public boolean validateDriverForEquipment(UUID driverId, UUID equipmentId) {
//        Employee driver = employeeRepository.findById(driverId)
//                .orElseThrow(() -> new RuntimeException("Driver not found"));
//
//        Equipment equipment = equipmentRepository.findById(equipmentId)
//                .orElseThrow(() -> new RuntimeException("Equipment not found"));
//
//        return equipment.isDriverCompatible(driver);
//    }

}