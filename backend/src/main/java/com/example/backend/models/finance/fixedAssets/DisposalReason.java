package com.example.backend.models.finance.fixedAssets;

public enum DisposalReason {
    END_OF_LIFE,        // Too old/worn out
    UPGRADE,            // Replacing with newer model
    NO_LONGER_NEEDED,   // Don't need it anymore
    DAMAGED,            // Broken beyond repair
    COST_REDUCTION,     // Saving money
    REGULATORY,         // Legal/safety requirements
    OTHER               // Other reason
}