package com.example.backend.controllers.equipment;

import com.example.backend.dto.equipment.ConsumableResolutionDTO;
import com.example.backend.models.equipment.Consumable;
import com.example.backend.models.equipment.ConsumableResolution;
import com.example.backend.services.equipment.ConsumablesService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/v1/consumables")
public class ConsumableController {

    @Autowired
    private ConsumablesService consumablesService;

    /**
     * Resolve a consumable discrepancy
     */
    @PostMapping("/resolve-discrepancy")
    public ResponseEntity<ConsumableResolution> resolveDiscrepancy(@RequestBody ConsumableResolutionDTO request) {
        try {
            ConsumableResolution resolution = consumablesService.resolveDiscrepancy(request);
            return ResponseEntity.ok(resolution);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * Get resolution history for an equipment
     */
    @GetMapping("/resolution-history/equipment/{equipmentId}")
    public ResponseEntity<List<ConsumableResolution>> getResolutionHistory(@PathVariable UUID equipmentId) {
        try {
            List<ConsumableResolution> history = consumablesService.getEquipmentResolutionHistory(equipmentId);
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * Get unresolved discrepancy consumables for an equipment
     */
    @GetMapping("/equipment/{equipmentId}/discrepancies")
    public ResponseEntity<List<Consumable>> getDiscrepancyConsumables(@PathVariable UUID equipmentId) {
        try {
            List<Consumable> discrepancies = consumablesService.getDiscrepancyConsumables(equipmentId);
            return ResponseEntity.ok(discrepancies);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * Get resolved consumables for an equipment
     */
    @GetMapping("/equipment/{equipmentId}/resolved")
    public ResponseEntity<List<Consumable>> getResolvedConsumables(@PathVariable UUID equipmentId) {
        try {
            List<Consumable> resolved = consumablesService.getResolvedConsumables(equipmentId);
            return ResponseEntity.ok(resolved);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }
} 