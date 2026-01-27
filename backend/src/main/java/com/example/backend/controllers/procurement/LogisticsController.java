package com.example.backend.controllers.procurement;

import com.example.backend.dto.procurement.*;
import com.example.backend.dto.procurement.Logistics.CreateLogisticsDTO;
import com.example.backend.dto.procurement.Logistics.LogisticsListDTO;
import com.example.backend.dto.procurement.Logistics.LogisticsResponseDTO;
import com.example.backend.dto.procurement.Logistics.POLogisticsDTO;
import com.example.backend.services.procurement.LogisticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/procurement/logistics")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class LogisticsController {

    private final LogisticsService logisticsService;

    @PostMapping
    public ResponseEntity<?> createLogistics(@RequestBody CreateLogisticsDTO dto) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = authentication.getName();
            // You might want to get userId from your authentication system
            UUID userId = UUID.randomUUID(); // Replace with actual user ID from auth

            LogisticsResponseDTO response = logisticsService.createLogistics(dto, userId, username);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getLogisticsById(@PathVariable UUID id) {
        try {
            LogisticsResponseDTO response = logisticsService.getLogisticsById(id);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> getAllLogistics() {
        try {
            List<LogisticsListDTO> response = logisticsService.getAllLogistics();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/pending-approval")
    public ResponseEntity<?> getPendingApprovalLogistics() {
        try {
            List<LogisticsListDTO> response = logisticsService.getPendingApprovalLogistics();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/history")
    public ResponseEntity<?> getHistoryLogistics() {
        try {
            List<LogisticsListDTO> response = logisticsService.getHistoryLogistics();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/purchase-order/{purchaseOrderId}")
    public ResponseEntity<?> getLogisticsByPurchaseOrder(@PathVariable UUID purchaseOrderId) {
        try {
            List<POLogisticsDTO> response = logisticsService.getLogisticsByPurchaseOrder(purchaseOrderId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/purchase-order/{purchaseOrderId}/total-cost")
    public ResponseEntity<?> getTotalLogisticsCostForPO(@PathVariable UUID purchaseOrderId) {
        try {
            BigDecimal totalCost = logisticsService.getTotalLogisticsCostForPO(purchaseOrderId);
            Map<String, Object> response = new HashMap<>();
            response.put("purchaseOrderId", purchaseOrderId);
            response.put("totalLogisticsCost", totalCost);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // Webhook/callback endpoints for payment request status changes
    @PostMapping("/payment-approved/{paymentRequestId}")
    public ResponseEntity<?> handlePaymentApproval(@PathVariable UUID paymentRequestId) {
        try {
            logisticsService.handlePaymentRequestApproval(paymentRequestId);
            return ResponseEntity.ok(Map.of("message", "Logistics status updated to APPROVED"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/payment-rejected/{paymentRequestId}")
    public ResponseEntity<?> handlePaymentRejection(
            @PathVariable UUID paymentRequestId,
            @RequestBody Map<String, String> request) {
        try {
            String rejectionReason = request.get("rejectionReason");
            String rejectedBy = request.get("rejectedBy");
            logisticsService.handlePaymentRequestRejection(paymentRequestId, rejectionReason, rejectedBy);
            return ResponseEntity.ok(Map.of("message", "Logistics status updated to REJECTED"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/payment-completed/{paymentRequestId}")
    public ResponseEntity<?> handlePaymentCompletion(@PathVariable UUID paymentRequestId) {
        try {
            logisticsService.handlePaymentCompletion(paymentRequestId);
            return ResponseEntity.ok(Map.of("message", "Logistics status updated to PAID"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateLogistics(
            @PathVariable UUID id,
            @RequestBody CreateLogisticsDTO dto) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = authentication.getName();

            LogisticsResponseDTO response = logisticsService.updateLogistics(id, dto, username);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteLogistics(@PathVariable UUID id) {
        try {
            logisticsService.deleteLogistics(id);
            return ResponseEntity.ok(Map.of("message", "Logistics deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}