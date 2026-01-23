// RequestItemModificationRepository.java
package com.example.backend.repositories.procurement;

import com.example.backend.models.procurement.Offer.RequestItemModification;
import com.example.backend.models.procurement.Offer.Offer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RequestItemModificationRepository extends JpaRepository<RequestItemModification, UUID> {
    List<RequestItemModification> findByOfferOrderByTimestampDesc(Offer offer);
}