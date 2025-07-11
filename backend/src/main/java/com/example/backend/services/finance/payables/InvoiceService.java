// Invoice Service - handles all invoice business logic
package com.example.backend.services.finance.payables;

import com.example.backend.dto.finance.payables.InvoiceRequestDTO;
import com.example.backend.dto.finance.payables.InvoiceSearchRequestDTO;
import com.example.backend.dto.finance.payables.InvoiceResponseDTO;
import com.example.backend.dto.finance.payables.UnpaidInvoiceResponseDTO;
import com.example.backend.models.finance.payables.Invoice;
import com.example.backend.models.finance.payables.InvoiceStatus;
import com.example.backend.models.finance.payables.PaymentStatus;
import com.example.backend.repositories.finance.payables.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;

    // Create a new invoice
    public InvoiceResponseDTO createInvoice(InvoiceRequestDTO request, String createdBy) {
        // Validate invoice number is unique
        if (invoiceRepository.existsByInvoiceNumber(request.getInvoiceNumber())) {
            throw new RuntimeException("Invoice number already exists: " + request.getInvoiceNumber());
        }

        // Validate due date is not before invoice date
        if (request.getDueDate().isBefore(request.getInvoiceDate())) {
            throw new RuntimeException("Due date cannot be before invoice date");
        }

        Invoice invoice = new Invoice();
        invoice.setInvoiceNumber(request.getInvoiceNumber());
        invoice.setVendorName(request.getVendorName());
        invoice.setTotalAmount(request.getTotalAmount());
        invoice.setInvoiceDate(request.getInvoiceDate());
        invoice.setDueDate(request.getDueDate());
        invoice.setDescription(request.getDescription());
        invoice.setCreatedBy(createdBy);

        // Check if invoice is already overdue
        if (invoice.isOverdue()) {
            invoice.setStatus(InvoiceStatus.OVERDUE);
        }

        Invoice savedInvoice = invoiceRepository.save(invoice);
        return convertToResponse(savedInvoice);
    }
