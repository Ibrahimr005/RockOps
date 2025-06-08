package com.example.backend.dto.equipment;

import com.example.backend.models.warehouse.ResolutionType;
import lombok.Data;

import java.util.UUID;

@Data
public class ConsumableResolutionDTO {
    private UUID consumableId;
    private ResolutionType resolutionType;
    private String notes;
    private String resolvedBy;
    private String transactionId;
    private Integer correctedQuantity; // For counting error resolutions
} 