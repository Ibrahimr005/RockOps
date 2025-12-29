package com.example.backend.repositories.finance.accountsPayable;

import com.example.backend.models.finance.accountsPayable.OfferFinancialReview;
import com.example.backend.models.finance.accountsPayable.enums.FinanceReviewStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OfferFinancialReviewRepository extends JpaRepository<OfferFinancialReview, UUID> {

    // Find by offer ID
    Optional<OfferFinancialReview> findByOfferId(UUID offerId);

    // Find by maintenance record ID
    Optional<OfferFinancialReview> findByMaintenanceRecordId(UUID maintenanceRecordId);

    // Find by status
    List<OfferFinancialReview> findByStatus(FinanceReviewStatus status);

    // Find by reviewer
    List<OfferFinancialReview> findByReviewedByUserId(UUID userId);

    // Find by date range
    List<OfferFinancialReview> findByReviewedAtBetween(LocalDateTime startDate, LocalDateTime endDate);

    // Find by budget category
    List<OfferFinancialReview> findByBudgetCategory(String budgetCategory);

    // Find by department
    List<OfferFinancialReview> findByDepartment(String department);

    // Check if offer has been reviewed
    boolean existsByOfferId(UUID offerId);

    // Custom query: Get all reviews with offer details
    @Query("SELECT r FROM OfferFinancialReview r JOIN FETCH r.offer WHERE r.status = :status")
    List<OfferFinancialReview> findByStatusWithOffer(@Param("status") FinanceReviewStatus status);

    // Get reviews by status and date range
    @Query("SELECT r FROM OfferFinancialReview r WHERE r.status = :status AND r.reviewedAt BETWEEN :startDate AND :endDate")
    List<OfferFinancialReview> findByStatusAndDateRange(
            @Param("status") FinanceReviewStatus status,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );
}