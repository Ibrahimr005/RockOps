package com.example.backend.services.finance.accountsPayable;

import com.example.backend.dto.finance.accountsPayable.ItemReviewDecision;
import com.example.backend.dto.finance.accountsPayable.OfferFinancialReviewRequestDTO;
import com.example.backend.dto.finance.accountsPayable.OfferFinancialReviewResponseDTO;
import com.example.backend.dto.finance.accountsPayable.ReviewOfferItemsDTO;
import com.example.backend.dto.procurement.OfferDTO;
import com.example.backend.dtos.MaintenanceRecordDto;
import com.example.backend.models.equipment.MaintenanceStatus;
import com.example.backend.models.finance.accountsPayable.OfferFinancialReview;
import com.example.backend.models.finance.accountsPayable.enums.FinanceReviewStatus;
import com.example.backend.models.finance.accountsPayable.enums.OfferFinanceValidationStatus;
import com.example.backend.models.maintenance.MaintenanceRecord;
import com.example.backend.models.procurement.Offer.Offer;
import com.example.backend.models.procurement.Offer.OfferItem;
import com.example.backend.repositories.MaintenanceRecordRepository;
import com.example.backend.repositories.finance.accountsPayable.OfferFinancialReviewRepository;
import com.example.backend.repositories.procurement.OfferItemRepository;
import com.example.backend.repositories.procurement.OfferRepository;
import com.example.backend.services.MaintenanceService;
import com.example.backend.services.procurement.OfferService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class OfferFinancialReviewServiceTest {

    @Mock
    private OfferFinancialReviewRepository reviewRepository;

    @Mock
    private OfferRepository offerRepository;

    @Mock
    private OfferService offerService;

    @Mock
    private MaintenanceRecordRepository maintenanceRecordRepository;

    @Mock
    private MaintenanceService maintenanceService;

    @Mock
    private OfferItemRepository offerItemRepository;

    // The service declares two fields of this type; Mockito injects the same mock for both
    @Mock
    private OfferFinancialReviewRepository offerFinancialReviewRepository;

    @InjectMocks
    private OfferFinancialReviewService offerFinancialReviewService;

    // ==================== getPendingOffers ====================

    @Test
    public void getPendingOffers_withPendingProcurementOffers_shouldReturnOfferDTOs() {
        Offer offer = buildOffer(OfferFinanceValidationStatus.PENDING_FINANCE_VALIDATION);
        when(offerRepository.findByFinanceValidationStatus(OfferFinanceValidationStatus.PENDING_FINANCE_VALIDATION))
                .thenReturn(List.of(offer));
        when(reviewRepository.findByStatusWithOffer(FinanceReviewStatus.PENDING)).thenReturn(Collections.emptyList());
        when(reviewRepository.findByStatus(FinanceReviewStatus.PENDING)).thenReturn(Collections.emptyList());

        List<OfferFinancialReviewResponseDTO> result = offerFinancialReviewService.getPendingOffers();

        assertNotNull(result);
        assertFalse(result.isEmpty());
        // At least one entry from the procurement offer
        assertEquals(offer.getId(), result.get(0).getOfferId());
    }

    @Test
    public void getPendingOffers_withPendingMaintenanceReviews_shouldReturnMaintenanceDTOs() {
        MaintenanceRecord record = buildMaintenanceRecord(MaintenanceStatus.PENDING_FINANCE_APPROVAL);
        OfferFinancialReview review = buildReview(null, record, FinanceReviewStatus.PENDING);

        when(offerRepository.findByFinanceValidationStatus(OfferFinanceValidationStatus.PENDING_FINANCE_VALIDATION))
                .thenReturn(Collections.emptyList());
        when(reviewRepository.findByStatusWithOffer(FinanceReviewStatus.PENDING)).thenReturn(Collections.emptyList());
        when(offerFinancialReviewRepository.findByStatusWithOffer(FinanceReviewStatus.PENDING)).thenReturn(Collections.emptyList());
        when(reviewRepository.findByStatus(FinanceReviewStatus.PENDING)).thenReturn(List.of(review));
        when(offerFinancialReviewRepository.findByStatus(FinanceReviewStatus.PENDING)).thenReturn(List.of(review));

        List<OfferFinancialReviewResponseDTO> result = offerFinancialReviewService.getPendingOffers();

        assertNotNull(result);
        // The maintenance review should appear in the result
        assertFalse(result.isEmpty());
    }

    @Test
    public void getPendingOffers_withNoPendingItems_shouldReturnEmptyList() {
        when(offerRepository.findByFinanceValidationStatus(OfferFinanceValidationStatus.PENDING_FINANCE_VALIDATION))
                .thenReturn(Collections.emptyList());
        when(reviewRepository.findByStatusWithOffer(FinanceReviewStatus.PENDING)).thenReturn(Collections.emptyList());
        when(reviewRepository.findByStatus(FinanceReviewStatus.PENDING)).thenReturn(Collections.emptyList());

        List<OfferFinancialReviewResponseDTO> result = offerFinancialReviewService.getPendingOffers();

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    public void getPendingOffers_shouldCombineProcurementAndMaintenancePendingItems() {
        Offer offer = buildOffer(OfferFinanceValidationStatus.PENDING_FINANCE_VALIDATION);
        MaintenanceRecord record = buildMaintenanceRecord(MaintenanceStatus.PENDING_FINANCE_APPROVAL);
        OfferFinancialReview maintenanceReview = buildReview(null, record, FinanceReviewStatus.PENDING);

        when(offerRepository.findByFinanceValidationStatus(OfferFinanceValidationStatus.PENDING_FINANCE_VALIDATION))
                .thenReturn(List.of(offer));
        when(reviewRepository.findByStatusWithOffer(FinanceReviewStatus.PENDING)).thenReturn(Collections.emptyList());
        when(offerFinancialReviewRepository.findByStatusWithOffer(FinanceReviewStatus.PENDING)).thenReturn(Collections.emptyList());
        when(reviewRepository.findByStatus(FinanceReviewStatus.PENDING)).thenReturn(List.of(maintenanceReview));
        when(offerFinancialReviewRepository.findByStatus(FinanceReviewStatus.PENDING)).thenReturn(List.of(maintenanceReview));

        List<OfferFinancialReviewResponseDTO> result = offerFinancialReviewService.getPendingOffers();

        assertEquals(2, result.size());
    }

    @Test
    public void getPendingOffers_withReviewsWithNoMaintenanceRecord_shouldExcludeThemFromMaintenanceList() {
        // A review that has no maintenance record (offer-based) should NOT be added to maintenanceResults
        Offer offer = buildOffer(OfferFinanceValidationStatus.PENDING_FINANCE_VALIDATION);
        OfferFinancialReview reviewWithoutMaintenance = buildReview(offer, null, FinanceReviewStatus.PENDING);

        when(offerRepository.findByFinanceValidationStatus(OfferFinanceValidationStatus.PENDING_FINANCE_VALIDATION))
                .thenReturn(Collections.emptyList());
        when(reviewRepository.findByStatusWithOffer(FinanceReviewStatus.PENDING)).thenReturn(Collections.emptyList());
        // findByStatus returns a review that has NO maintenance record
        when(reviewRepository.findByStatus(FinanceReviewStatus.PENDING)).thenReturn(List.of(reviewWithoutMaintenance));

        List<OfferFinancialReviewResponseDTO> result = offerFinancialReviewService.getPendingOffers();

        // reviewWithoutMaintenance should be filtered out from the maintenance path
        assertTrue(result.isEmpty());
    }

    // ==================== getAllReviews ====================

    @Test
    public void getAllReviews_withExistingReviews_shouldReturnDTOList() {
        Offer offer = buildOffer(OfferFinanceValidationStatus.FINANCE_APPROVED);
        OfferFinancialReview r1 = buildReview(offer, null, FinanceReviewStatus.APPROVED);
        OfferFinancialReview r2 = buildReview(offer, null, FinanceReviewStatus.REJECTED);

        when(reviewRepository.findAll()).thenReturn(List.of(r1, r2));
        when(offerFinancialReviewRepository.findAll()).thenReturn(List.of(r1, r2));

        List<OfferFinancialReviewResponseDTO> result = offerFinancialReviewService.getAllReviews();

        assertNotNull(result);
        assertEquals(2, result.size());
    }

    @Test
    public void getAllReviews_withNoReviews_shouldReturnEmptyList() {
        when(reviewRepository.findAll()).thenReturn(Collections.emptyList());
        when(offerFinancialReviewRepository.findAll()).thenReturn(Collections.emptyList());

        List<OfferFinancialReviewResponseDTO> result = offerFinancialReviewService.getAllReviews();

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    public void getAllReviews_shouldMapReviewFieldsToDTOCorrectly() {
        Offer offer = buildOffer(OfferFinanceValidationStatus.FINANCE_APPROVED);
        UUID reviewId = UUID.randomUUID();
        UUID reviewerUserId = UUID.randomUUID();
        OfferFinancialReview review = buildReview(offer, null, FinanceReviewStatus.APPROVED);
        review.setId(reviewId);
        review.setReviewedByUserId(reviewerUserId);
        review.setReviewedByUserName("Finance Manager");
        review.setBudgetCategory("Operations");
        review.setTotalAmount(BigDecimal.valueOf(5000));
        review.setCurrency("USD");

        when(reviewRepository.findAll()).thenReturn(List.of(review));
        when(offerFinancialReviewRepository.findAll()).thenReturn(List.of(review));

        List<OfferFinancialReviewResponseDTO> result = offerFinancialReviewService.getAllReviews();

        OfferFinancialReviewResponseDTO dto = result.get(0);
        assertEquals(reviewId, dto.getId());
        assertEquals(reviewerUserId, dto.getReviewedByUserId());
        assertEquals("Finance Manager", dto.getReviewedByUserName());
        assertEquals("Operations", dto.getBudgetCategory());
        assertEquals(BigDecimal.valueOf(5000), dto.getTotalAmount());
        assertEquals("USD", dto.getCurrency());
        assertEquals(FinanceReviewStatus.APPROVED, dto.getStatus());
    }

    // ==================== getReviewsByStatus ====================

    @Test
    public void getReviewsByStatus_withApprovedStatus_shouldReturnApprovedReviews() {
        Offer offer = buildOffer(OfferFinanceValidationStatus.FINANCE_APPROVED);
        OfferFinancialReview review = buildReview(offer, null, FinanceReviewStatus.APPROVED);

        when(reviewRepository.findByStatus(FinanceReviewStatus.APPROVED)).thenReturn(List.of(review));
        when(offerFinancialReviewRepository.findByStatus(FinanceReviewStatus.APPROVED)).thenReturn(List.of(review));

        List<OfferFinancialReviewResponseDTO> result =
                offerFinancialReviewService.getReviewsByStatus(FinanceReviewStatus.APPROVED);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(FinanceReviewStatus.APPROVED, result.get(0).getStatus());
    }

    @Test
    public void getReviewsByStatus_withRejectedStatus_shouldReturnRejectedReviews() {
        Offer offer = buildOffer(OfferFinanceValidationStatus.FINANCE_REJECTED);
        OfferFinancialReview review = buildReview(offer, null, FinanceReviewStatus.REJECTED);

        when(reviewRepository.findByStatus(FinanceReviewStatus.REJECTED)).thenReturn(List.of(review));
        when(offerFinancialReviewRepository.findByStatus(FinanceReviewStatus.REJECTED)).thenReturn(List.of(review));

        List<OfferFinancialReviewResponseDTO> result =
                offerFinancialReviewService.getReviewsByStatus(FinanceReviewStatus.REJECTED);

        assertEquals(1, result.size());
        assertEquals(FinanceReviewStatus.REJECTED, result.get(0).getStatus());
    }

    @Test
    public void getReviewsByStatus_withPendingStatus_shouldReturnPendingReviews() {
        MaintenanceRecord record = buildMaintenanceRecord(MaintenanceStatus.PENDING_FINANCE_APPROVAL);
        OfferFinancialReview review = buildReview(null, record, FinanceReviewStatus.PENDING);

        when(reviewRepository.findByStatus(FinanceReviewStatus.PENDING)).thenReturn(List.of(review));
        when(offerFinancialReviewRepository.findByStatus(FinanceReviewStatus.PENDING)).thenReturn(List.of(review));

        List<OfferFinancialReviewResponseDTO> result =
                offerFinancialReviewService.getReviewsByStatus(FinanceReviewStatus.PENDING);

        assertEquals(1, result.size());
    }

    @Test
    public void getReviewsByStatus_withNoMatchingReviews_shouldReturnEmptyList() {
        when(reviewRepository.findByStatus(FinanceReviewStatus.APPROVED)).thenReturn(Collections.emptyList());
        when(offerFinancialReviewRepository.findByStatus(FinanceReviewStatus.APPROVED)).thenReturn(Collections.emptyList());

        List<OfferFinancialReviewResponseDTO> result =
                offerFinancialReviewService.getReviewsByStatus(FinanceReviewStatus.APPROVED);

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    // ==================== getReviewByOfferId ====================

    @Test
    public void getReviewByOfferId_whenReviewExists_shouldReturnDTO() {
        UUID offerId = UUID.randomUUID();
        Offer offer = buildOffer(OfferFinanceValidationStatus.FINANCE_APPROVED);
        offer.setId(offerId);
        OfferFinancialReview review = buildReview(offer, null, FinanceReviewStatus.APPROVED);

        when(reviewRepository.findByOfferId(offerId)).thenReturn(Optional.of(review));
        when(offerFinancialReviewRepository.findByOfferId(offerId)).thenReturn(Optional.of(review));

        OfferFinancialReviewResponseDTO result = offerFinancialReviewService.getReviewByOfferId(offerId);

        assertNotNull(result);
    }

    @Test
    public void getReviewByOfferId_whenReviewDoesNotExist_shouldReturnNull() {
        UUID offerId = UUID.randomUUID();

        when(reviewRepository.findByOfferId(offerId)).thenReturn(Optional.empty());
        when(offerFinancialReviewRepository.findByOfferId(offerId)).thenReturn(Optional.empty());

        OfferFinancialReviewResponseDTO result = offerFinancialReviewService.getReviewByOfferId(offerId);

        assertNull(result);
    }

    // ==================== getReviewById ====================

    @Test
    public void getReviewById_whenReviewExists_shouldReturnDTO() {
        UUID reviewId = UUID.randomUUID();
        Offer offer = buildOffer(OfferFinanceValidationStatus.FINANCE_APPROVED);
        OfferFinancialReview review = buildReview(offer, null, FinanceReviewStatus.APPROVED);
        review.setId(reviewId);

        when(reviewRepository.findById(reviewId)).thenReturn(Optional.of(review));
        when(offerFinancialReviewRepository.findById(reviewId)).thenReturn(Optional.of(review));

        OfferFinancialReviewResponseDTO result = offerFinancialReviewService.getReviewById(reviewId);

        assertNotNull(result);
        assertEquals(reviewId, result.getId());
    }

    @Test
    public void getReviewById_whenReviewNotFound_shouldThrowRuntimeException() {
        UUID reviewId = UUID.randomUUID();

        when(reviewRepository.findById(reviewId)).thenReturn(Optional.empty());
        when(offerFinancialReviewRepository.findById(reviewId)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> offerFinancialReviewService.getReviewById(reviewId));

        assertTrue(ex.getMessage().contains("Review not found with ID"));
    }

    // ==================== reviewOffer — offer path ====================

    @Test
    public void reviewOffer_approveOffer_happyPath_shouldSaveApprovedReviewAndCallProcurement() {
        UUID offerId = UUID.randomUUID();
        UUID reviewerUserId = UUID.randomUUID();
        Offer offer = buildOffer(OfferFinanceValidationStatus.PENDING_FINANCE_VALIDATION);
        offer.setId(offerId);

        OfferFinancialReviewRequestDTO request = buildApproveRequest(offerId);

        when(offerRepository.existsById(offerId)).thenReturn(true);
        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(reviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(offerFinancialReviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(offerService.handleFinanceValidationResponse(eq(offerId), eq("APPROVE"), eq(reviewerUserId))).thenReturn(new OfferDTO());

        OfferFinancialReviewResponseDTO result =
                offerFinancialReviewService.reviewOffer(request, reviewerUserId, "Finance Manager");

        assertNotNull(result);
        verify(offerService, times(1)).handleFinanceValidationResponse(offerId, "APPROVE", reviewerUserId);
    }

    @Test
    public void reviewOffer_approveOffer_shouldSaveReviewWithApprovedStatus() {
        UUID offerId = UUID.randomUUID();
        UUID reviewerUserId = UUID.randomUUID();
        Offer offer = buildOffer(OfferFinanceValidationStatus.PENDING_FINANCE_VALIDATION);
        offer.setId(offerId);

        OfferFinancialReviewRequestDTO request = buildApproveRequest(offerId);

        when(offerRepository.existsById(offerId)).thenReturn(true);
        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(reviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(offerFinancialReviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(offerService.handleFinanceValidationResponse(any(), any(), any())).thenReturn(new OfferDTO());

        OfferFinancialReviewResponseDTO result =
                offerFinancialReviewService.reviewOffer(request, reviewerUserId, "Finance Manager");

        assertNotNull(result);
        assertEquals(FinanceReviewStatus.APPROVED, result.getStatus());
    }

    @Test
    public void reviewOffer_approveOffer_shouldSetBudgetCategoryOnSavedReview() {
        UUID offerId = UUID.randomUUID();
        UUID reviewerUserId = UUID.randomUUID();
        Offer offer = buildOffer(OfferFinanceValidationStatus.PENDING_FINANCE_VALIDATION);
        offer.setId(offerId);

        OfferFinancialReviewRequestDTO request = buildApproveRequest(offerId);
        request.setBudgetCategory("Capital Expenditure");

        when(offerRepository.existsById(offerId)).thenReturn(true);
        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(reviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(offerFinancialReviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(offerService.handleFinanceValidationResponse(any(), any(), any())).thenReturn(new OfferDTO());

        OfferFinancialReviewResponseDTO result =
                offerFinancialReviewService.reviewOffer(request, reviewerUserId, "Finance Manager");

        assertNotNull(result);
        assertEquals("Capital Expenditure", result.getBudgetCategory());
    }

    @Test
    public void reviewOffer_rejectOffer_happyPath_shouldSaveRejectedReviewAndCallProcurement() {
        UUID offerId = UUID.randomUUID();
        UUID reviewerUserId = UUID.randomUUID();
        Offer offer = buildOffer(OfferFinanceValidationStatus.PENDING_FINANCE_VALIDATION);
        offer.setId(offerId);

        OfferFinancialReviewRequestDTO request = buildRejectRequest(offerId, "Over budget");

        when(offerRepository.existsById(offerId)).thenReturn(true);
        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(reviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(offerFinancialReviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(offerService.handleFinanceValidationResponse(eq(offerId), eq("REJECT"), eq(reviewerUserId))).thenReturn(new OfferDTO());

        OfferFinancialReviewResponseDTO result =
                offerFinancialReviewService.reviewOffer(request, reviewerUserId, "Finance Manager");

        assertNotNull(result);
        verify(offerService, times(1)).handleFinanceValidationResponse(offerId, "REJECT", reviewerUserId);
    }

    @Test
    public void reviewOffer_rejectOffer_shouldSaveReviewWithRejectedStatus() {
        UUID offerId = UUID.randomUUID();
        UUID reviewerUserId = UUID.randomUUID();
        Offer offer = buildOffer(OfferFinanceValidationStatus.PENDING_FINANCE_VALIDATION);
        offer.setId(offerId);

        OfferFinancialReviewRequestDTO request = buildRejectRequest(offerId, "Over budget");

        when(offerRepository.existsById(offerId)).thenReturn(true);
        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(reviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(offerFinancialReviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(offerService.handleFinanceValidationResponse(any(), any(), any())).thenReturn(new OfferDTO());

        OfferFinancialReviewResponseDTO result =
                offerFinancialReviewService.reviewOffer(request, reviewerUserId, "Finance Manager");

        assertNotNull(result);
        assertEquals(FinanceReviewStatus.REJECTED, result.getStatus());
        assertNull(result.getBudgetCategory());
    }

    @Test
    public void reviewOffer_approveOffer_withMissingBudgetCategory_shouldThrowRuntimeException() {
        UUID offerId = UUID.randomUUID();
        Offer offer = buildOffer(OfferFinanceValidationStatus.PENDING_FINANCE_VALIDATION);
        offer.setId(offerId);

        OfferFinancialReviewRequestDTO request = new OfferFinancialReviewRequestDTO();
        request.setOfferId(offerId);
        request.setAction("APPROVE");
        request.setBudgetCategory(null); // Missing budget category

        when(offerRepository.existsById(offerId)).thenReturn(true);
        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> offerFinancialReviewService.reviewOffer(request, UUID.randomUUID(), "Finance Manager"));

        assertTrue(ex.getMessage().contains("Budget category is required for approval"));
        verify(reviewRepository, never()).save(any());
    }

    @Test
    public void reviewOffer_approveOffer_withBlankBudgetCategory_shouldThrowRuntimeException() {
        UUID offerId = UUID.randomUUID();
        Offer offer = buildOffer(OfferFinanceValidationStatus.PENDING_FINANCE_VALIDATION);
        offer.setId(offerId);

        OfferFinancialReviewRequestDTO request = new OfferFinancialReviewRequestDTO();
        request.setOfferId(offerId);
        request.setAction("APPROVE");
        request.setBudgetCategory("   "); // Blank budget category

        when(offerRepository.existsById(offerId)).thenReturn(true);
        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> offerFinancialReviewService.reviewOffer(request, UUID.randomUUID(), "Finance Manager"));

        assertTrue(ex.getMessage().contains("Budget category is required for approval"));
        verify(reviewRepository, never()).save(any());
    }

    @Test
    public void reviewOffer_rejectOffer_withMissingRejectionReason_shouldThrowRuntimeException() {
        UUID offerId = UUID.randomUUID();
        Offer offer = buildOffer(OfferFinanceValidationStatus.PENDING_FINANCE_VALIDATION);
        offer.setId(offerId);

        OfferFinancialReviewRequestDTO request = new OfferFinancialReviewRequestDTO();
        request.setOfferId(offerId);
        request.setAction("REJECT");
        request.setRejectionReason(null); // Missing rejection reason

        when(offerRepository.existsById(offerId)).thenReturn(true);
        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> offerFinancialReviewService.reviewOffer(request, UUID.randomUUID(), "Finance Manager"));

        assertTrue(ex.getMessage().contains("Rejection reason is required for rejection"));
        verify(reviewRepository, never()).save(any());
    }

    @Test
    public void reviewOffer_offerNotPendingValidation_shouldThrowRuntimeException() {
        UUID offerId = UUID.randomUUID();
        // Offer already approved — not pending
        Offer offer = buildOffer(OfferFinanceValidationStatus.FINANCE_APPROVED);
        offer.setId(offerId);

        OfferFinancialReviewRequestDTO request = buildApproveRequest(offerId);

        when(offerRepository.existsById(offerId)).thenReturn(true);
        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> offerFinancialReviewService.reviewOffer(request, UUID.randomUUID(), "Finance Manager"));

        assertTrue(ex.getMessage().contains("Offer is not pending finance validation"));
        verify(reviewRepository, never()).save(any());
    }

    @Test
    public void reviewOffer_recordNotFound_shouldThrowRuntimeException() {
        UUID unknownId = UUID.randomUUID();
        OfferFinancialReviewRequestDTO request = buildApproveRequest(unknownId);

        when(offerRepository.existsById(unknownId)).thenReturn(false);
        when(maintenanceRecordRepository.existsById(unknownId)).thenReturn(false);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> offerFinancialReviewService.reviewOffer(request, UUID.randomUUID(), "Finance Manager"));

        assertTrue(ex.getMessage().contains("Record not found with ID"));
        verify(reviewRepository, never()).save(any());
    }

    @Test
    public void reviewOffer_whenOfferServiceThrowsException_shouldFallbackAndUpdateOfferDirectly() {
        UUID offerId = UUID.randomUUID();
        UUID reviewerUserId = UUID.randomUUID();
        Offer offer = buildOffer(OfferFinanceValidationStatus.PENDING_FINANCE_VALIDATION);
        offer.setId(offerId);

        OfferFinancialReviewRequestDTO request = buildApproveRequest(offerId);

        when(offerRepository.existsById(offerId)).thenReturn(true);
        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(reviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(offerFinancialReviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        // Simulate procurement service failure
        doThrow(new RuntimeException("Procurement service unavailable"))
                .when(offerService).handleFinanceValidationResponse(any(), any(), any());
        when(offerRepository.save(any(Offer.class))).thenReturn(offer);

        // Should NOT throw — falls back gracefully
        OfferFinancialReviewResponseDTO result =
                offerFinancialReviewService.reviewOffer(request, reviewerUserId, "Finance Manager");

        assertNotNull(result);
        // Fallback path saves the offer directly
        verify(offerRepository, times(1)).save(any(Offer.class));
    }

    // ==================== reviewOffer — maintenance path ====================

    @Test
    public void reviewOffer_approveMaintenanceRecord_shouldCallMaintenanceServiceApprove() {
        UUID maintenanceId = UUID.randomUUID();
        UUID reviewerUserId = UUID.randomUUID();
        MaintenanceRecord record = buildMaintenanceRecord(MaintenanceStatus.PENDING_FINANCE_APPROVAL);
        record.setId(maintenanceId);
        record.setTotalCost(BigDecimal.valueOf(3000));

        OfferFinancialReview pendingReview = buildReview(null, record, FinanceReviewStatus.PENDING);

        OfferFinancialReviewRequestDTO request = buildApproveRequest(maintenanceId);

        when(offerRepository.existsById(maintenanceId)).thenReturn(false);
        when(maintenanceRecordRepository.existsById(maintenanceId)).thenReturn(true);
        when(maintenanceRecordRepository.findById(maintenanceId)).thenReturn(Optional.of(record));
        when(reviewRepository.findByMaintenanceRecordId(maintenanceId)).thenReturn(List.of(pendingReview));
        when(offerFinancialReviewRepository.findByMaintenanceRecordId(maintenanceId)).thenReturn(List.of(pendingReview));
        when(reviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(offerFinancialReviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(maintenanceService.approveByFinance(maintenanceId)).thenReturn(new MaintenanceRecordDto());

        OfferFinancialReviewResponseDTO result =
                offerFinancialReviewService.reviewOffer(request, reviewerUserId, "Finance Manager");

        assertNotNull(result);
        verify(maintenanceService, times(1)).approveByFinance(maintenanceId);
        verify(offerService, never()).handleFinanceValidationResponse(any(), any(), any());
    }

    @Test
    public void reviewOffer_rejectMaintenanceRecord_shouldCallMaintenanceServiceReject() {
        UUID maintenanceId = UUID.randomUUID();
        UUID reviewerUserId = UUID.randomUUID();
        MaintenanceRecord record = buildMaintenanceRecord(MaintenanceStatus.PENDING_FINANCE_APPROVAL);
        record.setId(maintenanceId);
        record.setTotalCost(BigDecimal.valueOf(2000));

        OfferFinancialReview pendingReview = buildReview(null, record, FinanceReviewStatus.PENDING);

        OfferFinancialReviewRequestDTO request = buildRejectRequest(maintenanceId, "Cost too high");

        when(offerRepository.existsById(maintenanceId)).thenReturn(false);
        when(maintenanceRecordRepository.existsById(maintenanceId)).thenReturn(true);
        when(maintenanceRecordRepository.findById(maintenanceId)).thenReturn(Optional.of(record));
        when(reviewRepository.findByMaintenanceRecordId(maintenanceId)).thenReturn(List.of(pendingReview));
        when(offerFinancialReviewRepository.findByMaintenanceRecordId(maintenanceId)).thenReturn(List.of(pendingReview));
        when(reviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(offerFinancialReviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(maintenanceService.rejectMaintenanceRecord(maintenanceId, "Cost too high")).thenReturn(new MaintenanceRecordDto());

        OfferFinancialReviewResponseDTO result =
                offerFinancialReviewService.reviewOffer(request, reviewerUserId, "Finance Manager");

        assertNotNull(result);
        verify(maintenanceService, times(1)).rejectMaintenanceRecord(maintenanceId, "Cost too high");
        verify(offerService, never()).handleFinanceValidationResponse(any(), any(), any());
    }

    @Test
    public void reviewOffer_approveMaintenanceRecord_shouldUpdateExistingPendingReview() {
        UUID maintenanceId = UUID.randomUUID();
        MaintenanceRecord record = buildMaintenanceRecord(MaintenanceStatus.PENDING_FINANCE_APPROVAL);
        record.setId(maintenanceId);
        record.setTotalCost(BigDecimal.valueOf(1500));

        OfferFinancialReview pendingReview = buildReview(null, record, FinanceReviewStatus.PENDING);

        OfferFinancialReviewRequestDTO request = buildApproveRequest(maintenanceId);

        when(offerRepository.existsById(maintenanceId)).thenReturn(false);
        when(maintenanceRecordRepository.existsById(maintenanceId)).thenReturn(true);
        when(maintenanceRecordRepository.findById(maintenanceId)).thenReturn(Optional.of(record));
        when(reviewRepository.findByMaintenanceRecordId(maintenanceId)).thenReturn(List.of(pendingReview));
        when(offerFinancialReviewRepository.findByMaintenanceRecordId(maintenanceId)).thenReturn(List.of(pendingReview));
        when(reviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(offerFinancialReviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(maintenanceService.approveByFinance(maintenanceId)).thenReturn(new MaintenanceRecordDto());

        OfferFinancialReviewResponseDTO result =
                offerFinancialReviewService.reviewOffer(request, UUID.randomUUID(), "Finance Manager");

        // Should save the EXISTING review (updated), not create a brand-new one
        assertNotNull(result);
        // After mutation, the returned DTO should show the updated APPROVED status
        assertEquals(FinanceReviewStatus.APPROVED, result.getStatus());
    }

    @Test
    public void reviewOffer_maintenanceNotPendingFinanceApproval_shouldThrowRuntimeException() {
        UUID maintenanceId = UUID.randomUUID();
        // Record is ACTIVE, not PENDING_FINANCE_APPROVAL
        MaintenanceRecord record = buildMaintenanceRecord(MaintenanceStatus.ACTIVE);
        record.setId(maintenanceId);

        OfferFinancialReviewRequestDTO request = buildApproveRequest(maintenanceId);

        when(offerRepository.existsById(maintenanceId)).thenReturn(false);
        when(maintenanceRecordRepository.existsById(maintenanceId)).thenReturn(true);
        when(maintenanceRecordRepository.findById(maintenanceId)).thenReturn(Optional.of(record));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> offerFinancialReviewService.reviewOffer(request, UUID.randomUUID(), "Finance Manager"));

        assertTrue(ex.getMessage().contains("Maintenance Record is not pending finance approval"));
        verify(reviewRepository, never()).save(any());
    }

    @Test
    public void reviewOffer_maintenanceRecord_shouldUseTotalCostAsReviewAmount() {
        UUID maintenanceId = UUID.randomUUID();
        BigDecimal totalCost = BigDecimal.valueOf(4500);
        MaintenanceRecord record = buildMaintenanceRecord(MaintenanceStatus.PENDING_FINANCE_APPROVAL);
        record.setId(maintenanceId);
        record.setTotalCost(totalCost);

        OfferFinancialReviewRequestDTO request = buildApproveRequest(maintenanceId);

        when(offerRepository.existsById(maintenanceId)).thenReturn(false);
        when(maintenanceRecordRepository.existsById(maintenanceId)).thenReturn(true);
        when(maintenanceRecordRepository.findById(maintenanceId)).thenReturn(Optional.of(record));
        // No existing pending review — service creates a new one with totalAmount = totalCost
        when(reviewRepository.findByMaintenanceRecordId(maintenanceId)).thenReturn(Collections.emptyList());
        when(offerFinancialReviewRepository.findByMaintenanceRecordId(maintenanceId)).thenReturn(Collections.emptyList());
        when(reviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(offerFinancialReviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(maintenanceService.approveByFinance(maintenanceId)).thenReturn(new MaintenanceRecordDto());

        OfferFinancialReviewResponseDTO result =
                offerFinancialReviewService.reviewOffer(request, UUID.randomUUID(), "Finance Manager");

        assertNotNull(result);
        assertEquals(totalCost, result.getTotalAmount());
    }

    @Test
    public void reviewOffer_maintenanceRecordWithNullTotalCost_shouldDefaultToZero() {
        UUID maintenanceId = UUID.randomUUID();
        MaintenanceRecord record = buildMaintenanceRecord(MaintenanceStatus.PENDING_FINANCE_APPROVAL);
        record.setId(maintenanceId);
        record.setTotalCost(null); // Null total cost

        OfferFinancialReview pendingReview = buildReview(null, record, FinanceReviewStatus.PENDING);
        pendingReview.setTotalAmount(BigDecimal.ZERO);

        OfferFinancialReviewRequestDTO request = buildApproveRequest(maintenanceId);

        when(offerRepository.existsById(maintenanceId)).thenReturn(false);
        when(maintenanceRecordRepository.existsById(maintenanceId)).thenReturn(true);
        when(maintenanceRecordRepository.findById(maintenanceId)).thenReturn(Optional.of(record));
        when(reviewRepository.findByMaintenanceRecordId(maintenanceId)).thenReturn(List.of(pendingReview));
        when(offerFinancialReviewRepository.findByMaintenanceRecordId(maintenanceId)).thenReturn(List.of(pendingReview));
        when(reviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(offerFinancialReviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(maintenanceService.approveByFinance(maintenanceId)).thenReturn(new MaintenanceRecordDto());

        OfferFinancialReviewResponseDTO result =
                offerFinancialReviewService.reviewOffer(request, UUID.randomUUID(), "Finance Manager");

        assertNotNull(result);
        assertEquals(BigDecimal.ZERO, result.getTotalAmount());
    }

    // ==================== reviewOfferItems ====================

    @Test
    public void reviewOfferItems_allItemsAccepted_shouldSetOverallStatusToFinanceApproved() {
        UUID offerId = UUID.randomUUID();
        Offer offer = buildOffer(OfferFinanceValidationStatus.PENDING_FINANCE_VALIDATION);
        offer.setId(offerId);

        UUID itemId1 = UUID.randomUUID();
        UUID itemId2 = UUID.randomUUID();
        OfferItem item1 = buildOfferItem(itemId1, BigDecimal.valueOf(100), "USD", "ACCEPTED");
        OfferItem item2 = buildOfferItem(itemId2, BigDecimal.valueOf(200), "USD", "ACCEPTED");
        offer.setOfferItems(List.of(item1, item2));

        ReviewOfferItemsDTO request = buildReviewItemsRequest(offerId, List.of(
                buildItemDecision(itemId1, "ACCEPTED", null),
                buildItemDecision(itemId2, "ACCEPTED", null)
        ));

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(offerItemRepository.findById(itemId1)).thenReturn(Optional.of(item1));
        when(offerItemRepository.findById(itemId2)).thenReturn(Optional.of(item2));
        when(offerRepository.save(any(Offer.class))).thenReturn(offer);
        when(offerFinancialReviewRepository.findByOfferId(offerId)).thenReturn(Optional.empty());
        when(reviewRepository.findByOfferId(offerId)).thenReturn(Optional.empty());
        when(offerFinancialReviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(reviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(offerService.completeItemLevelFinanceReview(eq(offerId), any())).thenReturn(new OfferDTO());

        OfferFinancialReview result = offerFinancialReviewService.reviewOfferItems(request);

        assertNotNull(result);
        // Verify offer financeValidationStatus is FINANCE_APPROVED
        ArgumentCaptor<Offer> offerCaptor = ArgumentCaptor.forClass(Offer.class);
        verify(offerRepository).save(offerCaptor.capture());
        assertEquals(OfferFinanceValidationStatus.FINANCE_APPROVED, offerCaptor.getValue().getFinanceValidationStatus());
        assertEquals("FINANCE_ACCEPTED", offerCaptor.getValue().getFinanceStatus());
    }

    @Test
    public void reviewOfferItems_allItemsRejected_shouldSetOverallStatusToFinanceRejected() {
        UUID offerId = UUID.randomUUID();
        Offer offer = buildOffer(OfferFinanceValidationStatus.PENDING_FINANCE_VALIDATION);
        offer.setId(offerId);

        UUID itemId = UUID.randomUUID();
        OfferItem item = buildOfferItem(itemId, BigDecimal.valueOf(500), "USD", "REJECTED");
        offer.setOfferItems(List.of(item));

        ReviewOfferItemsDTO request = buildReviewItemsRequest(offerId, List.of(
                buildItemDecision(itemId, "REJECTED", "Not in budget")
        ));

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(offerItemRepository.findById(itemId)).thenReturn(Optional.of(item));
        when(offerRepository.save(any(Offer.class))).thenReturn(offer);
        when(offerFinancialReviewRepository.findByOfferId(offerId)).thenReturn(Optional.empty());
        when(reviewRepository.findByOfferId(offerId)).thenReturn(Optional.empty());
        when(offerFinancialReviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(reviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(offerService.completeItemLevelFinanceReview(eq(offerId), any())).thenReturn(new OfferDTO());

        OfferFinancialReview result = offerFinancialReviewService.reviewOfferItems(request);

        assertNotNull(result);
        ArgumentCaptor<Offer> offerCaptor = ArgumentCaptor.forClass(Offer.class);
        verify(offerRepository).save(offerCaptor.capture());
        assertEquals(OfferFinanceValidationStatus.FINANCE_REJECTED, offerCaptor.getValue().getFinanceValidationStatus());
        assertEquals("FINANCE_REJECTED", offerCaptor.getValue().getFinanceStatus());
    }

    @Test
    public void reviewOfferItems_mixedItemDecisions_shouldSetOverallStatusToPartiallyAccepted() {
        UUID offerId = UUID.randomUUID();
        Offer offer = buildOffer(OfferFinanceValidationStatus.PENDING_FINANCE_VALIDATION);
        offer.setId(offerId);

        UUID itemId1 = UUID.randomUUID();
        UUID itemId2 = UUID.randomUUID();
        OfferItem item1 = buildOfferItem(itemId1, BigDecimal.valueOf(300), "USD", "ACCEPTED");
        OfferItem item2 = buildOfferItem(itemId2, BigDecimal.valueOf(700), "USD", "REJECTED");
        offer.setOfferItems(List.of(item1, item2));

        ReviewOfferItemsDTO request = buildReviewItemsRequest(offerId, List.of(
                buildItemDecision(itemId1, "ACCEPTED", null),
                buildItemDecision(itemId2, "REJECTED", "Price too high")
        ));

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(offerItemRepository.findById(itemId1)).thenReturn(Optional.of(item1));
        when(offerItemRepository.findById(itemId2)).thenReturn(Optional.of(item2));
        when(offerRepository.save(any(Offer.class))).thenReturn(offer);
        when(offerFinancialReviewRepository.findByOfferId(offerId)).thenReturn(Optional.empty());
        when(reviewRepository.findByOfferId(offerId)).thenReturn(Optional.empty());
        when(offerFinancialReviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(reviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(offerService.completeItemLevelFinanceReview(eq(offerId), any())).thenReturn(new OfferDTO());

        offerFinancialReviewService.reviewOfferItems(request);

        ArgumentCaptor<Offer> offerCaptor = ArgumentCaptor.forClass(Offer.class);
        verify(offerRepository).save(offerCaptor.capture());
        assertEquals(OfferFinanceValidationStatus.FINANCE_APPROVED, offerCaptor.getValue().getFinanceValidationStatus());
        assertEquals("FINANCE_PARTIALLY_ACCEPTED", offerCaptor.getValue().getFinanceStatus());
    }

    @Test
    public void reviewOfferItems_offerNotFound_shouldThrowRuntimeException() {
        UUID offerId = UUID.randomUUID();
        ReviewOfferItemsDTO request = buildReviewItemsRequest(offerId, Collections.emptyList());

        when(offerRepository.findById(offerId)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> offerFinancialReviewService.reviewOfferItems(request));

        assertTrue(ex.getMessage().contains("Offer not found"));
        verify(offerItemRepository, never()).findById(any());
    }

    @Test
    public void reviewOfferItems_offerNotPendingValidation_shouldThrowRuntimeException() {
        UUID offerId = UUID.randomUUID();
        Offer offer = buildOffer(OfferFinanceValidationStatus.FINANCE_APPROVED); // Already approved
        offer.setId(offerId);

        ReviewOfferItemsDTO request = buildReviewItemsRequest(offerId, Collections.emptyList());

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> offerFinancialReviewService.reviewOfferItems(request));

        assertTrue(ex.getMessage().contains("Offer is not pending finance validation"));
        verify(offerItemRepository, never()).findById(any());
    }

    @Test
    public void reviewOfferItems_rejectedItemWithNoRejectionReason_shouldThrowRuntimeException() {
        UUID offerId = UUID.randomUUID();
        Offer offer = buildOffer(OfferFinanceValidationStatus.PENDING_FINANCE_VALIDATION);
        offer.setId(offerId);

        UUID itemId = UUID.randomUUID();
        OfferItem item = buildOfferItem(itemId, BigDecimal.valueOf(500), "USD", null);
        offer.setOfferItems(List.of(item));

        ReviewOfferItemsDTO request = buildReviewItemsRequest(offerId, List.of(
                buildItemDecision(itemId, "REJECTED", null) // No rejection reason
        ));

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(offerItemRepository.findById(itemId)).thenReturn(Optional.of(item));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> offerFinancialReviewService.reviewOfferItems(request));

        assertTrue(ex.getMessage().contains("Rejection reason required for rejected items"));
        verify(offerRepository, never()).save(any());
    }

    @Test
    public void reviewOfferItems_offerItemNotFound_shouldThrowRuntimeException() {
        UUID offerId = UUID.randomUUID();
        Offer offer = buildOffer(OfferFinanceValidationStatus.PENDING_FINANCE_VALIDATION);
        offer.setId(offerId);

        UUID missingItemId = UUID.randomUUID();
        offer.setOfferItems(new ArrayList<>());

        ReviewOfferItemsDTO request = buildReviewItemsRequest(offerId, List.of(
                buildItemDecision(missingItemId, "ACCEPTED", null)
        ));

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(offerItemRepository.findById(missingItemId)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> offerFinancialReviewService.reviewOfferItems(request));

        assertTrue(ex.getMessage().contains("Offer item not found"));
    }

    @Test
    public void reviewOfferItems_firstTimeReview_shouldCreateNewReviewRecord() {
        UUID offerId = UUID.randomUUID();
        Offer offer = buildOffer(OfferFinanceValidationStatus.PENDING_FINANCE_VALIDATION);
        offer.setId(offerId);

        UUID itemId = UUID.randomUUID();
        OfferItem item = buildOfferItem(itemId, BigDecimal.valueOf(100), "USD", "ACCEPTED");
        offer.setOfferItems(List.of(item));

        ReviewOfferItemsDTO request = buildReviewItemsRequest(offerId, List.of(
                buildItemDecision(itemId, "ACCEPTED", null)
        ));

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(offerItemRepository.findById(itemId)).thenReturn(Optional.of(item));
        when(offerRepository.save(any(Offer.class))).thenReturn(offer);
        // No existing review — triggers new record creation
        when(offerFinancialReviewRepository.findByOfferId(offerId)).thenReturn(Optional.empty());
        when(reviewRepository.findByOfferId(offerId)).thenReturn(Optional.empty());
        when(offerFinancialReviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(reviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(offerService.completeItemLevelFinanceReview(eq(offerId), any())).thenReturn(new OfferDTO());

        OfferFinancialReview result = offerFinancialReviewService.reviewOfferItems(request);

        // New record should have the offer linked
        assertNotNull(result);
        assertNotNull(result.getOffer());
        assertEquals(FinanceReviewStatus.APPROVED, result.getStatus());
    }

    @Test
    public void reviewOfferItems_reReview_shouldUpdateExistingReviewRecord() {
        UUID offerId = UUID.randomUUID();
        Offer offer = buildOffer(OfferFinanceValidationStatus.PENDING_FINANCE_VALIDATION);
        offer.setId(offerId);

        UUID itemId = UUID.randomUUID();
        OfferItem item = buildOfferItem(itemId, BigDecimal.valueOf(250), "EGP", "ACCEPTED");
        offer.setOfferItems(List.of(item));

        ReviewOfferItemsDTO request = buildReviewItemsRequest(offerId, List.of(
                buildItemDecision(itemId, "ACCEPTED", null)
        ));
        request.setBudgetCategory("Updated Category");

        // Existing review from a previous review round
        OfferFinancialReview existingReview = buildReview(offer, null, FinanceReviewStatus.REJECTED);
        existingReview.setRejectionReason("Old rejection reason");
        OfferFinancialReview updatedReview = buildReview(offer, null, FinanceReviewStatus.APPROVED);

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(offerItemRepository.findById(itemId)).thenReturn(Optional.of(item));
        when(offerRepository.save(any(Offer.class))).thenReturn(offer);
        when(offerFinancialReviewRepository.findByOfferId(offerId)).thenReturn(Optional.of(existingReview));
        when(reviewRepository.findByOfferId(offerId)).thenReturn(Optional.of(existingReview));
        when(offerFinancialReviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(reviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(offerService.completeItemLevelFinanceReview(eq(offerId), any())).thenReturn(new OfferDTO());

        OfferFinancialReview result = offerFinancialReviewService.reviewOfferItems(request);

        // Status updated to APPROVED and rejection reason cleared
        assertNotNull(result);
        assertEquals(FinanceReviewStatus.APPROVED, result.getStatus());
        assertNull(result.getRejectionReason());
    }

    @Test
    public void reviewOfferItems_allAccepted_shouldCalculateTotalFromAcceptedItemsOnly() {
        UUID offerId = UUID.randomUUID();
        Offer offer = buildOffer(OfferFinanceValidationStatus.PENDING_FINANCE_VALIDATION);
        offer.setId(offerId);

        UUID itemId1 = UUID.randomUUID();
        UUID itemId2 = UUID.randomUUID();
        // item1 accepted with 400, item2 rejected with 600 — only 400 should be the total
        OfferItem item1 = buildOfferItem(itemId1, BigDecimal.valueOf(400), "USD", "ACCEPTED");
        OfferItem item2 = buildOfferItem(itemId2, BigDecimal.valueOf(600), "USD", "REJECTED");
        offer.setOfferItems(List.of(item1, item2));

        ReviewOfferItemsDTO request = buildReviewItemsRequest(offerId, List.of(
                buildItemDecision(itemId1, "ACCEPTED", null),
                buildItemDecision(itemId2, "REJECTED", "Too expensive")
        ));

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(offerItemRepository.findById(itemId1)).thenReturn(Optional.of(item1));
        when(offerItemRepository.findById(itemId2)).thenReturn(Optional.of(item2));
        when(offerRepository.save(any(Offer.class))).thenReturn(offer);
        when(offerFinancialReviewRepository.findByOfferId(offerId)).thenReturn(Optional.empty());
        when(reviewRepository.findByOfferId(offerId)).thenReturn(Optional.empty());
        when(offerFinancialReviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(reviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(offerService.completeItemLevelFinanceReview(eq(offerId), any())).thenReturn(new OfferDTO());

        OfferFinancialReview result = offerFinancialReviewService.reviewOfferItems(request);

        // Only the accepted item's total price (400) should be in the review total
        assertNotNull(result);
        assertEquals(BigDecimal.valueOf(400), result.getTotalAmount());
    }

    @Test
    public void reviewOfferItems_shouldKeepOfferStatusAsManagerAccepted() {
        UUID offerId = UUID.randomUUID();
        Offer offer = buildOffer(OfferFinanceValidationStatus.PENDING_FINANCE_VALIDATION);
        offer.setId(offerId);

        UUID itemId = UUID.randomUUID();
        OfferItem item = buildOfferItem(itemId, BigDecimal.valueOf(100), "USD", "ACCEPTED");
        offer.setOfferItems(List.of(item));

        ReviewOfferItemsDTO request = buildReviewItemsRequest(offerId, List.of(
                buildItemDecision(itemId, "ACCEPTED", null)
        ));

        OfferFinancialReview savedReview = buildReview(offer, null, FinanceReviewStatus.APPROVED);

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(offerItemRepository.findById(itemId)).thenReturn(Optional.of(item));
        when(offerRepository.save(any(Offer.class))).thenReturn(offer);
        when(offerFinancialReviewRepository.findByOfferId(offerId)).thenReturn(Optional.empty());
        when(reviewRepository.findByOfferId(offerId)).thenReturn(Optional.empty());
        when(offerFinancialReviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(reviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(offerService.completeItemLevelFinanceReview(eq(offerId), any())).thenReturn(new OfferDTO());

        offerFinancialReviewService.reviewOfferItems(request);

        ArgumentCaptor<Offer> offerCaptor = ArgumentCaptor.forClass(Offer.class);
        verify(offerRepository).save(offerCaptor.capture());
        assertEquals("MANAGERACCEPTED", offerCaptor.getValue().getStatus(),
                "Offer status must stay as MANAGERACCEPTED — not moved to FINALIZING");
    }

    @Test
    public void reviewOfferItems_shouldCallCompleteItemLevelFinanceReviewOnOfferService() {
        UUID offerId = UUID.randomUUID();
        Offer offer = buildOffer(OfferFinanceValidationStatus.PENDING_FINANCE_VALIDATION);
        offer.setId(offerId);

        UUID itemId = UUID.randomUUID();
        OfferItem item = buildOfferItem(itemId, BigDecimal.valueOf(100), "USD", "ACCEPTED");
        offer.setOfferItems(List.of(item));

        ReviewOfferItemsDTO request = buildReviewItemsRequest(offerId, List.of(
                buildItemDecision(itemId, "ACCEPTED", null)
        ));
        request.setReviewerName("Reviewer One");

        OfferFinancialReview savedReview = buildReview(offer, null, FinanceReviewStatus.APPROVED);

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(offerItemRepository.findById(itemId)).thenReturn(Optional.of(item));
        when(offerRepository.save(any(Offer.class))).thenReturn(offer);
        when(offerFinancialReviewRepository.findByOfferId(offerId)).thenReturn(Optional.empty());
        when(reviewRepository.findByOfferId(offerId)).thenReturn(Optional.empty());
        when(offerFinancialReviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(reviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(offerService.completeItemLevelFinanceReview(offerId, "Reviewer One")).thenReturn(new OfferDTO());

        offerFinancialReviewService.reviewOfferItems(request);

        verify(offerService, times(1)).completeItemLevelFinanceReview(offerId, "Reviewer One");
    }

    @Test
    public void reviewOfferItems_whenCompleteItemLevelReviewThrows_shouldContinueGracefully() {
        UUID offerId = UUID.randomUUID();
        Offer offer = buildOffer(OfferFinanceValidationStatus.PENDING_FINANCE_VALIDATION);
        offer.setId(offerId);

        UUID itemId = UUID.randomUUID();
        OfferItem item = buildOfferItem(itemId, BigDecimal.valueOf(100), "USD", "ACCEPTED");
        offer.setOfferItems(List.of(item));

        ReviewOfferItemsDTO request = buildReviewItemsRequest(offerId, List.of(
                buildItemDecision(itemId, "ACCEPTED", null)
        ));

        OfferFinancialReview savedReview = buildReview(offer, null, FinanceReviewStatus.APPROVED);

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(offerItemRepository.findById(itemId)).thenReturn(Optional.of(item));
        when(offerRepository.save(any(Offer.class))).thenReturn(offer);
        when(offerFinancialReviewRepository.findByOfferId(offerId)).thenReturn(Optional.empty());
        when(reviewRepository.findByOfferId(offerId)).thenReturn(Optional.empty());
        when(offerFinancialReviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(reviewRepository.save(any(OfferFinancialReview.class))).thenAnswer(inv -> inv.getArgument(0));
        // Simulate procurement service failure
        doThrow(new RuntimeException("Procurement service unavailable"))
                .when(offerService).completeItemLevelFinanceReview(any(), any());

        // Should NOT propagate the exception
        OfferFinancialReview result = offerFinancialReviewService.reviewOfferItems(request);

        // Service should complete normally and return a non-null review record
        assertNotNull(result);
    }

    // ==================== Helper Methods ====================

    private Offer buildOffer(OfferFinanceValidationStatus validationStatus) {
        Offer offer = new Offer();
        offer.setId(UUID.randomUUID());
        offer.setTitle("Test Offer");
        offer.setStatus("MANAGERACCEPTED");
        offer.setFinanceValidationStatus(validationStatus);
        offer.setCreatedAt(LocalDateTime.now());
        offer.setOfferItems(new ArrayList<>());
        return offer;
    }

    private MaintenanceRecord buildMaintenanceRecord(MaintenanceStatus status) {
        MaintenanceRecord record = MaintenanceRecord.builder()
                .id(UUID.randomUUID())
                .recordNumber("MR-2024-0001")
                .equipmentId(UUID.randomUUID())
                .initialIssueDescription("Test issue")
                .sparePartName("Test Part")
                .issueDate(LocalDateTime.now())
                .expectedCompletionDate(LocalDateTime.now().plusDays(7))
                .expectedCost(BigDecimal.valueOf(1000))
                .totalCost(BigDecimal.valueOf(1500))
                .status(status)
                .build();
        return record;
    }

    private OfferFinancialReview buildReview(Offer offer, MaintenanceRecord maintenanceRecord,
                                              FinanceReviewStatus status) {
        return OfferFinancialReview.builder()
                .id(UUID.randomUUID())
                .offer(offer)
                .maintenanceRecord(maintenanceRecord)
                .totalAmount(BigDecimal.valueOf(2000))
                .currency("USD")
                .budgetCategory("Operations")
                .reviewedByUserId(UUID.randomUUID())
                .reviewedByUserName("Finance Manager")
                .reviewedAt(LocalDateTime.now())
                .status(status)
                .approvalNotes("Looks good")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    private OfferItem buildOfferItem(UUID id, BigDecimal totalPrice, String currency, String financeStatus) {
        OfferItem item = new OfferItem();
        item.setId(id);
        item.setQuantity(1.0);
        item.setUnitPrice(totalPrice);
        item.setTotalPrice(totalPrice);
        item.setCurrency(currency);
        item.setFinanceStatus(financeStatus);
        return item;
    }

    private OfferFinancialReviewRequestDTO buildApproveRequest(UUID entityId) {
        OfferFinancialReviewRequestDTO request = new OfferFinancialReviewRequestDTO();
        request.setOfferId(entityId);
        request.setAction("APPROVE");
        request.setBudgetCategory("Operations Budget");
        request.setApprovalNotes("Approved after review");
        request.setExpectedPaymentDate(LocalDate.now().plusDays(30));
        return request;
    }

    private OfferFinancialReviewRequestDTO buildRejectRequest(UUID entityId, String rejectionReason) {
        OfferFinancialReviewRequestDTO request = new OfferFinancialReviewRequestDTO();
        request.setOfferId(entityId);
        request.setAction("REJECT");
        request.setRejectionReason(rejectionReason);
        return request;
    }

    private ReviewOfferItemsDTO buildReviewItemsRequest(UUID offerId, List<ItemReviewDecision> decisions) {
        ReviewOfferItemsDTO request = new ReviewOfferItemsDTO();
        request.setOfferId(offerId);
        request.setReviewerUserId(UUID.randomUUID());
        request.setReviewerName("Finance Reviewer");
        request.setBudgetCategory("Operations");
        request.setNotes("Review completed");
        request.setItemDecisions(decisions);
        return request;
    }

    private ItemReviewDecision buildItemDecision(UUID offerItemId, String decision, String rejectionReason) {
        ItemReviewDecision d = new ItemReviewDecision();
        d.setOfferItemId(offerItemId);
        d.setDecision(decision);
        d.setRejectionReason(rejectionReason);
        return d;
    }
}