package com.example.backend.services.equipment;

import com.example.backend.dto.equipment.MaintenanceTypeDTO;
import com.example.backend.exceptions.ResourceAlreadyExistsException;
import com.example.backend.exceptions.ResourceConflictException;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.equipment.MaintenanceType;
import com.example.backend.models.notification.NotificationType;
import com.example.backend.models.user.Role;
import com.example.backend.repositories.equipment.MaintenanceTypeRepository;
import com.example.backend.services.notification.NotificationService;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class MaintenanceTypeService {

    @Autowired
    private MaintenanceTypeRepository maintenanceTypeRepository;

    @Autowired
    private NotificationService notificationService;

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
        // Validate input
        validateMaintenanceTypeInput(maintenanceTypeDTO);
        
        // Check if maintenance type with same name already exists
        Optional<MaintenanceType> existingMaintenanceType = maintenanceTypeRepository.findByNameIgnoreCase(maintenanceTypeDTO.getName());
        if (existingMaintenanceType.isPresent()) {
            MaintenanceType existing = existingMaintenanceType.get();
            if (existing.isActive()) {
                throw ResourceConflictException.duplicateActive("Maintenance type", maintenanceTypeDTO.getName());
            } else {
                throw ResourceConflictException.duplicateInactive("Maintenance type", maintenanceTypeDTO.getName());
            }
        }

        MaintenanceType maintenanceType = new MaintenanceType();
        maintenanceType.setName(maintenanceTypeDTO.getName());
        maintenanceType.setDescription(maintenanceTypeDTO.getDescription());
        // Use the active status from DTO instead of hardcoding to true
        maintenanceType.setActive(maintenanceTypeDTO.isActive());

        MaintenanceType savedMaintenanceType = maintenanceTypeRepository.save(maintenanceType);

        // Send notifications
        try {
            String notificationTitle = "New Maintenance Type Created";
            String notificationMessage = "Maintenance type '" + savedMaintenanceType.getName() + "' has been created. " +
                    (maintenanceTypeDTO.getDescription() != null ? maintenanceTypeDTO.getDescription() : "");
            String actionUrl = "/equipment/maintenance-type-management";
            String relatedEntity = savedMaintenanceType.getId().toString();

            List<Role> targetRoles = Arrays.asList(Role.EQUIPMENT_MANAGER, Role.ADMIN);

            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.SUCCESS,
                    actionUrl,
                    relatedEntity
            );

            System.out.println("Maintenance type creation notification sent successfully");
        } catch (Exception e) {
            System.err.println("Failed to send maintenance type creation notification: " + e.getMessage());
        }
        return convertToDTO(savedMaintenanceType);
    }

    /**
     * Update an existing maintenance type
     */
    @Transactional
    public MaintenanceTypeDTO updateMaintenanceType(UUID id, MaintenanceTypeDTO maintenanceTypeDTO) {
        // Validate input
        validateMaintenanceTypeInput(maintenanceTypeDTO);
        
        MaintenanceType maintenanceType = maintenanceTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Maintenance type not found with id: " + id));

        // Check if name is being changed and if it conflicts with an existing one
        if (!maintenanceType.getName().equals(maintenanceTypeDTO.getName())) {
            Optional<MaintenanceType> conflictingMaintenanceType = maintenanceTypeRepository.findByNameIgnoreCase(maintenanceTypeDTO.getName());
            if (conflictingMaintenanceType.isPresent()) {
                MaintenanceType existing = conflictingMaintenanceType.get();
                if (existing.isActive()) {
                    throw ResourceConflictException.duplicateActive("Maintenance type", maintenanceTypeDTO.getName());
                } else {
                    throw ResourceConflictException.duplicateInactive("Maintenance type", maintenanceTypeDTO.getName());
                }
            }
        }

        maintenanceType.setName(maintenanceTypeDTO.getName());
        maintenanceType.setDescription(maintenanceTypeDTO.getDescription());
        maintenanceType.setActive(maintenanceTypeDTO.isActive());

        MaintenanceType updatedMaintenanceType = maintenanceTypeRepository.save(maintenanceType);

        // Send notifications
        try {
            String notificationTitle = "Maintenance Type Updated";
            String notificationMessage = "Maintenance type '" + updatedMaintenanceType.getName() + "' has been updated. " +
                    (maintenanceTypeDTO.getDescription() != null ? maintenanceTypeDTO.getDescription() : "");
            String actionUrl = "/equipment/maintenance-type-management";
            String relatedEntity = updatedMaintenanceType.getId().toString();

            List<Role> targetRoles = Arrays.asList(Role.EQUIPMENT_MANAGER, Role.ADMIN);

            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.INFO,
                    actionUrl,
                    relatedEntity
            );

            System.out.println("Maintenance type update notification sent successfully");
        } catch (Exception e) {
            System.err.println("Failed to send maintenance type update notification: " + e.getMessage());
        }

        return convertToDTO(updatedMaintenanceType);
    }

    /**
     * Delete a maintenance type (permanent deletion)
     * Note: Users should mark types as inactive if they want to hide them from regular users.
     * This delete operation permanently removes the type from the system.
     */
    @Transactional
    public void deleteMaintenanceType(UUID id) {
        MaintenanceType maintenanceType = maintenanceTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Maintenance type not found with id: " + id));

        String maintenanceTypeName = maintenanceType.getName();
        
        // Permanently delete from database
        maintenanceTypeRepository.delete(maintenanceType);

        // Send notifications
        try {
            String notificationTitle = "Maintenance Type Permanently Deleted";
            String notificationMessage = "Maintenance type '" + maintenanceTypeName + "' has been permanently deleted from the system.";
            String actionUrl = "/equipment/maintenance-type-management";
            String relatedEntity = id.toString();

            List<Role> targetRoles = Arrays.asList(Role.EQUIPMENT_MANAGER, Role.ADMIN);

            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.WARNING,
                    actionUrl,
                    relatedEntity
            );

            System.out.println("Maintenance type deletion notification sent successfully");
        } catch (Exception e) {
            System.err.println("Failed to send maintenance type deletion notification: " + e.getMessage());
        }
    }

    // Get all active maintenance types
    public List<MaintenanceType> getAllActiveMaintenanceTypes() {
        return maintenanceTypeRepository.findByActiveTrue();
    }

    // Add new maintenance type
    @Transactional
    public MaintenanceType addMaintenanceType(String name, String description) {
        // Check if maintenance type with same name already exists
        Optional<MaintenanceType> existingMaintenanceType = maintenanceTypeRepository.findByNameIgnoreCase(name);
        if (existingMaintenanceType.isPresent()) {
            MaintenanceType existing = existingMaintenanceType.get();
            if (existing.isActive()) {
                throw ResourceConflictException.duplicateActive("Maintenance type", name);
            } else {
                throw ResourceConflictException.duplicateInactive("Maintenance type", name);
            }
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
            Optional<MaintenanceType> conflictingMaintenanceType = maintenanceTypeRepository.findByNameIgnoreCase(name);
            if (conflictingMaintenanceType.isPresent()) {
                MaintenanceType existing = conflictingMaintenanceType.get();
                if (existing.isActive()) {
                    throw ResourceConflictException.duplicateActive("Maintenance type", name);
                } else {
                    throw ResourceConflictException.duplicateInactive("Maintenance type", name);
                }
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
     * Reactivate an inactive maintenance type by name and update its details
     */
    @Transactional
    public MaintenanceTypeDTO reactivateMaintenanceTypeByName(String name, MaintenanceTypeDTO maintenanceTypeDTO) {
        MaintenanceType maintenanceType = maintenanceTypeRepository.findByNameIgnoreCase(name)
                .orElseThrow(() -> new ResourceNotFoundException("Maintenance type not found with name: " + name));
        
        if (maintenanceType.isActive()) {
            throw new IllegalStateException("Maintenance type is already active");
        }
        
        // Reactivate and update with new details
        maintenanceType.setActive(true);
        maintenanceType.setName(maintenanceTypeDTO.getName()); // Update name in case of case differences
        maintenanceType.setDescription(maintenanceTypeDTO.getDescription()); // Update description
        
        MaintenanceType reactivatedMaintenanceType = maintenanceTypeRepository.save(maintenanceType);
        return convertToDTO(reactivatedMaintenanceType);
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
    
    /**
     * Validate maintenance type input for reserved/invalid values
     */
    private void validateMaintenanceTypeInput(MaintenanceTypeDTO maintenanceTypeDTO) {
        if (maintenanceTypeDTO.getName() == null || maintenanceTypeDTO.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Maintenance type name cannot be empty");
        }
        
        String normalizedName = maintenanceTypeDTO.getName().trim().toUpperCase();
        
        // Check for reserved/invalid values
        if ("NA".equals(normalizedName) || "N/A".equals(normalizedName)) {
            throw new IllegalArgumentException("Maintenance type name cannot be 'NA' or 'N/A'. Please provide a meaningful name for the maintenance type (e.g., 'Oil Change', 'Inspection', 'Repair').");
        }
        
        // Check description if provided
        if (maintenanceTypeDTO.getDescription() != null && !maintenanceTypeDTO.getDescription().trim().isEmpty()) {
            String normalizedDesc = maintenanceTypeDTO.getDescription().trim().toUpperCase();
            if ("NA".equals(normalizedDesc) || "N/A".equals(normalizedDesc)) {
                throw new IllegalArgumentException("Maintenance type description cannot be 'NA' or 'N/A'. Please provide a meaningful description or leave it empty.");
            }
        }
    }
}