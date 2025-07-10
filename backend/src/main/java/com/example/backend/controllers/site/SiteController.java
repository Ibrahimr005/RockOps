package com.example.backend.controllers.site;

import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.finance.fixedAssets.FixedAssets;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.site.Site;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.services.site.SiteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("api/v1/site")
public class SiteController
{
    private SiteService siteService;
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
        Site site = siteService.getSiteById(siteId);
        if (site == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.emptyList()); // ✅ Always return JSON
        }

        List<Employee> employeeList = siteService.getSiteEmployees(siteId);
        return ResponseEntity.ok(employeeList != null ? employeeList : Collections.emptyList()); // ✅ Ensure JSON format
    }

    @GetMapping("/{siteId}/warehouses")
    public ResponseEntity<?> getSiteWarehouses(@PathVariable UUID siteId) {
        Site site = siteService.getSiteById(siteId);
        if (site == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.emptyList()); // ✅ Always return JSON
        }

        List<Warehouse> warehouseList = siteService.getSiteWarehouses(siteId);
        return ResponseEntity.ok(warehouseList != null ? warehouseList : Collections.emptyList()); // ✅ Ensure JSON format

    }

    @GetMapping("/{siteId}/merchants")
    public ResponseEntity<?> getSiteMerchants(@PathVariable UUID siteId) {
        Site site = siteService.getSiteById(siteId);
        if (site == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.emptyList()); // ✅ Always return JSON
        }

        List<Merchant> merchantList = siteService.getSiteMerchants(siteId);
        return ResponseEntity.ok(merchantList != null ? merchantList : Collections.emptyList()); // ✅ Ensure JSON format
    }

    @GetMapping("/{siteId}/fixedassets")
    public ResponseEntity<?> getSiteFixedAssets(@PathVariable UUID siteId) {
        Site site = siteService.getSiteById(siteId);
        if (site == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.emptyList()); // ✅ Always return JSON
        }

        List<FixedAssets> fixedAssetsList = siteService.getSiteFixedAssets(siteId);
        return ResponseEntity.ok(fixedAssetsList != null ? fixedAssetsList : Collections.emptyList()); // ✅ Ensure JSON format
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

    @GetMapping("/unassigned-employees")
    public ResponseEntity<?> getUnassignedEmployees() {
            List<Employee> unassignedEmployees = siteService.getUnassignedEmployees();
        return ResponseEntity.ok(unassignedEmployees != null ? unassignedEmployees : Collections.emptyList());
    }

    @GetMapping("/unassigned-equipment")
    public ResponseEntity<?> getUnassignedEquipment() {
        List<Equipment> unassignedEquipment = siteService.getUnassignedEquipment();
        return ResponseEntity.ok(unassignedEquipment != null ? unassignedEquipment : Collections.emptyList());
    }

}
