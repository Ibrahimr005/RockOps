package com.example.backend.transaction;

import com.example.backend.models.PartyType;
import com.example.backend.models.transaction.*;
import com.example.backend.models.warehouse.ItemStatus;
import org.junit.jupiter.api.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Basic validation tests for transaction models and enums without Spring context
 * 
 * These tests validate that your backend models are correctly structured
 * for equipment-warehouse transactions
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class BasicTransactionValidationTest {

    @Test
    @Order(1)
    @DisplayName("Test Transaction Status Enum Values")
    void testTransactionStatusEnum() {
        // Verify all expected transaction statuses exist
        assertNotNull(TransactionStatus.PENDING);
        assertNotNull(TransactionStatus.DELIVERING);
        assertNotNull(TransactionStatus.ACCEPTED);
        assertNotNull(TransactionStatus.REJECTED);
        assertNotNull(TransactionStatus.PARTIALLY_ACCEPTED);
        assertNotNull(TransactionStatus.RESOLVING);
        assertNotNull(TransactionStatus.RESOLVED);

        // Verify enum values
        assertEquals("PENDING", TransactionStatus.PENDING.name());
        assertEquals("ACCEPTED", TransactionStatus.ACCEPTED.name());
        assertEquals("REJECTED", TransactionStatus.REJECTED.name());
    }

    @Test
    @Order(2)
    @DisplayName("Test Transaction Purpose Enum Values")
    void testTransactionPurposeEnum() {
        // Verify all expected transaction purposes exist
        assertNotNull(TransactionPurpose.GENERAL);
        assertNotNull(TransactionPurpose.CONSUMABLE);
        assertNotNull(TransactionPurpose.MAINTENANCE);

        // Verify enum values
        assertEquals("GENERAL", TransactionPurpose.GENERAL.name());
        assertEquals("CONSUMABLE", TransactionPurpose.CONSUMABLE.name());
        assertEquals("MAINTENANCE", TransactionPurpose.MAINTENANCE.name());

        // Should have exactly 3 purposes
        assertEquals(3, TransactionPurpose.values().length);
    }

    @Test
    @Order(3)
    @DisplayName("Test Party Type Enum Values")
    void testPartyTypeEnum() {
        // Verify required party types exist
        assertNotNull(PartyType.WAREHOUSE);
        assertNotNull(PartyType.EQUIPMENT);

        // Verify enum values
        assertEquals("WAREHOUSE", PartyType.WAREHOUSE.name());
        assertEquals("EQUIPMENT", PartyType.EQUIPMENT.name());
    }

    @Test
    @Order(4)
    @DisplayName("Test Item Status Enum Values")
    void testItemStatusEnum() {
        // Verify warehouse item statuses exist
        assertNotNull(ItemStatus.IN_WAREHOUSE);
        assertNotNull(ItemStatus.DELIVERING);
        assertNotNull(ItemStatus.PENDING);
        assertNotNull(ItemStatus.MISSING);
        assertNotNull(ItemStatus.OVERRECEIVED);
        assertNotNull(ItemStatus.CONSUMED);

        // Verify enum values
        assertEquals("IN_WAREHOUSE", ItemStatus.IN_WAREHOUSE.name());
        assertEquals("CONSUMED", ItemStatus.CONSUMED.name());
    }

    @Test
    @Order(5)
    @DisplayName("Test Transaction Model Creation")
    void testTransactionModel() {
        // Test that Transaction model can be instantiated
        Transaction transaction = new Transaction();
        
        // Test setting basic properties
        transaction.setStatus(TransactionStatus.PENDING);
        transaction.setPurpose(TransactionPurpose.CONSUMABLE);
        transaction.setSenderType(PartyType.WAREHOUSE);
        transaction.setReceiverType(PartyType.EQUIPMENT);
        transaction.setBatchNumber(12345);
        
        // Verify properties are set correctly
        assertEquals(TransactionStatus.PENDING, transaction.getStatus());
        assertEquals(TransactionPurpose.CONSUMABLE, transaction.getPurpose());
        assertEquals(PartyType.WAREHOUSE, transaction.getSenderType());
        assertEquals(PartyType.EQUIPMENT, transaction.getReceiverType());
        assertEquals(12345, transaction.getBatchNumber());
    }

    @Test
    @Order(6)
    @DisplayName("Test TransactionItem Model Creation")
    void testTransactionItemModel() {
        // Test that TransactionItem model can be instantiated
        TransactionItem item = new TransactionItem();
        
        // Test setting properties
        item.setQuantity(25);
        item.setStatus(TransactionStatus.PENDING);
        item.setReceivedQuantity(20);
        item.setRejectionReason("Quantity mismatch");
        
        // Verify properties are set correctly
        assertEquals(25, item.getQuantity());
        assertEquals(TransactionStatus.PENDING, item.getStatus());
        assertEquals(20, item.getReceivedQuantity());
        assertEquals("Quantity mismatch", item.getRejectionReason());
    }

    @Test
    @Order(7)
    @DisplayName("Test Equipment-Warehouse Transaction Directions")
    void testEquipmentWarehouseTransactionDirections() {
        // Test Warehouse → Equipment transaction
        Transaction warehouseToEquipment = new Transaction();
        warehouseToEquipment.setSenderType(PartyType.WAREHOUSE);
        warehouseToEquipment.setReceiverType(PartyType.EQUIPMENT);
        warehouseToEquipment.setPurpose(TransactionPurpose.CONSUMABLE);
        
        assertTrue(isValidEquipmentWarehouseTransaction(warehouseToEquipment));
        
        // Test Equipment → Warehouse transaction
        Transaction equipmentToWarehouse = new Transaction();
        equipmentToWarehouse.setSenderType(PartyType.EQUIPMENT);
        equipmentToWarehouse.setReceiverType(PartyType.WAREHOUSE);
        equipmentToWarehouse.setPurpose(TransactionPurpose.MAINTENANCE);
        
        assertTrue(isValidEquipmentWarehouseTransaction(equipmentToWarehouse));
        
        // Test Warehouse → Warehouse transaction (should remain valid)
        Transaction warehouseToWarehouse = new Transaction();
        warehouseToWarehouse.setSenderType(PartyType.WAREHOUSE);
        warehouseToWarehouse.setReceiverType(PartyType.WAREHOUSE);
        warehouseToWarehouse.setPurpose(TransactionPurpose.GENERAL);
        
        assertTrue(isValidWarehouseTransaction(warehouseToWarehouse));
    }

    @Test
    @Order(8)
    @DisplayName("Test Transaction Status Transitions")
    void testTransactionStatusTransitions() {
        Transaction transaction = new Transaction();
        
        // Start with PENDING
        transaction.setStatus(TransactionStatus.PENDING);
        assertEquals(TransactionStatus.PENDING, transaction.getStatus());
        
        // Can transition to ACCEPTED
        transaction.setStatus(TransactionStatus.ACCEPTED);
        assertEquals(TransactionStatus.ACCEPTED, transaction.getStatus());
        
        // Can transition to REJECTED
        transaction.setStatus(TransactionStatus.REJECTED);
        assertEquals(TransactionStatus.REJECTED, transaction.getStatus());
        
        // Can have PARTIALLY_ACCEPTED
        transaction.setStatus(TransactionStatus.PARTIALLY_ACCEPTED);
        assertEquals(TransactionStatus.PARTIALLY_ACCEPTED, transaction.getStatus());
    }

    @Test
    @Order(9)
    @DisplayName("Test Purpose-Specific Scenarios")
    void testPurposeSpecificScenarios() {
        // CONSUMABLE purpose - Equipment receives items for consumption
        Transaction consumableTransaction = new Transaction();
        consumableTransaction.setPurpose(TransactionPurpose.CONSUMABLE);
        consumableTransaction.setSenderType(PartyType.WAREHOUSE);
        consumableTransaction.setReceiverType(PartyType.EQUIPMENT);
        
        assertEquals(TransactionPurpose.CONSUMABLE, consumableTransaction.getPurpose());
        assertTrue(isValidEquipmentWarehouseTransaction(consumableTransaction));
        
        // MAINTENANCE purpose - Equipment requests/receives maintenance items
        Transaction maintenanceTransaction = new Transaction();
        maintenanceTransaction.setPurpose(TransactionPurpose.MAINTENANCE);
        maintenanceTransaction.setSenderType(PartyType.WAREHOUSE);
        maintenanceTransaction.setReceiverType(PartyType.EQUIPMENT);
        
        assertEquals(TransactionPurpose.MAINTENANCE, maintenanceTransaction.getPurpose());
        assertTrue(isValidEquipmentWarehouseTransaction(maintenanceTransaction));
        
        // GENERAL purpose - Default for warehouse-to-warehouse
        Transaction generalTransaction = new Transaction();
        generalTransaction.setPurpose(TransactionPurpose.GENERAL);
        generalTransaction.setSenderType(PartyType.WAREHOUSE);
        generalTransaction.setReceiverType(PartyType.WAREHOUSE);
        
        assertEquals(TransactionPurpose.GENERAL, generalTransaction.getPurpose());
        assertTrue(isValidWarehouseTransaction(generalTransaction));
    }

    @Test
    @Order(10)
    @DisplayName("Test All Required Enums Exist")
    void testAllRequiredEnumsExist() {
        // Verify we have all the enums we need for equipment-warehouse transactions
        
        // Transaction statuses for different scenarios
        assertTrue(TransactionStatus.values().length >= 7);
        
        // Transaction purposes for different use cases
        assertEquals(3, TransactionPurpose.values().length);
        
        // Party types for different entities
        assertTrue(PartyType.values().length >= 2);
        
        // Item statuses for warehouse management
        assertTrue(ItemStatus.values().length >= 6);
    }

    // Helper methods for validation
    private boolean isValidEquipmentWarehouseTransaction(Transaction transaction) {
        PartyType sender = transaction.getSenderType();
        PartyType receiver = transaction.getReceiverType();
        
        // Valid: Warehouse ↔ Equipment
        if (sender == PartyType.WAREHOUSE && receiver == PartyType.EQUIPMENT) return true;
        return sender == PartyType.EQUIPMENT && receiver == PartyType.WAREHOUSE;
    }
    
    private boolean isValidWarehouseTransaction(Transaction transaction) {
        PartyType sender = transaction.getSenderType();
        PartyType receiver = transaction.getReceiverType();
        
        // Valid: Warehouse → Warehouse (existing functionality should remain)
        return sender == PartyType.WAREHOUSE && receiver == PartyType.WAREHOUSE;
    }
}