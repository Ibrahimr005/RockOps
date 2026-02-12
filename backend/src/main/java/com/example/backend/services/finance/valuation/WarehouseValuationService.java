// WarehouseValuationService.java
package com.example.backend.services.finance.valuation;

import com.example.backend.models.finance.Valuation.WarehouseValuation;
import com.example.backend.models.warehouse.Item;
import com.example.backend.models.warehouse.ItemStatus;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.repositories.finance.valuation.WarehouseValuationRepository;
import com.example.backend.repositories.warehouse.ItemRepository;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Service for calculating and managing warehouse financial valuations
 * Handles current inventory value and expenses tracking
 */
@Service
public class WarehouseValuationService {

    @Autowired
    private WarehouseValuationRepository warehouseValuationRepository;

    @Autowired
    private WarehouseRepository warehouseRepository;

    @Autowired
    private ItemRepository itemRepository;

    /**
     * Calculate or update warehouse valuation
     * @param warehouseId - Warehouse to calculate valuation for
     * @param calculatedBy - User performing the calculation
     * @return Updated WarehouseValuation
     */
    @Transactional
    public WarehouseValuation calculateWarehouseValuation(UUID warehouseId, String calculatedBy) {
        System.out.println("💰 Calculating valuation for warehouse: " + warehouseId);

        Warehouse warehouse = warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new IllegalArgumentException("Warehouse not found: " + warehouseId));

        // Get existing valuation if it exists
        WarehouseValuation valuation = warehouseValuationRepository
                .findByWarehouseId(warehouseId)
                .orElse(WarehouseValuation.builder()
                        .warehouse(warehouse)
                        .build());

        // Store old values to compare
        Double oldCurrentValue = valuation.getCurrentValue();
        Double oldExpenses = valuation.getTotalExpenses();
        Integer oldTotalItems = valuation.getTotalItems();

        // Calculate new values
        Double currentValue = itemRepository.calculateWarehouseBalance(warehouse);
        valuation.setCurrentValue(currentValue != null ? currentValue : 0.0);

        Double totalExpenses = calculateWarehouseExpenses(warehouse);
        valuation.setTotalExpenses(totalExpenses);

        Integer totalItems = itemRepository.getTotalQuantityInWarehouse(warehouse);
        valuation.setTotalItems(totalItems != null ? totalItems : 0);

        // Check if anything changed
        boolean hasChanged = !Objects.equals(oldCurrentValue, valuation.getCurrentValue()) ||
                !Objects.equals(oldExpenses, valuation.getTotalExpenses()) ||
                !Objects.equals(oldTotalItems, valuation.getTotalItems());

        // Only save if data changed or it's a new record
        if (hasChanged || valuation.getId() == null) {
            valuation.setLastCalculatedAt(LocalDateTime.now());
            valuation.setLastCalculatedBy(calculatedBy);
            valuation = warehouseValuationRepository.save(valuation);

            System.out.println("✅ Warehouse valuation saved (data changed):");
            System.out.println("   - Current Value: " + valuation.getCurrentValue());
            System.out.println("   - Total Expenses: " + valuation.getTotalExpenses());
            System.out.println("   - Total Items: " + valuation.getTotalItems());
        } else {
            System.out.println("⏭️ Warehouse valuation unchanged, skipping save");
        }

        return valuation;
    }

    /**
     * Calculate warehouse expenses (CONSUMED items)
     */
    private Double calculateWarehouseExpenses(Warehouse warehouse) {
        List<Item> consumedItems = itemRepository.findByWarehouseAndItemStatus(warehouse, ItemStatus.CONSUMED);

        Double totalExpenses = consumedItems.stream()
                .filter(item -> item.getTotalValue() != null)
                .mapToDouble(Item::getTotalValue)
                .sum();

        System.out.println("📊 Warehouse expenses: " + totalExpenses + " (from " + consumedItems.size() + " consumed items)");
        return totalExpenses;
    }

    /**
     * Get warehouse valuation (calculate if doesn't exist)
     */
    public WarehouseValuation getWarehouseValuation(UUID warehouseId) {
        return warehouseValuationRepository.findByWarehouseId(warehouseId)
                .orElseGet(() -> calculateWarehouseValuation(warehouseId, "SYSTEM"));
    }

    /**
     * Recalculate all warehouse valuations for a site
     */
    @Transactional
    public List<WarehouseValuation> recalculateSiteWarehouses(UUID siteId, String calculatedBy) {
        List<Warehouse> warehouses = warehouseRepository.findBySiteId(siteId);

        return warehouses.stream()
                .map(warehouse -> calculateWarehouseValuation(warehouse.getId(), calculatedBy))
                .toList();
    }

    /**
     * Check if warehouse has valuation record
     */
    public boolean hasValuation(UUID warehouseId) {
        return warehouseValuationRepository.existsByWarehouseId(warehouseId);
    }
}