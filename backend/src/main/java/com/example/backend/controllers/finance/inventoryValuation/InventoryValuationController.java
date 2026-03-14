package com.example.backend.controllers.finance.inventoryValuation;

import com.example.backend.dto.finance.inventoryValuation.*;
import com.example.backend.dto.finance.valuation.ConsumableBreakdownDTO;
import com.example.backend.dto.finance.valuation.EquipmentFinancialBreakdownDTO;
import com.example.backend.dto.finance.valuation.SiteValuationDTO;
import com.example.backend.services.finance.inventoryValuation.InventoryValuationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(InventoryValuationController.class);

    @Autowired
    private InventoryValuationService inventoryValuationService;

    @GetMapping("/warehouse/{warehouseId}/balance")
    public ResponseEntity<WarehouseBalanceDTO> getWarehouseBalance(@PathVariable UUID warehouseId) {
        try {
            WarehouseBalanceDTO balance = inventoryValuationService.getWarehouseBalance(warehouseId);
            return ResponseEntity.ok(balance);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            log.error("Error fetching warehouse balance for {}", warehouseId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/site/{siteId}/balance")
    public ResponseEntity<SiteBalanceDTO> getSiteBalance(@PathVariable UUID siteId) {
        try {
            SiteBalanceDTO balance = inventoryValuationService.getSiteBalance(siteId);
            return ResponseEntity.ok(balance);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            log.error("Error fetching site balance for {}", siteId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/sites/balances")
    public ResponseEntity<List<SiteBalanceDTO>> getAllSiteBalances() {
        try {
            List<SiteBalanceDTO> balances = inventoryValuationService.getAllSiteBalances();
            return ResponseEntity.ok(balances);
        } catch (Exception e) {
            log.error("Error fetching site balances", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/site/{siteId}/valuation")
    public ResponseEntity<SiteValuationDTO> getSiteValuation(@PathVariable UUID siteId) {
        try {
            SiteValuationDTO valuation = inventoryValuationService.getSiteValuationComplete(siteId);
            return ResponseEntity.ok(valuation);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            log.error("Error fetching site valuation for {}", siteId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/sites/valuations")
    public ResponseEntity<List<SiteValuationDTO>> getAllSiteValuations() {
        try {
            List<SiteValuationDTO> valuations = inventoryValuationService.getAllSiteValuations();
            return ResponseEntity.ok(valuations);
        } catch (Exception e) {
            log.error("Error fetching site valuations", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/equipment/{equipmentId}/financials")
    public ResponseEntity<EquipmentFinancialBreakdownDTO> getEquipmentFinancials(@PathVariable UUID equipmentId) {
        try {
            EquipmentFinancialBreakdownDTO financials = inventoryValuationService.getEquipmentFinancials(equipmentId);
            return ResponseEntity.ok(financials);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            log.error("Error fetching equipment financials for {}", equipmentId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/warehouse/{warehouseId}/items-breakdown")
    public ResponseEntity<List<ItemBreakdownDTO>> getWarehouseItemBreakdown(@PathVariable UUID warehouseId) {
        try {
            List<ItemBreakdownDTO> breakdown = inventoryValuationService.getWarehouseItemBreakdown(warehouseId);
            return ResponseEntity.ok(breakdown);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            log.error("Error fetching item breakdown for warehouse {}", warehouseId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/warehouse/{warehouseId}/item-history")
    public ResponseEntity<List<WarehouseTransactionHistoryDTO>> getWarehouseAllItemHistory(
            @PathVariable UUID warehouseId) {
        try {
            List<WarehouseTransactionHistoryDTO> history = inventoryValuationService.getWarehouseAllItemHistory(warehouseId);
            return ResponseEntity.ok(history);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            log.error("Error fetching item history for warehouse {}", warehouseId, e);
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
