package com.example.backend.dto.finance.loans;

import com.example.backend.models.finance.loans.enums.InstitutionType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinancialInstitutionRequestDTO {

    @NotBlank(message = "Institution name is required")
    private String name;

    @NotNull(message = "Institution type is required")
    private InstitutionType institutionType;

    private String registrationNumber;
    private String address;
    private String city;
    private String country;
    private String phoneNumber;

    @Email(message = "Invalid email format")
    private String email;

    private String website;
    private String contactPersonName;
    private String contactPersonPhone;

    @Email(message = "Invalid contact email format")
    private String contactPersonEmail;

    // Payment details
    private String paymentBankName;
    private String paymentAccountNumber;
    private String paymentIban;
    private String paymentSwiftCode;

    private String notes;
    private Boolean isActive;
}