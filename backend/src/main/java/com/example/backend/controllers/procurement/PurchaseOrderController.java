package com.example.backend.controllers.procurement;


import com.example.backend.models.procurement.Offer;
import com.example.backend.models.procurement.PurchaseOrder;
import com.example.backend.services.procurement.PurchaseOrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import com.example.backend.dto.procurement.ReceivedItemDTO; // ADD
import com.example.backend.dto.procurement.ReceiveItemsRequestDTO; // ADD

import com.example.backend.dto.procurement.ReportIssueRequestDTO;
import com.example.backend.dto.procurement.ResolveIssueRequestDTO;
import com.example.backend.models.procurement.PurchaseOrderIssue;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/v1/purchaseOrders")
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;

    @Autowired
    public PurchaseOrderController(PurchaseOrderService purchaseOrderService) {
        this.purchaseOrderService = purchaseOrderService;
    }

    /**
     * Get all offers pending finance review
     */
    @GetMapping("/pending-offers")
    public ResponseEntity<List<Offer>> getPendingOffers() {
        try {
            List<Offer> pendingOffers = purchaseOrderService.getOffersPendingFinanceReview();
            return ResponseEntity.ok(pendingOffers);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Update an offer item's finance status (accept or reject)
     */


    /**
     * Complete finance review for an offer
     */


    /**
     * Get all finance-completed offers
     */


    /**
     * Get purchase order for an offer
     */
    @GetMapping("/offers/{offerId}/purchase-order")
    public ResponseEntity<?> getPurchaseOrderForOffer(@PathVariable UUID offerId) {
        try {
            PurchaseOrder purchaseOrder = purchaseOrderService.getPurchaseOrderByOffer(offerId);

            if (purchaseOrder != null) {
                return ResponseEntity.ok(purchaseOrder);
            } else {
                return ResponseEntity.noContent().build();
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error fetching purchase order: " + e.getMessage());
        }
    }

    /**
     * Get all purchase orders
     */
    @GetMapping()
    public ResponseEntity<List<PurchaseOrder>> getAllPurchaseOrders() {
        try {
            List<PurchaseOrder> purchaseOrders = purchaseOrderService.getAllPurchaseOrders();
            return ResponseEntity.ok(purchaseOrders);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get purchase order by ID
     */
    @GetMapping("/purchase-orders/{id}")
    public ResponseEntity<PurchaseOrder> getPurchaseOrderById(@PathVariable UUID id) {
        try {
            PurchaseOrder purchaseOrder = purchaseOrderService.getPurchaseOrderById(id);
            return ResponseEntity.ok(purchaseOrder);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Update purchase order status
     */
    @PutMapping("/purchase-orders/{id}/status")
    public ResponseEntity<?> updatePurchaseOrderStatus(
            @PathVariable UUID id,
            @RequestParam String status,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            PurchaseOrder updatedPO = purchaseOrderService.updatePurchaseOrderStatus(
                    id, status, userDetails.getUsername());
            return ResponseEntity.ok(updatedPO);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error updating purchase order status: " + e.getMessage());
        }
    }

    @PostMapping("/offers/{offerId}/finalize")
    public ResponseEntity<?> finalizeOffer(
            @PathVariable UUID offerId,
            @RequestBody Map<String, Object> requestBody,  // CHANGED: was Map<String, List<UUID>>
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            // Convert string UUIDs to UUID objects
            @SuppressWarnings("unchecked")
            List<String> finalizedItemIdStrings = (List<String>) requestBody.get("finalizedItemIds");

            if (finalizedItemIdStrings == null || finalizedItemIdStrings.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "No finalized items provided",
                        "success", false
                ));
            }

            List<UUID> finalizedItemIds = finalizedItemIdStrings.stream()
                    .map(UUID::fromString)
                    .collect(Collectors.toList());

            String username = userDetails.getUsername();

            PurchaseOrder purchaseOrder = purchaseOrderService.finalizeOfferAndCreatePurchaseOrder(
                    offerId, finalizedItemIds, username);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Offer finalized successfully. Purchase order created.");
            response.put("success", true);
            response.put("purchaseOrder", purchaseOrder);

            return ResponseEntity.ok(response);

        } catch (ClassCastException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Invalid request format",
                    "success", false
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Invalid UUID format: " + e.getMessage(),
                    "success", false
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "message", "Unexpected error: " + e.getMessage(),
                    "success", false
            ));
        }
    }

    @PostMapping("/{purchaseOrderId}/receive")
    public ResponseEntity<?> receiveItems(
            @PathVariable UUID purchaseOrderId,
            @RequestBody ReceiveItemsRequestDTO request,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            System.out.println("=== Receive Items Endpoint Called ===");
            System.out.println("PO ID: " + purchaseOrderId);
            System.out.println("Items to receive: " + request.getReceivedItems().size());

            String username = userDetails.getUsername();

            PurchaseOrder updatedPO = purchaseOrderService.receiveItems(
                    purchaseOrderId,
                    request.getReceivedItems(),
                    username
            );

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Items received successfully");
            response.put("purchaseOrder", updatedPO);

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            System.err.println("Validation error: " + e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        } catch (Exception e) {
            System.err.println("Error receiving items: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "Error receiving items: " + e.getMessage()
            ));
        }
    }

    // ============================================
