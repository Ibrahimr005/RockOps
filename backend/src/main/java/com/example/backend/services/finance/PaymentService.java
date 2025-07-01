// Payment Service - handles all payment business logic
package com.example.backend.services.finance;

import com.example.backend.dto.finance.PaymentRequestDTO;
import com.example.backend.dto.finance.PaymentSearchRequestDTO;
import com.example.backend.dto.finance.PaymentResponseDTO;
import com.example.backend.dto.finance.PaymentValidationResponseDTO;
import com.example.backend.models.finance.Invoice;
import com.example.backend.models.finance.InvoiceStatus;
import com.example.backend.models.finance.Payment;
import com.example.backend.models.finance.PaymentStatus;
import com.example.backend.repositories.finance.InvoiceRepository;
import com.example.backend.repositories.finance.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final InvoiceRepository invoiceRepository;

    // Create a new payment
    // Replace your createPayment method with this fixed version
    public PaymentResponseDTO createPayment(PaymentRequestDTO request, String createdBy) {
        // Step 1: Find the invoice
        Optional<Invoice> invoiceOpt = invoiceRepository.findById(request.getInvoiceId());
        if (invoiceOpt.isEmpty()) {
            throw new RuntimeException("Invoice not found with ID: " + request.getInvoiceId());
        }
        Invoice invoice = invoiceOpt.get();

        // Step 2: Get CURRENT remaining balance from database
        BigDecimal currentRemainingBalance = invoiceRepository.getCurrentRemainingBalance(request.getInvoiceId());
        if (request.getAmount().compareTo(currentRemainingBalance) > 0) {
            throw new RuntimeException(String.format(
                    "Payment amount $%.2f exceeds current remaining balance $%.2f",
                    request.getAmount(), currentRemainingBalance));
        }

        if (request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Payment amount must be greater than zero");
        }

        // Step 3: Create the payment
        Payment payment = new Payment();
        payment.setInvoice(invoice);
        payment.setAmount(request.getAmount());
        payment.setPaymentDate(request.getPaymentDate());
        payment.setPaymentMethod(request.getPaymentMethod());
        payment.setReferenceNumber(request.getReferenceNumber());
        payment.setNotes(request.getNotes());
        payment.setStatus(PaymentStatus.PROCESSED);
        payment.setCreatedBy(createdBy);

        // Step 4: Save payment
        Payment savedPayment = paymentRepository.save(payment);

        // Step 5: Calculate current paid amount from database
        BigDecimal totalPaidAmount = invoiceRepository.calculateTotalPaidAmount(request.getInvoiceId());
        if (totalPaidAmount == null) {
            totalPaidAmount = BigDecimal.ZERO;
        }

        // Update invoice with calculated amounts
        invoice.setPaidAmount(totalPaidAmount);

        // Update status
        if (totalPaidAmount.compareTo(BigDecimal.ZERO) == 0) {
            invoice.setStatus(invoice.isOverdue() ? InvoiceStatus.OVERDUE : InvoiceStatus.PENDING);
        } else if (totalPaidAmount.compareTo(invoice.getTotalAmount()) >= 0) {
            invoice.setStatus(InvoiceStatus.FULLY_PAID);
        } else {
            invoice.setStatus(InvoiceStatus.PARTIALLY_PAID);
        }

        Invoice updatedInvoice = invoiceRepository.save(invoice);

        System.out.println("Updated invoice " + invoice.getInvoiceNumber() +
                " - Paid: $" + totalPaidAmount +
                " - Status: " + invoice.getStatus());

        return convertToResponseWithUpdatedInvoice(savedPayment, updatedInvoice);
    }

    // Helper method to convert Payment entity to PaymentResponseDTO with updated invoice
    private PaymentResponseDTO convertToResponseWithUpdatedInvoice(Payment payment, Invoice updatedInvoice) {
        PaymentResponseDTO response = new PaymentResponseDTO();
        response.setId(payment.getId());
        response.setAmount(payment.getAmount());
        response.setPaymentDate(payment.getPaymentDate());
        response.setPaymentMethod(payment.getPaymentMethod());
        response.setReferenceNumber(payment.getReferenceNumber());
        response.setNotes(payment.getNotes());
        response.setStatus(payment.getStatus());
        response.setCreatedBy(payment.getCreatedBy());
        response.setCreatedAt(payment.getCreatedAt());
        response.setUpdatedAt(payment.getUpdatedAt());

        // Set invoice summary with UPDATED invoice data
        PaymentResponseDTO.InvoiceSummary invoiceSummary = new PaymentResponseDTO.InvoiceSummary(
                updatedInvoice.getId(),
                updatedInvoice.getInvoiceNumber(),
                updatedInvoice.getVendorName(),
                updatedInvoice.getTotalAmount(),
                updatedInvoice.getRemainingBalance()  // ✅ This will be the CORRECT balance!
        );
        response.setInvoice(invoiceSummary);

        return response;
    }

    // Get payment by ID
    @Transactional(readOnly = true)
    public PaymentResponseDTO getPaymentById(UUID id) {
        Optional<Payment> paymentOpt = paymentRepository.findById(id);
        if (paymentOpt.isEmpty()) {
            throw new RuntimeException("Payment not found with ID: " + id);
        }
        return convertToResponse(paymentOpt.get());
    }

    // Get all payments for an invoice
    @Transactional(readOnly = true)
    public List<PaymentResponseDTO> getPaymentsByInvoiceId(UUID invoiceId) {
        List<Payment> payments = paymentRepository.findByInvoiceIdOrderByPaymentDateDesc(invoiceId);
        return payments.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    // Get all payments with pagination
    @Transactional(readOnly = true)
    public Page<PaymentResponseDTO> getAllPayments(Pageable pageable) {
        Page<Payment> paymentsPage = paymentRepository.findAllByOrderByPaymentDateDesc(pageable);
        return paymentsPage.map(this::convertToResponse);
    }

    // Update payment status
    public PaymentResponseDTO updatePaymentStatus(UUID paymentId, PaymentStatus status, String updatedBy) {
        Optional<Payment> paymentOpt = paymentRepository.findById(paymentId);
        if (paymentOpt.isEmpty()) {
            throw new RuntimeException("Payment not found with ID: " + paymentId);
        }

        Payment payment = paymentOpt.get();
        PaymentStatus oldStatus = payment.getStatus();
        payment.setStatus(status);

        Payment savedPayment = paymentRepository.save(payment);

        // If status changed, update invoice
        if (!oldStatus.equals(status)) {
            payment.getInvoice().updatePaidAmountAndStatus();
            invoiceRepository.save(payment.getInvoice());
        }

        return convertToResponse(savedPayment);
    }

    // Get payments by date range
    @Transactional(readOnly = true)
    public List<PaymentResponseDTO> getPaymentsByDateRange(LocalDate startDate, LocalDate endDate) {
        List<Payment> payments = paymentRepository.findByPaymentDateBetweenOrderByPaymentDateDesc(startDate, endDate);
        return payments.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    // Get payments by vendor
    @Transactional(readOnly = true)
    public List<PaymentResponseDTO> getPaymentsByVendor(String vendorName) {
        List<Payment> payments = paymentRepository.findByVendorNameContaining(vendorName);
        return payments.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    // Get payments by status
    @Transactional(readOnly = true)
    public List<PaymentResponseDTO> getPaymentsByStatus(PaymentStatus status) {
        List<Payment> payments = paymentRepository.findByStatusOrderByPaymentDateDesc(status);
        return payments.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    // Search payments by reference number
    @Transactional(readOnly = true)
    public List<PaymentResponseDTO> searchPaymentsByReference(String referenceNumber) {
        List<Payment> payments = paymentRepository.findByReferenceNumberContainingIgnoreCase(referenceNumber);
        return payments.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    // Advanced search with multiple criteria
    @Transactional(readOnly = true)
    public Page<PaymentResponseDTO> searchPayments(PaymentSearchRequestDTO searchRequest) {
        Pageable pageable = PageRequest.of(searchRequest.getPage(), searchRequest.getSize());

        Page<Payment> paymentsPage = paymentRepository.searchPayments(
                searchRequest.getVendorName(),
                searchRequest.getReferenceNumber(),
                searchRequest.getStatus(),
                searchRequest.getStartDate(),
                searchRequest.getEndDate(),
                searchRequest.getMinAmount(),
                searchRequest.getMaxAmount(),
                pageable
        );

        return paymentsPage.map(this::convertToResponse);
    }

    // Calculate total payments for period
    @Transactional(readOnly = true)
    public BigDecimal calculateTotalPaymentsByPeriod(LocalDate startDate, LocalDate endDate, PaymentStatus status) {
        return paymentRepository.calculateTotalPaymentsByPeriodAndStatus(startDate, endDate, status);
    }

    // Get recent payments
    @Transactional(readOnly = true)
    public List<PaymentResponseDTO> getRecentPayments(int days) {
        LocalDate cutoffDate = LocalDate.now().minusDays(days);
        List<Payment> payments = paymentRepository.findRecentPayments(cutoffDate);
        return payments.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    // Get largest payments in period
    @Transactional(readOnly = true)
    public List<PaymentResponseDTO> getLargestPayments(LocalDate startDate, LocalDate endDate, int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        List<Payment> payments = paymentRepository.findLargestPaymentsByPeriod(startDate, endDate, pageable);
        return payments.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    // Get payments by vendor for reporting
    @Transactional(readOnly = true)
    public List<Object[]> getPaymentsByVendorForPeriod(LocalDate startDate, LocalDate endDate) {
        return paymentRepository.calculatePaymentsByVendor(startDate, endDate, PaymentStatus.PROCESSED);
    }

    // Validate payment amount
    @Transactional(readOnly = true)
    public PaymentValidationResponseDTO validatePaymentAmount(UUID invoiceId, BigDecimal paymentAmount) {
        // Check if payment amount is positive
        if (paymentAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return PaymentValidationResponseDTO.invalid("Payment amount must be greater than zero", BigDecimal.ZERO);
        }

        // Find invoice and check remaining balance
        Optional<Invoice> invoiceOpt = invoiceRepository.findById(invoiceId);
        if (invoiceOpt.isEmpty()) {
            return PaymentValidationResponseDTO.invalid("Invoice not found", BigDecimal.ZERO);
        }

        Invoice invoice = invoiceOpt.get();
        BigDecimal remainingBalance = invoice.getRemainingBalance();

        if (paymentAmount.compareTo(remainingBalance) > 0) {
            return PaymentValidationResponseDTO.invalid(
                    String.format("Payment amount $%.2f exceeds remaining balance $%.2f",
                            paymentAmount, remainingBalance),
                    remainingBalance);
        }

        return PaymentValidationResponseDTO.valid(remainingBalance);
    }

    // Helper method to convert Payment entity to PaymentResponseDTO DTO
    private PaymentResponseDTO convertToResponse(Payment payment) {
        PaymentResponseDTO response = new PaymentResponseDTO();
        response.setId(payment.getId());
        response.setAmount(payment.getAmount());
        response.setPaymentDate(payment.getPaymentDate());
        response.setPaymentMethod(payment.getPaymentMethod());
        response.setReferenceNumber(payment.getReferenceNumber());
        response.setNotes(payment.getNotes());
        response.setStatus(payment.getStatus());
        response.setCreatedBy(payment.getCreatedBy());
        response.setCreatedAt(payment.getCreatedAt());
        response.setUpdatedAt(payment.getUpdatedAt());

        // Set invoice summary
        Invoice invoice = payment.getInvoice();
        PaymentResponseDTO.InvoiceSummary invoiceSummary = new PaymentResponseDTO.InvoiceSummary(
                invoice.getId(),
                invoice.getInvoiceNumber(),
                invoice.getVendorName(),
                invoice.getTotalAmount(),
                invoice.getRemainingBalance()
        );
        response.setInvoice(invoiceSummary);

        return response;
    }
}



