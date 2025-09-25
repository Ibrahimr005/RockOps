package com.example.backend.controllers.procurement;

import com.example.backend.dto.procurement.*;
import com.example.backend.services.procurement.OfferService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.*;
import java.util.stream.Collectors;

@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/v1/offers")
public class OfferController {

    private final OfferService offerService;

    @Autowired
    public OfferController(OfferService offerService) {
        this.offerService = offerService;
    }

    /**
     * Create a new offer
     */
    @PostMapping
    public ResponseEntity<OfferDTO> createOffer(
            @RequestBody OfferDTO createOfferDTO,
            @AuthenticationPrincipal UserDetails userDetails) {
        OfferDTO offer = offerService.createOffer(createOfferDTO, userDetails.getUsername());
        return new ResponseEntity<>(offer, HttpStatus.CREATED);
    }

    /**
     * Add offer items to an existing offer
     */
    @PostMapping("/{offerId}/items")
    public ResponseEntity<?> addOfferItems(@PathVariable UUID offerId, @RequestBody List<OfferItemDTO> offerItemDTOs, HttpServletRequest request) {
        try {
            System.out.println("=== CONTROLLER CALLED ===");
            System.out.println("Offer ID: " + offerId);
            System.out.println("Number of DTOs: " + offerItemDTOs.size());

            List<OfferItemDTO> savedItems = offerService.addOfferItems(offerId, offerItemDTOs);

            System.out.println("=== CONTROLLER SUCCESS ===");
            return ResponseEntity.ok(savedItems);
        } catch (Exception e) {
            System.err.println("=== CONTROLLER ERROR ===");
            System.err.println("Error message: " + e.getMessage());
            System.err.println("Error class: " + e.getClass().getSimpleName());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Server Error", "message", e.getMessage()));
        }
    }

    /**
     * Update an offer's status
     */
    @PutMapping("/{offerId}/status")
    public ResponseEntity<OfferDTO> updateOfferStatus(
            @PathVariable UUID offerId,
            @RequestParam String status,
            @RequestParam(required = false) String rejectionReason,
            @AuthenticationPrincipal UserDetails userDetails) {

        OfferDTO offer = offerService.updateOfferStatus(offerId, status, userDetails.getUsername(), rejectionReason);
        return ResponseEntity.ok(offer);
    }

    /**
     * Update an offer item
     */
    @PutMapping("/items/{offerItemId}")
    public ResponseEntity<OfferItemDTO> updateOfferItem(
            @PathVariable UUID offerItemId,
            @RequestBody OfferItemDTO offerItemDTO) {
        OfferItemDTO offerItem = offerService.updateOfferItem(offerItemId, offerItemDTO);
        return ResponseEntity.ok(offerItem);
    }

