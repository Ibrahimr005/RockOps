package com.example.backend.repositories.payroll;

import com.example.backend.models.payroll.PaymentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentTypeRepository extends JpaRepository<PaymentType, UUID> {

    Optional<PaymentType> findByCode(String code);

    Optional<PaymentType> findByCodeIgnoreCase(String code);

    List<PaymentType> findByIsActiveTrueOrderByDisplayOrderAsc();

    List<PaymentType> findAllByOrderByDisplayOrderAsc();

    boolean existsByCode(String code);

    boolean existsByCodeIgnoreCase(String code);

    @Query("SELECT pt FROM PaymentType pt WHERE pt.isActive = true ORDER BY pt.displayOrder ASC")
    List<PaymentType> findAllActive();

    @Query("SELECT pt FROM PaymentType pt WHERE pt.requiresBankDetails = true AND pt.isActive = true")
    List<PaymentType> findBankTransferTypes();

    @Query("SELECT pt FROM PaymentType pt WHERE pt.requiresWalletDetails = true AND pt.isActive = true")
    List<PaymentType> findWalletTypes();
}
