package com.example.backend.controllers;

import com.example.backend.services.FileStorageService;
import com.example.backend.services.MinioService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.UUID;

@RestController
@RequestMapping("/minio")
@CrossOrigin(origins = "http://localhost:3000")
public class MinioController {

    private static final Logger log = LoggerFactory.getLogger(MinioController.class);

    private final MinioService minioService;

    public MinioController(MinioService minioService) {
        this.minioService = minioService;
    }

    @PostMapping("/upload")
    public ResponseEntity<String> uploadFile(@RequestParam("file") MultipartFile file) {
        try {
            if (file == null) {
                return ResponseEntity.badRequest().body("File is required");
            }
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body("Cannot upload an empty file");
            }

            log.debug("File received: Name={}, Size={} bytes, ContentType={}",
                    file.getOriginalFilename(), file.getSize(), file.getContentType());

            String fileName = minioService.uploadFile(file);

            log.info("File uploaded successfully: {}", fileName);
            return ResponseEntity.ok("File uploaded successfully: " + fileName);
        } catch (Exception e) {
            log.error("Error uploading file: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body("Error uploading file: " + e.getMessage());
        }
    }

    @PostMapping("/equipment/{equipmentId}/upload")
    public ResponseEntity<String> uploadEquipmentFile(
            @PathVariable UUID equipmentId,
            @RequestParam("file") MultipartFile file) {
        try {
            String fileName = minioService.uploadEquipmentFile(equipmentId, file, "");
            return ResponseEntity.ok("File uploaded successfully to equipment bucket: " + fileName);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error uploading file: " + e.getMessage());
        }
    }

    @GetMapping("/equipment/{equipmentId}/main-photo")
    public ResponseEntity<String> getEquipmentMainPhoto(@PathVariable UUID equipmentId) {
        try {
            String imageUrl = minioService.getEquipmentMainPhoto(equipmentId);
            if (imageUrl != null) {
                return ResponseEntity.ok(imageUrl);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            log.error("Error getting equipment main photo: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body("Error retrieving equipment image: " + e.getMessage());
        }
    }

    @GetMapping("/equipment/{equipmentId}/main-photo/refresh")
    public ResponseEntity<String> refreshEquipmentMainPhoto(@PathVariable UUID equipmentId) {
        try {
            String imageUrl = minioService.getEquipmentMainPhoto(equipmentId);
            if (imageUrl != null) {
                return ResponseEntity.ok(imageUrl);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            log.error("Error refreshing equipment main photo: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body("Error refreshing equipment image: " + e.getMessage());
        }
    }
}
