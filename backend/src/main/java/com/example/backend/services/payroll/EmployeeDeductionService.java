package com.example.backend.services.payroll;

import com.example.backend.dto.payroll.EmployeeDeductionDTO;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.payroll.DeductionType;
import com.example.backend.models.payroll.EmployeeDeduction;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.payroll.DeductionTypeRepository;
import com.example.backend.repositories.payroll.EmployeeDeductionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for managing employee deductions
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmployeeDeductionService {

    private final EmployeeDeductionRepository employeeDeductionRepository;
    private final DeductionTypeRepository deductionTypeRepository;
    private final EmployeeRepository employeeRepository;

    /**
     * Get all deductions for an employee
     */
    public List<EmployeeDeductionDTO> getDeductionsByEmployee(UUID employeeId) {
        return employeeDeductionRepository.findByEmployeeIdOrderByPriorityAsc(employeeId).stream()
            .map(EmployeeDeductionDTO::fromEntity)
            .collect(Collectors.toList());
    }

    /**
     * Get active deductions for an employee
     */
    public List<EmployeeDeductionDTO> getActiveDeductionsByEmployee(UUID employeeId) {
        return employeeDeductionRepository.findActiveByEmployeeId(employeeId).stream()
            .map(EmployeeDeductionDTO::fromEntity)
            .collect(Collectors.toList());
    }

    /**
     * Get deduction by ID
     */
    public EmployeeDeductionDTO getById(UUID id) {
        EmployeeDeduction deduction = employeeDeductionRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Employee deduction not found: " + id));
        return EmployeeDeductionDTO.fromEntity(deduction);
    }

    /**
     * Get deductions active for a payroll period
     */
    public List<EmployeeDeductionDTO> getDeductionsForPayrollPeriod(UUID employeeId,
                                                                     LocalDate periodStart,
                                                                     LocalDate periodEnd) {
        return employeeDeductionRepository.findActiveForPayrollPeriod(employeeId, periodStart, periodEnd).stream()
            .map(EmployeeDeductionDTO::fromEntity)
            .collect(Collectors.toList());
    }

    /**
     * Create a new employee deduction
     */
    @Transactional
    public EmployeeDeductionDTO create(EmployeeDeductionDTO dto, String createdBy) {
        log.info("Creating employee deduction for employee {} by {}", dto.getEmployeeId(), createdBy);

        Employee employee = employeeRepository.findById(dto.getEmployeeId())
            .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + dto.getEmployeeId()));

        DeductionType deductionType = deductionTypeRepository.findById(dto.getDeductionTypeId())
            .orElseThrow(() -> new ResourceNotFoundException("Deduction type not found: " + dto.getDeductionTypeId()));

        // Generate deduction number using deduction type code
        String deductionNumber = generateDeductionNumber(deductionType);

        EmployeeDeduction deduction = EmployeeDeduction.builder()
            .deductionNumber(deductionNumber)
            .employee(employee)
            .deductionType(deductionType)
            .customName(dto.getCustomName())
            .description(dto.getDescription())
            .amount(dto.getAmount())
            .calculationMethod(dto.getCalculationMethod() != null
                ? dto.getCalculationMethod()
                : EmployeeDeduction.CalculationMethod.FIXED_AMOUNT)
            .percentageValue(dto.getPercentageValue())
            .maxAmount(dto.getMaxAmount())
            .frequency(dto.getFrequency() != null
                ? dto.getFrequency()
                : EmployeeDeduction.DeductionFrequency.MONTHLY)
            .effectiveStartDate(dto.getEffectiveStartDate())
            .effectiveEndDate(dto.getEffectiveEndDate())
            .isActive(true)
            .referenceId(dto.getReferenceId())
            .referenceType(dto.getReferenceType())
            .priority(dto.getPriority() != null ? dto.getPriority() : 100)
            .createdBy(createdBy)
            .build();

        EmployeeDeduction saved = employeeDeductionRepository.save(deduction);
        log.info("Created employee deduction: {} for employee {}", saved.getDeductionNumber(), employee.getId());

        return EmployeeDeductionDTO.fromEntity(saved);
    }

    /**
     * Update an employee deduction
     */
    @Transactional
    public EmployeeDeductionDTO update(UUID id, EmployeeDeductionDTO dto, String updatedBy) {
        log.info("Updating employee deduction: {} by {}", id, updatedBy);

        EmployeeDeduction existing = employeeDeductionRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Employee deduction not found: " + id));

        // Update deduction type if changed
        if (dto.getDeductionTypeId() != null && !dto.getDeductionTypeId().equals(existing.getDeductionType().getId())) {
            DeductionType deductionType = deductionTypeRepository.findById(dto.getDeductionTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Deduction type not found: " + dto.getDeductionTypeId()));
            existing.setDeductionType(deductionType);
        }

        existing.setCustomName(dto.getCustomName());
        existing.setDescription(dto.getDescription());
        existing.setAmount(dto.getAmount());
        existing.setCalculationMethod(dto.getCalculationMethod());
        existing.setPercentageValue(dto.getPercentageValue());
        existing.setMaxAmount(dto.getMaxAmount());
        existing.setFrequency(dto.getFrequency());
        existing.setEffectiveStartDate(dto.getEffectiveStartDate());
        existing.setEffectiveEndDate(dto.getEffectiveEndDate());
        existing.setPriority(dto.getPriority());
        existing.setUpdatedBy(updatedBy);

        EmployeeDeduction saved = employeeDeductionRepository.save(existing);
        log.info("Updated employee deduction: {}", saved.getId());

        return EmployeeDeductionDTO.fromEntity(saved);
    }

    /**
     * Deactivate an employee deduction
     */
    @Transactional
    public void deactivate(UUID id, String updatedBy) {
        log.info("Deactivating employee deduction: {} by {}", id, updatedBy);

        EmployeeDeduction existing = employeeDeductionRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Employee deduction not found: " + id));

        existing.deactivate(updatedBy);
        employeeDeductionRepository.save(existing);

        log.info("Deactivated employee deduction: {}", id);
    }

    /**
     * Reactivate an employee deduction
     */
    @Transactional
    public void reactivate(UUID id, String updatedBy) {
        log.info("Reactivating employee deduction: {} by {}", id, updatedBy);

        EmployeeDeduction existing = employeeDeductionRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Employee deduction not found: " + id));

        existing.setIsActive(true);
        existing.setEffectiveEndDate(null);
        existing.setUpdatedBy(updatedBy);
        employeeDeductionRepository.save(existing);

        log.info("Reactivated employee deduction: {}", id);
    }

    /**
     * Delete an employee deduction (hard delete - use with caution)
     */
    @Transactional
    public void delete(UUID id) {
        log.info("Deleting employee deduction: {}", id);

        if (!employeeDeductionRepository.existsById(id)) {
            throw new ResourceNotFoundException("Employee deduction not found: " + id);
        }

        employeeDeductionRepository.deleteById(id);
        log.info("Deleted employee deduction: {}", id);
    }

    /**
     * Calculate deductions for an employee for a payroll period
     * Returns the list of applicable deductions with calculated amounts
     */
    @Transactional(readOnly = true)
    public List<CalculatedDeduction> calculateDeductionsForPayroll(UUID employeeId,
                                                                    LocalDate periodStart,
                                                                    LocalDate periodEnd,
                                                                    BigDecimal grossSalary,
                                                                    BigDecimal basicSalary) {
        List<EmployeeDeduction> deductions = employeeDeductionRepository
            .findActiveForPayrollPeriod(employeeId, periodStart, periodEnd);

        return deductions.stream()
            .filter(d -> d.shouldApplyForPeriod(periodStart, periodEnd))
            .map(d -> {
                BigDecimal calculatedAmount = d.calculateDeductionAmount(grossSalary, basicSalary, null);
                return new CalculatedDeduction(
                    d.getId(),
                    d.getDeductionNumber(),
                    d.getDisplayName(),
                    d.getDeductionType().getCategory(),
                    calculatedAmount,
                    d.getCalculationMethod(),
                    d.getReferenceId(),
                    d.getReferenceType()
                );
            })
            .collect(Collectors.toList());
    }

    /**
     * Record that deductions were applied in a payroll
     */
    @Transactional
    public void recordDeductionsApplied(List<UUID> deductionIds, LocalDate payrollEndDate) {
        for (UUID deductionId : deductionIds) {
            employeeDeductionRepository.findById(deductionId).ifPresent(deduction -> {
                deduction.recordDeduction(deduction.getAmount(), payrollEndDate);
                employeeDeductionRepository.save(deduction);
                log.debug("Recorded deduction applied: {}", deduction.getDeductionNumber());
            });
        }
    }

    /**
     * Create a loan-related deduction for an employee
     */
    @Transactional
    public EmployeeDeductionDTO createLoanDeduction(UUID employeeId, UUID loanId, String loanNumber,
                                                     BigDecimal monthlyInstallment, LocalDate startDate,
                                                     LocalDate endDate, String createdBy) {
        log.info("Creating loan deduction for employee {} loan {} by {}", employeeId, loanId, createdBy);

        // Find the LOAN deduction type
        DeductionType loanType = deductionTypeRepository.findByCode("LOAN")
            .orElseThrow(() -> new ResourceNotFoundException("Loan deduction type not found. Please initialize system deduction types."));

        EmployeeDeductionDTO dto = EmployeeDeductionDTO.builder()
            .employeeId(employeeId)
            .deductionTypeId(loanType.getId())
            .customName("Loan: " + loanNumber)
            .description("Loan repayment for loan " + loanNumber)
            .amount(monthlyInstallment)
            .calculationMethod(EmployeeDeduction.CalculationMethod.FIXED_AMOUNT)
            .frequency(EmployeeDeduction.DeductionFrequency.MONTHLY)
            .effectiveStartDate(startDate)
            .effectiveEndDate(endDate)
            .referenceId(loanId)
            .referenceType("LOAN")
            .priority(50) // Higher priority for loans
            .build();

        return create(dto, createdBy);
    }

    /**
     * Deactivate loan deduction when loan is completed or cancelled
     */
    @Transactional
    public void deactivateLoanDeduction(UUID loanId, String updatedBy) {
        employeeDeductionRepository.findActiveByReference(loanId, "LOAN")
            .ifPresent(deduction -> {
                deduction.deactivate(updatedBy);
                employeeDeductionRepository.save(deduction);
                log.info("Deactivated loan deduction for loan: {}", loanId);
            });
    }

    /**
     * Generate a unique deduction number using the deduction type code
     */
    private String generateDeductionNumber(DeductionType deductionType) {
        String typeCode = deductionType.getCode();
        Long maxSequence = employeeDeductionRepository.getMaxDeductionNumberSequenceByTypeCode(typeCode);
        long nextSequence = (maxSequence != null ? maxSequence : 0) + 1;
        return EmployeeDeduction.generateDeductionNumber(typeCode, nextSequence);
    }

    /**
     * DTO for calculated deduction results
     */
    @lombok.Data
    @lombok.AllArgsConstructor
    public static class CalculatedDeduction {
        private UUID deductionId;
        private String deductionNumber;
        private String name;
        private DeductionType.DeductionCategory category;
        private BigDecimal amount;
        private EmployeeDeduction.CalculationMethod calculationMethod;
        private UUID referenceId;
        private String referenceType;
    }
}
