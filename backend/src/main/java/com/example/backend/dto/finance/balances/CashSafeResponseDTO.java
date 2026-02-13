package com.example.backend.dto.finance.balances;

import com.example.backend.models.finance.balances.CashSafe;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CashSafeResponseDTO {

    private UUID id;
    private String safeName;
    private String location;
    private BigDecimal currentBalance;
    private Boolean isActive;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    // Add fields:
    private BigDecimal availableBalance;
    private BigDecimal reservedBalance;
    private BigDecimal totalBalance;



    public static CashSafeResponseDTO fromEntity(CashSafe entity) {
        return CashSafeResponseDTO.builder()
                .id(entity.getId())
                .safeName(entity.getSafeName())
                .location(entity.getLocation())
                .currentBalance(entity.getCurrentBalance())
                .isActive(entity.getIsActive())
                .notes(entity.getNotes())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .availableBalance(entity.getAvailableBalance())
                .reservedBalance(entity.getReservedBalance())
                .totalBalance(entity.getTotalBalance())
                .build();
    }
}