//package com.example.backend.controllers.finance;
//
//import com.example.backend.dto.finance.payables.PaymentMethodDTO;
//import com.example.backend.services.finance.PaymentMethodService;
//import jakarta.validation.Valid;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.http.HttpStatus;
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.*;
//
//import java.util.List;
//import java.util.Optional;
//import java.util.UUID;
//
//@RestController
//@RequestMapping("/api/v1/payment-methods")
//@CrossOrigin(origins = "*")
//public class PaymentMethodController {
//
//    @Autowired
//    private PaymentMethodService paymentMethodService;
//
//    // Get all active payment methods (for dropdown lists)
//    @GetMapping("/active")
//    public ResponseEntity<List<PaymentMethodDTO>> getActivePaymentMethods() {
//        try {
//            List<PaymentMethodDTO> paymentMethods = paymentMethodService.getAllActivePaymentMethods();
//            return ResponseEntity.ok(paymentMethods);
//        } catch (Exception e) {
//            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
//        }
//    }
//
//    // Get payment method by ID
//    @GetMapping("/{id}")
//    public ResponseEntity<PaymentMethodDTO> getPaymentMethodById(@PathVariable UUID id) {
//        try {
//            Optional<PaymentMethodDTO> paymentMethod = paymentMethodService.getPaymentMethodById(id);
//            return paymentMethod.map(ResponseEntity::ok)
//                    .orElse(ResponseEntity.notFound().build());
//        } catch (Exception e) {
//            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
//        }
//    }
//
//    // Create new payment method
//    @PostMapping
//    public ResponseEntity<?> createPaymentMethod(@Valid @RequestBody PaymentMethodDTO paymentMethodDTO) {
//        try {
//            PaymentMethodDTO createdPaymentMethod = paymentMethodService.createPaymentMethod(paymentMethodDTO);
//            return ResponseEntity.status(HttpStatus.CREATED).body(createdPaymentMethod);
//        } catch (RuntimeException e) {
//            return ResponseEntity.badRequest().body(e.getMessage());
//        } catch (Exception e) {
//            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
//        }
//    }
//
//    // Update payment method
//    @PutMapping("/{id}")
//    public ResponseEntity<?> updatePaymentMethod(@PathVariable UUID id,
//                                                 @Valid @RequestBody PaymentMethodDTO paymentMethodDTO) {
//        try {
//            PaymentMethodDTO updatedPaymentMethod = paymentMethodService.updatePaymentMethod(id, paymentMethodDTO);
//            return ResponseEntity.ok(updatedPaymentMethod);
//        } catch (RuntimeException e) {
//            return ResponseEntity.badRequest().body(e.getMessage());
//        } catch (Exception e) {
//            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
//        }
//    }
//
//    // Deactivate payment method
//    @DeleteMapping("/{id}")
//    public ResponseEntity<?> deactivatePaymentMethod(@PathVariable UUID id) {
//        try {
//            paymentMethodService.deactivatePaymentMethod(id);
//            return ResponseEntity.ok().body("Payment method deactivated successfully");
//        } catch (RuntimeException e) {
//            return ResponseEntity.badRequest().body(e.getMessage());
//        } catch (Exception e) {
//            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
//        }
//    }
//}