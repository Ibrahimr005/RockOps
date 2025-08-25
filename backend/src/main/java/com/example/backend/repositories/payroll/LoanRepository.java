
// LoanRepository.java
package com.example.backend.repositories.payroll;

import com.example.backend.models.payroll.Loan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface LoanRepository extends JpaRepository<Loan, UUID> {

    // Find loans by employee
    List<Loan> findByEmployeeIdOrderByStartDateDesc(UUID employeeId);

    // Find active loans
    List<Loan> findByStatusOrderByStartDateDesc(Loan.LoanStatus status);

    // Find active loans for an employee
    List<Loan> findByEmployeeIdAndStatusOrderByStartDateDesc(UUID employeeId, Loan.LoanStatus status);

    // Find loans with upcoming payments
    @Query("SELECT l FROM Loan l JOIN l.repaymentSchedules rs " +
            "WHERE l.status = 'ACTIVE' AND rs.dueDate <= :dueDate AND rs.status = 'PENDING'")
    List<Loan> findLoansWithUpcomingPayments(@Param("dueDate") LocalDate dueDate);

    // Get total outstanding loan balance for employee
    @Query("SELECT SUM(l.remainingBalance) FROM Loan l WHERE l.employee.id = :employeeId AND l.status = 'ACTIVE'")
    BigDecimal getTotalOutstandingBalanceByEmployee(@Param("employeeId") UUID employeeId);

    // Get total outstanding loan balance for all employees
    @Query("SELECT SUM(l.remainingBalance) FROM Loan l WHERE l.status = 'ACTIVE'")
    BigDecimal getTotalOutstandingBalance();


    // Add these new methods
    @Query("SELECT SUM(l.remainingBalance) FROM Loan l WHERE l.status = 'ACTIVE'")
    BigDecimal getTotalOutstandingAmount();

    long countByStatus(Loan.LoanStatus status);

    @Query("SELECT COALESCE(AVG(l.loanAmount), 0) FROM Loan l")
    BigDecimal getAverageLoanAmount();

    List<Loan> findByEmployeeIdAndStatus(UUID id, Loan.LoanStatus loanStatus);

    List<Loan> findByStatus(Loan.LoanStatus loanStatus);
}
