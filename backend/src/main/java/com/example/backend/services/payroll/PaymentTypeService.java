package com.example.backend.services.payroll;

import com.example.backend.dto.payroll.PaymentTypeDTO;
import com.example.backend.models.payroll.PaymentType;
import com.example.backend.repositories.payroll.PaymentTypeRepository;
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
public class PaymentTypeService {

    private final PaymentTypeRepository paymentTypeRepository;

    /**
     * Get all active payment types
     */
    public List<PaymentTypeDTO> getAllActive() {
        return paymentTypeRepository.findAllActive().stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    /**
     * Get all payment types (including inactive)
     */
    public List<PaymentTypeDTO> getAll() {
        return paymentTypeRepository.findAllByOrderByDisplayOrderAsc().stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    /**
     * Get payment type by ID
     */
    public PaymentTypeDTO getById(UUID id) {
        return paymentTypeRepository.findById(id)
            .map(this::toDTO)
            .orElseThrow(() -> new RuntimeException("Payment type not found: " + id));
    }

    /**
     * Get payment type by code
     */
    public PaymentTypeDTO getByCode(String code) {
        return paymentTypeRepository.findByCodeIgnoreCase(code)
            .map(this::toDTO)
            .orElseThrow(() -> new RuntimeException("Payment type not found: " + code));
    }

    /**
     * Create a new payment type
     * Can be created by HR or Finance
     */
    @Transactional
    public PaymentTypeDTO create(PaymentTypeDTO dto, String username) {
        // Check if code already exists
        if (paymentTypeRepository.existsByCodeIgnoreCase(dto.getCode())) {
            throw new RuntimeException("Payment type with code '" + dto.getCode() + "' already exists");
        }

        PaymentType paymentType = PaymentType.builder()
            .code(dto.getCode().toUpperCase())
            .name(dto.getName())
            .description(dto.getDescription())
            .isActive(dto.getIsActive() != null ? dto.getIsActive() : true)
            .requiresBankDetails(dto.getRequiresBankDetails() != null ? dto.getRequiresBankDetails() : false)
            .requiresWalletDetails(dto.getRequiresWalletDetails() != null ? dto.getRequiresWalletDetails() : false)
            .displayOrder(dto.getDisplayOrder() != null ? dto.getDisplayOrder() : 0)
            .createdBy(username)
            .build();

        PaymentType saved = paymentTypeRepository.save(paymentType);
        log.info("Payment type created: {} by {}", saved.getCode(), username);

        return toDTO(saved);
    }

    /**
     * Update a payment type
     */
    @Transactional
    public PaymentTypeDTO update(UUID id, PaymentTypeDTO dto, String username) {
        PaymentType paymentType = paymentTypeRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Payment type not found: " + id));

        // Check if code is being changed and if new code already exists
        if (!paymentType.getCode().equalsIgnoreCase(dto.getCode()) &&
            paymentTypeRepository.existsByCodeIgnoreCase(dto.getCode())) {
            throw new RuntimeException("Payment type with code '" + dto.getCode() + "' already exists");
        }

        paymentType.setCode(dto.getCode().toUpperCase());
        paymentType.setName(dto.getName());
        paymentType.setDescription(dto.getDescription());
        paymentType.setIsActive(dto.getIsActive());
        paymentType.setRequiresBankDetails(dto.getRequiresBankDetails());
        paymentType.setRequiresWalletDetails(dto.getRequiresWalletDetails());
        paymentType.setDisplayOrder(dto.getDisplayOrder());
        paymentType.setUpdatedBy(username);

        PaymentType saved = paymentTypeRepository.save(paymentType);
        log.info("Payment type updated: {} by {}", saved.getCode(), username);

        return toDTO(saved);
    }

    /**
     * Deactivate a payment type (soft delete)
     */
    @Transactional
    public void deactivate(UUID id, String username) {
        PaymentType paymentType = paymentTypeRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Payment type not found: " + id));

        paymentType.setIsActive(false);
        paymentType.setUpdatedBy(username);
        paymentTypeRepository.save(paymentType);

        log.info("Payment type deactivated: {} by {}", paymentType.getCode(), username);
    }

    /**
     * Activate a payment type
     */
    @Transactional
    public void activate(UUID id, String username) {
        PaymentType paymentType = paymentTypeRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Payment type not found: " + id));

        paymentType.setIsActive(true);
        paymentType.setUpdatedBy(username);
        paymentTypeRepository.save(paymentType);

        log.info("Payment type activated: {} by {}", paymentType.getCode(), username);
    }

    /**
     * Get payment type entity by ID (for internal use)
     */
    public PaymentType getEntityById(UUID id) {
        return paymentTypeRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Payment type not found: " + id));
    }

    /**
     * Convert entity to DTO
     */
    private PaymentTypeDTO toDTO(PaymentType entity) {
        return PaymentTypeDTO.builder()
            .id(entity.getId())
            .code(entity.getCode())
            .name(entity.getName())
            .description(entity.getDescription())
            .isActive(entity.getIsActive())
            .requiresBankDetails(entity.getRequiresBankDetails())
            .requiresWalletDetails(entity.getRequiresWalletDetails())
            .displayOrder(entity.getDisplayOrder())
            .createdAt(entity.getCreatedAt())
            .createdBy(entity.getCreatedBy())
            .build();
    }
}
