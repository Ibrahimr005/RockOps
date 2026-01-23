package com.example.backend.services.payroll;

import com.example.backend.dto.payroll.DeductionTypeDTO;
import com.example.backend.exceptions.ResourceAlreadyExistsException;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.payroll.DeductionType;
import com.example.backend.models.site.Site;
import com.example.backend.repositories.payroll.DeductionTypeRepository;
import com.example.backend.repositories.site.SiteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for managing deduction types
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DeductionTypeService {

    private final DeductionTypeRepository deductionTypeRepository;
    private final SiteRepository siteRepository;

    /**
     * Get all active deduction types
     */
    public List<DeductionTypeDTO> getAllActiveDeductionTypes() {
        return deductionTypeRepository.findAllActiveOrdered().stream()
            .map(DeductionTypeDTO::fromEntity)
            .collect(Collectors.toList());
    }

    /**
     * Get active deduction types for a site
     */
    public List<DeductionTypeDTO> getDeductionTypesForSite(UUID siteId) {
        return deductionTypeRepository.findActiveForSite(siteId).stream()
            .map(DeductionTypeDTO::fromEntity)
            .collect(Collectors.toList());
    }

    /**
     * Get deduction type by ID
     */
    public DeductionTypeDTO getById(UUID id) {
        DeductionType deductionType = deductionTypeRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Deduction type not found: " + id));
        return DeductionTypeDTO.fromEntity(deductionType);
    }

    /**
     * Get deduction types by category
     */
    public List<DeductionTypeDTO> getByCategory(DeductionType.DeductionCategory category) {
        return deductionTypeRepository.findByCategoryAndIsActiveTrue(category).stream()
            .map(DeductionTypeDTO::fromEntity)
            .collect(Collectors.toList());
    }

    /**
     * Create a new deduction type
     */
    @Transactional
    public DeductionTypeDTO create(DeductionTypeDTO dto, String createdBy) {
        log.info("Creating deduction type: {} by {}", dto.getName(), createdBy);

        // Check for duplicate code
        if (deductionTypeRepository.existsByCode(dto.getCode())) {
            throw new ResourceAlreadyExistsException("Deduction type with code '" + dto.getCode() + "' already exists");
        }

        // Check for duplicate name in site
        if (dto.getSiteId() != null && deductionTypeRepository.existsByNameAndSiteId(dto.getName(), dto.getSiteId())) {
            throw new ResourceAlreadyExistsException("Deduction type with name '" + dto.getName() + "' already exists for this site");
        }

        DeductionType deductionType = new DeductionType();
        deductionType.setCode(dto.getCode().toUpperCase());
        deductionType.setName(dto.getName());
        deductionType.setDescription(dto.getDescription());
        deductionType.setCategory(dto.getCategory());
        deductionType.setIsSystemDefined(false);
        deductionType.setIsActive(true);
        deductionType.setIsTaxable(dto.getIsTaxable() != null ? dto.getIsTaxable() : false);
        deductionType.setShowOnPayslip(dto.getShowOnPayslip() != null ? dto.getShowOnPayslip() : true);
        deductionType.setIsMandatory(false);
        deductionType.setIsPercentage(false);
        deductionType.setCreatedBy(createdBy);

        // Set site if provided
        if (dto.getSiteId() != null) {
            Site site = siteRepository.findById(dto.getSiteId())
                .orElseThrow(() -> new ResourceNotFoundException("Site not found: " + dto.getSiteId()));
            deductionType.setSite(site);
        }

        DeductionType saved = deductionTypeRepository.save(deductionType);
        log.info("Created deduction type: {} with ID: {}", saved.getName(), saved.getId());

        return DeductionTypeDTO.fromEntity(saved);
    }

    /**
     * Update a deduction type
     */
    @Transactional
    public DeductionTypeDTO update(UUID id, DeductionTypeDTO dto, String updatedBy) {
        log.info("Updating deduction type: {} by {}", id, updatedBy);

        DeductionType existing = deductionTypeRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Deduction type not found: " + id));

        // Cannot modify system-defined types (except active status)
        if (existing.getIsSystemDefined() && !dto.getName().equals(existing.getName())) {
            throw new IllegalStateException("Cannot modify system-defined deduction types");
        }

        // Check for duplicate code if changed
        if (!existing.getCode().equals(dto.getCode()) && deductionTypeRepository.existsByCode(dto.getCode())) {
            throw new ResourceAlreadyExistsException("Deduction type with code '" + dto.getCode() + "' already exists");
        }

        existing.setCode(dto.getCode().toUpperCase());
        existing.setName(dto.getName());
        existing.setDescription(dto.getDescription());
        existing.setCategory(dto.getCategory());
        existing.setIsTaxable(dto.getIsTaxable());
        existing.setShowOnPayslip(dto.getShowOnPayslip());
        existing.setUpdatedBy(updatedBy);

        DeductionType saved = deductionTypeRepository.save(existing);
        log.info("Updated deduction type: {}", saved.getId());

        return DeductionTypeDTO.fromEntity(saved);
    }

    /**
     * Deactivate a deduction type
     */
    @Transactional
    public void deactivate(UUID id, String updatedBy) {
        log.info("Deactivating deduction type: {} by {}", id, updatedBy);

        DeductionType existing = deductionTypeRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Deduction type not found: " + id));

        if (existing.getIsSystemDefined()) {
            throw new IllegalStateException("Cannot deactivate system-defined deduction types");
        }

        existing.setIsActive(false);
        existing.setUpdatedBy(updatedBy);
        deductionTypeRepository.save(existing);

        log.info("Deactivated deduction type: {}", id);
    }

    /**
     * Reactivate a deduction type
     */
    @Transactional
    public void reactivate(UUID id, String updatedBy) {
        log.info("Reactivating deduction type: {} by {}", id, updatedBy);

        DeductionType existing = deductionTypeRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Deduction type not found: " + id));

        existing.setIsActive(true);
        existing.setUpdatedBy(updatedBy);
        deductionTypeRepository.save(existing);

        log.info("Reactivated deduction type: {}", id);
    }

    /**
     * Initialize system-defined deduction types (called at startup)
     */
    @Transactional
    public void initializeSystemDeductionTypes() {
        log.info("Initializing system-defined deduction types");

        createSystemTypeIfNotExists("TAX", "Income Tax", "Statutory income tax deduction",
            DeductionType.DeductionCategory.STATUTORY, true);
        createSystemTypeIfNotExists("SSEC", "Social Security", "Social security contribution",
            DeductionType.DeductionCategory.STATUTORY, false);
        createSystemTypeIfNotExists("HLTH", "Health Insurance", "Health insurance premium",
            DeductionType.DeductionCategory.BENEFITS, false);
        createSystemTypeIfNotExists("LIFE", "Life Insurance", "Life insurance premium",
            DeductionType.DeductionCategory.BENEFITS, false);
        createSystemTypeIfNotExists("PENS", "Pension", "Pension contribution",
            DeductionType.DeductionCategory.BENEFITS, false);
        createSystemTypeIfNotExists("LOAN", "Loan Repayment", "Employee loan repayment",
            DeductionType.DeductionCategory.LOANS, false);
        createSystemTypeIfNotExists("ADVS", "Salary Advance", "Salary advance deduction",
            DeductionType.DeductionCategory.LOANS, false);
        createSystemTypeIfNotExists("UNON", "Union Dues", "Trade union membership dues",
            DeductionType.DeductionCategory.VOLUNTARY, false);

        log.info("System deduction types initialized");
    }

    private void createSystemTypeIfNotExists(String code, String name, String description,
                                              DeductionType.DeductionCategory category, boolean isTaxable) {
        if (!deductionTypeRepository.existsByCode(code)) {
            DeductionType deductionType = DeductionType.builder()
                .code(code)
                .name(name)
                .description(description)
                .category(category)
                .isSystemDefined(true)
                .isActive(true)
                .isTaxable(isTaxable)
                .showOnPayslip(true)
                .isMandatory(false)
                .isPercentage(false)
                .createdBy("SYSTEM")
                .build();
            deductionTypeRepository.save(deductionType);
            log.info("Created system deduction type: {}", code);
        }
    }
}
