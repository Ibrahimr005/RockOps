package com.example.backend.services;

import com.example.backend.dtos.ContactTypeDto;
import com.example.backend.models.ContactType;
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
        // Check if contact type with same name already exists (case-insensitive)
        if (contactTypeRepository.existsByNameIgnoreCase(dto.getName().trim())) {
            throw new RuntimeException("Contact type with name '" + dto.getName() + "' already exists");
        }

        ContactType contactType = ContactType.builder()
                .name(dto.getName().trim())
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
            throw new RuntimeException("Contact type with name '" + newName + "' already exists");
        }

        existingContactType.setName(newName);
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
}
