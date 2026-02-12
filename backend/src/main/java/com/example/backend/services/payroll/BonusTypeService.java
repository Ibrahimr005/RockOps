package com.example.backend.services.payroll;

import com.example.backend.dto.payroll.BonusTypeDTO;
import com.example.backend.exceptions.ResourceAlreadyExistsException;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.payroll.BonusType;
import com.example.backend.models.site.Site;
import com.example.backend.repositories.payroll.BonusRepository;
import com.example.backend.repositories.payroll.BonusTypeRepository;
import com.example.backend.repositories.site.SiteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for managing bonus types
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BonusTypeService {

    private final BonusTypeRepository bonusTypeRepository;
    private final BonusRepository bonusRepository;
    private final SiteRepository siteRepository;

    /**
     * Get all bonus types for a site
     */
    public List<BonusTypeDTO> getAllBonusTypes(UUID siteId) {
        return bonusTypeRepository.findBySiteId(siteId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get active bonus types for a site
     */
    public List<BonusTypeDTO> getActiveBonusTypes(UUID siteId) {
        return bonusTypeRepository.findBySiteIdAndIsActiveTrue(siteId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get bonus type by ID
     */
    public BonusTypeDTO getById(UUID id) {
        BonusType bonusType = bonusTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bonus type not found: " + id));
        return mapToDTO(bonusType);
    }

    /**
     * Create a new bonus type
     */
    @Transactional
    public BonusTypeDTO create(BonusTypeDTO dto, UUID siteId, String createdBy) {
        log.info("Creating bonus type: {} by {}", dto.getName(), createdBy);

        // Validate unique code per site
        if (bonusTypeRepository.existsByCodeAndSiteId(dto.getCode().toUpperCase(), siteId)) {
            throw new ResourceAlreadyExistsException(
                    "Bonus type with code '" + dto.getCode() + "' already exists for this site");
        }

        Site site = siteRepository.findById(siteId)
                .orElseThrow(() -> new ResourceNotFoundException("Site not found: " + siteId));

        BonusType bonusType = BonusType.builder()
                .code(dto.getCode().toUpperCase())
                .name(dto.getName())
                .description(dto.getDescription())
                .isActive(true)
                .site(site)
                .createdBy(createdBy)
                .build();

        BonusType saved = bonusTypeRepository.save(bonusType);
        log.info("Created bonus type: {} with ID: {}", saved.getName(), saved.getId());

        return mapToDTO(saved);
    }

    /**
     * Update a bonus type
     */
    @Transactional
    public BonusTypeDTO update(UUID id, BonusTypeDTO dto, String updatedBy) {
        log.info("Updating bonus type: {} by {}", id, updatedBy);

        BonusType existing = bonusTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bonus type not found: " + id));

        // Check for duplicate code if changed
        if (!existing.getCode().equalsIgnoreCase(dto.getCode())) {
            if (bonusTypeRepository.existsByCodeAndSiteId(dto.getCode().toUpperCase(), existing.getSite().getId())) {
                throw new ResourceAlreadyExistsException(
                        "Bonus type with code '" + dto.getCode() + "' already exists for this site");
            }
        }

        existing.setCode(dto.getCode().toUpperCase());
        existing.setName(dto.getName());
        existing.setDescription(dto.getDescription());
        existing.setUpdatedBy(updatedBy);

        BonusType saved = bonusTypeRepository.save(existing);
        log.info("Updated bonus type: {}", saved.getId());

        return mapToDTO(saved);
    }

    /**
     * Deactivate a bonus type (soft delete)
     */
    @Transactional
    public void deactivate(UUID id, String updatedBy) {
        log.info("Deactivating bonus type: {} by {}", id, updatedBy);

        BonusType existing = bonusTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bonus type not found: " + id));

        // Check for active bonuses using this type
        if (!bonusRepository.findActiveBonusesByBonusTypeId(id).isEmpty()) {
            throw new IllegalStateException(
                    "Cannot deactivate bonus type with active bonuses. Cancel or complete bonuses first.");
        }

        existing.setIsActive(false);
        existing.setUpdatedBy(updatedBy);
        bonusTypeRepository.save(existing);

        log.info("Deactivated bonus type: {}", id);
    }

    // ========================================
    // HELPER METHODS
    // ========================================

    private BonusTypeDTO mapToDTO(BonusType entity) {
        return BonusTypeDTO.builder()
                .id(entity.getId())
                .code(entity.getCode())
                .name(entity.getName())
                .description(entity.getDescription())
                .isActive(entity.getIsActive())
                .build();
    }
}
