package com.example.backend.services.equipment;

import com.example.backend.dto.equipment.MaintenanceTypeDTO;
import com.example.backend.exceptions.ResourceAlreadyExistsException;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.equipment.MaintenanceType;
import com.example.backend.repositories.equipment.MaintenanceTypeRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class MaintenanceTypeService {

    @Autowired
    private MaintenanceTypeRepository maintenanceTypeRepository;

    /**
     * Get all active maintenance types
     */
    public List<MaintenanceTypeDTO> getAllMaintenanceTypes() {
        return maintenanceTypeRepository.findByActiveTrue().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get all maintenance types (both active and inactive) for management interface
     */
    public List<MaintenanceTypeDTO> getAllMaintenanceTypesForManagement() {
        return maintenanceTypeRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get maintenance type by ID
     */
    public MaintenanceTypeDTO getMaintenanceTypeById(UUID id) {
        MaintenanceType maintenanceType = maintenanceTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Maintenance type not found with id: " + id));
        return convertToDTO(maintenanceType);
    }

    /**
     * Get maintenance type entity by ID (for internal use)
     */
    public MaintenanceType getMaintenanceTypeEntityById(UUID id) {
        return maintenanceTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Maintenance type not found with id: " + id));
    }

    /**
     * Create a new maintenance type
     */
    @Transactional
    public MaintenanceTypeDTO createMaintenanceType(MaintenanceTypeDTO maintenanceTypeDTO) {
        // Check if maintenance type with same name already exists
        if (maintenanceTypeRepository.existsByNameIgnoreCase(maintenanceTypeDTO.getName())) {
            throw new ResourceAlreadyExistsException("Maintenance type with name '" + maintenanceTypeDTO.getName() + "' already exists");
        }

        MaintenanceType maintenanceType = new MaintenanceType();
        maintenanceType.setName(maintenanceTypeDTO.getName());
        maintenanceType.setDescription(maintenanceTypeDTO.getDescription());
        maintenanceType.setActive(true);

        MaintenanceType savedMaintenanceType = maintenanceTypeRepository.save(maintenanceType);
        return convertToDTO(savedMaintenanceType);
    }

    /**
     * Update an existing maintenance type
     */
    @Transactional
    public MaintenanceTypeDTO updateMaintenanceType(UUID id, MaintenanceTypeDTO maintenanceTypeDTO) {
        MaintenanceType maintenanceType = maintenanceTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Maintenance type not found with id: " + id));

        // Check if name is being changed and if it conflicts with an existing one
        if (!maintenanceType.getName().equals(maintenanceTypeDTO.getName()) &&
                maintenanceTypeRepository.existsByNameIgnoreCase(maintenanceTypeDTO.getName())) {
            throw new ResourceAlreadyExistsException("Maintenance type with name '" + maintenanceTypeDTO.getName() + "' already exists");
        }

        maintenanceType.setName(maintenanceTypeDTO.getName());
        maintenanceType.setDescription(maintenanceTypeDTO.getDescription());
        maintenanceType.setActive(maintenanceTypeDTO.isActive());

        MaintenanceType updatedMaintenanceType = maintenanceTypeRepository.save(maintenanceType);
        return convertToDTO(updatedMaintenanceType);
    }

    /**
     * Delete a maintenance type (soft delete)
     */
    @Transactional
    public void deleteMaintenanceType(UUID id) {
        MaintenanceType maintenanceType = maintenanceTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Maintenance type not found with id: " + id));

        maintenanceType.setActive(false);
        maintenanceTypeRepository.save(maintenanceType);
    }

    // Get all active maintenance types
    public List<MaintenanceType> getAllActiveMaintenanceTypes() {
        return maintenanceTypeRepository.findByActiveTrue();
    }

    // Add new maintenance type
    @Transactional
    public MaintenanceType addMaintenanceType(String name, String description) {
        // Check if maintenance type with same name already exists
        if (maintenanceTypeRepository.existsByNameIgnoreCase(name)) {
            throw new ResourceAlreadyExistsException("Maintenance type with name " + name + " already exists");
        }

        MaintenanceType maintenanceType = new MaintenanceType();
        maintenanceType.setName(name);
        maintenanceType.setDescription(description);
        maintenanceType.setActive(true);

        return maintenanceTypeRepository.save(maintenanceType);
    }

    // Update maintenance type
    @Transactional
    public MaintenanceType updateMaintenanceType(UUID id, String name, String description, Boolean active) {
        MaintenanceType maintenanceType = maintenanceTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Maintenance type not found with id: " + id));

        // If name is changing, check if new name already exists
        if (name != null && !name.equals(maintenanceType.getName())) {
            if (maintenanceTypeRepository.existsByNameIgnoreCase(name)) {
                throw new ResourceAlreadyExistsException("Maintenance type with name " + name + " already exists");
            }
            maintenanceType.setName(name);
        }

        if (description != null) maintenanceType.setDescription(description);
        if (active != null) maintenanceType.setActive(active);

        return maintenanceTypeRepository.save(maintenanceType);
    }

    // Search maintenance types by name
    public List<MaintenanceType> searchMaintenanceTypes(String namePart) {
        return maintenanceTypeRepository.findByNameContainingIgnoreCase(namePart);
    }

    /**
     * Convert entity to DTO
     */
    private MaintenanceTypeDTO convertToDTO(MaintenanceType maintenanceType) {
        MaintenanceTypeDTO dto = new MaintenanceTypeDTO();
        dto.setId(maintenanceType.getId());
        dto.setName(maintenanceType.getName());
        dto.setDescription(maintenanceType.getDescription());
        dto.setActive(maintenanceType.isActive());
        return dto;
    }
}