package com.example.backend.controllers.site;

import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.finance.fixedAssets.FixedAssets;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.site.Site;
import com.example.backend.models.site.SitePartner;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.services.MinioService;
import com.example.backend.services.site.SiteAdminService;
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
@RequestMapping("/siteadmin")
public class SiteAdminController
{
    private final SiteAdminService siteAdminService;
    private final MinioService minioService;

    @Autowired
    public SiteAdminController(SiteAdminService siteAdminService, MinioService minioService) {
        this.siteAdminService = siteAdminService;
        this.minioService = minioService;
    }

    @PostMapping(value = "/addsite", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Site> addSite(
            @RequestParam("siteData") String siteDataJson,
            @RequestParam(value = "photo", required = false) MultipartFile photo) {
        try {
            // Convert JSON String to a Map
            ObjectMapper objectMapper = new ObjectMapper();
            Map<String, Object> siteData = objectMapper.readValue(siteDataJson, new TypeReference<>() {});

            // Upload photo if provided
            if (photo != null && !photo.isEmpty()) {
                String fileName = minioService.uploadFile(photo);
                String fileUrl = minioService.getFileUrl(fileName);
                siteData.put("photoUrl", fileUrl); // Save URL in the data map
            }

            // Save site with updated data (including photo URL)
            Site savedSite = siteAdminService.addSite(siteData);

            return ResponseEntity.ok(savedSite);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }
    }

    @PostMapping(value = "/{siteId}/add-warehouse", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Warehouse> addWarehouse(
            @PathVariable UUID siteId,
            @RequestParam("warehouseData") String warehouseDataJson,
            @RequestParam(value = "photo", required = false) MultipartFile photo) {
        try {
            // Convert JSON String to a Map
            ObjectMapper objectMapper = new ObjectMapper();
            Map<String, Object> warehouseData = objectMapper.readValue(warehouseDataJson, new TypeReference<>() {});

            // Upload photo if provided
            if (photo != null && !photo.isEmpty()) {
                String fileName = minioService.uploadFile(photo);
                String fileUrl = minioService.getFileUrl(fileName);
                warehouseData.put("photoUrl", fileUrl); // Save URL in the data map
            }

            // Save warehouse with updated data (including photo URL)
            Warehouse savedWarehouse = siteAdminService.addWarehouse(siteId, warehouseData);

            return ResponseEntity.status(HttpStatus.CREATED).body(savedWarehouse);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }
    }
    @PutMapping(value = "/updatesite/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateSite(
            @PathVariable UUID id,
            @RequestParam("siteData") String siteDataJson,
            @RequestParam(value = "photo", required = false) MultipartFile photo) {
        try {
            // Log request
            System.out.println("Received update request for site ID: " + id);

            // Convert JSON String to a Map
            ObjectMapper objectMapper = new ObjectMapper();
            Map<String, Object> updates = objectMapper.readValue(siteDataJson, new TypeReference<>() {});

            // Handle photo update if a new photo is uploaded
            if (photo != null && !photo.isEmpty()) {
                String fileName = minioService.uploadFile(photo);
                String fileUrl = minioService.getFileUrl(fileName);
                updates.put("photoUrl", fileUrl); // Update photo URL in the map
            }

            // Call service method to update site
            Site updatedSite = siteAdminService.updateSite(id, updates);

            return ResponseEntity.ok(updatedSite);
        } catch (RuntimeException e) {
            System.err.println("Error updating site: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid request format.");
        }
    }

    @PostMapping("/{siteId}/assign-equipment/{equipmentId}")
    public ResponseEntity<Equipment> assignEquipmentToSite(@PathVariable UUID siteId, @PathVariable UUID equipmentId)
    {
        Equipment updatedEquipment = siteAdminService.assignEquipmentToSite(siteId, equipmentId);
        return ResponseEntity.ok(updatedEquipment);
    }

    @DeleteMapping("/{siteId}/remove-equipment/{equipmentId}")
    public ResponseEntity<Equipment> removeEquipmentFromSite(@PathVariable UUID siteId, @PathVariable UUID equipmentId)
    {
        Equipment updatedEquipment = siteAdminService.removeEquipmentFromSite(siteId, equipmentId);
        return ResponseEntity.ok(updatedEquipment);
    }


    @PostMapping("/{siteId}/assign-employee/{employeeId}")
    public ResponseEntity<Employee> assignEmployee(@PathVariable UUID siteId, @PathVariable UUID employeeId) {
        Employee updatedEmployee = siteAdminService.assignEmployeeToSite(siteId, employeeId);
        return ResponseEntity.ok(updatedEmployee);
    }

    @DeleteMapping("/{siteId}/remove-employee/{employeeId}")
    public ResponseEntity<Employee> removeEmployee(@PathVariable UUID siteId, @PathVariable UUID employeeId) {
        Employee updatedEmployee = siteAdminService.removeEmployeeFromSite(siteId, employeeId);
        return ResponseEntity.ok(updatedEmployee);
    }

    @PostMapping("/{siteId}/assign-warehouse/{warehouseId}")
    public ResponseEntity<Warehouse> assignWarehouseToSite(@PathVariable UUID siteId, @PathVariable UUID warehouseId)
    {
        Warehouse updatedWarehouse = siteAdminService.assignWarehouseToSite(siteId, warehouseId);
        return ResponseEntity.ok(updatedWarehouse);
    }

    @PostMapping("/{siteId}/assign-fixedAsset/{fixedAssetId}")
    public ResponseEntity<FixedAssets> assignFixedAssetToSite(@PathVariable UUID siteId, @PathVariable UUID fixedAssetId)
    {
        FixedAssets updatedFixedAssets = siteAdminService.assignFixedAssetToSite(siteId, fixedAssetId);
        return ResponseEntity.ok(updatedFixedAssets);
    }

    @PostMapping(value = "/{siteId}/assign-partner/{partnerId}", consumes = "application/json")
    public ResponseEntity<SitePartner> assignPartnerToSite(@PathVariable UUID siteId, @PathVariable Integer partnerId, @RequestBody Map<String, Double>  partnerPercentage)
    {
        Double percentage = partnerPercentage.get("percentage");
        SitePartner updatedPartners = siteAdminService.assignPartnerToSite(siteId, partnerId, percentage);
        return ResponseEntity.ok(updatedPartners);
    }

    @PutMapping(value = "/{siteId}/update-partner-percentage/{partnerId}", consumes = "application/json")
    public ResponseEntity<SitePartner> updatePartnerPercentage(@PathVariable UUID siteId, @PathVariable Integer partnerId, @RequestBody Map<String, Double>  partnerPercentage)
    {
        Double percentage = partnerPercentage.get("percentage");
        SitePartner updatedPartner = siteAdminService.updatePartnerPercentage(siteId, partnerId, percentage);
        return ResponseEntity.ok(updatedPartner);
    }
    @DeleteMapping("/{siteId}/remove-partner/{partnerId}")
    public ResponseEntity<Void> removePartner(@PathVariable UUID siteId, @PathVariable Integer partnerId) {
        siteAdminService.removePartnerFromSite(siteId, partnerId);
        return ResponseEntity.noContent().build(); // returns 204 No Content
    }





}
