package com.example.backend.services.payroll;

import com.example.backend.dto.payroll.DeductionTypeDTO;
import com.example.backend.models.payroll.DeductionType;
import com.example.backend.repositories.payroll.DeductionTypeRepository;
import com.example.backend.repositories.payroll.EmployeeDeductionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DeductionTypeService {

    private final DeductionTypeRepository deductionTypeRepository;
    private final EmployeeDeductionRepository employeeDeductionRepository;

    /**
     * Get all deduction types
     */
    public List<DeductionTypeDTO> getAllDeductionTypes() {
        log.debug("Getting all deduction types");
        
        List<DeductionType> deductionTypes = deductionTypeRepository.findAll();
        return deductionTypes.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get active deduction types only
     */
    public List<DeductionTypeDTO> getActiveDeductionTypes() {
        log.debug("Getting active deduction types");
        
        List<DeductionType> deductionTypes = deductionTypeRepository.findByIsActiveTrueOrderByName();
        return deductionTypes.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get deduction types by category
     */
    public List<DeductionTypeDTO> getDeductionTypesByCategory(String category) {
        log.debug("Getting deduction types by category: {}", category);
        
        try {
            DeductionType.DeductionTypeEnum typeEnum = DeductionType.DeductionTypeEnum.valueOf(category.toUpperCase());
            List<DeductionType> deductionTypes = deductionTypeRepository.findByTypeOrderByName(typeEnum);
            return deductionTypes.stream()
                    .map(this::convertToDTO)
                    .collect(Collectors.toList());
        } catch (IllegalArgumentException e) {
            log.warn("Invalid deduction type category: {}", category);
            throw new IllegalArgumentException("Invalid deduction type category: " + category);
        }
    }

    /**
     * Get deduction type by ID
     */
    public DeductionTypeDTO getDeductionTypeById(UUID deductionTypeId) {
        log.debug("Getting deduction type by ID: {}", deductionTypeId);
        
        DeductionType deductionType = deductionTypeRepository.findById(deductionTypeId)
                .orElseThrow(() -> new IllegalArgumentException("Deduction type not found with ID: " + deductionTypeId));
        
        return convertToDTO(deductionType);
    }

    /**
     * Create new deduction type
     */
    @Transactional
    public DeductionTypeDTO createDeductionType(DeductionTypeDTO deductionTypeDTO, String createdBy) {
        log.info("Creating new deduction type: {}", deductionTypeDTO.getName());
        
        try {
            // Validate deduction type data
            validateDeductionTypeData(deductionTypeDTO);
            
            // Check if deduction type with same name already exists
            DeductionType existingType = deductionTypeRepository.findByNameIgnoreCase(deductionTypeDTO.getName());
            if (existingType != null) {
                throw new IllegalArgumentException("Deduction type with name '" + deductionTypeDTO.getName() + "' already exists");
            }
            
            // Create deduction type entity
            DeductionType deductionType = DeductionType.builder()
                    .name(deductionTypeDTO.getName())
                    .type(DeductionType.DeductionTypeEnum.valueOf(deductionTypeDTO.getType().toUpperCase()))
                    .isPercentage(deductionTypeDTO.getIsPercentage() != null ? deductionTypeDTO.getIsPercentage() : false)
                    .percentageRate(deductionTypeDTO.getPercentageRate())
                    .fixedAmount(deductionTypeDTO.getFixedAmount())
                    .isMandatory(deductionTypeDTO.getIsMandatory() != null ? deductionTypeDTO.getIsMandatory() : false)
                    .isActive(deductionTypeDTO.getIsActive() != null ? deductionTypeDTO.getIsActive() : true)
                    .description(deductionTypeDTO.getDescription())
                    .createdBy(createdBy)
                    .build();
            
            deductionType = deductionTypeRepository.save(deductionType);
            
            log.info("Deduction type created successfully: {}", deductionType.getId());
            
            return convertToDTO(deductionType);
            
        } catch (Exception e) {
            log.error("Error creating deduction type: {}", e.getMessage());
            throw e;
        }
    }

    /**
     * Update deduction type
     */
    @Transactional
    public DeductionTypeDTO updateDeductionType(UUID deductionTypeId, DeductionTypeDTO deductionTypeDTO) {
        log.info("Updating deduction type: {}", deductionTypeId);
        
        try {
            DeductionType deductionType = deductionTypeRepository.findById(deductionTypeId)
                    .orElseThrow(() -> new IllegalArgumentException("Deduction type not found with ID: " + deductionTypeId));
            
            // Validate updated data
            validateDeductionTypeData(deductionTypeDTO);
            
            // Check for name conflicts (excluding current record)
            if (deductionTypeDTO.getName() != null && !deductionTypeDTO.getName().equals(deductionType.getName())) {
                DeductionType existingType = deductionTypeRepository.findByNameIgnoreCase(deductionTypeDTO.getName());
                if (existingType != null && !existingType.getId().equals(deductionTypeId)) {
                    throw new IllegalArgumentException("Deduction type with name '" + deductionTypeDTO.getName() + "' already exists");
                }
            }
            
            // Update fields
            if (deductionTypeDTO.getName() != null) {
                deductionType.setName(deductionTypeDTO.getName());
            }
            if (deductionTypeDTO.getType() != null) {
                deductionType.setType(DeductionType.DeductionTypeEnum.valueOf(deductionTypeDTO.getType().toUpperCase()));
            }
            if (deductionTypeDTO.getIsPercentage() != null) {
                deductionType.setIsPercentage(deductionTypeDTO.getIsPercentage());
            }
            if (deductionTypeDTO.getPercentageRate() != null) {
                deductionType.setPercentageRate(deductionTypeDTO.getPercentageRate());
            }
            if (deductionTypeDTO.getFixedAmount() != null) {
                deductionType.setFixedAmount(deductionTypeDTO.getFixedAmount());
            }
            if (deductionTypeDTO.getIsMandatory() != null) {
                deductionType.setIsMandatory(deductionTypeDTO.getIsMandatory());
            }
            if (deductionTypeDTO.getIsActive() != null) {
                deductionType.setIsActive(deductionTypeDTO.getIsActive());
            }
            if (deductionTypeDTO.getDescription() != null) {
                deductionType.setDescription(deductionTypeDTO.getDescription());
            }
            
            deductionType = deductionTypeRepository.save(deductionType);
            
            log.info("Deduction type updated successfully: {}", deductionTypeId);
            
            return convertToDTO(deductionType);
            
        } catch (Exception e) {
            log.error("Error updating deduction type {}: {}", deductionTypeId, e.getMessage());
            throw e;
        }
    }

    /**
     * Deactivate deduction type
     */
    @Transactional
    public void deactivateDeductionType(UUID deductionTypeId) {
        log.info("Deactivating deduction type: {}", deductionTypeId);
        
        try {
            DeductionType deductionType = deductionTypeRepository.findById(deductionTypeId)
                    .orElseThrow(() -> new IllegalArgumentException("Deduction type not found with ID: " + deductionTypeId));
            
            // Check if deduction type is being used
            List<com.example.backend.models.payroll.EmployeeDeduction> activeDeductions = 
                employeeDeductionRepository.findActiveDeductionsByType(deductionTypeId, LocalDate.now());
            long activeUsageCount = activeDeductions.size();
            if (activeUsageCount > 0) {
                log.warn("Deduction type {} is being used by {} active employee deductions", deductionTypeId, activeUsageCount);
                // Still allow deactivation but log warning
            }
            
            deductionType.setIsActive(false);
            deductionTypeRepository.save(deductionType);
            
            log.info("Deduction type deactivated successfully: {}", deductionTypeId);
            
        } catch (Exception e) {
            log.error("Error deactivating deduction type {}: {}", deductionTypeId, e.getMessage());
            throw e;
        }
    }

    /**
     * Get deduction statistics
     */
    public Map<String, Object> getDeductionStatistics(LocalDate fromDate, LocalDate toDate) {
        log.debug("Getting deduction statistics from {} to {}", fromDate, toDate);
        
        Map<String, Object> statistics = new java.util.HashMap<>();
        
        try {
            // Get basic counts
            long totalTypes = deductionTypeRepository.count();
            long activeTypes = deductionTypeRepository.findByIsActiveTrueOrderByName().size();
            long mandatoryTypes = deductionTypeRepository.findByIsMandatoryTrueAndIsActiveTrueOrderByName().size();
            
            // Get usage statistics
            List<Object[]> usageStats = employeeDeductionRepository.getDeductionStatistics(toDate);
            
            Map<String, Object> usageByType = new java.util.HashMap<>();
            BigDecimal totalActiveAmount = BigDecimal.ZERO;
            
            for (Object[] stat : usageStats) {
                String typeName = (String) stat[0];
                Long count = (Long) stat[1];
                BigDecimal amount = (BigDecimal) stat[2];
                
                Map<String, Object> typeStats = new java.util.HashMap<>();
                typeStats.put("count", count);
                typeStats.put("totalAmount", amount);
                
                usageByType.put(typeName, typeStats);
                totalActiveAmount = totalActiveAmount.add(amount != null ? amount : BigDecimal.ZERO);
            }
            
            // Compile statistics
            statistics.put("totalDeductionTypes", totalTypes);
            statistics.put("activeDeductionTypes", activeTypes);
            statistics.put("mandatoryDeductionTypes", mandatoryTypes);
            statistics.put("totalActiveAmount", totalActiveAmount);
            statistics.put("usageByType", usageByType);
            statistics.put("generatedAt", LocalDate.now());
            statistics.put("periodFrom", fromDate);
            statistics.put("periodTo", toDate);
            
        } catch (Exception e) {
            log.error("Error generating deduction statistics: {}", e.getMessage());
            statistics.put("error", "Failed to generate statistics");
        }
        
        return statistics;
    }

    /**
     * Export employee deductions for a period
     */
    public List<Map<String, Object>> exportEmployeeDeductions(LocalDate periodStart, LocalDate periodEnd, List<UUID> employeeIds) {
        log.info("Exporting employee deductions from {} to {}", periodStart, periodEnd);
        
        List<Map<String, Object>> exportData = new java.util.ArrayList<>();
        
        try {
            // Get employee deductions for the period
            List<com.example.backend.models.payroll.EmployeeDeduction> deductions;
            
            if (employeeIds != null && !employeeIds.isEmpty()) {
                deductions = employeeDeductionRepository.findActiveDeductionsForEmployees(employeeIds, periodEnd);
            } else {
                deductions = employeeDeductionRepository.findByCreatedAtBetween(periodStart, periodEnd);
            }
            
            // Convert to export format
            for (com.example.backend.models.payroll.EmployeeDeduction deduction : deductions) {
                Map<String, Object> record = new java.util.HashMap<>();
                
                record.put("employeeId", deduction.getEmployee().getId());
                record.put("employeeName", deduction.getEmployee().getFullName());
                record.put("deductionType", deduction.getDeductionType().getName());
                record.put("deductionCategory", deduction.getDeductionType().getType().name());
                record.put("customAmount", deduction.getCustomAmount());
                record.put("customPercentage", deduction.getCustomPercentage());
                record.put("isActive", deduction.getIsActive());
                record.put("effectiveFrom", deduction.getEffectiveFrom());
                record.put("effectiveTo", deduction.getEffectiveTo());
                record.put("createdAt", deduction.getCreatedAt());
                record.put("createdBy", deduction.getCreatedBy());
                
                exportData.add(record);
            }
            
            log.info("Exported {} deduction records", exportData.size());
            
        } catch (Exception e) {
            log.error("Error exporting deduction data: {}", e.getMessage());
        }
        
        return exportData;
    }

    /**
     * Initialize default deduction types
     */
    @Transactional
    public void initializeDefaultDeductionTypes() {
        log.info("Initializing default deduction types");
        
        try {
            // Check if default types already exist
            if (deductionTypeRepository.count() > 0) {
                log.info("Deduction types already exist, skipping initialization");
                return;
            }
            
            // Create default deduction types
            createDefaultDeductionType("Income Tax", DeductionType.DeductionTypeEnum.TAX, true, new BigDecimal("15.0"), null, true);
            createDefaultDeductionType("Social Security", DeductionType.DeductionTypeEnum.SOCIAL_INSURANCE, true, new BigDecimal("6.2"), null, true);
            createDefaultDeductionType("Health Insurance", DeductionType.DeductionTypeEnum.SOCIAL_INSURANCE, false, null, new BigDecimal("150.00"), false);
            createDefaultDeductionType("Late Penalty", DeductionType.DeductionTypeEnum.ATTENDANCE_PENALTY, false, null, new BigDecimal("10.00"), false);
            createDefaultDeductionType("Salary Advance", DeductionType.DeductionTypeEnum.ADVANCE, false, null, null, false);
            createDefaultDeductionType("Loan Repayment", DeductionType.DeductionTypeEnum.LOAN_REPAYMENT, false, null, null, false);
            
            log.info("Default deduction types initialized successfully");
            
        } catch (Exception e) {
            log.error("Error initializing default deduction types: {}", e.getMessage());
        }
    }

    /**
     * Create default deduction type
     */
    private void createDefaultDeductionType(String name, DeductionType.DeductionTypeEnum type, 
                                          boolean isPercentage, BigDecimal percentageRate, 
                                          BigDecimal fixedAmount, boolean isMandatory) {
        DeductionType deductionType = DeductionType.builder()
                .name(name)
                .type(type)
                .isPercentage(isPercentage)
                .percentageRate(percentageRate)
                .fixedAmount(fixedAmount)
                .isMandatory(isMandatory)
                .isActive(true)
                .description("Default " + name.toLowerCase() + " deduction")
                .createdBy("SYSTEM")
                .build();
        
        deductionTypeRepository.save(deductionType);
        log.debug("Created default deduction type: {}", name);
    }

    /**
     * Validate deduction type data
     */
    private void validateDeductionTypeData(DeductionTypeDTO deductionTypeDTO) {
        if (deductionTypeDTO.getName() == null || deductionTypeDTO.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Deduction type name is required");
        }
        
        if (deductionTypeDTO.getType() == null || deductionTypeDTO.getType().trim().isEmpty()) {
            throw new IllegalArgumentException("Deduction type category is required");
        }
        
        // Validate type enum
        try {
            DeductionType.DeductionTypeEnum.valueOf(deductionTypeDTO.getType().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid deduction type category: " + deductionTypeDTO.getType());
        }
        
        // Validate percentage vs fixed amount
        if (deductionTypeDTO.getIsPercentage() != null && deductionTypeDTO.getIsPercentage()) {
            if (deductionTypeDTO.getPercentageRate() == null || deductionTypeDTO.getPercentageRate().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Percentage rate is required for percentage-based deductions");
            }
            if (deductionTypeDTO.getPercentageRate().compareTo(new BigDecimal("100")) > 0) {
                throw new IllegalArgumentException("Percentage rate cannot exceed 100%");
            }
        } else {
            if (deductionTypeDTO.getFixedAmount() != null && deductionTypeDTO.getFixedAmount().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Fixed amount must be greater than zero");
            }
        }
    }

    /**
     * Convert DeductionType entity to DTO
     */
    private DeductionTypeDTO convertToDTO(DeductionType deductionType) {
        return DeductionTypeDTO.builder()
                .id(deductionType.getId())
                .name(deductionType.getName())
                .type(deductionType.getType().name())
                .isPercentage(deductionType.getIsPercentage())
                .percentageRate(deductionType.getPercentageRate())
                .fixedAmount(deductionType.getFixedAmount())
                .isMandatory(deductionType.getIsMandatory())
                .isActive(deductionType.getIsActive())
                .description(deductionType.getDescription())
                .createdAt(deductionType.getCreatedAt())
                .updatedAt(deductionType.getUpdatedAt())
                .createdBy(deductionType.getCreatedBy())
                .build();
    }
}