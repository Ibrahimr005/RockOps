package com.example.backend.repositories.procurement;


import com.example.backend.models.finance.accountsPayable.enums.OfferFinanceValidationStatus;
import com.example.backend.models.procurement.Offer.Offer;
import com.example.backend.models.procurement.RequestOrder.RequestOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface OfferRepository extends JpaRepository<Offer, UUID> {
    List<Offer> findByRequestOrder(RequestOrder requestOrder);
    List<Offer> findByStatus(String status);

    List<Offer> findByFinanceStatus(String financeStatus);

    // Dashboard metrics methods
    long countByStatus(String status);

    List<Offer> findByFinanceValidationStatus(OfferFinanceValidationStatus status);
}
