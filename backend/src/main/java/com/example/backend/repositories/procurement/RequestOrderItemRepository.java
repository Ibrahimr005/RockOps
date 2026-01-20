package com.example.backend.repositories.procurement;


import com.example.backend.models.procurement.RequestOrder.RequestOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface RequestOrderItemRepository extends JpaRepository<RequestOrderItem, UUID> {
}
