package com.example.backend.services.transaction;

import com.example.backend.models.transaction.Transaction;
import com.example.backend.models.transaction.TransactionItem;
import com.example.backend.models.transaction.TransactionPurpose;
import com.example.backend.models.PartyType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Enhanced Equipment Transaction Service
 * Provides additional functionality for equipment-specific transaction operations
 */
@Service
public class EnhancedEquipmentTransactionService {

    @Autowired
    private TransactionService transactionService;



    /**
     * Get initiated transactions for equipment
     */
    public List<Transaction> getInitiatedTransactions(UUID equipmentId) {
        return transactionService.getPendingTransactionsInitiatedByEquipment(equipmentId);
    }


    public List<Transaction> getOutgoingTransactionsForEquipment(UUID equipmentId) {
        return transactionService.getOutgoingTransactionsForEquipment(equipmentId);
    }

    /**
     * Get pending transactions initiated by equipment
     */
    public List<Transaction> getPendingTransactionsInitiatedByEquipment(UUID equipmentId) {
        return transactionService.getPendingTransactionsInitiatedByEquipment(equipmentId);
    }
}