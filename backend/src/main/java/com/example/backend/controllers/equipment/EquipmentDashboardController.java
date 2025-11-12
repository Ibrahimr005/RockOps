package com.example.backend.controllers.equipment;

import com.example.backend.dto.equipment.EquipmentDashboardDTO;
import com.example.backend.services.equipment.EquipmentDashboardService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Controller for equipment dashboard analytics
 */
@RestController
@RequestMapping("/api/equipment")
@CrossOrigin(origins = "*")
@Slf4j
public class EquipmentDashboardController {

    @Autowired
    private EquipmentDashboardService dashboardService;

    /**
     * Get comprehensive dashboard data for equipment
     * 
     * @param equipmentId The equipment UUID
     * @param period Time period: WEEK, MONTH, 3MONTH, 6MONTH, YEAR (default: MONTH)
     * @return Complete dashboard analytics
     */
    @GetMapping("/{equipmentId}/dashboard")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_SITE_ADMIN', 'ROLE_EQUIPMENT_MANAGER', 'ROLE_EQUIPMENT_VIEWER')")
    public ResponseEntity<EquipmentDashboardDTO> getEquipmentDashboard(
            @PathVariable UUID equipmentId,
            @RequestParam(defaultValue = "MONTH") String period) {
        
        log.info("Fetching dashboard for equipment: {} with period: {}", equipmentId, period);
        
        try {
            EquipmentDashboardDTO dashboard = dashboardService.getEquipmentDashboard(equipmentId, period);
            return ResponseEntity.ok(dashboard);
        } catch (IllegalArgumentException e) {
            log.error("Equipment not found: {}", equipmentId);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error fetching dashboard for equipment: {}", equipmentId, e);
            return ResponseEntity.internalServerError().build();
        }
    }
}

