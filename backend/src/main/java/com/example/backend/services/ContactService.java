package com.example.backend.services;

import com.example.backend.dtos.ContactDto;
import com.example.backend.models.Contact;
import com.example.backend.repositories.ContactRepository;
import com.example.backend.exceptions.ContactException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ContactService {
    
    private final ContactRepository contactRepository;
    
    // Create a new contact
    public ContactDto createContact(ContactDto dto) {
        try {
            // Check if email already exists
            if (contactRepository.findByEmail(dto.getEmail()).isPresent()) {
                throw new ContactException("Contact with email " + dto.getEmail() + " already exists");
            }
            
            Contact contact = Contact.builder()
                    .firstName(dto.getFirstName())
                    .lastName(dto.getLastName())
                    .email(dto.getEmail())
                    .phoneNumber(dto.getPhoneNumber())
                    .alternatePhone(dto.getAlternatePhone())
                    .contactType(dto.getContactType())
                    .company(dto.getCompany())
                    .position(dto.getPosition())
                    .department(dto.getDepartment())
                    .specialization(dto.getSpecialization())
                    .availabilityHours(dto.getAvailabilityHours())
                    .emergencyContact(dto.getEmergencyContact() != null ? dto.getEmergencyContact() : false)
                    .preferredContactMethod(dto.getPreferredContactMethod())
                    .notes(dto.getNotes())
                    .isActive(dto.getIsActive() != null ? dto.getIsActive() : true)
                    .build();
            
            Contact savedContact = contactRepository.save(contact);
            return convertToDto(savedContact);
        } catch (Exception e) {
            log.error("Error creating contact: {}", e.getMessage());
            throw new ContactException("Failed to create contact: " + e.getMessage());
        }
    }
    
    // Get contact by ID
    public ContactDto getContact(UUID id) {
        Contact contact = contactRepository.findById(id)
                .orElseThrow(() -> new ContactException("Contact not found with ID: " + id));
        return convertToDto(contact);
    }
    
    // Get all contacts
    public List<ContactDto> getContacts() {
        List<Contact> contacts = contactRepository.findAll();
        return contacts.stream().map(this::convertToDto).collect(Collectors.toList());
    }
    
    // Get contacts with filters
    public List<ContactDto> getContactsWithFilters(
            String firstName, String lastName, String contactType,
            String company, String isActive) {
        
        log.info("Processing filters - firstName: {}, lastName: {}, contactType: {}, company: {}, isActive: {}", 
                firstName, lastName, contactType, company, isActive);
        
        // Handle "all" case for contactType
        Contact.ContactType contactTypeEnum = null;
        if (contactType != null && !contactType.equalsIgnoreCase("all")) {
            try {
                contactTypeEnum = Contact.ContactType.valueOf(contactType.toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid contact type: {}", contactType);
                // If invalid contact type, we'll pass null to get all contacts
            }
        }
        
        // Handle "all" case for isActive
        Boolean isActiveBoolean = null;
        if (isActive != null && !isActive.equalsIgnoreCase("all")) {
            isActiveBoolean = Boolean.valueOf(isActive);
        }
        
        log.info("Processed filters - contactTypeEnum: {}, isActiveBoolean: {}", contactTypeEnum, isActiveBoolean);
        
        List<Contact> contacts = contactRepository.findContactsWithFilters(
                firstName, lastName, contactTypeEnum, company, isActiveBoolean);
        
        log.info("Found {} contacts from repository", contacts.size());
        
        List<ContactDto> contactDtos = contacts.stream().map(this::convertToDto).collect(Collectors.toList());
        
        log.info("Converted to {} DTOs", contactDtos.size());
        
        return contactDtos;
    }
    
    // Get all active contacts
    public List<ContactDto> getActiveContacts() {
        List<Contact> contacts = contactRepository.findByIsActiveTrue();
        return contacts.stream().map(this::convertToDto).collect(Collectors.toList());
    }
    
    // Get contacts by type
    public List<ContactDto> getContactsByType(Contact.ContactType contactType) {
        List<Contact> contacts = contactRepository.findByContactTypeAndIsActiveTrue(contactType);
        return contacts.stream().map(this::convertToDto).collect(Collectors.toList());
    }
    
    // Get available contacts
    public List<ContactDto> getAvailableContacts() {
        List<Contact> contacts = contactRepository.findAvailableContacts();
        return contacts.stream().map(this::convertToDto).collect(Collectors.toList());
    }
    
    // Get available contacts by specialization
    public List<ContactDto> getAvailableContactsBySpecialization(String specialization) {
        List<Contact> contacts = contactRepository.findAvailableContactsBySpecialization(specialization);
        return contacts.stream().map(this::convertToDto).collect(Collectors.toList());
    }
    
    // Get available contacts by type
    public List<ContactDto> getAvailableContactsByType(Contact.ContactType contactType) {
        List<Contact> contacts = contactRepository.findAvailableContactsByType(contactType);
        return contacts.stream().map(this::convertToDto).collect(Collectors.toList());
    }
    
    // Get emergency contacts
    public List<ContactDto> getEmergencyContacts() {
        List<Contact> contacts = contactRepository.findByEmergencyContactTrueAndIsActiveTrue();
        return contacts.stream().map(this::convertToDto).collect(Collectors.toList());
    }
    
    // Search contacts
    public List<ContactDto> searchContacts(String searchTerm) {
        List<Contact> contacts = contactRepository.findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(
                searchTerm, searchTerm);
        return contacts.stream().map(this::convertToDto).collect(Collectors.toList());
    }
    
    // Update contact
    public ContactDto updateContact(UUID id, ContactDto dto) {
        try {
            Contact contact = contactRepository.findById(id)
                    .orElseThrow(() -> new ContactException("Contact not found with ID: " + id));
            
            // Check if email is being changed and if it already exists
            if (!contact.getEmail().equals(dto.getEmail()) && 
                contactRepository.findByEmail(dto.getEmail()).isPresent()) {
                throw new ContactException("Contact with email " + dto.getEmail() + " already exists");
            }
            
            contact.setFirstName(dto.getFirstName());
            contact.setLastName(dto.getLastName());
            contact.setEmail(dto.getEmail());
            contact.setPhoneNumber(dto.getPhoneNumber());
            contact.setAlternatePhone(dto.getAlternatePhone());
            contact.setContactType(dto.getContactType());
            contact.setCompany(dto.getCompany());
            contact.setPosition(dto.getPosition());
            contact.setDepartment(dto.getDepartment());
            contact.setSpecialization(dto.getSpecialization());
            contact.setAvailabilityHours(dto.getAvailabilityHours());
            contact.setEmergencyContact(dto.getEmergencyContact());
            contact.setPreferredContactMethod(dto.getPreferredContactMethod());
            contact.setNotes(dto.getNotes());
            contact.setIsActive(dto.getIsActive());
            
            Contact updatedContact = contactRepository.save(contact);
            return convertToDto(updatedContact);
        } catch (Exception e) {
            log.error("Error updating contact: {}", e.getMessage());
            throw new ContactException("Failed to update contact: " + e.getMessage());
        }
    }
    
    // Delete contact
    public void deleteContact(UUID id) {
        try {
            Contact contact = contactRepository.findById(id)
                    .orElseThrow(() -> new ContactException("Contact not found with ID: " + id));
            
            // Check if contact has active assignments
            if (contact.getActiveAssignments() > 0) {
                throw new ContactException("Cannot delete contact with active assignments");
            }
            
            contactRepository.delete(contact);
        } catch (Exception e) {
            log.error("Error deleting contact: {}", e.getMessage());
            throw new ContactException("Failed to delete contact: " + e.getMessage());
        }
    }
    
    // Deactivate contact
    public ContactDto deactivateContact(UUID id) {
        Contact contact = contactRepository.findById(id)
                .orElseThrow(() -> new ContactException("Contact not found with ID: " + id));
        
        contact.setIsActive(false);
        Contact updatedContact = contactRepository.save(contact);
        return convertToDto(updatedContact);
    }
    
    // Activate contact
    public ContactDto activateContact(UUID id) {
        Contact contact = contactRepository.findById(id)
                .orElseThrow(() -> new ContactException("Contact not found with ID: " + id));
        
        contact.setIsActive(true);
        Contact updatedContact = contactRepository.save(contact);
        return convertToDto(updatedContact);
    }
    
    // Get contacts with overdue assignments
    public List<ContactDto> getContactsWithOverdueAssignments() {
        List<Contact> contacts = contactRepository.findContactsWithOverdueAssignments();
        return contacts.stream().map(this::convertToDto).collect(Collectors.toList());
    }
    
    // Get contacts needing follow-up
    public List<ContactDto> getContactsNeedingFollowUp() {
        List<Contact> contacts = contactRepository.findContactsNeedingFollowUp();
        return contacts.stream().map(this::convertToDto).collect(Collectors.toList());
    }
    
    // Get contact statistics
    public Object getContactStatistics() {
        List<Object[]> typeStats = contactRepository.getContactCountByType();
        List<Object[]> companyStats = contactRepository.getContactCountByCompany();
        List<Object[]> departmentStats = contactRepository.getContactCountByDepartment();
        
        return new Object() {
            public final List<Object[]> contactTypes = typeStats;
            public final List<Object[]> companies = companyStats;
            public final List<Object[]> departments = departmentStats;
        };
    }
    
    // Convert entity to DTO
    private ContactDto convertToDto(Contact contact) {
        return ContactDto.builder()
                .id(contact.getId())
                .firstName(contact.getFirstName())
                .lastName(contact.getLastName())
                .email(contact.getEmail())
                .phoneNumber(contact.getPhoneNumber())
                .alternatePhone(contact.getAlternatePhone())
                .contactType(contact.getContactType())
                .company(contact.getCompany())
                .position(contact.getPosition())
                .department(contact.getDepartment())
                .specialization(contact.getSpecialization())
                .availabilityHours(contact.getAvailabilityHours())
                .emergencyContact(contact.getEmergencyContact())
                .preferredContactMethod(contact.getPreferredContactMethod())
                .notes(contact.getNotes())
                .isActive(contact.getIsActive())
                .createdAt(contact.getCreatedAt())
                .updatedAt(contact.getUpdatedAt())
                .version(contact.getVersion())
                .fullName(contact.getFullName())
                .activeAssignments(contact.getActiveAssignments())
                .isAvailable(contact.isAvailable())
                .build();
    }
} 