package com.example.backend.controllers.procurement;

import com.example.backend.dto.procurement.*;
import com.example.backend.models.procurement.Offer.Offer;
import com.example.backend.models.procurement.PurchaseOrder;
import com.example.backend.services.finance.accountsPayable.PaymentRequestService;
import com.example.backend.services.procurement.PurchaseOrderService;
import com.example.backend.services.procurement.DeliveryProcessingService;
import com.example.backend.services.procurement.IssueResolutionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

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
    private final DeliveryProcessingService deliveryProcessingService;
    private final IssueResolutionService issueResolutionService;
    private PaymentRequestService paymentRequestService;

    @Autowired
    public PurchaseOrderController(
            PurchaseOrderService purchaseOrderService,
            DeliveryProcessingService deliveryProcessingService,
            IssueResolutionService issueResolutionService,
            PaymentRequestService paymentRequestService) {
        this.purchaseOrderService = purchaseOrderService;
        this.deliveryProcessingService = deliveryProcessingService;
        this.issueResolutionService = issueResolutionService;
        this.paymentRequestService = paymentRequestService;
    }

    @GetMapping("/pending-offers")
    public ResponseEntity<List<Offer>> getPendingOffers() {
        try {
            List<Offer> pendingOffers = purchaseOrderService.getOffersPendingFinanceReview();
            return ResponseEntity.ok(pendingOffers);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

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

    @GetMapping()
    public ResponseEntity<List<PurchaseOrderDTO>> getAllPurchaseOrders() {
        try {
            List<PurchaseOrderDTO> purchaseOrders = purchaseOrderService.getAllPurchaseOrderDTOs();
            return ResponseEntity.ok(purchaseOrders);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<PurchaseOrder> getPurchaseOrderById(@PathVariable UUID id) {
        try {
            PurchaseOrder purchaseOrder = purchaseOrderService.getPurchaseOrderById(id);
            return ResponseEntity.ok(purchaseOrder);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{id}/with-deliveries")
    public ResponseEntity<PurchaseOrderDTO> getPurchaseOrderWithDeliveries(@PathVariable UUID id) {
        try {
            PurchaseOrderDTO dto = purchaseOrderService.getPurchaseOrderWithDeliveries(id);
            return ResponseEntity.ok(dto);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/{id}/status")
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

//    @PostMapping("/offers/{offerId}/finalize")
//    public ResponseEntity<?> finalizeOffer(
//            @PathVariable UUID offerId,
//            @RequestBody Map<String, Object> requestBody,
//            @AuthenticationPrincipal UserDetails userDetails) {
//
//        try {
//            @SuppressWarnings("unchecked")
//            List<String> finalizedItemIdStrings = (List<String>) requestBody.get("finalizedItemIds");
//
//            if (finalizedItemIdStrings == null || finalizedItemIdStrings.isEmpty()) {
//                return ResponseEntity.badRequest().body(Map.of(
//                        "message", "No finalized items provided",
//                        "success", false
//                ));
//            }
//
//            List<UUID> finalizedItemIds = finalizedItemIdStrings.stream()
//                    .map(UUID::fromString)
//                    .collect(Collectors.toList());
//
//            String username = userDetails.getUsername();
//
//            PurchaseOrder purchaseOrder = purchaseOrderService.finalizeOfferAndCreatePurchaseOrder(
//                    offerId, finalizedItemIds, username);
//
//            Map<String, Object> response = new HashMap<>();
//            response.put("message", "Offer finalized successfully. Purchase order created.");
//            response.put("success", true);
//            response.put("purchaseOrder", purchaseOrder);
//
//            return ResponseEntity.ok(response);
//
//        } catch (ClassCastException e) {
//            return ResponseEntity.badRequest().body(Map.of(
//                    "message", "Invalid request format",
//                    "success", false
//            ));
//        } catch (IllegalArgumentException e) {
//            return ResponseEntity.badRequest().body(Map.of(
//                    "message", "Invalid UUID format: " + e.getMessage(),
//                    "success", false
//            ));
//        } catch (Exception e) {
//            return ResponseEntity.internalServerError().body(Map.of(
//                    "message", "Unexpected error: " + e.getMessage(),
//                    "success", false
//            ));
//        }
//    }

    @PostMapping("/offers/{offerId}/finalize")
    public ResponseEntity<?> finalizeOffer(
            @PathVariable UUID offerId,
            @RequestBody Map<String, Object> requestBody,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
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

            // Extract primitive values immediately
            UUID poId = purchaseOrder.getId();
            String poNumber = purchaseOrder.getPoNumber();
            Double totalAmount = purchaseOrder.getTotalAmount();
            String currency = purchaseOrder.getCurrency();

            // Build success response
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Offer finalized successfully. Purchase order created.");
            response.put("success", true);
            response.put("purchaseOrderId", poId);
            response.put("purchaseOrderNumber", poNumber);
            response.put("totalAmount", totalAmount);
            response.put("currency", currency);

            return ResponseEntity.ok(response);

        } catch (ClassCastException e) {
            System.err.println("Invalid request format: " + e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Invalid request format",
                    "success", false
            ));
        } catch (IllegalArgumentException e) {
            System.err.println("Invalid UUID format: " + e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Invalid UUID format: " + e.getMessage(),
                    "success", false
            ));
        } catch (Exception e) {
            System.err.println("Error finalizing offer " + offerId + ": " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of(
                    "message", "Unexpected error: " + e.getMessage(),
                    "success", false
            ));
        }
    }

//    // REPLACE THIS ENTIRE METHOD in PurchaseOrderController.java
//
//    @PostMapping("/offers/{offerId}/finalize")
//    public ResponseEntity<?> finalizeOffer(
//            @PathVariable UUID offerId,
//            @RequestBody Map<String, Object> requestBody,
//            @AuthenticationPrincipal UserDetails userDetails) {
//
//        try {
//            @SuppressWarnings("unchecked")
//            List<String> finalizedItemIdStrings = (List<String>) requestBody.get("finalizedItemIds");
//
//            if (finalizedItemIdStrings == null || finalizedItemIdStrings.isEmpty()) {
//                return ResponseEntity.badRequest().body(Map.of(
//                        "message", "No finalized items provided",
//                        "success", false
//                ));
//            }
//
//            List<UUID> finalizedItemIds = finalizedItemIdStrings.stream()
//                    .map(UUID::fromString)
//                    .collect(Collectors.toList());
//
//            String username = userDetails.getUsername();
//
//            // ✅ CHANGED: Call the NEW multi-merchant method instead of the old one
//            Map<String, Object> result = purchaseOrderService.createPurchaseOrdersFromAcceptedItems(
//                    offerId,
//                    finalizedItemIds,
//                    username
//            );
//
//            // ✅ CHANGED: Return the complete result from the service
//            // This includes: purchaseOrders (list), paymentRequests (list), and message
//            Map<String, Object> response = new HashMap<>();
//            response.put("success", true);
//            response.putAll(result); // Add all fields from service result
//
//            return ResponseEntity.ok(response);
//
//        } catch (IllegalStateException e) {
//            System.err.println("Business logic error: " + e.getMessage());
//            return ResponseEntity.badRequest().body(Map.of(
//                    "message", e.getMessage(),
//                    "success", false
//            ));
//        } catch (ClassCastException e) {
//            System.err.println("Invalid request format: " + e.getMessage());
//            return ResponseEntity.badRequest().body(Map.of(
//                    "message", "Invalid request format",
//                    "success", false
//            ));
//        } catch (IllegalArgumentException e) {
//            System.err.println("Invalid UUID format: " + e.getMessage());
//            return ResponseEntity.badRequest().body(Map.of(
//                    "message", "Invalid UUID format: " + e.getMessage(),
//                    "success", false
//            ));
//        } catch (Exception e) {
//            System.err.println("Error finalizing offer " + offerId + ": " + e.getMessage());
//            e.printStackTrace();
//            return ResponseEntity.internalServerError().body(Map.of(
//                    "message", "Unexpected error: " + e.getMessage(),
//                    "success", false
//            ));
//        }
//    }

    @PostMapping("/{id}/process-delivery")
    public ResponseEntity<?> processDelivery(
            @PathVariable UUID id,
            @RequestBody ProcessDeliveryRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            String username = userDetails.getUsername();
            DeliverySessionDTO response = deliveryProcessingService.processDelivery(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("Error processing delivery: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        }
    }

    @PostMapping("/{id}/resolve-issues")
    public ResponseEntity<?> resolveIssues(
            @PathVariable UUID id,
            @RequestBody List<ResolveIssueRequest> requests,
            @RequestParam String resolvedBy) {

        try {
            issueResolutionService.resolveIssues(requests, resolvedBy);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Issues resolved successfully"
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
}