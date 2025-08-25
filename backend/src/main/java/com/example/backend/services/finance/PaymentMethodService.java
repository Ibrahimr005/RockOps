//package com.example.backend.services.finance;
//
//import com.example.backend.dto.finance.payables.PaymentMethodDTO;
//import com.example.backend.repositories.finance.PaymentMethodRepository;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.stereotype.Service;
//
//import java.util.List;
//import java.util.Optional;
//import java.util.UUID;
//import java.util.stream.Collectors;
//
//@Service
//public class PaymentMethodService {
//
//    @Autowired
//    private PaymentMethodRepository paymentMethodRepository;
//
//    // Get all active payment methods (for dropdown lists)
//    public List<PaymentMethodDTO> getAllActivePaymentMethods() {
//        return paymentMethodRepository.findActivePaymentMethodsOrderedByName()
//                .stream()
//                .map(this::convertToDTO)
//                .collect(Collectors.toList());
//    }
//
//    // Get payment method by ID
//    public Optional<PaymentMethodDTO> getPaymentMethodById(UUID id) {
//        return paymentMethodRepository.findById(id)
//                .map(this::convertToDTO);
//    }
//
//    // Get payment method entity by ID (for internal use)
//    public Optional<PaymentMethod> getPaymentMethodEntityById(UUID id) {
//        return paymentMethodRepository.findById(id);
//    }
//
//    // Create new payment method
//    public PaymentMethodDTO createPaymentMethod(PaymentMethodDTO paymentMethodDTO) {
//        // Check if name already exists
//        if (paymentMethodRepository.existsByName(paymentMethodDTO.getName())) {
//            throw new RuntimeException("Payment method with name '" + paymentMethodDTO.getName() + "' already exists");
//        }
//
//        PaymentMethod paymentMethod = convertToEntity(paymentMethodDTO);
//        PaymentMethod savedPaymentMethod = paymentMethodRepository.save(paymentMethod);
//        return convertToDTO(savedPaymentMethod);
//    }
//
//    // Update payment method
//    public PaymentMethodDTO updatePaymentMethod(UUID id, PaymentMethodDTO paymentMethodDTO) {
//        PaymentMethod existingPaymentMethod = paymentMethodRepository.findById(id)
//                .orElseThrow(() -> new RuntimeException("Payment method not found with id: " + id));
//
//        // Check if name already exists (excluding current record)
//        Optional<PaymentMethod> existingByName = paymentMethodRepository.findByName(paymentMethodDTO.getName());
//        if (existingByName.isPresent() && !existingByName.get().getId().equals(id)) {
//            throw new RuntimeException("Payment method with name '" + paymentMethodDTO.getName() + "' already exists");
//        }
//
//        existingPaymentMethod.setName(paymentMethodDTO.getName());
//        existingPaymentMethod.setDescription(paymentMethodDTO.getDescription());
//        existingPaymentMethod.setIsActive(paymentMethodDTO.getIsActive());
//
//        PaymentMethod updatedPaymentMethod = paymentMethodRepository.save(existingPaymentMethod);
//        return convertToDTO(updatedPaymentMethod);
//    }
//
//    // Deactivate payment method (soft delete)
//    public void deactivatePaymentMethod(UUID id) {
//        PaymentMethod paymentMethod = paymentMethodRepository.findById(id)
//                .orElseThrow(() -> new RuntimeException("Payment method not found with id: " + id));
//
//        paymentMethod.setIsActive(false);
//        paymentMethodRepository.save(paymentMethod);
//    }
//
//    // Convert entity to DTO
//    private PaymentMethodDTO convertToDTO(PaymentMethod paymentMethod) {
//        PaymentMethodDTO dto = new PaymentMethodDTO();
//        dto.setId(paymentMethod.getId());
//        dto.setName(paymentMethod.getName());
//        dto.setDescription(paymentMethod.getDescription());
//        dto.setIsActive(paymentMethod.getIsActive());
//        return dto;
//    }
//
//    // Convert DTO to entity
//    private PaymentMethod convertToEntity(PaymentMethodDTO dto) {
//        PaymentMethod paymentMethod = new PaymentMethod();
//        paymentMethod.setName(dto.getName());
//        paymentMethod.setDescription(dto.getDescription());
//        paymentMethod.setIsActive(dto.getIsActive() != null ? dto.getIsActive() : true);
//        return paymentMethod;
//    }
//}
