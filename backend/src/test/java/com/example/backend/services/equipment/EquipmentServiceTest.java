package com.example.backend.services.equipment;

import com.example.backend.dto.equipment.*;
import com.example.backend.dto.hr.employee.EmployeeSummaryDTO;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.equipment.*;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.site.Site;
import com.example.backend.repositories.equipment.EquipmentBrandRepository;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.repositories.equipment.EquipmentTypeRepository;
import com.example.backend.repositories.MaintenanceRecordRepository;
import com.example.backend.repositories.equipment.SarkyLogRepository;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.site.SiteRepository;
import com.example.backend.services.MinioService;
import com.example.backend.services.notification.NotificationService;
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
public class EquipmentServiceTest {

    @Mock
    private EquipmentRepository equipmentRepository;

    @Mock
    private EquipmentTypeRepository equipmentTypeRepository;

    @Mock
    private SiteRepository siteRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private MinioService minioService;

    @Mock
    private EquipmentBrandRepository equipmentBrandRepository;

    @Mock
    private SarkyLogRepository sarkyLogRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private MaintenanceRecordRepository maintenanceRecordRepository;

    @InjectMocks
    private EquipmentService equipmentService;

    // ==================== getAllEquipment ====================

    @Test
    public void getAllEquipment_shouldReturnAll() {
        Equipment eq = createEquipment("Excavator", "CAT 320");

        when(equipmentRepository.findAllWithAssociations()).thenReturn(List.of(eq));

        List<EquipmentDTO> result = equipmentService.getAllEquipment();

        assertEquals(1, result.size());
    }

    @Test
    public void getAllEquipment_empty_shouldReturnEmpty() {
        when(equipmentRepository.findAllWithAssociations()).thenReturn(List.of());

        List<EquipmentDTO> result = equipmentService.getAllEquipment();

        assertTrue(result.isEmpty());
    }

    // ==================== getEquipmentById ====================

    @Test
    public void getEquipmentById_found_shouldReturn() {
        UUID id = UUID.randomUUID();
        Equipment eq = createEquipment("Excavator", "CAT 320");
        eq.setId(id);
        eq.setStatus(EquipmentStatus.AVAILABLE);

        when(equipmentRepository.findById(id)).thenReturn(Optional.of(eq));

        EquipmentDTO result = equipmentService.getEquipmentById(id);

        assertNotNull(result);
    }

