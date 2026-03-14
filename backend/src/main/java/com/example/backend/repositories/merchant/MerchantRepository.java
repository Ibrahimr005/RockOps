package com.example.backend.repositories.merchant;

import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.merchant.MerchantType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

import java.util.UUID;

@Repository
public interface MerchantRepository extends JpaRepository<Merchant, UUID> {
    // Note: Merchant entity doesn't have isActive field
    // Use count() for total merchants

    Optional<Merchant> findTopByOrderByMerchantIdDesc();

    @Query("SELECT m FROM Merchant m JOIN m.merchantTypes mt WHERE mt = :type")
    List<Merchant> findByMerchantType(@Param("type") MerchantType type);
}
