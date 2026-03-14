package com.example.backend.services.equipment;

import com.example.backend.dto.equipment.WorkTypeDTO;
import com.example.backend.exceptions.ResourceConflictException;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.equipment.WorkType;
import com.example.backend.repositories.equipment.WorkTypeRepository;
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
public class WorkTypeServiceTest {

    @Mock
    private WorkTypeRepository workTypeRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private WorkTypeService workTypeService;

    // ==================== getAllWorkTypes ====================

    @Test
    public void getAllWorkTypes_shouldReturnActiveOnly() {
        WorkType active = createWorkType("Drilling", "Drill ops", true);
        when(workTypeRepository.findByActiveTrue()).thenReturn(List.of(active));

        List<WorkTypeDTO> result = workTypeService.getAllWorkTypes();

        assertEquals(1, result.size());
        assertEquals("Drilling", result.get(0).getName());
    }

    @Test
    public void getAllWorkTypes_noActive_shouldReturnEmpty() {
        when(workTypeRepository.findByActiveTrue()).thenReturn(List.of());

        List<WorkTypeDTO> result = workTypeService.getAllWorkTypes();

        assertTrue(result.isEmpty());
    }

    // ==================== getAllWorkTypesForManagement ====================

    @Test
    public void getAllWorkTypesForManagement_shouldReturnAll() {
        WorkType active = createWorkType("Drilling", "Drill", true);
        WorkType inactive = createWorkType("OldType", "Old", false);
        when(workTypeRepository.findAll()).thenReturn(List.of(active, inactive));

        List<WorkTypeDTO> result = workTypeService.getAllWorkTypesForManagement();

        assertEquals(2, result.size());
    }

    // ==================== getWorkTypeById ====================

    @Test
    public void getWorkTypeById_found_shouldReturn() {
        UUID id = UUID.randomUUID();
        WorkType wt = createWorkType("Drilling", "Drill ops", true);
        wt.setId(id);
        when(workTypeRepository.findById(id)).thenReturn(Optional.of(wt));

        WorkTypeDTO result = workTypeService.getWorkTypeById(id);

        assertEquals("Drilling", result.getName());
    }

