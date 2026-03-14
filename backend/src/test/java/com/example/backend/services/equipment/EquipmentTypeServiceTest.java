package com.example.backend.services.equipment;

import com.example.backend.dto.equipment.EquipmentTypeDTO;
import com.example.backend.dto.equipment.WorkTypeDTO;
import com.example.backend.exceptions.ResourceConflictException;
import com.example.backend.exceptions.ResourceInUseException;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.equipment.EquipmentType;
import com.example.backend.models.equipment.WorkType;
import com.example.backend.models.hr.Department;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.repositories.equipment.EquipmentTypeRepository;
import com.example.backend.repositories.equipment.WorkTypeRepository;
import com.example.backend.repositories.hr.DepartmentRepository;
import com.example.backend.repositories.hr.JobPositionRepository;
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
public class EquipmentTypeServiceTest {

    @Mock
    private EquipmentTypeRepository equipmentTypeRepository;

    @Mock
    private WorkTypeRepository workTypeRepository;

    @Mock
    private DepartmentRepository departmentRepository;

    @Mock
    private JobPositionRepository jobPositionRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private EquipmentTypeService equipmentTypeService;

    // ==================== getAllEquipmentTypes ====================

    @Test
    public void getAllEquipmentTypes_shouldReturnAll() {
        EquipmentType et = createEquipmentType("Excavator", "Heavy digger", true);
        when(equipmentTypeRepository.findAll()).thenReturn(List.of(et));

        List<EquipmentTypeDTO> result = equipmentTypeService.getAllEquipmentTypes();

        assertEquals(1, result.size());
        assertEquals("Excavator", result.get(0).getName());
    }

    @Test
    public void getAllEquipmentTypes_empty_shouldReturnEmpty() {
        when(equipmentTypeRepository.findAll()).thenReturn(List.of());

        List<EquipmentTypeDTO> result = equipmentTypeService.getAllEquipmentTypes();

        assertTrue(result.isEmpty());
    }

    // ==================== getEquipmentTypeById ====================

    @Test
    public void getEquipmentTypeById_found_shouldReturn() {
        UUID id = UUID.randomUUID();
        EquipmentType et = createEquipmentType("Excavator", "Desc", true);
        et.setId(id);
        when(equipmentTypeRepository.findById(id)).thenReturn(Optional.of(et));

        EquipmentTypeDTO result = equipmentTypeService.getEquipmentTypeById(id);

        assertEquals("Excavator", result.getName());
    }

