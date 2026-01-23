package com.example.backend.repositories.finance.refunds;

import com.example.backend.models.finance.refunds.RefundRequestItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RefundRequestItemRepository extends JpaRepository<RefundRequestItem, UUID> {

    // Find all items for a specific refund request
    List<RefundRequestItem> findByRefundRequestId(UUID refundRequestId);
}