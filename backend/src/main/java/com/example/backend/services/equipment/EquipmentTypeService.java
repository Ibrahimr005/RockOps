package com.example.backend.services.equipment;

import com.example.backend.dto.equipment.EquipmentTypeDTO;
import com.example.backend.dto.equipment.WorkTypeDTO;
import com.example.backend.exceptions.ResourceConflictException;
import com.example.backend.exceptions.ResourceInUseException;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.equipment.EquipmentType;
import com.example.backend.models.equipment.WorkType;
import com.example.backend.models.hr.Department;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.notification.NotificationType;
import com.example.backend.models.user.Role;
import com.example.backend.repositories.equipment.EquipmentTypeRepository;
import com.example.backend.repositories.equipment.WorkTypeRepository;
import com.example.backend.repositories.hr.DepartmentRepository;
import com.example.backend.repositories.hr.JobPositionRepository;
import com.example.backend.services.notification.NotificationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
public class EquipmentTypeService {

    private final EquipmentTypeRepository equipmentTypeRepository;
    private final WorkTypeRepository workTypeRepository;
    private final DepartmentRepository departmentRepository;
    private final JobPositionRepository jobPositionRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    public EquipmentTypeService(EquipmentTypeRepository equipmentTypeRepository,
                                WorkTypeRepository workTypeRepository,
                                DepartmentRepository departmentRepository,
                                JobPositionRepository jobPositionRepository) {
        this.equipmentTypeRepository = equipmentTypeRepository;
        this.workTypeRepository = workTypeRepository;
        this.departmentRepository = departmentRepository;
        this.jobPositionRepository = jobPositionRepository;
    }

