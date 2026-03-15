package com.example.backend.controllers.finance.accountsPayable;

import com.example.backend.config.JwtService;
import com.example.backend.dto.finance.accountsPayable.OfferFinancialReviewRequestDTO;
import com.example.backend.dto.finance.accountsPayable.OfferFinancialReviewResponseDTO;
import com.example.backend.dto.finance.accountsPayable.ReviewOfferItemsDTO;
import com.example.backend.models.finance.accountsPayable.OfferFinancialReview;
import com.example.backend.models.finance.accountsPayable.enums.FinanceReviewStatus;
import com.example.backend.models.user.User;
import com.example.backend.services.finance.accountsPayable.OfferFinancialReviewService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = OfferFinancialReviewController.class)
@AutoConfigureMockMvc(addFilters = false)
public class OfferFinancialReviewControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OfferFinancialReviewService reviewService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    private UUID reviewId;
    private UUID offerId;
    private OfferFinancialReviewResponseDTO sampleReview;
    private User mockUser;

    @BeforeEach
    void setUp() {
        objectMapper.registerModule(new JavaTimeModule());

        reviewId = UUID.randomUUID();
        offerId = UUID.randomUUID();

        sampleReview = OfferFinancialReviewResponseDTO.builder()
                .id(reviewId)
                .offerId(offerId)
                .offerNumber("OFFER-2026-00001")
                .totalAmount(new BigDecimal("25000.00"))
                .currency("USD")
                .budgetCategory("Operations")
                .status(FinanceReviewStatus.PENDING)
                .build();

        mockUser = User.builder()
                .id(UUID.randomUUID())
                .username("finance.reviewer")
                .password("password")
                .firstName("Finance")
                .lastName("Reviewer")
                .build();
    }

    // ==================== GET /api/v1/finance/offer-reviews/pending ====================

    @Test
    @WithMockUser
    void getPendingOffers_shouldReturn200WithList() throws Exception {
        given(reviewService.getPendingOffers()).willReturn(List.of(sampleReview));

        mockMvc.perform(get("/api/v1/finance/offer-reviews/pending")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].offerNumber").value("OFFER-2026-00001"))
                .andExpect(jsonPath("$[0].status").value("PENDING"));
    }

    @Test
    @WithMockUser
    void getPendingOffers_emptyList_shouldReturn200() throws Exception {
        given(reviewService.getPendingOffers()).willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/finance/offer-reviews/pending")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @WithMockUser
    void getPendingOffers_serviceThrowsException_shouldReturn500() throws Exception {
        given(reviewService.getPendingOffers())
                .willThrow(new RuntimeException("Database error"));

        mockMvc.perform(get("/api/v1/finance/offer-reviews/pending")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/finance/offer-reviews ====================

    @Test
    @WithMockUser
    void getAllReviews_shouldReturn200WithList() throws Exception {
        OfferFinancialReviewResponseDTO approvedReview = OfferFinancialReviewResponseDTO.builder()
                .id(UUID.randomUUID())
                .offerId(UUID.randomUUID())
                .offerNumber("OFFER-2026-00002")
                .status(FinanceReviewStatus.APPROVED)
                .build();

        given(reviewService.getAllReviews()).willReturn(List.of(sampleReview, approvedReview));

        mockMvc.perform(get("/api/v1/finance/offer-reviews")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    @WithMockUser
    void getAllReviews_emptyList_shouldReturn200() throws Exception {
        given(reviewService.getAllReviews()).willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/finance/offer-reviews")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @WithMockUser
    void getAllReviews_serviceThrowsException_shouldReturn500() throws Exception {
        given(reviewService.getAllReviews())
                .willThrow(new RuntimeException("Unexpected failure"));

        mockMvc.perform(get("/api/v1/finance/offer-reviews")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/finance/offer-reviews/status/{status} ====================

    @Test
    @WithMockUser
    void getReviewsByStatus_approvedStatus_shouldReturn200WithList() throws Exception {
        OfferFinancialReviewResponseDTO approvedReview = OfferFinancialReviewResponseDTO.builder()
                .id(UUID.randomUUID())
                .offerId(UUID.randomUUID())
                .offerNumber("OFFER-2026-00003")
                .status(FinanceReviewStatus.APPROVED)
                .build();

        given(reviewService.getReviewsByStatus(FinanceReviewStatus.APPROVED))
                .willReturn(List.of(approvedReview));

        mockMvc.perform(get("/api/v1/finance/offer-reviews/status/{status}", "APPROVED")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].status").value("APPROVED"));
    }

    @Test
    @WithMockUser
    void getReviewsByStatus_rejectedStatus_shouldReturn200WithList() throws Exception {
        OfferFinancialReviewResponseDTO rejectedReview = OfferFinancialReviewResponseDTO.builder()
                .id(UUID.randomUUID())
                .offerId(UUID.randomUUID())
                .offerNumber("OFFER-2026-00004")
                .status(FinanceReviewStatus.REJECTED)
                .rejectionReason("Budget exceeded")
                .build();

        given(reviewService.getReviewsByStatus(FinanceReviewStatus.REJECTED))
                .willReturn(List.of(rejectedReview));

        mockMvc.perform(get("/api/v1/finance/offer-reviews/status/{status}", "REJECTED")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].status").value("REJECTED"));
    }

    @Test
    @WithMockUser
    void getReviewsByStatus_invalidStatus_shouldReturn400() throws Exception {
        // "INVALID_STATUS" cannot be parsed by FinanceReviewStatus.valueOf(), causing IllegalArgumentException
        mockMvc.perform(get("/api/v1/finance/offer-reviews/status/{status}", "INVALID_STATUS")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }

    // ==================== GET /api/v1/finance/offer-reviews/{id} ====================

    @Test
    @WithMockUser
    void getReviewById_existingReview_shouldReturn200() throws Exception {
        given(reviewService.getReviewById(reviewId)).willReturn(sampleReview);

        mockMvc.perform(get("/api/v1/finance/offer-reviews/{id}", reviewId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(reviewId.toString()))
                .andExpect(jsonPath("$.offerNumber").value("OFFER-2026-00001"));
    }

    @Test
    @WithMockUser
    void getReviewById_notFound_shouldReturn404() throws Exception {
        given(reviewService.getReviewById(reviewId))
                .willThrow(new RuntimeException("Review not found"));

        mockMvc.perform(get("/api/v1/finance/offer-reviews/{id}", reviewId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    // ==================== GET /api/v1/finance/offer-reviews/offer/{offerId} ====================

    @Test
    @WithMockUser
    void getReviewByOfferId_existingOffer_shouldReturn200() throws Exception {
        given(reviewService.getReviewByOfferId(offerId)).willReturn(sampleReview);

        mockMvc.perform(get("/api/v1/finance/offer-reviews/offer/{offerId}", offerId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.offerId").value(offerId.toString()));
    }

    @Test
    @WithMockUser
    void getReviewByOfferId_noReviewExists_shouldReturn404() throws Exception {
        given(reviewService.getReviewByOfferId(offerId)).willReturn(null);

        mockMvc.perform(get("/api/v1/finance/offer-reviews/offer/{offerId}", offerId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
    void getReviewByOfferId_serviceThrowsException_shouldReturn500() throws Exception {
        given(reviewService.getReviewByOfferId(offerId))
                .willThrow(new RuntimeException("Unexpected error"));

        mockMvc.perform(get("/api/v1/finance/offer-reviews/offer/{offerId}", offerId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== POST /api/v1/finance/offer-reviews/review ====================

    @Test
    @WithMockUser
    void reviewOffer_approveAction_shouldReturn200WithReview() throws Exception {
        OfferFinancialReviewResponseDTO approvedReview = OfferFinancialReviewResponseDTO.builder()
                .id(reviewId)
                .offerId(offerId)
                .offerNumber("OFFER-2026-00001")
                .status(FinanceReviewStatus.APPROVED)
                .approvalNotes("Budget verified and approved")
                .build();

        given(reviewService.reviewOffer(
                any(OfferFinancialReviewRequestDTO.class),
                any(UUID.class),
                anyString()
        )).willReturn(approvedReview);

        OfferFinancialReviewRequestDTO request = OfferFinancialReviewRequestDTO.builder()
                .offerId(offerId)
                .action("APPROVE")
                .approvalNotes("Budget verified and approved")
                .budgetCategory("Operations")
                .build();

        mockMvc.perform(post("/api/v1/finance/offer-reviews/review")
                        .with(user(mockUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    @WithMockUser
    void reviewOffer_rejectAction_shouldReturn200WithReview() throws Exception {
        OfferFinancialReviewResponseDTO rejectedReview = OfferFinancialReviewResponseDTO.builder()
                .id(reviewId)
                .offerId(offerId)
                .offerNumber("OFFER-2026-00001")
                .status(FinanceReviewStatus.REJECTED)
                .rejectionReason("Exceeds quarterly budget")
                .build();

        given(reviewService.reviewOffer(
                any(OfferFinancialReviewRequestDTO.class),
                any(UUID.class),
                anyString()
        )).willReturn(rejectedReview);

        OfferFinancialReviewRequestDTO request = OfferFinancialReviewRequestDTO.builder()
                .offerId(offerId)
                .action("REJECT")
                .rejectionReason("Exceeds quarterly budget")
                .build();

        mockMvc.perform(post("/api/v1/finance/offer-reviews/review")
                        .with(user(mockUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));
    }

    @Test
    @WithMockUser
    void reviewOffer_serviceThrowsRuntimeException_shouldReturn400() throws Exception {
        given(reviewService.reviewOffer(
                any(OfferFinancialReviewRequestDTO.class),
                any(UUID.class),
                anyString()
        )).willThrow(new RuntimeException("Offer already reviewed"));

        OfferFinancialReviewRequestDTO request = OfferFinancialReviewRequestDTO.builder()
                .offerId(offerId)
                .action("APPROVE")
                .build();

        mockMvc.perform(post("/api/v1/finance/offer-reviews/review")
                        .with(user(mockUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    void reviewOffer_serviceThrowsException_shouldReturn500() throws Exception {
        given(reviewService.reviewOffer(
                any(OfferFinancialReviewRequestDTO.class),
                any(UUID.class),
                anyString()
        )).willThrow(new Exception("Internal server error"));

        OfferFinancialReviewRequestDTO request = OfferFinancialReviewRequestDTO.builder()
                .offerId(offerId)
                .action("APPROVE")
                .build();

        mockMvc.perform(post("/api/v1/finance/offer-reviews/review")
                        .with(user(mockUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isInternalServerError());
    }

    // ==================== POST /api/v1/finance/offer-reviews/review-items ====================

    @Test
    @WithMockUser
    void reviewOfferItems_validRequest_shouldReturn200() throws Exception {
        OfferFinancialReview review = new OfferFinancialReview();

        given(reviewService.reviewOfferItems(any(ReviewOfferItemsDTO.class))).willReturn(review);

        ReviewOfferItemsDTO request = new ReviewOfferItemsDTO();
        request.setOfferId(offerId);
        request.setReviewerUserId(mockUser.getId());
        request.setReviewerName("Finance Reviewer");
        request.setBudgetCategory("Operations");
        request.setNotes("Items verified");

        mockMvc.perform(post("/api/v1/finance/offer-reviews/review-items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }
}