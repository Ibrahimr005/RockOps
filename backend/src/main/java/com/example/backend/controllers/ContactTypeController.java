package com.example.backend.controllers;

import com.example.backend.dtos.ContactTypeDto;
import com.example.backend.services.ContactTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/contacttypes")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
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
    public ResponseEntity<ContactTypeDto> createContactType(@RequestBody ContactTypeDto contactTypeDto) {
        return new ResponseEntity<>(contactTypeService.createContactType(contactTypeDto), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ContactTypeDto> updateContactType(@PathVariable UUID id, @RequestBody ContactTypeDto contactTypeDto) {
        return ResponseEntity.ok(contactTypeService.updateContactType(id, contactTypeDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteContactType(@PathVariable UUID id) {
        contactTypeService.deleteContactType(id);
        return ResponseEntity.noContent().build();
    }
}


