package com.example.backend.controllers.procurement;

import com.example.backend.dto.procurement.PurchaseOrderReturn.CreatePurchaseOrderReturnDTO;
import com.example.backend.dto.procurement.PurchaseOrderReturn.PurchaseOrderReturnResponseDTO;
import com.example.backend.models.procurement.PurchaseOrderReturn.PurchaseOrderReturnStatus;
import com.example.backend.services.procurement.PurchaseOrderReturnService;
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
@RequestMapping("/api/v1/purchase-order-returns")
@RequiredArgsConstructor
public class PurchaseOrderReturnController {

    private final PurchaseOrderReturnService purchaseOrderReturnService;

    /**
     * Create PO return request (automatically groups by merchant)
     */
    @PostMapping("/purchase-orders/{purchaseOrderId}")
    public ResponseEntity<?> createPurchaseOrderReturn(
            @PathVariable UUID purchaseOrderId,
            @RequestBody CreatePurchaseOrderReturnDTO createDTO,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            String username = userDetails.getUsername();
            List<PurchaseOrderReturnResponseDTO> createdReturns =
                    purchaseOrderReturnService.createPurchaseOrderReturns(purchaseOrderId, createDTO, username);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "PO return request(s) created successfully",
                    "data", createdReturns,
                    "count", createdReturns.size()
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage(), "success", false));
        } catch (Exception e) {
            System.err.println("Error creating PO return: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Error creating PO return request", "success", false));
        }
    }

    /**
     * Get all PO returns
     */
    @GetMapping
    public ResponseEntity<List<PurchaseOrderReturnResponseDTO>> getAllPurchaseOrderReturns() {
        try {
            List<PurchaseOrderReturnResponseDTO> returns =
                    purchaseOrderReturnService.getAllPurchaseOrderReturns();
            return ResponseEntity.ok(returns);
        } catch (Exception e) {
            System.err.println("Error fetching PO returns: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get PO returns by status
     */
    @GetMapping("/status/{status}")
    public ResponseEntity<List<PurchaseOrderReturnResponseDTO>> getPurchaseOrderReturnsByStatus(
            @PathVariable PurchaseOrderReturnStatus status) {
        try {
            List<PurchaseOrderReturnResponseDTO> returns =
                    purchaseOrderReturnService.getPurchaseOrderReturnsByStatus(status);
            return ResponseEntity.ok(returns);
        } catch (Exception e) {
            System.err.println("Error fetching PO returns by status: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get single PO return by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getPurchaseOrderReturnById(@PathVariable UUID id) {
        try {
            PurchaseOrderReturnResponseDTO poReturn =
                    purchaseOrderReturnService.getPurchaseOrderReturnById(id);
            return ResponseEntity.ok(poReturn);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage(), "success", false));
        } catch (Exception e) {
            System.err.println("Error fetching PO return: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Error fetching PO return", "success", false));
        }
    }
}