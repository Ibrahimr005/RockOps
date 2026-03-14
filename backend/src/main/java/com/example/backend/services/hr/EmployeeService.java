package com.example.backend.services.hr;

import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.payroll.EmployeePayroll;
import com.example.backend.models.payroll.PaymentType;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.repositories.payroll.EmployeePayrollRepository;
import com.example.backend.repositories.payroll.PaymentTypeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class EmployeeService {

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private PaymentTypeRepository paymentTypeRepository;

    @Autowired
    private EmployeePayrollRepository employeePayrollRepository;

    @Autowired
    @Lazy
    private VacationBalanceService vacationBalanceService;

    @Transactional(readOnly = true)
    public List<Employee> getWarehouseWorkers() {
        return employeeRepository.findByJobPositionName("Warehouse Worker");
    }

    @Transactional(readOnly = true)
    public List<Employee> getWarehouseManagers() {
        return employeeRepository.findByJobPositionName("Warehouse Manager");
}

    @Transactional(readOnly = true)
    public List<Employee> getDrivers() {
        return employeeRepository.findByJobPositionName("Driver");

    }

    @Transactional(readOnly = true)
    public List<Employee> getTechnicians() {
        return employeeRepository.findByJobPositionName("Technician");
    }

    @Transactional(readOnly = true)
    public List<Employee> getEmployeesBySiteId(UUID siteId) {
        return employeeRepository.findBySiteId(siteId);
    }

    /**
     * Get technicians by site ID
     * @param siteId The site ID to filter technicians by
     * @return List of technicians assigned to the specified site
     */
    @Transactional(readOnly = true)
    public List<Employee> getTechniciansBySite(UUID siteId) {
        if (siteId == null) {
            // If no site ID provided, return all technicians
            return getTechnicians();
        }
        
        // Get all technicians first, then filter by site
        List<Employee> allTechnicians = employeeRepository.findByJobPositionName("Technician");
        return allTechnicians.stream()
                .filter(employee -> employee.getSite() != null && employee.getSite().getId().equals(siteId))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Employee> getEmployees() {
        return employeeRepository.findAll();
    }

    /**
     * Get employee by ID
     * @param id Employee ID
     * @return Employee or null if not found
     */
    @Transactional(readOnly = true)
    public Employee getEmployeeById(UUID id) {
        return employeeRepository.findById(id).orElse(null);
    }

    /**
     * Save/update employee
     * @param employee Employee to save
     * @return Saved employee
     */
    public Employee saveEmployee(Employee employee) {
        Employee saved = employeeRepository.save(employee);

        // Sync vacation balance when employee has a job position
        if (saved.getJobPosition() != null && "ACTIVE".equalsIgnoreCase(saved.getStatus())) {
            try {
                vacationBalanceService.updateAllocationForEmployee(saved.getId());
            } catch (Exception e) {
                // Don't fail the save if vacation sync fails
                System.err.println("Warning: Failed to sync vacation balance for employee " + saved.getId() + ": " + e.getMessage());
            }
        }

        return saved;
    }

    /**
     * Get employees by contract type
     * @param contractType The contract type (HOURLY, DAILY, MONTHLY)
     * @return List of employees with the specified contract type
     * @throws IllegalArgumentException if contractType is invalid
     */
    @Transactional(readOnly = true)
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

    public PaymentType getPaymentTypeById(UUID paymentTypeId) {
        return paymentTypeRepository.findById(paymentTypeId)
                .orElseThrow(() -> new RuntimeException("Payment type not found"));
    }

    public List<EmployeePayroll> findEditablePayrollsByEmployeeId(UUID employeeId) {
        return employeePayrollRepository.findEditableByEmployeeId(employeeId);
    }

    public EmployeePayroll saveEmployeePayroll(EmployeePayroll employeePayroll) {
        return employeePayrollRepository.save(employeePayroll);
    }
}