package com.example.backend.controllers.payroll;

import com.example.backend.dto.payroll.PayslipDTO;
import com.example.backend.services.payroll.PayslipService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/payroll/payslips")
@RequiredArgsConstructor
@Slf4j
public class PayslipController {

    private final PayslipService payslipService;

    /**
     * Get all payslips with pagination and sorting
     */
    @GetMapping
    public ResponseEntity<Page<PayslipDTO>> getPayslips(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "payDate,desc") String sort,
            @RequestParam(required = false) String status) {

        // Parse sort parameter
        String[] sortParts = sort.split(",");
        Sort sortOrder = Sort.by(Sort.Direction.fromString(sortParts.length > 1 ? sortParts[1] : "desc"), sortParts[0]);
        Pageable pageable = PageRequest.of(page, size, sortOrder);

        Page<PayslipDTO> payslips;
        if (status != null && !status.isEmpty()) {
            payslips = payslipService.getPayslipsByStatus(status, pageable);
        } else {
            payslips = payslipService.getPayslips(pageable);
        }

        return ResponseEntity.ok(payslips);
    }

    /**
     * Get payslip by ID
     */
    @GetMapping("/{payslipId}")
    public ResponseEntity<PayslipDTO> getPayslipById(@PathVariable UUID payslipId) {
        PayslipDTO payslip = payslipService.getPayslipById(payslipId);
        return ResponseEntity.ok(payslip);
    }

    /**
     * Get payslips by employee with pagination
     */
    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<Page<PayslipDTO>> getPayslipsByEmployee(
            @PathVariable UUID employeeId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("payDate").descending());
        Page<PayslipDTO> payslips = payslipService.getPayslipsByEmployee(employeeId, pageable);
        return ResponseEntity.ok(payslips);
    }

    /**
     * Get payslips by period with pagination
     */
    @GetMapping("/period")
    public ResponseEntity<Page<PayslipDTO>> getPayslipsByPeriod(
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("payDate").descending());
        Page<PayslipDTO> payslips = payslipService.getPayslipsByPeriod(startDate, endDate, pageable);
        return ResponseEntity.ok(payslips);
    }

    /**
     * Get payslip status
     */
    @GetMapping("/{payslipId}/status")
    public ResponseEntity<String> getPayslipStatus(@PathVariable UUID payslipId) {
        String status = payslipService.getPayslipStatus(payslipId);
        return ResponseEntity.ok(status);
    }

    /**
     * Update payslip status
     */
    @PutMapping("/{payslipId}/status")
    public ResponseEntity<PayslipDTO> updatePayslipStatus(
            @PathVariable UUID payslipId,
            @RequestBody String status) {
        PayslipDTO updatedPayslip = payslipService.updatePayslipStatus(payslipId, status);
        return ResponseEntity.ok(updatedPayslip);
    }

    /**
     * Get pending payslips
     */
    @GetMapping("/pending")
    public ResponseEntity<List<PayslipDTO>> getPendingPayslips() {
        List<PayslipDTO> payslips = payslipService.getPendingPayslips();
        return ResponseEntity.ok(payslips);
    }

    /**
     * Get sent payslips with pagination
     */
    @GetMapping("/sent")
    public ResponseEntity<Page<PayslipDTO>> getSentPayslips(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("payDate").descending());
        Page<PayslipDTO> payslips = payslipService.getSentPayslips(pageable);
        return ResponseEntity.ok(payslips);
    }

    /**
     * Get acknowledged payslips with pagination
     */
    @GetMapping("/acknowledged")
    public ResponseEntity<Page<PayslipDTO>> getAcknowledgedPayslips(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("payDate").descending());
        Page<PayslipDTO> payslips = payslipService.getAcknowledgedPayslips(pageable);
        return ResponseEntity.ok(payslips);
    }

    /**
     * Generate PDF for payslip
     */
    @PostMapping("/{payslipId}/generate-pdf")
    public ResponseEntity<String> generatePayslipPdf(@PathVariable UUID payslipId) {
        String pdfPath = payslipService.generatePayslipPdf(payslipId);
        return ResponseEntity.ok(pdfPath);
    }

    /**
     * Send payslip via email
     */
    @PostMapping("/{payslipId}/send-email")
    public ResponseEntity<Void> sendPayslipEmail(@PathVariable UUID payslipId) {
        payslipService.sendPayslipEmail(payslipId);
        return ResponseEntity.ok().build();
    }

    /**
     * Acknowledge payslip receipt
     */
    @PostMapping("/{payslipId}/acknowledge")
    public ResponseEntity<Void> acknowledgePayslip(@PathVariable UUID payslipId) {
        payslipService.acknowledgePayslip(payslipId);
        return ResponseEntity.ok().build();
    }

    /**
     * Download payslip PDF
     */
    @GetMapping("/{payslipId}/download")
    public ResponseEntity<byte[]> downloadPayslipPdf(@PathVariable UUID payslipId) {
        byte[] pdfData = payslipService.downloadPayslipPdf(payslipId);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "payslip-" + payslipId + ".pdf");

        return ResponseEntity.ok().headers(headers).body(pdfData);
    }

    /**
     * Bulk generate PDFs for multiple payslips
     */
    @PostMapping("/bulk-generate")
    public ResponseEntity<Void> bulkGeneratePdfs(@RequestBody List<UUID> payslipIds) {
        payslipService.bulkGeneratePdfs(payslipIds);
        return ResponseEntity.ok().build();
    }

    /**
     * Bulk send emails for multiple payslips
     */
    @PostMapping("/bulk-send")
    public ResponseEntity<Void> bulkSendEmails(@RequestBody List<UUID> payslipIds) {
        payslipService.bulkSendEmails(payslipIds);
        return ResponseEntity.ok().build();
    }

    /**
     * Search payslips
     */
    @PostMapping("/search")
    public ResponseEntity<Page<PayslipDTO>> searchPayslips(
            @RequestBody Object searchCriteria,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("payDate").descending());
        Page<PayslipDTO> payslips = payslipService.searchPayslips(searchCriteria, pageable);
        return ResponseEntity.ok(payslips);
    }

    /**
     * Regenerate payslip
     */
    @PostMapping("/{payslipId}/regenerate")
    public ResponseEntity<PayslipDTO> regeneratePayslip(@PathVariable UUID payslipId) {
        PayslipDTO regeneratedPayslip = payslipService.regeneratePayslip(payslipId);
        return ResponseEntity.ok(regeneratedPayslip);
    }

    /**
     * Cancel payslip
     */
    @DeleteMapping("/{payslipId}")
    public ResponseEntity<Void> cancelPayslip(@PathVariable UUID payslipId) {
        payslipService.cancelPayslip(payslipId);
        return ResponseEntity.ok().build();
    }

    /**
     * Export payslips
     */
    @GetMapping("/export")
    public ResponseEntity<byte[]> exportPayslips(
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate,
            @RequestParam(defaultValue = "excel") String format) {

        byte[] exportData = payslipService.exportPayslips(startDate, endDate, format);

        HttpHeaders headers = new HttpHeaders();
        if ("excel".equals(format)) {
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", "payslips-export.xlsx");
        } else {
            headers.setContentType(MediaType.TEXT_PLAIN);
            headers.setContentDispositionFormData("attachment", "payslips-export.csv");
        }

        return ResponseEntity.ok().headers(headers).body(exportData);
    }
}