    public List<EquipmentTypeDTO> getAllEquipmentTypes() {
        return equipmentTypeRepository.findAll().stream()
                .map(EquipmentTypeDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public EquipmentTypeDTO getEquipmentTypeById(UUID id) {
        return equipmentTypeRepository.findById(id)
                .map(EquipmentTypeDTO::fromEntity)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment type not found with id: " + id));
    }

    public EquipmentTypeDTO getEquipmentTypeByName(String name) {
        return equipmentTypeRepository.findByName(name)
                .map(EquipmentTypeDTO::fromEntity)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment type not found with name: " + name));
    }

    @Transactional
    public EquipmentTypeDTO createEquipmentType(EquipmentTypeDTO dto) {
        // Check if equipment type with this name already exists
        Optional<EquipmentType> existingType = equipmentTypeRepository.findByName(dto.getName());
        if (existingType.isPresent()) {
            // For equipment types, we don't have soft delete, so it's always an active duplicate
            throw ResourceConflictException.duplicateActive("Equipment type", dto.getName());
        }

        // Create the equipment type
        EquipmentType entity = dto.toEntity();
        entity.setDriverPositionName(dto.getName() + " Driver");
        entity.setDrivable(dto.isDrivable());
        EquipmentType savedEntity = equipmentTypeRepository.save(entity);

        log.info("Created equipment type: {}", savedEntity.getName());

        // Create job position if the equipment is drivable
        if (dto.isDrivable()) {
            createJobPositionForEquipmentType(savedEntity);
        }

        // Send notifications
        try {
            String notificationTitle = "New Equipment Type Created";
            String notificationMessage = "Equipment type '" + savedEntity.getName() + "' has been created. " +
                    (dto.getDescription() != null ? dto.getDescription() : "");
            String actionUrl = "/equipment/type-management";
            String relatedEntity = savedEntity.getId().toString();

            List<Role> targetRoles = Arrays.asList(Role.EQUIPMENT_MANAGER, Role.ADMIN);

            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.SUCCESS,
                    actionUrl,
                    relatedEntity
            );

            System.out.println("Equipment type creation notification sent successfully");
        } catch (Exception e) {
            System.err.println("Failed to send equipment type creation notification: " + e.getMessage());
        }

        return EquipmentTypeDTO.fromEntity(savedEntity);
    }

    @Transactional
    public EquipmentTypeDTO updateEquipmentType(UUID id, EquipmentTypeDTO dto) {
        // Check if the type exists
        EquipmentType existingType = equipmentTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment type not found with id: " + id));

        // Check if the name is already used by another type
        if (!existingType.getName().equals(dto.getName())) {
            Optional<EquipmentType> conflictingType = equipmentTypeRepository.findByName(dto.getName());
            if (conflictingType.isPresent()) {
                throw ResourceConflictException.duplicateActive("Equipment type", dto.getName());
            }
        }

        // Store the old values to check for changes
        String oldName = existingType.getName();
        boolean wasDrivable = existingType.isDrivable();

        // Update fields
        existingType.setName(dto.getName());
        existingType.setDescription(dto.getDescription());
        existingType.setDriverPositionName(dto.getName() + " Driver");
        existingType.setDrivable(dto.isDrivable());

        // Save and return
        EquipmentType updatedEntity = equipmentTypeRepository.save(existingType);

        // Handle job position changes
        if (dto.isDrivable()) {
            // If it's now drivable (either newly drivable or name changed)
            if (!wasDrivable || !oldName.equals(dto.getName())) {
                if (!wasDrivable) {
                    log.info("Equipment type '{}' is now drivable - creating job position", dto.getName());
                    createJobPositionForEquipmentType(updatedEntity);
                } else {
                    log.info("Equipment type renamed from '{}' to '{}' - updating job position", oldName, dto.getName());
                    handleEquipmentTypeRenamed(oldName, updatedEntity);
                }
            }
        } else if (wasDrivable) {
            // Equipment type is no longer drivable - try to delete the position if it has no employees
            log.info("Equipment type '{}' is no longer drivable - attempting to remove job position", dto.getName());
            deleteJobPositionIfUnused(oldName + " Driver");
        }

        // Send notifications
        try {
            String notificationTitle = "Equipment Type Updated";
            String notificationMessage = "Equipment type '" + updatedEntity.getName() + "' has been updated. " +
                    (dto.getDescription() != null ? dto.getDescription() : "");
            String actionUrl = "/equipment/type-management";
            String relatedEntity = updatedEntity.getId().toString();

            List<Role> targetRoles = Arrays.asList(Role.EQUIPMENT_MANAGER, Role.ADMIN);

            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.INFO,
                    actionUrl,
                    relatedEntity
            );

            System.out.println("Equipment type update notification sent successfully");
        } catch (Exception e) {
            System.err.println("Failed to send equipment type update notification: " + e.getMessage());
        }

        return EquipmentTypeDTO.fromEntity(updatedEntity);
    }

    public void deleteEquipmentType(UUID id) {
        EquipmentType equipmentType = equipmentTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment type not found with id: " + id));

        if (!equipmentType.getEquipments().isEmpty()) {
            int equipmentCount = equipmentType.getEquipments().size();
            throw ResourceInUseException.create(
                "equipment type", 
                equipmentType.getName(), 
                equipmentCount, 
                "equipment unit"
            );
        }

        // Send notifications
        try {
            String notificationTitle = "Equipment Type Deleted";
            String notificationMessage = "Equipment type '" + equipmentType.getName() + "' has been deleted. " +
                    (equipmentType.getDescription() != null ? equipmentType.getDescription() : "");
            String actionUrl = "/equipment/type-management";
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

            System.out.println("Equipment type deletion notification sent successfully");
        } catch (Exception e) {
            System.err.println("Failed to send equipment type deletion notification: " + e.getMessage());
        }

        equipmentTypeRepository.delete(equipmentType);
    }

    public boolean existsByName(String name) {
        return equipmentTypeRepository.existsByName(name);
    }

