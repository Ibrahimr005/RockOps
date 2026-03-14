package com.example.backend.services.equipment;

import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.equipment.InSiteMaintenance;
import com.example.backend.models.equipment.MaintenanceConsumable;
import com.example.backend.models.warehouse.ItemType;
import com.example.backend.repositories.equipment.InSiteMaintenanceRepository;
import com.example.backend.repositories.equipment.MaintenanceConsumableRepository;
import com.example.backend.repositories.warehouse.ItemTypeRepository;
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
public class MaintenanceConsumableServiceTest {

    @Mock
    private MaintenanceConsumableRepository maintenanceConsumableRepository;

    @Mock
    private InSiteMaintenanceRepository maintenanceRepository;

    @Mock
    private ItemTypeRepository itemTypeRepository;

    @InjectMocks
    private MaintenanceConsumableService maintenanceConsumableService;

    // ==================== getConsumablesByMaintenanceId ====================

    @Test
    public void getConsumablesByMaintenanceId_shouldReturnList() {
        UUID maintenanceId = UUID.randomUUID();
        MaintenanceConsumable mc = new MaintenanceConsumable();
        mc.setId(UUID.randomUUID());
        mc.setQuantity(5);

        when(maintenanceConsumableRepository.findByMaintenanceId(maintenanceId)).thenReturn(List.of(mc));

        List<MaintenanceConsumable> result = maintenanceConsumableService.getConsumablesByMaintenanceId(maintenanceId);

        assertEquals(1, result.size());
        assertEquals(5, result.get(0).getQuantity());
    }

    @Test
    public void getConsumablesByMaintenanceId_noResults_shouldReturnEmpty() {
        UUID maintenanceId = UUID.randomUUID();
        when(maintenanceConsumableRepository.findByMaintenanceId(maintenanceId)).thenReturn(List.of());

        List<MaintenanceConsumable> result = maintenanceConsumableService.getConsumablesByMaintenanceId(maintenanceId);

        assertTrue(result.isEmpty());
    }

    // ==================== addConsumableToMaintenance ====================

    @Test
    public void addConsumableToMaintenance_success_shouldCreate() {
        UUID maintenanceId = UUID.randomUUID();
        UUID itemTypeId = UUID.randomUUID();

        InSiteMaintenance maintenance = InSiteMaintenance.builder().build();
        maintenance.setId(maintenanceId);

        ItemType itemType = new ItemType();
        itemType.setId(itemTypeId);
        itemType.setName("Oil Filter");

        when(maintenanceRepository.findById(maintenanceId)).thenReturn(Optional.of(maintenance));
        when(itemTypeRepository.findById(itemTypeId)).thenReturn(Optional.of(itemType));
        when(maintenanceConsumableRepository.save(any(MaintenanceConsumable.class))).thenAnswer(i -> {
            MaintenanceConsumable mc = i.getArgument(0);
            mc.setId(UUID.randomUUID());
            return mc;
        });

        MaintenanceConsumable result = maintenanceConsumableService.addConsumableToMaintenance(maintenanceId, itemTypeId, 10);

        assertNotNull(result.getId());
        assertEquals(10, result.getQuantity());
        assertEquals(maintenance, result.getMaintenance());
        assertEquals(itemType, result.getItemType());
    }

    @Test
    public void addConsumableToMaintenance_maintenanceNotFound_shouldThrow() {
        UUID maintenanceId = UUID.randomUUID();
        UUID itemTypeId = UUID.randomUUID();

        when(maintenanceRepository.findById(maintenanceId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> maintenanceConsumableService.addConsumableToMaintenance(maintenanceId, itemTypeId, 10));
    }

    @Test
    public void addConsumableToMaintenance_itemTypeNotFound_shouldThrow() {
        UUID maintenanceId = UUID.randomUUID();
        UUID itemTypeId = UUID.randomUUID();

        InSiteMaintenance maintenance = InSiteMaintenance.builder().build();
        when(maintenanceRepository.findById(maintenanceId)).thenReturn(Optional.of(maintenance));
        when(itemTypeRepository.findById(itemTypeId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> maintenanceConsumableService.addConsumableToMaintenance(maintenanceId, itemTypeId, 10));
    }

    // ==================== updateConsumableQuantity ====================

    @Test
    public void updateConsumableQuantity_success_shouldUpdate() {
        UUID consumableId = UUID.randomUUID();
        MaintenanceConsumable consumable = new MaintenanceConsumable();
        consumable.setId(consumableId);
        consumable.setQuantity(5);

        when(maintenanceConsumableRepository.findById(consumableId)).thenReturn(Optional.of(consumable));
        when(maintenanceConsumableRepository.save(any(MaintenanceConsumable.class))).thenAnswer(i -> i.getArgument(0));

        MaintenanceConsumable result = maintenanceConsumableService.updateConsumableQuantity(consumableId, 20);

        assertEquals(20, result.getQuantity());
    }

    @Test
    public void updateConsumableQuantity_notFound_shouldThrow() {
        UUID consumableId = UUID.randomUUID();
        when(maintenanceConsumableRepository.findById(consumableId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> maintenanceConsumableService.updateConsumableQuantity(consumableId, 20));
    }

    // ==================== removeConsumable ====================

    @Test
    public void removeConsumable_exists_shouldDelete() {
        UUID consumableId = UUID.randomUUID();
        when(maintenanceConsumableRepository.existsById(consumableId)).thenReturn(true);

        maintenanceConsumableService.removeConsumable(consumableId);

        verify(maintenanceConsumableRepository).deleteById(consumableId);
    }

    @Test
    public void removeConsumable_notFound_shouldThrow() {
        UUID consumableId = UUID.randomUUID();
        when(maintenanceConsumableRepository.existsById(consumableId)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class,
                () -> maintenanceConsumableService.removeConsumable(consumableId));
        verify(maintenanceConsumableRepository, never()).deleteById(any());
    }

    // ==================== removeAllConsumablesForMaintenance ====================

    @Test
    public void removeAllConsumablesForMaintenance_exists_shouldDeleteAll() {
        UUID maintenanceId = UUID.randomUUID();
        when(maintenanceRepository.existsById(maintenanceId)).thenReturn(true);

        maintenanceConsumableService.removeAllConsumablesForMaintenance(maintenanceId);

        verify(maintenanceConsumableRepository).deleteByMaintenanceId(maintenanceId);
    }

    @Test
    public void removeAllConsumablesForMaintenance_notFound_shouldThrow() {
        UUID maintenanceId = UUID.randomUUID();
        when(maintenanceRepository.existsById(maintenanceId)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class,
                () -> maintenanceConsumableService.removeAllConsumablesForMaintenance(maintenanceId));
        verify(maintenanceConsumableRepository, never()).deleteByMaintenanceId(any());
    }
}