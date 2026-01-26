package com.example.backend.services.finance.loans;

import com.example.backend.dto.finance.loans.FinancialInstitutionRequestDTO;
import com.example.backend.dto.finance.loans.FinancialInstitutionResponseDTO;
import com.example.backend.models.finance.loans.FinancialInstitution;
import com.example.backend.models.finance.loans.enums.CompanyLoanStatus;
import com.example.backend.models.finance.loans.enums.InstitutionType;
import com.example.backend.models.id.EntityTypeConfig;
import com.example.backend.repositories.finance.loans.CompanyLoanRepository;
import com.example.backend.repositories.finance.loans.FinancialInstitutionRepository;
import com.example.backend.services.id.EntityIdGeneratorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class FinancialInstitutionService {

    private final FinancialInstitutionRepository institutionRepository;
    private final CompanyLoanRepository loanRepository;
    private final EntityIdGeneratorService idGeneratorService;

    /**
     * Create a new financial institution
     */
    public FinancialInstitutionResponseDTO create(FinancialInstitutionRequestDTO requestDTO, String createdBy) {
        log.info("Creating financial institution: {}", requestDTO.getName());

        // Validate unique name
        if (institutionRepository.existsByName(requestDTO.getName())) {
            throw new IllegalArgumentException("Financial institution with name '" + requestDTO.getName() + "' already exists");
        }

        // Generate institution number
        String institutionNumber = idGeneratorService.generateNextId(EntityTypeConfig.FINANCIAL_INSTITUTION);

        FinancialInstitution institution = FinancialInstitution.builder()
                .institutionNumber(institutionNumber)
                .name(requestDTO.getName())
                .institutionType(requestDTO.getInstitutionType())
                .registrationNumber(requestDTO.getRegistrationNumber())
                .address(requestDTO.getAddress())
                .city(requestDTO.getCity())
                .country(requestDTO.getCountry())
                .phoneNumber(requestDTO.getPhoneNumber())
                .email(requestDTO.getEmail())
                .website(requestDTO.getWebsite())
                .contactPersonName(requestDTO.getContactPersonName())
                .contactPersonPhone(requestDTO.getContactPersonPhone())
                .contactPersonEmail(requestDTO.getContactPersonEmail())
                .paymentBankName(requestDTO.getPaymentBankName())
                .paymentAccountNumber(requestDTO.getPaymentAccountNumber())
                .paymentIban(requestDTO.getPaymentIban())
                .paymentSwiftCode(requestDTO.getPaymentSwiftCode())
                .notes(requestDTO.getNotes())
                .isActive(requestDTO.getIsActive() != null ? requestDTO.getIsActive() : true)
                .createdBy(createdBy)
                .build();

        FinancialInstitution saved = institutionRepository.save(institution);
        log.info("Created financial institution: {} with number {}", saved.getName(), saved.getInstitutionNumber());

        return enrichResponse(FinancialInstitutionResponseDTO.fromEntity(saved));
    }

    /**
     * Get institution by ID
     */
    @Transactional(readOnly = true)
    public FinancialInstitutionResponseDTO getById(UUID id) {
        FinancialInstitution institution = institutionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Financial institution not found with ID: " + id));
        return enrichResponse(FinancialInstitutionResponseDTO.fromEntity(institution));
    }

    /**
     * Get all institutions
     */
    @Transactional(readOnly = true)
    public List<FinancialInstitutionResponseDTO> getAll() {
        return institutionRepository.findAllByOrderByNameAsc().stream()
                .map(FinancialInstitutionResponseDTO::fromEntity)
                .map(this::enrichResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get active institutions (for dropdowns)
     */
    @Transactional(readOnly = true)
    public List<FinancialInstitutionResponseDTO> getActiveInstitutions() {
        return institutionRepository.findByIsActiveTrueOrderByNameAsc().stream()
                .map(FinancialInstitutionResponseDTO::fromEntity)
                .map(this::enrichResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get institutions by type
     */
    @Transactional(readOnly = true)
    public List<FinancialInstitutionResponseDTO> getByType(InstitutionType type) {
        return institutionRepository.findByInstitutionType(type).stream()
                .map(FinancialInstitutionResponseDTO::fromEntity)
                .map(this::enrichResponse)
                .collect(Collectors.toList());
    }

    /**
     * Update institution
     */
    public FinancialInstitutionResponseDTO update(UUID id, FinancialInstitutionRequestDTO requestDTO) {
        log.info("Updating financial institution: {}", id);

        FinancialInstitution institution = institutionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Financial institution not found with ID: " + id));

        // Check name uniqueness if changed
        if (!institution.getName().equals(requestDTO.getName()) &&
                institutionRepository.existsByName(requestDTO.getName())) {
            throw new IllegalArgumentException("Financial institution with name '" + requestDTO.getName() + "' already exists");
        }

        // Update fields
        institution.setName(requestDTO.getName());
        institution.setInstitutionType(requestDTO.getInstitutionType());
        institution.setRegistrationNumber(requestDTO.getRegistrationNumber());
        institution.setAddress(requestDTO.getAddress());
        institution.setCity(requestDTO.getCity());
        institution.setCountry(requestDTO.getCountry());
        institution.setPhoneNumber(requestDTO.getPhoneNumber());
        institution.setEmail(requestDTO.getEmail());
        institution.setWebsite(requestDTO.getWebsite());
        institution.setContactPersonName(requestDTO.getContactPersonName());
        institution.setContactPersonPhone(requestDTO.getContactPersonPhone());
        institution.setContactPersonEmail(requestDTO.getContactPersonEmail());
        institution.setPaymentBankName(requestDTO.getPaymentBankName());
        institution.setPaymentAccountNumber(requestDTO.getPaymentAccountNumber());
        institution.setPaymentIban(requestDTO.getPaymentIban());
        institution.setPaymentSwiftCode(requestDTO.getPaymentSwiftCode());
        institution.setNotes(requestDTO.getNotes());

        if (requestDTO.getIsActive() != null) {
            institution.setIsActive(requestDTO.getIsActive());
        }

        FinancialInstitution updated = institutionRepository.save(institution);
        log.info("Updated financial institution: {}", updated.getName());

        return enrichResponse(FinancialInstitutionResponseDTO.fromEntity(updated));
    }

    /**
     * Deactivate institution
     */
    public FinancialInstitutionResponseDTO deactivate(UUID id) {
        log.info("Deactivating financial institution: {}", id);

        FinancialInstitution institution = institutionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Financial institution not found with ID: " + id));

        // Check for active loans
        long activeLoans = loanRepository.findByFinancialInstitutionId(id).stream()
                .filter(loan -> loan.getStatus() == CompanyLoanStatus.ACTIVE)
                .count();

        if (activeLoans > 0) {
            throw new IllegalStateException("Cannot deactivate institution with " + activeLoans + " active loans");
        }

        institution.setIsActive(false);
        FinancialInstitution updated = institutionRepository.save(institution);

        return enrichResponse(FinancialInstitutionResponseDTO.fromEntity(updated));
    }

    /**
     * Delete institution (only if no loans)
     */
    public void delete(UUID id) {
        log.info("Deleting financial institution: {}", id);

        FinancialInstitution institution = institutionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Financial institution not found with ID: " + id));

        long totalLoans = loanRepository.findByFinancialInstitutionId(id).size();
        if (totalLoans > 0) {
            throw new IllegalStateException("Cannot delete institution with existing loans. Deactivate instead.");
        }

        institutionRepository.delete(institution);
        log.info("Deleted financial institution: {}", institution.getName());
    }

    /**
     * Search institutions by name
     */
    @Transactional(readOnly = true)
    public List<FinancialInstitutionResponseDTO> searchByName(String name) {
        return institutionRepository.findByNameContainingIgnoreCase(name).stream()
                .map(FinancialInstitutionResponseDTO::fromEntity)
                .map(this::enrichResponse)
                .collect(Collectors.toList());
    }

    /**
     * Enrich response with loan counts
     */
    private FinancialInstitutionResponseDTO enrichResponse(FinancialInstitutionResponseDTO dto) {
        List<com.example.backend.models.finance.loans.CompanyLoan> loans =
                loanRepository.findByFinancialInstitutionId(dto.getId());

        dto.setTotalLoans(loans.size());
        dto.setActiveLoans((int) loans.stream()
                .filter(loan -> loan.getStatus() == CompanyLoanStatus.ACTIVE)
                .count());

        return dto;
    }
}