    /**
     * Delete an offer item
     */
    @DeleteMapping("/items/{offerItemId}")
    public ResponseEntity<Void> deleteOfferItem(@PathVariable UUID offerItemId) {
        offerService.deleteOfferItem(offerItemId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Delete an entire offer
     */
    @DeleteMapping("/{offerId}")
    public ResponseEntity<Void> deleteOffer(@PathVariable UUID offerId) {
        offerService.deleteOffer(offerId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Get all offers
     */
    @GetMapping
    public ResponseEntity<List<OfferDTO>> getOffers(@RequestParam(required = false) String status) {
        List<OfferDTO> offers;
        if (status != null && !status.isBlank()) {
            offers = offerService.getOffersByStatus(status.toUpperCase());
        } else {
            offers = offerService.getAllOffers();
        }
        return ResponseEntity.ok(offers);
    }

    /**
     * Get offers by request order
     */
    @GetMapping("/by-request/{requestOrderId}")
    public ResponseEntity<List<OfferDTO>> getOffersByRequestOrder(@PathVariable UUID requestOrderId) {
        List<OfferDTO> offers = offerService.getOffersByRequestOrder(requestOrderId);
        return ResponseEntity.ok(offers);
    }

    /**
     * Get an offer by ID
     */
    @GetMapping("/{offerId}")
    public ResponseEntity<OfferDTO> getOfferById(@PathVariable UUID offerId) {
        OfferDTO offer = offerService.getOfferById(offerId);
        return ResponseEntity.ok(offer);
    }

    /**
     * Get offer items by offer
     */
    @GetMapping("/{offerId}/items")
    public ResponseEntity<List<OfferItemDTO>> getOfferItemsByOffer(@PathVariable UUID offerId) {
        List<OfferItemDTO> offerItems = offerService.getOfferItemsByOffer(offerId);
        return ResponseEntity.ok(offerItems);
    }

    /**
     * Get offer items by request order item
     */
    @GetMapping("/items/by-request-item/{requestOrderItemId}")
    public ResponseEntity<List<OfferItemDTO>> getOfferItemsByRequestOrderItem(@PathVariable UUID requestOrderItemId) {
        List<OfferItemDTO> offerItems = offerService.getOfferItemsByRequestOrderItem(requestOrderItemId);
        return ResponseEntity.ok(offerItems);
    }

    @GetMapping("/status")
    public List<OfferDTO> getOffersByStatus(@RequestParam String status) {
        return offerService.getOffersByStatus(status.toUpperCase());
    }

    @GetMapping("/{offerId}/request-order")
    public ResponseEntity<RequestOrderDTO> getRequestOrderByOfferId(@PathVariable UUID offerId) {
        RequestOrderDTO requestOrder = offerService.getRequestOrderByOfferId(offerId);
        return ResponseEntity.ok(requestOrder);
    }

    @PostMapping("/{offerId}/retry")
    public ResponseEntity<?> retryOffer(
            @PathVariable UUID offerId,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            String username = userDetails.getUsername();
            OfferDTO retriedOffer = offerService.retryOffer(offerId, username);
            return ResponseEntity.ok(retriedOffer);
        } catch (IllegalStateException e) {
            // Return message as JSON
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{offerId}/finance-status")
    public ResponseEntity<?> updateFinanceStatus(
            @PathVariable UUID offerId,
            @RequestParam String financeStatus) {

        try {
            OfferDTO updatedOffer = offerService.updateFinanceStatus(offerId, financeStatus);
            return ResponseEntity.ok(updatedOffer);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error updating finance status: " + e.getMessage());
        }
    }

    @GetMapping("/finance-status/{status}")
    public ResponseEntity<List<OfferDTO>> getOffersByFinanceStatus(@PathVariable String status) {
        try {
            List<OfferDTO> offers = offerService.getOffersByFinanceStatus(status);
            return ResponseEntity.ok(offers);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.emptyList());
        }
    }

    @PutMapping("/offer-items/{offerItemId}/financeStatus")
    public ResponseEntity<?> updateOfferItemStatus(
            @PathVariable UUID offerItemId,
            @RequestParam String financeStatus,
            @RequestParam(required = false) String rejectionReason,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            OfferItemDTO updatedItem = offerService.updateOfferItemFinanceStatus(
                    offerItemId, financeStatus, rejectionReason);
            return ResponseEntity.ok(updatedItem);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error updating offer item status: " + e.getMessage());
        }
    }

    @GetMapping("/completed-offers")
    public ResponseEntity<List<OfferDTO>> getCompletedFinanceOffers() {
        try {
            List<OfferDTO> completedOffers = offerService.getFinanceCompletedOffers();
            return ResponseEntity.ok(completedOffers);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/{offerId}/complete-review")
    public ResponseEntity<?> completeFinanceReview(
            @PathVariable UUID offerId,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            OfferDTO updatedOffer = offerService.completeFinanceReview(
                    offerId, userDetails.getUsername());
            return ResponseEntity.ok(updatedOffer);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error completing finance review: " + e.getMessage());
        }
    }

    // ================================
    // NEW TIMELINE ENDPOINTS
    // ================================

    /**
     * Get complete timeline for an offer
     * GET /api/v1/offers/{offerId}/timeline
     */
    @GetMapping("/{offerId}/timeline")
    public ResponseEntity<List<OfferTimelineEventDTO>> getOfferTimeline(@PathVariable UUID offerId) {
        try {
            List<OfferTimelineEventDTO> timeline = offerService.getOfferTimeline(offerId);
            return ResponseEntity.ok(timeline);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Get retryable events (events that can be retried from)
     * GET /api/v1/offers/{offerId}/timeline/retryable
     */
    @GetMapping("/{offerId}/timeline/retryable")
    public ResponseEntity<List<OfferTimelineEventDTO>> getRetryableEvents(@PathVariable UUID offerId) {
        try {
            List<OfferTimelineEventDTO> retryableEvents = offerService.getRetryableEvents(offerId);
            return ResponseEntity.ok(retryableEvents);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Get timeline events for a specific attempt
     * GET /api/v1/offers/{offerId}/timeline/attempt/{attemptNumber}
     */
    @GetMapping("/{offerId}/timeline/attempt/{attemptNumber}")
    public ResponseEntity<List<OfferTimelineEventDTO>> getTimelineForAttempt(
            @PathVariable UUID offerId,
            @PathVariable int attemptNumber) {
        try {
            List<OfferTimelineEventDTO> timeline = offerService.getTimelineForAttempt(offerId, attemptNumber);
            return ResponseEntity.ok(timeline);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Get timeline statistics for an offer
     * GET /api/v1/offers/{offerId}/timeline/stats
     */
    @GetMapping("/{offerId}/timeline/stats")
    public ResponseEntity<Map<String, Object>> getTimelineStats(@PathVariable UUID offerId) {
        try {
            OfferDTO offer = offerService.getOfferById(offerId);
            List<OfferTimelineEventDTO> timeline = offerService.getOfferTimeline(offerId);

            long submissionCount = timeline.stream()
                    .filter(OfferTimelineEventDTO::isSubmissionEvent)
                    .count();

            long rejectionCount = timeline.stream()
                    .filter(OfferTimelineEventDTO::isRejectionEvent)
                    .count();

            long retryCount = timeline.stream()
                    .filter(OfferTimelineEventDTO::isRetryEvent)
                    .count();

            Map<String, Object> stats = new HashMap<>();
            stats.put("totalAttempts", offer.getCurrentAttemptNumber());
            stats.put("totalRetries", offer.getTotalRetries());
            stats.put("totalSubmissions", submissionCount);
            stats.put("totalRejections", rejectionCount);
            stats.put("currentAttempt", offer.getCurrentAttemptNumber());

            return ResponseEntity.ok(stats);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/{offerId}/continue-and-return")
    public ResponseEntity<Map<String, Object>> continueAndReturnOffer(
            @PathVariable UUID offerId,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            String username = userDetails.getUsername();
            Map<String, Object> result = offerService.continueAndReturnOffer(offerId, username);
            return ResponseEntity.ok(result);
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to process continue and return: " + e.getMessage()));
        }
    }

    @PostMapping("/{offerId}/finalize-with-remaining")
    public ResponseEntity<Map<String, Object>> finalizeWithRemaining(
            @PathVariable UUID offerId,
            @RequestBody Map<String, Object> request,
            Principal principal) {

        try {
            // Extract data
            @SuppressWarnings("unchecked")
            List<String> finalizedItemIdStrings = (List<String>) request.get("finalizedItemIds");

            if (finalizedItemIdStrings == null || finalizedItemIdStrings.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "finalizedItemIds is required"));
            }

            List<UUID> finalizedItemIds = finalizedItemIdStrings.stream()
                    .map(UUID::fromString)
                    .collect(Collectors.toList());

            String username = (String) request.get("username");
            if (username == null && principal != null) {
                username = principal.getName();
            }
            if (username == null) {
                username = "system";
            }

            // Call the service method - it now returns only primitive data
            Map<String, Object> result = offerService.finalizeWithRemaining(offerId, finalizedItemIds, username);

            // Add a proper message based on what was returned
            if (result.containsKey("newOfferId")) {
                result.put("message", "Offer finalized successfully. A new offer has been created for remaining items.");
            } else {
                result.put("message", "Offer finalized successfully");
            }

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Server error: " + e.getMessage()));
        }
    }

    /**
     * Create purchase order from specific offer items
     */
    @PostMapping("/{offerId}/create-purchase-order")
    public ResponseEntity<?> createPurchaseOrderFromItems(
            @PathVariable UUID offerId,
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            @SuppressWarnings("unchecked")
            List<String> offerItemIdStrings = (List<String>) request.get("offerItemIds");

            if (offerItemIdStrings == null || offerItemIdStrings.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "offerItemIds is required"));
            }

            List<UUID> offerItemIds = offerItemIdStrings.stream()
                    .map(UUID::fromString)
                    .collect(Collectors.toList());

            PurchaseOrderDTO purchaseOrder = offerService.createPurchaseOrderFromItems(
                    offerId, offerItemIds, userDetails.getUsername());

            return ResponseEntity.ok(purchaseOrder);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to create purchase order: " + e.getMessage()));
        }
    }

    /**
     * Finalize specific items
     */
    @PostMapping("/items/finalize")
    public ResponseEntity<?> finalizeSpecificItems(
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            @SuppressWarnings("unchecked")
            List<String> offerItemIdStrings = (List<String>) request.get("offerItemIds");

            if (offerItemIdStrings == null || offerItemIdStrings.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "offerItemIds is required"));
            }

            List<UUID> offerItemIds = offerItemIdStrings.stream()
                    .map(UUID::fromString)
                    .collect(Collectors.toList());

            offerService.finalizeSpecificItems(offerItemIds, userDetails.getUsername());

            return ResponseEntity.ok(Map.of("message", "Items finalized successfully"));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to finalize items: " + e.getMessage()));
        }
    }

    @PostMapping("/{originalOfferId}/copy-timeline-to/{newOfferId}")
    public ResponseEntity<?> copyTimeline(
            @PathVariable UUID originalOfferId,
            @PathVariable UUID newOfferId) {
        try {
            offerService.addTimelineHistoryToOffer(originalOfferId, newOfferId);
            return ResponseEntity.ok(Map.of("message", "Timeline copied successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to copy timeline: " + e.getMessage()));
        }
    }
}