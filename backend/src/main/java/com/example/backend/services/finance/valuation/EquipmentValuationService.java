// EquipmentValuationService.java
package com.example.backend.services.finance.valuation;

import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.finance.Valuation.EquipmentValuation;
import com.example.backend.models.warehouse.ItemStatus;
import com.example.backend.repositories.equipment.ConsumableRepository;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.repositories.finance.valuation.EquipmentValuationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Service for calculating and managing equipment financial valuations
 * Handles purchase price, current value, inventory value, and expenses
 */
@Service
public class EquipmentValuationService {

    @Autowired
    private EquipmentValuationRepository equipmentValuationRepository;

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private ConsumableRepository consumableRepository;

    /**
     * Calculate or update equipment valuation
     * @param equipmentId - Equipment to calculate valuation for
     * @param calculatedBy - User performing the calculation
     * @return Updated EquipmentValuation
     */
    @Transactional
    public EquipmentValuation calculateEquipmentValuation(UUID equipmentId, String calculatedBy) {
        System.out.println("💰 Calculating valuation for equipment: " + equipmentId);

        Equipment equipment = equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> new IllegalArgumentException("Equipment not found: " + equipmentId));

        // Get existing valuation if it exists
        EquipmentValuation valuation = equipmentValuationRepository
                .findByEquipmentId(equipmentId)
                .orElse(EquipmentValuation.builder()
                        .equipment(equipment)
                        .purchasePrice(equipment.getEgpPrice())
                        .currentValue(equipment.getEgpPrice())
                        .accumulatedDepreciation(0.0)
                        .build());

        // Store old values to compare
        Double oldPurchasePrice = valuation.getPurchasePrice();
        Double oldDepreciation = valuation.getAccumulatedDepreciation();
        Double oldCurrentValue = valuation.getCurrentValue();
        Double oldInventoryValue = valuation.getCurrentInventoryValue();
        Double oldExpenses = valuation.getTotalExpenses();

        // Calculate new values
        valuation.setPurchasePrice(equipment.getEgpPrice());
        Double depreciation = calculateDepreciation(equipment);
        valuation.setAccumulatedDepreciation(depreciation);
        valuation.calculateCurrentValue();
        Double inventoryValue = calculateEquipmentInventoryValue(equipmentId);
        valuation.setCurrentInventoryValue(inventoryValue);
        Double totalExpenses = calculateEquipmentExpenses(equipmentId);
        valuation.setTotalExpenses(totalExpenses);

        // Check if anything changed
        boolean hasChanged = !Objects.equals(oldPurchasePrice, valuation.getPurchasePrice()) ||
                !Objects.equals(oldDepreciation, valuation.getAccumulatedDepreciation()) ||
                !Objects.equals(oldCurrentValue, valuation.getCurrentValue()) ||
                !Objects.equals(oldInventoryValue, valuation.getCurrentInventoryValue()) ||
                !Objects.equals(oldExpenses, valuation.getTotalExpenses());

        // Only save if data changed or it's a new record
        if (hasChanged || valuation.getId() == null) {
            valuation.setLastCalculatedAt(LocalDateTime.now());
            valuation.setLastCalculatedBy(calculatedBy);
            valuation = equipmentValuationRepository.save(valuation);

            System.out.println("✅ Equipment valuation saved (data changed):");
            System.out.println("   - Purchase Price: " + valuation.getPurchasePrice());
            System.out.println("   - Accumulated Depreciation: " + valuation.getAccumulatedDepreciation());
            System.out.println("   - Current Value: " + valuation.getCurrentValue());
            System.out.println("   - Inventory Value: " + valuation.getCurrentInventoryValue());
            System.out.println("   - Total Expenses: " + valuation.getTotalExpenses());
        } else {
            System.out.println("⏭️ Equipment valuation unchanged, skipping save");
        }

