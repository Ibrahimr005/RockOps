package com.example.backend.repositories.finance.balances;

import com.example.backend.models.finance.balances.CashSafe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CashSafeRepository extends JpaRepository<CashSafe, UUID> {

    List<CashSafe> findByIsActiveTrue();

    List<CashSafe> findByIsActiveFalse();

    List<CashSafe> findBySafeNameContainingIgnoreCase(String safeName);

    List<CashSafe> findByLocationContainingIgnoreCase(String location);
}