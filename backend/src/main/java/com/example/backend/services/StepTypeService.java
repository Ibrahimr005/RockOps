package com.example.backend.services;

import com.example.backend.dtos.StepTypeDto;
import com.example.backend.exceptions.ResourceConflictException;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.StepType;
import com.example.backend.repositories.StepTypeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class StepTypeService {

    private final StepTypeRepository stepTypeRepository;

    /**
     * Get all active step types
     */
    public List<StepTypeDto> getAllStepTypes() {
        return stepTypeRepository.findByActiveTrue().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * Get all step types (both active and inactive) for management interface
     */
    public List<StepTypeDto> getAllStepTypesForManagement() {
        return stepTypeRepository.findAll().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * Get step type by ID
     */
    public StepTypeDto getStepTypeById(UUID id) {
        StepType stepType = stepTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Step type not found with id: " + id));
        return convertToDto(stepType);
    }

    /**
     * Create a new step type
     */
    @Transactional
    public StepTypeDto createStepType(StepTypeDto stepTypeDto) {
        // Check if step type with same name already exists
        if (stepTypeRepository.existsByName(stepTypeDto.getName())) {
            throw new ResourceConflictException("Step type with name '" + stepTypeDto.getName() + "' already exists");
        }

        StepType stepType = new StepType();
        stepType.setName(stepTypeDto.getName());
        stepType.setDescription(stepTypeDto.getDescription());
        stepType.setActive(true);

        StepType savedStepType = stepTypeRepository.save(stepType);
        log.info("Created new step type: {}", savedStepType.getName());

        return convertToDto(savedStepType);
    }

    /**
     * Update an existing step type
     */
    @Transactional
    public StepTypeDto updateStepType(UUID id, StepTypeDto stepTypeDto) {
        StepType stepType = stepTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Step type not found with id: " + id));

        // Check if name is being changed and if it conflicts with an existing one
        if (!stepType.getName().equals(stepTypeDto.getName())) {
            Optional<StepType> conflictingStepType = stepTypeRepository.findByName(stepTypeDto.getName());
            if (conflictingStepType.isPresent() && !conflictingStepType.get().getId().equals(id)) {
                throw new ResourceConflictException("Step type with name '" + stepTypeDto.getName() + "' already exists");
            }
        }

        stepType.setName(stepTypeDto.getName());
        stepType.setDescription(stepTypeDto.getDescription());
        stepType.setActive(stepTypeDto.isActive());

        StepType updatedStepType = stepTypeRepository.save(stepType);
        log.info("Updated step type: {}", updatedStepType.getName());

        return convertToDto(updatedStepType);
    }

    /**
     * Delete a step type (soft delete)
     */
    @Transactional
    public void deleteStepType(UUID id) {
        StepType stepType = stepTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Step type not found with id: " + id));

        stepType.setActive(false);
        stepTypeRepository.save(stepType);
        log.info("Deleted step type: {}", stepType.getName());
    }

    /**
     * Convert entity to DTO
     */
    private StepTypeDto convertToDto(StepType stepType) {
        StepTypeDto dto = new StepTypeDto();
        dto.setId(stepType.getId());
        dto.setName(stepType.getName());
        dto.setDescription(stepType.getDescription());
        dto.setActive(stepType.isActive());
        return dto;
    }
}






