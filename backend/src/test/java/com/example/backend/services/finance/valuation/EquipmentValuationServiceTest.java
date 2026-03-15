package com.example.backend.services.finance.valuation;

import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.finance.Valuation.EquipmentValuation;
import com.example.backend.models.site.Site;
import com.example.backend.models.warehouse.ItemStatus;
import com.example.backend.repositories.equipment.ConsumableRepository;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.repositories.finance.valuation.EquipmentValuationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class EquipmentValuationServiceTest {

    @Mock private EquipmentValuationRepository equipmentValuationRepository;
    @Mock private EquipmentRepository equipmentRepository;
    @Mock private ConsumableRepository consumableRepository;

    @InjectMocks
    private EquipmentValuationService equipmentValuationService;

    // ==================== FACTORY HELPERS ====================

    private Site createSite(UUID id) {
        Site site = new Site();
        site.setId(id);
        site.setName("Test Site");
        return site;
    }

    /**
     * Builds a minimal Equipment with the fields required by EquipmentValuationService.
     * Depreciation fields are left null by default (no depreciation).
     */
    private Equipment createEquipment(UUID id, UUID siteId, double egpPrice) {
        Equipment equipment = new Equipment();
        equipment.setId(id);
        equipment.setName("Test Equipment");
        equipment.setModel("Model X");
        equipment.setSerialNumber("SN-" + id);
        equipment.setEgpPrice(egpPrice);
        equipment.setSite(createSite(siteId));
        // No depreciation by default
        equipment.setUsefulLifeYears(null);
        equipment.setDepreciationStartDate(null);
        equipment.setSalvageValue(null);
        return equipment;
    }

    private Equipment createEquipmentWithDepreciation(UUID id, UUID siteId,
                                                       double egpPrice,
                                                       int usefulLifeYears,
                                                       double salvageValue,
                                                       LocalDate depreciationStartDate) {
        Equipment equipment = createEquipment(id, siteId, egpPrice);
        equipment.setUsefulLifeYears(usefulLifeYears);
        equipment.setSalvageValue(salvageValue);
        equipment.setDepreciationStartDate(depreciationStartDate);
        return equipment;
    }

    private EquipmentValuation createExistingValuation(UUID id, Equipment equipment,
                                                        double purchasePrice,
                                                        double accumulatedDepreciation,
                                                        double currentValue,
                                                        double inventoryValue,
                                                        double totalExpenses) {
        EquipmentValuation val = new EquipmentValuation();
        val.setId(id);
        val.setEquipment(equipment);
        val.setPurchasePrice(purchasePrice);
        val.setAccumulatedDepreciation(accumulatedDepreciation);
        val.setCurrentValue(currentValue);
        val.setCurrentInventoryValue(inventoryValue);
        val.setTotalExpenses(totalExpenses);
        val.setLastCalculatedAt(LocalDateTime.now().minusHours(1));
        val.setLastCalculatedBy("SYSTEM");
        return val;
    }

    // ==================== calculateEquipmentValuation ====================

    @Test
    public void calculateEquipmentValuation_equipmentNotFound_shouldThrowIllegalArgumentException() {
        UUID equipmentId = UUID.randomUUID();
        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> equipmentValuationService.calculateEquipmentValuation(equipmentId, "user1"));

        assertTrue(ex.getMessage().contains(equipmentId.toString()));
        verify(equipmentValuationRepository, never()).save(any());
    }

    @Test
    public void calculateEquipmentValuation_newEquipmentNoDepreciation_shouldCreateAndSaveValuation() {
        UUID equipmentId = UUID.randomUUID();
        UUID siteId = UUID.randomUUID();
        Equipment equipment = createEquipment(equipmentId, siteId, 50000.0);

        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.of(equipment));
        when(equipmentValuationRepository.findByEquipmentId(equipmentId)).thenReturn(Optional.empty());
        when(consumableRepository.calculateTotalValueByEquipmentAndStatus(equipmentId, ItemStatus.IN_WAREHOUSE))
                .thenReturn(2000.0);

        ArgumentCaptor<EquipmentValuation> captor = ArgumentCaptor.forClass(EquipmentValuation.class);
        EquipmentValuation savedVal = new EquipmentValuation();
        savedVal.setId(UUID.randomUUID());
        savedVal.setEquipment(equipment);
        savedVal.setPurchasePrice(50000.0);
        savedVal.setAccumulatedDepreciation(0.0);
        savedVal.setCurrentValue(50000.0);
        savedVal.setCurrentInventoryValue(0.0);
        savedVal.setTotalExpenses(2000.0);
        when(equipmentValuationRepository.save(captor.capture())).thenReturn(savedVal);

        EquipmentValuation result = equipmentValuationService.calculateEquipmentValuation(equipmentId, "user1");

        assertNotNull(result);
        verify(equipmentValuationRepository).save(any(EquipmentValuation.class));
        EquipmentValuation captured = captor.getValue();
        assertEquals(50000.0, captured.getPurchasePrice());
        assertEquals(0.0, captured.getAccumulatedDepreciation());
        // currentValue = purchasePrice - accumulatedDepreciation = 50000 - 0 = 50000
        assertEquals(50000.0, captured.getCurrentValue());
        assertEquals(0.0, captured.getCurrentInventoryValue()); // always 0.0 per service logic
        assertEquals(2000.0, captured.getTotalExpenses());
        assertEquals("user1", captured.getLastCalculatedBy());
        assertNotNull(captured.getLastCalculatedAt());
    }

    @Test
    public void calculateEquipmentValuation_existingValuationWithChangedPurchasePrice_shouldSave() {
        UUID equipmentId = UUID.randomUUID();
        UUID siteId = UUID.randomUUID();
        Equipment equipment = createEquipment(equipmentId, siteId, 60000.0); // price changed to 60k

        EquipmentValuation existing = createExistingValuation(
                UUID.randomUUID(), equipment, 50000.0, 0.0, 50000.0, 0.0, 1000.0);

        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.of(equipment));
        when(equipmentValuationRepository.findByEquipmentId(equipmentId)).thenReturn(Optional.of(existing));
        when(consumableRepository.calculateTotalValueByEquipmentAndStatus(equipmentId, ItemStatus.IN_WAREHOUSE))
                .thenReturn(1000.0);

        ArgumentCaptor<EquipmentValuation> captor = ArgumentCaptor.forClass(EquipmentValuation.class);
        when(equipmentValuationRepository.save(captor.capture())).thenReturn(existing);

        equipmentValuationService.calculateEquipmentValuation(equipmentId, "admin");

        verify(equipmentValuationRepository).save(any());
        assertEquals(60000.0, captor.getValue().getPurchasePrice());
    }

    @Test
    public void calculateEquipmentValuation_existingValuationUnchanged_shouldSkipSave() {
        UUID equipmentId = UUID.randomUUID();
        UUID siteId = UUID.randomUUID();
        Equipment equipment = createEquipment(equipmentId, siteId, 50000.0);

        // Existing valuation has exactly the values that will be recalculated:
        // purchasePrice=50000, depreciation=0, currentValue=50000, inventoryValue=0, expenses=1500
        EquipmentValuation existing = createExistingValuation(
                UUID.randomUUID(), equipment, 50000.0, 0.0, 50000.0, 0.0, 1500.0);

        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.of(equipment));
        when(equipmentValuationRepository.findByEquipmentId(equipmentId)).thenReturn(Optional.of(existing));
        when(consumableRepository.calculateTotalValueByEquipmentAndStatus(equipmentId, ItemStatus.IN_WAREHOUSE))
                .thenReturn(1500.0);

        EquipmentValuation result = equipmentValuationService.calculateEquipmentValuation(equipmentId, "SYSTEM");

        verify(equipmentValuationRepository, never()).save(any());
        assertNotNull(result);
    }

    @Test
    public void calculateEquipmentValuation_nullConsumableExpenses_shouldDefaultToZero() {
        UUID equipmentId = UUID.randomUUID();
        UUID siteId = UUID.randomUUID();
        Equipment equipment = createEquipment(equipmentId, siteId, 30000.0);

        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.of(equipment));
        when(equipmentValuationRepository.findByEquipmentId(equipmentId)).thenReturn(Optional.empty());
        when(consumableRepository.calculateTotalValueByEquipmentAndStatus(equipmentId, ItemStatus.IN_WAREHOUSE))
                .thenReturn(null);

        ArgumentCaptor<EquipmentValuation> captor = ArgumentCaptor.forClass(EquipmentValuation.class);
        EquipmentValuation savedVal = new EquipmentValuation();
        savedVal.setId(UUID.randomUUID());
        savedVal.setTotalExpenses(0.0);
        when(equipmentValuationRepository.save(captor.capture())).thenReturn(savedVal);

        equipmentValuationService.calculateEquipmentValuation(equipmentId, "SYSTEM");

        assertEquals(0.0, captor.getValue().getTotalExpenses());
    }

    @Test
    public void calculateEquipmentValuation_inventoryValue_shouldAlwaysBeZero() {
        UUID equipmentId = UUID.randomUUID();
        UUID siteId = UUID.randomUUID();
        Equipment equipment = createEquipment(equipmentId, siteId, 20000.0);

        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.of(equipment));
        when(equipmentValuationRepository.findByEquipmentId(equipmentId)).thenReturn(Optional.empty());
        when(consumableRepository.calculateTotalValueByEquipmentAndStatus(equipmentId, ItemStatus.IN_WAREHOUSE))
                .thenReturn(500.0);

        ArgumentCaptor<EquipmentValuation> captor = ArgumentCaptor.forClass(EquipmentValuation.class);
        EquipmentValuation savedVal = new EquipmentValuation();
        savedVal.setId(UUID.randomUUID());
        savedVal.setCurrentInventoryValue(0.0);
        when(equipmentValuationRepository.save(captor.capture())).thenReturn(savedVal);

        equipmentValuationService.calculateEquipmentValuation(equipmentId, "SYSTEM");

        // Service always sets inventory value to 0.0 (equipment does not track inventory)
        assertEquals(0.0, captor.getValue().getCurrentInventoryValue());
    }

    // ==================== Depreciation Calculation ====================

    @Test
    public void calculateEquipmentValuation_nullUsefulLifeYears_shouldHaveZeroDepreciation() {
        UUID equipmentId = UUID.randomUUID();
        UUID siteId = UUID.randomUUID();
        Equipment equipment = createEquipment(equipmentId, siteId, 100000.0);
        equipment.setUsefulLifeYears(null);
        equipment.setDepreciationStartDate(LocalDate.now().minusYears(2));

        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.of(equipment));
        when(equipmentValuationRepository.findByEquipmentId(equipmentId)).thenReturn(Optional.empty());
        when(consumableRepository.calculateTotalValueByEquipmentAndStatus(equipmentId, ItemStatus.IN_WAREHOUSE))
                .thenReturn(0.0);

        ArgumentCaptor<EquipmentValuation> captor = ArgumentCaptor.forClass(EquipmentValuation.class);
        EquipmentValuation savedVal = new EquipmentValuation();
        savedVal.setId(UUID.randomUUID());
        savedVal.setAccumulatedDepreciation(0.0);
        savedVal.setCurrentValue(100000.0);
        when(equipmentValuationRepository.save(captor.capture())).thenReturn(savedVal);

        equipmentValuationService.calculateEquipmentValuation(equipmentId, "SYSTEM");

        assertEquals(0.0, captor.getValue().getAccumulatedDepreciation());
        assertEquals(100000.0, captor.getValue().getCurrentValue());
    }

    @Test
    public void calculateEquipmentValuation_zeroUsefulLifeYears_shouldHaveZeroDepreciation() {
        UUID equipmentId = UUID.randomUUID();
        UUID siteId = UUID.randomUUID();
        Equipment equipment = createEquipmentWithDepreciation(
                equipmentId, siteId, 80000.0, 0, 10000.0, LocalDate.now().minusYears(3));

        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.of(equipment));
        when(equipmentValuationRepository.findByEquipmentId(equipmentId)).thenReturn(Optional.empty());
        when(consumableRepository.calculateTotalValueByEquipmentAndStatus(equipmentId, ItemStatus.IN_WAREHOUSE))
                .thenReturn(0.0);

        ArgumentCaptor<EquipmentValuation> captor = ArgumentCaptor.forClass(EquipmentValuation.class);
        EquipmentValuation savedVal = new EquipmentValuation();
        savedVal.setId(UUID.randomUUID());
        savedVal.setAccumulatedDepreciation(0.0);
        when(equipmentValuationRepository.save(captor.capture())).thenReturn(savedVal);

        equipmentValuationService.calculateEquipmentValuation(equipmentId, "SYSTEM");

        assertEquals(0.0, captor.getValue().getAccumulatedDepreciation());
    }

    @Test
    public void calculateEquipmentValuation_nullDepreciationStartDate_shouldHaveZeroDepreciation() {
        UUID equipmentId = UUID.randomUUID();
        UUID siteId = UUID.randomUUID();
        Equipment equipment = createEquipment(equipmentId, siteId, 100000.0);
        equipment.setUsefulLifeYears(10);
        equipment.setSalvageValue(5000.0);
        equipment.setDepreciationStartDate(null);

        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.of(equipment));
        when(equipmentValuationRepository.findByEquipmentId(equipmentId)).thenReturn(Optional.empty());
        when(consumableRepository.calculateTotalValueByEquipmentAndStatus(equipmentId, ItemStatus.IN_WAREHOUSE))
                .thenReturn(0.0);

        ArgumentCaptor<EquipmentValuation> captor = ArgumentCaptor.forClass(EquipmentValuation.class);
        EquipmentValuation savedVal = new EquipmentValuation();
        savedVal.setId(UUID.randomUUID());
        savedVal.setAccumulatedDepreciation(0.0);
        when(equipmentValuationRepository.save(captor.capture())).thenReturn(savedVal);

        equipmentValuationService.calculateEquipmentValuation(equipmentId, "SYSTEM");

        assertEquals(0.0, captor.getValue().getAccumulatedDepreciation());
    }

    @Test
    public void calculateEquipmentValuation_futureDerpreciationStartDate_shouldHaveZeroDepreciation() {
        UUID equipmentId = UUID.randomUUID();
        UUID siteId = UUID.randomUUID();
        // Start date is in the future — no time has elapsed
        Equipment equipment = createEquipmentWithDepreciation(
                equipmentId, siteId, 100000.0, 10, 5000.0, LocalDate.now().plusYears(1));

        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.of(equipment));
        when(equipmentValuationRepository.findByEquipmentId(equipmentId)).thenReturn(Optional.empty());
        when(consumableRepository.calculateTotalValueByEquipmentAndStatus(equipmentId, ItemStatus.IN_WAREHOUSE))
                .thenReturn(0.0);

        ArgumentCaptor<EquipmentValuation> captor = ArgumentCaptor.forClass(EquipmentValuation.class);
        EquipmentValuation savedVal = new EquipmentValuation();
        savedVal.setId(UUID.randomUUID());
        savedVal.setAccumulatedDepreciation(0.0);
        when(equipmentValuationRepository.save(captor.capture())).thenReturn(savedVal);

        equipmentValuationService.calculateEquipmentValuation(equipmentId, "SYSTEM");

        assertEquals(0.0, captor.getValue().getAccumulatedDepreciation());
    }

    @Test
    public void calculateEquipmentValuation_straightLineDepreciation_shouldCalculateCorrectly() {
        UUID equipmentId = UUID.randomUUID();
        UUID siteId = UUID.randomUUID();
        // Purchase price = 100,000, salvage value = 0, useful life = 10 years
        // Annual depreciation = (100,000 - 0) / 10 = 10,000 / year
        // Start date exactly 5 years ago => accumulated = ~50,000
        LocalDate fiveYearsAgo = LocalDate.now().minusYears(5);
        Equipment equipment = createEquipmentWithDepreciation(
                equipmentId, siteId, 100000.0, 10, 0.0, fiveYearsAgo);

        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.of(equipment));
        when(equipmentValuationRepository.findByEquipmentId(equipmentId)).thenReturn(Optional.empty());
        when(consumableRepository.calculateTotalValueByEquipmentAndStatus(equipmentId, ItemStatus.IN_WAREHOUSE))
                .thenReturn(0.0);

        ArgumentCaptor<EquipmentValuation> captor = ArgumentCaptor.forClass(EquipmentValuation.class);
        EquipmentValuation savedVal = new EquipmentValuation();
        savedVal.setId(UUID.randomUUID());
        when(equipmentValuationRepository.save(captor.capture())).thenReturn(savedVal);

        equipmentValuationService.calculateEquipmentValuation(equipmentId, "SYSTEM");

        EquipmentValuation captured = captor.getValue();
        // ~5 years elapsed at 10,000/year = ~50,000 depreciation
        // Tolerance of 1000 to accommodate leap-year rounding in 365.25 calculation
        assertEquals(50000.0, captured.getAccumulatedDepreciation(), 1000.0);
        // currentValue = 100000 - ~50000 = ~50000
        assertTrue(captured.getCurrentValue() >= 49000.0 && captured.getCurrentValue() <= 51000.0,
                "Expected currentValue near 50000 but was: " + captured.getCurrentValue());
    }

    @Test
    public void calculateEquipmentValuation_depreciationWithSalvageValue_shouldSubtractSalvageFromDepreciableBase() {
        UUID equipmentId = UUID.randomUUID();
        UUID siteId = UUID.randomUUID();
        // Purchase price = 100,000, salvage value = 20,000, useful life = 10 years
        // Depreciable amount = 80,000; annual = 8,000
        // After 10 years: accumulated = 80,000
        LocalDate tenYearsAgo = LocalDate.now().minusYears(10);
        Equipment equipment = createEquipmentWithDepreciation(
                equipmentId, siteId, 100000.0, 10, 20000.0, tenYearsAgo);

        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.of(equipment));
        when(equipmentValuationRepository.findByEquipmentId(equipmentId)).thenReturn(Optional.empty());
        when(consumableRepository.calculateTotalValueByEquipmentAndStatus(equipmentId, ItemStatus.IN_WAREHOUSE))
                .thenReturn(0.0);

        ArgumentCaptor<EquipmentValuation> captor = ArgumentCaptor.forClass(EquipmentValuation.class);
        EquipmentValuation savedVal = new EquipmentValuation();
        savedVal.setId(UUID.randomUUID());
        when(equipmentValuationRepository.save(captor.capture())).thenReturn(savedVal);

        equipmentValuationService.calculateEquipmentValuation(equipmentId, "SYSTEM");

        // Accumulated depreciation should be capped at depreciable amount = 80,000
        assertEquals(80000.0, captor.getValue().getAccumulatedDepreciation(), 100.0);
    }

    @Test
    public void calculateEquipmentValuation_depreciationExceedsDepreciableAmount_shouldBeCapped() {
        UUID equipmentId = UUID.randomUUID();
        UUID siteId = UUID.randomUUID();
        // Equipment started depreciation 20 years ago with only 10-year useful life
        // Without a cap, accumulated depreciation would exceed the depreciable amount
        LocalDate twentyYearsAgo = LocalDate.now().minusYears(20);
        Equipment equipment = createEquipmentWithDepreciation(
                equipmentId, siteId, 50000.0, 10, 0.0, twentyYearsAgo);

        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.of(equipment));
        when(equipmentValuationRepository.findByEquipmentId(equipmentId)).thenReturn(Optional.empty());
        when(consumableRepository.calculateTotalValueByEquipmentAndStatus(equipmentId, ItemStatus.IN_WAREHOUSE))
                .thenReturn(0.0);

        ArgumentCaptor<EquipmentValuation> captor = ArgumentCaptor.forClass(EquipmentValuation.class);
        EquipmentValuation savedVal = new EquipmentValuation();
        savedVal.setId(UUID.randomUUID());
        when(equipmentValuationRepository.save(captor.capture())).thenReturn(savedVal);

        equipmentValuationService.calculateEquipmentValuation(equipmentId, "SYSTEM");

        EquipmentValuation captured = captor.getValue();
        // Cap: accumulated depreciation must not exceed depreciableAmount (50,000 - 0 = 50,000)
        assertEquals(50000.0, captured.getAccumulatedDepreciation(), 0.01);
        // currentValue capped at 0 (cannot go negative)
        assertEquals(0.0, captured.getCurrentValue());
    }

    @Test
    public void calculateEquipmentValuation_currentValueCannotGoNegative_shouldBeZeroWhenFullyDepreciated() {
        UUID equipmentId = UUID.randomUUID();
        UUID siteId = UUID.randomUUID();
        LocalDate longAgo = LocalDate.now().minusYears(30);
        Equipment equipment = createEquipmentWithDepreciation(
                equipmentId, siteId, 10000.0, 5, 0.0, longAgo);

        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.of(equipment));
        when(equipmentValuationRepository.findByEquipmentId(equipmentId)).thenReturn(Optional.empty());
        when(consumableRepository.calculateTotalValueByEquipmentAndStatus(equipmentId, ItemStatus.IN_WAREHOUSE))
                .thenReturn(0.0);

        ArgumentCaptor<EquipmentValuation> captor = ArgumentCaptor.forClass(EquipmentValuation.class);
        EquipmentValuation savedVal = new EquipmentValuation();
        savedVal.setId(UUID.randomUUID());
        when(equipmentValuationRepository.save(captor.capture())).thenReturn(savedVal);

        equipmentValuationService.calculateEquipmentValuation(equipmentId, "SYSTEM");

        // currentValue must be >= 0
        assertTrue(captor.getValue().getCurrentValue() >= 0.0,
                "currentValue must not be negative");
    }

    // ==================== getEquipmentValuation ====================

    @Test
    public void getEquipmentValuation_valuationExists_shouldReturnExistingWithoutRecalculating() {
        UUID equipmentId = UUID.randomUUID();
        UUID siteId = UUID.randomUUID();
        Equipment equipment = createEquipment(equipmentId, siteId, 40000.0);
        EquipmentValuation existing = createExistingValuation(
                UUID.randomUUID(), equipment, 40000.0, 4000.0, 36000.0, 0.0, 500.0);

        when(equipmentValuationRepository.findByEquipmentId(equipmentId)).thenReturn(Optional.of(existing));

        EquipmentValuation result = equipmentValuationService.getEquipmentValuation(equipmentId);

        assertNotNull(result);
        assertEquals(40000.0, result.getPurchasePrice());
        assertEquals(36000.0, result.getCurrentValue());
        verify(equipmentRepository, never()).findById(any());
        verify(consumableRepository, never()).calculateTotalValueByEquipmentAndStatus(any(), any());
    }

    @Test
    public void getEquipmentValuation_valuationDoesNotExist_shouldTriggerCalculation() {
        UUID equipmentId = UUID.randomUUID();
        UUID siteId = UUID.randomUUID();
        Equipment equipment = createEquipment(equipmentId, siteId, 25000.0);

        when(equipmentValuationRepository.findByEquipmentId(equipmentId))
                .thenReturn(Optional.empty())   // call from getEquipmentValuation
                .thenReturn(Optional.empty());  // call inside calculateEquipmentValuation
        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.of(equipment));
        when(consumableRepository.calculateTotalValueByEquipmentAndStatus(equipmentId, ItemStatus.IN_WAREHOUSE))
                .thenReturn(0.0);

        EquipmentValuation savedVal = new EquipmentValuation();
        savedVal.setId(UUID.randomUUID());
        savedVal.setEquipment(equipment);
        savedVal.setPurchasePrice(25000.0);
        savedVal.setCurrentValue(25000.0);
        savedVal.setAccumulatedDepreciation(0.0);
        savedVal.setCurrentInventoryValue(0.0);
        savedVal.setTotalExpenses(0.0);
        when(equipmentValuationRepository.save(any())).thenReturn(savedVal);

        EquipmentValuation result = equipmentValuationService.getEquipmentValuation(equipmentId);

        assertNotNull(result);
        assertEquals(25000.0, result.getPurchasePrice());
        verify(equipmentValuationRepository, atLeastOnce()).save(any());
    }

    // ==================== recalculateSiteEquipment ====================

    @Test
    public void recalculateSiteEquipment_multipleEquipment_shouldRecalculateAll() {
        UUID siteId = UUID.randomUUID();
        UUID eq1Id = UUID.randomUUID();
        UUID eq2Id = UUID.randomUUID();
        Equipment eq1 = createEquipment(eq1Id, siteId, 50000.0);
        Equipment eq2 = createEquipment(eq2Id, siteId, 30000.0);

        when(equipmentRepository.findBySiteId(siteId)).thenReturn(List.of(eq1, eq2));

        when(equipmentRepository.findById(eq1Id)).thenReturn(Optional.of(eq1));
        when(equipmentValuationRepository.findByEquipmentId(eq1Id)).thenReturn(Optional.empty());
        when(consumableRepository.calculateTotalValueByEquipmentAndStatus(eq1Id, ItemStatus.IN_WAREHOUSE))
                .thenReturn(1000.0);

        when(equipmentRepository.findById(eq2Id)).thenReturn(Optional.of(eq2));
        when(equipmentValuationRepository.findByEquipmentId(eq2Id)).thenReturn(Optional.empty());
        when(consumableRepository.calculateTotalValueByEquipmentAndStatus(eq2Id, ItemStatus.IN_WAREHOUSE))
                .thenReturn(500.0);

        EquipmentValuation val1 = new EquipmentValuation();
        val1.setId(UUID.randomUUID());
        val1.setEquipment(eq1);
        val1.setPurchasePrice(50000.0);
        val1.setCurrentValue(50000.0);
        val1.setTotalExpenses(1000.0);

        EquipmentValuation val2 = new EquipmentValuation();
        val2.setId(UUID.randomUUID());
        val2.setEquipment(eq2);
        val2.setPurchasePrice(30000.0);
        val2.setCurrentValue(30000.0);
        val2.setTotalExpenses(500.0);

        when(equipmentValuationRepository.save(any()))
                .thenReturn(val1)
                .thenReturn(val2);

        List<EquipmentValuation> results = equipmentValuationService.recalculateSiteEquipment(siteId, "admin");

        assertNotNull(results);
        assertEquals(2, results.size());
        verify(equipmentValuationRepository, times(2)).save(any());
    }

    @Test
    public void recalculateSiteEquipment_noEquipmentInSite_shouldReturnEmptyList() {
        UUID siteId = UUID.randomUUID();
        when(equipmentRepository.findBySiteId(siteId)).thenReturn(Collections.emptyList());

        List<EquipmentValuation> results = equipmentValuationService.recalculateSiteEquipment(siteId, "SYSTEM");

        assertNotNull(results);
        assertTrue(results.isEmpty());
        verify(equipmentValuationRepository, never()).save(any());
    }

    // ==================== hasValuation ====================

    @Test
    public void hasValuation_valuationExists_shouldReturnTrue() {
        UUID equipmentId = UUID.randomUUID();
        when(equipmentValuationRepository.existsByEquipmentId(equipmentId)).thenReturn(true);

        boolean result = equipmentValuationService.hasValuation(equipmentId);

        assertTrue(result);
        verify(equipmentValuationRepository).existsByEquipmentId(equipmentId);
    }

    @Test
    public void hasValuation_valuationDoesNotExist_shouldReturnFalse() {
        UUID equipmentId = UUID.randomUUID();
        when(equipmentValuationRepository.existsByEquipmentId(equipmentId)).thenReturn(false);

        boolean result = equipmentValuationService.hasValuation(equipmentId);

        assertFalse(result);
    }

    // ==================== getSiteEquipmentValuations ====================

    @Test
    public void getSiteEquipmentValuations_siteWithValuations_shouldReturnAllValuations() {
        UUID siteId = UUID.randomUUID();
        EquipmentValuation val1 = new EquipmentValuation();
        val1.setId(UUID.randomUUID());
        EquipmentValuation val2 = new EquipmentValuation();
        val2.setId(UUID.randomUUID());

        when(equipmentValuationRepository.findByEquipmentSiteId(siteId)).thenReturn(List.of(val1, val2));

        List<EquipmentValuation> results = equipmentValuationService.getSiteEquipmentValuations(siteId);

        assertNotNull(results);
        assertEquals(2, results.size());
        verify(equipmentValuationRepository).findByEquipmentSiteId(siteId);
    }

    @Test
    public void getSiteEquipmentValuations_siteWithNoValuations_shouldReturnEmptyList() {
        UUID siteId = UUID.randomUUID();
        when(equipmentValuationRepository.findByEquipmentSiteId(siteId)).thenReturn(Collections.emptyList());

        List<EquipmentValuation> results = equipmentValuationService.getSiteEquipmentValuations(siteId);

        assertNotNull(results);
        assertTrue(results.isEmpty());
    }
}