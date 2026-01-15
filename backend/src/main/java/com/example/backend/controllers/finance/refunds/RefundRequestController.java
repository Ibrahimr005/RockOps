package com.example.backend.controllers.finance.refunds;

import com.example.backend.dto.finance.refunds.ConfirmRefundRequestDTO;
import com.example.backend.dto.finance.refunds.RefundRequestResponseDTO;
import com.example.backend.models.finance.refunds.RefundStatus;
import com.example.backend.services.finance.refunds.RefundRequestService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/finance/refunds")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "http://localhost:3000")
public class RefundRequestController {

    private final RefundRequestService refundRequestService;

    /**
     * Get all refund requests
     */
    @GetMapping
    public ResponseEntity<List<RefundRequestResponseDTO>> getAllRefundRequests() {
        log.info("GET /api/finance/refunds - Fetching all refund requests");
        try {
            List<RefundRequestResponseDTO> refunds = refundRequestService.getAllRefundRequests();
            return ResponseEntity.ok(refunds);
        } catch (Exception e) {
            log.error("Error fetching all refund requests", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get refund requests by status
     */
    @GetMapping("/status/{status}")
    public ResponseEntity<List<RefundRequestResponseDTO>> getRefundRequestsByStatus(
            @PathVariable RefundStatus status) {
        log.info("GET /api/finance/refunds/status/{} - Fetching refunds by status", status);
        try {
            List<RefundRequestResponseDTO> refunds = refundRequestService.getRefundRequestsByStatus(status);
            return ResponseEntity.ok(refunds);
        } catch (Exception e) {
            log.error("Error fetching refund requests by status: {}", status, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get a single refund request by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<RefundRequestResponseDTO> getRefundRequestById(@PathVariable UUID id) {
        log.info("GET /api/finance/refunds/{} - Fetching refund request", id);
        try {
            RefundRequestResponseDTO refund = refundRequestService.getRefundRequestById(id);
            return ResponseEntity.ok(refund);
        } catch (RuntimeException e) {
            log.error("Refund request not found: {}", id, e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            log.error("Error fetching refund request: {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Confirm refund receipt
     */
    @PostMapping("/{id}/confirm")
    public ResponseEntity<RefundRequestResponseDTO> confirmRefund(
            @PathVariable UUID id,
            @RequestBody ConfirmRefundRequestDTO confirmDTO,
            Authentication authentication) {

        String confirmedBy = authentication != null ? authentication.getName() : "System";
        log.info("POST /api/finance/refunds/{}/confirm - Confirming refund by: {}", id, confirmedBy);

        try {
            RefundRequestResponseDTO confirmedRefund = refundRequestService.confirmRefund(id, confirmDTO, confirmedBy);
            return ResponseEntity.ok(confirmedRefund);
        } catch (RuntimeException e) {
            log.error("Error confirming refund: {}", id, e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        } catch (Exception e) {
            log.error("Error confirming refund: {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}