        return valuation;
    }

    /**
     * Calculate equipment inventory value (consumables IN_WAREHOUSE)
     */
    private Double calculateEquipmentInventoryValue(UUID equipmentId) {
        // Equipment doesn't track inventory - consumables are expenses
        System.out.println("📦 Equipment inventory value: 0.0 (not tracked)");
        return 0.0;
    }

    /**
     * Calculate equipment expenses (consumables IN_WAREHOUSE)
     */
    private Double calculateEquipmentExpenses(UUID equipmentId) {
        Double expenses = consumableRepository.calculateTotalValueByEquipmentAndStatus(
                equipmentId, ItemStatus.IN_WAREHOUSE);

        System.out.println("📊 Equipment expenses (IN_WAREHOUSE consumables): " + (expenses != null ? expenses : 0.0));
        return expenses != null ? expenses : 0.0;
    }

    /**
     * Calculate depreciation based on straight-line method
     * Formula: (Purchase Price - Salvage Value) / Useful Life Years * Years Elapsed
     */
    private Double calculateDepreciation(Equipment equipment) {
        // If no depreciation data, return 0
        if (equipment.getUsefulLifeYears() == null || equipment.getUsefulLifeYears() <= 0) {
            System.out.println("📉 No depreciation: useful life not set");
            return 0.0;
        }

        if (equipment.getDepreciationStartDate() == null) {
            System.out.println("📉 No depreciation: start date not set");
            return 0.0;
        }

        LocalDate startDate = equipment.getDepreciationStartDate();
        LocalDate currentDate = LocalDate.now();

        // Calculate years elapsed (with fractional years)
        long daysElapsed = java.time.temporal.ChronoUnit.DAYS.between(startDate, currentDate);
        double yearsElapsed = daysElapsed / 365.25; // Account for leap years

        // Don't depreciate if no time has passed
        if (yearsElapsed <= 0) {
            System.out.println("📉 No depreciation: no time elapsed yet");
            return 0.0;
        }

        // Calculate depreciable amount
        Double purchasePrice = equipment.getEgpPrice();
        Double salvageValue = equipment.getSalvageValue() != null ? equipment.getSalvageValue() : 0.0;
        Double depreciableAmount = purchasePrice - salvageValue;

        // Calculate annual depreciation
        Double annualDepreciation = depreciableAmount / equipment.getUsefulLifeYears();

        // Calculate accumulated depreciation
        Double accumulatedDepreciation = annualDepreciation * yearsElapsed;

        // Cap at depreciable amount (can't depreciate more than the equipment is worth)
        if (accumulatedDepreciation > depreciableAmount) {
            accumulatedDepreciation = depreciableAmount;
        }

        System.out.println("📉 Depreciation calculated:");
        System.out.println("   - Purchase Price: " + purchasePrice);
        System.out.println("   - Salvage Value: " + salvageValue);
        System.out.println("   - Depreciable Amount: " + depreciableAmount);
        System.out.println("   - Useful Life: " + equipment.getUsefulLifeYears() + " years");
        System.out.println("   - Years Elapsed: " + String.format("%.2f", yearsElapsed));
        System.out.println("   - Annual Depreciation: " + annualDepreciation);
        System.out.println("   - Accumulated Depreciation: " + accumulatedDepreciation);

        return accumulatedDepreciation;
    }

    /**
     * Get equipment valuation (calculate if doesn't exist)
     */
    public EquipmentValuation getEquipmentValuation(UUID equipmentId) {
        return equipmentValuationRepository.findByEquipmentId(equipmentId)
                .orElseGet(() -> calculateEquipmentValuation(equipmentId, "SYSTEM"));
    }

    /**
     * Recalculate all equipment valuations for a site
     */
    @Transactional
    public List<EquipmentValuation> recalculateSiteEquipment(UUID siteId, String calculatedBy) {
        List<Equipment> equipmentList = equipmentRepository.findBySiteId(siteId);

        return equipmentList.stream()
                .map(equipment -> calculateEquipmentValuation(equipment.getId(), calculatedBy))
                .toList();
    }

    /**
     * Check if equipment has valuation record
     */
    public boolean hasValuation(UUID equipmentId) {
        return equipmentValuationRepository.existsByEquipmentId(equipmentId);
    }

    /**
     * Get all equipment valuations for a site
     */
    public List<EquipmentValuation> getSiteEquipmentValuations(UUID siteId) {
        return equipmentValuationRepository.findByEquipmentSiteId(siteId);
    }
}