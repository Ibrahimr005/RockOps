package com.example.backend.services.finance.accountsPayable;

import com.example.backend.dto.finance.accountsPayable.OfferFinancialReviewRequestDTO;
import com.example.backend.dto.finance.accountsPayable.OfferFinancialReviewResponseDTO;
import com.example.backend.models.finance.accountsPayable.OfferFinancialReview;
import com.example.backend.models.finance.accountsPayable.enums.FinanceReviewStatus;
import com.example.backend.models.finance.accountsPayable.enums.OfferFinanceValidationStatus;
import com.example.backend.models.procurement.Offer;
import com.example.backend.repositories.finance.accountsPayable.OfferFinancialReviewRepository;
import com.example.backend.repositories.procurement.OfferRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class OfferFinancialReviewService {

    private final OfferFinancialReviewRepository reviewRepository;
    private final OfferRepository offerRepository;

    @Autowired
    public OfferFinancialReviewService(
            OfferFinancialReviewRepository reviewRepository,
            OfferRepository offerRepository) {
        this.reviewRepository = reviewRepository;
        this.offerRepository = offerRepository;
    }

    /**
     * Get all pending offers waiting for finance validation
     */
    public List<OfferFinancialReviewResponseDTO> getPendingOffers() {
        // Get offers with status PENDING_FINANCE_VALIDATION from procurement
        List<Offer> pendingOffers = offerRepository.findByFinanceValidationStatus(
                OfferFinanceValidationStatus.PENDING_FINANCE_VALIDATION
        );

        return pendingOffers.stream()
                .map(this::convertOfferToPendingReviewDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get all review history
     */
    public List<OfferFinancialReviewResponseDTO> getAllReviews() {
        List<OfferFinancialReview> reviews = reviewRepository.findAll();
        return reviews.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get reviews by status
     */
    public List<OfferFinancialReviewResponseDTO> getReviewsByStatus(FinanceReviewStatus status) {
        List<OfferFinancialReview> reviews = reviewRepository.findByStatus(status);
        return reviews.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get review by offer ID
     */
    public OfferFinancialReviewResponseDTO getReviewByOfferId(UUID offerId) {
        return reviewRepository.findByOfferId(offerId)
                .map(this::convertToDTO)
                .orElse(null);
    }

    /**
     * Approve or Reject an offer
     */
    @Transactional
    public OfferFinancialReviewResponseDTO reviewOffer(
            OfferFinancialReviewRequestDTO request,
            UUID reviewerUserId,
            String reviewerUserName) {

        // Validate offer exists
        Offer offer = offerRepository.findById(request.getOfferId())
                .orElseThrow(() -> new RuntimeException("Offer not found with ID: " + request.getOfferId()));

        // Validate offer is in correct status
        if (offer.getFinanceValidationStatus() != OfferFinanceValidationStatus.PENDING_FINANCE_VALIDATION) {
            throw new RuntimeException("Offer is not pending finance validation");
        }

        boolean isApproval = "APPROVE".equalsIgnoreCase(request.getAction());

        // Validate required fields
        if (isApproval && (request.getBudgetCategory() == null || request.getBudgetCategory().isBlank())) {
            throw new RuntimeException("Budget category is required for approval");
        }

        if (!isApproval && (request.getRejectionReason() == null || request.getRejectionReason().isBlank())) {
            throw new RuntimeException("Rejection reason is required for rejection");
        }

        // Calculate total amount and currency from offer items
        BigDecimal totalAmount = offer.getOfferItems().stream()
                .map(item -> item.getTotalPrice() != null ? item.getTotalPrice() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        String currency = offer.getOfferItems().isEmpty() ? "USD" : offer.getOfferItems().get(0).getCurrency();

        // Create financial review record
        OfferFinancialReview review = OfferFinancialReview.builder()
                .offer(offer)
                .totalAmount(totalAmount)
                .currency(currency)
                .budgetCategory(isApproval ? request.getBudgetCategory() : null)
                .department(null) // Offer doesn't have department, set from request if needed
                .reviewedByUserId(reviewerUserId)
                .reviewedByUserName(reviewerUserName)
                .reviewedAt(LocalDateTime.now())
                .status(isApproval ? FinanceReviewStatus.APPROVED : FinanceReviewStatus.REJECTED)
                .approvalNotes(isApproval ? request.getApprovalNotes() : null)
                .rejectionReason(!isApproval ? request.getRejectionReason() : null)
                .expectedPaymentDate(request.getExpectedPaymentDate())
                .build();

        OfferFinancialReview savedReview = reviewRepository.save(review);

        // Update offer status in procurement module
        offer.setFinanceValidationStatus(
                isApproval ? OfferFinanceValidationStatus.FINANCE_APPROVED : OfferFinanceValidationStatus.FINANCE_REJECTED
        );
        offer.setFinanceReviewedAt(LocalDateTime.now());
        offer.setFinanceReviewedByUserId(reviewerUserId);
        offerRepository.save(offer);

        // TODO: Send notification to procurement team

        return convertToDTO(savedReview);
    }

    /**
     * Get review by ID
     */
    public OfferFinancialReviewResponseDTO getReviewById(UUID reviewId) {
        return reviewRepository.findById(reviewId)
                .map(this::convertToDTO)
                .orElseThrow(() -> new RuntimeException("Review not found with ID: " + reviewId));
    }

    // ================== Helper Methods ==================

    private OfferFinancialReviewResponseDTO convertOfferToPendingReviewDTO(Offer offer) {
        // Calculate total amount from offer items
        BigDecimal totalAmount = BigDecimal.ZERO;
        String currency = "USD"; // Default

        if (offer.getOfferItems() != null && !offer.getOfferItems().isEmpty()) {
            totalAmount = offer.getOfferItems().stream()
                    .map(item -> item.getTotalPrice() != null ? item.getTotalPrice() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            // Get currency from first item
            currency = offer.getOfferItems().get(0).getCurrency();
        }

        return OfferFinancialReviewResponseDTO.builder()
                .offerId(offer.getId())
                .offerNumber(offer.getId().toString()) // Use ID as offer number
                .totalAmount(totalAmount)
                .currency(currency)
                .department(null) // Offer doesn't have department field
                .status(null) // Not reviewed yet
                .createdAt(offer.getCreatedAt())
                .build();
    }

    private OfferFinancialReviewResponseDTO convertToDTO(OfferFinancialReview review) {
        return OfferFinancialReviewResponseDTO.builder()
                .id(review.getId())
                .offerId(review.getOffer().getId())
                .offerNumber(review.getOffer().getId().toString()) // Use ID as offer number
                .totalAmount(review.getTotalAmount())
                .currency(review.getCurrency())
                .budgetCategory(review.getBudgetCategory())
                .department(review.getDepartment())
                .reviewedByUserId(review.getReviewedByUserId())
                .reviewedByUserName(review.getReviewedByUserName())
                .reviewedAt(review.getReviewedAt())
                .status(review.getStatus())
                .approvalNotes(review.getApprovalNotes())
                .rejectionReason(review.getRejectionReason())
                .expectedPaymentDate(review.getExpectedPaymentDate())
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .build();
    }
}