    /**
     * Add supported work types to an equipment type
     */
    @Transactional
    public EquipmentTypeDTO addSupportedWorkTypes(UUID equipmentTypeId, List<UUID> workTypeIds) {
        EquipmentType equipmentType = equipmentTypeRepository.findById(equipmentTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment type not found with id: " + equipmentTypeId));

        for (UUID workTypeId : workTypeIds) {
            WorkType workType = workTypeRepository.findById(workTypeId)
                    .orElseThrow(() -> new ResourceNotFoundException("Work type not found with id: " + workTypeId));

            if (!equipmentType.getSupportedWorkTypes().contains(workType)) {
                equipmentType.getSupportedWorkTypes().add(workType);
            }
        }

        EquipmentType savedEntity = equipmentTypeRepository.save(equipmentType);

        // Send notifications
        try {
            String workTypeNames = workTypeIds.stream()
                    .map(id -> {
                        try {
                            return workTypeRepository.findById(id).map(wt -> wt.getName()).orElse("Unknown");
                        } catch (Exception e) {
                            return "Unknown";
                        }
                    })
                    .collect(Collectors.joining(", "));

            String notificationTitle = "Work Types Added to Equipment Type";
            String notificationMessage = "Work types (" + workTypeNames + ") added to equipment type '" +
                    equipmentType.getName() + "'";
            String actionUrl = "/equipment/type-management";
            String relatedEntity = equipmentType.getId().toString();

            List<Role> targetRoles = Arrays.asList(Role.EQUIPMENT_MANAGER, Role.ADMIN);

            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.INFO,
                    actionUrl,
                    relatedEntity
            );

            System.out.println("Work types addition notification sent successfully");
        } catch (Exception e) {
            System.err.println("Failed to send work types addition notification: " + e.getMessage());
        }

        return EquipmentTypeDTO.fromEntity(savedEntity);
    }

    /**
     * Remove supported work types from an equipment type
     */
    @Transactional
    public EquipmentTypeDTO removeSupportedWorkTypes(UUID equipmentTypeId, List<UUID> workTypeIds) {
        EquipmentType equipmentType = equipmentTypeRepository.findById(equipmentTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment type not found with id: " + equipmentTypeId));

        for (UUID workTypeId : workTypeIds) {
            equipmentType.getSupportedWorkTypes().removeIf(wt -> wt.getId().equals(workTypeId));
        }

        EquipmentType savedEntity = equipmentTypeRepository.save(equipmentType);

        // Send notifications
        try {
            String notificationTitle = "Work Types Removed from Equipment Type";
            String notificationMessage = "Work types have been removed from equipment type '" +
                    equipmentType.getName() + "'";
            String actionUrl = "/equipment/type-management";
            String relatedEntity = equipmentType.getId().toString();

            List<Role> targetRoles = Arrays.asList(Role.EQUIPMENT_MANAGER, Role.ADMIN);

            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.INFO,
                    actionUrl,
                    relatedEntity
            );

            System.out.println("Work types removal notification sent successfully");
        } catch (Exception e) {
            System.err.println("Failed to send work types removal notification: " + e.getMessage());
        }

        return EquipmentTypeDTO.fromEntity(savedEntity);
    }

