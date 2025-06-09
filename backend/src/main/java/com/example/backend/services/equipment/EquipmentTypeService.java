package com.example.backend.services.equipment;

import com.example.backend.dto.equipment.EquipmentTypeDTO;
import com.example.backend.dto.equipment.WorkTypeDTO;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.equipment.EquipmentType;
import com.example.backend.models.equipment.WorkType;
import com.example.backend.models.hr.Department;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.repositories.equipment.EquipmentTypeRepository;
import com.example.backend.repositories.equipment.WorkTypeRepository;
import com.example.backend.repositories.hr.DepartmentRepository;
import com.example.backend.repositories.hr.JobPositionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
        if (equipmentTypeRepository.existsByName(dto.getName())) {
            throw new IllegalArgumentException("Equipment type with name '" + dto.getName() + "' already exists");
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

        return EquipmentTypeDTO.fromEntity(savedEntity);
    }

    @Transactional
    public EquipmentTypeDTO updateEquipmentType(UUID id, EquipmentTypeDTO dto) {
        // Check if the type exists
        EquipmentType existingType = equipmentTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment type not found with id: " + id));

        // Check if the name is already used by another type
        if (!existingType.getName().equals(dto.getName()) &&
                equipmentTypeRepository.existsByName(dto.getName())) {
            throw new IllegalArgumentException("Equipment type with name '" + dto.getName() + "' already exists");
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
            // Equipment type is no longer drivable - optionally handle job position removal
            log.info("Equipment type '{}' is no longer drivable - consider removing job position", dto.getName());
            // Note: We don't automatically delete job positions as they might have employees
        }

        return EquipmentTypeDTO.fromEntity(updatedEntity);
    }

    public void deleteEquipmentType(UUID id) {
        EquipmentType equipmentType = equipmentTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment type not found with id: " + id));

        if (!equipmentType.getEquipments().isEmpty()) {
            throw new IllegalStateException("Cannot delete equipment type that is used by equipment");
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

        // Create the job position with smart defaults
        JobPosition driverPosition = new JobPosition();
        driverPosition.setPositionName(requiredPositionName);
        driverPosition.setDepartment(logisticsDept.get());
        driverPosition.setHead("Operations Manager");
        driverPosition.setBaseSalary(baseSalary);
        driverPosition.setProbationPeriod(90); // 90 days probation
        driverPosition.setContractType(JobPosition.ContractType.MONTHLY);
        driverPosition.setExperienceLevel(determineExperienceLevel(equipmentType));
        driverPosition.setActive(true);
        
        // Monthly contract specific fields
        driverPosition.setMonthlyBaseSalary(baseSalary);
        driverPosition.setWorkingHours(8);
        driverPosition.setShifts("Day Shift");
        driverPosition.setVacations("21 days annual leave");

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
}