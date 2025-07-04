package com.example.backend.config;

import com.example.backend.authentication.AuthenticationService;
import com.example.backend.authentication.RegisterRequest;
import com.example.backend.models.user.Role;
import com.example.backend.models.hr.Department;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.equipment.EquipmentType;
import com.example.backend.repositories.hr.DepartmentRepository;
import com.example.backend.repositories.hr.JobPositionRepository;
import com.example.backend.repositories.equipment.EquipmentTypeRepository;
import com.example.backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements ApplicationRunner, CommandLineRunner {

    private final DepartmentRepository departmentRepository;
    private final JobPositionRepository jobPositionRepository;
    private final EquipmentTypeRepository equipmentTypeRepository;
    private final UserRepository userRepository;
    private final AuthenticationService authenticationService;

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws Exception {
        log.info("Starting application data initialization...");

        createBasicDepartments();
        createBasicDriverPosition();
        createJobPositionsForExistingEquipmentTypes(); // Re-enable this for existing equipment types

        log.info("Application data initialization completed successfully.");
    }

    @Override
    public void run(String... args) {
        // Check if admin user exists
        if (!userRepository.existsByUsername("admin")) {
            // Create admin user
            RegisterRequest adminRequest = RegisterRequest.builder()
                    .firstName("Admin")
                    .lastName("User")
                    .username("admin")
                    .password("admin123") // You should change this password after first login
                    .role(Role.ADMIN)
                    .build();

            authenticationService.register(adminRequest);
            System.out.println("Admin user created successfully");
        }
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
                        .monthlyBaseSalary(25000.0) // Example base salary
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
                        .probationPeriod(90)
                        .contractType(JobPosition.ContractType.MONTHLY)
                        .experienceLevel(getDummyExperienceLevel(equipmentType))
                        .active(true)

                        // MONTHLY contract specific fields
                        .monthlyBaseSalary(baseSalary)
                        .workingDaysPerMonth(22)
                        .workingHours(8)
                        .vacations("21 days annual leave")

                        .build();

                // Set equipment-specific working hours
                setWorkingHoursForEquipmentType(equipmentDriverPosition, equipmentType);

                JobPosition savedPosition = jobPositionRepository.save(equipmentDriverPosition);
                log.info("Created job position: {} for equipment type: {} with working hours {}-{}",
                        requiredPositionName,
                        equipmentType.getName(),
                        savedPosition.getStartTime(),
                        savedPosition.getEndTime());
            } else {
                log.warn("Logistics department not found, could not create position for equipment type: {}",
                        equipmentType.getName());
            }
        } else {
            log.debug("Job position already exists: {}", requiredPositionName);
        }
    }

    // Helper method to determine appropriate working hours based on equipment type
    private void setWorkingHoursForEquipmentType(JobPosition jobPosition, EquipmentType equipmentType) {
        String equipmentName = equipmentType.getName().toLowerCase();

        if (equipmentName.contains("truck") || equipmentName.contains("delivery")) {
            // Early morning shift for delivery trucks
            jobPosition.setStartTime(LocalTime.of(6, 0));  // 6:00 AM
            jobPosition.setEndTime(LocalTime.of(14, 0));   // 2:00 PM
            jobPosition.setShifts("Early Morning Shift");
        } else if (equipmentName.contains("forklift") || equipmentName.contains("warehouse")) {
            // Standard warehouse hours
            jobPosition.setStartTime(LocalTime.of(8, 0));  // 8:00 AM
            jobPosition.setEndTime(LocalTime.of(16, 0));   // 4:00 PM
            jobPosition.setShifts("Day Shift");
        } else if (equipmentName.contains("crane") || equipmentName.contains("heavy")) {
            // Construction/heavy equipment hours
            jobPosition.setStartTime(LocalTime.of(7, 0));  // 7:00 AM
            jobPosition.setEndTime(LocalTime.of(15, 0));   // 3:00 PM
            jobPosition.setShifts("Construction Shift");
        } else {
            // Default driver hours
            jobPosition.setStartTime(LocalTime.of(7, 0));  // 7:00 AM
            jobPosition.setEndTime(LocalTime.of(15, 0));   // 3:00 PM
            jobPosition.setShifts("Day Shift");
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