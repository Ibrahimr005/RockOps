package com.example.backend.repositories.payroll;

import com.example.backend.models.payroll.RepaymentSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface RepaymentScheduleRepository extends JpaRepository<RepaymentSchedule, UUID> {

    /**
     * ENHANCED: Find repayments by loan ID and due date range and status
     * Critical for payslip-only loan deductions
     */
    @Query("SELECT rs FROM RepaymentSchedule rs " +
            "WHERE rs.loan.id = :loanId " +
            "AND rs.dueDate BETWEEN :startDate AND :endDate " +
            "AND rs.status = :status " +
            "ORDER BY rs.dueDate ASC")
    List<RepaymentSchedule> findByLoanIdAndDueDateBetweenAndStatus(@Param("loanId") UUID loanId,
                                                                   @Param("startDate") LocalDate startDate,
                                                                   @Param("endDate") LocalDate endDate,
                                                                   @Param("status") RepaymentSchedule.RepaymentStatus status);

    /**
     * NEW: Find repayments due within payslip period (any loan, any employee)
     */
    @Query("SELECT rs FROM RepaymentSchedule rs " +
            "WHERE rs.dueDate BETWEEN :startDate AND :endDate " +
            "AND rs.status = :status " +
            "ORDER BY rs.dueDate ASC, rs.loan.employee.id ASC")
    List<RepaymentSchedule> findByDueDateBetweenAndStatus(@Param("startDate") LocalDate startDate,
                                                          @Param("endDate") LocalDate endDate,
                                                          @Param("status") RepaymentSchedule.RepaymentStatus status);

    /**
     * ENHANCED: Find due repayments for employee within exact payslip period
     */
    @Query("SELECT rs FROM RepaymentSchedule rs " +
            "WHERE rs.loan.employee.id = :employeeId " +
            "AND rs.dueDate BETWEEN :payslipStart AND :payslipEnd " +
            "AND rs.status = :status " +
            "ORDER BY rs.dueDate ASC")
    List<RepaymentSchedule> findDueRepaymentsForEmployeeInPayslipPeriod(@Param("employeeId") UUID employeeId,
                                                                        @Param("payslipStart") LocalDate payslipStart,
                                                                        @Param("payslipEnd") LocalDate payslipEnd,
                                                                        @Param("status") RepaymentSchedule.RepaymentStatus status);

    /**
     * Find all repayments for a specific loan
     */
    List<RepaymentSchedule> findByLoanIdOrderByInstallmentNumberAsc(UUID loanId);

    /**
     * Find pending repayments for a loan
     */
    @Query("SELECT rs FROM RepaymentSchedule rs " +
            "WHERE rs.loan.id = :loanId " +
            "AND rs.status = 'PENDING' " +
            "ORDER BY rs.installmentNumber ASC")
    List<RepaymentSchedule> findPendingRepaymentsByLoan(@Param("loanId") UUID loanId);

    /**
     * Find overdue repayments (due date passed but still pending)
     */
    @Query("SELECT rs FROM RepaymentSchedule rs " +
            "WHERE rs.dueDate < :currentDate " +
            "AND rs.status = 'PENDING' " +
            "ORDER BY rs.dueDate ASC")
    List<RepaymentSchedule> findOverdueRepayments(@Param("currentDate") LocalDate currentDate);

    /**
     * Find overdue repayments for a specific employee
     */
    @Query("SELECT rs FROM RepaymentSchedule rs " +
            "WHERE rs.loan.employee.id = :employeeId " +
            "AND rs.dueDate < :currentDate " +
            "AND rs.status = 'PENDING' " +
            "ORDER BY rs.dueDate ASC")
    List<RepaymentSchedule> findOverdueRepaymentsByEmployee(@Param("employeeId") UUID employeeId,
                                                            @Param("currentDate") LocalDate currentDate);

    /**
     * NEW: Find repayments processed in a specific payslip
     */
    @Query("SELECT rs FROM RepaymentSchedule rs " +
            "WHERE rs.payslipId = :payslipId " +
            "ORDER BY rs.installmentNumber ASC")
    List<RepaymentSchedule> findByPayslipId(@Param("payslipId") UUID payslipId);

    /**
     * Find upcoming repayments (due within next N days)
     */
    @Query("SELECT rs FROM RepaymentSchedule rs " +
            "WHERE rs.dueDate BETWEEN :fromDate AND :toDate " +
            "AND rs.status = 'PENDING' " +
            "ORDER BY rs.dueDate ASC")
    List<RepaymentSchedule> findUpcomingRepayments(@Param("fromDate") LocalDate fromDate,
                                                   @Param("toDate") LocalDate toDate);

    /**
     * Get next due repayment for a loan
     */
    @Query("SELECT rs FROM RepaymentSchedule rs " +
            "WHERE rs.loan.id = :loanId " +
            "AND rs.status = 'PENDING' " +
            "ORDER BY rs.installmentNumber ASC")
    List<RepaymentSchedule> findNextDueRepayment(@Param("loanId") UUID loanId);

    /**
     * Count pending repayments for a loan
     */
    @Query("SELECT COUNT(rs) FROM RepaymentSchedule rs " +
            "WHERE rs.loan.id = :loanId " +
            "AND rs.status = 'PENDING'")
    long countPendingRepaymentsByLoan(@Param("loanId") UUID loanId);

    /**
     * Count paid repayments for a loan
     */
    @Query("SELECT COUNT(rs) FROM RepaymentSchedule rs " +
            "WHERE rs.loan.id = :loanId " +
            "AND rs.status = 'PAID'")
    long countPaidRepaymentsByLoan(@Param("loanId") UUID loanId);

    /**
     * Get total scheduled amount for pending repayments
     */
    @Query("SELECT COALESCE(SUM(rs.scheduledAmount), 0) FROM RepaymentSchedule rs " +
            "WHERE rs.loan.id = :loanId " +
            "AND rs.status = 'PENDING'")
    BigDecimal getTotalPendingAmount(@Param("loanId") UUID loanId);

    /**
     * Get total paid amount for a loan
     */
    @Query("SELECT COALESCE(SUM(rs.actualAmount), 0) FROM RepaymentSchedule rs " +
            "WHERE rs.loan.id = :loanId " +
            "AND rs.status = 'PAID'")
    BigDecimal getTotalPaidAmount(@Param("loanId") UUID loanId);

    /**
     * NEW: Find repayments by amount (for matching deductions to repayments)
     */
    @Query("SELECT rs FROM RepaymentSchedule rs " +
            "WHERE rs.scheduledAmount = :amount " +
            "AND rs.status = 'PENDING' " +
            "AND rs.dueDate BETWEEN :startDate AND :endDate")
    List<RepaymentSchedule> findByScheduledAmountAndPeriod(@Param("amount") BigDecimal amount,
                                                           @Param("startDate") LocalDate startDate,
                                                           @Param("endDate") LocalDate endDate);

    /**
     * Find repayments for employee loans
     */
    @Query("SELECT rs FROM RepaymentSchedule rs " +
            "WHERE rs.loan.employee.id = :employeeId " +
            "ORDER BY rs.dueDate DESC")
    List<RepaymentSchedule> findByEmployeeId(@Param("employeeId") UUID employeeId);

    /**
     * Find repayments by date range
     */
    @Query("SELECT rs FROM RepaymentSchedule rs " +
            "WHERE rs.dueDate BETWEEN :startDate AND :endDate " +
            "ORDER BY rs.dueDate ASC")
    List<RepaymentSchedule> findByDueDateBetween(@Param("startDate") LocalDate startDate,
                                                 @Param("endDate") LocalDate endDate);

    /**
     * Find repayments paid in a date range
     */
    @Query("SELECT rs FROM RepaymentSchedule rs " +
            "WHERE rs.paidDate BETWEEN :startDate AND :endDate " +
            "AND rs.status = 'PAID' " +
            "ORDER BY rs.paidDate ASC")
    List<RepaymentSchedule> findByPaidDateBetween(@Param("startDate") LocalDate startDate,
                                                  @Param("endDate") LocalDate endDate);

    /**
     * Get repayment statistics for reporting
     */
    @Query("SELECT rs.status, COUNT(rs), COALESCE(SUM(rs.scheduledAmount), 0) " +
            "FROM RepaymentSchedule rs " +
            "WHERE rs.dueDate BETWEEN :startDate AND :endDate " +
            "GROUP BY rs.status")
    List<Object[]> getRepaymentStatistics(@Param("startDate") LocalDate startDate,
                                          @Param("endDate") LocalDate endDate);

    /**
     * NEW: Find repayments that should be included in upcoming payslip
     * Based on payslip generation date and period
     */
    @Query("SELECT rs FROM RepaymentSchedule rs " +
            "WHERE rs.dueDate >= :payslipStart " +
            "AND rs.dueDate <= :payslipEnd " +
            "AND rs.status = 'PENDING' " +
            "AND rs.loan.status = 'ACTIVE' " +
            "ORDER BY rs.loan.employee.id, rs.dueDate ASC")
    List<RepaymentSchedule> findRepaymentsForPayslipPeriod(@Param("payslipStart") LocalDate payslipStart,
                                                           @Param("payslipEnd") LocalDate payslipEnd);

    /**
     * NEW: Check if employee has any repayments due in specific period
     */
    @Query("SELECT CASE WHEN COUNT(rs) > 0 THEN true ELSE false END " +
            "FROM RepaymentSchedule rs " +
            "WHERE rs.loan.employee.id = :employeeId " +
            "AND rs.dueDate BETWEEN :startDate AND :endDate " +
            "AND rs.status = 'PENDING'")
    boolean hasRepaymentsDueInPeriod(@Param("employeeId") UUID employeeId,
                                     @Param("startDate") LocalDate startDate,
                                     @Param("endDate") LocalDate endDate);

    /**
     * NEW: Get total scheduled repayment amount for employee in period
     */
    @Query("SELECT COALESCE(SUM(rs.scheduledAmount), 0) " +
            "FROM RepaymentSchedule rs " +
            "WHERE rs.loan.employee.id = :employeeId " +
            "AND rs.dueDate BETWEEN :startDate AND :endDate " +
            "AND rs.status = 'PENDING'")
    BigDecimal getTotalScheduledAmountForEmployeeInPeriod(@Param("employeeId") UUID employeeId,
                                                          @Param("startDate") LocalDate startDate,
                                                          @Param("endDate") LocalDate endDate);

    /**
     * Find the most recent repayment for a loan
     */
    @Query("SELECT rs FROM RepaymentSchedule rs " +
            "WHERE rs.loan.id = :loanId " +
            "ORDER BY rs.installmentNumber DESC")
    List<RepaymentSchedule> findMostRecentRepayment(@Param("loanId") UUID loanId);

    /**
     * Update repayment status
     */
    @Query("UPDATE RepaymentSchedule rs " +
            "SET rs.status = :status " +
            "WHERE rs.id = :repaymentId")
    void updateRepaymentStatus(@Param("repaymentId") UUID repaymentId,
                               @Param("status") RepaymentSchedule.ScheduleStatus status);

    /**
     * NEW: Mark repayments as processed for payslip
     */
    @Query("UPDATE RepaymentSchedule rs " +
            "SET rs.status = 'PAID', rs.paidDate = :paidDate, rs.payslipId = :payslipId, rs.actualAmount = rs.scheduledAmount " +
            "WHERE rs.id IN :repaymentIds")
    void markRepaymentsAsPaid(@Param("repaymentIds") List<UUID> repaymentIds,
                              @Param("paidDate") LocalDate paidDate,
                              @Param("payslipId") UUID payslipId);

    /**
     * Find repayments with discrepancies (actual amount != scheduled amount)
     */
    @Query("SELECT rs FROM RepaymentSchedule rs " +
            "WHERE rs.status = 'PAID' " +
            "AND rs.actualAmount != rs.scheduledAmount " +
            "ORDER BY rs.paidDate DESC")
    List<RepaymentSchedule> findRepaymentsWithDiscrepancies();

    /**
     * Get average payment amount by loan
     */
    @Query("SELECT rs.loan.id, AVG(rs.actualAmount) " +
            "FROM RepaymentSchedule rs " +
            "WHERE rs.status = 'PAID' " +
            "GROUP BY rs.loan.id")
    List<Object[]> getAveragePaymentByLoan();

    /**
     * Find employees with overdue repayments count
     */
    @Query("SELECT rs.loan.employee.id, rs.loan.employee.firstName, rs.loan.employee.lastName, COUNT(rs) " +
            "FROM RepaymentSchedule rs " +
            "WHERE rs.status = 'PENDING' " +
            "AND rs.dueDate < :currentDate " +
            "GROUP BY rs.loan.employee.id, rs.loan.employee.firstName, rs.loan.employee.lastName " +
            "ORDER BY COUNT(rs) DESC")
    List<Object[]> findEmployeesWithOverdueRepayments(@Param("currentDate") LocalDate currentDate);

    /**
     * Delete repayment schedules for a specific loan
     */
    void deleteByLoanId(UUID loanId);
}