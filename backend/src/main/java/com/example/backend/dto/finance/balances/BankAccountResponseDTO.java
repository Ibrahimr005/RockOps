package com.example.backend.dto.finance.balances;

import com.example.backend.models.finance.balances.BankAccount;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BankAccountResponseDTO {

    private UUID id;
    private String bankName;
    private String accountNumber;
    private String iban;
    private String branchName;
    private String branchCode;
    private String swiftCode;
    private String accountHolderName;
    private BigDecimal currentBalance;
    private LocalDate openingDate;
    private Boolean isActive;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;

    // Add fields:
    private BigDecimal availableBalance;
    private BigDecimal reservedBalance;
    private BigDecimal totalBalance;



    public static BankAccountResponseDTO fromEntity(BankAccount entity) {
        return BankAccountResponseDTO.builder()
                .id(entity.getId())
                .bankName(entity.getBankName())
                .accountNumber(entity.getAccountNumber())
                .iban(entity.getIban())
                .branchName(entity.getBranchName())
                .branchCode(entity.getBranchCode())
                .swiftCode(entity.getSwiftCode())
                .accountHolderName(entity.getAccountHolderName())
                .currentBalance(entity.getCurrentBalance())
                .openingDate(entity.getOpeningDate())
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