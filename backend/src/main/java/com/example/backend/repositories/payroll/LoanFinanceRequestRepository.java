package com.example.backend.repositories.payroll;

import com.example.backend.models.payroll.LoanFinanceRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for LoanFinanceRequest entity
 */
@Repository
public interface LoanFinanceRequestRepository extends JpaRepository<LoanFinanceRequest, UUID> {

    /**
     * Find by request number
     */
    Optional<LoanFinanceRequest> findByRequestNumber(String requestNumber);

    /**
     * Find by loan ID
     */
    Optional<LoanFinanceRequest> findByLoanId(UUID loanId);

    /**
     * Find by loan number
     */
    Optional<LoanFinanceRequest> findByLoanNumber(String loanNumber);

    /**
     * Find by status
     */
    List<LoanFinanceRequest> findByStatusOrderByRequestedAtDesc(LoanFinanceRequest.RequestStatus status);

    /**
     * Find pending requests
     */
    @Query("SELECT lfr FROM LoanFinanceRequest lfr " +
           "WHERE lfr.status = 'PENDING' " +
           "ORDER BY lfr.requestedAt ASC")
    List<LoanFinanceRequest> findPendingRequests();

    /**
     * Find requests under review
     */
    @Query("SELECT lfr FROM LoanFinanceRequest lfr " +
           "WHERE lfr.status = 'UNDER_REVIEW' " +
           "ORDER BY lfr.reviewedAt ASC")
    List<LoanFinanceRequest> findRequestsUnderReview();

    /**
     * Find approved requests pending disbursement
     */
    @Query("SELECT lfr FROM LoanFinanceRequest lfr " +
           "WHERE lfr.status IN ('APPROVED', 'DISBURSEMENT_PENDING') " +
           "ORDER BY lfr.approvedAt ASC")
    List<LoanFinanceRequest> findApprovedPendingDisbursement();

    /**
     * Find by employee ID
     */
    List<LoanFinanceRequest> findByEmployeeIdOrderByRequestedAtDesc(UUID employeeId);

    /**
     * Find requests by reviewer
     */
    List<LoanFinanceRequest> findByReviewedByUserIdOrderByReviewedAtDesc(UUID reviewerUserId);

    /**
     * Find requests in date range
     */
    @Query("SELECT lfr FROM LoanFinanceRequest lfr " +
           "WHERE lfr.requestedAt >= :startDate AND lfr.requestedAt <= :endDate " +
           "ORDER BY lfr.requestedAt DESC")
    List<LoanFinanceRequest> findByDateRange(
        @Param("startDate") java.time.LocalDateTime startDate,
        @Param("endDate") java.time.LocalDateTime endDate
    );

    /**
     * Count by status
     */
    long countByStatus(LoanFinanceRequest.RequestStatus status);

    /**
     * Sum loan amounts by status
     */
    @Query("SELECT COALESCE(SUM(lfr.loanAmount), 0) FROM LoanFinanceRequest lfr " +
           "WHERE lfr.status = :status")
    java.math.BigDecimal sumLoanAmountByStatus(@Param("status") LoanFinanceRequest.RequestStatus status);

    /**
     * Find active requests for Finance dashboard
     */
    @Query("SELECT lfr FROM LoanFinanceRequest lfr " +
           "WHERE lfr.status IN ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'DISBURSEMENT_PENDING') " +
           "ORDER BY CASE " +
           "  WHEN lfr.status = 'PENDING' THEN 1 " +
           "  WHEN lfr.status = 'UNDER_REVIEW' THEN 2 " +
           "  WHEN lfr.status = 'APPROVED' THEN 3 " +
           "  WHEN lfr.status = 'DISBURSEMENT_PENDING' THEN 4 " +
           "  ELSE 5 END, lfr.requestedAt ASC")
    List<LoanFinanceRequest> findActiveRequestsForDashboard();

    /**
     * Get max sequence number for request number generation
     */
    @Query("SELECT MAX(CAST(SUBSTRING(lfr.requestNumber, 10) AS long)) FROM LoanFinanceRequest lfr " +
           "WHERE lfr.requestNumber LIKE :yearPrefix")
    Long getMaxRequestNumberSequence(@Param("yearPrefix") String yearPrefix);

    /**
     * Check if loan already has a finance request
     */
    boolean existsByLoanId(UUID loanId);

    /**
     * Find disbursed requests in date range (for reporting)
     */
    @Query("SELECT lfr FROM LoanFinanceRequest lfr " +
           "WHERE lfr.status = 'DISBURSED' " +
           "AND lfr.disbursedAt >= :startDate AND lfr.disbursedAt <= :endDate " +
           "ORDER BY lfr.disbursedAt DESC")
    List<LoanFinanceRequest> findDisbursedInDateRange(
        @Param("startDate") java.time.LocalDateTime startDate,
        @Param("endDate") java.time.LocalDateTime endDate
    );
}
