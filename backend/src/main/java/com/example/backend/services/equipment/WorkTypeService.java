package com.example.backend.services.equipment;

import com.example.backend.dto.equipment.WorkTypeDTO;
import com.example.backend.exceptions.ResourceAlreadyExistsException;
import com.example.backend.exceptions.ResourceConflictException;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.equipment.WorkType;
import com.example.backend.repositories.equipment.WorkTypeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class WorkTypeService {

    @Autowired
    private WorkTypeRepository workTypeRepository;

    /**
     * Get all active work types
     */
    public List<WorkTypeDTO> getAllWorkTypes() {
        return workTypeRepository.findByActiveTrue().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get all work types (both active and inactive) for management interface
     */
    public List<WorkTypeDTO> getAllWorkTypesForManagement() {
        return workTypeRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get work type by ID
     */
    public WorkTypeDTO getWorkTypeById(UUID id) {
        WorkType workType = workTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Work type not found with id: " + id));
        return convertToDTO(workType);
    }

    /**
     * Create a new work type
     */
    @Transactional
    public WorkTypeDTO createWorkType(WorkTypeDTO workTypeDTO) {
        // Check if work type with same name already exists (case-insensitive)
        Optional<WorkType> existingWorkType = workTypeRepository.findByNameIgnoreCase(workTypeDTO.getName());
        if (existingWorkType.isPresent()) {
            WorkType existing = existingWorkType.get();
            if (existing.isActive()) {
                throw ResourceConflictException.duplicateActive("Work type", workTypeDTO.getName());
            } else {
                throw ResourceConflictException.duplicateInactive("Work type", workTypeDTO.getName());
            }
        }

        WorkType workType = new WorkType();
        workType.setName(workTypeDTO.getName());
        workType.setDescription(workTypeDTO.getDescription());
        workType.setActive(true);

        WorkType savedWorkType = workTypeRepository.save(workType);
        return convertToDTO(savedWorkType);
    }

    /**
     * Update an existing work type
     */
    @Transactional
    public WorkTypeDTO updateWorkType(UUID id, WorkTypeDTO workTypeDTO) {
        WorkType workType = workTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Work type not found with id: " + id));

        // Check if name is being changed and if it conflicts with an existing one
        if (!workType.getName().equals(workTypeDTO.getName())) {
            Optional<WorkType> conflictingWorkType = workTypeRepository.findByNameIgnoreCase(workTypeDTO.getName());
            if (conflictingWorkType.isPresent()) {
                WorkType existing = conflictingWorkType.get();
                if (existing.isActive()) {
                    throw ResourceConflictException.duplicateActive("Work type", workTypeDTO.getName());
                } else {
                    throw ResourceConflictException.duplicateInactive("Work type", workTypeDTO.getName());
                }
            }
        }

        workType.setName(workTypeDTO.getName());
        workType.setDescription(workTypeDTO.getDescription());
        workType.setActive(workTypeDTO.isActive());

        WorkType updatedWorkType = workTypeRepository.save(workType);
        return convertToDTO(updatedWorkType);
    }

    /**
     * Delete a work type (soft delete)
     */
    @Transactional
    public void deleteWorkType(UUID id) {
        WorkType workType = workTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Work type not found with id: " + id));

        workType.setActive(false);
        workTypeRepository.save(workType);
    }

    /**
     * Reactivate an inactive work type by name and update its details
     */
    @Transactional
    public WorkTypeDTO reactivateWorkTypeByName(String name, WorkTypeDTO workTypeDTO) {
        WorkType workType = workTypeRepository.findByNameIgnoreCase(name)
                .orElseThrow(() -> new ResourceNotFoundException("Work type not found with name: " + name));
        
        if (workType.isActive()) {
            throw new IllegalStateException("Work type is already active");
        }
        
        // Reactivate and update with new details
        workType.setActive(true);
        workType.setName(workTypeDTO.getName()); // Update name in case of case differences
        workType.setDescription(workTypeDTO.getDescription()); // Update description
        
        WorkType reactivatedWorkType = workTypeRepository.save(workType);
        return convertToDTO(reactivatedWorkType);
    }

    /**
     * Convert entity to DTO
     */
    private WorkTypeDTO convertToDTO(WorkType workType) {
        WorkTypeDTO dto = new WorkTypeDTO();
        dto.setId(workType.getId());
        dto.setName(workType.getName());
        dto.setDescription(workType.getDescription());
        dto.setActive(workType.isActive());
        return dto;
    }
}