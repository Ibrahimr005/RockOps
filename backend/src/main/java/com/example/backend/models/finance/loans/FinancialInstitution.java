package com.example.backend.models.finance.loans;

import com.example.backend.models.finance.loans.enums.InstitutionType;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "financial_institutions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FinancialInstitution {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "institution_number", nullable = false, unique = true, length = 50)
    private String institutionNumber;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "institution_type", nullable = false, length = 50)
    private InstitutionType institutionType;

    @Column(name = "registration_number", length = 100)
    private String registrationNumber;

    @Column(name = "address", length = 500)
    private String address;

    @Column(name = "city", length = 100)
    private String city;

    @Column(name = "country", length = 100)
    private String country;

    @Column(name = "phone_number", length = 50)
    private String phoneNumber;

    @Column(name = "email", length = 255)
    private String email;

    @Column(name = "website", length = 255)
    private String website;

    @Column(name = "contact_person_name", length = 255)
    private String contactPersonName;

    @Column(name = "contact_person_phone", length = 50)
    private String contactPersonPhone;

    @Column(name = "contact_person_email", length = 255)
    private String contactPersonEmail;

    // Bank details for making payments to this institution
    @Column(name = "payment_bank_name", length = 255)
    private String paymentBankName;

    @Column(name = "payment_account_number", length = 100)
    private String paymentAccountNumber;

    @Column(name = "payment_iban", length = 50)
    private String paymentIban;

    @Column(name = "payment_swift_code", length = 20)
    private String paymentSwiftCode;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_by", length = 255)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Relationship with CompanyLoan
    @OneToMany(mappedBy = "financialInstitution", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonManagedReference("institution-loans")
    @Builder.Default
    private List<CompanyLoan> loans = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}