package com.example.backend.services.finance.valuation;

import com.example.backend.models.finance.Valuation.EquipmentValuation;
import com.example.backend.models.finance.Valuation.SiteValuation;
import com.example.backend.models.finance.Valuation.WarehouseValuation;
import com.example.backend.models.site.Site;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.repositories.finance.valuation.SiteValuationRepository;
import com.example.backend.repositories.site.SiteRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SiteValuationServiceTest {

    @Mock private SiteValuationRepository siteValuationRepository;
    @Mock private SiteRepository siteRepository;
    @Mock private WarehouseValuationService warehouseValuationService;
    @Mock private EquipmentValuationService equipmentValuationService;

    @InjectMocks
    private SiteValuationService siteValuationService;

    // ==================== FACTORY HELPERS ====================

    private Site createSite(UUID id) {
        Site site = new Site();
        site.setId(id);
        site.setName("Test Site");
        return site;
    }

    private Warehouse createWarehouse(UUID id, Site site) {
        Warehouse warehouse = new Warehouse();
        warehouse.setId(id);
        warehouse.setName("Test Warehouse");
        warehouse.setSite(site);
        return warehouse;
    }

    private WarehouseValuation createWarehouseValuation(Warehouse warehouse,
                                                         double currentValue,
                                                         double totalExpenses) {
        WarehouseValuation val = new WarehouseValuation();
        val.setId(UUID.randomUUID());
        val.setWarehouse(warehouse);
        val.setCurrentValue(currentValue);
        val.setTotalExpenses(totalExpenses);
        val.setTotalItems(10);
        val.setLastCalculatedAt(LocalDateTime.now());
        val.setLastCalculatedBy("SYSTEM");
        return val;
    }

    private EquipmentValuation createEquipmentValuation(double currentValue, double totalExpenses) {
        EquipmentValuation val = new EquipmentValuation();
        val.setId(UUID.randomUUID());
        val.setPurchasePrice(currentValue + 5000.0);
        val.setCurrentValue(currentValue);
        val.setCurrentInventoryValue(0.0);
        val.setTotalExpenses(totalExpenses);
        val.setAccumulatedDepreciation(5000.0);
        val.setLastCalculatedAt(LocalDateTime.now());
        val.setLastCalculatedBy("SYSTEM");
        return val;
    }

    private SiteValuation createExistingSiteValuation(UUID id, Site site,
                                                       double totalValue, double totalExpenses,
                                                       double warehouseValue, double warehouseExpenses,
                                                       double equipmentValue, double equipmentExpenses,
                                                       int warehouseCount, int equipmentCount) {
        SiteValuation val = new SiteValuation();
        val.setId(id);
        val.setSite(site);
        val.setTotalValue(totalValue);
        val.setTotalExpenses(totalExpenses);
        val.setWarehouseValue(warehouseValue);
        val.setWarehouseExpenses(warehouseExpenses);
        val.setEquipmentValue(equipmentValue);
        val.setEquipmentExpenses(equipmentExpenses);
        val.setFixedAssetsValue(0.0);
        val.setFixedAssetsExpenses(0.0);
        val.setWarehouseCount(warehouseCount);
        val.setEquipmentCount(equipmentCount);
        val.setFixedAssetsCount(0);
        val.setLastCalculatedAt(LocalDateTime.now().minusHours(1));
        val.setLastCalculatedBy("SYSTEM");
        return val;
    }

    // ==================== calculateSiteValuation ====================

    @Test
    public void calculateSiteValuation_siteNotFound_shouldThrowIllegalArgumentException() {
        UUID siteId = UUID.randomUUID();
        when(siteRepository.findById(siteId)).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> siteValuationService.calculateSiteValuation(siteId, "user1"));

        assertTrue(ex.getMessage().contains(siteId.toString()));
        verify(siteValuationRepository, never()).save(any());
        verify(warehouseValuationService, never()).recalculateSiteWarehouses(any(), any());
        verify(equipmentValuationService, never()).recalculateSiteEquipment(any(), any());
    }

    @Test
    public void calculateSiteValuation_newSite_shouldCreateAndSaveValuation() {
        UUID siteId = UUID.randomUUID();
        Site site = createSite(siteId);
        Warehouse warehouse = createWarehouse(UUID.randomUUID(), site);

        WarehouseValuation whVal = createWarehouseValuation(warehouse, 10000.0, 2000.0);
        EquipmentValuation eqVal = createEquipmentValuation(45000.0, 3000.0);

        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));
        when(siteValuationRepository.findBySiteId(siteId)).thenReturn(Optional.empty());
        when(warehouseValuationService.recalculateSiteWarehouses(siteId, "user1"))
                .thenReturn(List.of(whVal));
        when(equipmentValuationService.recalculateSiteEquipment(siteId, "user1"))
                .thenReturn(List.of(eqVal));

        ArgumentCaptor<SiteValuation> captor = ArgumentCaptor.forClass(SiteValuation.class);
        SiteValuation savedVal = new SiteValuation();
        savedVal.setId(UUID.randomUUID());
        savedVal.setSite(site);
        savedVal.setWarehouseValue(10000.0);
        savedVal.setWarehouseExpenses(2000.0);
        savedVal.setEquipmentValue(45000.0);
        savedVal.setEquipmentExpenses(3000.0);
        savedVal.setTotalValue(55000.0);
        savedVal.setTotalExpenses(5000.0);
        savedVal.setWarehouseCount(1);
        savedVal.setEquipmentCount(1);
        when(siteValuationRepository.save(captor.capture())).thenReturn(savedVal);

        SiteValuation result = siteValuationService.calculateSiteValuation(siteId, "user1");

        assertNotNull(result);
        verify(siteValuationRepository).save(any(SiteValuation.class));

        SiteValuation captured = captor.getValue();
        assertEquals(10000.0, captured.getWarehouseValue());
        assertEquals(2000.0, captured.getWarehouseExpenses());
        assertEquals(45000.0, captured.getEquipmentValue());
        assertEquals(3000.0, captured.getEquipmentExpenses());
        assertEquals(1, captured.getWarehouseCount());
        assertEquals(1, captured.getEquipmentCount());
        // Fixed assets always 0
        assertEquals(0.0, captured.getFixedAssetsValue());
        assertEquals(0.0, captured.getFixedAssetsExpenses());
        assertEquals(0, captured.getFixedAssetsCount());
        assertEquals("user1", captured.getLastCalculatedBy());
        assertNotNull(captured.getLastCalculatedAt());
    }

    @Test
    public void calculateSiteValuation_aggregatesTotalsCorrectly_withMultipleWarehousesAndEquipment() {
        UUID siteId = UUID.randomUUID();
        Site site = createSite(siteId);

        Warehouse wh1 = createWarehouse(UUID.randomUUID(), site);
        Warehouse wh2 = createWarehouse(UUID.randomUUID(), site);
        WarehouseValuation whVal1 = createWarehouseValuation(wh1, 5000.0, 1000.0);
        WarehouseValuation whVal2 = createWarehouseValuation(wh2, 7000.0, 1500.0);

        EquipmentValuation eqVal1 = createEquipmentValuation(20000.0, 800.0);
        EquipmentValuation eqVal2 = createEquipmentValuation(30000.0, 1200.0);

        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));
        when(siteValuationRepository.findBySiteId(siteId)).thenReturn(Optional.empty());
        when(warehouseValuationService.recalculateSiteWarehouses(siteId, "admin"))
                .thenReturn(List.of(whVal1, whVal2));
        when(equipmentValuationService.recalculateSiteEquipment(siteId, "admin"))
                .thenReturn(List.of(eqVal1, eqVal2));

        ArgumentCaptor<SiteValuation> captor = ArgumentCaptor.forClass(SiteValuation.class);
        SiteValuation savedVal = new SiteValuation();
        savedVal.setId(UUID.randomUUID());
        when(siteValuationRepository.save(captor.capture())).thenReturn(savedVal);

        siteValuationService.calculateSiteValuation(siteId, "admin");

        SiteValuation captured = captor.getValue();
        // warehouseValue = 5000 + 7000 = 12000
        assertEquals(12000.0, captured.getWarehouseValue(), 0.01);
        // warehouseExpenses = 1000 + 1500 = 2500
        assertEquals(2500.0, captured.getWarehouseExpenses(), 0.01);
        // equipmentValue = 20000 + 30000 = 50000
        assertEquals(50000.0, captured.getEquipmentValue(), 0.01);
        // equipmentExpenses = 800 + 1200 = 2000
        assertEquals(2000.0, captured.getEquipmentExpenses(), 0.01);
        assertEquals(2, captured.getWarehouseCount());
        assertEquals(2, captured.getEquipmentCount());
        // totalValue = 12000 + 50000 + 0 = 62000
        assertEquals(62000.0, captured.getTotalValue(), 0.01);
        // totalExpenses = 2500 + 2000 + 0 = 4500
        assertEquals(4500.0, captured.getTotalExpenses(), 0.01);
    }

    @Test
    public void calculateSiteValuation_existingValuationWithChangedData_shouldSaveUpdated() {
        UUID siteId = UUID.randomUUID();
        Site site = createSite(siteId);
        Warehouse warehouse = createWarehouse(UUID.randomUUID(), site);

        // Existing valuation: warehouseValue=5000, equipmentValue=20000
        SiteValuation existing = createExistingSiteValuation(
                UUID.randomUUID(), site, 25000.0, 3000.0,
                5000.0, 1000.0, 20000.0, 2000.0, 1, 1);

        // New calculation: warehouseValue=6000 (changed)
        WarehouseValuation whVal = createWarehouseValuation(warehouse, 6000.0, 1000.0);
        EquipmentValuation eqVal = createEquipmentValuation(20000.0, 2000.0);

        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));
        when(siteValuationRepository.findBySiteId(siteId)).thenReturn(Optional.of(existing));
        when(warehouseValuationService.recalculateSiteWarehouses(siteId, "admin"))
                .thenReturn(List.of(whVal));
        when(equipmentValuationService.recalculateSiteEquipment(siteId, "admin"))
                .thenReturn(List.of(eqVal));

        ArgumentCaptor<SiteValuation> captor = ArgumentCaptor.forClass(SiteValuation.class);
        when(siteValuationRepository.save(captor.capture())).thenReturn(existing);

        siteValuationService.calculateSiteValuation(siteId, "admin");

        verify(siteValuationRepository).save(any());
        assertEquals(6000.0, captor.getValue().getWarehouseValue());
        assertEquals("admin", captor.getValue().getLastCalculatedBy());
    }

    @Test
    public void calculateSiteValuation_existingValuationUnchanged_shouldSkipSave() {
        UUID siteId = UUID.randomUUID();
        Site site = createSite(siteId);
        Warehouse warehouse = createWarehouse(UUID.randomUUID(), site);

        // Existing valuation exactly matches what will be recalculated
        SiteValuation existing = createExistingSiteValuation(
                UUID.randomUUID(), site, 30000.0, 3000.0,
                10000.0, 1000.0, 20000.0, 2000.0, 1, 1);

        WarehouseValuation whVal = createWarehouseValuation(warehouse, 10000.0, 1000.0);
        EquipmentValuation eqVal = createEquipmentValuation(20000.0, 2000.0);

        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));
        when(siteValuationRepository.findBySiteId(siteId)).thenReturn(Optional.of(existing));
        when(warehouseValuationService.recalculateSiteWarehouses(siteId, "SYSTEM"))
                .thenReturn(List.of(whVal));
        when(equipmentValuationService.recalculateSiteEquipment(siteId, "SYSTEM"))
                .thenReturn(List.of(eqVal));

        SiteValuation result = siteValuationService.calculateSiteValuation(siteId, "SYSTEM");

        verify(siteValuationRepository, never()).save(any());
        assertNotNull(result);
    }

    @Test
    public void calculateSiteValuation_noWarehousesNoEquipment_shouldSetAllValuesToZero() {
        UUID siteId = UUID.randomUUID();
        Site site = createSite(siteId);

        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));
        when(siteValuationRepository.findBySiteId(siteId)).thenReturn(Optional.empty());
        when(warehouseValuationService.recalculateSiteWarehouses(siteId, "SYSTEM"))
                .thenReturn(Collections.emptyList());
        when(equipmentValuationService.recalculateSiteEquipment(siteId, "SYSTEM"))
                .thenReturn(Collections.emptyList());

        ArgumentCaptor<SiteValuation> captor = ArgumentCaptor.forClass(SiteValuation.class);
        SiteValuation savedVal = new SiteValuation();
        savedVal.setId(UUID.randomUUID());
        savedVal.setTotalValue(0.0);
        savedVal.setTotalExpenses(0.0);
        when(siteValuationRepository.save(captor.capture())).thenReturn(savedVal);

        siteValuationService.calculateSiteValuation(siteId, "SYSTEM");

        SiteValuation captured = captor.getValue();
        assertEquals(0.0, captured.getWarehouseValue());
        assertEquals(0.0, captured.getWarehouseExpenses());
        assertEquals(0.0, captured.getEquipmentValue());
        assertEquals(0.0, captured.getEquipmentExpenses());
        assertEquals(0.0, captured.getTotalValue());
        assertEquals(0.0, captured.getTotalExpenses());
        assertEquals(0, captured.getWarehouseCount());
        assertEquals(0, captured.getEquipmentCount());
    }

    @Test
    public void calculateSiteValuation_warehouseValuationWithNullCurrentValue_shouldTreatAsZero() {
        UUID siteId = UUID.randomUUID();
        Site site = createSite(siteId);

        WarehouseValuation whValWithNull = new WarehouseValuation();
        whValWithNull.setId(UUID.randomUUID());
        whValWithNull.setCurrentValue(null);    // null should be treated as 0
        whValWithNull.setTotalExpenses(null);   // null should be treated as 0

        EquipmentValuation eqVal = createEquipmentValuation(10000.0, 500.0);

        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));
        when(siteValuationRepository.findBySiteId(siteId)).thenReturn(Optional.empty());
        when(warehouseValuationService.recalculateSiteWarehouses(siteId, "SYSTEM"))
                .thenReturn(List.of(whValWithNull));
        when(equipmentValuationService.recalculateSiteEquipment(siteId, "SYSTEM"))
                .thenReturn(List.of(eqVal));

        ArgumentCaptor<SiteValuation> captor = ArgumentCaptor.forClass(SiteValuation.class);
        SiteValuation savedVal = new SiteValuation();
        savedVal.setId(UUID.randomUUID());
        when(siteValuationRepository.save(captor.capture())).thenReturn(savedVal);

        siteValuationService.calculateSiteValuation(siteId, "SYSTEM");

        SiteValuation captured = captor.getValue();
        // Null currentValue on warehouse treated as 0 by the stream aggregation
        assertEquals(0.0, captured.getWarehouseValue(), 0.01);
        assertEquals(0.0, captured.getWarehouseExpenses(), 0.01);
        assertEquals(10000.0, captured.getEquipmentValue(), 0.01);
    }

    @Test
    public void calculateSiteValuation_fixedAssets_shouldAlwaysBeZero() {
        UUID siteId = UUID.randomUUID();
        Site site = createSite(siteId);

        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));
        when(siteValuationRepository.findBySiteId(siteId)).thenReturn(Optional.empty());
        when(warehouseValuationService.recalculateSiteWarehouses(siteId, "SYSTEM"))
                .thenReturn(Collections.emptyList());
        when(equipmentValuationService.recalculateSiteEquipment(siteId, "SYSTEM"))
                .thenReturn(Collections.emptyList());

        ArgumentCaptor<SiteValuation> captor = ArgumentCaptor.forClass(SiteValuation.class);
        SiteValuation savedVal = new SiteValuation();
        savedVal.setId(UUID.randomUUID());
        when(siteValuationRepository.save(captor.capture())).thenReturn(savedVal);

        siteValuationService.calculateSiteValuation(siteId, "SYSTEM");

        SiteValuation captured = captor.getValue();
        assertEquals(0.0, captured.getFixedAssetsValue());
        assertEquals(0.0, captured.getFixedAssetsExpenses());
        assertEquals(0, captured.getFixedAssetsCount());
    }

    @Test
    public void calculateSiteValuation_delegatesToDependentServices_withCorrectSiteIdAndUser() {
        UUID siteId = UUID.randomUUID();
        Site site = createSite(siteId);
        String calculatedBy = "finance_director";

        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));
        when(siteValuationRepository.findBySiteId(siteId)).thenReturn(Optional.empty());
        when(warehouseValuationService.recalculateSiteWarehouses(siteId, calculatedBy))
                .thenReturn(Collections.emptyList());
        when(equipmentValuationService.recalculateSiteEquipment(siteId, calculatedBy))
                .thenReturn(Collections.emptyList());

        SiteValuation savedVal = new SiteValuation();
        savedVal.setId(UUID.randomUUID());
        when(siteValuationRepository.save(any())).thenReturn(savedVal);

        siteValuationService.calculateSiteValuation(siteId, calculatedBy);

        verify(warehouseValuationService).recalculateSiteWarehouses(siteId, calculatedBy);
        verify(equipmentValuationService).recalculateSiteEquipment(siteId, calculatedBy);
    }

    // ==================== getSiteValuation ====================

    @Test
    public void getSiteValuation_valuationExists_shouldReturnExistingWithoutRecalculating() {
        UUID siteId = UUID.randomUUID();
        Site site = createSite(siteId);
        SiteValuation existing = createExistingSiteValuation(
                UUID.randomUUID(), site, 50000.0, 5000.0,
                20000.0, 2000.0, 30000.0, 3000.0, 2, 3);

        when(siteValuationRepository.findBySiteId(siteId)).thenReturn(Optional.of(existing));

        SiteValuation result = siteValuationService.getSiteValuation(siteId);

        assertNotNull(result);
        assertEquals(50000.0, result.getTotalValue());
        assertEquals(5000.0, result.getTotalExpenses());
        // No delegation to child services
        verify(warehouseValuationService, never()).recalculateSiteWarehouses(any(), any());
        verify(equipmentValuationService, never()).recalculateSiteEquipment(any(), any());
    }

    @Test
    public void getSiteValuation_valuationDoesNotExist_shouldTriggerCalculationWithSystemUser() {
        UUID siteId = UUID.randomUUID();
        Site site = createSite(siteId);

        when(siteValuationRepository.findBySiteId(siteId))
                .thenReturn(Optional.empty())   // call from getSiteValuation
                .thenReturn(Optional.empty());  // call inside calculateSiteValuation
        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));
        when(warehouseValuationService.recalculateSiteWarehouses(siteId, "SYSTEM"))
                .thenReturn(Collections.emptyList());
        when(equipmentValuationService.recalculateSiteEquipment(siteId, "SYSTEM"))
                .thenReturn(Collections.emptyList());

        SiteValuation savedVal = new SiteValuation();
        savedVal.setId(UUID.randomUUID());
        savedVal.setSite(site);
        savedVal.setTotalValue(0.0);
        savedVal.setTotalExpenses(0.0);
        when(siteValuationRepository.save(any())).thenReturn(savedVal);

        SiteValuation result = siteValuationService.getSiteValuation(siteId);

        assertNotNull(result);
        verify(siteValuationRepository, atLeastOnce()).save(any());
        // Must be called with "SYSTEM" as the calculatedBy user
        verify(warehouseValuationService).recalculateSiteWarehouses(siteId, "SYSTEM");
    }

    // ==================== recalculateAllSites ====================

    @Test
    public void recalculateAllSites_multipleSites_shouldRecalculateAll() {
        UUID site1Id = UUID.randomUUID();
        UUID site2Id = UUID.randomUUID();
        Site site1 = createSite(site1Id);
        Site site2 = createSite(site2Id);

        when(siteRepository.findAll()).thenReturn(List.of(site1, site2));

        when(siteRepository.findById(site1Id)).thenReturn(Optional.of(site1));
        when(siteValuationRepository.findBySiteId(site1Id)).thenReturn(Optional.empty());
        when(warehouseValuationService.recalculateSiteWarehouses(site1Id, "admin"))
                .thenReturn(Collections.emptyList());
        when(equipmentValuationService.recalculateSiteEquipment(site1Id, "admin"))
                .thenReturn(Collections.emptyList());

        when(siteRepository.findById(site2Id)).thenReturn(Optional.of(site2));
        when(siteValuationRepository.findBySiteId(site2Id)).thenReturn(Optional.empty());
        when(warehouseValuationService.recalculateSiteWarehouses(site2Id, "admin"))
                .thenReturn(Collections.emptyList());
        when(equipmentValuationService.recalculateSiteEquipment(site2Id, "admin"))
                .thenReturn(Collections.emptyList());

        SiteValuation saved1 = new SiteValuation();
        saved1.setId(UUID.randomUUID());
        saved1.setSite(site1);
        SiteValuation saved2 = new SiteValuation();
        saved2.setId(UUID.randomUUID());
        saved2.setSite(site2);

        when(siteValuationRepository.save(any()))
                .thenReturn(saved1)
                .thenReturn(saved2);

        List<SiteValuation> results = siteValuationService.recalculateAllSites("admin");

        assertNotNull(results);
        assertEquals(2, results.size());
        verify(siteValuationRepository, times(2)).save(any());
    }

    @Test
    public void recalculateAllSites_noSites_shouldReturnEmptyList() {
        when(siteRepository.findAll()).thenReturn(Collections.emptyList());

        List<SiteValuation> results = siteValuationService.recalculateAllSites("SYSTEM");

        assertNotNull(results);
        assertTrue(results.isEmpty());
        verify(siteValuationRepository, never()).save(any());
    }

    // ==================== getAllSiteValuations ====================

    @Test
    public void getAllSiteValuations_allSitesHaveExistingValuations_shouldReturnAllWithoutRecalculating() {
        UUID site1Id = UUID.randomUUID();
        UUID site2Id = UUID.randomUUID();
        Site site1 = createSite(site1Id);
        Site site2 = createSite(site2Id);

        SiteValuation val1 = createExistingSiteValuation(
                UUID.randomUUID(), site1, 10000.0, 1000.0,
                5000.0, 500.0, 5000.0, 500.0, 1, 1);
        SiteValuation val2 = createExistingSiteValuation(
                UUID.randomUUID(), site2, 20000.0, 2000.0,
                10000.0, 1000.0, 10000.0, 1000.0, 2, 2);

        when(siteRepository.findAll()).thenReturn(List.of(site1, site2));
        when(siteValuationRepository.findBySiteId(site1Id)).thenReturn(Optional.of(val1));
        when(siteValuationRepository.findBySiteId(site2Id)).thenReturn(Optional.of(val2));

        List<SiteValuation> results = siteValuationService.getAllSiteValuations();

        assertNotNull(results);
        assertEquals(2, results.size());
        // Should not trigger any recalculation since valuations exist
        verify(warehouseValuationService, never()).recalculateSiteWarehouses(any(), any());
        verify(equipmentValuationService, never()).recalculateSiteEquipment(any(), any());
    }

    @Test
    public void getAllSiteValuations_noSites_shouldReturnEmptyList() {
        when(siteRepository.findAll()).thenReturn(Collections.emptyList());

        List<SiteValuation> results = siteValuationService.getAllSiteValuations();

        assertNotNull(results);
        assertTrue(results.isEmpty());
    }

    @Test
    public void getAllSiteValuations_oneSiteMissingValuation_shouldCalculateForThatSite() {
        UUID site1Id = UUID.randomUUID();
        UUID site2Id = UUID.randomUUID();
        Site site1 = createSite(site1Id);
        Site site2 = createSite(site2Id);

        SiteValuation val1 = createExistingSiteValuation(
                UUID.randomUUID(), site1, 10000.0, 1000.0,
                5000.0, 500.0, 5000.0, 500.0, 1, 1);

        when(siteRepository.findAll()).thenReturn(List.of(site1, site2));
        when(siteValuationRepository.findBySiteId(site1Id)).thenReturn(Optional.of(val1));
        // site2 has no valuation — triggers calculation
        when(siteValuationRepository.findBySiteId(site2Id))
                .thenReturn(Optional.empty())   // call from getSiteValuation
                .thenReturn(Optional.empty());  // call inside calculateSiteValuation
        when(siteRepository.findById(site2Id)).thenReturn(Optional.of(site2));
        when(warehouseValuationService.recalculateSiteWarehouses(site2Id, "SYSTEM"))
                .thenReturn(Collections.emptyList());
        when(equipmentValuationService.recalculateSiteEquipment(site2Id, "SYSTEM"))
                .thenReturn(Collections.emptyList());

        SiteValuation savedVal2 = new SiteValuation();
        savedVal2.setId(UUID.randomUUID());
        savedVal2.setSite(site2);
        when(siteValuationRepository.save(any())).thenReturn(savedVal2);

        List<SiteValuation> results = siteValuationService.getAllSiteValuations();

        assertNotNull(results);
        assertEquals(2, results.size());
        verify(siteValuationRepository, times(1)).save(any());
    }

    // ==================== hasValuation ====================

    @Test
    public void hasValuation_valuationExists_shouldReturnTrue() {
        UUID siteId = UUID.randomUUID();
        when(siteValuationRepository.existsBySiteId(siteId)).thenReturn(true);

        boolean result = siteValuationService.hasValuation(siteId);

        assertTrue(result);
        verify(siteValuationRepository).existsBySiteId(siteId);
    }

    @Test
    public void hasValuation_valuationDoesNotExist_shouldReturnFalse() {
        UUID siteId = UUID.randomUUID();
        when(siteValuationRepository.existsBySiteId(siteId)).thenReturn(false);

        boolean result = siteValuationService.hasValuation(siteId);

        assertFalse(result);
        verify(siteValuationRepository).existsBySiteId(siteId);
    }
}