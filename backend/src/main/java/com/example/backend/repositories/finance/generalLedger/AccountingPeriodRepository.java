package com.example.backend.repositories.finance.generalLedger;

import com.example.backend.models.finance.generalLedger.AccountingPeriod;
import com.example.backend.models.finance.generalLedger.PeriodStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AccountingPeriodRepository extends JpaRepository<AccountingPeriod, UUID> {

    List<AccountingPeriod> findByStatus(PeriodStatus status);

    // Find a period that includes the given date
    @Query("SELECT p FROM AccountingPeriod p WHERE p.startDate <= :date AND p.endDate >= :date")
    Optional<AccountingPeriod> findPeriodByDate(@Param("date") LocalDate date);

    // Find periods that overlap with the given date range
    @Query("SELECT p FROM AccountingPeriod p WHERE p.startDate <= :endDate AND p.endDate >= :startDate")
    List<AccountingPeriod> findPeriodsOverlappingWith(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);
}