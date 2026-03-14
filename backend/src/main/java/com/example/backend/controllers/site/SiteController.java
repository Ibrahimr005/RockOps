package com.example.backend.controllers.site;

import com.example.backend.dto.equipment.EquipmentDTO;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.finance.fixedAssets.FixedAssets;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.site.Site;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.services.site.SiteService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("api/v1/site")
public class SiteController
{
    private static final Logger log = LoggerFactory.getLogger(SiteController.class);
    private final SiteService siteService;
    @Autowired
    public SiteController(SiteService siteService) {
        this.siteService = siteService;
    }

    @GetMapping("/{siteId}")
    public Site getSiteById(@PathVariable UUID siteId) {
        return siteService.getSiteById(siteId);
    }

    @GetMapping()
    public List<Site> getAllSite()
    {
        return siteService.getAllSites();
    }

    @GetMapping("/{siteId}/equipment")
    public ResponseEntity<?> getSiteEquipments(@PathVariable UUID siteId) {
        Site site = siteService.getSiteById(siteId);
        if (site == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.emptyList()); // ✅ Always return JSON
        }

        List<Equipment> equipmentList = site.getEquipment();
        return ResponseEntity.ok(equipmentList != null ? equipmentList : Collections.emptyList()); // ✅ Ensure JSON format
    }

    @GetMapping("/{siteId}/employees")
    public ResponseEntity<?> getSiteEmployees(@PathVariable UUID siteId) {
        List<Employee> employeeList = siteService.getSiteEmployees(siteId);
        return ResponseEntity.ok(employeeList);
    }

    @GetMapping("/{siteId}/warehouses")
    public ResponseEntity<?> getSiteWarehouses(@PathVariable UUID siteId) {
        List<Warehouse> warehouses = siteService.getSiteWarehouses(siteId);

        List<Map<String, Object>> simplifiedWarehouses = warehouses.stream()
                .map(warehouse -> {
                    Map<String, Object> warehouseData = new HashMap<>();
                    warehouseData.put("id", warehouse.getId());
                    warehouseData.put("name", warehouse.getName());
                    warehouseData.put("photoUrl", warehouse.getPhotoUrl());
                    return warehouseData;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(simplifiedWarehouses);
    }

    @GetMapping("/{siteId}/merchants")
    public ResponseEntity<?> getSiteMerchants(@PathVariable UUID siteId) {
        List<Merchant> merchantList = siteService.getSiteMerchants(siteId);
        return ResponseEntity.ok(merchantList);
    }

    @GetMapping("/{siteId}/fixedassets")
    public ResponseEntity<?> getSiteFixedAssets(@PathVariable UUID siteId) {
        List<FixedAssets> fixedAssetsList = siteService.getSiteFixedAssets(siteId);
        return ResponseEntity.ok(fixedAssetsList);
    }

    @GetMapping("/unassigned-fixedassets")
    public ResponseEntity<?> getUnassignedFixedAssets() {
        List<FixedAssets> unassignedFixedAssets = siteService.getUnassignedFixedAssets();
        return ResponseEntity.ok(unassignedFixedAssets != null ? unassignedFixedAssets : Collections.emptyList());
    }

    @GetMapping("/{siteId}/partners")
    public ResponseEntity<?> getSitePartners(@PathVariable UUID siteId) {
        Site site = siteService.getSiteById(siteId);
        if (site == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.emptyList());
        }

        List<Map<String, Object>> partnersList = siteService.getSitePartners(siteId);
        return ResponseEntity.ok(partnersList != null ? partnersList : Collections.emptyList());
    }

    @GetMapping("/{siteId}/unassigned-partners")
    public ResponseEntity<?> getUnassignedPartners(@PathVariable UUID siteId) {
        Site site = siteService.getSiteById(siteId);
        if (site == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.emptyList());
        }

        List<Map<String, Object>> partnersList = siteService.getUnassignedSitePartners(siteId);
        return ResponseEntity.ok(partnersList != null ? partnersList : Collections.emptyList());
    }

// In SiteController.java, fix the getUnassignedEmployees method:

    @GetMapping("/unassigned-employees")
    public ResponseEntity<List<Employee>> getUnassignedEmployees() {
        try {
            List<Employee> unassignedEmployees = siteService.getUnassignedEmployees();
            log.debug("Found {} unassigned employees", unassignedEmployees != null ? unassignedEmployees.size() : 0);

            List<Employee> result = unassignedEmployees != null ? unassignedEmployees : Collections.emptyList();

            // IMPORTANT: Ensure proper JSON response
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(result);

        } catch (Exception e) {
            log.error("Error fetching unassigned employees", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Collections.emptyList());
        }
    }

    @GetMapping("/unassigned-equipment")
    public ResponseEntity<?> getUnassignedEquipment() {
        List<Equipment> unassignedEquipment = siteService.getUnassignedEquipment();
        return ResponseEntity.ok(unassignedEquipment != null ? unassignedEquipment : Collections.emptyList());
    }

    @GetMapping("/{id}/equipments-dto")
    public ResponseEntity<List<EquipmentDTO>> getSiteEquipmentsDTO(@PathVariable UUID id) {
        List<EquipmentDTO> equipments = siteService.getSiteEquipmentsDTO(id);
        return ResponseEntity.ok(equipments);
    }

}