    /**
     * Set supported work types for an equipment type (replaces existing)
     */
    @Transactional
    public EquipmentTypeDTO setSupportedWorkTypes(UUID equipmentTypeId, List<UUID> workTypeIds) {
        EquipmentType equipmentType = equipmentTypeRepository.findById(equipmentTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment type not found with id: " + equipmentTypeId));

        // Clear existing work types
        equipmentType.getSupportedWorkTypes().clear();

        // Add new work types
        for (UUID workTypeId : workTypeIds) {
            WorkType workType = workTypeRepository.findById(workTypeId)
                    .orElseThrow(() -> new ResourceNotFoundException("Work type not found with id: " + workTypeId));
            equipmentType.getSupportedWorkTypes().add(workType);
        }

        EquipmentType savedEntity = equipmentTypeRepository.save(equipmentType);

        // Send notifications
        try {
            String notificationTitle = "Work Types Updated for Equipment Type";
            String notificationMessage = "Supported work types have been updated for equipment type '" +
                    equipmentType.getName() + "'";
            String actionUrl = "/equipment/type-management";
            String relatedEntity = equipmentType.getId().toString();

            List<Role> targetRoles = Arrays.asList(Role.EQUIPMENT_MANAGER, Role.ADMIN);

            notificationService.sendNotificationToUsersByRoles(
                    targetRoles,
                    notificationTitle,
                    notificationMessage,
                    NotificationType.INFO,
                    actionUrl,
                    relatedEntity
            );

            System.out.println("Work types update notification sent successfully");
        } catch (Exception e) {
            System.err.println("Failed to send work types update notification: " + e.getMessage());
        }

        return EquipmentTypeDTO.fromEntity(savedEntity);
    }

    /**
     * Get supported work types for an equipment type
     */
    public List<WorkTypeDTO> getSupportedWorkTypes(UUID equipmentTypeId) {
        EquipmentType equipmentType = equipmentTypeRepository.findById(equipmentTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment type not found with id: " + equipmentTypeId));

        return equipmentType.getSupportedWorkTypes().stream()
                .filter(WorkType::isActive)
                .map(workType -> {
                    WorkTypeDTO dto = new WorkTypeDTO();
                    dto.setId(workType.getId());
                    dto.setName(workType.getName());
                    dto.setDescription(workType.getDescription());
                    dto.setActive(workType.isActive());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    /**
     * Create job position immediately when equipment type is created
     * This method is called directly in the same transaction
     */


    private void createJobPositionForEquipmentType(EquipmentType equipmentType) {
        String requiredPositionName = equipmentType.getRequiredDriverPosition();

        log.info("Creating job position: {} for equipment type: {}",
                requiredPositionName, equipmentType.getName());

        // Check if the position already exists
        Optional<JobPosition> existingPosition = jobPositionRepository.findAll()
                .stream()
                .filter(jp -> requiredPositionName.equals(jp.getPositionName()))
                .findFirst();

        if (existingPosition.isPresent()) {
            log.info("Job position already exists: {}", requiredPositionName);
            return;
        }

        // Find the Logistics department
        Optional<Department> logisticsDept = departmentRepository.findByName("Logistics");

        if (logisticsDept.isEmpty()) {
            log.error("Logistics department not found. Cannot create job position for: {}", equipmentType.getName());
            return;
        }

        // Calculate base salary
        Double baseSalary = calculateBaseSalary(equipmentType);

        // Define standard working hours
        LocalTime defaultStartTime = LocalTime.of(9, 0); // 09:00:00
        LocalTime defaultEndTime = LocalTime.of(17, 0);  // 17:00:00

        // Create the job position with smart defaults for MONTHLY contract
        JobPosition driverPosition = new JobPosition();
        driverPosition.setPositionName(requiredPositionName);
        driverPosition.setDepartment(logisticsDept.get());
        driverPosition.setHead("Operations Manager");
        driverPosition.setProbationPeriod(90); // 90 days probation
        driverPosition.setContractType(JobPosition.ContractType.MONTHLY);
        driverPosition.setExperienceLevel(determineExperienceLevel(equipmentType));
        driverPosition.setActive(true);

        // ======================================
        // MONTHLY CONTRACT FIELDS
        // ======================================
        driverPosition.setMonthlyBaseSalary(baseSalary);
        driverPosition.setWorkingHours(8);
        driverPosition.setShifts("Day Shift");
        driverPosition.setVacations("21 days annual leave");
        // Added Start and End Time
        driverPosition.setStartTime(defaultStartTime);
        driverPosition.setEndTime(defaultEndTime);

        // ======================================
        // MONTHLY DEDUCTION FIELDS (Defaults to 0 or 0 minutes/count)
        // ======================================
        driverPosition.setAbsentDeduction(BigDecimal.ZERO);
        driverPosition.setLateDeduction(BigDecimal.ZERO);
        driverPosition.setLateForgivenessMinutes(0);
        driverPosition.setLateForgivenessCountPerQuarter(0);
        driverPosition.setLeaveDeduction(BigDecimal.ZERO);

        // Leave HOURLY and DAILY fields as null (default)

        JobPosition savedPosition = jobPositionRepository.save(driverPosition);

        log.info("✅ Successfully created job position: {} with ID: {} for equipment type: {}",
                requiredPositionName, savedPosition.getId(), equipmentType.getName());
    }
    /**
     * Update job position when equipment type is renamed
     * This handles the case where an equipment type name is changed
     */
    @Transactional
    public void handleEquipmentTypeRenamed(String oldName, EquipmentType updatedEquipmentType) {
        String oldPositionName = oldName + " Driver";
        String newPositionName = updatedEquipmentType.getRequiredDriverPosition();

        // Find the old position
        Optional<JobPosition> existingPosition = findExistingPosition(oldPositionName);

        if (existingPosition.isPresent()) {
            JobPosition position = existingPosition.get();

            // Check if new position name already exists
            if (findExistingPosition(newPositionName).isEmpty()) {
                // Update the position name
                position.setPositionName(newPositionName);
                // Update salary and experience level based on new name
                Double newSalary = calculateBaseSalary(updatedEquipmentType);
                position.setBaseSalary(newSalary);
                position.setMonthlyBaseSalary(newSalary); // Update monthly salary as well
                position.setExperienceLevel(determineExperienceLevel(updatedEquipmentType));

                jobPositionRepository.save(position);

                log.info("Updated job position from '{}' to '{}' for equipment type change",
                        oldPositionName, newPositionName);
            } else {
                log.warn("Cannot rename position from '{}' to '{}' - new name already exists",
                        oldPositionName, newPositionName);
            }
        } else {
            // Old position doesn't exist, create new one
            createJobPositionForEquipmentType(updatedEquipmentType);
        }
    }

    /**
     * Check if a job position with the given name already exists
     */
    private Optional<JobPosition> findExistingPosition(String positionName) {
        return jobPositionRepository.findAll()
                .stream()
                .filter(jp -> positionName.equals(jp.getPositionName()))
                .findFirst();
    }

    /**
     * Calculate base salary based on equipment type complexity
     */
    private Double calculateBaseSalary(EquipmentType equipmentType) {
        String typeName = equipmentType.getName().toLowerCase();

        // Crane operators - highest complexity and risk
        if (typeName.contains("crane")) {
            return 40000.0;
        }
        // Heavy construction equipment - high complexity
        else if (typeName.contains("excavator") || typeName.contains("bulldozer") ||
                typeName.contains("loader") || typeName.contains("grader")) {
            return 35000.0;
        }
        // Transport vehicles - medium complexity
        else if (typeName.contains("truck") || typeName.contains("trailer") ||
                typeName.contains("tanker")) {
            return 30000.0;
        }
        // Specialized equipment - medium complexity
        else if (typeName.contains("compactor") || typeName.contains("roller") ||
                typeName.contains("paver")) {
            return 32000.0;
        }
        // General equipment - base salary
        else {
            return 25000.0;
        }
    }

    /**
     * Determine experience level based on equipment type complexity
     */
    private String determineExperienceLevel(EquipmentType equipmentType) {
        String typeName = equipmentType.getName().toLowerCase();

        // High-risk, complex equipment requires senior experience
        if (typeName.contains("crane") || typeName.contains("tower")) {
            return "Senior Level";
        }
        // Heavy construction equipment requires mid-level experience
        else if (typeName.contains("excavator") || typeName.contains("bulldozer") ||
                typeName.contains("loader") || typeName.contains("grader")) {
            return "Mid Level";
        }
        // Transport and general equipment - entry level acceptable
        else {
            return "Entry Level";
        }
    }

    /**
     * Delete a job position if it has no assigned employees
     */
    private void deleteJobPositionIfUnused(String positionName) {
        Optional<JobPosition> positionOpt = findExistingPosition(positionName);
        if (positionOpt.isPresent()) {
            JobPosition position = positionOpt.get();
            if (position.getEmployees().isEmpty()) {
                log.info("Deleting unused job position: {}", positionName);
                jobPositionRepository.delete(position);
            } else {
                log.warn("Cannot delete job position '{}' as it has {} assigned employees",
                        positionName, position.getEmployees().size());
            }
        } else {
            log.warn("Job position '{}' not found for deletion", positionName);
        }
    }
}