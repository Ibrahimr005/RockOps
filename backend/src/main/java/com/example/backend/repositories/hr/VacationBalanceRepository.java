package com.example.backend.repositories.hr;

import com.example.backend.models.hr.VacationBalance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VacationBalanceRepository extends JpaRepository<VacationBalance, UUID> {

    // Find by employee and year
    Optional<VacationBalance> findByEmployeeIdAndYear(UUID employeeId, Integer year);

    // Find by employee
    List<VacationBalance> findByEmployeeIdOrderByYearDesc(UUID employeeId);

    // Find by year
    List<VacationBalance> findByYear(Integer year);

    // Find employees with low vacation balance
    @Query("SELECT vb FROM VacationBalance vb WHERE vb.year = :year AND " +
           "(vb.totalAllocated + vb.carriedForward + vb.bonusDays - vb.usedDays - vb.pendingDays) < :threshold")
    List<VacationBalance> findEmployeesWithLowBalance(@Param("year") Integer year, 
                                                    @Param("threshold") Integer threshold);

    // Find employees with unused vacation days
    @Query("SELECT vb FROM VacationBalance vb WHERE vb.year = :year AND " +
           "vb.usedDays = 0 ORDER BY vb.totalAllocated DESC")
    List<VacationBalance> findEmployeesWithUnusedVacation(@Param("year") Integer year);

    // Analytics queries
    @Query("SELECT AVG(vb.usedDays) FROM VacationBalance vb WHERE vb.year = :year")
    Double getAverageUsedDays(@Param("year") Integer year);

    @Query("SELECT SUM(vb.totalAllocated), SUM(vb.usedDays), SUM(vb.pendingDays) " +
           "FROM VacationBalance vb WHERE vb.year = :year")
    List<Object[]> getYearlyStatistics(@Param("year") Integer year);

    // Check if balance exists for employee and year
    boolean existsByEmployeeIdAndYear(UUID employeeId, Integer year);
}