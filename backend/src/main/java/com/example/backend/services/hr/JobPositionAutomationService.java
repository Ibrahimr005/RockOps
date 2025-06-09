package com.example.backend.services.hr;

import com.example.backend.models.equipment.EquipmentType;
import com.example.backend.models.hr.Department;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.repositories.hr.DepartmentRepository;
import com.example.backend.repositories.hr.JobPositionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Service responsible for automatically creating job positions when equipment types are created
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class JobPositionAutomationService {

    private final JobPositionRepository jobPositionRepository;
    private final DepartmentRepository departmentRepository;

    /**
     * Automatically create a job position for a newly created equipment type
     * This method is called immediately when a new EquipmentType is created
     */
    @Transactional
    public JobPosition createDriverPositionForEquipmentType(EquipmentType equipmentType) {
        String requiredPositionName = equipmentType.getRequiredDriverPosition();
        
        log.info("Creating job position: {} for equipment type: {}", 
            requiredPositionName, equipmentType.getName());

        // Check if the position already exists to avoid duplicates
        Optional<JobPosition> existingPosition = findExistingPosition(requiredPositionName);
        
        if (existingPosition.isPresent()) {
            log.info("Job position already exists: {}", requiredPositionName);
            return existingPosition.get();
        }

        // Find the Logistics department (default for driver positions)
        Department logisticsDept = departmentRepository.findByName("Logistics")
            .orElseThrow(() -> new RuntimeException(
                "Logistics department not found. Please ensure basic departments are created."));

        // Calculate base salary
        Double baseSalary = calculateBaseSalary(equipmentType);

        // Create the new job position
        JobPosition driverPosition = JobPosition.builder()
            .positionName(requiredPositionName)
            .department(logisticsDept)
            .head("Operations Manager")
            .baseSalary(baseSalary)
            .probationPeriod(90) // 90 days probation
            .contractType(JobPosition.ContractType.MONTHLY)
            .experienceLevel(determineExperienceLevel(equipmentType))
            .monthlyBaseSalary(baseSalary)
            .shifts("Day Shift")
            .workingHours(8)
            .vacations("21 days annual leave")
            .active(true)
            .build();

        JobPosition savedPosition = jobPositionRepository.save(driverPosition);
        
        log.info("Successfully created job position: {} with ID: {}", 
            requiredPositionName, savedPosition.getId());
        
        return savedPosition;
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
     * Calculate appropriate base salary based on equipment type complexity
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
     * Determine appropriate experience level based on equipment type complexity
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
                
                // Calculate new base salary
                Double newBaseSalary = calculateBaseSalary(updatedEquipmentType);
                
                // Update salary and experience level based on new name
                position.setBaseSalary(newBaseSalary);
                position.setMonthlyBaseSalary(newBaseSalary);
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
            createDriverPositionForEquipmentType(updatedEquipmentType);
        }
    }
}