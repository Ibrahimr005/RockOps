package com.example.backend.controllers.procurement;

import com.example.backend.dto.finance.inventoryValuation.*;
import com.example.backend.models.finance.inventoryValuation.ItemPriceApproval;
import com.example.backend.services.finance.inventoryValuation.InventoryValuationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(PriceApprovalsController.class);

    @Autowired
    private InventoryValuationService inventoryValuationService;

    @GetMapping("/pending")
    public ResponseEntity<List<PendingItemApprovalDTO>> getAllPendingApprovals() {
        try {
            List<PendingItemApprovalDTO> pendingApprovals = inventoryValuationService.getAllPendingApprovals();
            return ResponseEntity.ok(pendingApprovals);
        } catch (Exception e) {
            log.error("Error fetching pending approvals", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/pending/warehouse/{warehouseId}")
    public ResponseEntity<List<PendingItemApprovalDTO>> getPendingApprovalsByWarehouse(
            @PathVariable UUID warehouseId) {
        try {
            List<PendingItemApprovalDTO> pendingApprovals =
                    inventoryValuationService.getPendingApprovalsByWarehouse(warehouseId);
            return ResponseEntity.ok(pendingApprovals);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            log.error("Error fetching warehouse pending approvals for {}", warehouseId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/approve/{itemId}")
    public ResponseEntity<ItemPriceApproval> approveItemPrice(
            @PathVariable UUID itemId,
            @RequestBody ItemPriceApprovalRequestDTO request,
            Authentication authentication) {
        try {
            String username = authentication.getName();
            log.info("Approving price for item {} by user {}", itemId, username);

            ItemPriceApproval approval = inventoryValuationService.approveItemPrice(
                    itemId,
                    request.getUnitPrice(),
                    username
            );

            return ResponseEntity.ok(approval);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            log.error("Error approving item price for {}", itemId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/approve/bulk")
    public ResponseEntity<List<ItemPriceApproval>> bulkApproveItemPrices(
            @RequestBody BulkPriceApprovalRequestDTO request,
            Authentication authentication) {
        try {
            String username = authentication.getName();
            log.info("Bulk approving {} items by user {}", request.getItems().size(), username);

            List<ItemPriceApproval> approvals = inventoryValuationService.bulkApproveItemPrices(
                    request,
                    username
            );

            return ResponseEntity.ok(approvals);
        } catch (Exception e) {
            log.error("Error in bulk approval", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/history")
    public ResponseEntity<List<ApprovedItemHistoryDTO>> getApprovalHistory() {
        try {
            List<ApprovedItemHistoryDTO> history = inventoryValuationService.getApprovalHistory();
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            log.error("Error fetching approval history", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
