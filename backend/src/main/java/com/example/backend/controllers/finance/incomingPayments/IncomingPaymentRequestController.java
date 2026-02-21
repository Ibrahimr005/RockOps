package com.example.backend.controllers.finance.incomingPayments;

import com.example.backend.dto.finance.incomingPayments.ConfirmIncomingPaymentRequestDTO;
import com.example.backend.dto.finance.incomingPayments.IncomingPaymentRequestResponseDTO;
import com.example.backend.models.finance.incomingPayments.IncomingPaymentSource;
import com.example.backend.models.finance.incomingPayments.IncomingPaymentStatus;
import com.example.backend.services.finance.incomingPayments.IncomingPaymentRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/v1/finance/incoming-payments")
@RequiredArgsConstructor
public class IncomingPaymentRequestController {

    private final IncomingPaymentRequestService incomingPaymentRequestService;

    /**
     * Get all incoming payment requests
     */
    @GetMapping
    public ResponseEntity<List<IncomingPaymentRequestResponseDTO>> getAllIncomingPayments() {
        try {
            List<IncomingPaymentRequestResponseDTO> requests =
                    incomingPaymentRequestService.getAllIncomingPaymentRequests();
            return ResponseEntity.ok(requests);
        } catch (Exception e) {
            System.err.println("Error fetching incoming payment requests: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get incoming payment requests by status
     */
    @GetMapping("/status/{status}")
    public ResponseEntity<List<IncomingPaymentRequestResponseDTO>> getIncomingPaymentsByStatus(
            @PathVariable IncomingPaymentStatus status) {
        try {
            List<IncomingPaymentRequestResponseDTO> requests =
                    incomingPaymentRequestService.getIncomingPaymentRequestsByStatus(status);
            return ResponseEntity.ok(requests);
        } catch (Exception e) {
            System.err.println("Error fetching incoming payment requests by status: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get incoming payment requests by source (REFUND or PO_RETURN)
     */
    @GetMapping("/source/{source}")
    public ResponseEntity<List<IncomingPaymentRequestResponseDTO>> getIncomingPaymentsBySource(
            @PathVariable IncomingPaymentSource source) {
        try {
            List<IncomingPaymentRequestResponseDTO> requests =
                    incomingPaymentRequestService.getIncomingPaymentRequestsBySource(source);
            return ResponseEntity.ok(requests);
        } catch (Exception e) {
            System.err.println("Error fetching incoming payment requests by source: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get single incoming payment request by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getIncomingPaymentById(@PathVariable UUID id) {
        try {
            IncomingPaymentRequestResponseDTO request =
                    incomingPaymentRequestService.getIncomingPaymentRequestById(id);
            return ResponseEntity.ok(request);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage(), "success", false));
        } catch (Exception e) {
            System.err.println("Error fetching incoming payment request: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Error fetching incoming payment request", "success", false));
        }
    }

    /**
     * Confirm incoming payment receipt (finance user confirms money received)
     */
    @PostMapping("/{id}/confirm")
    public ResponseEntity<?> confirmIncomingPayment(
            @PathVariable UUID id,
            @RequestBody ConfirmIncomingPaymentRequestDTO confirmDTO,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            String username = userDetails.getUsername();
            IncomingPaymentRequestResponseDTO confirmedRequest =
                    incomingPaymentRequestService.confirmIncomingPayment(id, confirmDTO, username);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Incoming payment confirmed successfully",
                    "data", confirmedRequest
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage(), "success", false));
        } catch (Exception e) {
            System.err.println("Error confirming incoming payment: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Error confirming incoming payment", "success", false));
        }
    }
}