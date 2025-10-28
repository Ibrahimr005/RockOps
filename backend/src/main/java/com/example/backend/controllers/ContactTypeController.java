package com.example.backend.controllers;

import com.example.backend.dtos.ContactTypeDto;
import com.example.backend.services.ContactTypeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/contacttypes")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class ContactTypeController {

    private final ContactTypeService contactTypeService;

    @GetMapping
    public ResponseEntity<List<ContactTypeDto>> getAllContactTypes() {
        return ResponseEntity.ok(contactTypeService.getAllContactTypes());
    }

    @GetMapping("/management")
    public ResponseEntity<List<ContactTypeDto>> getAllContactTypesForManagement() {
        return ResponseEntity.ok(contactTypeService.getAllContactTypesForManagement());
    }

    @GetMapping("/active")
    public ResponseEntity<List<ContactTypeDto>> getActiveContactTypes() {
        return ResponseEntity.ok(contactTypeService.getActiveContactTypes());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ContactTypeDto> getContactTypeById(@PathVariable UUID id) {
        return ResponseEntity.ok(contactTypeService.getContactTypeById(id));
    }

    @PostMapping
    public ResponseEntity<?> createContactType(@RequestBody ContactTypeDto contactTypeDto) {
        try {
            ContactTypeDto created = contactTypeService.createContactType(contactTypeDto);
            return new ResponseEntity<>(created, HttpStatus.CREATED);
        } catch (RuntimeException e) {
            log.warn("Failed to create contact type: {}", e.getMessage());
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            errorResponse.put("field", "name");
            return new ResponseEntity<>(errorResponse, HttpStatus.CONFLICT);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateContactType(@PathVariable UUID id, @RequestBody ContactTypeDto contactTypeDto) {
        try {
            ContactTypeDto updated = contactTypeService.updateContactType(id, contactTypeDto);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            log.warn("Failed to update contact type: {}", e.getMessage());
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            errorResponse.put("field", "name");
            return new ResponseEntity<>(errorResponse, HttpStatus.CONFLICT);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteContactType(@PathVariable UUID id) {
        contactTypeService.deleteContactType(id);
        return ResponseEntity.noContent().build();
    }
}



