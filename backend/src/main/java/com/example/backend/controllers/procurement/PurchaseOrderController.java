package com.example.backend.controllers.procurement;


import com.example.backend.dto.procurement.*;
import com.example.backend.models.procurement.Offer;
import com.example.backend.models.procurement.PurchaseOrder;
import com.example.backend.services.procurement.PurchaseOrderService;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;


import com.example.backend.models.procurement.PurchaseOrderIssue;

import java.time.LocalDateTime;
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



    // ============================================
// ADD TO YOUR PurchaseOrderController.java
// ============================================


    /**
     * Resolve issues for purchase order - NEW VERSION
     * Each issue can have its own resolution type and notes
     * POST /api/v1/purchaseOrders/{purchaseOrderId}/resolve-issues
     */
    @PostMapping("/{purchaseOrderId}/resolve-issues")
    public ResponseEntity<?> resolveIssues(
            @PathVariable UUID purchaseOrderId,
            @RequestBody ResolveIssuesRequestDTO request,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            System.out.println("=== Resolve Issues Endpoint Called ===");
            System.out.println("PO ID: " + purchaseOrderId);
            System.out.println("Number of resolutions: " + request.getResolutions().size());

            // Validate request
            if (request.getResolutions() == null || request.getResolutions().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "No resolutions provided"
                ));
            }

            // Validate each resolution
            for (ResolveIssuesRequestDTO.IssueResolution resolution : request.getResolutions()) {
                if (resolution.getIssueId() == null) {
                    return ResponseEntity.badRequest().body(Map.of(
                            "success", false,
                            "message", "Issue ID is required for all resolutions"
                    ));
                }
                if (resolution.getResolutionType() == null) {
                    return ResponseEntity.badRequest().body(Map.of(
                            "success", false,
                            "message", "Resolution type is required for all resolutions"
                    ));
                }
                if (resolution.getResolutionNotes() == null || resolution.getResolutionNotes().trim().isEmpty()) {
                    return ResponseEntity.badRequest().body(Map.of(
                            "success", false,
                            "message", "Resolution notes are required for all resolutions"
                    ));
                }
            }

            String username = userDetails.getUsername();

            PurchaseOrder updatedPO = purchaseOrderService.resolveIssues(
                    purchaseOrderId,
                    request.getResolutions(),
                    username
            );

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Successfully resolved " + request.getResolutions().size() + " issue(s)");
            response.put("purchaseOrder", updatedPO);
            response.put("resolvedCount", request.getResolutions().size());

            return ResponseEntity.ok(response);

        } catch (IllegalStateException e) {
            System.err.println("Validation error: " + e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        } catch (IllegalArgumentException e) {
            System.err.println("Validation error: " + e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        } catch (Exception e) {
            System.err.println("Error resolving issues: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "Error resolving issues: " + e.getMessage()
            ));
        }
    }

    /**
     * Get all issues for a purchase order
     */
    @GetMapping("/{purchaseOrderId}/issues")
    public ResponseEntity<Map<String, Object>> getIssuesForPurchaseOrder(
            @PathVariable UUID purchaseOrderId) {
        try {
            List<PurchaseOrderIssueDTO> issues = purchaseOrderService.getIssuesForPurchaseOrder(purchaseOrderId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("count", issues.size());
            response.put("issues", issues);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
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

    @PostMapping("/{id}/process-delivery")
    public ResponseEntity<?> processDelivery(
            @PathVariable UUID id,
            @RequestBody ProcessDeliveryRequestDTO request,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            String username = userDetails.getUsername();
            request.setPurchaseOrderId(id);

            // Get the DTO response
            ProcessDeliveryResponseDTO response = purchaseOrderService.processDelivery(request, username);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("Error processing delivery: " + e.getMessage());
            e.printStackTrace();

            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", e.getMessage());

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * Get delivery history for a purchase order item
     * GET /api/v1/purchaseOrders/items/{itemId}/deliveries
     */
    @GetMapping("/items/{itemId}/deliveries")
    public ResponseEntity<?> getDeliveryHistory(@PathVariable UUID itemId) {
        try {
            List<PurchaseOrderDeliveryDTO> deliveries = purchaseOrderService.getDeliveryHistory(itemId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("count", deliveries.size());
            response.put("deliveries", deliveries);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "Error fetching delivery history: " + e.getMessage()
            ));
        }
    }

    /**
     * Get items pending redelivery for a purchase order
     */
    @GetMapping("/{id}/pending-redelivery")
    public ResponseEntity<List<PurchaseOrderItemDTO>> getItemsPendingRedelivery(@PathVariable UUID id) {
        List<PurchaseOrderItemDTO> pendingItems = purchaseOrderService.getItemsPendingRedelivery(id);
        return ResponseEntity.ok(pendingItems);
    }

    /**
     * Process a redelivery for items that had issues
     */
    @PostMapping("/{id}/process-redelivery")
    public ResponseEntity<ProcessDeliveryResponseDTO> processRedelivery(
            @PathVariable UUID id,
            @RequestBody RedeliveryRequestDTO request,
            @AuthenticationPrincipal UserDetails userDetails) {

        String username = userDetails != null ? userDetails.getUsername() : "system";

        ProcessDeliveryRequestDTO deliveryData = ProcessDeliveryRequestDTO.builder()
                .purchaseOrderId(id)
                .items(request.getItems())
                .generalNotes(request.getGeneralNotes())
                .receivedAt(LocalDateTime.now())
                .build();

        ProcessDeliveryResponseDTO response = purchaseOrderService.processRedeliveryForIssues(
                id,
                request.getIssueIds(),
                deliveryData,
                username
        );

        return ResponseEntity.ok(response);
    }

    // Add this inner class for the request DTO
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RedeliveryRequestDTO {
        private List<UUID> issueIds;
        private List<ProcessDeliveryRequestDTO.DeliveryItemDTO> items;
        private String generalNotes;
    }
}