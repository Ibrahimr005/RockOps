package com.example.backend.controllers.procurement;

import com.example.backend.dto.OfferDTO;
import com.example.backend.dto.OfferItemDTO;
import com.example.backend.models.procurement.Offer;
import com.example.backend.models.procurement.OfferItem;
import com.example.backend.models.procurement.OfferTimelineEvent;
import com.example.backend.models.procurement.RequestOrder;
import com.example.backend.services.procurement.OfferService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.*;

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
    public ResponseEntity<Offer> createOffer(
            @RequestBody OfferDTO createOfferDTO,
            @AuthenticationPrincipal UserDetails userDetails) {
        Offer offer = offerService.createOffer(createOfferDTO, userDetails.getUsername());
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

            List<OfferItem> savedItems = offerService.addOfferItems(offerId, offerItemDTOs);

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
    public ResponseEntity<Offer> updateOfferStatus(
            @PathVariable UUID offerId,
            @RequestParam String status,
            @RequestParam(required = false) String rejectionReason,
            @AuthenticationPrincipal UserDetails userDetails) {

        Offer offer = offerService.updateOfferStatus(offerId, status, userDetails.getUsername(), rejectionReason);
        return ResponseEntity.ok(offer);
    }

    /**
     * Update an offer item
     */
    @PutMapping("/items/{offerItemId}")
    public ResponseEntity<OfferItem> updateOfferItem(
            @PathVariable UUID offerItemId,
            @RequestBody OfferItemDTO offerItemDTO) {
        OfferItem offerItem = offerService.updateOfferItem(offerItemId, offerItemDTO);
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
    public ResponseEntity<List<Offer>> getOffers(@RequestParam(required = false) String status) {
        List<Offer> offers;
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
    public ResponseEntity<List<Offer>> getOffersByRequestOrder(@PathVariable UUID requestOrderId) {
        List<Offer> offers = offerService.getOffersByRequestOrder(requestOrderId);
        return ResponseEntity.ok(offers);
    }

    /**
     * Get an offer by ID
     */
    @GetMapping("/{offerId}")
    public ResponseEntity<Offer> getOfferById(@PathVariable UUID offerId) {
        Offer offer = offerService.getOfferById(offerId);
        return ResponseEntity.ok(offer);
    }

    /**
     * Get offer items by offer
     */
    @GetMapping("/{offerId}/items")
    public ResponseEntity<List<OfferItem>> getOfferItemsByOffer(@PathVariable UUID offerId) {
        List<OfferItem> offerItems = offerService.getOfferItemsByOffer(offerId);
        return ResponseEntity.ok(offerItems);
    }

    /**
     * Get offer items by request order item
     */
    @GetMapping("/items/by-request-item/{requestOrderItemId}")
    public ResponseEntity<List<OfferItem>> getOfferItemsByRequestOrderItem(@PathVariable UUID requestOrderItemId) {
        List<OfferItem> offerItems = offerService.getOfferItemsByRequestOrderItem(requestOrderItemId);
        return ResponseEntity.ok(offerItems);
    }

    @GetMapping("/status")
    public List<Offer> getOffersByStatus(@RequestParam String status) {
        return offerService.getOffersByStatus(status.toUpperCase());
    }

    @GetMapping("/{offerId}/request-order")
    public ResponseEntity<RequestOrder> getRequestOrderByOfferId(@PathVariable UUID offerId) {
        RequestOrder requestOrder = offerService.getRequestOrderByOfferId(offerId);
        return ResponseEntity.ok(requestOrder);
    }

    @PostMapping("/{offerId}/retry")
    public ResponseEntity<?> retryOffer(
            @PathVariable UUID offerId,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            String username = userDetails.getUsername();
            Offer retriedOffer = offerService.retryOffer(offerId, username);
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
            Offer updatedOffer = offerService.updateFinanceStatus(offerId, financeStatus);
            return ResponseEntity.ok(updatedOffer);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error updating finance status: " + e.getMessage());
        }
    }

    @GetMapping("/finance-status/{status}")
    public ResponseEntity<List<Offer>> getOffersByFinanceStatus(@PathVariable String status) {
        try {
            List<Offer> offers = offerService.getOffersByFinanceStatus(status);
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
            OfferItem updatedItem = offerService.updateOfferItemFinanceStatus(
                    offerItemId, financeStatus, rejectionReason);
            return ResponseEntity.ok(updatedItem);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error updating offer item status: " + e.getMessage());
        }
    }

    @GetMapping("/completed-offers")
    public ResponseEntity<List<Offer>> getCompletedFinanceOffers() {
        try {
            List<Offer> completedOffers = offerService.getFinanceCompletedOffers();
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
            Offer updatedOffer = offerService.completeFinanceReview(
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
    public ResponseEntity<List<OfferTimelineEvent>> getOfferTimeline(@PathVariable UUID offerId) {
        try {
            List<OfferTimelineEvent> timeline = offerService.getOfferTimeline(offerId);
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
    public ResponseEntity<List<OfferTimelineEvent>> getRetryableEvents(@PathVariable UUID offerId) {
        try {
            List<OfferTimelineEvent> retryableEvents = offerService.getRetryableEvents(offerId);
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
    public ResponseEntity<List<OfferTimelineEvent>> getTimelineForAttempt(
            @PathVariable UUID offerId,
            @PathVariable int attemptNumber) {
        try {
            List<OfferTimelineEvent> timeline = offerService.getTimelineForAttempt(offerId, attemptNumber);
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
            Offer offer = offerService.getOfferById(offerId);
            List<OfferTimelineEvent> timeline = offerService.getOfferTimeline(offerId);

            long submissionCount = timeline.stream()
                    .filter(e -> e.getEventType().isSubmissionEvent())
                    .count();

            long rejectionCount = timeline.stream()
                    .filter(e -> e.getEventType().isRejectionEvent())
                    .count();

            long retryCount = timeline.stream()
                    .filter(e -> e.getEventType().isRetryEvent())
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
}