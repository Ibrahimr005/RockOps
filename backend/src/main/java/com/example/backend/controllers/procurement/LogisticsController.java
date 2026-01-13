package com.example.backend.controllers.procurement;

import com.example.backend.dto.procurement.LogisticsDTO;
import com.example.backend.services.procurement.LogisticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/procurement/logistics")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class LogisticsController {

    private final LogisticsService logisticsService;

    /**
     * Get all logistics entries for a purchase order
     */
    @GetMapping("/purchase-order/{purchaseOrderId}")
    public ResponseEntity<List<LogisticsDTO>> getLogisticsByPurchaseOrder(
            @PathVariable UUID purchaseOrderId) {
        List<LogisticsDTO> logistics = logisticsService.getLogisticsByPurchaseOrder(purchaseOrderId);
        return ResponseEntity.ok(logistics);
    }

    /**
     * Get total logistics cost for a purchase order
     */
    @GetMapping("/purchase-order/{purchaseOrderId}/total")
    public ResponseEntity<Double> getTotalLogisticsCost(
            @PathVariable UUID purchaseOrderId) {
        Double total = logisticsService.getTotalLogisticsCost(purchaseOrderId);
        return ResponseEntity.ok(total);
    }

    /**
     * Create new logistics entry
     */
    @PostMapping
    public ResponseEntity<LogisticsDTO> createLogistics(
            @RequestBody LogisticsDTO dto,
            Authentication authentication) {
        String username = authentication.getName();
        LogisticsDTO created = logisticsService.createLogistics(dto, username);
        return ResponseEntity.ok(created);
    }

    /**
     * Update existing logistics entry
     */
    @PutMapping("/{id}")
    public ResponseEntity<LogisticsDTO> updateLogistics(
            @PathVariable UUID id,
            @RequestBody LogisticsDTO dto,
            Authentication authentication) {
        String username = authentication.getName();
        LogisticsDTO updated = logisticsService.updateLogistics(id, dto, username);
        return ResponseEntity.ok(updated);
    }

    /**
     * Delete logistics entry
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLogistics(@PathVariable UUID id) {
        logisticsService.deleteLogistics(id);
        return ResponseEntity.noContent().build();
    }
}