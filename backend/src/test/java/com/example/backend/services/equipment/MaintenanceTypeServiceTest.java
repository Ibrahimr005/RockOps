package com.example.backend.services.equipment;

import com.example.backend.dto.equipment.MaintenanceTypeDTO;
import com.example.backend.exceptions.ResourceConflictException;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.equipment.MaintenanceType;
import com.example.backend.repositories.equipment.MaintenanceTypeRepository;
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
public class MaintenanceTypeServiceTest {

    @Mock
    private MaintenanceTypeRepository maintenanceTypeRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private MaintenanceTypeService maintenanceTypeService;

    // ==================== getAllMaintenanceTypes ====================

    @Test
    public void getAllMaintenanceTypes_shouldReturnActiveOnly() {
        MaintenanceType active = createMaintType("Oil Change", "Regular oil change", true);
        when(maintenanceTypeRepository.findByActiveTrue()).thenReturn(List.of(active));

        List<MaintenanceTypeDTO> result = maintenanceTypeService.getAllMaintenanceTypes();

        assertEquals(1, result.size());
        assertEquals("Oil Change", result.get(0).getName());
    }

    // ==================== getAllMaintenanceTypesForManagement ====================

    @Test
    public void getAllMaintenanceTypesForManagement_shouldReturnAll() {
        MaintenanceType active = createMaintType("Oil Change", "Active", true);
        MaintenanceType inactive = createMaintType("Old Type", "Inactive", false);
        when(maintenanceTypeRepository.findAll()).thenReturn(List.of(active, inactive));

        List<MaintenanceTypeDTO> result = maintenanceTypeService.getAllMaintenanceTypesForManagement();

        assertEquals(2, result.size());
    }

    // ==================== getMaintenanceTypeById ====================

    @Test
    public void getMaintenanceTypeById_found_shouldReturn() {
        UUID id = UUID.randomUUID();
        MaintenanceType mt = createMaintType("Oil Change", "Desc", true);
        mt.setId(id);
        when(maintenanceTypeRepository.findById(id)).thenReturn(Optional.of(mt));

        MaintenanceTypeDTO result = maintenanceTypeService.getMaintenanceTypeById(id);

        assertEquals("Oil Change", result.getName());
    }

