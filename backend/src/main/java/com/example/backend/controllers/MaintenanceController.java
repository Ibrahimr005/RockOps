package com.example.backend.controllers;

import com.example.backend.dtos.*;
import com.example.backend.exceptions.MaintenanceException;
import com.example.backend.services.MaintenanceService;
import com.example.backend.services.ContactService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import java.util.Map;

@RestController
@RequestMapping("/api/maintenance")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class MaintenanceController {
    
    private final MaintenanceService maintenanceService;
    private final ContactService contactService;
    
    // Dashboard
    @GetMapping("/dashboard")
    public ResponseEntity<MaintenanceDashboardDto> getDashboard() {
        try {
            MaintenanceDashboardDto dashboard = maintenanceService.getDashboardData();
            return ResponseEntity.ok(dashboard);
        } catch (Exception e) {
            log.error("Error retrieving dashboard data: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // Maintenance Records
    
    @PostMapping("/records")
    public ResponseEntity<MaintenanceRecordDto> createMaintenanceRecord(@Valid @RequestBody MaintenanceRecordDto dto) {
        try {
            MaintenanceRecordDto created = maintenanceService.createMaintenanceRecord(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (Exception e) {
            log.error("Error creating maintenance record: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/records/{id}")
    public ResponseEntity<MaintenanceRecordDto> getMaintenanceRecord(@PathVariable UUID id) {
        try {
            MaintenanceRecordDto record = maintenanceService.getMaintenanceRecord(id);
            return ResponseEntity.ok(record);
        } catch (Exception e) {
            log.error("Error retrieving maintenance record: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }
    
    @GetMapping("/records")
    public ResponseEntity<List<MaintenanceRecordDto>> getAllMaintenanceRecords() {
        try {
            List<MaintenanceRecordDto> records = maintenanceService.getAllMaintenanceRecords();
            return ResponseEntity.ok(records);
        } catch (Exception e) {
            log.error("Error retrieving maintenance records: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @GetMapping("/records/equipment/{equipmentId}")
    public ResponseEntity<List<MaintenanceRecordDto>> getMaintenanceRecordsByEquipment(@PathVariable UUID equipmentId) {
        try {
            List<MaintenanceRecordDto> records = maintenanceService.getMaintenanceRecordsByEquipment(equipmentId);
            return ResponseEntity.ok(records);
        } catch (Exception e) {
            log.error("Error retrieving maintenance records for equipment: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @GetMapping("/records/active")
    public ResponseEntity<List<MaintenanceRecordDto>> getActiveMaintenanceRecords() {
        try {
            List<MaintenanceRecordDto> records = maintenanceService.getActiveMaintenanceRecords();
            return ResponseEntity.ok(records);
        } catch (Exception e) {
            log.error("Error retrieving active maintenance records: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @GetMapping("/records/overdue")
    public ResponseEntity<List<MaintenanceRecordDto>> getOverdueMaintenanceRecords() {
        try {
            List<MaintenanceRecordDto> records = maintenanceService.getOverdueMaintenanceRecords();
            return ResponseEntity.ok(records);
        } catch (Exception e) {
            log.error("Error retrieving overdue maintenance records: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @PutMapping("/records/{id}")
    public ResponseEntity<MaintenanceRecordDto> updateMaintenanceRecord(
            @PathVariable UUID id,
            @Valid @RequestBody MaintenanceRecordDto dto) {
        try {
            MaintenanceRecordDto updated = maintenanceService.updateMaintenanceRecord(id, dto);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            log.error("Error updating maintenance record: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    @DeleteMapping("/records/{id}")
    public ResponseEntity<Object> deleteMaintenanceRecord(@PathVariable UUID id) {
        try {
            maintenanceService.deleteMaintenanceRecord(id);
            return ResponseEntity.noContent().build();
        } catch (MaintenanceException e) {
            log.error("Maintenance exception while deleting record: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Unexpected error deleting maintenance record: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "An unexpected error occurred while deleting the maintenance record"));
        }
    }
    
    // Maintenance Steps
    
    @PostMapping("/records/{recordId}/steps")
    public ResponseEntity<MaintenanceStepDto> createMaintenanceStep(
            @PathVariable UUID recordId,
            @Valid @RequestBody MaintenanceStepDto dto) {
        try {
            MaintenanceStepDto created = maintenanceService.createMaintenanceStep(recordId, dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (Exception e) {
            log.error("Error creating maintenance step: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/steps/{id}")
    public ResponseEntity<MaintenanceStepDto> getMaintenanceStep(@PathVariable UUID id) {
        try {
            MaintenanceStepDto step = maintenanceService.getMaintenanceStep(id);
            return ResponseEntity.ok(step);
        } catch (Exception e) {
            log.error("Error retrieving maintenance step: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }
    
    @GetMapping("/records/{recordId}/steps")
    public ResponseEntity<List<MaintenanceStepDto>> getMaintenanceSteps(@PathVariable UUID recordId) {
        try {
            List<MaintenanceStepDto> steps = maintenanceService.getMaintenanceSteps(recordId);
            return ResponseEntity.ok(steps);
        } catch (Exception e) {
            log.error("Error retrieving maintenance steps: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @PutMapping("/steps/{id}")
    public ResponseEntity<MaintenanceStepDto> updateMaintenanceStep(
            @PathVariable UUID id,
            @Valid @RequestBody MaintenanceStepDto dto) {
        try {
            MaintenanceStepDto updated = maintenanceService.updateMaintenanceStep(id, dto);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            log.error("Error updating maintenance step: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    @DeleteMapping("/steps/{id}")
    public ResponseEntity<Void> deleteMaintenanceStep(@PathVariable UUID id) {
        try {
            maintenanceService.deleteMaintenanceStep(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Error deleting maintenance step: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    @PostMapping("/steps/{id}/complete")
    public ResponseEntity<Void> completeMaintenanceStep(@PathVariable UUID id) {
        try {
            maintenanceService.completeMaintenanceStep(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Error completing maintenance step: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    @PostMapping("/steps/{id}/mark-as-final")
    public ResponseEntity<MaintenanceStepDto> markStepAsFinal(@PathVariable UUID id) {
        try {
            MaintenanceStepDto updatedStep = maintenanceService.markStepAsFinal(id);
            return ResponseEntity.ok(updatedStep);
        } catch (Exception e) {
            log.error("Error marking step as final: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    @PostMapping("/steps/{id}/handoff")
    public ResponseEntity<MaintenanceStepDto> handoffToNextStep(
            @PathVariable UUID id,
            @Valid @RequestBody MaintenanceStepDto nextStepDto) {
        try {
            maintenanceService.handoffToNextStep(id, nextStepDto);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Error handoff maintenance step: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Assign contact to step
    @PostMapping("/steps/{stepId}/assign-contact/{contactId}")
    public ResponseEntity<MaintenanceStepDto> assignContactToStep(
            @PathVariable UUID stepId,
            @PathVariable UUID contactId) {
        try {
            MaintenanceStepDto updated = maintenanceService.assignContactToStep(stepId, contactId);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            log.error("Error assigning contact to step: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Get available contacts
    @GetMapping("/available-contacts")
    public ResponseEntity<List<ContactDto>> getAvailableContacts(
            @RequestParam(required = false) String specialization) {
        try {
            List<ContactDto> contacts;
            if (specialization != null && !specialization.trim().isEmpty()) {
                contacts = contactService.getAvailableContactsBySpecialization(specialization);
            } else {
                contacts = contactService.getAvailableContacts();
            }
            return ResponseEntity.ok(contacts);
        } catch (Exception e) {
            log.error("Error retrieving available contacts: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // Contact logs
    @PostMapping("/steps/{stepId}/contacts")
    public ResponseEntity<ContactLogDto> createContactLog(
            @PathVariable UUID stepId,
            @Valid @RequestBody ContactLogDto dto) {
        try {
            ContactLogDto created = maintenanceService.createContactLog(stepId, dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (Exception e) {
            log.error("Error creating contact log: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/records/{recordId}/contacts")
    public ResponseEntity<List<ContactLogDto>> getContactLogs(@PathVariable UUID recordId) {
        try {
            List<ContactLogDto> logs = maintenanceService.getContactLogs(recordId);
            return ResponseEntity.ok(logs);
        } catch (Exception e) {
            log.error("Error retrieving contact logs: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // Search and Filter Endpoints
    
    @GetMapping("/records/search")
    public ResponseEntity<List<MaintenanceRecordDto>> searchMaintenanceRecords(
            @RequestParam(required = false) UUID equipmentId,
            @RequestParam(required = false) String equipmentInfo,
            @RequestParam(required = false) String responsiblePerson,
            @RequestParam(required = false) String status) {
        
        try {
            // Since pagination is handled on the frontend, return all records
            // The frontend can filter and paginate as needed
            List<MaintenanceRecordDto> records = maintenanceService.getAllMaintenanceRecords();
            return ResponseEntity.ok(records);
        } catch (Exception e) {
            log.error("Error searching maintenance records: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // Error Handling
    
    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleGenericException(Exception e) {
        log.error("Unexpected error: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("An unexpected error occurred");
    }
} 