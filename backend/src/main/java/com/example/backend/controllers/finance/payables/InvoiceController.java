package com.example.backend.controllers.finance.payables;

import com.example.backend.dto.finance.payables.InvoiceRequestDTO;
import com.example.backend.dto.finance.payables.InvoiceResponseDTO;
import com.example.backend.dto.finance.payables.InvoiceSearchRequestDTO;
import com.example.backend.dto.finance.payables.UnpaidInvoiceResponseDTO;
import com.example.backend.models.finance.payables.InvoiceStatus;
import com.example.backend.services.finance.payables.InvoiceService;
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

import com.example.backend.utils.ExportUtil;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import java.time.format.DateTimeFormatter;
import java.io.IOException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/v1/invoices")
@CrossOrigin(origins = "*")
public class InvoiceController {

    private final InvoiceService invoiceService;
    private ExportUtil exportUtil;

    @Autowired
    public InvoiceController(InvoiceService invoiceService, ExportUtil exportUtil) {
        this.invoiceService = invoiceService;
        this.exportUtil = exportUtil;
    }

    // Helper method to get the current authenticated user
    private String getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()) {
            return authentication.getName();
        }
        return "system"; // fallback
    }

    // Create a new invoice
    // POST /api/v1/invoices
    @PostMapping
    public ResponseEntity<?> createInvoice(@RequestBody InvoiceRequestDTO request) {
        try {
            // Get the authenticated user from the request or security context
            String createdBy = request.getCreatedBy();
            if (createdBy == null || createdBy.trim().isEmpty()) {
                // Fallback to security context if not provided in request
                createdBy = getCurrentUser();
            }

            InvoiceResponseDTO invoice = invoiceService.createInvoice(request, createdBy);
            return ResponseEntity.status(HttpStatus.CREATED).body(invoice);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    // Update an existing invoice
    // PUT /api/v1/invoices/{id}
    @PutMapping("/{id}")
    public ResponseEntity<?> updateInvoice(@PathVariable UUID id, @RequestBody InvoiceRequestDTO request) {
        try {
            // Get the authenticated user for the update
            String updatedBy = request.getUpdatedBy();
            if (updatedBy == null || updatedBy.trim().isEmpty()) {
                updatedBy = getCurrentUser();
            }

            InvoiceResponseDTO invoice = invoiceService.updateInvoice(id, request, updatedBy);
            return ResponseEntity.ok(invoice);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    // Delete an invoice
    // DELETE /api/v1/invoices/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteInvoice(@PathVariable UUID id) {
        try {
            String deletedBy = getCurrentUser();
            invoiceService.deleteInvoice(id, deletedBy);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    // Get invoice by ID
    // GET /api/v1/invoices/{id}
    @GetMapping("/{id}")
    public ResponseEntity<?> getInvoice(@PathVariable UUID id) {
        try {
            InvoiceResponseDTO invoice = invoiceService.getInvoiceById(id);
            return ResponseEntity.ok(invoice);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    // Get invoice by invoice number
    // GET /api/v1/invoices/number/{invoiceNumber}
    @GetMapping("/number/{invoiceNumber}")
    public ResponseEntity<?> getInvoiceByNumber(@PathVariable String invoiceNumber) {
        try {
            InvoiceResponseDTO invoice = invoiceService.getInvoiceByNumber(invoiceNumber);
            return ResponseEntity.ok(invoice);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    // Get all invoices with pagination
    // GET /api/v1/invoices?page=0&size=20
    @GetMapping
    public ResponseEntity<Page<InvoiceResponseDTO>> getAllInvoices(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size);
        Page<InvoiceResponseDTO> invoices = invoiceService.getAllInvoices(pageable);
        return ResponseEntity.ok(invoices);
    }

    // Get unpaid invoices (for payment selection)
    // GET /api/v1/invoices/unpaid
    @GetMapping("/unpaid")
    public ResponseEntity<List<UnpaidInvoiceResponseDTO>> getUnpaidInvoices() {
        List<UnpaidInvoiceResponseDTO> invoices = invoiceService.getUnpaidInvoices();
        return ResponseEntity.ok(invoices);
    }

    // Get overdue invoices
    // GET /api/v1/invoices/overdue
    @GetMapping("/overdue")
    public ResponseEntity<List<InvoiceResponseDTO>> getOverdueInvoices() {
        List<InvoiceResponseDTO> invoices = invoiceService.getOverdueInvoices();
        return ResponseEntity.ok(invoices);
    }

    // Get invoices due within X days
    // GET /api/v1/invoices/due-soon?days=7
    @GetMapping("/due-soon")
    public ResponseEntity<List<InvoiceResponseDTO>> getInvoicesDueSoon(
            @RequestParam(defaultValue = "7") int days) {

        List<InvoiceResponseDTO> invoices = invoiceService.getInvoicesDueWithinDays(days);
        return ResponseEntity.ok(invoices);
    }

    // Get invoices by vendor
    // GET /api/v1/invoices/vendor?vendorName=ABC Lumber
    @GetMapping("/vendor")
    public ResponseEntity<List<InvoiceResponseDTO>> getInvoicesByVendor(
            @RequestParam String vendorName) {

        List<InvoiceResponseDTO> invoices = invoiceService.getInvoicesByVendor(vendorName);
        return ResponseEntity.ok(invoices);
    }

    // Get invoices by status
    // GET /api/v1/invoices/status?status=PENDING
    @GetMapping("/status")
    public ResponseEntity<List<InvoiceResponseDTO>> getInvoicesByStatus(
            @RequestParam InvoiceStatus status) {

        List<InvoiceResponseDTO> invoices = invoiceService.getInvoicesByStatus(status);
        return ResponseEntity.ok(invoices);
    }

    // Get invoices by date range
    // GET /api/v1/invoices/date-range?startDate=2024-01-01&endDate=2024-01-31
    @GetMapping("/date-range")
    public ResponseEntity<List<InvoiceResponseDTO>> getInvoicesByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        List<InvoiceResponseDTO> invoices = invoiceService.getInvoicesByDateRange(startDate, endDate);
        return ResponseEntity.ok(invoices);
    }

    // Advanced search with multiple criteria
    // POST /api/v1/invoices/search
    @PostMapping("/search")
    public ResponseEntity<Page<InvoiceResponseDTO>> searchInvoices(
            @RequestBody InvoiceSearchRequestDTO searchRequest) {

        Page<InvoiceResponseDTO> invoices = invoiceService.searchInvoices(searchRequest);
        return ResponseEntity.ok(invoices);
    }

    // Calculate total outstanding amount
    // GET /api/v1/invoices/outstanding-total
    @GetMapping("/outstanding-total")
    public ResponseEntity<Map<String, Object>> getTotalOutstanding() {
        BigDecimal total = invoiceService.calculateTotalOutstandingAmount();

        Map<String, Object> response = new HashMap<>();
        response.put("totalOutstandingAmount", total);
        response.put("asOfDate", LocalDate.now());

        return ResponseEntity.ok(response);
    }

    // Calculate total invoice amount for period
    // GET /api/v1/invoices/period-total?startDate=2024-01-01&endDate=2024-01-31
    @GetMapping("/period-total")
    public ResponseEntity<Map<String, Object>> getTotalForPeriod(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        BigDecimal total = invoiceService.calculateTotalInvoiceAmountByPeriod(startDate, endDate);

        Map<String, Object> response = new HashMap<>();
        response.put("startDate", startDate);
        response.put("endDate", endDate);
        response.put("totalInvoiceAmount", total);

        return ResponseEntity.ok(response);
    }

    // Get top vendors by invoice amount
    // GET /api/v1/invoices/top-vendors?startDate=2024-01-01&endDate=2024-01-31&limit=10
    @GetMapping("/top-vendors")
    public ResponseEntity<List<Object[]>> getTopVendors(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "10") int limit) {

        List<Object[]> topVendors = invoiceService.getTopVendorsByPeriod(startDate, endDate, limit);
        return ResponseEntity.ok(topVendors);
    }

    // Get vendor statistics
    // GET /api/v1/invoices/vendor-stats?startDate=2024-01-01&endDate=2024-01-31
    @GetMapping("/vendor-stats")
    public ResponseEntity<List<Object[]>> getVendorStatistics(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        List<Object[]> vendorStats = invoiceService.getVendorStatistics(startDate, endDate);
        return ResponseEntity.ok(vendorStats);
    }

    // AGING REPORT ENDPOINTS

    // Get invoices aged 0-30 days
    // GET /api/v1/invoices/aging/0-30
    @GetMapping("/aging/0-30")
    public ResponseEntity<List<InvoiceResponseDTO>> getInvoicesAged0To30() {
        List<InvoiceResponseDTO> invoices = invoiceService.getInvoicesAged0To30Days();
        return ResponseEntity.ok(invoices);
    }

    // Get invoices aged 31-60 days
    // GET /api/v1/invoices/aging/31-60
    @GetMapping("/aging/31-60")
    public ResponseEntity<List<InvoiceResponseDTO>> getInvoicesAged31To60() {
        List<InvoiceResponseDTO> invoices = invoiceService.getInvoicesAged31To60Days();
        return ResponseEntity.ok(invoices);
    }

    // Get invoices aged 61-90 days
    // GET /api/v1/invoices/aging/61-90
    @GetMapping("/aging/61-90")
    public ResponseEntity<List<InvoiceResponseDTO>> getInvoicesAged61To90() {
        List<InvoiceResponseDTO> invoices = invoiceService.getInvoicesAged61To90Days();
        return ResponseEntity.ok(invoices);
    }

    // Get invoices aged over 90 days
    // GET /api/v1/invoices/aging/over-90
    @GetMapping("/aging/over-90")
    public ResponseEntity<List<InvoiceResponseDTO>> getInvoicesAgedOver90() {
        List<InvoiceResponseDTO> invoices = invoiceService.getInvoicesAgedOver90Days();
        return ResponseEntity.ok(invoices);
    }

    @GetMapping("/aging/export/pdf")
    public ResponseEntity<?> exportAgingReportToPDF() {
        try {
            // Get aging report data using your existing service methods
            List<InvoiceResponseDTO> invoices0To30 = invoiceService.getInvoicesAged0To30Days();
            List<InvoiceResponseDTO> invoices31To60 = invoiceService.getInvoicesAged31To60Days();
            List<InvoiceResponseDTO> invoices61To90 = invoiceService.getInvoicesAged61To90Days();
            List<InvoiceResponseDTO> invoicesOver90 = invoiceService.getInvoicesAgedOver90Days();

            // Generate PDF using ExportUtil
            byte[] pdfBytes = exportUtil.exportAgingReportToPDF(
                    invoices0To30,
                    invoices31To60,
                    invoices61To90,
                    invoicesOver90
            );

            // Set response headers for PDF download
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDisposition(ContentDisposition.builder("attachment")
                    .filename("aging-report-" + LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")) + ".pdf")
                    .build());

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(pdfBytes);

        } catch (IOException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to generate PDF: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Unexpected error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    // Get aging report summary (supports both JSON and PDF formats)
    // GET /api/v1/invoices/aging/summary
    // GET /api/v1/invoices/aging/summary?format=pdf
    @GetMapping("/aging/summary")
    public ResponseEntity<?> getAgingSummary(@RequestParam(defaultValue = "json") String format) {
        try {
            if ("pdf".equalsIgnoreCase(format)) {
                // Get aging report data
                List<InvoiceResponseDTO> invoices0To30 = invoiceService.getInvoicesAged0To30Days();
                List<InvoiceResponseDTO> invoices31To60 = invoiceService.getInvoicesAged31To60Days();
                List<InvoiceResponseDTO> invoices61To90 = invoiceService.getInvoicesAged61To90Days();
                List<InvoiceResponseDTO> invoicesOver90 = invoiceService.getInvoicesAgedOver90Days();

                // Generate PDF
                byte[] pdfBytes = exportUtil.exportAgingReportToPDF(
                        invoices0To30,
                        invoices31To60,
                        invoices61To90,
                        invoicesOver90
                );

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_PDF);
                headers.setContentDisposition(ContentDisposition.builder("attachment")
                        .filename("aging-summary-" + LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")) + ".pdf")
                        .build());

                return ResponseEntity.ok()
                        .headers(headers)
                        .body(pdfBytes);
            } else {
                // Return JSON response (existing logic)
                Object[] totals = invoiceService.getAgingTotals();

                Map<String, Object> response = new HashMap<>();
                response.put("aged0To30", totals[0]);
                response.put("aged31To60", totals[1]);
                response.put("aged61To90", totals[2]);
                response.put("agedOver90", totals[3]);
                response.put("asOfDate", LocalDate.now());

                return ResponseEntity.ok(response);
            }

        } catch (IOException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to generate PDF: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Unexpected error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
}