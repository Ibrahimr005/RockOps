package com.example.backend.repositories.finance.loans;

import com.example.backend.models.finance.loans.LoanInstallment;
import com.example.backend.models.finance.loans.enums.LoanInstallmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LoanInstallmentRepository extends JpaRepository<LoanInstallment, UUID> {

    // Find by loan ID
    List<LoanInstallment> findByCompanyLoanIdOrderByInstallmentNumberAsc(UUID loanId);

    // Find by loan ID and status
    List<LoanInstallment> findByCompanyLoanIdAndStatus(UUID loanId, LoanInstallmentStatus status);

    // Find by status
    List<LoanInstallment> findByStatus(LoanInstallmentStatus status);

    // Find by payment request ID
    Optional<LoanInstallment> findByPaymentRequestId(UUID paymentRequestId);

    // Find by due date range
    List<LoanInstallment> findByDueDateBetween(LocalDate startDate, LocalDate endDate);

    // Find upcoming installments (due within X days)
    @Query("SELECT i FROM LoanInstallment i " +
            "WHERE i.status NOT IN ('PAID') " +
            "AND i.dueDate BETWEEN :today AND :futureDate " +
            "ORDER BY i.dueDate ASC")
    List<LoanInstallment> findUpcomingInstallments(@Param("today") LocalDate today,
                                                   @Param("futureDate") LocalDate futureDate);

    // Find overdue installments
    @Query("SELECT i FROM LoanInstallment i " +
            "WHERE i.status NOT IN ('PAID') AND i.dueDate < :today " +
            "ORDER BY i.dueDate ASC")
    List<LoanInstallment> findOverdueInstallments(@Param("today") LocalDate today);

    // Find installments without payment request (need to generate)
    @Query("SELECT i FROM LoanInstallment i " +
            "WHERE i.paymentRequestId IS NULL " +
            "AND i.status = 'PENDING' " +
            "AND i.dueDate <= :cutoffDate " +
            "ORDER BY i.dueDate ASC")
    List<LoanInstallment> findInstallmentsNeedingPaymentRequest(@Param("cutoffDate") LocalDate cutoffDate);

    // Count by status
    long countByStatus(LoanInstallmentStatus status);

    // Count overdue
    @Query("SELECT COUNT(i) FROM LoanInstallment i " +
            "WHERE i.status NOT IN ('PAID') AND i.dueDate < :today")
    long countOverdueInstallments(@Param("today") LocalDate today);

    // Get total amount due (unpaid installments)
    @Query("SELECT COALESCE(SUM(i.remainingAmount), 0) FROM LoanInstallment i " +
            "WHERE i.status NOT IN ('PAID')")
    BigDecimal getTotalAmountDue();

    // Get total overdue amount
    @Query("SELECT COALESCE(SUM(i.remainingAmount), 0) FROM LoanInstallment i " +
            "WHERE i.status NOT IN ('PAID') AND i.dueDate < :today")
    BigDecimal getTotalOverdueAmount(@Param("today") LocalDate today);

    // Update status to overdue for past due installments
    @Modifying
    @Query("UPDATE LoanInstallment i SET i.status = 'OVERDUE', i.updatedAt = CURRENT_TIMESTAMP " +
            "WHERE i.status = 'PENDING' AND i.dueDate < :today")
    int markOverdueInstallments(@Param("today") LocalDate today);

    // Find next unpaid installment for a loan
    @Query("SELECT i FROM LoanInstallment i " +
            "WHERE i.companyLoan.id = :loanId AND i.status NOT IN ('PAID') " +
            "ORDER BY i.dueDate ASC")
    List<LoanInstallment> findNextUnpaidInstallments(@Param("loanId") UUID loanId);

    // Get installment by loan and number
    Optional<LoanInstallment> findByCompanyLoanIdAndInstallmentNumber(UUID loanId, Integer installmentNumber);

    // Dashboard: Get installments due this month
    @Query("SELECT i FROM LoanInstallment i " +
            "WHERE i.status NOT IN ('PAID') " +
            "AND YEAR(i.dueDate) = :year AND MONTH(i.dueDate) = :month " +
            "ORDER BY i.dueDate ASC")
    List<LoanInstallment> findInstallmentsDueInMonth(@Param("year") int year, @Param("month") int month);
}