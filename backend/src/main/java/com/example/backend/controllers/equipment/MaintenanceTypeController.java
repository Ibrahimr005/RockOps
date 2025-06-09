package com.example.backend.controllers.equipment;

import com.example.backend.dto.equipment.MaintenanceTypeDTO;
import com.example.backend.models.equipment.MaintenanceType;
import com.example.backend.services.equipment.MaintenanceTypeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/v1/maintenancetypes")
public class MaintenanceTypeController {

    @Autowired
    private MaintenanceTypeService maintenanceTypeService;

    // Get all active maintenance types (returns DTOs for consistency)
    @GetMapping
    public ResponseEntity<List<MaintenanceTypeDTO>> getAllMaintenanceTypes() {
        return ResponseEntity.ok(maintenanceTypeService.getAllMaintenanceTypes());
    }

    // Get all maintenance types (both active and inactive) for management interface
    @GetMapping("/management")
    public ResponseEntity<List<MaintenanceTypeDTO>> getAllMaintenanceTypesForManagement() {
        return ResponseEntity.ok(maintenanceTypeService.getAllMaintenanceTypesForManagement());
    }

    // Get maintenance type by id
    @GetMapping("/{id}")
    public ResponseEntity<MaintenanceTypeDTO> getMaintenanceTypeById(@PathVariable UUID id) {
        return ResponseEntity.ok(maintenanceTypeService.getMaintenanceTypeById(id));
    }

    // Create new maintenance type
    @PostMapping()
    public ResponseEntity<MaintenanceTypeDTO> createMaintenanceType(@RequestBody MaintenanceTypeDTO maintenanceTypeDTO) {
        return new ResponseEntity<>(maintenanceTypeService.createMaintenanceType(maintenanceTypeDTO), HttpStatus.CREATED);
    }

    // Update maintenance type
    @PutMapping("/{id}")
    public ResponseEntity<MaintenanceTypeDTO> updateMaintenanceType(@PathVariable UUID id, @RequestBody MaintenanceTypeDTO maintenanceTypeDTO) {
        return ResponseEntity.ok(maintenanceTypeService.updateMaintenanceType(id, maintenanceTypeDTO));
    }

    // Delete maintenance type (soft delete)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMaintenanceType(@PathVariable UUID id) {
        maintenanceTypeService.deleteMaintenanceType(id);
        return ResponseEntity.noContent().build();
    }

    // Legacy endpoints for backward compatibility
    @GetMapping("/active")
    public ResponseEntity<List<MaintenanceType>> getAllActiveMaintenanceTypes() {
        return ResponseEntity.ok(maintenanceTypeService.getAllActiveMaintenanceTypes());
    }

    // Add new maintenance type (legacy)
    @PostMapping("/legacy")
    public ResponseEntity<MaintenanceType> addMaintenanceType(@RequestBody Map<String, String> requestBody) {
        String name = requestBody.get("name");
        String description = requestBody.get("description");

        MaintenanceType maintenanceType = maintenanceTypeService.addMaintenanceType(name, description);
        return ResponseEntity.status(HttpStatus.CREATED).body(maintenanceType);
    }

    // Update maintenance type (legacy)
    @PutMapping("/legacy/{id}")
    public ResponseEntity<MaintenanceType> updateMaintenanceTypeLegacy(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> requestBody) {

        String name = (String) requestBody.get("name");
        String description = (String) requestBody.get("description");
        Boolean active = requestBody.get("active") != null ? (Boolean) requestBody.get("active") : null;

        MaintenanceType maintenanceType = maintenanceTypeService.updateMaintenanceType(id, name, description, active);
        return ResponseEntity.ok(maintenanceType);
    }

    // Search maintenance types by name
    @GetMapping("/search")
    public ResponseEntity<List<MaintenanceType>> searchMaintenanceTypes(@RequestParam String name) {
        return ResponseEntity.ok(maintenanceTypeService.searchMaintenanceTypes(name));
    }
}