// ADD TO YOUR PurchaseOrderController.java
// ============================================

    /**
     * Report issues with purchase order items
     * POST /api/v1/purchaseOrders/{purchaseOrderId}/report-issue
     */
    @PostMapping("/{purchaseOrderId}/report-issue")
    public ResponseEntity<?> reportIssue(
            @PathVariable UUID purchaseOrderId,
            @RequestBody ReportIssueRequestDTO request,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            System.out.println("=== Report Issue Endpoint Called ===");
            System.out.println("PO ID: " + purchaseOrderId);
            System.out.println("Issues to report: " + request.getItems().size());

            String username = userDetails.getUsername();

            PurchaseOrder updatedPO = purchaseOrderService.reportIssues(
                    purchaseOrderId,
                    request.getItems(),
                    request.getComments(),
                    username
            );

            // Get the created issues
            List<PurchaseOrderIssue> issues = purchaseOrderService.getActiveIssuesForPurchaseOrder(purchaseOrderId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Issues reported successfully. Purchase order status changed to DISPUTED.");
            response.put("purchaseOrder", updatedPO);
            response.put("issuesCount", issues.size());

            return ResponseEntity.ok(response);

        } catch (IllegalStateException e) {
            System.err.println("Validation error: " + e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        } catch (Exception e) {
            System.err.println("Error reporting issue: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "Error reporting issue: " + e.getMessage()
            ));
        }
    }

    /**
     * Resolve issues for purchase order items
     * POST /api/v1/purchaseOrders/{purchaseOrderId}/resolve-issue
     */
    @PostMapping("/{purchaseOrderId}/resolve-issue")
    public ResponseEntity<?> resolveIssue(
            @PathVariable UUID purchaseOrderId,
            @RequestBody ResolveIssueRequestDTO request,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            System.out.println("=== Resolve Issue Endpoint Called ===");
            System.out.println("PO ID: " + purchaseOrderId);
            System.out.println("Resolution Type: " + request.getResolutionType());
            System.out.println("Items to resolve: " + request.getItems().size());

            String username = userDetails.getUsername();

            PurchaseOrder updatedPO = purchaseOrderService.resolveIssues(
                    purchaseOrderId,
                    request.getResolutionType(),
                    request.getItems(),
                    request.getNotes(),
                    username
            );

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Issues resolved successfully.");
            response.put("purchaseOrder", updatedPO);
            response.put("resolutionType", request.getResolutionType());

            return ResponseEntity.ok(response);

        } catch (IllegalStateException e) {
            System.err.println("Validation error: " + e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        } catch (Exception e) {
            System.err.println("Error resolving issue: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "Error resolving issue: " + e.getMessage()
            ));
        }
    }

    /**
     * Get all issues for a purchase order
     * GET /api/v1/purchaseOrders/{purchaseOrderId}/issues
     */
    @GetMapping("/{purchaseOrderId}/issues")
    public ResponseEntity<?> getIssues(@PathVariable UUID purchaseOrderId) {
        try {
            List<PurchaseOrderIssue> issues = purchaseOrderService.getIssuesForPurchaseOrder(purchaseOrderId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("issues", issues);
            response.put("count", issues.size());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "Error fetching issues: " + e.getMessage()
            ));
        }
    }

    /**
     * Get active (unresolved) issues for a purchase order
     * GET /api/v1/purchaseOrders/{purchaseOrderId}/issues/active
     */
    @GetMapping("/{purchaseOrderId}/issues/active")
    public ResponseEntity<?> getActiveIssues(@PathVariable UUID purchaseOrderId) {
        try {
            List<PurchaseOrderIssue> activeIssues = purchaseOrderService.getActiveIssuesForPurchaseOrder(purchaseOrderId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("issues", activeIssues);
            response.put("count", activeIssues.size());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "Error fetching active issues: " + e.getMessage()
            ));
        }
    }
}