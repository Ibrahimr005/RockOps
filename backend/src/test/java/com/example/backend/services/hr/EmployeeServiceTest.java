package com.example.backend.services.hr;

import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.site.Site;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.equipment.EquipmentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class EmployeeServiceTest {

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private EquipmentRepository equipmentRepository;

    @Mock
    private VacationBalanceService vacationBalanceService;

    @InjectMocks
    private EmployeeService employeeService;

    // ==================== getWarehouseWorkers ====================

    @Test
    public void getWarehouseWorkers_shouldReturnWorkers() {
        Employee emp = createEmployee("John", "Doe");
        when(employeeRepository.findByJobPositionName("Warehouse Worker")).thenReturn(List.of(emp));

        List<Employee> result = employeeService.getWarehouseWorkers();

        assertEquals(1, result.size());
        verify(employeeRepository).findByJobPositionName("Warehouse Worker");
    }

    @Test
    public void getWarehouseWorkers_empty_shouldReturnEmpty() {
        when(employeeRepository.findByJobPositionName("Warehouse Worker")).thenReturn(List.of());

        List<Employee> result = employeeService.getWarehouseWorkers();

        assertTrue(result.isEmpty());
    }

    // ==================== getWarehouseManagers ====================

    @Test
    public void getWarehouseManagers_shouldReturnManagers() {
        Employee emp = createEmployee("Jane", "Smith");
        when(employeeRepository.findByJobPositionName("Warehouse Manager")).thenReturn(List.of(emp));

        List<Employee> result = employeeService.getWarehouseManagers();

        assertEquals(1, result.size());
    }

    // ==================== getDrivers ====================

    @Test
    public void getDrivers_shouldReturnDrivers() {
        Employee emp = createEmployee("Bob", "Driver");
        when(employeeRepository.findByJobPositionName("Driver")).thenReturn(List.of(emp));

        List<Employee> result = employeeService.getDrivers();

        assertEquals(1, result.size());
    }

    // ==================== getTechnicians ====================

    @Test
    public void getTechnicians_shouldReturnTechnicians() {
        Employee emp = createEmployee("Tech", "Guy");
        when(employeeRepository.findByJobPositionName("Technician")).thenReturn(List.of(emp));

        List<Employee> result = employeeService.getTechnicians();

        assertEquals(1, result.size());
    }

    // ==================== getEmployeesBySiteId ====================

    @Test
    public void getEmployeesBySiteId_shouldReturnFiltered() {
        UUID siteId = UUID.randomUUID();
        Employee emp = createEmployee("Site", "Worker");
        when(employeeRepository.findBySiteId(siteId)).thenReturn(List.of(emp));

        List<Employee> result = employeeService.getEmployeesBySiteId(siteId);

        assertEquals(1, result.size());
    }

    // ==================== getTechniciansBySite ====================

    @Test
    public void getTechniciansBySite_withSiteId_shouldFilterBySite() {
        UUID siteId = UUID.randomUUID();
        Site site = new Site();
        site.setId(siteId);

        Employee techOnSite = createEmployee("Tech", "OnSite");
        techOnSite.setSite(site);

        Employee techOtherSite = createEmployee("Tech", "OtherSite");
        Site otherSite = new Site();
        otherSite.setId(UUID.randomUUID());
        techOtherSite.setSite(otherSite);

        when(employeeRepository.findByJobPositionName("Technician"))
                .thenReturn(List.of(techOnSite, techOtherSite));

        List<Employee> result = employeeService.getTechniciansBySite(siteId);

        assertEquals(1, result.size());
        assertEquals("OnSite", result.get(0).getLastName());
    }

    @Test
    public void getTechniciansBySite_nullSiteId_shouldReturnAll() {
        Employee tech = createEmployee("Tech", "All");
        when(employeeRepository.findByJobPositionName("Technician")).thenReturn(List.of(tech));

        List<Employee> result = employeeService.getTechniciansBySite(null);

        assertEquals(1, result.size());
    }

    @Test
    public void getTechniciansBySite_noSiteAssigned_shouldFilter() {
        UUID siteId = UUID.randomUUID();
        Employee techNoSite = createEmployee("Tech", "NoSite");
        techNoSite.setSite(null);

        when(employeeRepository.findByJobPositionName("Technician")).thenReturn(List.of(techNoSite));

        List<Employee> result = employeeService.getTechniciansBySite(siteId);

        assertTrue(result.isEmpty());
    }

    // ==================== getEmployees ====================

    @Test
    public void getEmployees_shouldReturnAll() {
        Employee emp = createEmployee("All", "Employees");
        when(employeeRepository.findAll()).thenReturn(List.of(emp));

        List<Employee> result = employeeService.getEmployees();

        assertEquals(1, result.size());
    }

    // ==================== getEmployeeById ====================

    @Test
    public void getEmployeeById_found_shouldReturn() {
        UUID id = UUID.randomUUID();
        Employee emp = createEmployee("Found", "Employee");
        when(employeeRepository.findById(id)).thenReturn(Optional.of(emp));

        Employee result = employeeService.getEmployeeById(id);

        assertNotNull(result);
    }

    @Test
    public void getEmployeeById_notFound_shouldReturnNull() {
        UUID id = UUID.randomUUID();
        when(employeeRepository.findById(id)).thenReturn(Optional.empty());

        Employee result = employeeService.getEmployeeById(id);

        assertNull(result);
    }

    // ==================== saveEmployee ====================

    @Test
    public void saveEmployee_activeWithJobPosition_shouldSyncVacation() {
        Employee emp = createEmployee("Save", "Test");
        emp.setStatus("ACTIVE");
        JobPosition jp = new JobPosition();
        jp.setId(UUID.randomUUID());
        emp.setJobPosition(jp);

        when(employeeRepository.save(emp)).thenReturn(emp);

        Employee result = employeeService.saveEmployee(emp);

        assertNotNull(result);
        verify(vacationBalanceService).updateAllocationForEmployee(emp.getId());
    }

    @Test
    public void saveEmployee_noJobPosition_shouldNotSyncVacation() {
        Employee emp = createEmployee("Save", "NoJP");
        emp.setStatus("ACTIVE");
        emp.setJobPosition(null);

        when(employeeRepository.save(emp)).thenReturn(emp);

        Employee result = employeeService.saveEmployee(emp);

        assertNotNull(result);
        verify(vacationBalanceService, never()).updateAllocationForEmployee(any());
    }

    @Test
    public void saveEmployee_inactiveStatus_shouldNotSyncVacation() {
        Employee emp = createEmployee("Save", "Inactive");
        emp.setStatus("INACTIVE");
        JobPosition jp = new JobPosition();
        jp.setId(UUID.randomUUID());
        emp.setJobPosition(jp);

        when(employeeRepository.save(emp)).thenReturn(emp);

        Employee result = employeeService.saveEmployee(emp);

        assertNotNull(result);
        verify(vacationBalanceService, never()).updateAllocationForEmployee(any());
    }

    @Test
    public void saveEmployee_vacationSyncFails_shouldStillReturn() {
        Employee emp = createEmployee("Save", "SyncFail");
        emp.setStatus("ACTIVE");
        JobPosition jp = new JobPosition();
        jp.setId(UUID.randomUUID());
        emp.setJobPosition(jp);

        when(employeeRepository.save(emp)).thenReturn(emp);
        doThrow(new RuntimeException("Vacation sync error"))
                .when(vacationBalanceService).updateAllocationForEmployee(emp.getId());

        Employee result = employeeService.saveEmployee(emp);

        assertNotNull(result);
    }

    // ==================== getEmployeesByContractType ====================

    @Test
    public void getEmployeesByContractType_valid_shouldReturn() {
        Employee emp = createEmployee("Monthly", "Worker");
        when(employeeRepository.findByJobPositionContractType(JobPosition.ContractType.MONTHLY))
                .thenReturn(List.of(emp));

        List<Employee> result = employeeService.getEmployeesByContractType("MONTHLY");

        assertEquals(1, result.size());
    }

    @Test
    public void getEmployeesByContractType_lowercase_shouldWork() {
        when(employeeRepository.findByJobPositionContractType(JobPosition.ContractType.HOURLY))
                .thenReturn(List.of());

        List<Employee> result = employeeService.getEmployeesByContractType("hourly");

        assertTrue(result.isEmpty());
    }

    @Test
    public void getEmployeesByContractType_invalid_shouldThrow() {
        assertThrows(IllegalArgumentException.class,
                () -> employeeService.getEmployeesByContractType("INVALID"));
    }

    // ==================== Helpers ====================

    private Employee createEmployee(String firstName, String lastName) {
        Employee emp = new Employee();
        emp.setId(UUID.randomUUID());
        emp.setFirstName(firstName);
        emp.setLastName(lastName);
        emp.setStatus("ACTIVE");
        return emp;
    }
}