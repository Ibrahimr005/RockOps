package com.example.backend.dto.equipment;

import com.example.backend.dto.transaction.TransactionDTO;
import com.example.backend.models.equipment.ConsumableResolution;
import lombok.Data;

import java.util.List;

@Data
public class ConsumableHistoryDTO {
    private List<TransactionDTO> transactions;
    private List<ConsumableResolution> resolutions;
    private boolean hasResolutions;
    
    public ConsumableHistoryDTO(List<TransactionDTO> transactions, List<ConsumableResolution> resolutions) {
        this.transactions = transactions;
        this.resolutions = resolutions;
        this.hasResolutions = resolutions != null && !resolutions.isEmpty();
    }
} 