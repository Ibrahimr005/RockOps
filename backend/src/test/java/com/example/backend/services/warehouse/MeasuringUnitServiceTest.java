package com.example.backend.services.warehouse;

import com.example.backend.models.warehouse.MeasuringUnit;
import com.example.backend.repositories.warehouse.MeasuringUnitRepository;
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
public class MeasuringUnitServiceTest {

    @Mock
    private MeasuringUnitRepository measuringUnitRepository;

    @InjectMocks
    private MeasuringUnitService measuringUnitService;

    // ==================== createMeasuringUnit ====================

    @Test
    public void createMeasuringUnit_withAllFields_shouldCreateSuccessfully() {
        Map<String, Object> request = new HashMap<>();
        request.put("name", "Kilogram");
        request.put("displayName", "Kilogram");
        request.put("abbreviation", "kg");
        request.put("isActive", true);

        when(measuringUnitRepository.findByName("Kilogram")).thenReturn(Optional.empty());
        when(measuringUnitRepository.save(any(MeasuringUnit.class))).thenAnswer(invocation -> {
            MeasuringUnit unit = invocation.getArgument(0);
            unit.setId(UUID.randomUUID());
            return unit;
        });

        MeasuringUnit result = measuringUnitService.createMeasuringUnit(request);

        assertNotNull(result);
        assertEquals("Kilogram", result.getName());
        assertEquals("Kilogram", result.getDisplayName());
        assertEquals("kg", result.getAbbreviation());
        assertTrue(result.getIsActive());
        verify(measuringUnitRepository).save(any(MeasuringUnit.class));
    }

    @Test
    public void createMeasuringUnit_withOnlyName_shouldUseDefaults() {
        Map<String, Object> request = new HashMap<>();
        request.put("name", "Meter");

        when(measuringUnitRepository.findByName("Meter")).thenReturn(Optional.empty());
        when(measuringUnitRepository.save(any(MeasuringUnit.class))).thenAnswer(invocation -> {
            MeasuringUnit unit = invocation.getArgument(0);
            unit.setId(UUID.randomUUID());
            return unit;
        });

        MeasuringUnit result = measuringUnitService.createMeasuringUnit(request);

        assertNotNull(result);
        assertEquals("Meter", result.getName());
        assertEquals("Meter", result.getDisplayName()); // defaults to name
        assertEquals("Meter", result.getAbbreviation()); // defaults to name
        assertTrue(result.getIsActive()); // defaults to true
    }

    @Test
    public void createMeasuringUnit_withoutName_shouldThrow() {
        Map<String, Object> request = new HashMap<>();
        request.put("displayName", "SomeUnit");

        assertThrows(IllegalArgumentException.class,
                () -> measuringUnitService.createMeasuringUnit(request));
        verify(measuringUnitRepository, never()).save(any());
    }

    @Test
    public void createMeasuringUnit_duplicateName_shouldThrow() {
        Map<String, Object> request = new HashMap<>();
        request.put("name", "Kilogram");

        MeasuringUnit existing = new MeasuringUnit();
        existing.setName("Kilogram");
        when(measuringUnitRepository.findByName("Kilogram")).thenReturn(Optional.of(existing));

        assertThrows(IllegalArgumentException.class,
                () -> measuringUnitService.createMeasuringUnit(request));
        verify(measuringUnitRepository, never()).save(any());
    }

    // ==================== getAllMeasuringUnits ====================

    @Test
    public void getAllMeasuringUnits_shouldReturnAll() {
        MeasuringUnit unit1 = createUnit("Kilogram", true);
        MeasuringUnit unit2 = createUnit("Meter", false);
        when(measuringUnitRepository.findAll()).thenReturn(List.of(unit1, unit2));

        List<MeasuringUnit> result = measuringUnitService.getAllMeasuringUnits();

        assertEquals(2, result.size());
    }

    @Test
    public void getAllMeasuringUnits_emptyList_shouldReturnEmpty() {
        when(measuringUnitRepository.findAll()).thenReturn(List.of());

        List<MeasuringUnit> result = measuringUnitService.getAllMeasuringUnits();

        assertTrue(result.isEmpty());
    }

    // ==================== getActiveMeasuringUnits ====================

