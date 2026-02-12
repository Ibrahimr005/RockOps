package com.example.backend.controllers.warehouse;

import com.example.backend.models.warehouse.MeasuringUnit;
import com.example.backend.services.warehouse.MeasuringUnitService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/v1/measuring-units")
public class MeasuringUnitController {

    @Autowired
    private MeasuringUnitService measuringUnitService;

    @PostMapping
    public ResponseEntity<?> createMeasuringUnit(@RequestBody Map<String, Object> requestBody) {
        try {
            MeasuringUnit created = measuringUnitService.createMeasuringUnit(requestBody);
            return ResponseEntity.ok(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to create measuring unit");
        }
    }

    @GetMapping
    public ResponseEntity<List<MeasuringUnit>> getAllMeasuringUnits() {
        List<MeasuringUnit> units = measuringUnitService.getAllMeasuringUnits();
        return ResponseEntity.ok(units);
    }

    @GetMapping("/active")
    public ResponseEntity<List<MeasuringUnit>> getActiveMeasuringUnits() {
        List<MeasuringUnit> units = measuringUnitService.getActiveMeasuringUnits();
        return ResponseEntity.ok(units);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getMeasuringUnitById(@PathVariable UUID id) {
        try {
            MeasuringUnit unit = measuringUnitService.getMeasuringUnitById(id);
            return ResponseEntity.ok(unit);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Measuring unit not found");
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateMeasuringUnit(@PathVariable UUID id, @RequestBody Map<String, Object> requestBody) {
        try {
            MeasuringUnit updated = measuringUnitService.updateMeasuringUnit(id, requestBody);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Measuring unit not found");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to update measuring unit");
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteMeasuringUnit(@PathVariable UUID id) {
        try {
            measuringUnitService.deleteMeasuringUnit(id);
            return ResponseEntity.ok("Measuring unit deactivated successfully");
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Measuring unit not found");
        }
    }
}