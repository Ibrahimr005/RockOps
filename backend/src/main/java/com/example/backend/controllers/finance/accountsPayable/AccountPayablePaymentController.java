package com.example.backend.controllers.finance.accountsPayable;

import com.example.backend.dto.finance.accountsPayable.AccountPayablePaymentResponseDTO;
import com.example.backend.dto.finance.accountsPayable.ProcessPaymentRequestDTO;
import com.example.backend.models.user.User;
import com.example.backend.services.finance.accountsPayable.AccountPayablePaymentService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/finance/payments")
@CrossOrigin(origins = "http://localhost:3000")
public class AccountPayablePaymentController {

    private final AccountPayablePaymentService paymentService;

    @Autowired
    public AccountPayablePaymentController(AccountPayablePaymentService paymentService) {
        this.paymentService = paymentService;
    }

    /**
     * POST /api/v1/finance/payments/process
     * Process a payment
     */
    @PostMapping("/process")
    public ResponseEntity<?> processPayment(
            @Valid @RequestBody ProcessPaymentRequestDTO request,
            @AuthenticationPrincipal User user) {
        try {
            AccountPayablePaymentResponseDTO payment = paymentService.processPayment(
                    request,
                    user.getId(),
                    user.getFirstName() + " " + user.getLastName()
            );
            return ResponseEntity.ok(payment);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error processing payment: " + e.getMessage());
        }
    }

    /**
     * GET /api/v1/finance/payments/{id}
     * Get payment by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<AccountPayablePaymentResponseDTO> getPaymentById(@PathVariable UUID id) {
        try {
            AccountPayablePaymentResponseDTO payment = paymentService.getPaymentById(id);
            return ResponseEntity.ok(payment);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * GET /api/v1/finance/payments/payment-request/{paymentRequestId}
     * Get payments by payment request
     */
    @GetMapping("/payment-request/{paymentRequestId}")
    public ResponseEntity<List<AccountPayablePaymentResponseDTO>> getPaymentsByPaymentRequest(
            @PathVariable UUID paymentRequestId) {
        try {
            List<AccountPayablePaymentResponseDTO> payments = paymentService.getPaymentsByPaymentRequest(paymentRequestId);
            return ResponseEntity.ok(payments);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * GET /api/v1/finance/payments/today
     * Get payments made today
     */
    @GetMapping("/today")
    public ResponseEntity<List<AccountPayablePaymentResponseDTO>> getPaymentsMadeToday() {
        try {
            List<AccountPayablePaymentResponseDTO> payments = paymentService.getPaymentsMadeToday();
            return ResponseEntity.ok(payments);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * GET /api/v1/finance/payments/merchant/{merchantId}
     * Get payments by merchant
     */
    @GetMapping("/merchant/{merchantId}")
    public ResponseEntity<List<AccountPayablePaymentResponseDTO>> getPaymentsByMerchant(@PathVariable UUID merchantId) {
        try {
            List<AccountPayablePaymentResponseDTO> payments = paymentService.getPaymentsByMerchant(merchantId);
            return ResponseEntity.ok(payments);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * GET /api/v1/finance/payments/history
     * Get payment history (all completed payments)
     */
    @GetMapping("/history")
    public ResponseEntity<List<AccountPayablePaymentResponseDTO>> getPaymentHistory() {
        try {
            List<AccountPayablePaymentResponseDTO> payments = paymentService.getPaymentHistory();
            return ResponseEntity.ok(payments);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}