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
            return ResponseEntity.ok(imageUrl);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    // New endpoint for uploading maintenance files
    @PostMapping("/equipment/{equipmentId}/maintenance/{maintenanceId}/upload")
    public ResponseEntity<String> uploadMaintenanceFile(
            @PathVariable UUID equipmentId,
            @PathVariable UUID maintenanceId,
            @RequestParam("file") MultipartFile file) {
        try {
            String fileName = "maintenance_" + maintenanceId + "_" + file.getOriginalFilename();
            fileStorageService.uploadEntityFile("equipment", equipmentId, file, fileName);
            return ResponseEntity.ok("File uploaded successfully: " + fileName);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error uploading file: " + e.getMessage());
        }
    }

    // Get URL for maintenance file
    @GetMapping("/equipment/{equipmentId}/maintenance/{maintenanceId}/file/{fileName}")
    public ResponseEntity<String> getMaintenanceFileUrl(
            @PathVariable UUID equipmentId,
            @PathVariable UUID maintenanceId,
            @PathVariable String fileName) {
        try {
            String url = fileStorageService.getEntityFileUrl("equipment", equipmentId, fileName);
            return ResponseEntity.ok(url);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error generating URL: " + e.getMessage());
        }
    }

    @GetMapping("/download/{fileName}")
    public ResponseEntity<byte[]> downloadFile(@PathVariable String fileName) {
        try {
            InputStream inputStream = fileStorageService.downloadFile(fileName);
            return ResponseEntity.ok().contentType(MediaType.APPLICATION_OCTET_STREAM).body(inputStream.readAllBytes());
        } catch (Exception e) {
            return ResponseEntity.status(500).body(null);
        }
    }

    @GetMapping("/url/{fileName}")
    public ResponseEntity<String> getFileUrl(@PathVariable String fileName) {
        try {
            String url = fileStorageService.getFileUrl(fileName);
            return ResponseEntity.ok(url);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error generating URL: " + e.getMessage());
        }
    }
}