    @Test
    public void getActiveMeasuringUnits_shouldReturnOnlyActive() {
        MeasuringUnit active = createUnit("Kilogram", true);
        MeasuringUnit inactive = createUnit("OldUnit", false);
        when(measuringUnitRepository.findAll()).thenReturn(List.of(active, inactive));

        List<MeasuringUnit> result = measuringUnitService.getActiveMeasuringUnits();

        assertEquals(1, result.size());
        assertEquals("Kilogram", result.get(0).getName());
    }

    // ==================== getMeasuringUnitById ====================

    @Test
    public void getMeasuringUnitById_found_shouldReturn() {
        UUID id = UUID.randomUUID();
        MeasuringUnit unit = createUnit("Kilogram", true);
        unit.setId(id);
        when(measuringUnitRepository.findById(id)).thenReturn(Optional.of(unit));

        MeasuringUnit result = measuringUnitService.getMeasuringUnitById(id);

        assertNotNull(result);
        assertEquals("Kilogram", result.getName());
    }

    @Test
    public void getMeasuringUnitById_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(measuringUnitRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> measuringUnitService.getMeasuringUnitById(id));
    }

    // ==================== updateMeasuringUnit ====================

    @Test
    public void updateMeasuringUnit_allFields_shouldUpdate() {
        UUID id = UUID.randomUUID();
        MeasuringUnit existing = createUnit("OldName", true);
        existing.setId(id);

        when(measuringUnitRepository.findById(id)).thenReturn(Optional.of(existing));
        when(measuringUnitRepository.findByName("NewName")).thenReturn(Optional.empty());
        when(measuringUnitRepository.save(any(MeasuringUnit.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> request = new HashMap<>();
        request.put("name", "NewName");
        request.put("displayName", "New Display");
        request.put("abbreviation", "NN");
        request.put("isActive", false);

        MeasuringUnit result = measuringUnitService.updateMeasuringUnit(id, request);

        assertEquals("NewName", result.getName());
        assertEquals("New Display", result.getDisplayName());
        assertEquals("NN", result.getAbbreviation());
        assertFalse(result.getIsActive());
    }

    @Test
    public void updateMeasuringUnit_nameConflict_shouldThrow() {
        UUID id = UUID.randomUUID();
        UUID otherId = UUID.randomUUID();

        MeasuringUnit existing = createUnit("OldName", true);
        existing.setId(id);

        MeasuringUnit conflict = createUnit("ConflictName", true);
        conflict.setId(otherId);

        when(measuringUnitRepository.findById(id)).thenReturn(Optional.of(existing));
        when(measuringUnitRepository.findByName("ConflictName")).thenReturn(Optional.of(conflict));

        Map<String, Object> request = new HashMap<>();
        request.put("name", "ConflictName");

        assertThrows(IllegalArgumentException.class,
                () -> measuringUnitService.updateMeasuringUnit(id, request));
    }

    @Test
    public void updateMeasuringUnit_sameNameSameUnit_shouldSucceed() {
        UUID id = UUID.randomUUID();
        MeasuringUnit existing = createUnit("SameName", true);
        existing.setId(id);

        when(measuringUnitRepository.findById(id)).thenReturn(Optional.of(existing));
        when(measuringUnitRepository.findByName("SameName")).thenReturn(Optional.of(existing));
        when(measuringUnitRepository.save(any(MeasuringUnit.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> request = new HashMap<>();
        request.put("name", "SameName");

        MeasuringUnit result = measuringUnitService.updateMeasuringUnit(id, request);

        assertEquals("SameName", result.getName());
    }

    // ==================== deleteMeasuringUnit ====================

    @Test
    public void deleteMeasuringUnit_shouldDeactivateNotDelete() {
        UUID id = UUID.randomUUID();
        MeasuringUnit unit = createUnit("Kilogram", true);
        unit.setId(id);

        when(measuringUnitRepository.findById(id)).thenReturn(Optional.of(unit));
        when(measuringUnitRepository.save(any(MeasuringUnit.class))).thenAnswer(i -> i.getArgument(0));

        measuringUnitService.deleteMeasuringUnit(id);

        assertFalse(unit.getIsActive());
        verify(measuringUnitRepository).save(unit);
        verify(measuringUnitRepository, never()).delete(any());
    }

    // ==================== Helper ====================

    private MeasuringUnit createUnit(String name, boolean active) {
        MeasuringUnit unit = new MeasuringUnit();
        unit.setId(UUID.randomUUID());
        unit.setName(name);
        unit.setDisplayName(name);
        unit.setAbbreviation(name);
        unit.setIsActive(active);
        return unit;
    }
}