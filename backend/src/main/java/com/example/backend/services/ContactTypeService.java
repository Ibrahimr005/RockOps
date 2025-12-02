package com.example.backend.services;

import com.example.backend.dtos.ContactTypeDto;
import com.example.backend.models.contact.ContactType;
import com.example.backend.repositories.ContactTypeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ContactTypeService {

    private final ContactTypeRepository contactTypeRepository;

    public List<ContactTypeDto> getAllContactTypes() {
        return contactTypeRepository.findAllByOrderByNameAsc()
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public List<ContactTypeDto> getAllContactTypesForManagement() {
        return contactTypeRepository.findAllByOrderByNameAsc()
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public List<ContactTypeDto> getActiveContactTypes() {
        return contactTypeRepository.findByIsActiveTrueOrderByNameAsc()
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public ContactTypeDto getContactTypeById(UUID id) {
        ContactType contactType = contactTypeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Contact type not found with id: " + id));
        return convertToDto(contactType);
    }

    public ContactTypeDto createContactType(ContactTypeDto dto) {
        String normalizedName = dto.getName().trim();
        
        // Check if contact type with same name already exists (case-insensitive)
        if (contactTypeRepository.existsByNameIgnoreCase(normalizedName)) {
            // Find the existing contact type to show its exact name
            ContactType existing = contactTypeRepository.findByNameIgnoreCase(normalizedName)
                    .orElseThrow(() -> new RuntimeException("Contact type exists but couldn't be found"));
            
            throw new RuntimeException(
                "A contact type with this name already exists as '" + existing.getName() + "'. " +
                "Contact type names are case-insensitive (e.g., 'Customer', 'customer', and 'CUSTOMER' are considered the same)."
            );
        }

        // Standardize name to Title Case for consistency
        String titleCaseName = toTitleCase(normalizedName);
        
        ContactType contactType = ContactType.builder()
                .name(titleCaseName)
                .description(dto.getDescription() != null ? dto.getDescription().trim() : null)
                .isActive(dto.getIsActive() != null ? dto.getIsActive() : true)
                .build();

        ContactType saved = contactTypeRepository.save(contactType);
        log.info("Created contact type: {}", saved.getName());
        return convertToDto(saved);
    }

    public ContactTypeDto updateContactType(UUID id, ContactTypeDto dto) {
        ContactType existingContactType = contactTypeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Contact type not found with id: " + id));

        // Check if another contact type with same name exists (case-insensitive)
        String newName = dto.getName().trim();
        if (!existingContactType.getName().equalsIgnoreCase(newName) &&
            contactTypeRepository.existsByNameIgnoreCase(newName)) {
            
            // Find the conflicting contact type to show its exact name
            ContactType conflicting = contactTypeRepository.findByNameIgnoreCase(newName)
                    .orElseThrow(() -> new RuntimeException("Contact type exists but couldn't be found"));
            
            throw new RuntimeException(
                "A contact type with this name already exists as '" + conflicting.getName() + "'. " +
                "Contact type names are case-insensitive (e.g., 'Customer', 'customer', and 'CUSTOMER' are considered the same)."
            );
        }

        // Standardize name to Title Case for consistency
        String titleCaseName = toTitleCase(newName);
        
        existingContactType.setName(titleCaseName);
        existingContactType.setDescription(dto.getDescription() != null ? dto.getDescription().trim() : null);
        existingContactType.setIsActive(dto.getIsActive());

        ContactType updated = contactTypeRepository.save(existingContactType);
        log.info("Updated contact type: {}", updated.getName());
        return convertToDto(updated);
    }

    public void deleteContactType(UUID id) {
        ContactType contactType = contactTypeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Contact type not found with id: " + id));

        // Hard delete - permanently remove from system
        contactTypeRepository.delete(contactType);
        log.info("Permanently deleted contact type: {}", contactType.getName());
    }

    private ContactTypeDto convertToDto(ContactType contactType) {
        return ContactTypeDto.builder()
                .id(contactType.getId())
                .name(contactType.getName())
                .description(contactType.getDescription())
                .isActive(contactType.getIsActive())
                .createdAt(contactType.getCreatedAt())
                .updatedAt(contactType.getUpdatedAt())
                .build();
    }
    
    /**
     * Converts a string to Title Case for standardization
     * Example: "customer" -> "Customer", "INTERNAL_STAFF" -> "Internal Staff"
     */
    private String toTitleCase(String input) {
        if (input == null || input.isEmpty()) {
            return input;
        }
        
        // Replace underscores with spaces
        String normalized = input.replace('_', ' ');
        
        // Split into words and capitalize first letter of each word
        String[] words = normalized.split("\\s+");
        StringBuilder result = new StringBuilder();
        
        for (int i = 0; i < words.length; i++) {
            if (i > 0) {
                result.append(" ");
            }
            
            String word = words[i].toLowerCase();
            if (!word.isEmpty()) {
                result.append(Character.toUpperCase(word.charAt(0)));
                if (word.length() > 1) {
                    result.append(word.substring(1));
                }
            }
        }
        
        return result.toString();
    }
}
