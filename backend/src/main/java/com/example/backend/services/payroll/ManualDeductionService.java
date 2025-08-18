package com.example.backend.services.payroll;

import com.example.backend.dto.payroll.EmployeeDeductionDTO;
import com.example.backend.dto.payroll.CreateManualDeductionRequest;
import com.example.backend.dto.payroll.UpdateManualDeductionRequest;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.payroll.DeductionType;
import com.example.backend.models.payroll.EmployeeDeduction;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.payroll.DeductionTypeRepository;
import com.example.backend.repositories.payroll.EmployeeDeductionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ManualDeductionService {

    private final EmployeeDeductionRepository employeeDeductionRepository;
    private final EmployeeRepository employeeRepository;
    private final DeductionTypeRepository deductionTypeRepository;

    /**
     * Create a new manual deduction for an employee
     */
    @Transactional
    public EmployeeDeductionDTO createManualDeduction(CreateManualDeductionRequest request, String createdBy) {
        log.info("Creating manual deduction for employee: {}", request.getEmployeeId());

        try {
            // Validate employee exists
            Employee employee = employeeRepository.findById(request.getEmployeeId())
                    .orElseThrow(() -> new IllegalArgumentException("Employee not found with ID: " + request.getEmployeeId()));

            // Validate deduction type exists
            DeductionType deductionType = deductionTypeRepository.findById(request.getDeductionTypeId())
                    .orElseThrow(() -> new IllegalArgumentException("Deduction type not found with ID: " + request.getDeductionTypeId()));

            // Validate deduction amount/percentage
            validateDeductionAmount(request);

            // Validate effective dates
            validateEffectiveDates(request.getEffectiveFrom(), request.getEffectiveTo());

            // Check for overlapping deductions of same type
            validateNoOverlappingDeductions(employee.getId(), deductionType.getId(), 
                                          request.getEffectiveFrom(), request.getEffectiveTo());

            // Create employee deduction
            EmployeeDeduction employeeDeduction = EmployeeDeduction.builder()
                    .employee(employee)
                    .deductionType(deductionType)
                    .customAmount(request.getCustomAmount())
                    .customPercentage(request.getCustomPercentage())
                    .isActive(true)
                    .effectiveFrom(request.getEffectiveFrom())
                    .effectiveTo(request.getEffectiveTo())
                    .createdBy(createdBy)
                    .build();

            employeeDeduction = employeeDeductionRepository.save(employeeDeduction);

            log.info("Manual deduction created successfully: {} for employee: {}", 
                    employeeDeduction.getId(), employee.getFullName());

            return convertToDTO(employeeDeduction);

        } catch (Exception e) {
            log.error("Error creating manual deduction for employee {}: {}", request.getEmployeeId(), e.getMessage());
            throw e;
        }
    }

    /**
     * Get manual deduction by ID
     */
    public EmployeeDeductionDTO getManualDeductionById(UUID deductionId) {
        log.debug("Getting manual deduction by ID: {}", deductionId);

        EmployeeDeduction deduction = employeeDeductionRepository.findById(deductionId)
                .orElseThrow(() -> new IllegalArgumentException("Manual deduction not found with ID: " + deductionId));

        return convertToDTO(deduction);
    }

    /**
     * Get all manual deductions for an employee
     */
    public List<EmployeeDeductionDTO> getEmployeeManualDeductions(UUID employeeId) {
        log.debug("Getting manual deductions for employee: {}", employeeId);

        // Validate employee exists
        if (!employeeRepository.existsById(employeeId)) {
            throw new IllegalArgumentException("Employee not found with ID: " + employeeId);
        }

        List<EmployeeDeduction> deductions = employeeDeductionRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId);

        return deductions.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get active manual deductions for an employee on a specific date
     */
    public List<EmployeeDeductionDTO> getActiveEmployeeDeductions(UUID employeeId, LocalDate asOfDate) {
        log.debug("Getting active manual deductions for employee: {} as of: {}", employeeId, asOfDate);

        List<EmployeeDeduction> deductions = employeeDeductionRepository
                .findActiveDeductionsForEmployee(employeeId, asOfDate);

        return deductions.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get all manual deductions with pagination
     */
    public Page<EmployeeDeductionDTO> getAllManualDeductions(Pageable pageable) {
        log.debug("Getting all manual deductions with pagination");

        return employeeDeductionRepository.findAll(pageable)
                .map(this::convertToDTO);
    }

    /**
     * Update manual deduction
     */
    @Transactional
    public EmployeeDeductionDTO updateManualDeduction(UUID deductionId, UpdateManualDeductionRequest request) {
        log.info("Updating manual deduction: {}", deductionId);

        try {
            EmployeeDeduction deduction = employeeDeductionRepository.findById(deductionId)
                    .orElseThrow(() -> new IllegalArgumentException("Manual deduction not found with ID: " + deductionId));

            // Update deduction type if provided
            if (request.getDeductionTypeId() != null) {
                DeductionType deductionType = deductionTypeRepository.findById(request.getDeductionTypeId())
                        .orElseThrow(() -> new IllegalArgumentException("Deduction type not found with ID: " + request.getDeductionTypeId()));
                deduction.setDeductionType(deductionType);
            }

            // Update amounts if provided
            if (request.getCustomAmount() != null) {
                deduction.setCustomAmount(request.getCustomAmount());
                deduction.setCustomPercentage(null); // Clear percentage if amount is set
            } else if (request.getCustomPercentage() != null) {
                deduction.setCustomPercentage(request.getCustomPercentage());
                deduction.setCustomAmount(null); // Clear amount if percentage is set
            }

            // Update effective dates if provided
            if (request.getEffectiveFrom() != null) {
                deduction.setEffectiveFrom(request.getEffectiveFrom());
            }
            if (request.getEffectiveTo() != null) {
                deduction.setEffectiveTo(request.getEffectiveTo());
            }

            // Update active status if provided
            if (request.getIsActive() != null) {
                deduction.setIsActive(request.getIsActive());
            }

            // Validate updated data
            validateEffectiveDates(deduction.getEffectiveFrom(), deduction.getEffectiveTo());

            deduction = employeeDeductionRepository.save(deduction);

            log.info("Manual deduction updated successfully: {}", deductionId);

            return convertToDTO(deduction);

        } catch (Exception e) {
            log.error("Error updating manual deduction {}: {}", deductionId, e.getMessage());
            throw e;
        }
    }

    /**
     * Deactivate manual deduction
     */
    @Transactional
    public void deactivateManualDeduction(UUID deductionId) {
        log.info("Deactivating manual deduction: {}", deductionId);

        try {
            EmployeeDeduction deduction = employeeDeductionRepository.findById(deductionId)
                    .orElseThrow(() -> new IllegalArgumentException("Manual deduction not found with ID: " + deductionId));

            deduction.setIsActive(false);
            deduction.setEffectiveTo(LocalDate.now()); // End the deduction today

            employeeDeductionRepository.save(deduction);

            log.info("Manual deduction deactivated successfully: {}", deductionId);

        } catch (Exception e) {
            log.error("Error deactivating manual deduction {}: {}", deductionId, e.getMessage());
            throw e;
        }
    }

    /**
     * Delete manual deduction (hard delete)
     */
    @Transactional
    public void deleteManualDeduction(UUID deductionId) {
        log.info("Deleting manual deduction: {}", deductionId);

        try {
            if (!employeeDeductionRepository.existsById(deductionId)) {
                throw new IllegalArgumentException("Manual deduction not found with ID: " + deductionId);
            }

            employeeDeductionRepository.deleteById(deductionId);

            log.info("Manual deduction deleted successfully: {}", deductionId);

        } catch (Exception e) {
            log.error("Error deleting manual deduction {}: {}", deductionId, e.getMessage());
            throw e;
        }
    }

    /**
     * Get deduction summary for an employee in a specific period
     */
    public java.util.Map<String, Object> getEmployeeDeductionSummary(UUID employeeId, 
                                                                    LocalDate periodStart, 
                                                                    LocalDate periodEnd) {
        log.debug("Getting deduction summary for employee: {} from {} to {}", employeeId, periodStart, periodEnd);

        java.util.Map<String, Object> summary = new java.util.HashMap<>();

        try {
            // Get active deductions in the period
            List<EmployeeDeduction> activeDeductions = employeeDeductionRepository
                    .findActiveDeductionsInPeriod(employeeId, periodStart, periodEnd);

            // Calculate totals by type
            java.util.Map<String, BigDecimal> deductionsByType = new java.util.HashMap<>();
            BigDecimal totalFixedAmount = BigDecimal.ZERO;
            BigDecimal totalPercentage = BigDecimal.ZERO;

            for (EmployeeDeduction deduction : activeDeductions) {
                String typeName = deduction.getDeductionType().getName();
                
                if (deduction.getCustomAmount() != null) {
                    totalFixedAmount = totalFixedAmount.add(deduction.getCustomAmount());
                    deductionsByType.merge(typeName, deduction.getCustomAmount(), BigDecimal::add);
                } else if (deduction.getCustomPercentage() != null) {
                    totalPercentage = totalPercentage.add(deduction.getCustomPercentage());
                    deductionsByType.merge(typeName + " (%)", deduction.getCustomPercentage(), BigDecimal::add);
                }
            }

            summary.put("employeeId", employeeId);
            summary.put("periodStart", periodStart);
            summary.put("periodEnd", periodEnd);
            summary.put("totalActiveDeductions", activeDeductions.size());
            summary.put("totalFixedAmount", totalFixedAmount);
            summary.put("totalPercentage", totalPercentage);
            summary.put("deductionsByType", deductionsByType);
            summary.put("deductions", activeDeductions.stream().map(this::convertToDTO).collect(Collectors.toList()));

        } catch (Exception e) {
            log.error("Error creating deduction summary for employee {}: {}", employeeId, e.getMessage());
            summary.put("error", "Failed to calculate deduction summary");
        }

        return summary;
    }

    /**
     * Validate deduction amount or percentage
     */
    private void validateDeductionAmount(CreateManualDeductionRequest request) {
        if (request.getCustomAmount() == null && request.getCustomPercentage() == null) {
            throw new IllegalArgumentException("Either custom amount or custom percentage must be provided");
        }

        if (request.getCustomAmount() != null && request.getCustomPercentage() != null) {
            throw new IllegalArgumentException("Cannot specify both custom amount and custom percentage");
        }

        if (request.getCustomAmount() != null && request.getCustomAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Custom amount must be greater than zero");
        }

        if (request.getCustomPercentage() != null) {
            if (request.getCustomPercentage().compareTo(BigDecimal.ZERO) <= 0 || 
                request.getCustomPercentage().compareTo(new BigDecimal("100")) > 0) {
                throw new IllegalArgumentException("Custom percentage must be between 0 and 100");
            }
        }
    }

    /**
     * Validate effective dates
     */
    private void validateEffectiveDates(LocalDate effectiveFrom, LocalDate effectiveTo) {
        if (effectiveFrom == null) {
            throw new IllegalArgumentException("Effective from date is required");
        }

        if (effectiveTo != null && effectiveTo.isBefore(effectiveFrom)) {
            throw new IllegalArgumentException("Effective to date cannot be before effective from date");
        }

        if (effectiveFrom.isBefore(LocalDate.now().minusYears(1))) {
            throw new IllegalArgumentException("Effective from date cannot be more than 1 year in the past");
        }
    }

    /**
     * Validate no overlapping deductions of same type
     */
    private void validateNoOverlappingDeductions(UUID employeeId, UUID deductionTypeId, 
                                                LocalDate effectiveFrom, LocalDate effectiveTo) {
        List<EmployeeDeduction> overlappingDeductions = employeeDeductionRepository
                .findOverlappingDeductions(employeeId, deductionTypeId, effectiveFrom, effectiveTo);

        if (!overlappingDeductions.isEmpty()) {
            throw new IllegalArgumentException("Employee already has an overlapping deduction of this type for the specified period");
        }
    }

    /**
     * Convert EmployeeDeduction entity to DTO
     */
    private EmployeeDeductionDTO convertToDTO(EmployeeDeduction deduction) {
        return EmployeeDeductionDTO.builder()
                .id(deduction.getId())
                .employeeId(deduction.getEmployee().getId())
                .employeeName(deduction.getEmployee().getFullName())
                .deductionTypeId(deduction.getDeductionType().getId())
                .deductionTypeName(deduction.getDeductionType().getName())
                .deductionTypeCategory(deduction.getDeductionType().getType().name())
                .customAmount(deduction.getCustomAmount())
                .customPercentage(deduction.getCustomPercentage())
                .isActive(deduction.getIsActive())
                .effectiveFrom(deduction.getEffectiveFrom())
                .effectiveTo(deduction.getEffectiveTo())
                .createdAt(deduction.getCreatedAt())
                .updatedAt(deduction.getUpdatedAt())
                .createdBy(deduction.getCreatedBy())
                .build();
    }
}