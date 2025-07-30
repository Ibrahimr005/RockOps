package com.example.backend.repositories.payroll;

import com.example.backend.models.payroll.RepaymentSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface RepaymentScheduleRepository extends JpaRepository<RepaymentSchedule, UUID> {

    // Find repayment schedules by loan
    List<RepaymentSchedule> findByLoanIdOrderByInstallmentNumberAsc(UUID loanId);

    // Find repayment schedules by loan and status
    List<RepaymentSchedule> findByLoanIdAndStatusOrderByInstallmentNumberAsc(UUID loanId, RepaymentSchedule.RepaymentStatus status);

    // MISSING METHOD: Delete repayment schedules by loan ID
    @Modifying
    @Transactional
    @Query("DELETE FROM RepaymentSchedule rs WHERE rs.loan.id = :loanId")
    void deleteByLoanId(@Param("loanId") UUID loanId);

    // Find overdue repayments
    @Query("SELECT rs FROM RepaymentSchedule rs WHERE rs.dueDate < :currentDate AND rs.status = 'PENDING'")
    List<RepaymentSchedule> findOverdueRepayments(@Param("currentDate") LocalDate currentDate);

    // Find due repayments for an employee within a date range
    @Query("SELECT rs FROM RepaymentSchedule rs " +
            "WHERE rs.loan.employee.id = :employeeId " +
            "AND rs.dueDate >= :startDate " +
            "AND rs.dueDate <= :endDate " +
            "AND rs.status = 'PENDING' " +
            "ORDER BY rs.dueDate ASC")
    List<RepaymentSchedule> findDueRepaymentsForEmployee(
            @Param("employeeId") UUID employeeId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    // Find repayments due within a specific date range
    @Query("SELECT rs FROM RepaymentSchedule rs " +
            "WHERE rs.dueDate >= :startDate " +
            "AND rs.dueDate <= :endDate " +
            "AND rs.status = 'PENDING' " +
            "ORDER BY rs.dueDate ASC")
    List<RepaymentSchedule> findRepaymentsDueBetween(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    // Find repayments due today
    @Query("SELECT rs FROM RepaymentSchedule rs " +
            "WHERE rs.dueDate = :today " +
            "AND rs.status = 'PENDING' " +
            "ORDER BY rs.loan.employee.firstName ASC")
    List<RepaymentSchedule> findRepaymentsDueToday(@Param("today") LocalDate today);

    // Find upcoming repayments (next 7 days)
    @Query("SELECT rs FROM RepaymentSchedule rs " +
            "WHERE rs.dueDate > :today " +
            "AND rs.dueDate <= :endDate " +
            "AND rs.status = 'PENDING' " +
            "ORDER BY rs.dueDate ASC")
    List<RepaymentSchedule> findUpcomingRepayments(
            @Param("today") LocalDate today,
            @Param("endDate") LocalDate endDate);

    // Count pending repayments for a loan
    @Query("SELECT COUNT(rs) FROM RepaymentSchedule rs " +
            "WHERE rs.loan.id = :loanId " +
            "AND rs.status = 'PENDING'")
    long countPendingRepaymentsByLoan(@Param("loanId") UUID loanId);

    // Count paid repayments for a loan
    @Query("SELECT COUNT(rs) FROM RepaymentSchedule rs " +
            "WHERE rs.loan.id = :loanId " +
            "AND rs.status = 'PAID'")
    long countPaidRepaymentsByLoan(@Param("loanId") UUID loanId);

    // Get total scheduled amount for a loan
    @Query("SELECT COALESCE(SUM(rs.scheduledAmount), 0) FROM RepaymentSchedule rs " +
            "WHERE rs.loan.id = :loanId")
    java.math.BigDecimal getTotalScheduledAmountByLoan(@Param("loanId") UUID loanId);

    // Get total paid amount for a loan
    @Query("SELECT COALESCE(SUM(rs.paidAmount), 0) FROM RepaymentSchedule rs " +
            "WHERE rs.loan.id = :loanId " +
            "AND rs.status = 'PAID'")
    java.math.BigDecimal getTotalPaidAmountByLoan(@Param("loanId") UUID loanId);

    // Find next due repayment for a loan
    @Query("SELECT rs FROM RepaymentSchedule rs " +
            "WHERE rs.loan.id = :loanId " +
            "AND rs.status = 'PENDING' " +
            "ORDER BY rs.installmentNumber ASC " +
            "LIMIT 1")
    RepaymentSchedule findNextDueRepaymentByLoan(@Param("loanId") UUID loanId);

    // Find repayments by employee and date range
    @Query("SELECT rs FROM RepaymentSchedule rs " +
            "WHERE rs.loan.employee.id = :employeeId " +
            "AND rs.dueDate >= :startDate " +
            "AND rs.dueDate <= :endDate " +
            "ORDER BY rs.dueDate ASC")
    List<RepaymentSchedule> findRepaymentsByEmployeeAndDateRange(
            @Param("employeeId") UUID employeeId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    // Find late repayments (overdue by more than X days)
    @Query("SELECT rs FROM RepaymentSchedule rs " +
            "WHERE rs.dueDate < :cutoffDate " +
            "AND rs.status = 'PENDING' " +
            "ORDER BY rs.dueDate ASC")
    List<RepaymentSchedule> findLateRepayments(@Param("cutoffDate") LocalDate cutoffDate);

    // Find repayments with partial payments
    @Query("SELECT rs FROM RepaymentSchedule rs " +
            "WHERE rs.paidAmount > 0 " +
            "AND rs.paidAmount < rs.scheduledAmount " +
            "AND rs.status = 'PENDING'")
    List<RepaymentSchedule> findPartiallyPaidRepayments();

    // Get repayment statistics for a specific month
    @Query("SELECT " +
            "COUNT(rs) as totalRepayments, " +
            "COALESCE(SUM(CASE WHEN rs.status = 'PAID' THEN 1 ELSE 0 END), 0) as paidRepayments, " +
            "COALESCE(SUM(CASE WHEN rs.status = 'PENDING' AND rs.dueDate < CURRENT_DATE THEN 1 ELSE 0 END), 0) as overdueRepayments, " +
            "COALESCE(SUM(rs.scheduledAmount), 0) as totalScheduledAmount, " +
            "COALESCE(SUM(rs.paidAmount), 0) as totalPaidAmount " +
            "FROM RepaymentSchedule rs " +
            "WHERE YEAR(rs.dueDate) = :year " +
            "AND MONTH(rs.dueDate) = :month")
    Object[] getMonthlyRepaymentStatistics(@Param("year") int year, @Param("month") int month);

    // Find all repayments for payroll processing (for a specific pay period)
    @Query("SELECT rs FROM RepaymentSchedule rs " +
            "WHERE rs.dueDate >= :payPeriodStart " +
            "AND rs.dueDate <= :payPeriodEnd " +
            "AND rs.status = 'PENDING' " +
            "AND rs.loan.status = 'ACTIVE' " +
            "ORDER BY rs.loan.employee.firstName ASC, rs.loan.employee.lastName ASC")
    List<RepaymentSchedule> findRepaymentsForPayrollPeriod(
            @Param("payPeriodStart") LocalDate payPeriodStart,
            @Param("payPeriodEnd") LocalDate payPeriodEnd);

    // Find repayments by installment number range
    @Query("SELECT rs FROM RepaymentSchedule rs " +
            "WHERE rs.loan.id = :loanId " +
            "AND rs.installmentNumber >= :startInstallment " +
            "AND rs.installmentNumber <= :endInstallment " +
            "ORDER BY rs.installmentNumber ASC")
    List<RepaymentSchedule> findRepaymentsByInstallmentRange(
            @Param("loanId") UUID loanId,
            @Param("startInstallment") Integer startInstallment,
            @Param("endInstallment") Integer endInstallment);

    // Delete all repayments for loans of a specific employee (for cleanup/transfer)
    @Modifying
    @Transactional
    @Query("DELETE FROM RepaymentSchedule rs WHERE rs.loan.employee.id = :employeeId")
    void deleteByEmployeeId(@Param("employeeId") UUID employeeId);

    // Update repayment status in bulk
    @Modifying
    @Transactional
    @Query("UPDATE RepaymentSchedule rs " +
            "SET rs.status = :newStatus " +
            "WHERE rs.loan.id = :loanId " +
            "AND rs.status = :currentStatus")
    int updateRepaymentStatusByLoan(
            @Param("loanId") UUID loanId,
            @Param("currentStatus") RepaymentSchedule.RepaymentStatus currentStatus,
            @Param("newStatus") RepaymentSchedule.RepaymentStatus newStatus);
}