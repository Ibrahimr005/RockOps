package com.example.backend.repositories.payroll;

import com.example.backend.models.payroll.Bonus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for Bonus entity
 */
@Repository
public interface BonusRepository extends JpaRepository<Bonus, UUID> {

    /**
     * Find all bonuses for a site
     */
    List<Bonus> findBySiteId(UUID siteId);

    /**
     * Find bonuses by employee
     */
    List<Bonus> findByEmployeeId(UUID employeeId);

    /**
     * Find bonuses by payroll
     */
    List<Bonus> findByPayrollId(UUID payrollId);

    /**
     * Find bonuses by effective month, year, and site
     */
    List<Bonus> findByEffectiveMonthAndEffectiveYearAndSiteId(int effectiveMonth, int effectiveYear, UUID siteId);

    /**
     * Find bonuses by status list
     */
    List<Bonus> findByStatusIn(List<Bonus.BonusStatus> statuses);

    /**
     * Find bonuses by bulk bonus ID
     */
    List<Bonus> findByBulkBonusId(UUID bulkBonusId);

    /**
     * Find bonus by payment request ID
     */
    Optional<Bonus> findByPaymentRequestId(UUID paymentRequestId);

    /**
     * Find bonuses for a specific month/year with certain statuses
     */
    @Query("SELECT b FROM Bonus b WHERE b.effectiveMonth = :month AND b.effectiveYear = :year " +
            "AND b.site.id = :siteId AND b.status IN :statuses")
    List<Bonus> findByMonthYearAndSiteAndStatusIn(
            @Param("month") int month,
            @Param("year") int year,
            @Param("siteId") UUID siteId,
            @Param("statuses") List<Bonus.BonusStatus> statuses);

    /**
     * Find bonuses by bonus type and active statuses
     */
    @Query("SELECT b FROM Bonus b WHERE b.bonusType.id = :bonusTypeId " +
            "AND b.status NOT IN ('CANCELLED', 'HR_REJECTED')")
    List<Bonus> findActiveBonusesByBonusTypeId(@Param("bonusTypeId") UUID bonusTypeId);

    /**
     * Get max bonus number sequence for ID generation
     */
    @Query("SELECT MAX(CAST(SUBSTRING(b.bonusNumber, 10) AS long)) FROM Bonus b " +
            "WHERE b.bonusNumber LIKE :prefix")
    Long getMaxBonusNumberSequence(@Param("prefix") String prefix);

    /**
     * Check if bonus number exists
     */
    boolean existsByBonusNumber(String bonusNumber);

    /**
     * Count bonuses by status and site
     */
    long countByStatusAndSiteId(Bonus.BonusStatus status, UUID siteId);

    /**
     * Find bonuses by employee and status
     */
    List<Bonus> findByEmployeeIdAndStatus(UUID employeeId, Bonus.BonusStatus status);

    /**
     * Find bonuses by employee and statuses
     */
    List<Bonus> findByEmployeeIdAndStatusIn(UUID employeeId, List<Bonus.BonusStatus> statuses);

    /**
     * Sum bonus amounts by status and site
     */
    @Query("SELECT COALESCE(SUM(b.amount), 0) FROM Bonus b WHERE b.status = :status AND b.site.id = :siteId")
    java.math.BigDecimal sumAmountByStatusAndSiteId(
            @Param("status") Bonus.BonusStatus status,
            @Param("siteId") UUID siteId);
}
