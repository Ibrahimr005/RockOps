package com.example.backend.controllers.procurement;

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
@RequestMapping("/api/procurement/price-approvals")
@CrossOrigin(origins = "http://localhost:3000")
public class PriceApprovalsController {

    @Autowired
    private InventoryValuationService inventoryValuationService;

    // ========================================
    // PENDING APPROVALS ENDPOINTS
    // ========================================

    /**
     * GET all pending item price approvals
     * Endpoint: GET /api/procurement/price-approvals/pending
     */
    @GetMapping("/pending")
    public ResponseEntity<List<PendingItemApprovalDTO>> getAllPendingApprovals() {
        try {
            System.out.println("📋 [Procurement] Fetching all pending price approvals");
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
     * Endpoint: GET /api/procurement/price-approvals/pending/warehouse/{warehouseId}
     */
    @GetMapping("/pending/warehouse/{warehouseId}")
    public ResponseEntity<List<PendingItemApprovalDTO>> getPendingApprovalsByWarehouse(
            @PathVariable UUID warehouseId) {
        try {
            System.out.println("📋 [Procurement] Fetching pending approvals for warehouse: " + warehouseId);
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
     * Endpoint: POST /api/procurement/price-approvals/approve/{itemId}
     * Body: { "unitPrice": 100.50 }
     */
    @PostMapping("/approve/{itemId}")
    public ResponseEntity<ItemPriceApproval> approveItemPrice(
            @PathVariable UUID itemId,
            @RequestBody ItemPriceApprovalRequestDTO request,
            Authentication authentication) {
        try {
            String username = authentication.getName();
            System.out.println("💰 [Procurement] Approving price for item: " + itemId + " by user: " + username);

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
     * Endpoint: POST /api/procurement/price-approvals/approve/bulk
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
            System.out.println("💰 [Procurement] Bulk approving " + request.getItems().size() + " items by user: " + username);

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
    // HISTORY ENDPOINT
    // ========================================

    /**
     * GET approval history (all approved items)
     * Endpoint: GET /api/procurement/price-approvals/history
     */
    @GetMapping("/history")
    public ResponseEntity<List<ApprovedItemHistoryDTO>> getApprovalHistory() {
        try {
            System.out.println("📜 [Procurement] Fetching approval history");
            List<ApprovedItemHistoryDTO> history = inventoryValuationService.getApprovalHistory();
            System.out.println("✅ Found " + history.size() + " approved items");
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            System.err.println("❌ Error fetching approval history: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}