    @Test
    public void getMaintenanceTypeById_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(maintenanceTypeRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> maintenanceTypeService.getMaintenanceTypeById(id));
    }

    // ==================== getMaintenanceTypeEntityById ====================

    @Test
    public void getMaintenanceTypeEntityById_found_shouldReturn() {
        UUID id = UUID.randomUUID();
        MaintenanceType mt = createMaintType("Oil Change", "Desc", true);
        mt.setId(id);
        when(maintenanceTypeRepository.findById(id)).thenReturn(Optional.of(mt));

        MaintenanceType result = maintenanceTypeService.getMaintenanceTypeEntityById(id);

        assertEquals("Oil Change", result.getName());
    }

    @Test
    public void getMaintenanceTypeEntityById_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(maintenanceTypeRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> maintenanceTypeService.getMaintenanceTypeEntityById(id));
    }

    // ==================== createMaintenanceType (DTO) ====================

    @Test
    public void createMaintenanceType_success_shouldCreate() {
        MaintenanceTypeDTO dto = createDTO("Oil Change", "Regular oil change", true);

        when(maintenanceTypeRepository.findByNameIgnoreCase("Oil Change")).thenReturn(Optional.empty());
        when(maintenanceTypeRepository.save(any(MaintenanceType.class))).thenAnswer(i -> {
            MaintenanceType mt = i.getArgument(0);
            mt.setId(UUID.randomUUID());
            return mt;
        });

        MaintenanceTypeDTO result = maintenanceTypeService.createMaintenanceType(dto);

        assertNotNull(result.getId());
        assertEquals("Oil Change", result.getName());
    }

    @Test
    public void createMaintenanceType_duplicateActive_shouldThrow() {
        MaintenanceType existing = createMaintType("Oil Change", "Existing", true);
        when(maintenanceTypeRepository.findByNameIgnoreCase("Oil Change")).thenReturn(Optional.of(existing));

        MaintenanceTypeDTO dto = createDTO("Oil Change", "New", true);

        assertThrows(ResourceConflictException.class,
                () -> maintenanceTypeService.createMaintenanceType(dto));
    }

    @Test
    public void createMaintenanceType_duplicateInactive_shouldThrow() {
        MaintenanceType existing = createMaintType("Oil Change", "Existing", false);
        when(maintenanceTypeRepository.findByNameIgnoreCase("Oil Change")).thenReturn(Optional.of(existing));

        MaintenanceTypeDTO dto = createDTO("Oil Change", "New", true);

        assertThrows(ResourceConflictException.class,
                () -> maintenanceTypeService.createMaintenanceType(dto));
    }

    @Test
    public void createMaintenanceType_emptyName_shouldThrow() {
        MaintenanceTypeDTO dto = createDTO("", "Desc", true);

        assertThrows(IllegalArgumentException.class,
                () -> maintenanceTypeService.createMaintenanceType(dto));
    }

    @Test
    public void createMaintenanceType_nullName_shouldThrow() {
        MaintenanceTypeDTO dto = createDTO(null, "Desc", true);

        assertThrows(IllegalArgumentException.class,
                () -> maintenanceTypeService.createMaintenanceType(dto));
    }

    @Test
    public void createMaintenanceType_nameNA_shouldThrow() {
        MaintenanceTypeDTO dto = createDTO("NA", "Desc", true);

        assertThrows(IllegalArgumentException.class,
                () -> maintenanceTypeService.createMaintenanceType(dto));
    }

    @Test
    public void createMaintenanceType_nameNSlashA_shouldThrow() {
        MaintenanceTypeDTO dto = createDTO("N/A", "Desc", true);

        assertThrows(IllegalArgumentException.class,
                () -> maintenanceTypeService.createMaintenanceType(dto));
    }

    @Test
    public void createMaintenanceType_descriptionNA_shouldThrow() {
        MaintenanceTypeDTO dto = createDTO("Valid Name", "N/A", true);

        assertThrows(IllegalArgumentException.class,
                () -> maintenanceTypeService.createMaintenanceType(dto));
    }

    // ==================== updateMaintenanceType (DTO) ====================

    @Test
    public void updateMaintenanceType_success_shouldUpdate() {
        UUID id = UUID.randomUUID();
        MaintenanceType existing = createMaintType("OldName", "OldDesc", true);
        existing.setId(id);

        when(maintenanceTypeRepository.findById(id)).thenReturn(Optional.of(existing));
        when(maintenanceTypeRepository.findByNameIgnoreCase("NewName")).thenReturn(Optional.empty());
        when(maintenanceTypeRepository.save(any(MaintenanceType.class))).thenAnswer(i -> i.getArgument(0));

        MaintenanceTypeDTO dto = createDTO("NewName", "NewDesc", true);

        MaintenanceTypeDTO result = maintenanceTypeService.updateMaintenanceType(id, dto);

        assertEquals("NewName", result.getName());
        assertEquals("NewDesc", result.getDescription());
    }

    @Test
    public void updateMaintenanceType_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(maintenanceTypeRepository.findById(id)).thenReturn(Optional.empty());

        MaintenanceTypeDTO dto = createDTO("Name", "Desc", true);

        assertThrows(ResourceNotFoundException.class,
                () -> maintenanceTypeService.updateMaintenanceType(id, dto));
    }

    @Test
    public void updateMaintenanceType_nameConflictActive_shouldThrow() {
        UUID id = UUID.randomUUID();
        MaintenanceType existing = createMaintType("OldName", "Desc", true);
        existing.setId(id);

        MaintenanceType conflicting = createMaintType("Conflict", "Desc", true);
        conflicting.setId(UUID.randomUUID());

        when(maintenanceTypeRepository.findById(id)).thenReturn(Optional.of(existing));
        when(maintenanceTypeRepository.findByNameIgnoreCase("Conflict")).thenReturn(Optional.of(conflicting));

        MaintenanceTypeDTO dto = createDTO("Conflict", "Desc", true);

        assertThrows(ResourceConflictException.class,
                () -> maintenanceTypeService.updateMaintenanceType(id, dto));
    }

    @Test
    public void updateMaintenanceType_emptyNameValidation_shouldThrow() {
        UUID id = UUID.randomUUID();

        MaintenanceTypeDTO dto = createDTO("", "Desc", true);

        assertThrows(IllegalArgumentException.class,
                () -> maintenanceTypeService.updateMaintenanceType(id, dto));
    }

    // ==================== deleteMaintenanceType ====================

    @Test
    public void deleteMaintenanceType_found_shouldDelete() {
        UUID id = UUID.randomUUID();
        MaintenanceType mt = createMaintType("Oil Change", "Desc", true);
        mt.setId(id);
        when(maintenanceTypeRepository.findById(id)).thenReturn(Optional.of(mt));

        maintenanceTypeService.deleteMaintenanceType(id);

        verify(maintenanceTypeRepository).delete(mt);
    }

    @Test
    public void deleteMaintenanceType_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(maintenanceTypeRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> maintenanceTypeService.deleteMaintenanceType(id));
    }

    // ==================== getAllActiveMaintenanceTypes ====================

    @Test
    public void getAllActiveMaintenanceTypes_shouldReturnActiveEntities() {
        MaintenanceType active = createMaintType("Active", "Desc", true);
        when(maintenanceTypeRepository.findByActiveTrue()).thenReturn(List.of(active));

        List<MaintenanceType> result = maintenanceTypeService.getAllActiveMaintenanceTypes();

        assertEquals(1, result.size());
    }

    // ==================== addMaintenanceType ====================

    @Test
    public void addMaintenanceType_success_shouldCreate() {
        when(maintenanceTypeRepository.findByNameIgnoreCase("NewType")).thenReturn(Optional.empty());
        when(maintenanceTypeRepository.save(any(MaintenanceType.class))).thenAnswer(i -> {
            MaintenanceType mt = i.getArgument(0);
            mt.setId(UUID.randomUUID());
            return mt;
        });

        MaintenanceType result = maintenanceTypeService.addMaintenanceType("NewType", "Desc");

        assertNotNull(result);
        assertEquals("NewType", result.getName());
        assertTrue(result.isActive());
    }

    @Test
    public void addMaintenanceType_duplicateActive_shouldThrow() {
        MaintenanceType existing = createMaintType("Existing", "Desc", true);
        when(maintenanceTypeRepository.findByNameIgnoreCase("Existing")).thenReturn(Optional.of(existing));

        assertThrows(ResourceConflictException.class,
                () -> maintenanceTypeService.addMaintenanceType("Existing", "Desc"));
    }

    // ==================== updateMaintenanceType (String params) ====================

    @Test
    public void updateMaintenanceTypeStrings_success_shouldUpdate() {
        UUID id = UUID.randomUUID();
        MaintenanceType existing = createMaintType("OldName", "OldDesc", true);
        existing.setId(id);

        when(maintenanceTypeRepository.findById(id)).thenReturn(Optional.of(existing));
        when(maintenanceTypeRepository.findByNameIgnoreCase("NewName")).thenReturn(Optional.empty());
        when(maintenanceTypeRepository.save(any(MaintenanceType.class))).thenAnswer(i -> i.getArgument(0));

        MaintenanceType result = maintenanceTypeService.updateMaintenanceType(id, "NewName", "NewDesc", false);

        assertEquals("NewName", result.getName());
        assertEquals("NewDesc", result.getDescription());
        assertFalse(result.isActive());
    }

    @Test
    public void updateMaintenanceTypeStrings_nullFields_shouldKeepExisting() {
        UUID id = UUID.randomUUID();
        MaintenanceType existing = createMaintType("KeepName", "KeepDesc", true);
        existing.setId(id);

        when(maintenanceTypeRepository.findById(id)).thenReturn(Optional.of(existing));
        when(maintenanceTypeRepository.save(any(MaintenanceType.class))).thenAnswer(i -> i.getArgument(0));

        MaintenanceType result = maintenanceTypeService.updateMaintenanceType(id, null, null, null);

        assertEquals("KeepName", result.getName());
        assertEquals("KeepDesc", result.getDescription());
        assertTrue(result.isActive());
    }

    // ==================== searchMaintenanceTypes ====================

    @Test
    public void searchMaintenanceTypes_shouldReturnMatches() {
        MaintenanceType mt = createMaintType("Oil Change", "Desc", true);
        when(maintenanceTypeRepository.findByNameContainingIgnoreCase("oil")).thenReturn(List.of(mt));

        List<MaintenanceType> result = maintenanceTypeService.searchMaintenanceTypes("oil");

        assertEquals(1, result.size());
        assertEquals("Oil Change", result.get(0).getName());
    }

    // ==================== reactivateMaintenanceTypeByName ====================

    @Test
    public void reactivateMaintenanceTypeByName_inactive_shouldReactivate() {
        MaintenanceType inactive = createMaintType("Oil Change", "Old desc", false);
        when(maintenanceTypeRepository.findByNameIgnoreCase("Oil Change")).thenReturn(Optional.of(inactive));
        when(maintenanceTypeRepository.save(any(MaintenanceType.class))).thenAnswer(i -> i.getArgument(0));

        MaintenanceTypeDTO dto = createDTO("Oil Change", "Updated desc", true);

        MaintenanceTypeDTO result = maintenanceTypeService.reactivateMaintenanceTypeByName("Oil Change", dto);

        assertTrue(result.isActive());
        assertEquals("Updated desc", result.getDescription());
    }

    @Test
    public void reactivateMaintenanceTypeByName_alreadyActive_shouldThrow() {
        MaintenanceType active = createMaintType("Oil Change", "Desc", true);
        when(maintenanceTypeRepository.findByNameIgnoreCase("Oil Change")).thenReturn(Optional.of(active));

        MaintenanceTypeDTO dto = createDTO("Oil Change", "Desc", true);

        assertThrows(IllegalStateException.class,
                () -> maintenanceTypeService.reactivateMaintenanceTypeByName("Oil Change", dto));
    }

    @Test
    public void reactivateMaintenanceTypeByName_notFound_shouldThrow() {
        when(maintenanceTypeRepository.findByNameIgnoreCase("Unknown")).thenReturn(Optional.empty());

        MaintenanceTypeDTO dto = createDTO("Unknown", "Desc", true);

        assertThrows(ResourceNotFoundException.class,
                () -> maintenanceTypeService.reactivateMaintenanceTypeByName("Unknown", dto));
    }

    // ==================== Helpers ====================

    private MaintenanceType createMaintType(String name, String description, boolean active) {
        MaintenanceType mt = new MaintenanceType();
        mt.setId(UUID.randomUUID());
        mt.setName(name);
        mt.setDescription(description);
        mt.setActive(active);
        return mt;
    }

    private MaintenanceTypeDTO createDTO(String name, String description, boolean active) {
        MaintenanceTypeDTO dto = new MaintenanceTypeDTO();
        dto.setName(name);
        dto.setDescription(description);
        dto.setActive(active);
        return dto;
    }
}