// Replace the updateInvoice method in your InvoiceService with this corrected version:

    // Update an existing invoice
    public InvoiceResponseDTO updateInvoice(UUID id, InvoiceRequestDTO request, String updatedBy) {
        // Find existing invoice
        Optional<Invoice> invoiceOpt = invoiceRepository.findById(id);
        if (invoiceOpt.isEmpty()) {
            throw new RuntimeException("Invoice not found with ID: " + id);
        }

        Invoice invoice = invoiceOpt.get();

        // Check if invoice can be updated (business logic)
        if (invoice.getStatus() == InvoiceStatus.FULLY_PAID) {
            throw new RuntimeException("Cannot update fully paid invoice");
        }

        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            throw new RuntimeException("Cannot update cancelled invoice");
        }

        // Check if invoice number is unique (if changed)
        if (!invoice.getInvoiceNumber().equals(request.getInvoiceNumber())) {
            if (invoiceRepository.existsByInvoiceNumber(request.getInvoiceNumber())) {
                throw new RuntimeException("Invoice number already exists: " + request.getInvoiceNumber());
            }
        }

        // Validate due date is not before invoice date
        if (request.getDueDate().isBefore(request.getInvoiceDate())) {
            throw new RuntimeException("Due date cannot be before invoice date");
        }

        // Store old total amount for balance adjustment
        BigDecimal oldTotalAmount = invoice.getTotalAmount();
        BigDecimal currentPaidAmount = invoice.getPaidAmount() != null ? invoice.getPaidAmount() : BigDecimal.ZERO;

        // Update invoice fields
        invoice.setInvoiceNumber(request.getInvoiceNumber());
        invoice.setVendorName(request.getVendorName());
        invoice.setTotalAmount(request.getTotalAmount());
        invoice.setInvoiceDate(request.getInvoiceDate());
        invoice.setDueDate(request.getDueDate());
        invoice.setDescription(request.getDescription());
        invoice.setUpdatedBy(updatedBy);
        invoice.setUpdatedAt(LocalDateTime.now());

        // If total amount changed, recalculate status
        if (!oldTotalAmount.equals(request.getTotalAmount())) {
            // The remaining balance is calculated automatically in getRemainingBalance()
            // Update status based on payments and new total
            BigDecimal newRemainingBalance = request.getTotalAmount().subtract(currentPaidAmount);

            if (newRemainingBalance.compareTo(BigDecimal.ZERO) == 0) {
                invoice.setStatus(InvoiceStatus.FULLY_PAID);
            } else if (newRemainingBalance.compareTo(BigDecimal.ZERO) < 0) {
                // Overpaid - this shouldn't normally happen, but handle it
                invoice.setStatus(InvoiceStatus.FULLY_PAID);
            } else if (currentPaidAmount.compareTo(BigDecimal.ZERO) > 0) {
                // Has some payments but not fully paid
                invoice.setStatus(InvoiceStatus.PARTIALLY_PAID);
            } else {
                // No payments made yet - check if overdue
                if (request.getDueDate().isBefore(LocalDate.now())) {
                    invoice.setStatus(InvoiceStatus.OVERDUE);
                } else {
                    invoice.setStatus(InvoiceStatus.PENDING);
                }
            }
        } else {
            // Total amount didn't change, but check if overdue status changed
            if (invoice.getStatus() == InvoiceStatus.PENDING && invoice.isOverdue()) {
                invoice.setStatus(InvoiceStatus.OVERDUE);
            } else if (invoice.getStatus() == InvoiceStatus.OVERDUE && !invoice.isOverdue()) {
                invoice.setStatus(InvoiceStatus.PENDING);
            }
        }

        Invoice savedInvoice = invoiceRepository.save(invoice);
        return convertToResponse(savedInvoice);
    }

    // Delete an invoice (soft delete)
    public void deleteInvoice(UUID id, String deletedBy) {
        // Find existing invoice
        Optional<Invoice> invoiceOpt = invoiceRepository.findById(id);
        if (invoiceOpt.isEmpty()) {
            throw new RuntimeException("Invoice not found with ID: " + id);
        }

        Invoice invoice = invoiceOpt.get();

        // Check if invoice can be deleted (business logic)
        if (invoice.getStatus() == InvoiceStatus.FULLY_PAID) {
            throw new RuntimeException("Cannot delete fully paid invoice. Fully paid invoices should be archived, not deleted.");
        }

        if (invoice.getStatus() == InvoiceStatus.PARTIALLY_PAID) {
            throw new RuntimeException("Cannot delete invoice with partial payments. Please reverse payments first.");
        }

        // Check if there are any payments (even if status allows deletion)
        if (invoice.getPayments() != null && !invoice.getPayments().isEmpty()) {
            long activePayments = invoice.getPayments().stream()
                    .filter(payment -> payment.getStatus() != PaymentStatus.CANCELLED)
                    .count();

            if (activePayments > 0) {
                throw new RuntimeException("Cannot delete invoice with active payments. Please cancel all payments first.");
            }
        }

        // Perform soft delete (recommended for audit trail)
        invoice.setStatus(InvoiceStatus.CANCELLED);
        invoice.setDeletedBy(deletedBy);
        invoice.setDeletedAt(LocalDateTime.now());
        invoice.setUpdatedBy(deletedBy);
        invoice.setUpdatedAt(LocalDateTime.now());

        invoiceRepository.save(invoice);

        // Alternative: Hard delete (uncomment if you prefer hard delete)
        // invoiceRepository.delete(invoice);
    }

    // Helper method to check if invoice can be modified
    private void validateInvoiceCanBeModified(Invoice invoice, String operation) {
        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            throw new RuntimeException("Cannot " + operation + " cancelled invoice");
        }

        if (invoice.getStatus() == InvoiceStatus.FULLY_PAID) {
            throw new RuntimeException("Cannot " + operation + " fully paid invoice");
        }
    }

    // Get invoice by ID
    @Transactional(readOnly = true)
    public InvoiceResponseDTO getInvoiceById(UUID id) {
        Optional<Invoice> invoiceOpt = invoiceRepository.findById(id);
        if (invoiceOpt.isEmpty()) {
            throw new RuntimeException("Invoice not found with ID: " + id);
        }
        return convertToResponse(invoiceOpt.get());
    }

    // Get invoice by invoice number
    @Transactional(readOnly = true)
    public InvoiceResponseDTO getInvoiceByNumber(String invoiceNumber) {
        Optional<Invoice> invoiceOpt = invoiceRepository.findByInvoiceNumber(invoiceNumber);
        if (invoiceOpt.isEmpty()) {
            throw new RuntimeException("Invoice not found with number: " + invoiceNumber);
        }
        return convertToResponse(invoiceOpt.get());
    }

    // Get all invoices with pagination
    @Transactional(readOnly = true)
    public Page<InvoiceResponseDTO> getAllInvoices(Pageable pageable) {
        Page<Invoice> invoicesPage = invoiceRepository.findAllByOrderByInvoiceDateDesc(pageable);
        return invoicesPage.map(this::convertToResponse);
    }

    // Get unpaid invoices for payment processing
    @Transactional(readOnly = true)
    public List<UnpaidInvoiceResponseDTO> getUnpaidInvoices() {
        List<InvoiceStatus> unpaidStatuses = Arrays.asList(
                InvoiceStatus.PENDING, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE
        );

        List<Invoice> invoices = invoiceRepository.findUnpaidInvoices(unpaidStatuses);
        return invoices.stream()
                .map(this::convertToUnpaidResponse)
                .collect(Collectors.toList());
    }

    // Get overdue invoices
    @Transactional(readOnly = true)
    public List<InvoiceResponseDTO> getOverdueInvoices() {
        List<Invoice> invoices = invoiceRepository.findOverdueInvoices(LocalDate.now());
        return invoices.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    // Get invoices due within X days
    @Transactional(readOnly = true)
    public List<InvoiceResponseDTO> getInvoicesDueWithinDays(int days) {
        LocalDate currentDate = LocalDate.now();
        LocalDate futureDate = currentDate.plusDays(days);

        List<Invoice> invoices = invoiceRepository.findInvoicesDueWithinDays(currentDate, futureDate);
        return invoices.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    // Get invoices by vendor
    @Transactional(readOnly = true)
    public List<InvoiceResponseDTO> getInvoicesByVendor(String vendorName) {
        List<Invoice> invoices = invoiceRepository.findByVendorNameContainingIgnoreCaseOrderByInvoiceDateDesc(vendorName);
        return invoices.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    // Get invoices by status
    @Transactional(readOnly = true)
    public List<InvoiceResponseDTO> getInvoicesByStatus(InvoiceStatus status) {
        List<Invoice> invoices = invoiceRepository.findByStatusOrderByDueDateAsc(status);
        return invoices.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    // Get invoices by date range
    @Transactional(readOnly = true)
    public List<InvoiceResponseDTO> getInvoicesByDateRange(LocalDate startDate, LocalDate endDate) {
        List<Invoice> invoices = invoiceRepository.findByInvoiceDateBetweenOrderByInvoiceDateDesc(startDate, endDate);
        return invoices.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    // Advanced search with multiple criteria
    @Transactional(readOnly = true)
    public Page<InvoiceResponseDTO> searchInvoices(InvoiceSearchRequestDTO searchRequest) {
        Pageable pageable = PageRequest.of(searchRequest.getPage(), searchRequest.getSize());

        Page<Invoice> invoicesPage = invoiceRepository.searchInvoices(
                searchRequest.getVendorName(),
                searchRequest.getInvoiceNumber(),
                searchRequest.getDescription(),
                searchRequest.getStatus(),
                searchRequest.getStartDate(),
                searchRequest.getEndDate(),
                searchRequest.getMinAmount(),
                searchRequest.getMaxAmount(),
                pageable
        );

        return invoicesPage.map(this::convertToResponse);
    }

    // Calculate total outstanding amount
    @Transactional(readOnly = true)
    public BigDecimal calculateTotalOutstandingAmount() {
        List<InvoiceStatus> unpaidStatuses = Arrays.asList(
                InvoiceStatus.PENDING, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE
        );
        return invoiceRepository.calculateTotalOutstandingAmount(unpaidStatuses);
    }

    // Calculate total invoice amount for period
    @Transactional(readOnly = true)
    public BigDecimal calculateTotalInvoiceAmountByPeriod(LocalDate startDate, LocalDate endDate) {
        return invoiceRepository.calculateTotalInvoiceAmountByPeriod(startDate, endDate);
    }

    // Get top vendors by invoice amount
    @Transactional(readOnly = true)
    public List<Object[]> getTopVendorsByPeriod(LocalDate startDate, LocalDate endDate, int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        return invoiceRepository.findTopVendorsByPeriod(startDate, endDate, pageable);
    }

    // Get vendor statistics
    @Transactional(readOnly = true)
    public List<Object[]> getVendorStatistics(LocalDate startDate, LocalDate endDate) {
        return invoiceRepository.getVendorStatistics(startDate, endDate);
    }

    // AGING REPORT METHODS (P-004 requirement)
// Replace these methods in your InvoiceService class

    // Replace these aging methods in your InvoiceService with consistent logic

    @Transactional(readOnly = true)
    public List<InvoiceResponseDTO> getInvoicesAged0To30Days() {
        LocalDate currentDate = LocalDate.now();

        // Get unpaid invoices with the same statuses as getAgingTotals()
        List<InvoiceStatus> unpaidStatuses = Arrays.asList(
                InvoiceStatus.PENDING,
                InvoiceStatus.PARTIALLY_PAID,
                InvoiceStatus.OVERDUE
        );

        List<Invoice> unpaidInvoices = invoiceRepository.findUnpaidInvoices(unpaidStatuses);

        // Filter for 0-30 days bucket (includes not due yet AND past due 0-30 days)
        List<Invoice> filtered = unpaidInvoices.stream()
                .filter(invoice -> {
                    if (invoice.getDueDate() != null) {
                        long daysPastDue = ChronoUnit.DAYS.between(invoice.getDueDate(), currentDate);
                        // Include: not due yet (negative days) OR past due 0-30 days
                        return daysPastDue <= 30;
                    }
                    return false;
                })
                .collect(Collectors.toList());

        return filtered.stream().map(this::convertToResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<InvoiceResponseDTO> getInvoicesAged31To60Days() {
        LocalDate currentDate = LocalDate.now();

        List<InvoiceStatus> unpaidStatuses = Arrays.asList(
                InvoiceStatus.PENDING,
                InvoiceStatus.PARTIALLY_PAID,
                InvoiceStatus.OVERDUE
        );

        List<Invoice> unpaidInvoices = invoiceRepository.findUnpaidInvoices(unpaidStatuses);

        // Filter for 31-60 days past due
        List<Invoice> filtered = unpaidInvoices.stream()
                .filter(invoice -> {
                    if (invoice.getDueDate() != null) {
                        long daysPastDue = ChronoUnit.DAYS.between(invoice.getDueDate(), currentDate);
                        return daysPastDue >= 31 && daysPastDue <= 60;
                    }
                    return false;
                })
                .collect(Collectors.toList());

        return filtered.stream().map(this::convertToResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<InvoiceResponseDTO> getInvoicesAged61To90Days() {
        LocalDate currentDate = LocalDate.now();

        List<InvoiceStatus> unpaidStatuses = Arrays.asList(
                InvoiceStatus.PENDING,
                InvoiceStatus.PARTIALLY_PAID,
                InvoiceStatus.OVERDUE
        );

        List<Invoice> unpaidInvoices = invoiceRepository.findUnpaidInvoices(unpaidStatuses);

        // Filter for 61-90 days past due
        List<Invoice> filtered = unpaidInvoices.stream()
                .filter(invoice -> {
                    if (invoice.getDueDate() != null) {
                        long daysPastDue = ChronoUnit.DAYS.between(invoice.getDueDate(), currentDate);
                        return daysPastDue >= 61 && daysPastDue <= 90;
                    }
                    return false;
                })
                .collect(Collectors.toList());

        return filtered.stream().map(this::convertToResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<InvoiceResponseDTO> getInvoicesAgedOver90Days() {
        LocalDate currentDate = LocalDate.now();

        List<InvoiceStatus> unpaidStatuses = Arrays.asList(
                InvoiceStatus.PENDING,
                InvoiceStatus.PARTIALLY_PAID,
                InvoiceStatus.OVERDUE
        );

        List<Invoice> unpaidInvoices = invoiceRepository.findUnpaidInvoices(unpaidStatuses);

        // Filter for over 90 days past due
        List<Invoice> filtered = unpaidInvoices.stream()
                .filter(invoice -> {
                    if (invoice.getDueDate() != null) {
                        long daysPastDue = ChronoUnit.DAYS.between(invoice.getDueDate(), currentDate);
                        return daysPastDue > 90;
                    }
                    return false;
                })
                .collect(Collectors.toList());

        return filtered.stream().map(this::convertToResponse).collect(Collectors.toList());
    }

    // Also add this debug method to verify your data
    @Transactional(readOnly = true)
    public void debugAgingData() {
        LocalDate currentDate = LocalDate.now();

        List<InvoiceStatus> unpaidStatuses = Arrays.asList(
                InvoiceStatus.PENDING,
                InvoiceStatus.PARTIALLY_PAID,
                InvoiceStatus.OVERDUE
        );

        List<Invoice> unpaidInvoices = invoiceRepository.findUnpaidInvoices(unpaidStatuses);

        System.out.println("=== AGING DEBUG INFO ===");
        System.out.println("Current date: " + currentDate);
        System.out.println("Total unpaid invoices: " + unpaidInvoices.size());

        for (Invoice invoice : unpaidInvoices) {
            if (invoice.getDueDate() != null) {
                long daysPastDue = ChronoUnit.DAYS.between(invoice.getDueDate(), currentDate);
                BigDecimal remainingBalance = invoice.getRemainingBalance();

                System.out.println("Invoice: " + invoice.getInvoiceNumber() +
                        ", Due: " + invoice.getDueDate() +
                        ", Days past due: " + daysPastDue +
                        ", Remaining: $" + remainingBalance +
                        ", Status: " + invoice.getStatus());
            }
        }
        System.out.println("=== END DEBUG ===");
    }

    //@Override
    // Add this debug method to your InvoiceService temporarily
    // Replace your aging method with this corrected version
    //@Override
    @Transactional(readOnly = true)
    public Object[] getAgingTotals() {
        LocalDate currentDate = LocalDate.now();

        // Fix 1: Include OVERDUE status in unpaid statuses (using correct enum values)
        List<InvoiceStatus> unpaidStatuses = Arrays.asList(
                InvoiceStatus.PENDING,
                InvoiceStatus.PARTIALLY_PAID,
                InvoiceStatus.OVERDUE  // Added this!
                // Note: FULLY_PAID and CANCELLED are excluded as they shouldn't be in aging
        );

        List<Invoice> unpaidInvoices = invoiceRepository.findUnpaidInvoices(unpaidStatuses);

        BigDecimal aged0To30 = BigDecimal.ZERO;
        BigDecimal aged31To60 = BigDecimal.ZERO;
        BigDecimal aged61To90 = BigDecimal.ZERO;
        BigDecimal agedOver90 = BigDecimal.ZERO;

        for (Invoice invoice : unpaidInvoices) {
            if (invoice.getDueDate() != null) {
                // Fix 2: Correct the days calculation (currentDate - dueDate, not dueDate - currentDate)
                long daysPastDue = ChronoUnit.DAYS.between(invoice.getDueDate(), currentDate);
                BigDecimal remainingBalance = invoice.getTotalAmount().subtract(
                        invoice.getPaidAmount() != null ? invoice.getPaidAmount() : BigDecimal.ZERO
                );

                // Debug output (remove this later)
                System.out.println("Invoice " + invoice.getInvoiceNumber() +
                        ": " + daysPastDue + " days past due, " +
                        "Remaining: $" + remainingBalance);

                if (daysPastDue < 0) {
                    // Not past due yet - these go in current/0-30 bucket for "due soon"
                    aged0To30 = aged0To30.add(remainingBalance);
                    System.out.println("  -> Added to 0-30 bucket (not due yet)");
                } else if (daysPastDue >= 0 && daysPastDue <= 30) {
                    // Past due 0-30 days
                    aged0To30 = aged0To30.add(remainingBalance);
                    System.out.println("  -> Added to 0-30 bucket (past due)");
                } else if (daysPastDue >= 31 && daysPastDue <= 60) {
                    aged31To60 = aged31To60.add(remainingBalance);
                    System.out.println("  -> Added to 31-60 bucket");
                } else if (daysPastDue >= 61 && daysPastDue <= 90) {
                    aged61To90 = aged61To90.add(remainingBalance);
                    System.out.println("  -> Added to 61-90 bucket");
                } else if (daysPastDue > 90) {
                    agedOver90 = agedOver90.add(remainingBalance);
                    System.out.println("  -> Added to 90+ bucket");
                }
            }
        }

        System.out.println("Final totals:");
        System.out.println("0-30: $" + aged0To30);
        System.out.println("31-60: $" + aged31To60);
        System.out.println("61-90: $" + aged61To90);
        System.out.println("90+: $" + agedOver90);

        return new Object[]{aged0To30, aged31To60, aged61To90, agedOver90};
    }
    // Helper method to convert Invoice entity to InvoiceResponse DTO
    private InvoiceResponseDTO convertToResponse(Invoice invoice) {
        InvoiceResponseDTO response = new InvoiceResponseDTO();
        response.setId(invoice.getId());
        response.setInvoiceNumber(invoice.getInvoiceNumber());
        response.setVendorName(invoice.getVendorName());
        response.setTotalAmount(invoice.getTotalAmount());
        response.setPaidAmount(invoice.getPaidAmount());
        response.setRemainingBalance(invoice.getRemainingBalance());
        response.setInvoiceDate(invoice.getInvoiceDate());
        response.setDueDate(invoice.getDueDate());
        response.setDescription(invoice.getDescription());
        response.setStatus(invoice.getStatus());
        response.setOverdue(invoice.isOverdue());
        response.setCreatedBy(invoice.getCreatedBy());
        response.setCreatedAt(invoice.getCreatedAt());
        response.setUpdatedAt(invoice.getUpdatedAt());

        // Convert payments to payment summaries
        List<InvoiceResponseDTO.PaymentSummary> paymentSummaries = invoice.getPayments().stream()
                .map(payment -> new InvoiceResponseDTO.PaymentSummary(
                        payment.getId(),
                        payment.getAmount(),
                        payment.getPaymentDate(),
                        payment.getPaymentMethod().getDisplayName(),
                        payment.getReferenceNumber(),
                        payment.getStatus()
                ))
                .collect(Collectors.toList());
        response.setPayments(paymentSummaries);

        return response;
    }

    // Helper method to convert Invoice entity to UnpaidInvoiceResponse DTO
    private UnpaidInvoiceResponseDTO convertToUnpaidResponse(Invoice invoice) {
        return new UnpaidInvoiceResponseDTO(
                invoice.getId(),
                invoice.getInvoiceNumber(),
                invoice.getVendorName(),
                invoice.getTotalAmount(),
                invoice.getRemainingBalance(),
                invoice.getDueDate(),
                invoice.isOverdue()
        );
    }
}