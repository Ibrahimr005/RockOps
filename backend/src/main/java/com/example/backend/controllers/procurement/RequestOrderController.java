package com.example.backend.controllers.procurement;



import com.example.backend.models.procurement.RequestOrder;
import com.example.backend.services.procurement.RequestOrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/requestOrders")
public class RequestOrderController {

    @Autowired
    private RequestOrderService requestOrderService;


    @PostMapping()
    public ResponseEntity<?> createRequest(@RequestBody Map<String, Object> requestData) {
        try {
            System.out.println("Received request data: " + requestData);
            RequestOrder requestOrder = requestOrderService.createRequest(requestData);
            return ResponseEntity.ok(requestOrder);
        } catch (RuntimeException e) {
            System.err.println("Error creating request order: " + e.getMessage());

            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", e.getMessage());
            errorResponse.put("error", "Request creation failed");

            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        } catch (Exception e) {
            System.err.println("Unexpected error: " + e.getMessage());
            e.printStackTrace();

            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", "An unexpected error occurred. Please try again later.");
            errorResponse.put("error", "Internal server error");

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @GetMapping
    public ResponseEntity<List<RequestOrder>> getAllRequestOrders() {
        try {
            List<RequestOrder> requestOrders = requestOrderService.getAllRequestOrders();
            return ResponseEntity.ok(requestOrders);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(null);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<RequestOrder> getRequestOrderById(@PathVariable UUID id) {
        RequestOrder requestOrder = requestOrderService.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Request Order not found with id: " + id));


        return ResponseEntity.ok(requestOrder);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateRequestOrder(@PathVariable("id") UUID id, @RequestBody Map<String, Object> requestData) {
        try {
            RequestOrder updatedOrder = requestOrderService.updateRequest(id, requestData);
            return ResponseEntity.ok(updatedOrder);
        } catch (Exception e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateRequestOrderStatus(
            @PathVariable("id") UUID id,
            @RequestBody Map<String, String> statusUpdate) {
        try {
            String newStatus = statusUpdate.get("status");
            RequestOrder updatedOrder = requestOrderService.updateStatus(id, newStatus);
            return ResponseEntity.ok(updatedOrder);
        } catch (Exception e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @GetMapping("/warehouse")
    public ResponseEntity<List<RequestOrder>> getRequestsByWarehouseAndStatus(
            @RequestParam UUID warehouseId,
            @RequestParam String status
    ) {
        try {
            List<RequestOrder> requests = requestOrderService.getRequestsByWarehouseAndStatus(warehouseId, status);
            return ResponseEntity.ok(requests);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(null);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(null);
        }
    }

    // In RequestOrderController.java
    @PostMapping("/validate-restock")
    public ResponseEntity<Map<String, Object>> validateRestockItems(
            @RequestParam UUID warehouseId,
            @RequestBody List<UUID> itemTypeIds) {
        try {
            Map<String, Object> validation = requestOrderService.getRestockValidationInfo(warehouseId, itemTypeIds);
            return ResponseEntity.ok(validation);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("message", e.getMessage());
            errorResponse.put("error", "Validation failed");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

}
