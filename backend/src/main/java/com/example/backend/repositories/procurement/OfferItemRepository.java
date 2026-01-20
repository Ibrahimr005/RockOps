package com.example.backend.repositories.procurement;


import com.example.backend.models.procurement.Offer.OfferItem;
import com.example.backend.models.procurement.RequestOrder.RequestOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface OfferItemRepository extends JpaRepository<OfferItem, UUID> {
    List<OfferItem> findByRequestOrderItem(RequestOrderItem requestOrderItem);
}
