package com.example.backend.controllers;

import com.example.backend.services.FileStorageService;
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

    private final FileStorageService fileStorageService;

    public MinioController(FileStorageService fileStorageService) {
        this.fileStorageService = fileStorageService;
    }

    @PostMapping("/upload")
    public ResponseEntity<String> uploadFile(@RequestParam("file") MultipartFile file) {
        System.out.println("Received file upload request");

        try {
            // Debugging: Check if file is null or empty
            if (file == null) {
                System.out.println("Error: File is null");
                return ResponseEntity.badRequest().body("File is required");
            }
            if (file.isEmpty()) {
                System.out.println("Error: Uploaded file is empty");
                return ResponseEntity.badRequest().body("Cannot upload an empty file");
            }

            // Print file details
            System.out.println("File received: Name = " + file.getOriginalFilename() +
                    ", Size = " + file.getSize() + " bytes, " +
                    "Content Type = " + file.getContentType());

            // Call service to upload file
            String fileName = fileStorageService.uploadFile(file);

            System.out.println("File uploaded successfully: " + fileName);
            return ResponseEntity.ok("File uploaded successfully: " + fileName);
        } catch (Exception e) {
            System.out.println("Error uploading file: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error uploading file: " + e.getMessage());
        }
    }

    @PostMapping("/equipment/{equipmentId}/upload")
    public ResponseEntity<String> uploadEquipmentFile(
            @PathVariable UUID equipmentId,
            @RequestParam("file") MultipartFile file) {
        try {
            String fileName = fileStorageService.uploadEquipmentFile(equipmentId, file, "");
            return ResponseEntity.ok("File uploaded successfully to equipment bucket: " + fileName);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error uploading file: " + e.getMessage());
        }
    }

    @GetMapping("/equipment/{equipmentId}/main-photo")
    public ResponseEntity<String> getEquipmentMainPhoto(@PathVariable UUID equipmentId) {
        try {
            String imageUrl = fileStorageService.getEquipmentMainPhoto(equipmentId);
            if (imageUrl != null) {
                return ResponseEntity.ok(imageUrl);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            System.err.println("Error getting equipment main photo: " + e.getMessage());
            return ResponseEntity.status(500).body("Error retrieving equipment image: " + e.getMessage());
        }
    }

    @GetMapping("/equipment/{equipmentId}/main-photo/refresh")
    public ResponseEntity<String> refreshEquipmentMainPhoto(@PathVariable UUID equipmentId) {
        try {
            // Force refresh of presigned URL
            String imageUrl = fileStorageService.getEquipmentMainPhoto(equipmentId);
            if (imageUrl != null) {
                return ResponseEntity.ok(imageUrl);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            System.err.println("Error refreshing equipment main photo: " + e.getMessage());
            return ResponseEntity.status(500).body("Error refreshing equipment image: " + e.getMessage());
        }
    }
}