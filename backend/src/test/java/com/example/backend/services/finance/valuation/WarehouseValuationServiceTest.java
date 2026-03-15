package com.example.backend.services.finance.valuation;

import com.example.backend.models.finance.Valuation.WarehouseValuation;
import com.example.backend.models.site.Site;
import com.example.backend.models.warehouse.Item;
import com.example.backend.models.warehouse.ItemStatus;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.repositories.finance.valuation.WarehouseValuationRepository;
import com.example.backend.repositories.warehouse.ItemRepository;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class WarehouseValuationServiceTest {

    @Mock private WarehouseValuationRepository warehouseValuationRepository;
    @Mock private WarehouseRepository warehouseRepository;
    @Mock private ItemRepository itemRepository;

    @InjectMocks
    private WarehouseValuationService warehouseValuationService;

    // ==================== FACTORY HELPERS ====================

    private Site createSite(UUID id) {
        Site site = new Site();
        site.setId(id);
        site.setName("Test Site");
        return site;
    }

    private Warehouse createWarehouse(UUID id) {
        Warehouse warehouse = new Warehouse();
        warehouse.setId(id);
        warehouse.setName("Test Warehouse");
        warehouse.setSite(createSite(UUID.randomUUID()));
        return warehouse;
    }

    private Item createConsumedItem(Warehouse warehouse, double totalValue) {
        Item item = new Item();
        item.setId(UUID.randomUUID());
        item.setWarehouse(warehouse);
        item.setQuantity(5);
        item.setUnitPrice(totalValue / 5.0);
        item.setTotalValue(totalValue);
        item.setItemStatus(ItemStatus.CONSUMED);
        return item;
    }

    private WarehouseValuation createExistingValuation(UUID id, Warehouse warehouse,
                                                        double currentValue, double totalExpenses,
                                                        int totalItems) {
        WarehouseValuation val = new WarehouseValuation();
        val.setId(id);
        val.setWarehouse(warehouse);
        val.setCurrentValue(currentValue);
        val.setTotalExpenses(totalExpenses);
        val.setTotalItems(totalItems);
        val.setLastCalculatedAt(LocalDateTime.now().minusHours(1));
        val.setLastCalculatedBy("SYSTEM");
        return val;
    }

    // ==================== calculateWarehouseValuation ====================

    @Test
    public void calculateWarehouseValuation_warehouseNotFound_shouldThrowIllegalArgumentException() {
        UUID warehouseId = UUID.randomUUID();
        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> warehouseValuationService.calculateWarehouseValuation(warehouseId, "user1"));

        assertTrue(ex.getMessage().contains(warehouseId.toString()));
        verify(warehouseValuationRepository, never()).save(any());
    }

    @Test
    public void calculateWarehouseValuation_newWarehouse_shouldCreateAndSaveValuation() {
        UUID warehouseId = UUID.randomUUID();
        Warehouse warehouse = createWarehouse(warehouseId);
        Item consumedItem = createConsumedItem(warehouse, 500.0);

        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.of(warehouse));
        when(warehouseValuationRepository.findByWarehouseId(warehouseId)).thenReturn(Optional.empty());
        when(itemRepository.calculateWarehouseBalance(warehouse)).thenReturn(2000.0);
        when(itemRepository.findByWarehouseAndItemStatus(warehouse, ItemStatus.CONSUMED))
                .thenReturn(List.of(consumedItem));
        when(itemRepository.getTotalQuantityInWarehouse(warehouse)).thenReturn(20);

        ArgumentCaptor<WarehouseValuation> captor = ArgumentCaptor.forClass(WarehouseValuation.class);
        WarehouseValuation savedVal = new WarehouseValuation();
        savedVal.setId(UUID.randomUUID());
        savedVal.setWarehouse(warehouse);
        savedVal.setCurrentValue(2000.0);
        savedVal.setTotalExpenses(500.0);
        savedVal.setTotalItems(20);
        when(warehouseValuationRepository.save(captor.capture())).thenReturn(savedVal);

        WarehouseValuation result = warehouseValuationService.calculateWarehouseValuation(warehouseId, "user1");

        assertNotNull(result);
        verify(warehouseValuationRepository).save(any(WarehouseValuation.class));
        WarehouseValuation captured = captor.getValue();
        assertEquals(2000.0, captured.getCurrentValue());
        assertEquals(500.0, captured.getTotalExpenses());
        assertEquals(20, captured.getTotalItems());
        assertEquals("user1", captured.getLastCalculatedBy());
        assertNotNull(captured.getLastCalculatedAt());
    }

    @Test
    public void calculateWarehouseValuation_existingValuationWithChangedData_shouldSaveUpdatedValuation() {
        UUID warehouseId = UUID.randomUUID();
        Warehouse warehouse = createWarehouse(warehouseId);
        UUID existingId = UUID.randomUUID();
        WarehouseValuation existing = createExistingValuation(existingId, warehouse, 1000.0, 200.0, 10);

        Item consumedItem = createConsumedItem(warehouse, 300.0);

        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.of(warehouse));
        when(warehouseValuationRepository.findByWarehouseId(warehouseId)).thenReturn(Optional.of(existing));
        // New balance differs from old: 1500 vs 1000
        when(itemRepository.calculateWarehouseBalance(warehouse)).thenReturn(1500.0);
        when(itemRepository.findByWarehouseAndItemStatus(warehouse, ItemStatus.CONSUMED))
                .thenReturn(List.of(consumedItem));
        when(itemRepository.getTotalQuantityInWarehouse(warehouse)).thenReturn(10);

        ArgumentCaptor<WarehouseValuation> captor = ArgumentCaptor.forClass(WarehouseValuation.class);
        when(warehouseValuationRepository.save(captor.capture())).thenReturn(existing);

        warehouseValuationService.calculateWarehouseValuation(warehouseId, "admin");

        verify(warehouseValuationRepository).save(any(WarehouseValuation.class));
        WarehouseValuation captured = captor.getValue();
        assertEquals(1500.0, captured.getCurrentValue());
        assertEquals(300.0, captured.getTotalExpenses());
        assertEquals("admin", captured.getLastCalculatedBy());
    }

    @Test
    public void calculateWarehouseValuation_existingValuationUnchanged_shouldSkipSave() {
        UUID warehouseId = UUID.randomUUID();
        Warehouse warehouse = createWarehouse(warehouseId);
        // Existing valuation matches what will be recalculated exactly
        WarehouseValuation existing = createExistingValuation(UUID.randomUUID(), warehouse, 1000.0, 200.0, 10);

        Item consumedItem = createConsumedItem(warehouse, 200.0);

        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.of(warehouse));
        when(warehouseValuationRepository.findByWarehouseId(warehouseId)).thenReturn(Optional.of(existing));
        when(itemRepository.calculateWarehouseBalance(warehouse)).thenReturn(1000.0);
        when(itemRepository.findByWarehouseAndItemStatus(warehouse, ItemStatus.CONSUMED))
                .thenReturn(List.of(consumedItem));
        when(itemRepository.getTotalQuantityInWarehouse(warehouse)).thenReturn(10);

        WarehouseValuation result = warehouseValuationService.calculateWarehouseValuation(warehouseId, "SYSTEM");

        verify(warehouseValuationRepository, never()).save(any());
        assertNotNull(result);
        assertEquals(1000.0, result.getCurrentValue());
    }

    @Test
    public void calculateWarehouseValuation_nullBalanceFromRepo_shouldDefaultCurrentValueToZero() {
        UUID warehouseId = UUID.randomUUID();
        Warehouse warehouse = createWarehouse(warehouseId);

        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.of(warehouse));
        when(warehouseValuationRepository.findByWarehouseId(warehouseId)).thenReturn(Optional.empty());
        when(itemRepository.calculateWarehouseBalance(warehouse)).thenReturn(null);
        when(itemRepository.findByWarehouseAndItemStatus(warehouse, ItemStatus.CONSUMED))
                .thenReturn(Collections.emptyList());
        when(itemRepository.getTotalQuantityInWarehouse(warehouse)).thenReturn(null);

        ArgumentCaptor<WarehouseValuation> captor = ArgumentCaptor.forClass(WarehouseValuation.class);
        WarehouseValuation savedVal = new WarehouseValuation();
        savedVal.setId(UUID.randomUUID());
        savedVal.setCurrentValue(0.0);
        savedVal.setTotalExpenses(0.0);
        savedVal.setTotalItems(0);
        when(warehouseValuationRepository.save(captor.capture())).thenReturn(savedVal);

        warehouseValuationService.calculateWarehouseValuation(warehouseId, "SYSTEM");

        WarehouseValuation captured = captor.getValue();
        assertEquals(0.0, captured.getCurrentValue());
        assertEquals(0.0, captured.getTotalExpenses());
        assertEquals(0, captured.getTotalItems());
    }

    @Test
    public void calculateWarehouseValuation_multipleConsumedItems_shouldSumAllExpenses() {
        UUID warehouseId = UUID.randomUUID();
        Warehouse warehouse = createWarehouse(warehouseId);

        Item item1 = createConsumedItem(warehouse, 300.0);
        Item item2 = createConsumedItem(warehouse, 450.0);
        Item item3 = createConsumedItem(warehouse, 250.0); // total = 1000.0

        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.of(warehouse));
        when(warehouseValuationRepository.findByWarehouseId(warehouseId)).thenReturn(Optional.empty());
        when(itemRepository.calculateWarehouseBalance(warehouse)).thenReturn(5000.0);
        when(itemRepository.findByWarehouseAndItemStatus(warehouse, ItemStatus.CONSUMED))
                .thenReturn(List.of(item1, item2, item3));
        when(itemRepository.getTotalQuantityInWarehouse(warehouse)).thenReturn(50);

        ArgumentCaptor<WarehouseValuation> captor = ArgumentCaptor.forClass(WarehouseValuation.class);
        WarehouseValuation savedVal = new WarehouseValuation();
        savedVal.setCurrentValue(5000.0);
        savedVal.setTotalExpenses(1000.0);
        savedVal.setTotalItems(50);
        when(warehouseValuationRepository.save(captor.capture())).thenReturn(savedVal);

        warehouseValuationService.calculateWarehouseValuation(warehouseId, "SYSTEM");

        WarehouseValuation captured = captor.getValue();
        assertEquals(1000.0, captured.getTotalExpenses(), 0.01);
    }

    @Test
    public void calculateWarehouseValuation_consumedItemWithNullTotalValue_shouldBeExcludedFromExpenses() {
        UUID warehouseId = UUID.randomUUID();
        Warehouse warehouse = createWarehouse(warehouseId);

        Item itemWithValue = createConsumedItem(warehouse, 500.0);
        Item itemWithNullValue = new Item();
        itemWithNullValue.setId(UUID.randomUUID());
        itemWithNullValue.setWarehouse(warehouse);
        itemWithNullValue.setItemStatus(ItemStatus.CONSUMED);
        itemWithNullValue.setTotalValue(null);

        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.of(warehouse));
        when(warehouseValuationRepository.findByWarehouseId(warehouseId)).thenReturn(Optional.empty());
        when(itemRepository.calculateWarehouseBalance(warehouse)).thenReturn(3000.0);
        when(itemRepository.findByWarehouseAndItemStatus(warehouse, ItemStatus.CONSUMED))
                .thenReturn(List.of(itemWithValue, itemWithNullValue));
        when(itemRepository.getTotalQuantityInWarehouse(warehouse)).thenReturn(30);

        ArgumentCaptor<WarehouseValuation> captor = ArgumentCaptor.forClass(WarehouseValuation.class);
        WarehouseValuation savedVal = new WarehouseValuation();
        savedVal.setCurrentValue(3000.0);
        savedVal.setTotalExpenses(500.0);
        when(warehouseValuationRepository.save(captor.capture())).thenReturn(savedVal);

        warehouseValuationService.calculateWarehouseValuation(warehouseId, "SYSTEM");

        WarehouseValuation captured = captor.getValue();
        assertEquals(500.0, captured.getTotalExpenses(), 0.01);
    }

    @Test
    public void calculateWarehouseValuation_emptyConsumedItems_shouldHaveZeroExpenses() {
        UUID warehouseId = UUID.randomUUID();
        Warehouse warehouse = createWarehouse(warehouseId);

        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.of(warehouse));
        when(warehouseValuationRepository.findByWarehouseId(warehouseId)).thenReturn(Optional.empty());
        when(itemRepository.calculateWarehouseBalance(warehouse)).thenReturn(8000.0);
        when(itemRepository.findByWarehouseAndItemStatus(warehouse, ItemStatus.CONSUMED))
                .thenReturn(new ArrayList<>());
        when(itemRepository.getTotalQuantityInWarehouse(warehouse)).thenReturn(80);

        ArgumentCaptor<WarehouseValuation> captor = ArgumentCaptor.forClass(WarehouseValuation.class);
        WarehouseValuation savedVal = new WarehouseValuation();
        savedVal.setId(UUID.randomUUID());
        savedVal.setCurrentValue(8000.0);
        savedVal.setTotalExpenses(0.0);
        savedVal.setTotalItems(80);
        when(warehouseValuationRepository.save(captor.capture())).thenReturn(savedVal);

        warehouseValuationService.calculateWarehouseValuation(warehouseId, "SYSTEM");

        assertEquals(0.0, captor.getValue().getTotalExpenses());
    }

    @Test
    public void calculateWarehouseValuation_auditFields_shouldBePersistedCorrectly() {
        UUID warehouseId = UUID.randomUUID();
        Warehouse warehouse = createWarehouse(warehouseId);
        String calculatedBy = "finance_manager";

        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.of(warehouse));
        when(warehouseValuationRepository.findByWarehouseId(warehouseId)).thenReturn(Optional.empty());
        when(itemRepository.calculateWarehouseBalance(warehouse)).thenReturn(1000.0);
        when(itemRepository.findByWarehouseAndItemStatus(warehouse, ItemStatus.CONSUMED))
                .thenReturn(Collections.emptyList());
        when(itemRepository.getTotalQuantityInWarehouse(warehouse)).thenReturn(10);

        ArgumentCaptor<WarehouseValuation> captor = ArgumentCaptor.forClass(WarehouseValuation.class);
        WarehouseValuation savedVal = new WarehouseValuation();
        savedVal.setId(UUID.randomUUID());
        savedVal.setLastCalculatedBy(calculatedBy);
        when(warehouseValuationRepository.save(captor.capture())).thenReturn(savedVal);

        warehouseValuationService.calculateWarehouseValuation(warehouseId, calculatedBy);

        WarehouseValuation captured = captor.getValue();
        assertEquals(calculatedBy, captured.getLastCalculatedBy());
        assertNotNull(captured.getLastCalculatedAt());
    }

    // ==================== getWarehouseValuation ====================

    @Test
    public void getWarehouseValuation_valuationExists_shouldReturnExistingWithoutRecalculating() {
        UUID warehouseId = UUID.randomUUID();
        Warehouse warehouse = createWarehouse(warehouseId);
        WarehouseValuation existing = createExistingValuation(UUID.randomUUID(), warehouse, 5000.0, 1000.0, 15);

        when(warehouseValuationRepository.findByWarehouseId(warehouseId)).thenReturn(Optional.of(existing));

        WarehouseValuation result = warehouseValuationService.getWarehouseValuation(warehouseId);

        assertNotNull(result);
        assertEquals(5000.0, result.getCurrentValue());
        assertEquals(1000.0, result.getTotalExpenses());
        assertEquals(15, result.getTotalItems());
        verify(warehouseRepository, never()).findById(any());
        verify(itemRepository, never()).calculateWarehouseBalance(any());
    }

    @Test
    public void getWarehouseValuation_valuationDoesNotExist_shouldTriggerCalculation() {
        UUID warehouseId = UUID.randomUUID();
        Warehouse warehouse = createWarehouse(warehouseId);

        when(warehouseValuationRepository.findByWarehouseId(warehouseId))
                .thenReturn(Optional.empty())   // call from getWarehouseValuation
                .thenReturn(Optional.empty());  // call inside calculateWarehouseValuation
        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.of(warehouse));
        when(itemRepository.calculateWarehouseBalance(warehouse)).thenReturn(3000.0);
        when(itemRepository.findByWarehouseAndItemStatus(warehouse, ItemStatus.CONSUMED))
                .thenReturn(Collections.emptyList());
        when(itemRepository.getTotalQuantityInWarehouse(warehouse)).thenReturn(30);

        WarehouseValuation savedVal = new WarehouseValuation();
        savedVal.setId(UUID.randomUUID());
        savedVal.setWarehouse(warehouse);
        savedVal.setCurrentValue(3000.0);
        savedVal.setTotalExpenses(0.0);
        savedVal.setTotalItems(30);
        when(warehouseValuationRepository.save(any())).thenReturn(savedVal);

        WarehouseValuation result = warehouseValuationService.getWarehouseValuation(warehouseId);

        assertNotNull(result);
        assertEquals(3000.0, result.getCurrentValue());
        verify(warehouseValuationRepository, atLeastOnce()).save(any());
    }

    // ==================== recalculateSiteWarehouses ====================

    @Test
    public void recalculateSiteWarehouses_multipleWarehouses_shouldRecalculateAll() {
        UUID siteId = UUID.randomUUID();
        UUID wh1Id = UUID.randomUUID();
        UUID wh2Id = UUID.randomUUID();
        Warehouse wh1 = createWarehouse(wh1Id);
        Warehouse wh2 = createWarehouse(wh2Id);

        when(warehouseRepository.findBySiteId(siteId)).thenReturn(List.of(wh1, wh2));

        when(warehouseRepository.findById(wh1Id)).thenReturn(Optional.of(wh1));
        when(warehouseValuationRepository.findByWarehouseId(wh1Id)).thenReturn(Optional.empty());
        when(itemRepository.calculateWarehouseBalance(wh1)).thenReturn(1000.0);
        when(itemRepository.findByWarehouseAndItemStatus(wh1, ItemStatus.CONSUMED)).thenReturn(Collections.emptyList());
        when(itemRepository.getTotalQuantityInWarehouse(wh1)).thenReturn(10);

        when(warehouseRepository.findById(wh2Id)).thenReturn(Optional.of(wh2));
        when(warehouseValuationRepository.findByWarehouseId(wh2Id)).thenReturn(Optional.empty());
        when(itemRepository.calculateWarehouseBalance(wh2)).thenReturn(2000.0);
        when(itemRepository.findByWarehouseAndItemStatus(wh2, ItemStatus.CONSUMED)).thenReturn(Collections.emptyList());
        when(itemRepository.getTotalQuantityInWarehouse(wh2)).thenReturn(20);

        WarehouseValuation val1 = new WarehouseValuation();
        val1.setId(UUID.randomUUID());
        val1.setWarehouse(wh1);
        val1.setCurrentValue(1000.0);
        val1.setTotalExpenses(0.0);
        val1.setTotalItems(10);

        WarehouseValuation val2 = new WarehouseValuation();
        val2.setId(UUID.randomUUID());
        val2.setWarehouse(wh2);
        val2.setCurrentValue(2000.0);
        val2.setTotalExpenses(0.0);
        val2.setTotalItems(20);

        when(warehouseValuationRepository.save(any()))
                .thenReturn(val1)
                .thenReturn(val2);

        List<WarehouseValuation> results = warehouseValuationService.recalculateSiteWarehouses(siteId, "admin");

        assertNotNull(results);
        assertEquals(2, results.size());
        verify(warehouseValuationRepository, times(2)).save(any());
    }

    @Test
    public void recalculateSiteWarehouses_noWarehousesInSite_shouldReturnEmptyList() {
        UUID siteId = UUID.randomUUID();
        when(warehouseRepository.findBySiteId(siteId)).thenReturn(Collections.emptyList());

        List<WarehouseValuation> results = warehouseValuationService.recalculateSiteWarehouses(siteId, "SYSTEM");

        assertNotNull(results);
        assertTrue(results.isEmpty());
        verify(warehouseValuationRepository, never()).save(any());
    }

    @Test
    public void recalculateSiteWarehouses_singleWarehouse_shouldReturnSingleResult() {
        UUID siteId = UUID.randomUUID();
        UUID whId = UUID.randomUUID();
        Warehouse wh = createWarehouse(whId);

        when(warehouseRepository.findBySiteId(siteId)).thenReturn(List.of(wh));
        when(warehouseRepository.findById(whId)).thenReturn(Optional.of(wh));
        when(warehouseValuationRepository.findByWarehouseId(whId)).thenReturn(Optional.empty());
        when(itemRepository.calculateWarehouseBalance(wh)).thenReturn(750.0);
        when(itemRepository.findByWarehouseAndItemStatus(wh, ItemStatus.CONSUMED)).thenReturn(Collections.emptyList());
        when(itemRepository.getTotalQuantityInWarehouse(wh)).thenReturn(5);

        WarehouseValuation saved = new WarehouseValuation();
        saved.setId(UUID.randomUUID());
        saved.setWarehouse(wh);
        saved.setCurrentValue(750.0);
        saved.setTotalExpenses(0.0);
        saved.setTotalItems(5);
        when(warehouseValuationRepository.save(any())).thenReturn(saved);

        List<WarehouseValuation> results = warehouseValuationService.recalculateSiteWarehouses(siteId, "SYSTEM");

        assertEquals(1, results.size());
        assertEquals(750.0, results.get(0).getCurrentValue());
    }

    // ==================== hasValuation ====================

    @Test
    public void hasValuation_valuationExists_shouldReturnTrue() {
        UUID warehouseId = UUID.randomUUID();
        when(warehouseValuationRepository.existsByWarehouseId(warehouseId)).thenReturn(true);

        boolean result = warehouseValuationService.hasValuation(warehouseId);

        assertTrue(result);
        verify(warehouseValuationRepository).existsByWarehouseId(warehouseId);
    }

    @Test
    public void hasValuation_valuationDoesNotExist_shouldReturnFalse() {
        UUID warehouseId = UUID.randomUUID();
        when(warehouseValuationRepository.existsByWarehouseId(warehouseId)).thenReturn(false);

        boolean result = warehouseValuationService.hasValuation(warehouseId);

        assertFalse(result);
        verify(warehouseValuationRepository).existsByWarehouseId(warehouseId);
    }
}