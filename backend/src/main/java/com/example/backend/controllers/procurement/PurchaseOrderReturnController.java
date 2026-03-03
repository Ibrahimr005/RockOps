package com.example.backend.controllers.procurement;

import com.example.backend.dto.procurement.PurchaseOrderReturn.CreatePurchaseOrderReturnDTO;
import com.example.backend.dto.procurement.PurchaseOrderReturn.PurchaseOrderReturnResponseDTO;
import com.example.backend.models.procurement.PurchaseOrderReturn.PurchaseOrderReturnStatus;
import com.example.backend.services.procurement.PurchaseOrderReturnService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/purchase-order-returns")
@RequiredArgsConstructor
@Slf4j
public class PurchaseOrderReturnController {

    private final PurchaseOrderReturnService purchaseOrderReturnService;

    @PostMapping("/purchase-orders/{purchaseOrderId}")
    public ResponseEntity<Map<String, Object>> createPurchaseOrderReturn(
            @PathVariable UUID purchaseOrderId,
            @RequestBody CreatePurchaseOrderReturnDTO createDTO,
            Authentication authentication) {

        String username = authentication.getName();

        purchaseOrderReturnService.createPurchaseOrderReturn(purchaseOrderId, createDTO, username);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Purchase order return created successfully");

        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<PurchaseOrderReturnResponseDTO>> getAllPurchaseOrderReturns() {
        List<PurchaseOrderReturnResponseDTO> returns = purchaseOrderReturnService.getAllPurchaseOrderReturns();
        return ResponseEntity.ok(returns);
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<PurchaseOrderReturnResponseDTO>> getPurchaseOrderReturnsByStatus(
            @PathVariable String status) {
        PurchaseOrderReturnStatus returnStatus = PurchaseOrderReturnStatus.valueOf(status.toUpperCase());
        List<PurchaseOrderReturnResponseDTO> returns =
                purchaseOrderReturnService.getPurchaseOrderReturnsByStatus(returnStatus);
        return ResponseEntity.ok(returns);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PurchaseOrderReturnResponseDTO> getPurchaseOrderReturnById(@PathVariable UUID id) {
        PurchaseOrderReturnResponseDTO returnDTO = purchaseOrderReturnService.getPurchaseOrderReturnById(id);
        return ResponseEntity.ok(returnDTO);
    }
}