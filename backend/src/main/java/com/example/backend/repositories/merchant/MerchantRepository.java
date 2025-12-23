package com.example.backend.repositories.merchant;

import com.example.backend.models.merchant.Merchant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

import java.util.UUID;

@Repository
public interface MerchantRepository extends JpaRepository<Merchant, UUID> {
    // Note: Merchant entity doesn't have isActive field
    // Use count() for total merchants

    Optional<Merchant> findTopByOrderByMerchantIdDesc();

}