    @Test
    public void getEquipmentTypeById_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(equipmentTypeRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> equipmentTypeService.getEquipmentTypeById(id));
    }

    // ==================== getEquipmentTypeByName ====================

    @Test
    public void getEquipmentTypeByName_found_shouldReturn() {
        EquipmentType et = createEquipmentType("Bulldozer", "Desc", true);
        when(equipmentTypeRepository.findByName("Bulldozer")).thenReturn(Optional.of(et));

        EquipmentTypeDTO result = equipmentTypeService.getEquipmentTypeByName("Bulldozer");

        assertEquals("Bulldozer", result.getName());
    }

    @Test
    public void getEquipmentTypeByName_notFound_shouldThrow() {
        when(equipmentTypeRepository.findByName("Unknown")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> equipmentTypeService.getEquipmentTypeByName("Unknown"));
    }

    // ==================== createEquipmentType ====================

    @Test
    public void createEquipmentType_success_drivable_shouldCreateWithJobPosition() {
        EquipmentTypeDTO dto = new EquipmentTypeDTO();
        dto.setName("Truck");
        dto.setDescription("Transport vehicle");
        dto.setDrivable(true);

        Department logistics = new Department();
        logistics.setName("Logistics");

        when(equipmentTypeRepository.findByName("Truck")).thenReturn(Optional.empty());
        when(equipmentTypeRepository.save(any(EquipmentType.class))).thenAnswer(i -> {
            EquipmentType et = i.getArgument(0);
            et.setId(UUID.randomUUID());
            return et;
        });
        when(jobPositionRepository.findAll()).thenReturn(List.of());
        when(departmentRepository.findByName("Logistics")).thenReturn(Optional.of(logistics));
        when(jobPositionRepository.save(any(JobPosition.class))).thenAnswer(i -> {
            JobPosition jp = i.getArgument(0);
            jp.setId(UUID.randomUUID());
            return jp;
        });

        EquipmentTypeDTO result = equipmentTypeService.createEquipmentType(dto);

        assertNotNull(result.getId());
        assertEquals("Truck", result.getName());
        assertTrue(result.isDrivable());
        verify(jobPositionRepository).save(any(JobPosition.class));
    }

    @Test
    public void createEquipmentType_success_notDrivable_shouldNotCreateJobPosition() {
        EquipmentTypeDTO dto = new EquipmentTypeDTO();
        dto.setName("Generator");
        dto.setDescription("Power supply");
        dto.setDrivable(false);

        when(equipmentTypeRepository.findByName("Generator")).thenReturn(Optional.empty());
        when(equipmentTypeRepository.save(any(EquipmentType.class))).thenAnswer(i -> {
            EquipmentType et = i.getArgument(0);
            et.setId(UUID.randomUUID());
            return et;
        });

        EquipmentTypeDTO result = equipmentTypeService.createEquipmentType(dto);

        assertNotNull(result.getId());
        assertFalse(result.isDrivable());
        verify(jobPositionRepository, never()).save(any(JobPosition.class));
    }

    @Test
    public void createEquipmentType_duplicateName_shouldThrow() {
        EquipmentType existing = createEquipmentType("Excavator", "Existing", true);
        when(equipmentTypeRepository.findByName("Excavator")).thenReturn(Optional.of(existing));

        EquipmentTypeDTO dto = new EquipmentTypeDTO();
        dto.setName("Excavator");

        assertThrows(ResourceConflictException.class,
                () -> equipmentTypeService.createEquipmentType(dto));
    }

    // ==================== updateEquipmentType ====================

    @Test
    public void updateEquipmentType_success_shouldUpdate() {
        UUID id = UUID.randomUUID();
        EquipmentType existing = createEquipmentType("OldName", "OldDesc", true);
        existing.setId(id);

        when(equipmentTypeRepository.findById(id)).thenReturn(Optional.of(existing));
        when(equipmentTypeRepository.findByName("NewName")).thenReturn(Optional.empty());
        when(equipmentTypeRepository.save(any(EquipmentType.class))).thenAnswer(i -> i.getArgument(0));
        // For rename handling
        when(jobPositionRepository.findAll()).thenReturn(List.of());
        when(departmentRepository.findByName("Logistics")).thenReturn(Optional.of(new Department()));
        when(jobPositionRepository.save(any(JobPosition.class))).thenAnswer(i -> {
            JobPosition jp = i.getArgument(0);
            jp.setId(UUID.randomUUID());
            return jp;
        });

        EquipmentTypeDTO dto = new EquipmentTypeDTO();
        dto.setName("NewName");
        dto.setDescription("NewDesc");
        dto.setDrivable(true);

        EquipmentTypeDTO result = equipmentTypeService.updateEquipmentType(id, dto);

        assertEquals("NewName", result.getName());
        assertEquals("NewDesc", result.getDescription());
    }

    @Test
    public void updateEquipmentType_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(equipmentTypeRepository.findById(id)).thenReturn(Optional.empty());

        EquipmentTypeDTO dto = new EquipmentTypeDTO();
        dto.setName("Name");

        assertThrows(ResourceNotFoundException.class,
                () -> equipmentTypeService.updateEquipmentType(id, dto));
    }

    @Test
    public void updateEquipmentType_nameConflict_shouldThrow() {
        UUID id = UUID.randomUUID();
        EquipmentType existing = createEquipmentType("OldName", "Desc", true);
        existing.setId(id);

        EquipmentType conflicting = createEquipmentType("ConflictName", "Desc", true);
        conflicting.setId(UUID.randomUUID());

        when(equipmentTypeRepository.findById(id)).thenReturn(Optional.of(existing));
        when(equipmentTypeRepository.findByName("ConflictName")).thenReturn(Optional.of(conflicting));

        EquipmentTypeDTO dto = new EquipmentTypeDTO();
        dto.setName("ConflictName");

        assertThrows(ResourceConflictException.class,
                () -> equipmentTypeService.updateEquipmentType(id, dto));
    }

    @Test
    public void updateEquipmentType_sameName_shouldSucceed() {
        UUID id = UUID.randomUUID();
        EquipmentType existing = createEquipmentType("SameName", "OldDesc", true);
        existing.setId(id);

        when(equipmentTypeRepository.findById(id)).thenReturn(Optional.of(existing));
        when(equipmentTypeRepository.save(any(EquipmentType.class))).thenAnswer(i -> i.getArgument(0));

        EquipmentTypeDTO dto = new EquipmentTypeDTO();
        dto.setName("SameName");
        dto.setDescription("NewDesc");
        dto.setDrivable(true);

        EquipmentTypeDTO result = equipmentTypeService.updateEquipmentType(id, dto);

        assertEquals("NewDesc", result.getDescription());
    }

    @Test
    public void updateEquipmentType_becomesDrivable_shouldCreateJobPosition() {
        UUID id = UUID.randomUUID();
        EquipmentType existing = createEquipmentType("Pump", "Desc", false);
        existing.setId(id);

        Department logistics = new Department();
        logistics.setName("Logistics");

        when(equipmentTypeRepository.findById(id)).thenReturn(Optional.of(existing));
        when(equipmentTypeRepository.save(any(EquipmentType.class))).thenAnswer(i -> i.getArgument(0));
        when(jobPositionRepository.findAll()).thenReturn(List.of());
        when(departmentRepository.findByName("Logistics")).thenReturn(Optional.of(logistics));
        when(jobPositionRepository.save(any(JobPosition.class))).thenAnswer(i -> {
            JobPosition jp = i.getArgument(0);
            jp.setId(UUID.randomUUID());
            return jp;
        });

        EquipmentTypeDTO dto = new EquipmentTypeDTO();
        dto.setName("Pump");
        dto.setDescription("Desc");
        dto.setDrivable(true);

        equipmentTypeService.updateEquipmentType(id, dto);

        verify(jobPositionRepository).save(any(JobPosition.class));
    }

    @Test
    public void updateEquipmentType_becomesNotDrivable_shouldDeleteUnusedPosition() {
        UUID id = UUID.randomUUID();
        EquipmentType existing = createEquipmentType("Truck", "Desc", true);
        existing.setId(id);

        JobPosition position = new JobPosition();
        position.setPositionName("Truck Driver");
        position.setEmployees(new ArrayList<>());

        when(equipmentTypeRepository.findById(id)).thenReturn(Optional.of(existing));
        when(equipmentTypeRepository.save(any(EquipmentType.class))).thenAnswer(i -> i.getArgument(0));
        when(jobPositionRepository.findAll()).thenReturn(List.of(position));

        EquipmentTypeDTO dto = new EquipmentTypeDTO();
        dto.setName("Truck");
        dto.setDescription("Desc");
        dto.setDrivable(false);

        equipmentTypeService.updateEquipmentType(id, dto);

        verify(jobPositionRepository).delete(position);
    }

    // ==================== deleteEquipmentType ====================

    @Test
    public void deleteEquipmentType_noEquipments_shouldDelete() {
        UUID id = UUID.randomUUID();
        EquipmentType et = createEquipmentType("Excavator", "Desc", true);
        et.setId(id);
        et.setEquipments(new ArrayList<>());

        when(equipmentTypeRepository.findById(id)).thenReturn(Optional.of(et));

        equipmentTypeService.deleteEquipmentType(id);

        verify(equipmentTypeRepository).delete(et);
    }

    @Test
    public void deleteEquipmentType_hasEquipments_shouldThrow() {
        UUID id = UUID.randomUUID();
        EquipmentType et = createEquipmentType("Excavator", "Desc", true);
        et.setId(id);
        Equipment equipment = new Equipment();
        et.setEquipments(List.of(equipment));

        when(equipmentTypeRepository.findById(id)).thenReturn(Optional.of(et));

        assertThrows(ResourceInUseException.class,
                () -> equipmentTypeService.deleteEquipmentType(id));
        verify(equipmentTypeRepository, never()).delete(any());
    }

    @Test
    public void deleteEquipmentType_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(equipmentTypeRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> equipmentTypeService.deleteEquipmentType(id));
    }

    // ==================== existsByName ====================

    @Test
    public void existsByName_exists_shouldReturnTrue() {
        when(equipmentTypeRepository.existsByName("Truck")).thenReturn(true);

        assertTrue(equipmentTypeService.existsByName("Truck"));
    }

    @Test
    public void existsByName_notExists_shouldReturnFalse() {
        when(equipmentTypeRepository.existsByName("Unknown")).thenReturn(false);

        assertFalse(equipmentTypeService.existsByName("Unknown"));
    }

    // ==================== addSupportedWorkTypes ====================

    @Test
    public void addSupportedWorkTypes_success_shouldAdd() {
        UUID etId = UUID.randomUUID();
        UUID wtId = UUID.randomUUID();

        EquipmentType et = createEquipmentType("Excavator", "Desc", true);
        et.setId(etId);
        et.setSupportedWorkTypes(new ArrayList<>());

        WorkType wt = new WorkType();
        wt.setId(wtId);
        wt.setName("Drilling");
        wt.setActive(true);

        when(equipmentTypeRepository.findById(etId)).thenReturn(Optional.of(et));
        when(workTypeRepository.findById(wtId)).thenReturn(Optional.of(wt));
        when(equipmentTypeRepository.save(any(EquipmentType.class))).thenAnswer(i -> i.getArgument(0));

        EquipmentTypeDTO result = equipmentTypeService.addSupportedWorkTypes(etId, List.of(wtId));

        assertNotNull(result);
        assertEquals("Excavator", result.getName());
    }

    @Test
    public void addSupportedWorkTypes_equipmentTypeNotFound_shouldThrow() {
        UUID etId = UUID.randomUUID();
        when(equipmentTypeRepository.findById(etId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> equipmentTypeService.addSupportedWorkTypes(etId, List.of(UUID.randomUUID())));
    }

    @Test
    public void addSupportedWorkTypes_workTypeNotFound_shouldThrow() {
        UUID etId = UUID.randomUUID();
        UUID wtId = UUID.randomUUID();

        EquipmentType et = createEquipmentType("Excavator", "Desc", true);
        et.setId(etId);
        et.setSupportedWorkTypes(new ArrayList<>());

        when(equipmentTypeRepository.findById(etId)).thenReturn(Optional.of(et));
        when(workTypeRepository.findById(wtId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> equipmentTypeService.addSupportedWorkTypes(etId, List.of(wtId)));
    }

    // ==================== removeSupportedWorkTypes ====================

    @Test
    public void removeSupportedWorkTypes_success_shouldRemove() {
        UUID etId = UUID.randomUUID();
        UUID wtId = UUID.randomUUID();

        WorkType wt = new WorkType();
        wt.setId(wtId);
        wt.setName("Drilling");
        wt.setActive(true);

        EquipmentType et = createEquipmentType("Excavator", "Desc", true);
        et.setId(etId);
        et.setSupportedWorkTypes(new ArrayList<>(List.of(wt)));

        when(equipmentTypeRepository.findById(etId)).thenReturn(Optional.of(et));
        when(equipmentTypeRepository.save(any(EquipmentType.class))).thenAnswer(i -> i.getArgument(0));

        EquipmentTypeDTO result = equipmentTypeService.removeSupportedWorkTypes(etId, List.of(wtId));

        assertNotNull(result);
    }

    @Test
    public void removeSupportedWorkTypes_equipmentTypeNotFound_shouldThrow() {
        UUID etId = UUID.randomUUID();
        when(equipmentTypeRepository.findById(etId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> equipmentTypeService.removeSupportedWorkTypes(etId, List.of(UUID.randomUUID())));
    }

    // ==================== setSupportedWorkTypes ====================

    @Test
    public void setSupportedWorkTypes_success_shouldReplaceAll() {
        UUID etId = UUID.randomUUID();
        UUID wtId = UUID.randomUUID();

        WorkType oldWt = new WorkType();
        oldWt.setId(UUID.randomUUID());
        oldWt.setName("Old");
        oldWt.setActive(true);

        WorkType newWt = new WorkType();
        newWt.setId(wtId);
        newWt.setName("New");
        newWt.setActive(true);

        EquipmentType et = createEquipmentType("Excavator", "Desc", true);
        et.setId(etId);
        et.setSupportedWorkTypes(new ArrayList<>(List.of(oldWt)));

        when(equipmentTypeRepository.findById(etId)).thenReturn(Optional.of(et));
        when(workTypeRepository.findById(wtId)).thenReturn(Optional.of(newWt));
        when(equipmentTypeRepository.save(any(EquipmentType.class))).thenAnswer(i -> i.getArgument(0));

        EquipmentTypeDTO result = equipmentTypeService.setSupportedWorkTypes(etId, List.of(wtId));

        assertNotNull(result);
    }

    @Test
    public void setSupportedWorkTypes_equipmentTypeNotFound_shouldThrow() {
        UUID etId = UUID.randomUUID();
        when(equipmentTypeRepository.findById(etId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> equipmentTypeService.setSupportedWorkTypes(etId, List.of(UUID.randomUUID())));
    }

    @Test
    public void setSupportedWorkTypes_workTypeNotFound_shouldThrow() {
        UUID etId = UUID.randomUUID();
        UUID wtId = UUID.randomUUID();

        EquipmentType et = createEquipmentType("Excavator", "Desc", true);
        et.setId(etId);
        et.setSupportedWorkTypes(new ArrayList<>());

        when(equipmentTypeRepository.findById(etId)).thenReturn(Optional.of(et));
        when(workTypeRepository.findById(wtId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> equipmentTypeService.setSupportedWorkTypes(etId, List.of(wtId)));
    }

    // ==================== getSupportedWorkTypes ====================

    @Test
    public void getSupportedWorkTypes_shouldReturnActiveOnly() {
        UUID etId = UUID.randomUUID();

        WorkType activeWt = new WorkType();
        activeWt.setId(UUID.randomUUID());
        activeWt.setName("Active");
        activeWt.setDescription("Active desc");
        activeWt.setActive(true);

        WorkType inactiveWt = new WorkType();
        inactiveWt.setId(UUID.randomUUID());
        inactiveWt.setName("Inactive");
        inactiveWt.setActive(false);

        EquipmentType et = createEquipmentType("Excavator", "Desc", true);
        et.setId(etId);
        et.setSupportedWorkTypes(new ArrayList<>(List.of(activeWt, inactiveWt)));

        when(equipmentTypeRepository.findById(etId)).thenReturn(Optional.of(et));

        List<WorkTypeDTO> result = equipmentTypeService.getSupportedWorkTypes(etId);

        assertEquals(1, result.size());
        assertEquals("Active", result.get(0).getName());
    }

    @Test
    public void getSupportedWorkTypes_equipmentTypeNotFound_shouldThrow() {
        UUID etId = UUID.randomUUID();
        when(equipmentTypeRepository.findById(etId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> equipmentTypeService.getSupportedWorkTypes(etId));
    }

    // ==================== Helper ====================

    private EquipmentType createEquipmentType(String name, String description, boolean drivable) {
        EquipmentType et = new EquipmentType();
        et.setId(UUID.randomUUID());
        et.setName(name);
        et.setDescription(description);
        et.setDrivable(drivable);
        et.setDriverPositionName(name + " Driver");
        et.setSupportedWorkTypes(new ArrayList<>());
        et.setEquipments(new ArrayList<>());
        return et;
    }
}