    @Test
    public void getWorkTypeById_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(workTypeRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> workTypeService.getWorkTypeById(id));
    }

    // ==================== createWorkType ====================

    @Test
    public void createWorkType_success_shouldCreate() {
        WorkTypeDTO dto = new WorkTypeDTO();
        dto.setName("NewType");
        dto.setDescription("Description");

        when(workTypeRepository.findByNameIgnoreCase("NewType")).thenReturn(Optional.empty());
        when(workTypeRepository.save(any(WorkType.class))).thenAnswer(i -> {
            WorkType wt = i.getArgument(0);
            wt.setId(UUID.randomUUID());
            return wt;
        });

        WorkTypeDTO result = workTypeService.createWorkType(dto);

        assertNotNull(result.getId());
        assertEquals("NewType", result.getName());
        assertTrue(result.isActive());
    }

    @Test
    public void createWorkType_duplicateActive_shouldThrow() {
        WorkType existing = createWorkType("Drilling", "Existing", true);
        when(workTypeRepository.findByNameIgnoreCase("Drilling")).thenReturn(Optional.of(existing));

        WorkTypeDTO dto = new WorkTypeDTO();
        dto.setName("Drilling");

        assertThrows(ResourceConflictException.class,
                () -> workTypeService.createWorkType(dto));
    }

    @Test
    public void createWorkType_duplicateInactive_shouldThrow() {
        WorkType existing = createWorkType("Drilling", "Existing", false);
        when(workTypeRepository.findByNameIgnoreCase("Drilling")).thenReturn(Optional.of(existing));

        WorkTypeDTO dto = new WorkTypeDTO();
        dto.setName("Drilling");

        assertThrows(ResourceConflictException.class,
                () -> workTypeService.createWorkType(dto));
    }

    // ==================== updateWorkType ====================

    @Test
    public void updateWorkType_success_shouldUpdate() {
        UUID id = UUID.randomUUID();
        WorkType existing = createWorkType("OldName", "OldDesc", true);
        existing.setId(id);

        when(workTypeRepository.findById(id)).thenReturn(Optional.of(existing));
        when(workTypeRepository.findByNameIgnoreCase("NewName")).thenReturn(Optional.empty());
        when(workTypeRepository.save(any(WorkType.class))).thenAnswer(i -> i.getArgument(0));

        WorkTypeDTO dto = new WorkTypeDTO();
        dto.setName("NewName");
        dto.setDescription("NewDesc");
        dto.setActive(true);

        WorkTypeDTO result = workTypeService.updateWorkType(id, dto);

        assertEquals("NewName", result.getName());
        assertEquals("NewDesc", result.getDescription());
    }

    @Test
    public void updateWorkType_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(workTypeRepository.findById(id)).thenReturn(Optional.empty());

        WorkTypeDTO dto = new WorkTypeDTO();
        dto.setName("Name");

        assertThrows(ResourceNotFoundException.class,
                () -> workTypeService.updateWorkType(id, dto));
    }

    @Test
    public void updateWorkType_nameConflictActive_shouldThrow() {
        UUID id = UUID.randomUUID();
        WorkType existing = createWorkType("OldName", "Desc", true);
        existing.setId(id);

        WorkType conflicting = createWorkType("ConflictName", "Conflict", true);
        conflicting.setId(UUID.randomUUID());

        when(workTypeRepository.findById(id)).thenReturn(Optional.of(existing));
        when(workTypeRepository.findByNameIgnoreCase("ConflictName")).thenReturn(Optional.of(conflicting));

        WorkTypeDTO dto = new WorkTypeDTO();
        dto.setName("ConflictName");
        dto.setActive(true);

        assertThrows(ResourceConflictException.class,
                () -> workTypeService.updateWorkType(id, dto));
    }

    @Test
    public void updateWorkType_sameName_shouldSucceed() {
        UUID id = UUID.randomUUID();
        WorkType existing = createWorkType("SameName", "OldDesc", true);
        existing.setId(id);

        when(workTypeRepository.findById(id)).thenReturn(Optional.of(existing));
        when(workTypeRepository.save(any(WorkType.class))).thenAnswer(i -> i.getArgument(0));

        WorkTypeDTO dto = new WorkTypeDTO();
        dto.setName("SameName");
        dto.setDescription("NewDesc");
        dto.setActive(true);

        WorkTypeDTO result = workTypeService.updateWorkType(id, dto);

        assertEquals("NewDesc", result.getDescription());
    }

    // ==================== deleteWorkType ====================

    @Test
    public void deleteWorkType_shouldSoftDelete() {
        UUID id = UUID.randomUUID();
        WorkType wt = createWorkType("Drilling", "Drill", true);
        wt.setId(id);

        when(workTypeRepository.findById(id)).thenReturn(Optional.of(wt));
        when(workTypeRepository.save(any(WorkType.class))).thenAnswer(i -> i.getArgument(0));

        workTypeService.deleteWorkType(id);

        assertFalse(wt.isActive());
        verify(workTypeRepository).save(wt);
        verify(workTypeRepository, never()).delete(any());
    }

    @Test
    public void deleteWorkType_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(workTypeRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> workTypeService.deleteWorkType(id));
    }

    // ==================== reactivateWorkTypeByName ====================

    @Test
    public void reactivateWorkTypeByName_inactive_shouldReactivate() {
        WorkType inactive = createWorkType("Drilling", "Old desc", false);
        when(workTypeRepository.findByNameIgnoreCase("Drilling")).thenReturn(Optional.of(inactive));
        when(workTypeRepository.save(any(WorkType.class))).thenAnswer(i -> i.getArgument(0));

        WorkTypeDTO dto = new WorkTypeDTO();
        dto.setName("Drilling");
        dto.setDescription("Updated desc");

        WorkTypeDTO result = workTypeService.reactivateWorkTypeByName("Drilling", dto);

        assertTrue(result.isActive());
        assertEquals("Updated desc", result.getDescription());
    }

    @Test
    public void reactivateWorkTypeByName_alreadyActive_shouldThrow() {
        WorkType active = createWorkType("Drilling", "Desc", true);
        when(workTypeRepository.findByNameIgnoreCase("Drilling")).thenReturn(Optional.of(active));

        WorkTypeDTO dto = new WorkTypeDTO();
        dto.setName("Drilling");

        assertThrows(IllegalStateException.class,
                () -> workTypeService.reactivateWorkTypeByName("Drilling", dto));
    }

    @Test
    public void reactivateWorkTypeByName_notFound_shouldThrow() {
        when(workTypeRepository.findByNameIgnoreCase("Unknown")).thenReturn(Optional.empty());

        WorkTypeDTO dto = new WorkTypeDTO();
        dto.setName("Unknown");

        assertThrows(ResourceNotFoundException.class,
                () -> workTypeService.reactivateWorkTypeByName("Unknown", dto));
    }

    // ==================== Helper ====================

    private WorkType createWorkType(String name, String description, boolean active) {
        WorkType wt = new WorkType();
        wt.setId(UUID.randomUUID());
        wt.setName(name);
        wt.setDescription(description);
        wt.setActive(active);
        return wt;
    }
}