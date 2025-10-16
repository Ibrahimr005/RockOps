package com.example.backend.models.warehouse;

public enum ItemSource {
    MANUAL_ENTRY,           // Manually added by warehouse staff
    PURCHASE_ORDER,         // Received from a purchase order
    TRANSACTION_TRANSFER,   // Received from warehouse transfer
    INITIAL_STOCK          // Initial inventory setup
}