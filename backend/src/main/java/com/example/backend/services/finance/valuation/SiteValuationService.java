// SiteValuationService.java
package com.example.backend.services.finance.valuation;

import com.example.backend.models.finance.Valuation.EquipmentValuation;
import com.example.backend.models.finance.Valuation.SiteValuation;
import com.example.backend.models.finance.Valuation.WarehouseValuation;
import com.example.backend.models.site.Site;
import com.example.backend.repositories.finance.valuation.SiteValuationRepository;
import com.example.backend.repositories.site.SiteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Service for calculating and managing site-level financial valuations
 * Aggregates warehouse, equipment, and fixed asset valuations
 */
@Service
public class SiteValuationService {

    @Autowired
    private SiteValuationRepository siteValuationRepository;

    @Autowired
    private SiteRepository siteRepository;

    @Autowired
    private WarehouseValuationService warehouseValuationService;

    @Autowired
    private EquipmentValuationService equipmentValuationService;

    /**
     * Calculate or update site valuation by aggregating all assets
     * @param siteId - Site to calculate valuation for
     * @param calculatedBy - User performing the calculation
     * @return Updated SiteValuation
     */
    @Transactional
    public SiteValuation calculateSiteValuation(UUID siteId, String calculatedBy) {
        System.out.println("🏗️ Calculating valuation for site: " + siteId);

        Site site = siteRepository.findById(siteId)
                .orElseThrow(() -> new IllegalArgumentException("Site not found: " + siteId));

        // Get existing valuation if it exists
        SiteValuation valuation = siteValuationRepository
                .findBySiteId(siteId)
                .orElse(SiteValuation.builder()
                        .site(site)
                        .build());

        // Store old values to compare
        Double oldTotalValue = valuation.getTotalValue();
        Double oldTotalExpenses = valuation.getTotalExpenses();
        Double oldWarehouseValue = valuation.getWarehouseValue();
        Double oldWarehouseExpenses = valuation.getWarehouseExpenses();
        Double oldEquipmentValue = valuation.getEquipmentValue();
        Double oldEquipmentExpenses = valuation.getEquipmentExpenses();
        Integer oldWarehouseCount = valuation.getWarehouseCount();
        Integer oldEquipmentCount = valuation.getEquipmentCount();

        // First, recalculate all warehouse valuations
        List<WarehouseValuation> warehouseValuations = warehouseValuationService.recalculateSiteWarehouses(siteId, calculatedBy);

        // Calculate warehouse totals
        Double warehouseValue = warehouseValuations.stream()
                .mapToDouble(wv -> wv.getCurrentValue() != null ? wv.getCurrentValue() : 0.0)
                .sum();

        Double warehouseExpenses = warehouseValuations.stream()
                .mapToDouble(wv -> wv.getTotalExpenses() != null ? wv.getTotalExpenses() : 0.0)
                .sum();

        valuation.setWarehouseValue(warehouseValue);
        valuation.setWarehouseExpenses(warehouseExpenses);
        valuation.setWarehouseCount(warehouseValuations.size());

        // Recalculate all equipment valuations
        List<EquipmentValuation> equipmentValuations = equipmentValuationService.recalculateSiteEquipment(siteId, calculatedBy);

        // Calculate equipment totals
        Double equipmentValue = equipmentValuations.stream()
                .mapToDouble(ev -> ev.getCurrentValue() != null ? ev.getCurrentValue() : 0.0)
                .sum();

        Double equipmentExpenses = equipmentValuations.stream()
                .mapToDouble(ev -> ev.getTotalExpenses() != null ? ev.getTotalExpenses() : 0.0)
                .sum();

        valuation.setEquipmentValue(equipmentValue);
        valuation.setEquipmentExpenses(equipmentExpenses);
        valuation.setEquipmentCount(equipmentValuations.size());

        // Fixed assets (placeholder for future implementation)
        valuation.setFixedAssetsValue(0.0);
        valuation.setFixedAssetsExpenses(0.0);
        valuation.setFixedAssetsCount(0);

        // Calculate totals
        valuation.calculateTotalValue();
        valuation.calculateTotalExpenses();

        // Check if anything changed
        boolean hasChanged = !Objects.equals(oldTotalValue, valuation.getTotalValue()) ||
                !Objects.equals(oldTotalExpenses, valuation.getTotalExpenses()) ||
                !Objects.equals(oldWarehouseValue, valuation.getWarehouseValue()) ||
                !Objects.equals(oldWarehouseExpenses, valuation.getWarehouseExpenses()) ||
                !Objects.equals(oldEquipmentValue, valuation.getEquipmentValue()) ||
                !Objects.equals(oldEquipmentExpenses, valuation.getEquipmentExpenses()) ||
                !Objects.equals(oldWarehouseCount, valuation.getWarehouseCount()) ||
                !Objects.equals(oldEquipmentCount, valuation.getEquipmentCount());

        // Only save if data changed or it's a new record
        if (hasChanged || valuation.getId() == null) {
            valuation.setLastCalculatedAt(LocalDateTime.now());
            valuation.setLastCalculatedBy(calculatedBy);
            valuation = siteValuationRepository.save(valuation);

            System.out.println("✅ Site valuation saved (data changed):");
            System.out.println("   - Total Value: " + valuation.getTotalValue());
            System.out.println("   - Warehouse Value: " + valuation.getWarehouseValue());
            System.out.println("   - Equipment Value: " + valuation.getEquipmentValue());
            System.out.println("   - Total Expenses: " + valuation.getTotalExpenses());
            System.out.println("   - Warehouse Expenses: " + valuation.getWarehouseExpenses());
            System.out.println("   - Equipment Expenses: " + valuation.getEquipmentExpenses());
        } else {
            System.out.println("⏭️ Site valuation unchanged, skipping save");
        }

        return valuation;
    }

    /**
     * Get site valuation (calculate if doesn't exist)
     */
    public SiteValuation getSiteValuation(UUID siteId) {
        return siteValuationRepository.findBySiteId(siteId)
                .orElseGet(() -> calculateSiteValuation(siteId, "SYSTEM"));
    }

    /**
     * Recalculate all site valuations
     */
    @Transactional
    public List<SiteValuation> recalculateAllSites(String calculatedBy) {
        List<Site> sites = siteRepository.findAll();

        return sites.stream()
                .map(site -> calculateSiteValuation(site.getId(), calculatedBy))
                .toList();
    }

    /**
     * Get all site valuations
     */
    public List<SiteValuation> getAllSiteValuations() {
        List<Site> sites = siteRepository.findAll();

        return sites.stream()
                .map(site -> getSiteValuation(site.getId()))
                .toList();
    }

    /**
     * Check if site has valuation record
     */
    public boolean hasValuation(UUID siteId) {
        return siteValuationRepository.existsBySiteId(siteId);
    }
}