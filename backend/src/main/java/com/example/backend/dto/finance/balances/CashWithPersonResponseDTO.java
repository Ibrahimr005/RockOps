package com.example.backend.dto.finance.balances;

import com.example.backend.models.finance.balances.CashWithPerson;
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
public class CashWithPersonResponseDTO {

    private UUID id;
    private String personName;
    private String phoneNumber;
    private String email;
    private String address;
    private String personalBankAccountNumber;
    private String personalBankName;
    private BigDecimal currentBalance;
    private Boolean isActive;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;

    public static CashWithPersonResponseDTO fromEntity(CashWithPerson entity) {
        return CashWithPersonResponseDTO.builder()
                .id(entity.getId())
                .personName(entity.getPersonName())
                .phoneNumber(entity.getPhoneNumber())
                .email(entity.getEmail())
                .address(entity.getAddress())
                .personalBankAccountNumber(entity.getPersonalBankAccountNumber())
                .personalBankName(entity.getPersonalBankName())
                .currentBalance(entity.getCurrentBalance())
                .isActive(entity.getIsActive())
                .notes(entity.getNotes())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .build();
    }
}