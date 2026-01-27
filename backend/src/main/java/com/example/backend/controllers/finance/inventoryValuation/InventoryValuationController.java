package com.example.backend.controllers.finance.inventoryValuation;

import com.example.backend.dto.finance.inventoryValuation.*;
import com.example.backend.dto.finance.valuation.ConsumableBreakdownDTO;
import com.example.backend.dto.finance.valuation.EquipmentFinancialBreakdownDTO;
import com.example.backend.dto.finance.valuation.SiteValuationDTO;
import com.example.backend.services.finance.inventoryValuation.InventoryValuationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/finance/inventory-valuation")
@CrossOrigin(origins = "http://localhost:3000")
public class InventoryValuationController {

    @Autowired
    private InventoryValuationService inventoryValuationService;

    // ========================================
    // WAREHOUSE BALANCE ENDPOINTS
    // ========================================

    /**
     * GET balance for a specific warehouse
     * Endpoint: GET /api/finance/inventory-valuation/warehouse/{warehouseId}/balance
     */
    @GetMapping("/warehouse/{warehouseId}/balance")
    public ResponseEntity<WarehouseBalanceDTO> getWarehouseBalance(@PathVariable UUID warehouseId) {
        try {
            System.out.println("📊 Fetching balance for warehouse: " + warehouseId);
            WarehouseBalanceDTO balance = inventoryValuationService.getWarehouseBalance(warehouseId);
            System.out.println("✅ Warehouse balance: " + balance.getTotalValue());
            return ResponseEntity.ok(balance);
        } catch (IllegalArgumentException e) {
            System.err.println("❌ Warehouse not found: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            System.err.println("❌ Error fetching warehouse balance: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ========================================
    // SITE BALANCE ENDPOINTS
    // ========================================

    /**
     * GET balance for a specific site (includes all warehouses)
     * Endpoint: GET /api/finance/inventory-valuation/site/{siteId}/balance
     */
    @GetMapping("/site/{siteId}/balance")
    public ResponseEntity<SiteBalanceDTO> getSiteBalance(@PathVariable UUID siteId) {
        try {
            System.out.println("📊 Fetching balance for site: " + siteId);
            SiteBalanceDTO balance = inventoryValuationService.getSiteBalance(siteId);
            System.out.println("✅ Site balance: " + balance.getTotalValue());
            return ResponseEntity.ok(balance);
        } catch (IllegalArgumentException e) {
            System.err.println("❌ Site not found: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            System.err.println("❌ Error fetching site balance: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * GET all site balances (EXISTING - backward compatible)
     * Endpoint: GET /api/finance/inventory-valuation/sites/balances
     */
    @GetMapping("/sites/balances")
    public ResponseEntity<List<SiteBalanceDTO>> getAllSiteBalances() {
        try {
            System.out.println("📊 Fetching balances for all sites");
            List<SiteBalanceDTO> balances = inventoryValuationService.getAllSiteBalances();
            System.out.println("✅ Found " + balances.size() + " sites");
            return ResponseEntity.ok(balances);
        } catch (Exception e) {
            System.err.println("❌ Error fetching site balances: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ========================================
    // NEW: SITE VALUATION ENDPOINTS (WITH EXPENSES)
    // ========================================

    /**
     * GET complete site valuation with expenses breakdown
     * Endpoint: GET /api/finance/inventory-valuation/site/{siteId}/valuation
     */
    @GetMapping("/site/{siteId}/valuation")
    public ResponseEntity<SiteValuationDTO> getSiteValuation(@PathVariable UUID siteId) {
        try {
            System.out.println("📊 Fetching complete valuation for site: " + siteId);
            SiteValuationDTO valuation = inventoryValuationService.getSiteValuationComplete(siteId);
            System.out.println("✅ Site valuation - Value: " + valuation.getTotalValue() +
                    ", Expenses: " + valuation.getTotalExpenses());
            return ResponseEntity.ok(valuation);
        } catch (IllegalArgumentException e) {
            System.err.println("❌ Site not found: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            System.err.println("❌ Error fetching site valuation: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * GET all sites with complete valuation data including expenses
     * Endpoint: GET /api/finance/inventory-valuation/sites/valuations
     */
    @GetMapping("/sites/valuations")
    public ResponseEntity<List<SiteValuationDTO>> getAllSiteValuations() {
        try {
            System.out.println("📊 Fetching complete valuations for all sites");
            List<SiteValuationDTO> valuations = inventoryValuationService.getAllSiteValuations();
            System.out.println("✅ Found " + valuations.size() + " site valuations");
            return ResponseEntity.ok(valuations);
        } catch (Exception e) {
            System.err.println("❌ Error fetching site valuations: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ========================================
    // NEW: EQUIPMENT FINANCIAL ENDPOINTS
    // ========================================

    /**
     * GET equipment financial breakdown (value composition)
     * Endpoint: GET /api/finance/inventory-valuation/equipment/{equipmentId}/financials
     */
    @GetMapping("/equipment/{equipmentId}/financials")
    public ResponseEntity<EquipmentFinancialBreakdownDTO> getEquipmentFinancials(@PathVariable UUID equipmentId) {
        try {
            System.out.println("📊 Fetching financials for equipment: " + equipmentId);
            EquipmentFinancialBreakdownDTO financials = inventoryValuationService.getEquipmentFinancials(equipmentId);
            System.out.println("✅ Equipment financials - Current Value: " + financials.getCurrentValue() +
                    ", Expenses: " + financials.getTotalExpenses());
            return ResponseEntity.ok(financials);
        } catch (IllegalArgumentException e) {
            System.err.println("❌ Equipment not found: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            System.err.println("❌ Error fetching equipment financials: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ========================================
    // WAREHOUSE DETAILS ENDPOINTS
    // ========================================

    /**
     * GET item breakdown (value composition) for a warehouse
     * Endpoint: GET /api/finance/inventory-valuation/warehouse/{warehouseId}/items-breakdown
     */
    @GetMapping("/warehouse/{warehouseId}/items-breakdown")
    public ResponseEntity<List<ItemBreakdownDTO>> getWarehouseItemBreakdown(@PathVariable UUID warehouseId) {
        try {
            System.out.println("📊 Fetching item breakdown for warehouse: " + warehouseId);
            List<ItemBreakdownDTO> breakdown = inventoryValuationService.getWarehouseItemBreakdown(warehouseId);
            System.out.println("✅ Found " + breakdown.size() + " items");
            return ResponseEntity.ok(breakdown);
        } catch (IllegalArgumentException e) {
            System.err.println("❌ Warehouse not found: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            System.err.println("❌ Error fetching item breakdown: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * GET all item history for a warehouse (all sources: transactions, manual entries, etc.)
     * Endpoint: GET /api/finance/inventory-valuation/warehouse/{warehouseId}/item-history
     */
    @GetMapping("/warehouse/{warehouseId}/item-history")
    public ResponseEntity<List<WarehouseTransactionHistoryDTO>> getWarehouseAllItemHistory(
            @PathVariable UUID warehouseId) {
        try {
            System.out.println("📜 Fetching all item history for warehouse: " + warehouseId);
            List<WarehouseTransactionHistoryDTO> history = inventoryValuationService.getWarehouseAllItemHistory(warehouseId);
            System.out.println("✅ Found " + history.size() + " item history entries");
            return ResponseEntity.ok(history);
        } catch (IllegalArgumentException e) {
            System.err.println("❌ Warehouse not found: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            System.err.println("❌ Error fetching item history: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/equipment/{equipmentId}/consumables-breakdown")
    public ResponseEntity<?> getEquipmentConsumablesBreakdown(@PathVariable UUID equipmentId) {
        try {
            List<ConsumableBreakdownDTO> breakdown = inventoryValuationService.getEquipmentConsumablesBreakdown(equipmentId);
            return ResponseEntity.ok(breakdown);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to get consumables breakdown: " + e.getMessage());
        }
    }
}