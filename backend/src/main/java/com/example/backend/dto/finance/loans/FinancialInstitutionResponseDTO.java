package com.example.backend.dto.finance.loans;

import com.example.backend.models.finance.loans.FinancialInstitution;
import com.example.backend.models.finance.loans.enums.InstitutionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinancialInstitutionResponseDTO {

    private UUID id;
    private String institutionNumber;
    private String name;
    private InstitutionType institutionType;
    private String registrationNumber;
    private String address;
    private String city;
    private String country;
    private String phoneNumber;
    private String email;
    private String website;
    private String contactPersonName;
    private String contactPersonPhone;
    private String contactPersonEmail;
    private String paymentBankName;
    private String paymentAccountNumber;
    private String paymentIban;
    private String paymentSwiftCode;
    private String notes;
    private Boolean isActive;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Summary fields
    private Integer totalLoans;
    private Integer activeLoans;

    public static FinancialInstitutionResponseDTO fromEntity(FinancialInstitution entity) {
        return FinancialInstitutionResponseDTO.builder()
                .id(entity.getId())
                .institutionNumber(entity.getInstitutionNumber())
                .name(entity.getName())
                .institutionType(entity.getInstitutionType())
                .registrationNumber(entity.getRegistrationNumber())
                .address(entity.getAddress())
                .city(entity.getCity())
                .country(entity.getCountry())
                .phoneNumber(entity.getPhoneNumber())
                .email(entity.getEmail())
                .website(entity.getWebsite())
                .contactPersonName(entity.getContactPersonName())
                .contactPersonPhone(entity.getContactPersonPhone())
                .contactPersonEmail(entity.getContactPersonEmail())
                .paymentBankName(entity.getPaymentBankName())
                .paymentAccountNumber(entity.getPaymentAccountNumber())
                .paymentIban(entity.getPaymentIban())
                .paymentSwiftCode(entity.getPaymentSwiftCode())
                .notes(entity.getNotes())
                .isActive(entity.getIsActive())
                .createdBy(entity.getCreatedBy())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}