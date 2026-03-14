package com.example.backend.services.procurement;

import com.example.backend.dto.procurement.EquipmentPurchaseSpecDTO;
import com.example.backend.models.equipment.EquipmentBrand;
import com.example.backend.models.equipment.EquipmentType;
import com.example.backend.models.procurement.EquipmentPurchaseSpec;
import com.example.backend.repositories.equipment.EquipmentBrandRepository;
import com.example.backend.repositories.equipment.EquipmentTypeRepository;
import com.example.backend.repositories.procurement.EquipmentPurchaseSpecRepository;
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
public class EquipmentPurchaseSpecServiceTest {

    @Mock
    private EquipmentPurchaseSpecRepository specRepository;

    @Mock
    private EquipmentTypeRepository equipmentTypeRepository;

    @Mock
    private EquipmentBrandRepository equipmentBrandRepository;

    @InjectMocks
    private EquipmentPurchaseSpecService specService;

    // ==================== getAll ====================

    @Test
    public void getAll_shouldReturnAllSpecs() {
        EquipmentPurchaseSpec spec = createSpec();
        when(specRepository.findAll()).thenReturn(List.of(spec));

        List<EquipmentPurchaseSpec> result = specService.getAll();

        assertEquals(1, result.size());
    }

    @Test
    public void getAll_empty_shouldReturnEmpty() {
        when(specRepository.findAll()).thenReturn(List.of());

        List<EquipmentPurchaseSpec> result = specService.getAll();

        assertTrue(result.isEmpty());
    }

    // ==================== getById ====================

    @Test
    public void getById_found_shouldReturn() {
        UUID id = UUID.randomUUID();
        EquipmentPurchaseSpec spec = createSpec();
        spec.setId(id);

        when(specRepository.findById(id)).thenReturn(Optional.of(spec));

        EquipmentPurchaseSpec result = specService.getById(id);

        assertNotNull(result);
        assertEquals(id, result.getId());
    }

    @Test
    public void getById_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(specRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> specService.getById(id));
    }

    // ==================== create ====================

    @Test
    public void create_withBrand_shouldCreate() {
        UUID typeId = UUID.randomUUID();
        UUID brandId = UUID.randomUUID();

        EquipmentType type = new EquipmentType();
        type.setId(typeId);
        type.setName("Excavator");

        EquipmentBrand brand = new EquipmentBrand();
        brand.setId(brandId);
        brand.setName("CAT");

        EquipmentPurchaseSpecDTO dto = new EquipmentPurchaseSpecDTO();
        dto.setName("CAT 320");
        dto.setDescription("Heavy excavator");
        dto.setEquipmentTypeId(typeId);
        dto.setEquipmentBrandId(brandId);
        dto.setModel("320");
        dto.setManufactureYear(2025);
        dto.setCountryOfOrigin("USA");
        dto.setSpecifications("Standard specs");
        dto.setEstimatedBudget(500000.0);

        when(equipmentTypeRepository.findById(typeId)).thenReturn(Optional.of(type));
        when(equipmentBrandRepository.findById(brandId)).thenReturn(Optional.of(brand));
        when(specRepository.save(any(EquipmentPurchaseSpec.class))).thenAnswer(i -> i.getArgument(0));

        EquipmentPurchaseSpec result = specService.create(dto);

        assertNotNull(result);
        assertEquals("CAT 320", result.getName());
        assertEquals(brand, result.getBrand());
    }

    @Test
    public void create_withoutBrand_shouldCreate() {
        UUID typeId = UUID.randomUUID();

        EquipmentType type = new EquipmentType();
        type.setId(typeId);
        type.setName("Excavator");

        EquipmentPurchaseSpecDTO dto = new EquipmentPurchaseSpecDTO();
        dto.setName("Generic Excavator");
        dto.setDescription("Description");
        dto.setEquipmentTypeId(typeId);
        dto.setEquipmentBrandId(null);

        when(equipmentTypeRepository.findById(typeId)).thenReturn(Optional.of(type));
        when(specRepository.save(any(EquipmentPurchaseSpec.class))).thenAnswer(i -> i.getArgument(0));

        EquipmentPurchaseSpec result = specService.create(dto);

        assertNotNull(result);
        assertNull(result.getBrand());
    }

    @Test
    public void create_typeNotFound_shouldThrow() {
        UUID typeId = UUID.randomUUID();

        EquipmentPurchaseSpecDTO dto = new EquipmentPurchaseSpecDTO();
        dto.setEquipmentTypeId(typeId);

        when(equipmentTypeRepository.findById(typeId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> specService.create(dto));
    }

    @Test
    public void create_brandNotFound_shouldThrow() {
        UUID typeId = UUID.randomUUID();
        UUID brandId = UUID.randomUUID();

        EquipmentType type = new EquipmentType();
        type.setId(typeId);

        EquipmentPurchaseSpecDTO dto = new EquipmentPurchaseSpecDTO();
        dto.setEquipmentTypeId(typeId);
        dto.setEquipmentBrandId(brandId);

        when(equipmentTypeRepository.findById(typeId)).thenReturn(Optional.of(type));
        when(equipmentBrandRepository.findById(brandId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> specService.create(dto));
    }

    // ==================== update ====================

    @Test
    public void update_success_shouldUpdate() {
        UUID id = UUID.randomUUID();
        UUID typeId = UUID.randomUUID();

        EquipmentType type = new EquipmentType();
        type.setId(typeId);

        EquipmentPurchaseSpec existing = createSpec();
        existing.setId(id);

        EquipmentPurchaseSpecDTO dto = new EquipmentPurchaseSpecDTO();
        dto.setName("Updated Name");
        dto.setDescription("Updated Desc");
        dto.setEquipmentTypeId(typeId);
        dto.setEquipmentBrandId(null);

        when(specRepository.findById(id)).thenReturn(Optional.of(existing));
        when(equipmentTypeRepository.findById(typeId)).thenReturn(Optional.of(type));
        when(specRepository.save(any(EquipmentPurchaseSpec.class))).thenAnswer(i -> i.getArgument(0));

        EquipmentPurchaseSpec result = specService.update(id, dto);

        assertEquals("Updated Name", result.getName());
        assertNull(result.getBrand());
    }

    @Test
    public void update_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        EquipmentPurchaseSpecDTO dto = new EquipmentPurchaseSpecDTO();
        dto.setEquipmentTypeId(UUID.randomUUID());

        when(specRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> specService.update(id, dto));
    }

    // ==================== delete ====================

    @Test
    public void delete_shouldCallRepository() {
        UUID id = UUID.randomUUID();

        specService.delete(id);

        verify(specRepository).deleteById(id);
    }

    // ==================== Helper ====================

    private EquipmentPurchaseSpec createSpec() {
        return EquipmentPurchaseSpec.builder()
                .id(UUID.randomUUID())
                .name("Test Spec")
                .description("Test Description")
                .model("Model X")
                .manufactureYear(2025)
                .build();
    }
}