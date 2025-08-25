package com.example.backend.controllers.procurement;

import com.example.backend.models.merchant.Merchant;
import com.example.backend.services.MinioService;
import com.example.backend.services.procurement.ProcurementTeamService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/procurement")
public class ProcurmentTeamController {

    @Autowired
    private ProcurementTeamService procurementTeamService;

    @Autowired
    private MinioService minioService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> addMerchant(
            @RequestParam("merchantData") String merchantDataJson,
            @RequestParam(value = "photo", required = false) MultipartFile photo) {
        try {
            // Convert JSON String to a Map
            ObjectMapper objectMapper = new ObjectMapper();
            Map<String, Object> merchantData = objectMapper.readValue(merchantDataJson, new TypeReference<>() {});

            // Upload photo if provided
            if (photo != null && !photo.isEmpty()) {
                String fileName = minioService.uploadFile(photo);
                String fileUrl = minioService.getFileUrl(fileName);
                merchantData.put("photoUrl", fileUrl); // Save URL in the data map
            }

            // Save merchant with updated data (including photo URL)
            Merchant merchant = procurementTeamService.addMerchant(merchantData);
            return ResponseEntity.ok(merchant);
        } catch (Exception e) {
            e.printStackTrace(); // Log to console
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Server Error", "message", e.getMessage()));
        }
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateMerchant(
            @PathVariable UUID id,
            @RequestParam("merchantData") String merchantDataJson,
            @RequestParam(value = "photo", required = false) MultipartFile photo) {
        try {
            // Log request
            System.out.println("Received update request for merchant ID: " + id);

            // Convert JSON String to a Map
            ObjectMapper objectMapper = new ObjectMapper();
            Map<String, Object> merchantData = objectMapper.readValue(merchantDataJson, new TypeReference<>() {});

            // Handle photo update if a new photo is uploaded
            if (photo != null && !photo.isEmpty()) {
                String fileName = minioService.uploadFile(photo);
                String fileUrl = minioService.getFileUrl(fileName);
                merchantData.put("photoUrl", fileUrl); // Update photo URL in the map
            }

            // Call service method to update merchant
            Merchant updatedMerchant = procurementTeamService.updateMerchant(id, merchantData);
            return ResponseEntity.ok(updatedMerchant);
        } catch (RuntimeException e) {
            System.err.println("Error updating merchant: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid request format.");
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