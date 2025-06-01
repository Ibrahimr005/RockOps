package com.example.backend.config;

import com.example.backend.models.hr.Department;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.equipment.EquipmentType;
import com.example.backend.repositories.hr.DepartmentRepository;
import com.example.backend.repositories.hr.JobPositionRepository;
import com.example.backend.repositories.equipment.EquipmentTypeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements ApplicationRunner {

    private final DepartmentRepository departmentRepository;
    private final JobPositionRepository jobPositionRepository;
    private final EquipmentTypeRepository equipmentTypeRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws Exception {
        log.info("Starting application data initialization...");

        createBasicDepartments();
        createBasicDriverPosition();
        createJobPositionsForExistingEquipmentTypes(); // Re-enable this for existing equipment types

        log.info("Application data initialization completed successfully.");
    }

    /**
     * Create job positions for existing equipment types that don't have corresponding driver positions
     * This runs ONLY on application startup for existing equipment types
     */
    private void createJobPositionsForExistingEquipmentTypes() {
        log.info("Creating job positions for existing equipment types...");

        List<EquipmentType> equipmentTypes = equipmentTypeRepository.findAll();

        for (EquipmentType equipmentType : equipmentTypes) {
            createJobPositionForEquipmentType(equipmentType);
        }
    }

    /**
     * Create basic departments if they don't already exist
     */
    private void createBasicDepartments() {
        log.info("Creating basic departments...");

        List<String> basicDepartments = Arrays.asList(
                "HR", "Operations", "Finance", "Logistics", "Maintenance"
        );

        for (String departmentName : basicDepartments) {
            if (!departmentRepository.existsByName(departmentName)) {
                Department department = Department.builder()
                        .name(departmentName)
                        .description("Automatically created " + departmentName + " department")
                        .build();

                departmentRepository.save(department);
                log.info("Created department: {}", departmentName);
            } else {
                log.debug("Department already exists: {}", departmentName);
            }
        }
    }

    /**
     * Create a basic "Driver" job position in the Logistics department
     */
    private void createBasicDriverPosition() {
        log.info("Creating basic Driver position...");

        // Check if a general "Driver" position already exists
        Optional<JobPosition> existingDriver = jobPositionRepository.findAll()
                .stream()
                .filter(jp -> "Driver".equals(jp.getPositionName()))
                .findFirst();

        if (existingDriver.isEmpty()) {
            // Find the Logistics department
            Optional<Department> logisticsDept = departmentRepository.findByName("Logistics");

            if (logisticsDept.isPresent()) {
                JobPosition driverPosition = JobPosition.builder()
                        .positionName("Driver")
                        .department(logisticsDept.get())
                        .head("Operations Manager")
                        .baseSalary(25000.0) // Example base salary
                        .probationPeriod(90) // 90 days probation
                        .contractType(JobPosition.ContractType.MONTHLY)
                        .experienceLevel("Entry Level")
                        .monthlyBaseSalary(25000.0)
                        .shifts("Day Shift")
                        .workingHours(8)
                        .vacations("21 days annual leave")
                        .active(true)
                        .build();

                jobPositionRepository.save(driverPosition);
                log.info("Created basic Driver position in Logistics department");
            } else {
                log.warn("Logistics department not found, could not create Driver position");
            }
        } else {
            log.debug("Basic Driver position already exists");
        }
    }

    /**
     * Create a job position for a specific equipment type (called in real-time)
     */
    @Transactional
    public void createJobPositionForEquipmentType(EquipmentType equipmentType) {
        String requiredPositionName = equipmentType.getRequiredDriverPosition();

        // Check if the position already exists
        Optional<JobPosition> existingPosition = jobPositionRepository.findAll()
                .stream()
                .filter(jp -> requiredPositionName.equals(jp.getPositionName()))
                .findFirst();

        if (existingPosition.isEmpty()) {
            // Find the Logistics department (default for driver positions)
            Optional<Department> logisticsDept = departmentRepository.findByName("Logistics");

            if (logisticsDept.isPresent()) {
                Double baseSalary = getDummyBaseSalary(equipmentType);
                JobPosition equipmentDriverPosition = JobPosition.builder()
                        .positionName(requiredPositionName)
                        .department(logisticsDept.get())
                        .head("Operations Manager")
                        .baseSalary(baseSalary)
                        .probationPeriod(90) // 90 days probation
                        .contractType(JobPosition.ContractType.MONTHLY)
                        .experienceLevel(getDummyExperienceLevel(equipmentType))
                        .monthlyBaseSalary(baseSalary)
                        .shifts("Day Shift")
                        .workingHours(8)
                        .vacations("21 days annual leave")
                        .active(true)
                        .build();

                jobPositionRepository.save(equipmentDriverPosition);
                log.info("Created job position: {} for equipment type: {}",
                        requiredPositionName, equipmentType.getName());
            } else {
                log.warn("Logistics department not found, could not create position for equipment type: {}",
                        equipmentType.getName());
            }
        } else {
            log.debug("Job position already exists: {}", requiredPositionName);
        }
    }

    /**
     * Generate dummy base salary based on equipment type
     */
    private Double getDummyBaseSalary(EquipmentType equipmentType) {
        String typeName = equipmentType.getName().toLowerCase();

        // Higher salaries for more complex equipment
        if (typeName.contains("crane") || typeName.contains("excavator")) {
            return 35000.0; // Higher for specialized equipment
        } else if (typeName.contains("truck") || typeName.contains("bulldozer")) {
            return 30000.0; // Medium for heavy equipment
        } else {
            return 25000.0; // Base salary for general equipment
        }
    }

    /**
     * Generate dummy experience level based on equipment type
     */
    private String getDummyExperienceLevel(EquipmentType equipmentType) {
        String typeName = equipmentType.getName().toLowerCase();

        // Higher experience requirements for complex equipment
        if (typeName.contains("crane")) {
            return "Senior Level"; // Cranes require more experience
        } else if (typeName.contains("excavator") || typeName.contains("bulldozer")) {
            return "Mid Level"; // Heavy equipment requires some experience
        } else {
            return "Entry Level"; // General equipment
        }
    }
}