package com.example.backend.controllers;

import com.example.backend.dtos.ContactDto;
import com.example.backend.models.Contact;
import com.example.backend.services.ContactService;
import com.example.backend.exceptions.ContactException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/contacts")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class ContactController {
    
    private final ContactService contactService;
    
    // Create a new contact
    @PostMapping
    public ResponseEntity<ContactDto> createContact(@Valid @RequestBody ContactDto dto) {
        try {
            ContactDto created = contactService.createContact(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (ContactException e) {
            log.error("Error creating contact: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Get contact by ID
    @GetMapping("/{id}")
    public ResponseEntity<ContactDto> getContact(@PathVariable UUID id) {
        try {
            ContactDto contact = contactService.getContact(id);
            return ResponseEntity.ok(contact);
        } catch (ContactException e) {
            log.error("Error retrieving contact: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }
    
    // Get all contacts
    @GetMapping
    public ResponseEntity<List<ContactDto>> getContacts() {
        List<ContactDto> contacts = contactService.getContacts();
        return ResponseEntity.ok(contacts);
    }
    
    // Get contacts with filters
    @GetMapping("/filter")
    public ResponseEntity<List<ContactDto>> getContactsWithFilters(
            @RequestParam(required = false) String firstName,
            @RequestParam(required = false) String lastName,
            @RequestParam(required = false) String contactType,
            @RequestParam(required = false) String company,
            @RequestParam(required = false) String isActive) {
        
        log.info("Received filter request - firstName: {}, lastName: {}, contactType: {}, company: {}, isActive: {}", 
                firstName, lastName, contactType, company, isActive);
        
        List<ContactDto> contacts = contactService.getContactsWithFilters(
                firstName, lastName, contactType, company, isActive);
        
        log.info("Returning {} contacts", contacts.size());
        
        return ResponseEntity.ok(contacts);
    }
    
    // Get all active contacts
    @GetMapping("/active")
    public ResponseEntity<List<ContactDto>> getActiveContacts() {
        List<ContactDto> contacts = contactService.getActiveContacts();
        return ResponseEntity.ok(contacts);
    }
    
    // Get contacts by type
    @GetMapping("/type/{contactType}")
    public ResponseEntity<List<ContactDto>> getContactsByType(@PathVariable Contact.ContactType contactType) {
        List<ContactDto> contacts = contactService.getContactsByType(contactType);
        return ResponseEntity.ok(contacts);
    }
    
    // Get available contacts
    @GetMapping("/available")
    public ResponseEntity<List<ContactDto>> getAvailableContacts() {
        List<ContactDto> contacts = contactService.getAvailableContacts();
        return ResponseEntity.ok(contacts);
    }
    
    // Get available contacts by specialization
    @GetMapping("/available/specialization/{specialization}")
    public ResponseEntity<List<ContactDto>> getAvailableContactsBySpecialization(@PathVariable String specialization) {
        List<ContactDto> contacts = contactService.getAvailableContactsBySpecialization(specialization);
        return ResponseEntity.ok(contacts);
    }
    
    // Get available contacts by type
    @GetMapping("/available/type/{contactType}")
    public ResponseEntity<List<ContactDto>> getAvailableContactsByType(@PathVariable Contact.ContactType contactType) {
        List<ContactDto> contacts = contactService.getAvailableContactsByType(contactType);
        return ResponseEntity.ok(contacts);
    }
    
    // Get emergency contacts
    @GetMapping("/emergency")
    public ResponseEntity<List<ContactDto>> getEmergencyContacts() {
        List<ContactDto> contacts = contactService.getEmergencyContacts();
        return ResponseEntity.ok(contacts);
    }
    
    // Search contacts
    @GetMapping("/search")
    public ResponseEntity<List<ContactDto>> searchContacts(@RequestParam String searchTerm) {
        List<ContactDto> contacts = contactService.searchContacts(searchTerm);
        return ResponseEntity.ok(contacts);
    }
    
    // Update contact
    @PutMapping("/{id}")
    public ResponseEntity<ContactDto> updateContact(
            @PathVariable UUID id, 
            @Valid @RequestBody ContactDto dto) {
        try {
            ContactDto updated = contactService.updateContact(id, dto);
            return ResponseEntity.ok(updated);
        } catch (ContactException e) {
            log.error("Error updating contact: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Delete contact
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteContact(@PathVariable UUID id) {
        try {
            contactService.deleteContact(id);
            return ResponseEntity.noContent().build();
        } catch (ContactException e) {
            log.error("Error deleting contact: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Deactivate contact
    @PostMapping("/{id}/deactivate")
    public ResponseEntity<ContactDto> deactivateContact(@PathVariable UUID id) {
        try {
            ContactDto deactivated = contactService.deactivateContact(id);
            return ResponseEntity.ok(deactivated);
        } catch (ContactException e) {
            log.error("Error deactivating contact: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Activate contact
    @PostMapping("/{id}/activate")
    public ResponseEntity<ContactDto> activateContact(@PathVariable UUID id) {
        try {
            ContactDto activated = contactService.activateContact(id);
            return ResponseEntity.ok(activated);
        } catch (ContactException e) {
            log.error("Error activating contact: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Get contacts with overdue assignments
    @GetMapping("/overdue-assignments")
    public ResponseEntity<List<ContactDto>> getContactsWithOverdueAssignments() {
        List<ContactDto> contacts = contactService.getContactsWithOverdueAssignments();
        return ResponseEntity.ok(contacts);
    }
    
    // Get contacts needing follow-up
    @GetMapping("/needing-followup")
    public ResponseEntity<List<ContactDto>> getContactsNeedingFollowUp() {
        List<ContactDto> contacts = contactService.getContactsNeedingFollowUp();
        return ResponseEntity.ok(contacts);
    }
    
    // Get contact statistics
    @GetMapping("/statistics")
    public ResponseEntity<Object> getContactStatistics() {
        Object statistics = contactService.getContactStatistics();
        return ResponseEntity.ok(statistics);
    }
    
    // Exception handlers
    @ExceptionHandler(ContactException.class)
    public ResponseEntity<String> handleContactException(ContactException e) {
        return ResponseEntity.badRequest().body(e.getMessage());
    }
    
    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleGenericException(Exception e) {
        log.error("Unexpected error in ContactController: {}", e.getMessage(), e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("An unexpected error occurred");
    }
} 