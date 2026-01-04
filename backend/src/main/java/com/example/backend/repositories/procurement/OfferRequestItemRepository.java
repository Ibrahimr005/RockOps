// OfferRequestItemRepository.java
package com.example.backend.repositories.procurement;

import com.example.backend.models.procurement.OfferRequestItem;
import com.example.backend.models.procurement.Offer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OfferRequestItemRepository extends JpaRepository<OfferRequestItem, UUID> {
    List<OfferRequestItem> findByOffer(Offer offer);

    @Query("SELECT ori FROM OfferRequestItem ori " +
            "LEFT JOIN FETCH ori.itemType " +
            "LEFT JOIN FETCH ori.offer o " +
            "LEFT JOIN FETCH o.requestOrder " +
            "WHERE ori.id = :id")
    Optional<OfferRequestItem> findByIdWithDetails(@Param("id") UUID id);
}