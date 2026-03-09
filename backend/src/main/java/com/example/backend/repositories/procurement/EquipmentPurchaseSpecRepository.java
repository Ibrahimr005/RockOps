package com.example.backend.repositories.procurement;

import com.example.backend.models.procurement.EquipmentPurchaseSpec;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface EquipmentPurchaseSpecRepository extends JpaRepository<EquipmentPurchaseSpec, UUID> {
}
