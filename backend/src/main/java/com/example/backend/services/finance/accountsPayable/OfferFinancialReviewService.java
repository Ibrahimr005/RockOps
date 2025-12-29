package com.example.backend.services.finance.accountsPayable;

import com.example.backend.dto.finance.accountsPayable.OfferFinancialReviewRequestDTO;
import com.example.backend.dto.finance.accountsPayable.OfferFinancialReviewResponseDTO;
import com.example.backend.models.finance.accountsPayable.OfferFinancialReview;
import com.example.backend.models.finance.accountsPayable.enums.FinanceReviewStatus;
import com.example.backend.models.finance.accountsPayable.enums.OfferFinanceValidationStatus;
import com.example.backend.models.procurement.Offer;
import com.example.backend.repositories.finance.accountsPayable.OfferFinancialReviewRepository;
import com.example.backend.repositories.procurement.OfferRepository;
import com.example.backend.services.procurement.OfferService;
import com.example.backend.models.maintenance.MaintenanceRecord;
import com.example.backend.models.equipment.MaintenanceStatus;
import com.example.backend.repositories.MaintenanceRecordRepository;
import com.example.backend.services.MaintenanceService;
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
    private final OfferService offerService;
    private final MaintenanceRecordRepository maintenanceRecordRepository;
    private final MaintenanceService maintenanceService;

    @Autowired
    public OfferFinancialReviewService(
            OfferFinancialReviewRepository reviewRepository,
            OfferRepository offerRepository, 
            OfferService offerService,
            MaintenanceRecordRepository maintenanceRecordRepository,
            MaintenanceService maintenanceService) {
        this.reviewRepository = reviewRepository;
        this.offerRepository = offerRepository;
        this.offerService = offerService;
        this.maintenanceRecordRepository = maintenanceRecordRepository;
        this.maintenanceService = maintenanceService;
    }

    /**
     * Get all pending offers waiting for finance validation
     */
    /**
     * Get all pending offers waiting for finance validation
     */
    public List<OfferFinancialReviewResponseDTO> getPendingOffers() {
        // 1. Get offers with status PENDING_FINANCE_VALIDATION from procurement
        List<Offer> pendingOffers = offerRepository.findByFinanceValidationStatus(
                OfferFinanceValidationStatus.PENDING_FINANCE_VALIDATION
        );
        
        List<OfferFinancialReviewResponseDTO> results = pendingOffers.stream()
                .map(this::convertOfferToPendingReviewDTO)
                .collect(Collectors.toList());

        // 2. Get maintenance reviews with status PENDING from OfferFinancialReviewRepository
        List<OfferFinancialReview> pendingMaintenanceReviews = reviewRepository.findByStatusWithOffer(FinanceReviewStatus.PENDING)
                .stream()
                .filter(review -> review.getMaintenanceRecord() != null)
                .collect(Collectors.toList());
        
        // If the custom query doesn't fetch maintenance records eagerly, we might need a different query or let Hibernate handle lazy loading.
        // Or simpler: findByStatus(PENDING) and filter.
        
        List<OfferFinancialReview> allPending = reviewRepository.findByStatus(FinanceReviewStatus.PENDING);
        List<OfferFinancialReview> maintenanceReviews = allPending.stream()
                .filter(r -> r.getMaintenanceRecord() != null)
                .collect(Collectors.toList());

        List<OfferFinancialReviewResponseDTO> maintenanceResults = maintenanceReviews.stream()
                .map(this::convertPendingReviewToDTO)
                .collect(Collectors.toList());
        
        results.addAll(maintenanceResults);

        return results;
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

        boolean isMaintenance = false;
        Offer offer = null;
        MaintenanceRecord maintenanceRecord = null;
        OfferFinancialReview existingReview = null;
        
        // Try to find Offer
        if (offerRepository.existsById(request.getOfferId())) {
             offer = offerRepository.findById(request.getOfferId()).get();
             // Validate status
             if (offer.getFinanceValidationStatus() != OfferFinanceValidationStatus.PENDING_FINANCE_VALIDATION) {
                 throw new RuntimeException("Offer is not pending finance validation");
             }
        } else if (maintenanceRecordRepository.existsById(request.getOfferId())) {
             // Try to find Maintenance Record
             isMaintenance = true;
             maintenanceRecord = maintenanceRecordRepository.findById(request.getOfferId()).get();
             // Validate status
             if (maintenanceRecord.getStatus() != MaintenanceStatus.PENDING_FINANCE_APPROVAL) {
                 throw new RuntimeException("Maintenance Record is not pending finance approval");
             }
             
             // Find existing review
             existingReview = reviewRepository.findByMaintenanceRecordId(maintenanceRecord.getId())
                     .filter(r -> r.getStatus() == FinanceReviewStatus.PENDING)
                     .orElse(null);
             
             if (existingReview == null) {
                 // Fallback: This shouldn't happen with new logic, but handled just in case
                 // throw new RuntimeException("No pending review found for this maintenance record");
             }
        } else {
             throw new RuntimeException("Record not found with ID: " + request.getOfferId());
        }

        boolean isApproval = "APPROVE".equalsIgnoreCase(request.getAction());

        // Validate required fields
        if (isApproval && (request.getBudgetCategory() == null || request.getBudgetCategory().isBlank())) {
            throw new RuntimeException("Budget category is required for approval");
        }

        if (!isApproval && (request.getRejectionReason() == null || request.getRejectionReason().isBlank())) {
            throw new RuntimeException("Rejection reason is required for rejection");
        }

        BigDecimal totalAmount;
        String currency;

        if (isMaintenance) {
             totalAmount = maintenanceRecord.getTotalCost() != null ? maintenanceRecord.getTotalCost() : BigDecimal.ZERO;
             currency = "EGP"; // Default for maintenance
        } else {
             // Calculate total amount and currency from offer items
             totalAmount = offer.getOfferItems().stream()
                .map(item -> item.getTotalPrice() != null ? item.getTotalPrice() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
             currency = offer.getOfferItems().isEmpty() ? "USD" : offer.getOfferItems().get(0).getCurrency();
        }

        OfferFinancialReview reviewToSave;

        if (isMaintenance && existingReview != null) {
            // Update existing review
            reviewToSave = existingReview;
            reviewToSave.setBudgetCategory(isApproval ? request.getBudgetCategory() : null);
            reviewToSave.setReviewedByUserId(reviewerUserId);
            reviewToSave.setReviewedByUserName(reviewerUserName);
            reviewToSave.setReviewedAt(LocalDateTime.now());
            reviewToSave.setStatus(isApproval ? FinanceReviewStatus.APPROVED : FinanceReviewStatus.REJECTED);
            reviewToSave.setApprovalNotes(isApproval ? request.getApprovalNotes() : null);
            reviewToSave.setRejectionReason(!isApproval ? request.getRejectionReason() : null);
            reviewToSave.setExpectedPaymentDate(request.getExpectedPaymentDate());
        } else {
            // Create financial review record (Classic flow for offers)
            reviewToSave = OfferFinancialReview.builder()
                    .offer(isMaintenance ? null : offer)
                    .maintenanceRecord(isMaintenance ? maintenanceRecord : null)
                    .totalAmount(totalAmount)
                    .currency(currency)
                    .budgetCategory(isApproval ? request.getBudgetCategory() : null)
                    .department(isMaintenance ? "Maintenance" : null) 
                    .reviewedByUserId(reviewerUserId)
                    .reviewedByUserName(reviewerUserName)
                    .reviewedAt(LocalDateTime.now())
                    .status(isApproval ? FinanceReviewStatus.APPROVED : FinanceReviewStatus.REJECTED)
                    .approvalNotes(isApproval ? request.getApprovalNotes() : null)
                    .rejectionReason(!isApproval ? request.getRejectionReason() : null)
                    .expectedPaymentDate(request.getExpectedPaymentDate())
                    .build();
        }

        OfferFinancialReview savedReview = reviewRepository.save(reviewToSave);
        
        if (isMaintenance) {
            // CALL MAINTENANCE SERVICE
            if (isApproval) {
                maintenanceService.approveByFinance(maintenanceRecord.getId());
            } else {
                maintenanceService.rejectMaintenanceRecord(maintenanceRecord.getId(), request.getRejectionReason());
            }
        } else {
            // **CALL PROCUREMENT MODULE FIRST - BEFORE CHANGING STATUS**
            // The OfferService.handleFinanceValidationResponse will update the status
            try {
                offerService.handleFinanceValidationResponse(
                        offer.getId(),
                        isApproval ? "APPROVE" : "REJECT",
                        reviewerUserId
                );
                System.out.println("✓ Successfully notified Procurement Module of finance decision for offer: " + offer.getId());
            } catch (Exception e) {
                System.err.println("Error notifying Procurement Module: " + e.getMessage());
                e.printStackTrace();
                // If the Procurement update fails, still update our local copy
                // This ensures the Finance module has the correct record
                offer.setFinanceValidationStatus(
                        isApproval ? OfferFinanceValidationStatus.FINANCE_APPROVED : OfferFinanceValidationStatus.FINANCE_REJECTED
                );
                offer.setFinanceReviewedAt(LocalDateTime.now());
                offer.setFinanceReviewedByUserId(reviewerUserId);
                offerRepository.save(offer);
            }
        }
        
        // TODO: Send notification

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
        UUID linkedId = review.getOffer() != null ? review.getOffer().getId() : (review.getMaintenanceRecord() != null ? review.getMaintenanceRecord().getId() : null);
        String linkedIdStr = linkedId != null ? linkedId.toString() : "Unknown";

        return OfferFinancialReviewResponseDTO.builder()
                .id(review.getId())
                .offerId(linkedId)
                .offerNumber(linkedIdStr) // Use ID as offer number
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
    
    private OfferFinancialReviewResponseDTO convertPendingReviewToDTO(OfferFinancialReview review) {
        MaintenanceRecord record = review.getMaintenanceRecord();
        String offerNumber = "MR-" + (record != null ? record.getId().toString().substring(0, 8) : "UNK");
        
        return OfferFinancialReviewResponseDTO.builder()
                .id(review.getId())
                .offerId(record != null ? record.getId() : null)
                .offerNumber(offerNumber)
                .totalAmount(review.getTotalAmount())
                .currency(review.getCurrency())
                .department(review.getDepartment())
                .status(null) // Should show as Pending in list
                .createdAt(review.getCreatedAt())
                .build();
    }
}