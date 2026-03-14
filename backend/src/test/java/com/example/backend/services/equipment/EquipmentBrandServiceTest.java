package com.example.backend.services.equipment;

import com.example.backend.exceptions.ResourceConflictException;
import com.example.backend.models.equipment.EquipmentBrand;
import com.example.backend.repositories.equipment.EquipmentBrandRepository;
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
public class EquipmentBrandServiceTest {

    @Mock
    private EquipmentBrandRepository equipmentBrandRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private EquipmentBrandService equipmentBrandService;

    // ==================== getAllEquipmentBrands ====================

    @Test
    public void getAllEquipmentBrands_shouldReturnAll() {
        EquipmentBrand brand1 = createBrand("Caterpillar", "Heavy equipment");
        EquipmentBrand brand2 = createBrand("Komatsu", "Japanese equipment");
        when(equipmentBrandRepository.findAll()).thenReturn(List.of(brand1, brand2));

        List<EquipmentBrand> result = equipmentBrandService.getAllEquipmentBrands();

        assertEquals(2, result.size());
    }

    @Test
    public void getAllEquipmentBrands_empty_shouldReturnEmpty() {
        when(equipmentBrandRepository.findAll()).thenReturn(List.of());

        List<EquipmentBrand> result = equipmentBrandService.getAllEquipmentBrands();

        assertTrue(result.isEmpty());
    }

    // ==================== getEquipmentBrandById ====================

    @Test
    public void getEquipmentBrandById_found_shouldReturn() {
        UUID id = UUID.randomUUID();
        EquipmentBrand brand = createBrand("Caterpillar", "Heavy equipment");
        brand.setId(id);
        when(equipmentBrandRepository.findById(id)).thenReturn(Optional.of(brand));

        Optional<EquipmentBrand> result = equipmentBrandService.getEquipmentBrandById(id);

        assertTrue(result.isPresent());
        assertEquals("Caterpillar", result.get().getName());
    }

    @Test
    public void getEquipmentBrandById_notFound_shouldReturnEmpty() {
        UUID id = UUID.randomUUID();
        when(equipmentBrandRepository.findById(id)).thenReturn(Optional.empty());

        Optional<EquipmentBrand> result = equipmentBrandService.getEquipmentBrandById(id);

        assertFalse(result.isPresent());
    }

    // ==================== createEquipmentBrand ====================

    @Test
    public void createEquipmentBrand_success_shouldCreate() {
        EquipmentBrand brand = createBrand("Caterpillar", "Heavy equipment");

        when(equipmentBrandRepository.findByName("Caterpillar")).thenReturn(Optional.empty());
        when(equipmentBrandRepository.save(any(EquipmentBrand.class))).thenAnswer(i -> {
            EquipmentBrand b = i.getArgument(0);
            b.setId(UUID.randomUUID());
            return b;
        });

        EquipmentBrand result = equipmentBrandService.createEquipmentBrand(brand);

        assertNotNull(result.getId());
        assertEquals("Caterpillar", result.getName());
        verify(equipmentBrandRepository).save(brand);
    }

    @Test
    public void createEquipmentBrand_duplicateName_shouldThrow() {
        EquipmentBrand existing = createBrand("Caterpillar", "Existing");
        EquipmentBrand newBrand = createBrand("Caterpillar", "New");

        when(equipmentBrandRepository.findByName("Caterpillar")).thenReturn(Optional.of(existing));

        assertThrows(ResourceConflictException.class,
                () -> equipmentBrandService.createEquipmentBrand(newBrand));
        verify(equipmentBrandRepository, never()).save(any());
    }

    // ==================== updateEquipmentBrand ====================

    @Test
    public void updateEquipmentBrand_success_shouldUpdate() {
        UUID id = UUID.randomUUID();
        EquipmentBrand existing = createBrand("OldName", "OldDesc");
        existing.setId(id);

        EquipmentBrand update = createBrand("NewName", "NewDesc");

        when(equipmentBrandRepository.findById(id)).thenReturn(Optional.of(existing));
        when(equipmentBrandRepository.findByName("NewName")).thenReturn(Optional.empty());
        when(equipmentBrandRepository.save(any(EquipmentBrand.class))).thenAnswer(i -> i.getArgument(0));

        EquipmentBrand result = equipmentBrandService.updateEquipmentBrand(id, update);

        assertEquals("NewName", result.getName());
        assertEquals("NewDesc", result.getDescription());
    }

    @Test
    public void updateEquipmentBrand_sameName_shouldUpdate() {
        UUID id = UUID.randomUUID();
        EquipmentBrand existing = createBrand("SameName", "OldDesc");
        existing.setId(id);

        EquipmentBrand update = createBrand("SameName", "NewDesc");

        when(equipmentBrandRepository.findById(id)).thenReturn(Optional.of(existing));
        when(equipmentBrandRepository.save(any(EquipmentBrand.class))).thenAnswer(i -> i.getArgument(0));

        EquipmentBrand result = equipmentBrandService.updateEquipmentBrand(id, update);

        assertEquals("NewDesc", result.getDescription());
    }

    @Test
    public void updateEquipmentBrand_nameConflict_shouldThrow() {
        UUID id = UUID.randomUUID();
        EquipmentBrand existing = createBrand("OldName", "Desc");
        existing.setId(id);

        EquipmentBrand conflicting = createBrand("ConflictName", "Conflict");
        conflicting.setId(UUID.randomUUID());

        EquipmentBrand update = createBrand("ConflictName", "NewDesc");

        when(equipmentBrandRepository.findById(id)).thenReturn(Optional.of(existing));
        when(equipmentBrandRepository.findByName("ConflictName")).thenReturn(Optional.of(conflicting));

        assertThrows(ResourceConflictException.class,
                () -> equipmentBrandService.updateEquipmentBrand(id, update));
    }

    @Test
    public void updateEquipmentBrand_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        EquipmentBrand update = createBrand("Name", "Desc");

        when(equipmentBrandRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> equipmentBrandService.updateEquipmentBrand(id, update));
    }

    // ==================== deleteEquipmentBrand ====================

    @Test
    public void deleteEquipmentBrand_exists_shouldDelete() {
        UUID id = UUID.randomUUID();
        EquipmentBrand brand = createBrand("Caterpillar", "Desc");
        brand.setId(id);

        when(equipmentBrandRepository.existsById(id)).thenReturn(true);
        when(equipmentBrandRepository.findById(id)).thenReturn(Optional.of(brand));

        equipmentBrandService.deleteEquipmentBrand(id);

        verify(equipmentBrandRepository).deleteById(id);
    }

    @Test
    public void deleteEquipmentBrand_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(equipmentBrandRepository.existsById(id)).thenReturn(false);

        assertThrows(RuntimeException.class,
                () -> equipmentBrandService.deleteEquipmentBrand(id));
        verify(equipmentBrandRepository, never()).deleteById(any());
    }

    // ==================== Helper ====================

    private EquipmentBrand createBrand(String name, String description) {
        EquipmentBrand brand = new EquipmentBrand();
        brand.setName(name);
        brand.setDescription(description);
        return brand;
    }
}