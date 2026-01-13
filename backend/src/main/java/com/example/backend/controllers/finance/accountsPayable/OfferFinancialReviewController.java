package com.example.backend.controllers.finance.accountsPayable;

import com.example.backend.dto.finance.accountsPayable.OfferFinancialReviewRequestDTO;
import com.example.backend.dto.finance.accountsPayable.OfferFinancialReviewResponseDTO;
import com.example.backend.dto.finance.accountsPayable.ReviewOfferItemsDTO;
import com.example.backend.models.finance.accountsPayable.OfferFinancialReview;
import com.example.backend.models.finance.accountsPayable.enums.FinanceReviewStatus;
import com.example.backend.models.user.User;
import com.example.backend.services.finance.accountsPayable.OfferFinancialReviewService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/finance/offer-reviews")
@CrossOrigin(origins = "http://localhost:3000")
public class OfferFinancialReviewController {

    private final OfferFinancialReviewService reviewService;

    @Autowired
    public OfferFinancialReviewController(OfferFinancialReviewService reviewService) {
        this.reviewService = reviewService;
    }

    /**
     * GET /api/v1/finance/offer-reviews/pending
     * Get all pending offers waiting for finance validation
     */
    @GetMapping("/pending")
    public ResponseEntity<List<OfferFinancialReviewResponseDTO>> getPendingOffers() {
        try {
            List<OfferFinancialReviewResponseDTO> pendingOffers = reviewService.getPendingOffers();
            return ResponseEntity.ok(pendingOffers);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * GET /api/v1/finance/offer-reviews
     * Get all review history
     */
    @GetMapping
    public ResponseEntity<List<OfferFinancialReviewResponseDTO>> getAllReviews() {
        try {
            List<OfferFinancialReviewResponseDTO> reviews = reviewService.getAllReviews();
            return ResponseEntity.ok(reviews);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * GET /api/v1/finance/offer-reviews/status/{status}
     * Get reviews by status (APPROVED or REJECTED)
     */
    @GetMapping("/status/{status}")
    public ResponseEntity<List<OfferFinancialReviewResponseDTO>> getReviewsByStatus(
            @PathVariable String status) {
        try {
            FinanceReviewStatus reviewStatus = FinanceReviewStatus.valueOf(status.toUpperCase());
            List<OfferFinancialReviewResponseDTO> reviews = reviewService.getReviewsByStatus(reviewStatus);
            return ResponseEntity.ok(reviews);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * GET /api/v1/finance/offer-reviews/{id}
     * Get review by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<OfferFinancialReviewResponseDTO> getReviewById(@PathVariable UUID id) {
        try {
            OfferFinancialReviewResponseDTO review = reviewService.getReviewById(id);
            return ResponseEntity.ok(review);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * GET /api/v1/finance/offer-reviews/offer/{offerId}
     * Get review by offer ID
     */
    @GetMapping("/offer/{offerId}")
    public ResponseEntity<OfferFinancialReviewResponseDTO> getReviewByOfferId(@PathVariable UUID offerId) {
        try {
            OfferFinancialReviewResponseDTO review = reviewService.getReviewByOfferId(offerId);
            if (review == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(review);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * POST /api/v1/finance/offer-reviews/review
     * Approve or Reject an offer
     */
    @PostMapping("/review")
    public ResponseEntity<?> reviewOffer(
            @Valid @RequestBody OfferFinancialReviewRequestDTO request,
            @AuthenticationPrincipal User user) {
        try {
            OfferFinancialReviewResponseDTO review = reviewService.reviewOffer(
                    request,
                    user.getId(),
                    user.getFirstName() + " " + user.getLastName()
            );
            return ResponseEntity.ok(review);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error processing review: " + e.getMessage());
        }
    }

    @PostMapping("/review-items")
    public ResponseEntity<OfferFinancialReview> reviewOfferItems(@RequestBody ReviewOfferItemsDTO request) {
        OfferFinancialReview review = reviewService.reviewOfferItems(request);
        return ResponseEntity.ok(review);
    }
}