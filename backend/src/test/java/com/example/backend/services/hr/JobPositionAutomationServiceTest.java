package com.example.backend.services.hr;

import com.example.backend.models.equipment.EquipmentType;
import com.example.backend.models.hr.Department;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.repositories.hr.DepartmentRepository;
import com.example.backend.repositories.hr.JobPositionRepository;
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
public class JobPositionAutomationServiceTest {

    @Mock
    private JobPositionRepository jobPositionRepository;

    @Mock
    private DepartmentRepository departmentRepository;

    @InjectMocks
    private JobPositionAutomationService jobPositionAutomationService;

    // ==================== createDriverPositionForEquipmentType ====================

    @Test
    public void createDriverPosition_newPosition_shouldCreate() {
        EquipmentType equipmentType = new EquipmentType();
        equipmentType.setName("Excavator");

        Department logisticsDept = new Department();
        logisticsDept.setId(UUID.randomUUID());
        logisticsDept.setName("Logistics");

        when(jobPositionRepository.findAll()).thenReturn(List.of());
        when(departmentRepository.findByName("Logistics")).thenReturn(Optional.of(logisticsDept));
        when(jobPositionRepository.save(any(JobPosition.class))).thenAnswer(i -> {
            JobPosition jp = i.getArgument(0);
            jp.setId(UUID.randomUUID());
            return jp;
        });

        JobPosition result = jobPositionAutomationService.createDriverPositionForEquipmentType(equipmentType);

        assertNotNull(result);
        assertEquals("Excavator Driver", result.getPositionName());
        assertEquals(35000.0, result.getBaseSalary());
        verify(jobPositionRepository).save(any(JobPosition.class));
    }

    @Test
    public void createDriverPosition_alreadyExists_shouldReturnExisting() {
        EquipmentType equipmentType = new EquipmentType();
        equipmentType.setName("Truck");

        JobPosition existingPosition = new JobPosition();
        existingPosition.setId(UUID.randomUUID());
        existingPosition.setPositionName("Truck Driver");

        when(jobPositionRepository.findAll()).thenReturn(List.of(existingPosition));

        JobPosition result = jobPositionAutomationService.createDriverPositionForEquipmentType(equipmentType);

        assertEquals(existingPosition, result);
        verify(jobPositionRepository, never()).save(any(JobPosition.class));
    }

    @Test
    public void createDriverPosition_craneType_shouldSetHighSalary() {
        EquipmentType equipmentType = new EquipmentType();
        equipmentType.setName("Tower Crane");

        Department logisticsDept = new Department();
        logisticsDept.setId(UUID.randomUUID());
        logisticsDept.setName("Logistics");

        when(jobPositionRepository.findAll()).thenReturn(List.of());
        when(departmentRepository.findByName("Logistics")).thenReturn(Optional.of(logisticsDept));
        when(jobPositionRepository.save(any(JobPosition.class))).thenAnswer(i -> {
            JobPosition jp = i.getArgument(0);
            jp.setId(UUID.randomUUID());
            return jp;
        });

        JobPosition result = jobPositionAutomationService.createDriverPositionForEquipmentType(equipmentType);

        assertEquals(40000.0, result.getBaseSalary());
        assertEquals("Senior Level", result.getExperienceLevel());
    }

    @Test
    public void createDriverPosition_truckType_shouldSetMediumSalary() {
        EquipmentType equipmentType = new EquipmentType();
        equipmentType.setName("Dump Truck");

        Department logisticsDept = new Department();
        logisticsDept.setId(UUID.randomUUID());
        logisticsDept.setName("Logistics");

        when(jobPositionRepository.findAll()).thenReturn(List.of());
        when(departmentRepository.findByName("Logistics")).thenReturn(Optional.of(logisticsDept));
        when(jobPositionRepository.save(any(JobPosition.class))).thenAnswer(i -> {
            JobPosition jp = i.getArgument(0);
            jp.setId(UUID.randomUUID());
            return jp;
        });

        JobPosition result = jobPositionAutomationService.createDriverPositionForEquipmentType(equipmentType);

        assertEquals(30000.0, result.getBaseSalary());
        assertEquals("Entry Level", result.getExperienceLevel());
    }

