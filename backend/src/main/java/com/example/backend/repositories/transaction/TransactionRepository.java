package com.example.backend.repositories.transaction;


import com.example.backend.models.PartyType;
import com.example.backend.models.transaction.Transaction;
import com.example.backend.models.transaction.TransactionPurpose;
import com.example.backend.models.transaction.TransactionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TransactionRepository extends JpaRepository<Transaction, UUID> {


    Optional<Transaction> findByBatchNumber(Integer batchNumber);

    List<Transaction> findByPurpose(TransactionPurpose purpose);


    List<Transaction> findBySenderTypeAndSenderIdOrReceiverTypeAndReceiverId(
            PartyType senderType, UUID senderId,
            PartyType receiverType, UUID receiverId);

    @Query("SELECT t FROM Transaction t WHERE " +
            "(t.senderId = :partyId AND t.senderType = :partyType) OR " +
            "(t.receiverId = :partyId AND t.receiverType = :partyType)")
    List<Transaction> findTransactionsByPartyIdAndType(@Param("partyId") UUID partyId, @Param("partyType") PartyType partyType);

    // Add these methods to your TransactionRepository interface

    /**
     * Find transactions by receiver type, receiver id, status, and sent first not equal to
     * Used to find incoming transactions for a party that didn't initiate them
     */
    List<Transaction> findByReceiverTypeAndReceiverIdAndStatusAndSentFirstNot(
            PartyType receiverType, UUID receiverId, TransactionStatus status, UUID sentFirst);

    /**
     * Find transactions by sender type, sender id, status, and sent first not equal to
     * Used to find outgoing transactions for a party that didn't initiate them
     */
    List<Transaction> findBySenderTypeAndSenderIdAndStatusAndSentFirstNot(
            PartyType senderType, UUID senderId, TransactionStatus status, UUID sentFirst);

    /**
     * Find transactions by status and sent first
     * Used to find pending transactions initiated by a party
     */
    List<Transaction> findByStatusAndSentFirst(TransactionStatus status, UUID sentFirst);
    List<Transaction> findByBatchNumberAndStatus(int batchNumber, TransactionStatus status);
    
    /**
     * Find transactions by receiver id and receiver type
     * Used to find all transactions where a specific party was the receiver
     */
    List<Transaction> findByReceiverIdAndReceiverType(UUID receiverId, PartyType receiverType);
}

