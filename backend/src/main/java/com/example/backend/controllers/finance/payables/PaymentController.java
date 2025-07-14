package com.example.backend.controllers.finance.payables;

import com.example.backend.dto.finance.payables.PaymentRequestDTO;
import com.example.backend.dto.finance.payables.PaymentResponseDTO;
import com.example.backend.dto.finance.payables.PaymentSearchRequestDTO;
import com.example.backend.dto.finance.payables.PaymentValidationResponseDTO;
import com.example.backend.models.finance.payables.PaymentStatus;
import com.example.backend.services.finance.payables.PaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/v1/payments")
@CrossOrigin(origins = "*")
public class PaymentController {

    @Autowired
    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    // Helper method to get the current authenticated user
    private String getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()) {
            return authentication.getName();
        }
        return "system"; // fallback
    }

    // Create a new payment
    // POST /api/v1/payments
    @PostMapping
    public ResponseEntity<?> createPayment(@RequestBody PaymentRequestDTO request) {
        try {
            // Get the authenticated user from the request or security context
            String createdBy = request.getCreatedBy();
            if (createdBy == null || createdBy.trim().isEmpty()) {
                // Fallback to security context if not provided in request
                createdBy = getCurrentUser();
            }

            PaymentResponseDTO payment = paymentService.createPayment(request, createdBy);
            return ResponseEntity.status(HttpStatus.CREATED).body(payment);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    // Update a payment
    // PUT /api/v1/payments/{id}
//    @PutMapping("/{id}")
//    public ResponseEntity<?> updatePayment(@PathVariable UUID id, @RequestBody PaymentRequestDTO request) {
//        try {
//            // Get the authenticated user for the update
//            String updatedBy = request.getUpdatedBy();
//            if (updatedBy == null || updatedBy.trim().isEmpty()) {
//                updatedBy = getCurrentUser();
//            }
//
//            PaymentResponseDTO payment = paymentService.updatePayment(id, request, updatedBy);
//            return ResponseEntity.ok(payment);
//        } catch (Exception e) {
//            Map<String, String> error = new HashMap<>();
//            error.put("error", e.getMessage());
//            return ResponseEntity.badRequest().body(error);
//        }
//    }

    // Delete a payment
    // DELETE /api/v1/payments/{id}
//    @DeleteMapping("/{id}")
//    public ResponseEntity<?> deletePayment(@PathVariable UUID id) {
//        try {
//            String deletedBy = getCurrentUser();
//            paymentService.deletePayment(id, deletedBy);
//            return ResponseEntity.ok().build();
//        } catch (Exception e) {
//            Map<String, String> error = new HashMap<>();
//            error.put("error", e.getMessage());
//            return ResponseEntity.badRequest().body(error);
//        }
//    }

    // Get payment by ID
    // GET /api/v1/payments/{id}
    @GetMapping("/{id}")
    public ResponseEntity<?> getPayment(@PathVariable UUID id) {
        try {
            PaymentResponseDTO payment = paymentService.getPaymentById(id);
            return ResponseEntity.ok(payment);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    // Get all payments for an invoice
    // GET /api/v1/payments/invoice/{invoiceId}
    @GetMapping("/invoice/{invoiceId}")
    public ResponseEntity<List<PaymentResponseDTO>> getPaymentsByInvoice(@PathVariable UUID invoiceId) {
        List<PaymentResponseDTO> payments = paymentService.getPaymentsByInvoiceId(invoiceId);
        return ResponseEntity.ok(payments);
    }

    // Get all payments with pagination
    // GET /api/v1/payments?page=0&size=20
    @GetMapping
    public ResponseEntity<Page<PaymentResponseDTO>> getAllPayments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size);
        Page<PaymentResponseDTO> payments = paymentService.getAllPayments(pageable);
        return ResponseEntity.ok(payments);
    }

    // Update payment status
    // PUT /api/v1/payments/{id}/status?status=PROCESSED
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updatePaymentStatus(
            @PathVariable UUID id,
            @RequestParam PaymentStatus status) {
        try {
            String updatedBy = getCurrentUser();
            PaymentResponseDTO payment = paymentService.updatePaymentStatus(id, status, updatedBy);
            return ResponseEntity.ok(payment);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    // Get payments by date range
    // GET /api/v1/payments/date-range?startDate=2024-01-01&endDate=2024-01-31
    @GetMapping("/date-range")
    public ResponseEntity<List<PaymentResponseDTO>> getPaymentsByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        List<PaymentResponseDTO> payments = paymentService.getPaymentsByDateRange(startDate, endDate);
        return ResponseEntity.ok(payments);
    }

    // Get payments by vendor
    // GET /api/v1/payments/vendor?vendorName=ABC Lumber
    @GetMapping("/vendor")
    public ResponseEntity<List<PaymentResponseDTO>> getPaymentsByVendor(
            @RequestParam String vendorName) {

        List<PaymentResponseDTO> payments = paymentService.getPaymentsByVendor(vendorName);
        return ResponseEntity.ok(payments);
    }

    // Get payments by status
    // GET /api/v1/payments/status?status=PROCESSED
    @GetMapping("/status")
    public ResponseEntity<List<PaymentResponseDTO>> getPaymentsByStatus(
            @RequestParam PaymentStatus status) {

        List<PaymentResponseDTO> payments = paymentService.getPaymentsByStatus(status);
        return ResponseEntity.ok(payments);
    }

    // Search payments by reference number
    // GET /api/v1/payments/search/reference?referenceNumber=1001
    @GetMapping("/search/reference")
    public ResponseEntity<List<PaymentResponseDTO>> searchPaymentsByReference(
            @RequestParam String referenceNumber) {

        List<PaymentResponseDTO> payments = paymentService.searchPaymentsByReference(referenceNumber);
        return ResponseEntity.ok(payments);
    }

    // Advanced search with multiple criteria
    // POST /api/v1/payments/search
    @PostMapping("/search")
    public ResponseEntity<Page<PaymentResponseDTO>> searchPayments(
            @RequestBody PaymentSearchRequestDTO searchRequest) {

        Page<PaymentResponseDTO> payments = paymentService.searchPayments(searchRequest);
        return ResponseEntity.ok(payments);
    }

    // Get recent payments
    // GET /api/v1/payments/recent?days=30
    @GetMapping("/recent")
    public ResponseEntity<List<PaymentResponseDTO>> getRecentPayments(
            @RequestParam(defaultValue = "30") int days) {

        List<PaymentResponseDTO> payments = paymentService.getRecentPayments(days);
        return ResponseEntity.ok(payments);
    }

    // Get largest payments in period
    // GET /api/v1/payments/largest?startDate=2024-01-01&endDate=2024-01-31&limit=10
    @GetMapping("/largest")
    public ResponseEntity<List<PaymentResponseDTO>> getLargestPayments(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "10") int limit) {

        List<PaymentResponseDTO> payments = paymentService.getLargestPayments(startDate, endDate, limit);
        return ResponseEntity.ok(payments);
    }

    // Calculate total payments for period
    // GET /api/v1/payments/totals?startDate=2024-01-01&endDate=2024-01-31&status=PROCESSED
    @GetMapping("/totals")
    public ResponseEntity<Map<String, Object>> calculatePaymentTotals(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "PROCESSED") PaymentStatus status) {

        BigDecimal total = paymentService.calculateTotalPaymentsByPeriod(startDate, endDate, status);

        Map<String, Object> response = new HashMap<>();
        response.put("startDate", startDate);
        response.put("endDate", endDate);
        response.put("status", status);
        response.put("totalAmount", total);

        return ResponseEntity.ok(response);
    }

    // Get payments by vendor for reporting
    // GET /api/v1/payments/vendor-report?startDate=2024-01-01&endDate=2024-01-31
    @GetMapping("/vendor-report")
    public ResponseEntity<List<Object[]>> getPaymentsByVendorReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        List<Object[]> vendorPayments = paymentService.getPaymentsByVendorForPeriod(startDate, endDate);
        return ResponseEntity.ok(vendorPayments);
    }

    // Validate payment amount before creating
    // GET /api/v1/payments/validate?invoiceId=123&amount=2500.00
    @GetMapping("/validate")
    public ResponseEntity<PaymentValidationResponseDTO> validatePaymentAmount(
            @RequestParam UUID invoiceId,
            @RequestParam BigDecimal amount) {

        PaymentValidationResponseDTO validation = paymentService.validatePaymentAmount(invoiceId, amount);
        return ResponseEntity.ok(validation);
    }
}