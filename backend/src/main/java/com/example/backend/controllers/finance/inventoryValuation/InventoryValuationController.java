package com.example.backend.controllers.finance.inventoryValuation;

import com.example.backend.dto.finance.inventoryValuation.*;
import com.example.backend.models.finance.inventoryValuation.ItemPriceApproval;
import com.example.backend.services.finance.inventoryValuation.InventoryValuationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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
    // PENDING APPROVALS ENDPOINTS
    // ========================================

    /**
     * GET all pending item price approvals
     * Endpoint: GET /api/finance/inventory-valuation/pending-approvals
     */
    @GetMapping("/pending-approvals")
    public ResponseEntity<List<PendingItemApprovalDTO>> getAllPendingApprovals() {
        try {
            System.out.println("📋 Fetching all pending price approvals");
            List<PendingItemApprovalDTO> pendingApprovals = inventoryValuationService.getAllPendingApprovals();
            System.out.println("✅ Found " + pendingApprovals.size() + " pending approvals");
            return ResponseEntity.ok(pendingApprovals);
        } catch (Exception e) {
            System.err.println("❌ Error fetching pending approvals: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * GET pending approvals for a specific warehouse
     * Endpoint: GET /api/finance/inventory-valuation/pending-approvals/warehouse/{warehouseId}
     */
    @GetMapping("/pending-approvals/warehouse/{warehouseId}")
    public ResponseEntity<List<PendingItemApprovalDTO>> getPendingApprovalsByWarehouse(
            @PathVariable UUID warehouseId) {
        try {
            System.out.println("📋 Fetching pending approvals for warehouse: " + warehouseId);
            List<PendingItemApprovalDTO> pendingApprovals =
                    inventoryValuationService.getPendingApprovalsByWarehouse(warehouseId);
            System.out.println("✅ Found " + pendingApprovals.size() + " pending approvals for warehouse");
            return ResponseEntity.ok(pendingApprovals);
        } catch (IllegalArgumentException e) {
            System.err.println("❌ Warehouse not found: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            System.err.println("❌ Error fetching warehouse pending approvals: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ========================================
    // APPROVAL ACTIONS ENDPOINTS
    // ========================================

    /**
     * POST approve a single item price
     * Endpoint: POST /api/finance/inventory-valuation/approve/{itemId}
     * Body: { "unitPrice": 100.50 }
     */
    @PostMapping("/approve/{itemId}")
    public ResponseEntity<ItemPriceApproval> approveItemPrice(
            @PathVariable UUID itemId,
            @RequestBody ItemPriceApprovalRequestDTO request,
            Authentication authentication) {
        try {
            String username = authentication.getName();
            System.out.println("💰 Approving price for item: " + itemId + " by user: " + username);

            ItemPriceApproval approval = inventoryValuationService.approveItemPrice(
                    itemId,
                    request.getUnitPrice(),
                    username
            );

            System.out.println("✅ Item price approved successfully");
            return ResponseEntity.ok(approval);
        } catch (IllegalArgumentException e) {
            System.err.println("❌ Invalid request: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            System.err.println("❌ Error approving item price: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * POST bulk approve multiple item prices
     * Endpoint: POST /api/finance/inventory-valuation/approve/bulk
     * Body: {
     *   "items": [
     *     { "itemId": "uuid1", "unitPrice": 100.50 },
     *     { "itemId": "uuid2", "unitPrice": 200.75 }
     *   ]
     * }
     */
    @PostMapping("/approve/bulk")
    public ResponseEntity<List<ItemPriceApproval>> bulkApproveItemPrices(
            @RequestBody BulkPriceApprovalRequestDTO request,
            Authentication authentication) {
        try {
            String username = authentication.getName();
            System.out.println("💰 Bulk approving " + request.getItems().size() + " items by user: " + username);

            List<ItemPriceApproval> approvals = inventoryValuationService.bulkApproveItemPrices(
                    request,
                    username
            );

            System.out.println("✅ Bulk approval completed: " + approvals.size() + " items approved");
            return ResponseEntity.ok(approvals);
        } catch (Exception e) {
            System.err.println("❌ Error in bulk approval: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

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

    /**
     * POST manually trigger warehouse balance recalculation
     * Endpoint: POST /api/finance/inventory-valuation/warehouse/{warehouseId}/recalculate-balance
     */
    @PostMapping("/warehouse/{warehouseId}/recalculate-balance")
    public ResponseEntity<WarehouseBalanceDTO> recalculateWarehouseBalance(@PathVariable UUID warehouseId) {
        try {
            System.out.println("🔄 Manually recalculating balance for warehouse: " + warehouseId);
            inventoryValuationService.updateWarehouseBalance(warehouseId);
            WarehouseBalanceDTO balance = inventoryValuationService.getWarehouseBalance(warehouseId);
            System.out.println("✅ Balance recalculated: " + balance.getTotalValue());
            return ResponseEntity.ok(balance);
        } catch (IllegalArgumentException e) {
            System.err.println("❌ Warehouse not found: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            System.err.println("❌ Error recalculating warehouse balance: " + e.getMessage());
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
     * GET all site balances
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

    /**
     * POST manually trigger site balance recalculation
     * Endpoint: POST /api/finance/inventory-valuation/site/{siteId}/recalculate-balance
     */
    @PostMapping("/site/{siteId}/recalculate-balance")
    public ResponseEntity<SiteBalanceDTO> recalculateSiteBalance(@PathVariable UUID siteId) {
        try {
            System.out.println("🔄 Manually recalculating balance for site: " + siteId);
            inventoryValuationService.updateSiteBalance(siteId);
            SiteBalanceDTO balance = inventoryValuationService.getSiteBalance(siteId);
            System.out.println("✅ Balance recalculated: " + balance.getTotalValue());
            return ResponseEntity.ok(balance);
        } catch (IllegalArgumentException e) {
            System.err.println("❌ Site not found: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            System.err.println("❌ Error recalculating site balance: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * GET approval history (all approved items)
     * Endpoint: GET /api/finance/inventory-valuation/approval-history
     */
    @GetMapping("/approval-history")
    public ResponseEntity<List<ApprovedItemHistoryDTO>> getApprovalHistory() {
        try {
            System.out.println("📜 Fetching approval history");
            List<ApprovedItemHistoryDTO> history = inventoryValuationService.getApprovalHistory();
            System.out.println("✅ Found " + history.size() + " approved items");
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            System.err.println("❌ Error fetching approval history: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
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
     * GET transaction history for a warehouse (finance view)
     * Endpoint: GET /api/finance/inventory-valuation/warehouse/{warehouseId}/transactions
     */
    @GetMapping("/warehouse/{warehouseId}/transactions")
    public ResponseEntity<List<WarehouseTransactionHistoryDTO>> getWarehouseTransactionHistory(
            @PathVariable UUID warehouseId) {
        try {
            System.out.println("📜 Fetching transaction history for warehouse: " + warehouseId);
            List<WarehouseTransactionHistoryDTO> history =
                    inventoryValuationService.getWarehouseTransactionHistory(warehouseId);
            System.out.println("✅ Found " + history.size() + " transactions");
            return ResponseEntity.ok(history);
        } catch (IllegalArgumentException e) {
            System.err.println("❌ Warehouse not found: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            System.err.println("❌ Error fetching transaction history: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}