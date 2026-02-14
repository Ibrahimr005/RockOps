package com.example.backend.repositories.finance.incomingPayments;

import com.example.backend.models.finance.incomingPayments.IncomingPaymentRequestItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface IncomingPaymentRequestItemRepository extends JpaRepository<IncomingPaymentRequestItem, UUID> {

    List<IncomingPaymentRequestItem> findByIncomingPaymentRequestId(UUID incomingPaymentRequestId);
}