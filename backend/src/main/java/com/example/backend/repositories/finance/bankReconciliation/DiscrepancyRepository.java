package com.example.backend.repositories.finance.bankReconciliation;

import com.example.backend.models.finance.bankReconciliation.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface DiscrepancyRepository extends JpaRepository<Discrepancy, UUID> {

    // Find by bank account
    List<Discrepancy> findByBankAccount(BankAccount bankAccount);

    // Find by status
    List<Discrepancy> findByStatus(DiscrepancyStatus status);

    // Find by priority
    List<Discrepancy> findByPriority(DiscrepancyPriority priority);

    // Find by discrepancy type
    List<Discrepancy> findByDiscrepancyType(DiscrepancyType discrepancyType);

    // Find discrepancies assigned to specific person
    List<Discrepancy> findByAssignedTo(String assignedTo);

    // Find unassigned discrepancies
    List<Discrepancy> findByAssignedToIsNull();

    // Find discrepancies identified by specific person
    List<Discrepancy> findByIdentifiedBy(String identifiedBy);

    // Find discrepancies resolved by specific person
    List<Discrepancy> findByResolvedBy(String resolvedBy);

    // Find discrepancies related to specific internal transaction
    List<Discrepancy> findByInternalTransaction(InternalTransaction internalTransaction);

    // Find discrepancies related to specific bank statement entry
    List<Discrepancy> findByBankStatementEntry(BankStatementEntry bankStatementEntry);

    // Find discrepancies in date range (by identified date)
    List<Discrepancy> findByIdentifiedAtBetween(LocalDateTime startDate, LocalDateTime endDate);

    // Find open discrepancies for specific bank account
    @Query("SELECT d FROM Discrepancy d WHERE d.bankAccount = :bankAccount AND d.status = 'OPEN'")
    List<Discrepancy> findOpenDiscrepanciesByBankAccount(@Param("bankAccount") BankAccount bankAccount);

    // Find high priority open discrepancies
    @Query("SELECT d FROM Discrepancy d WHERE d.status IN ('OPEN', 'IN_PROGRESS') " +
            "AND d.priority IN ('HIGH', 'CRITICAL')")
    List<Discrepancy> findHighPriorityOpenDiscrepancies();

    // Find overdue discrepancies (open for more than X days)
    @Query("SELECT d FROM Discrepancy d WHERE d.status IN ('OPEN', 'IN_PROGRESS') " +
            "AND d.identifiedAt < :cutoffDate")
    List<Discrepancy> findOverdueDiscrepancies(@Param("cutoffDate") LocalDateTime cutoffDate);

    // Find discrepancies assigned to user that are still open
    @Query("SELECT d FROM Discrepancy d WHERE d.assignedTo = :assignee " +
            "AND d.status IN ('OPEN', 'IN_PROGRESS')")
    List<Discrepancy> findActiveDiscrepanciesForAssignee(@Param("assignee") String assignee);

    // Find recent discrepancies (last X days)
    @Query("SELECT d FROM Discrepancy d WHERE d.identifiedAt >= :since")
    List<Discrepancy> findRecentDiscrepancies(@Param("since") LocalDateTime since);

    // Count discrepancies by status
    long countByStatus(DiscrepancyStatus status);

    // Count discrepancies by priority
    long countByPriority(DiscrepancyPriority priority);

    // Count open discrepancies for specific bank account
    @Query("SELECT COUNT(d) FROM Discrepancy d WHERE d.bankAccount = :bankAccount AND d.status = 'OPEN'")
    long countOpenDiscrepanciesByBankAccount(@Param("bankAccount") BankAccount bankAccount);

    // Count discrepancies assigned to specific person
    long countByAssignedTo(String assignedTo);

    // Count unassigned discrepancies
    long countByAssignedToIsNull();

    // Find discrepancies summary by type for specific account
    @Query("SELECT d.discrepancyType, COUNT(d) FROM Discrepancy d " +
            "WHERE d.bankAccount = :bankAccount GROUP BY d.discrepancyType")
    List<Object[]> findDiscrepancySummaryByType(@Param("bankAccount") BankAccount bankAccount);

    // Find discrepancies summary by status for specific account
    @Query("SELECT d.status, COUNT(d) FROM Discrepancy d " +
            "WHERE d.bankAccount = :bankAccount GROUP BY d.status")
    List<Object[]> findDiscrepancySummaryByStatus(@Param("bankAccount") BankAccount bankAccount);
}