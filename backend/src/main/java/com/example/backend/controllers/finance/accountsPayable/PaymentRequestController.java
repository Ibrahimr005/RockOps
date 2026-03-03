package com.example.backend.controllers.finance.accountsPayable;

import com.example.backend.dto.finance.accountsPayable.ApproveRejectPaymentRequestDTO;
import com.example.backend.dto.finance.accountsPayable.PaymentRequestResponseDTO;
import com.example.backend.models.user.User;
import com.example.backend.services.finance.accountsPayable.PaymentRequestService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/finance/payment-requests")
@CrossOrigin(origins = "http://localhost:3000")
@Slf4j
public class PaymentRequestController {

    private final PaymentRequestService paymentRequestService;

    @Autowired
    public PaymentRequestController(PaymentRequestService paymentRequestService) {
        this.paymentRequestService = paymentRequestService;
    }

    /**
     * GET /api/v1/finance/payment-requests/pending
     * Get all pending payment requests
     */
    @GetMapping("/pending")
    public ResponseEntity<List<PaymentRequestResponseDTO>> getPendingPaymentRequests() {
        try {
            List<PaymentRequestResponseDTO> requests = paymentRequestService.getPendingPaymentRequests();
            return ResponseEntity.ok(requests);
        } catch (Exception e) {
            log.error("Error fetching pending payment requests", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * GET /api/v1/finance/payment-requests/ready-to-pay
     * Get approved and ready to pay payment requests
     */
    @GetMapping("/ready-to-pay")
    public ResponseEntity<List<PaymentRequestResponseDTO>> getReadyToPay() {
        try {
            List<PaymentRequestResponseDTO> requests = paymentRequestService.getApprovedAndReadyToPay();
            log.info("Found {} payment requests ready to pay", requests.size());
            return ResponseEntity.ok(requests);
        } catch (Exception e) {
            log.error("Error fetching ready-to-pay payment requests", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * GET /api/v1/finance/payment-requests
     * Get all payment requests
     */
    @GetMapping
    public ResponseEntity<List<PaymentRequestResponseDTO>> getAllPaymentRequests() {
        try {
            List<PaymentRequestResponseDTO> requests = paymentRequestService.getAllPaymentRequests();
            return ResponseEntity.ok(requests);
        } catch (Exception e) {
            log.error("Error fetching all payment requests", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * GET /api/v1/finance/payment-requests/{id}
     * Get payment request by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<PaymentRequestResponseDTO> getPaymentRequestById(@PathVariable UUID id) {
        try {
            PaymentRequestResponseDTO request = paymentRequestService.getPaymentRequestById(id);
            return ResponseEntity.ok(request);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * GET /api/v1/finance/payment-requests/merchant/{merchantId}
     * Get payment requests by merchant
     */
    @GetMapping("/merchant/{merchantId}")
    public ResponseEntity<List<PaymentRequestResponseDTO>> getPaymentRequestsByMerchant(
            @PathVariable UUID merchantId) {
        try {
            List<PaymentRequestResponseDTO> requests = paymentRequestService.getPaymentRequestsByMerchant(merchantId);
            return ResponseEntity.ok(requests);
        } catch (Exception e) {
            log.error("Error fetching payment requests for merchant {}", merchantId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * POST /api/v1/finance/payment-requests/approve-reject
     * Approve or Reject a payment request
     */
    @PostMapping("/approve-reject")
    public ResponseEntity<?> approveOrRejectPaymentRequest(
            @Valid @RequestBody ApproveRejectPaymentRequestDTO request,
            @AuthenticationPrincipal User user) {
        try {
            PaymentRequestResponseDTO result = paymentRequestService.approveOrRejectPaymentRequest(
                    request,
                    user.getId(),
                    user.getFirstName() + " " + user.getLastName()
            );
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error processing request: " + e.getMessage());
        }
    }

    /**
     * POST /api/v1/finance/payment-requests/create-from-po/{purchaseOrderId}
     * Create payment request from purchase order (called by Procurement)
     */
// Remove this old endpoint completely and replace with:

    /**
     * POST /api/v1/finance/payment-requests/create-from-po/{purchaseOrderId}/{offerId}
     * Create payment request from purchase order (called by Frontend)
     */
    @PostMapping("/create-from-po/{purchaseOrderId}/{offerId}")
    public ResponseEntity<?> createPaymentRequestFromPO(
            @PathVariable UUID purchaseOrderId,
            @PathVariable UUID offerId,
            @RequestBody(required = false) Map<String, String> body) {
        try {
            System.out.println("🔵 Controller: Creating payment request");
            System.out.println("🔵 PO ID: " + purchaseOrderId);
            System.out.println("🔵 Offer ID: " + offerId);

            // Get username from body or use "system"
            String username = "system";
            if (body != null && body.containsKey("username")) {
                username = body.get("username");
                System.out.println("🔵 Username from body: " + username);
            } else {
                System.out.println("⚠️ No username in body, using: system");
            }

            PaymentRequestResponseDTO paymentRequest = paymentRequestService.createPaymentRequestFromPO(
                    purchaseOrderId,
                    offerId,
                    username
            );

            System.out.println("✅ Payment request created: " + paymentRequest.getRequestNumber());
            return ResponseEntity.ok(paymentRequest);

        } catch (RuntimeException e) {
            System.err.println("❌ Runtime error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                    "error", e.getMessage(),
                    "purchaseOrderId", purchaseOrderId.toString(),
                    "offerId", offerId.toString()
            ));
        } catch (Exception e) {
            System.err.println("❌ Server error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error creating payment request: " + e.getMessage()));
        }
    }
}