// OfferRequestItemRepository.java
package com.example.backend.repositories.procurement;

import com.example.backend.models.procurement.OfferRequestItem;
import com.example.backend.models.procurement.Offer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface OfferRequestItemRepository extends JpaRepository<OfferRequestItem, UUID> {
    List<OfferRequestItem> findByOffer(Offer offer);
}