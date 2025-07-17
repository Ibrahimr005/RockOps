package com.example.backend.controllers.procurement;

import com.example.backend.models.merchant.Merchant;
import com.example.backend.services.procurement.ProcurementTeamService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/procurement")
public class ProcurmentTeamController {

    @Autowired
    private ProcurementTeamService procurementTeamService;

    @PostMapping
    public ResponseEntity<?> addMerchant(@RequestBody Map<String, Object> requestData) {
        try {
            Merchant merchant = procurementTeamService.addMerchant(requestData);
            return ResponseEntity.ok(merchant);
        } catch (Exception e) {
            e.printStackTrace(); // Log to console
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Server Error", "message", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateMerchant(@PathVariable UUID id, @RequestBody Map<String, Object> merchantData) {
        try {
            Merchant updatedMerchant = procurementTeamService.updateMerchant(id, merchantData);
            return ResponseEntity.ok(updatedMerchant);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("An unexpected error occurred.");
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteMerchant(@PathVariable UUID id) {
        try {
            procurementTeamService.deleteMerchant(id);
            return ResponseEntity.ok(Map.of("message", "Merchant deleted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Not Found", "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Server Error", "message", e.getMessage()));
        }
    }


}