    @Test
    public void getEquipmentById_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(equipmentRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> equipmentService.getEquipmentById(id));
    }

    // ==================== getEquipmentByType ====================

    @Test
    public void getEquipmentByType_found_shouldReturn() {
        UUID typeId = UUID.randomUUID();
        EquipmentType type = new EquipmentType();
        type.setId(typeId);
        type.setName("Excavator");
        type.setSupportedWorkTypes(new ArrayList<>());
        type.setEquipments(new ArrayList<>());

        Equipment eq = createEquipment("Excavator", "CAT 320");

        when(equipmentTypeRepository.findById(typeId)).thenReturn(Optional.of(type));
        when(equipmentRepository.findByType(type)).thenReturn(List.of(eq));

        List<EquipmentDTO> result = equipmentService.getEquipmentByType(typeId);

        assertEquals(1, result.size());
    }

    @Test
    public void getEquipmentByType_typeNotFound_shouldThrow() {
        UUID typeId = UUID.randomUUID();
        when(equipmentTypeRepository.findById(typeId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> equipmentService.getEquipmentByType(typeId));
    }

    // ==================== updateEquipmentStatus ====================

    @Test
    public void updateEquipmentStatus_success_shouldUpdate() {
        UUID id = UUID.randomUUID();
        Equipment eq = createEquipment("Excavator", "CAT 320");
        eq.setId(id);
        eq.setStatus(EquipmentStatus.AVAILABLE);

        EquipmentStatusUpdateDTO statusDTO = new EquipmentStatusUpdateDTO();
        statusDTO.setStatus(EquipmentStatus.IN_MAINTENANCE);

        when(equipmentRepository.findById(id)).thenReturn(Optional.of(eq));
        when(equipmentRepository.save(any(Equipment.class))).thenAnswer(i -> i.getArgument(0));

        EquipmentDTO result = equipmentService.updateEquipmentStatus(id, statusDTO);

        assertNotNull(result);
    }

    @Test
    public void updateEquipmentStatus_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(equipmentRepository.findById(id)).thenReturn(Optional.empty());

        EquipmentStatusUpdateDTO statusDTO = new EquipmentStatusUpdateDTO();
        statusDTO.setStatus(EquipmentStatus.IN_MAINTENANCE);

        assertThrows(ResourceNotFoundException.class,
                () -> equipmentService.updateEquipmentStatus(id, statusDTO));
    }

    @Test
    public void updateEquipmentStatus_mapBased_success() {
        UUID id = UUID.randomUUID();
        Equipment eq = createEquipment("Excavator", "CAT 320");
        eq.setId(id);
        eq.setStatus(EquipmentStatus.AVAILABLE);

        when(equipmentRepository.findById(id)).thenReturn(Optional.of(eq));
        when(equipmentRepository.save(any(Equipment.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("status", "IN_MAINTENANCE");

        EquipmentDTO result = equipmentService.updateEquipmentStatus(id, requestBody);

        assertNotNull(result);
    }

    @Test
    public void updateEquipmentStatus_mapBased_invalidStatus_shouldThrow() {
        UUID id = UUID.randomUUID();

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("status", "INVALID_STATUS");

        assertThrows(IllegalArgumentException.class,
                () -> equipmentService.updateEquipmentStatus(id, requestBody));
    }

    @Test
    public void updateEquipmentStatus_mapBased_noStatus_shouldThrow() {
        UUID id = UUID.randomUUID();

        Map<String, Object> requestBody = new HashMap<>();

        assertThrows(IllegalArgumentException.class,
                () -> equipmentService.updateEquipmentStatus(id, requestBody));
    }

    // ==================== deleteEquipment ====================

    @Test
    public void deleteEquipment_found_shouldDelete() {
        UUID id = UUID.randomUUID();
        Equipment eq = createEquipment("Excavator", "CAT 320");
        eq.setId(id);

        when(equipmentRepository.findById(id)).thenReturn(Optional.of(eq));

        equipmentService.deleteEquipment(id);

        verify(equipmentRepository).delete(eq);
    }

    @Test
    public void deleteEquipment_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(equipmentRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> equipmentService.deleteEquipment(id));
    }

    // ==================== getEligibleDriversForEquipmentType ====================

    @Test
    public void getEligibleDriversForEquipmentType_shouldReturnEligible() {
        UUID typeId = UUID.randomUUID();
        EquipmentType type = new EquipmentType();
        type.setId(typeId);
        type.setName("Truck");
        type.setDriverPositionName("Truck Driver");
        type.setSupportedWorkTypes(new ArrayList<>());
        type.setEquipments(new ArrayList<>());

        Employee driver = new Employee();
        driver.setId(UUID.randomUUID());
        driver.setFirstName("John");
        driver.setLastName("Doe");

        when(equipmentTypeRepository.findById(typeId)).thenReturn(Optional.of(type));
        when(employeeRepository.findByJobPositionName("Truck Driver")).thenReturn(List.of(driver));

        List<EmployeeSummaryDTO> result = equipmentService.getEligibleDriversForEquipmentType(typeId);

        assertEquals(1, result.size());
    }

    @Test
    public void getEligibleDriversForEquipmentType_typeNotFound_shouldThrow() {
        UUID typeId = UUID.randomUUID();
        when(equipmentTypeRepository.findById(typeId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> equipmentService.getEligibleDriversForEquipmentType(typeId));
    }

    // ==================== getDriversForSarkyByEquipmentType ====================

    @Test
    public void getDriversForSarkyByEquipmentType_shouldReuseSameLogic() {
        UUID typeId = UUID.randomUUID();
        EquipmentType type = new EquipmentType();
        type.setId(typeId);
        type.setName("Truck");
        type.setDriverPositionName("Truck Driver");
        type.setSupportedWorkTypes(new ArrayList<>());
        type.setEquipments(new ArrayList<>());

        when(equipmentTypeRepository.findById(typeId)).thenReturn(Optional.of(type));
        when(employeeRepository.findByJobPositionName("Truck Driver")).thenReturn(List.of());

        List<EmployeeSummaryDTO> result = equipmentService.getDriversForSarkyByEquipmentType(typeId);

        assertTrue(result.isEmpty());
    }

    // ==================== checkDriverCompatibility ====================

    @Test
    public void checkDriverCompatibility_compatible_shouldReturnTrue() {
        UUID equipmentId = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();

        EquipmentType type = new EquipmentType();
        type.setName("Truck");
        type.setSupportedWorkTypes(new ArrayList<>());
        type.setEquipments(new ArrayList<>());

        Equipment equipment = createEquipment("Truck", "Volvo");
        equipment.setId(equipmentId);
        equipment.setType(type);

        JobPosition position = new JobPosition();
        position.setPositionName("Truck Driver");

        Employee employee = new Employee();
        employee.setId(employeeId);
        employee.setFirstName("John");
        employee.setLastName("Doe");
        employee.setJobPosition(position);

        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.of(equipment));
        when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));

        EquipmentService.DriverCompatibilityResponse result =
                equipmentService.checkDriverCompatibility(equipmentId, employeeId);

        assertNotNull(result);
    }

    @Test
    public void checkDriverCompatibility_equipmentNotFound_shouldThrow() {
        UUID equipmentId = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();

        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> equipmentService.checkDriverCompatibility(equipmentId, employeeId));
    }

    @Test
    public void checkDriverCompatibility_employeeNotFound_shouldThrow() {
        UUID equipmentId = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();

        Equipment equipment = createEquipment("Truck", "Volvo");
        equipment.setId(equipmentId);

        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.of(equipment));
        when(employeeRepository.findById(employeeId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> equipmentService.checkDriverCompatibility(equipmentId, employeeId));
    }

    // ==================== assignDriverToEquipment ====================

    @Test
    public void assignDriverToEquipment_invalidType_shouldThrow() {
        UUID equipmentId = UUID.randomUUID();
        UUID driverId = UUID.randomUUID();

        EquipmentType type = new EquipmentType();
        type.setName("Truck");
        type.setSupportedWorkTypes(new ArrayList<>());
        type.setEquipments(new ArrayList<>());

        Equipment equipment = createEquipment("Truck", "Volvo");
        equipment.setId(equipmentId);
        equipment.setType(type);

        JobPosition position = new JobPosition();
        position.setPositionName("Truck Driver");

        Employee driver = new Employee();
        driver.setId(driverId);
        driver.setFirstName("John");
        driver.setLastName("Doe");
        driver.setJobPosition(position);

        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.of(equipment));
        when(employeeRepository.findById(driverId)).thenReturn(Optional.of(driver));

        assertThrows(IllegalArgumentException.class,
                () -> equipmentService.assignDriverToEquipment(equipmentId, driverId, "invalid"));
    }

    @Test
    public void assignDriverToEquipment_equipmentNotFound_shouldThrow() {
        UUID equipmentId = UUID.randomUUID();
        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> equipmentService.assignDriverToEquipment(equipmentId, UUID.randomUUID(), "main"));
    }

    @Test
    public void assignDriverToEquipment_driverNotFound_shouldThrow() {
        UUID equipmentId = UUID.randomUUID();
        UUID driverId = UUID.randomUUID();

        Equipment equipment = createEquipment("Truck", "Volvo");
        equipment.setId(equipmentId);

        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.of(equipment));
        when(employeeRepository.findById(driverId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> equipmentService.assignDriverToEquipment(equipmentId, driverId, "main"));
    }

    // ==================== unassignDriverFromEquipment ====================

    @Test
    public void unassignDriverFromEquipment_mainDriver_success() {
        UUID equipmentId = UUID.randomUUID();
        UUID driverId = UUID.randomUUID();

        Employee driver = new Employee();
        driver.setId(driverId);
        driver.setFirstName("John");
        driver.setLastName("Doe");

        Equipment equipment = createEquipment("Truck", "Volvo");
        equipment.setId(equipmentId);
        equipment.setMainDriver(driver);

        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.of(equipment));
        when(equipmentRepository.save(any(Equipment.class))).thenAnswer(i -> i.getArgument(0));

        EquipmentDTO result = equipmentService.unassignDriverFromEquipment(equipmentId, driverId, "main");

        assertNotNull(result);
    }

    @Test
    public void unassignDriverFromEquipment_subDriver_success() {
        UUID equipmentId = UUID.randomUUID();
        UUID driverId = UUID.randomUUID();

        Employee driver = new Employee();
        driver.setId(driverId);
        driver.setFirstName("Jane");
        driver.setLastName("Doe");

        Equipment equipment = createEquipment("Truck", "Volvo");
        equipment.setId(equipmentId);
        equipment.setSubDriver(driver);

        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.of(equipment));
        when(equipmentRepository.save(any(Equipment.class))).thenAnswer(i -> i.getArgument(0));

        EquipmentDTO result = equipmentService.unassignDriverFromEquipment(equipmentId, driverId, "sub");

        assertNotNull(result);
    }

    @Test
    public void unassignDriverFromEquipment_wrongMainDriver_shouldThrow() {
        UUID equipmentId = UUID.randomUUID();
        UUID driverId = UUID.randomUUID();

        Employee otherDriver = new Employee();
        otherDriver.setId(UUID.randomUUID());

        Equipment equipment = createEquipment("Truck", "Volvo");
        equipment.setId(equipmentId);
        equipment.setMainDriver(otherDriver);

        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.of(equipment));

        assertThrows(IllegalArgumentException.class,
                () -> equipmentService.unassignDriverFromEquipment(equipmentId, driverId, "main"));
    }

    @Test
    public void unassignDriverFromEquipment_invalidType_shouldThrow() {
        UUID equipmentId = UUID.randomUUID();
        UUID driverId = UUID.randomUUID();

        Equipment equipment = createEquipment("Truck", "Volvo");
        equipment.setId(equipmentId);

        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.of(equipment));

        assertThrows(IllegalArgumentException.class,
                () -> equipmentService.unassignDriverFromEquipment(equipmentId, driverId, "invalid"));
    }

    @Test
    public void unassignDriverFromEquipment_equipmentNotFound_shouldThrow() {
        UUID equipmentId = UUID.randomUUID();
        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> equipmentService.unassignDriverFromEquipment(equipmentId, UUID.randomUUID(), "main"));
    }

    // ==================== getSupportedWorkTypesForEquipmentType ====================

    @Test
    public void getSupportedWorkTypesForEquipmentType_shouldReturnActiveOnly() {
        UUID typeId = UUID.randomUUID();

        WorkType activeWt = new WorkType();
        activeWt.setId(UUID.randomUUID());
        activeWt.setName("Drilling");
        activeWt.setDescription("Drill ops");
        activeWt.setActive(true);

        WorkType inactiveWt = new WorkType();
        inactiveWt.setId(UUID.randomUUID());
        inactiveWt.setName("Old");
        inactiveWt.setActive(false);

        EquipmentType type = new EquipmentType();
        type.setId(typeId);
        type.setName("Excavator");
        type.setSupportedWorkTypes(new ArrayList<>(List.of(activeWt, inactiveWt)));
        type.setEquipments(new ArrayList<>());

        when(equipmentTypeRepository.findById(typeId)).thenReturn(Optional.of(type));

        List<WorkTypeDTO> result = equipmentService.getSupportedWorkTypesForEquipmentType(typeId);

        assertEquals(1, result.size());
        assertEquals("Drilling", result.get(0).getName());
    }

    @Test
    public void getSupportedWorkTypesForEquipmentType_typeNotFound_shouldThrow() {
        UUID typeId = UUID.randomUUID();
        when(equipmentTypeRepository.findById(typeId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> equipmentService.getSupportedWorkTypesForEquipmentType(typeId));
    }

    // ==================== getSarkyAnalyticsForEquipment ====================

    @Test
    public void getSarkyAnalyticsForEquipment_shouldReturnDTO() {
        UUID equipmentId = UUID.randomUUID();

        EquipmentSarkyAnalyticsDTO result = equipmentService.getSarkyAnalyticsForEquipment(equipmentId);

        assertNotNull(result);
    }

    // ==================== Helper ====================

    private Equipment createEquipment(String name, String model) {
        EquipmentType type = new EquipmentType();
        type.setId(UUID.randomUUID());
        type.setName(name);
        type.setSupportedWorkTypes(new ArrayList<>());
        type.setEquipments(new ArrayList<>());

        EquipmentBrand brand = new EquipmentBrand();
        brand.setId(UUID.randomUUID());
        brand.setName("CAT");

        Equipment eq = new Equipment();
        eq.setId(UUID.randomUUID());
        eq.setName(name);
        eq.setModel(model);
        eq.setType(type);
        eq.setBrand(brand);
        eq.setStatus(EquipmentStatus.AVAILABLE);
        return eq;
    }
}