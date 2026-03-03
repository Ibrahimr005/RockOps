package com.example.backend.controllers.procurement;

import com.example.backend.dto.procurement.Logistics.*;
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

    // ==================== PURCHASE ORDER LOGISTICS ====================

    @PostMapping
    public ResponseEntity<?> createLogistics(@RequestBody CreateLogisticsDTO dto) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = authentication.getName();
            UUID userId = UUID.randomUUID(); // Replace with actual user ID from auth

            LogisticsResponseDTO response = logisticsService.createLogistics(dto, userId, username);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
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

    // ==================== PURCHASE ORDER RETURN LOGISTICS ====================

    @PostMapping("/returns")
    public ResponseEntity<?> createLogisticsForReturn(@RequestBody CreateLogisticsForReturnDTO dto) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = authentication.getName();
            UUID userId = UUID.randomUUID(); // Replace with actual user ID from auth

            LogisticsResponseDTO response = logisticsService.createLogisticsForReturn(dto, userId, username);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/purchase-order-return/{purchaseOrderReturnId}")
    public ResponseEntity<?> getLogisticsByPurchaseOrderReturn(@PathVariable UUID purchaseOrderReturnId) {
        try {
            List<POReturnLogisticsDTO> response = logisticsService.getLogisticsByPurchaseOrderReturn(purchaseOrderReturnId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/purchase-order-return/{purchaseOrderReturnId}/total-cost")
    public ResponseEntity<?> getTotalLogisticsCostForPOReturn(@PathVariable UUID purchaseOrderReturnId) {
        try {
            BigDecimal totalCost = logisticsService.getTotalLogisticsCostForPOReturn(purchaseOrderReturnId);
            Map<String, Object> response = new HashMap<>();
            response.put("purchaseOrderReturnId", purchaseOrderReturnId);
            response.put("totalLogisticsCost", totalCost);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // ==================== GENERAL LOGISTICS ENDPOINTS ====================

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

    @GetMapping("/pending-payment")
    public ResponseEntity<List<LogisticsListDTO>> getPendingPaymentLogistics() {
        List<LogisticsListDTO> logistics = logisticsService.getPendingPaymentLogistics();
        return ResponseEntity.ok(logistics);
    }

    @GetMapping("/completed")
    public ResponseEntity<List<LogisticsListDTO>> getCompletedLogistics() {
        List<LogisticsListDTO> logistics = logisticsService.getCompletedLogistics();
        return ResponseEntity.ok(logistics);
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

    @GetMapping("/purchase-order/{purchaseOrderId}/returns")
    public ResponseEntity<?> getReturnLogisticsByPurchaseOrder(@PathVariable UUID purchaseOrderId) {
        try {
            List<POReturnLogisticsDTO> response = logisticsService.getReturnLogisticsByPurchaseOrder(purchaseOrderId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}