    @Test
    public void createDriverPosition_compactorType_shouldSetSpecializedSalary() {
        EquipmentType equipmentType = new EquipmentType();
        equipmentType.setName("Soil Compactor");

        Department logisticsDept = new Department();
        logisticsDept.setId(UUID.randomUUID());
        logisticsDept.setName("Logistics");

        when(jobPositionRepository.findAll()).thenReturn(List.of());
        when(departmentRepository.findByName("Logistics")).thenReturn(Optional.of(logisticsDept));
        when(jobPositionRepository.save(any(JobPosition.class))).thenAnswer(i -> {
            JobPosition jp = i.getArgument(0);
            jp.setId(UUID.randomUUID());
            return jp;
        });

        JobPosition result = jobPositionAutomationService.createDriverPositionForEquipmentType(equipmentType);

        assertEquals(32000.0, result.getBaseSalary());
    }

    @Test
    public void createDriverPosition_logisticsDeptNotFound_shouldThrow() {
        EquipmentType equipmentType = new EquipmentType();
        equipmentType.setName("Generic Vehicle");

        when(jobPositionRepository.findAll()).thenReturn(List.of());
        when(departmentRepository.findByName("Logistics")).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> jobPositionAutomationService.createDriverPositionForEquipmentType(equipmentType));
    }

    // ==================== handleEquipmentTypeRenamed ====================

    @Test
    public void handleEquipmentTypeRenamed_existingPosition_shouldRename() {
        EquipmentType updatedType = new EquipmentType();
        updatedType.setName("NewExcavator");

        JobPosition existingPosition = new JobPosition();
        existingPosition.setId(UUID.randomUUID());
        existingPosition.setPositionName("OldExcavator Driver");

        when(jobPositionRepository.findAll()).thenReturn(List.of(existingPosition));
        when(jobPositionRepository.save(any(JobPosition.class))).thenAnswer(i -> i.getArgument(0));

        jobPositionAutomationService.handleEquipmentTypeRenamed("OldExcavator", updatedType);

        assertEquals("NewExcavator Driver", existingPosition.getPositionName());
        verify(jobPositionRepository).save(existingPosition);
    }

    @Test
    public void handleEquipmentTypeRenamed_noExistingPosition_shouldCreateNew() {
        EquipmentType updatedType = new EquipmentType();
        updatedType.setName("NewType");

        Department logisticsDept = new Department();
        logisticsDept.setId(UUID.randomUUID());
        logisticsDept.setName("Logistics");

        when(jobPositionRepository.findAll()).thenReturn(List.of());
        when(departmentRepository.findByName("Logistics")).thenReturn(Optional.of(logisticsDept));
        when(jobPositionRepository.save(any(JobPosition.class))).thenAnswer(i -> {
            JobPosition jp = i.getArgument(0);
            jp.setId(UUID.randomUUID());
            return jp;
        });

        jobPositionAutomationService.handleEquipmentTypeRenamed("OldType", updatedType);

        verify(jobPositionRepository).save(any(JobPosition.class));
    }

    @Test
    public void handleEquipmentTypeRenamed_newNameAlreadyExists_shouldNotRename() {
        EquipmentType updatedType = new EquipmentType();
        updatedType.setName("ExistingType");

        JobPosition oldPosition = new JobPosition();
        oldPosition.setId(UUID.randomUUID());
        oldPosition.setPositionName("OldType Driver");

        JobPosition conflictPosition = new JobPosition();
        conflictPosition.setId(UUID.randomUUID());
        conflictPosition.setPositionName("ExistingType Driver");

        when(jobPositionRepository.findAll()).thenReturn(List.of(oldPosition, conflictPosition));

        jobPositionAutomationService.handleEquipmentTypeRenamed("OldType", updatedType);

        // Should not save since new name already exists
        verify(jobPositionRepository, never()).save(any(JobPosition.class));
    }
}