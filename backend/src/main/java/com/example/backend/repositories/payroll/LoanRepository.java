package com.example.backend.repositories.payroll;

import com.example.backend.models.payroll.Loan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for Loan entity
 */
@Repository
public interface LoanRepository extends JpaRepository<Loan, UUID> {

    /**
     * Find loan by loan number
     */
    Optional<Loan> findByLoanNumber(String loanNumber);

    /**
     * Find all loans for a specific employee
     */
    List<Loan> findByEmployeeId(UUID employeeId);

    /**
     * Find loans for a specific employee by status
     */
    List<Loan> findByEmployeeIdAndStatus(UUID employeeId, Loan.LoanStatus status);

    /**
     * Find active loans for a specific employee
     */
    @Query("SELECT l FROM Loan l WHERE l.employee.id = :employeeId " +
            "AND l.status IN ('APPROVED', 'ACTIVE')")
    List<Loan> findActiveLoansForEmployee(@Param("employeeId") UUID employeeId);

    /**
     * Find pending loans for a specific employee
     */
    @Query("SELECT l FROM Loan l WHERE l.employee.id = :employeeId " +
            "AND l.status = 'PENDING'")
    List<Loan> findPendingLoansForEmployee(@Param("employeeId") UUID employeeId);

    /**
     * Find all loans by status
     */
    List<Loan> findByStatus(Loan.LoanStatus status);

    /**
     * Find loans within date range
     */
    @Query("SELECT l FROM Loan l WHERE l.loanDate BETWEEN :startDate AND :endDate")
    List<Loan> findByLoanDateBetween(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    /**
     * Find all active loans (for payroll deduction calculation)
     */
    @Query("SELECT l FROM Loan l WHERE l.status IN ('APPROVED', 'ACTIVE')")
    List<Loan> findAllActiveLoans();

    /**
     * Check if employee has pending loans
     */
    @Query("SELECT COUNT(l) > 0 FROM Loan l WHERE l.employee.id = :employeeId " +
            "AND l.status = 'PENDING'")
    boolean hasPendingLoans(@Param("employeeId") UUID employeeId);

    /**
     * Check if employee has active loans
     */
    @Query("SELECT COUNT(l) > 0 FROM Loan l WHERE l.employee.id = :employeeId " +
            "AND l.status IN ('APPROVED', 'ACTIVE')")
    boolean hasActiveLoans(@Param("employeeId") UUID employeeId);

    /**
     * Count total loans for employee
     */
    long countByEmployeeId(UUID employeeId);

    /**
     * Find loans requiring payment (for payroll integration)
     */
    @Query("SELECT l FROM Loan l WHERE l.status = 'ACTIVE' " +
            "AND l.remainingBalance > 0 " +
            "AND l.firstPaymentDate <= :currentDate")
    List<Loan> findLoansRequiringPayment(@Param("currentDate") LocalDate currentDate);

    /**
     * Get max loan number sequence for a given year prefix
     */
    @Query("SELECT MAX(CAST(SUBSTRING(l.loanNumber, 11) AS long)) FROM Loan l " +
            "WHERE l.loanNumber LIKE :yearPrefix")
    Long getMaxLoanNumberSequence(@Param("yearPrefix") String yearPrefix);

    /**
     * Check if loan number exists
     */
    boolean existsByLoanNumber(String loanNumber);

    /**
     * Find loans for a specific employee by multiple statuses
     */
    List<Loan> findByEmployeeIdAndStatusIn(UUID employeeId, List<Loan.LoanStatus> statuses);

    /**
     * Find IDs of active loans for a specific employee
     */
    @Query("SELECT l.id FROM Loan l WHERE l.employee.id = :employeeId " +
            "AND l.status IN ('DISBURSED', 'ACTIVE') " +
            "AND l.remainingBalance > 0")
    List<UUID> findActiveEmployeeLoanIds(@Param("employeeId") UUID employeeId);
}