package com.example.backend.repositories.finance.loans;

import com.example.backend.models.finance.loans.CompanyLoan;
import com.example.backend.models.finance.loans.enums.CompanyLoanStatus;
import com.example.backend.models.finance.loans.enums.LoanType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CompanyLoanRepository extends JpaRepository<CompanyLoan, UUID> {

    // Find by loan number
    Optional<CompanyLoan> findByLoanNumber(String loanNumber);

    // Find by financial institution
    List<CompanyLoan> findByFinancialInstitutionId(UUID institutionId);

    // Find by status
    List<CompanyLoan> findByStatus(CompanyLoanStatus status);

    // Find by loan type
    List<CompanyLoan> findByLoanType(LoanType loanType);

    // Find by status and institution
    List<CompanyLoan> findByStatusAndFinancialInstitutionId(CompanyLoanStatus status, UUID institutionId);

    // Find active loans
    List<CompanyLoan> findByStatusOrderByMaturityDateAsc(CompanyLoanStatus status);

    // Find loans maturing within date range
    List<CompanyLoan> findByMaturityDateBetween(LocalDate startDate, LocalDate endDate);

    // Find loans maturing soon (next X days)
    @Query("SELECT cl FROM CompanyLoan cl WHERE cl.status = 'ACTIVE' " +
            "AND cl.maturityDate BETWEEN :today AND :futureDate ORDER BY cl.maturityDate ASC")
    List<CompanyLoan> findLoansMaturingSoon(@Param("today") LocalDate today,
                                            @Param("futureDate") LocalDate futureDate);

    // Find loans by disbursement date range
    List<CompanyLoan> findByDisbursementDateBetween(LocalDate startDate, LocalDate endDate);

    // Check if loan number exists
    boolean existsByLoanNumber(String loanNumber);

    // Count by status
    long countByStatus(CompanyLoanStatus status);

    // Get total principal by status
    @Query("SELECT COALESCE(SUM(cl.principalAmount), 0) FROM CompanyLoan cl WHERE cl.status = :status")
    BigDecimal getTotalPrincipalByStatus(@Param("status") CompanyLoanStatus status);

    // Get total remaining principal for active loans
    @Query("SELECT COALESCE(SUM(cl.remainingPrincipal), 0) FROM CompanyLoan cl WHERE cl.status = 'ACTIVE'")
    BigDecimal getTotalOutstandingPrincipal();

    // Get total interest paid
    @Query("SELECT COALESCE(SUM(cl.totalInterestPaid), 0) FROM CompanyLoan cl")
    BigDecimal getTotalInterestPaid();

    // Get loans with overdue installments
    @Query("SELECT DISTINCT cl FROM CompanyLoan cl " +
            "JOIN cl.installments i " +
            "WHERE cl.status = 'ACTIVE' AND i.status != 'PAID' AND i.dueDate < :today")
    List<CompanyLoan> findLoansWithOverdueInstallments(@Param("today") LocalDate today);

    // Dashboard summary query
    @Query("SELECT cl.status, COUNT(cl), COALESCE(SUM(cl.principalAmount), 0), COALESCE(SUM(cl.remainingPrincipal), 0) " +
            "FROM CompanyLoan cl GROUP BY cl.status")
    List<Object[]> getLoanSummaryByStatus();

    // Find all with installments eagerly loaded
    @Query("SELECT DISTINCT cl FROM CompanyLoan cl LEFT JOIN FETCH cl.installments WHERE cl.id = :id")
    Optional<CompanyLoan> findByIdWithInstallments(@Param("id") UUID id);

    // Find all active with installments
    @Query("SELECT DISTINCT cl FROM CompanyLoan cl LEFT JOIN FETCH cl.installments " +
            "WHERE cl.status = 'ACTIVE' ORDER BY cl.maturityDate ASC")
    List<CompanyLoan> findActiveLoansWithInstallments();
}