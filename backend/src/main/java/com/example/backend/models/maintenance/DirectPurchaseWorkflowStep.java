package com.example.backend.models.maintenance;

public enum DirectPurchaseWorkflowStep {
    CREATION,           // Step 1: Creating ticket with title, description, equipment, items
    PURCHASING,         // Step 2: Selecting merchant, entering expected costs, down payment
    FINALIZE_PURCHASING, // Step 3: Entering actual costs, calculating remaining payment
    TRANSPORTING,       // Step 4: Entering transport details and completing
    COMPLETED           // All steps completed
}
