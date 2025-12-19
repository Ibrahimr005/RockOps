package com.example.backend.services.hr;

import com.example.backend.dto.hr.employee.EmployeeSummaryDTO;
import com.example.backend.dto.hr.jobposition.JobPositionDTO;
import com.example.backend.dto.hr.jobposition.JobPositionDetailsDTO;
import com.example.backend.dto.hr.jobposition.PositionAnalyticsDTO;
import com.example.backend.dto.hr.promotions.PositionPromotionsDTO;
import com.example.backend.dto.hr.promotions.PromotionStatsDTO;
import com.example.backend.dto.hr.promotions.PromotionSummaryDTO;
import com.example.backend.models.hr.Department;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.hr.PromotionRequest;
import com.example.backend.models.notification.NotificationType;
import com.example.backend.repositories.hr.DepartmentRepository;
import com.example.backend.repositories.hr.JobPositionRepository;
import com.example.backend.repositories.hr.PromotionRequestRepository;
import com.example.backend.repositories.site.SiteRepository;
import com.example.backend.services.notification.NotificationService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class JobPositionService {
    private static final Logger logger = LoggerFactory.getLogger(JobPositionService.class);

    @Autowired
    private JobPositionRepository jobPositionRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private SiteRepository siteRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private PromotionRequestRepository promotionRequestRepository;


    /**
     * Convert JobPosition entity to JobPositionDTO
     */
    private JobPositionDTO convertToDTO(JobPosition jobPosition) {
        if (jobPosition == null) {
            return null;
        }

        JobPositionDTO dto = new JobPositionDTO();
        dto.setId(jobPosition.getId());
        dto.setPositionName(jobPosition.getPositionName());
        dto.setDepartment(jobPosition.getDepartment() != null ? jobPosition.getDepartment().getName() : null);
        dto.setHead(jobPosition.getHead());
        dto.setBaseSalary(jobPosition.getBaseSalary());
        dto.setProbationPeriod(jobPosition.getProbationPeriod());
        dto.setContractType(jobPosition.getContractType());
        dto.setExperienceLevel(jobPosition.getExperienceLevel());
        dto.setActive(jobPosition.getActive());

        // Contract type specific fields
        switch (jobPosition.getContractType()) {
            case HOURLY:
                dto.setWorkingDaysPerWeek(jobPosition.getWorkingDaysPerWeek());
                dto.setHoursPerShift(jobPosition.getHoursPerShift());
                dto.setHourlyRate(jobPosition.getHourlyRate());
                dto.setOvertimeMultiplier(jobPosition.getOvertimeMultiplier());
                dto.setTrackBreaks(jobPosition.getTrackBreaks());
                dto.setBreakDurationMinutes(jobPosition.getBreakDurationMinutes());
                break;
            case DAILY:
                dto.setDailyRate(jobPosition.getDailyRate());
                dto.setWorkingDaysPerMonth(jobPosition.getWorkingDaysPerMonth());
                dto.setIncludesWeekends(jobPosition.getIncludesWeekends());
                break;
            case MONTHLY:
                dto.setMonthlyBaseSalary(jobPosition.getMonthlyBaseSalary());
                dto.setWorkingDaysPerMonth(jobPosition.getWorkingDaysPerMonth());
                dto.setShifts(jobPosition.getShifts());
                dto.setWorkingHours(jobPosition.getWorkingHours());
                dto.setVacations(jobPosition.getVacations());

                // Set time fields for MONTHLY contracts
                dto.setStartTime(jobPosition.getStartTime());
                dto.setEndTime(jobPosition.getEndTime());
                break;
        }

        // Calculate derived fields
        dto.calculateFields();

        // Hierarchy fields
        dto.setParentJobPositionId(jobPosition.getParentJobPosition() != null ?
                jobPosition.getParentJobPosition().getId() : null);
        dto.setParentJobPositionName(jobPosition.getParentJobPosition() != null ?
                jobPosition.getParentJobPosition().getPositionName() : null);

        List<UUID> childIds = jobPosition.getChildPositions().stream()
                .map(JobPosition::getId)
                .collect(Collectors.toList());
        dto.setChildPositionIds(childIds);

        List<String> childNames = jobPosition.getChildPositions().stream()
                .map(JobPosition::getPositionName)
                .collect(Collectors.toList());
        dto.setChildPositionNames(childNames);

        dto.setIsRootPosition(jobPosition.isRootPosition());
        dto.setHierarchyLevel(jobPosition.getHierarchyLevel());
        dto.setHierarchyPath(jobPosition.getHierarchyPath());

        return dto;
    }

    /**
     * Convert list of JobPosition entities to list of JobPositionDTOs
     */
    private List<JobPositionDTO> convertToDTOList(List<JobPosition> jobPositions) {
        if (jobPositions == null) {
            return null;
        }

        return jobPositions.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Create a new job position from DTO
     */
    /**
     * Create a new job position from DTO
     */
    @Transactional
    public JobPositionDTO createJobPosition(JobPositionDTO jobPositionDTO) {
        try {
            logger.info("Creating job position from DTO: {}", jobPositionDTO.getPositionName());

            // Validate required fields
            validateJobPositionDTO(jobPositionDTO, null);

            // Validate for duplicates based on position name + level combination
            if (jobPositionRepository.existsByPositionNameAndExperienceLevelIgnoreCase(
                    jobPositionDTO.getPositionName().trim(),
                    jobPositionDTO.getExperienceLevel())) {
                String fullPositionName = buildFullPositionName(jobPositionDTO.getPositionName(), jobPositionDTO.getExperienceLevel());
                throw new IllegalArgumentException(
                        "A position with the name '" + fullPositionName + "' already exists. " +
                                "Position names combined with their experience level must be unique."
                );
            }

            // Find department
            Department department = null;
            if (jobPositionDTO.getDepartment() != null && !jobPositionDTO.getDepartment().trim().isEmpty()) {
                department = departmentRepository.findByName(jobPositionDTO.getDepartment().trim())
                        .orElseThrow(() -> new EntityNotFoundException("Department not found: " + jobPositionDTO.getDepartment()));
            }

            // Build the job position entity
            JobPosition jobPosition = JobPosition.builder()
                    .positionName(jobPositionDTO.getPositionName().trim())
                    .head(jobPositionDTO.getHead())
                    .department(department)
                    .probationPeriod(jobPositionDTO.getProbationPeriod() != null ? jobPositionDTO.getProbationPeriod() : 90)
                    .contractType(jobPositionDTO.getContractType())
                    .experienceLevel(jobPositionDTO.getExperienceLevel())
                    .baseSalary(jobPositionDTO.getBaseSalary())
                    .active(jobPositionDTO.getActive() != null ? jobPositionDTO.getActive() : true)
                    .build();

            // Handle parent job position if provided
            if (jobPositionDTO.getParentJobPositionId() != null) {
                JobPosition parentPosition = jobPositionRepository.findById(jobPositionDTO.getParentJobPositionId())
                        .orElseThrow(() -> new EntityNotFoundException("Parent job position not found with id: " + jobPositionDTO.getParentJobPositionId()));
                jobPosition.setParentJobPosition(parentPosition);
            }

            // Set contract type specific fields
            setContractTypeFields(jobPosition, jobPositionDTO);

            // Save the job position
            JobPosition savedJobPosition = jobPositionRepository.save(jobPosition);

            // Send notification
            String departmentName = department != null ? department.getName() : "General";
            String fullPositionName = getFullPositionName(savedJobPosition);

            notificationService.sendNotificationToHRUsers(
                    "New Job Position Created",
                    "Job position '" + fullPositionName + "' has been created in " + departmentName + " department",
                    NotificationType.SUCCESS,
                    "/hr/positions/" + savedJobPosition.getId(),
                    "new-job-position-" + savedJobPosition.getId()
            );

            // Check if it's a leadership position
            if (isLeadershipPosition(savedJobPosition.getPositionName())) {
                notificationService.sendNotificationToHRUsers(
                        "Leadership Position Created",
                        "🎯 Leadership position '" + fullPositionName + "' created in " + departmentName,
                        NotificationType.INFO,
                        "/hr/positions/" + savedJobPosition.getId(),
                        "leadership-position-" + savedJobPosition.getId()
                );
            }

            // Check if it's a driver position
            if (savedJobPosition.getPositionName().toLowerCase().contains("driver")) {
                notificationService.sendNotificationToHRUsers(
                        "Driver Position Available",
                        "New driver position '" + fullPositionName + "' is now available for recruitment",
                        NotificationType.INFO,
                        "/hr/positions/" + savedJobPosition.getId(),
                        "driver-position-" + savedJobPosition.getId()
                );
            }

            logger.info("Successfully created job position: {} with ID: {}", fullPositionName, savedJobPosition.getId());

            // Convert back to DTO and return
            return convertToDTO(savedJobPosition);

        } catch (IllegalArgumentException | EntityNotFoundException e) {
            logger.warn("Validation error creating job position: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("Error creating job position", e);

            notificationService.sendNotificationToHRUsers(
                    "Job Position Creation Failed",
                    "Failed to create job position: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/hr/positions/",
                    "job-position-error-" + System.currentTimeMillis()
            );

            throw new RuntimeException("Failed to create job position: " + e.getMessage(), e);
        }
    }

    /**
     * Set contract type specific fields for CREATE operation
     */
    private void setContractTypeFields(JobPosition jobPosition, JobPositionDTO dto) {
        if (dto.getContractType() == null) return;

        switch (dto.getContractType()) {
            case HOURLY:
                jobPosition.setWorkingDaysPerWeek(dto.getWorkingDaysPerWeek() != null ? dto.getWorkingDaysPerWeek() : 5);
                jobPosition.setHoursPerShift(dto.getHoursPerShift() != null ? dto.getHoursPerShift() : 8);
                jobPosition.setHourlyRate(dto.getHourlyRate());
                jobPosition.setOvertimeMultiplier(dto.getOvertimeMultiplier() != null ? dto.getOvertimeMultiplier() : 1.5);
                jobPosition.setTrackBreaks(dto.getTrackBreaks() != null ? dto.getTrackBreaks() : false);
                jobPosition.setBreakDurationMinutes(dto.getBreakDurationMinutes() != null ? dto.getBreakDurationMinutes() : 30);
                break;

            case DAILY:
                jobPosition.setDailyRate(dto.getDailyRate());
                jobPosition.setWorkingDaysPerMonth(dto.getWorkingDaysPerMonth() != null ? dto.getWorkingDaysPerMonth() : 22);
                jobPosition.setIncludesWeekends(dto.getIncludesWeekends() != null ? dto.getIncludesWeekends() : false);
                break;

            case MONTHLY:
                jobPosition.setMonthlyBaseSalary(dto.getMonthlyBaseSalary());
                jobPosition.setShifts(dto.getShifts() != null ? dto.getShifts() : "Day Shift");
                jobPosition.setWorkingHours(dto.getWorkingHours() != null ? dto.getWorkingHours() : 8);
                jobPosition.setVacations(dto.getVacations() != null ? dto.getVacations() : "21 days annual leave");
                jobPosition.setStartTime(dto.getStartTime());
                jobPosition.setEndTime(dto.getEndTime());

                // NEW: Set monthly deduction fields
                jobPosition.setAbsentDeduction(dto.getAbsentDeduction());
                jobPosition.setLateDeduction(dto.getLateDeduction());
                jobPosition.setLateForgivenessMinutes(dto.getLateForgivenessMinutes() != null ? dto.getLateForgivenessMinutes() : 0);
                jobPosition.setLateForgivenessCountPerQuarter(dto.getLateForgivenessCountPerQuarter() != null ? dto.getLateForgivenessCountPerQuarter() : 0);
                jobPosition.setLeaveDeduction(dto.getLeaveDeduction());
                break;
        }
    }


    /**
     * Build full position name from name and experience level
     */
    private String buildFullPositionName(String positionName, String experienceLevel) {
        if (experienceLevel == null || experienceLevel.trim().isEmpty()) {
            return positionName;
        }
        String formattedLevel = experienceLevel.replace("_", " ");
        return positionName + " (" + formattedLevel + ")";
    }



    private String getFullPositionName(JobPosition position) {
        if (position.getExperienceLevel() != null && !position.getExperienceLevel().trim().isEmpty()) {
            return position.getPositionName() + " " + position.getExperienceLevel();
        }
        return position.getPositionName();
    }

    /**
     * Get a job position by ID as DTO
     */
    public JobPositionDTO getJobPositionDTOById(UUID id) {
        JobPosition jobPosition = jobPositionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Job position not found with id: " + id));
        return convertToDTO(jobPosition);
    }

    /**
     * Get all job positions as DTOs with eager loading of sites
     */
    public List<JobPositionDTO> getAllJobPositionDTOs() {
        List<JobPosition> jobPositions = jobPositionRepository.findAll();

        // Log number of positions found
        logger.debug("Found " + jobPositions.size() + " job positions");

        return convertToDTOList(jobPositions);
    }

    /**
     * Update a job position from DTO
     */
    @Transactional
    public JobPositionDTO updateJobPosition(UUID id, JobPositionDTO jobPositionDTO) {
        try {
            logger.info("Updating job position with ID: {}", id);

            // Find the existing job position
            JobPosition existingJobPosition = jobPositionRepository.findById(id)
                    .orElseThrow(() -> new EntityNotFoundException("Job position not found with id: " + id));

            // Validate the DTO
            validateJobPositionDTO(jobPositionDTO, id);

            // Check for duplicates - EXCLUDING the current position ID
            if (jobPositionDTO.getPositionName() != null && jobPositionDTO.getExperienceLevel() != null) {
                if (jobPositionRepository.existsByPositionNameAndExperienceLevelIgnoreCaseAndIdNot(
                        jobPositionDTO.getPositionName().trim(),
                        jobPositionDTO.getExperienceLevel(),
                        id)) {
                    String fullPositionName = buildFullPositionName(jobPositionDTO.getPositionName(), jobPositionDTO.getExperienceLevel());
                    throw new IllegalArgumentException(
                            "A position with the name '" + fullPositionName + "' already exists. " +
                                    "Position names combined with their experience level must be unique."
                    );
                }
            }

            // Store old values for notification purposes
            String oldPositionName = existingJobPosition.getPositionName();
            String oldDepartmentName = existingJobPosition.getDepartment() != null ?
                    existingJobPosition.getDepartment().getName() : null;
            Boolean oldActiveStatus = existingJobPosition.getActive();

            // Update department if provided
            if (jobPositionDTO.getDepartment() != null) {
                Department department = departmentRepository.findByName(jobPositionDTO.getDepartment().trim())
                        .orElseThrow(() -> new EntityNotFoundException("Department not found: " + jobPositionDTO.getDepartment()));
                existingJobPosition.setDepartment(department);
            }

            // Update basic fields if provided
            if (jobPositionDTO.getPositionName() != null && !jobPositionDTO.getPositionName().trim().isEmpty()) {
                existingJobPosition.setPositionName(jobPositionDTO.getPositionName().trim());
            }
            if (jobPositionDTO.getHead() != null) {
                existingJobPosition.setHead(jobPositionDTO.getHead());
            }
            if (jobPositionDTO.getProbationPeriod() != null) {
                existingJobPosition.setProbationPeriod(jobPositionDTO.getProbationPeriod());
            }
            if (jobPositionDTO.getContractType() != null) {
                existingJobPosition.setContractType(jobPositionDTO.getContractType());
            }
            if (jobPositionDTO.getExperienceLevel() != null) {
                existingJobPosition.setExperienceLevel(jobPositionDTO.getExperienceLevel());
            }
            if (jobPositionDTO.getActive() != null) {
                existingJobPosition.setActive(jobPositionDTO.getActive());
            }
            // Update baseSalary for backward compatibility
            if (jobPositionDTO.getBaseSalary() != null) {
                existingJobPosition.setBaseSalary(jobPositionDTO.getBaseSalary());
            }

            // Update parent job position
            if (jobPositionDTO.getParentJobPositionId() != null) {
                // Validate parent is not the same as current position
                if (jobPositionDTO.getParentJobPositionId().equals(id)) {
                    throw new IllegalArgumentException("A position cannot be its own parent");
                }

                JobPosition parentPosition = jobPositionRepository.findById(jobPositionDTO.getParentJobPositionId())
                        .orElseThrow(() -> new EntityNotFoundException("Parent job position not found: " + jobPositionDTO.getParentJobPositionId()));

                // Check for circular reference
                if (wouldCreateCircularReference(existingJobPosition, parentPosition)) {
                    throw new IllegalArgumentException("Cannot set this parent - it would create a circular reference in the hierarchy");
                }

                existingJobPosition.setParentJobPosition(parentPosition);
            } else {
                // If parentJobPositionId is explicitly null in the request, remove parent relationship
                existingJobPosition.setParentJobPosition(null);
            }

            // Update contract type specific fields
            setContractTypeFieldsForUpdate(existingJobPosition, jobPositionDTO);

            // Save the updated entity
            JobPosition updatedJobPosition = jobPositionRepository.save(existingJobPosition);

            // Send notifications about significant changes
            sendJobPositionUpdateNotifications(updatedJobPosition, oldPositionName, oldDepartmentName, oldActiveStatus);

            logger.info("Successfully updated job position: {} with ID: {}", updatedJobPosition.getPositionName(), id);

            // Convert back to DTO and return
            return convertToDTO(updatedJobPosition);

        } catch (IllegalArgumentException | EntityNotFoundException e) {
            logger.warn("Validation error updating job position {}: {}", id, e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("Error updating job position with ID: {}", id, e);

            notificationService.sendNotificationToHRUsers(
                    "Job Position Update Failed",
                    "Failed to update job position: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/hr/positions/" + id,
                    "job-position-update-error-" + id
            );

            throw new RuntimeException("Failed to update job position: " + e.getMessage(), e);
        }
    }

    /**
     * Set contract type specific fields for UPDATE operation
     * Only updates fields that are provided (not null)
     */
    private void setContractTypeFieldsForUpdate(JobPosition existingJobPosition, JobPositionDTO dto) {
        if (dto.getContractType() == null) return;

        switch (dto.getContractType()) {
            case HOURLY:
                if (dto.getWorkingDaysPerWeek() != null) {
                    existingJobPosition.setWorkingDaysPerWeek(dto.getWorkingDaysPerWeek());
                }
                if (dto.getHoursPerShift() != null) {
                    existingJobPosition.setHoursPerShift(dto.getHoursPerShift());
                }
                if (dto.getHourlyRate() != null) {
                    existingJobPosition.setHourlyRate(dto.getHourlyRate());
                }
                if (dto.getOvertimeMultiplier() != null) {
                    existingJobPosition.setOvertimeMultiplier(dto.getOvertimeMultiplier());
                }
                if (dto.getTrackBreaks() != null) {
                    existingJobPosition.setTrackBreaks(dto.getTrackBreaks());
                }
                if (dto.getBreakDurationMinutes() != null) {
                    existingJobPosition.setBreakDurationMinutes(dto.getBreakDurationMinutes());
                }
                // Clear monthly deduction fields when changing to hourly
                clearMonthlyDeductionFields(existingJobPosition);
                break;

            case DAILY:
                if (dto.getDailyRate() != null) {
                    existingJobPosition.setDailyRate(dto.getDailyRate());
                }
                if (dto.getWorkingDaysPerMonth() != null) {
                    existingJobPosition.setWorkingDaysPerMonth(dto.getWorkingDaysPerMonth());
                }
                if (dto.getIncludesWeekends() != null) {
                    existingJobPosition.setIncludesWeekends(dto.getIncludesWeekends());
                }
                // Clear monthly deduction fields when changing to daily
                clearMonthlyDeductionFields(existingJobPosition);
                break;

            case MONTHLY:
                if (dto.getMonthlyBaseSalary() != null) {
                    existingJobPosition.setMonthlyBaseSalary(dto.getMonthlyBaseSalary());
                }
                if (dto.getShifts() != null) {
                    existingJobPosition.setShifts(dto.getShifts());
                }
                if (dto.getWorkingHours() != null) {
                    existingJobPosition.setWorkingHours(dto.getWorkingHours());
                }
                if (dto.getVacations() != null) {
                    existingJobPosition.setVacations(dto.getVacations());
                }
                if (dto.getStartTime() != null) {
                    existingJobPosition.setStartTime(dto.getStartTime());
                }
                if (dto.getEndTime() != null) {
                    existingJobPosition.setEndTime(dto.getEndTime());
                }

                // NEW: Update monthly deduction fields
                // These can be set to null to clear them, or updated with new values
                updateMonthlyDeductionFields(existingJobPosition, dto);
                break;
        }
    }

    /**
     * Clear monthly deduction fields when contract type changes away from MONTHLY
     */
    private void clearMonthlyDeductionFields(JobPosition jobPosition) {
        jobPosition.setAbsentDeduction(null);
        jobPosition.setLateDeduction(null);
        jobPosition.setLateForgivenessMinutes(null);
        jobPosition.setLateForgivenessCountPerQuarter(null);
        jobPosition.setLeaveDeduction(null);
    }

    /**
     * Update monthly deduction fields
     * Handles both setting new values and clearing existing ones
     */
    private void updateMonthlyDeductionFields(JobPosition jobPosition, JobPositionDTO dto) {
        // Absent deduction - update if provided in request
        if (dto.getAbsentDeduction() != null) {
            jobPosition.setAbsentDeduction(dto.getAbsentDeduction());
        }

        // Late deduction - update if provided in request
        if (dto.getLateDeduction() != null) {
            jobPosition.setLateDeduction(dto.getLateDeduction());
        }

        // Late forgiveness minutes - update if provided (can be 0)
        if (dto.getLateForgivenessMinutes() != null) {
            jobPosition.setLateForgivenessMinutes(dto.getLateForgivenessMinutes());
        }

        // Late forgiveness count per quarter - update if provided (can be 0)
        if (dto.getLateForgivenessCountPerQuarter() != null) {
            jobPosition.setLateForgivenessCountPerQuarter(dto.getLateForgivenessCountPerQuarter());
        }

        // Leave deduction - update if provided in request
        if (dto.getLeaveDeduction() != null) {
            jobPosition.setLeaveDeduction(dto.getLeaveDeduction());
        }
    }

    /**
     * Validate JobPositionDTO fields
     */
    private void validateJobPositionDTO(JobPositionDTO dto, UUID excludeId) {
        List<String> errors = new ArrayList<>();

        // Required field validation
        if (dto.getPositionName() == null || dto.getPositionName().trim().isEmpty()) {
            errors.add("Position name is required");
        } else if (dto.getPositionName().trim().length() < 2) {
            errors.add("Position name must be at least 2 characters");
        } else if (dto.getPositionName().trim().length() > 100) {
            errors.add("Position name must not exceed 100 characters");
        }

        if (dto.getDepartment() == null || dto.getDepartment().trim().isEmpty()) {
            errors.add("Department is required");
        }

        if (dto.getContractType() == null) {
            errors.add("Contract type is required");
        }

        // Probation period validation
        if (dto.getProbationPeriod() != null) {
            if (dto.getProbationPeriod() < 0) {
                errors.add("Probation period cannot be negative");
            } else if (dto.getProbationPeriod() > 365) {
                errors.add("Probation period cannot exceed 365 days");
            }
        }

        // Contract type specific validation
        if (dto.getContractType() != null) {
            switch (dto.getContractType()) {
                case HOURLY:
                    if (dto.getHourlyRate() == null || dto.getHourlyRate() <= 0) {
                        errors.add("Hourly rate must be greater than 0 for hourly contracts");
                    }
                    if (dto.getHoursPerShift() == null || dto.getHoursPerShift() <= 0) {
                        errors.add("Hours per shift must be greater than 0 for hourly contracts");
                    }
                    if (dto.getWorkingDaysPerWeek() != null && (dto.getWorkingDaysPerWeek() < 1 || dto.getWorkingDaysPerWeek() > 7)) {
                        errors.add("Working days per week must be between 1 and 7");
                    }
                    break;

                case DAILY:
                    if (dto.getDailyRate() == null || dto.getDailyRate() <= 0) {
                        errors.add("Daily rate must be greater than 0 for daily contracts");
                    }
                    break;

                case MONTHLY:
                    if (dto.getMonthlyBaseSalary() == null || dto.getMonthlyBaseSalary() <= 0) {
                        errors.add("Monthly base salary must be greater than 0 for monthly contracts");
                    }

                    // Time validation
                    if (dto.getStartTime() != null && dto.getEndTime() != null) {
                        if (!dto.getEndTime().isAfter(dto.getStartTime())) {
                            errors.add("End time must be after start time");
                        }
                    }

                    // Deduction field validation
                    if (dto.getAbsentDeduction() != null && dto.getAbsentDeduction().compareTo(BigDecimal.ZERO) < 0) {
                        errors.add("Absent deduction cannot be negative");
                    }
                    if (dto.getLateDeduction() != null && dto.getLateDeduction().compareTo(BigDecimal.ZERO) < 0) {
                        errors.add("Late deduction cannot be negative");
                    }
                    if (dto.getLeaveDeduction() != null && dto.getLeaveDeduction().compareTo(BigDecimal.ZERO) < 0) {
                        errors.add("Leave deduction cannot be negative");
                    }
                    if (dto.getLateForgivenessMinutes() != null && dto.getLateForgivenessMinutes() < 0) {
                        errors.add("Late forgiveness minutes cannot be negative");
                    }
                    if (dto.getLateForgivenessCountPerQuarter() != null && dto.getLateForgivenessCountPerQuarter() < 0) {
                        errors.add("Late forgiveness count per quarter cannot be negative");
                    }
                    break;
            }
        }

        if (!errors.isEmpty()) {
            throw new IllegalArgumentException(String.join("; ", errors));
        }
    }

    /**
     * Check if setting a parent would create a circular reference
     */
    private boolean wouldCreateCircularReference(JobPosition position, JobPosition proposedParent) {
        if (proposedParent == null) {
            return false;
        }

        // Walk up the parent chain to see if we encounter the position we're updating
        JobPosition current = proposedParent;
        Set<UUID> visited = new HashSet<>();

        while (current != null) {
            if (current.getId().equals(position.getId())) {
                return true;
            }
            if (visited.contains(current.getId())) {
                // Already visited this node - there's a cycle
                return true;
            }
            visited.add(current.getId());
            current = current.getParentJobPosition();
        }

        return false;
    }

    /**
     * Send notifications for job position updates
     */
    private void sendJobPositionUpdateNotifications(JobPosition jobPosition, String oldPositionName,
                                                    String oldDepartmentName, Boolean oldActiveStatus) {
        String currentDepartmentName = jobPosition.getDepartment() != null ?
                jobPosition.getDepartment().getName() : "General";

        // Position name change
        if (!jobPosition.getPositionName().equals(oldPositionName)) {
            notificationService.sendNotificationToHRUsers(
                    "Job Position Renamed",
                    "Job position renamed from '" + oldPositionName + "' to '" + jobPosition.getPositionName() + "'",
                    NotificationType.INFO,
                    "/hr/positions/" + jobPosition.getId(),
                    "position-renamed-" + jobPosition.getId()
            );
        }

        // Department change
        if (!currentDepartmentName.equals(oldDepartmentName)) {
            notificationService.sendNotificationToHRUsers(
                    "Job Position Department Changed",
                    "'" + jobPosition.getPositionName() + "' moved from " + oldDepartmentName + " to " + currentDepartmentName,
                    NotificationType.INFO,
                    "/hr/positions/" + jobPosition.getId(),
                    "position-dept-change-" + jobPosition.getId()
            );
        }

        // Active status change
        if (!jobPosition.getActive().equals(oldActiveStatus)) {
            if (jobPosition.getActive()) {
                notificationService.sendNotificationToHRUsers(
                        "Job Position Activated",
                        "Job position '" + jobPosition.getPositionName() + "' has been activated and is now available for hiring",
                        NotificationType.SUCCESS,
                        "/hr/positions/" + jobPosition.getId(),
                        "position-activated-" + jobPosition.getId()
                );
            } else {
                notificationService.sendNotificationToHRUsers(
                        "Job Position Deactivated",
                        "Job position '" + jobPosition.getPositionName() + "' has been deactivated",
                        NotificationType.WARNING,
                        "/hr/positions/" + jobPosition.getId(),
                        "position-deactivated-" + jobPosition.getId()
                );

                // Check if there are employees in this position
                int employeeCount = jobPosition.getEmployees() != null ? jobPosition.getEmployees().size() : 0;
                if (employeeCount > 0) {
                    notificationService.sendNotificationToHRUsers(
                            "Deactivated Position Has Employees",
                            "⚠️ Deactivated position '" + jobPosition.getPositionName() + "' still has " + employeeCount + " employee(s) assigned",
                            NotificationType.WARNING,
                            "/hr/positions/" + jobPosition.getId() + "/employees",
                            "deactivated-with-employees-" + jobPosition.getId()
                    );
                }
            }
        }
    }

    /**
     * Check if a position is a leadership position
     */
    private boolean isLeadershipPosition(String positionName) {
        String name = positionName.toLowerCase();
        return name.contains("manager") || name.contains("director") || name.contains("supervisor") ||
                name.contains("lead") || name.contains("head") || name.contains("chief") ||
                name.contains("president") || name.contains("vice") || name.contains("senior");
    }

    /**
     * Delete a job position by ID
     */
    @Transactional
    public void deleteJobPosition(UUID id) {
        try {
            if (!jobPositionRepository.existsById(id)) {
                throw new RuntimeException("Job position not found with id: " + id);
            }

            JobPosition jobPosition = jobPositionRepository.findById(id).get();
            String positionName = jobPosition.getPositionName();
            String departmentName = jobPosition.getDepartment() != null ?
                    jobPosition.getDepartment().getName() : "General";

            // Check if there are employees assigned to this position
            int employeeCount = jobPosition.getEmployees() != null ? jobPosition.getEmployees().size() : 0;

            if (employeeCount > 0) {
                notificationService.sendNotificationToHRUsers(
                        "Job Position Deletion Blocked",
                        "Cannot delete '" + positionName + "': " + employeeCount + " employee(s) are assigned to this position",
                        NotificationType.ERROR,
                        "/hr/positions/" + id,
                        "delete-blocked-" + id
                );
                throw new IllegalStateException("Cannot delete job position with assigned employees. Please reassign employees first.");
            }

            jobPositionRepository.deleteById(id);

            // Send notification about deletion
            notificationService.sendNotificationToHRUsers(
                    "Job Position Deleted",
                    "Job position '" + positionName + "' from " + departmentName + " has been deleted",
                    NotificationType.WARNING,
                    "/job-positions",
                    "position-deleted-" + id
            );

        } catch (IllegalStateException e) {
            throw e; // Re-throw business rule violations
        } catch (Exception e) {
            logger.error("Error deleting job position", e);

            notificationService.sendNotificationToHRUsers(
                    "Job Position Deletion Failed",
                    "Failed to delete job position: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/hr/positions/" + id,
                    "delete-error-" + id
            );

            throw e;
        }
    }

    /**
     * Get a job position by ID (entity method)
     */
    public JobPosition getJobPositionById(UUID id) {
        return jobPositionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Job position not found with id: " + id));
    }

    /**
     * TEMPORARY DEBUG VERSION - Replace your getEmployeesByJobPositionId method with this
     * This will help us identify exactly where the error occurs
     */
    // ✅ SOLUTION 2: Update your service method to use departmentName instead of department object
    public List<EmployeeSummaryDTO> getEmployeesByJobPositionId(UUID jobPositionId) {
        logger.info("🔍 DEBUG: Starting getEmployeesByJobPositionId for id: {}", jobPositionId);

        try {
            // Step 1: Get job position with employees
            logger.info("📋 Step 1: Fetching job position with employees");
            JobPosition jobPosition = jobPositionRepository.findByIdWithEmployees(jobPositionId)
                    .orElseThrow(() -> new RuntimeException("Job position not found with id: " + jobPositionId));

            logger.info("✅ Job position found: {}", jobPosition.getPositionName());

            // Step 2: Check employees collection
            logger.info("👥 Step 2: Checking employees collection");
            if (jobPosition.getEmployees() == null || jobPosition.getEmployees().isEmpty()) {
                logger.info("ℹ️ No employees found, returning empty list");
                return Collections.emptyList();
            }

            logger.info("✅ Found {} employees in collection", jobPosition.getEmployees().size());

            // Step 3: Convert employees to DTOs
            logger.info("🔄 Step 3: Converting employees to DTOs");
            List<EmployeeSummaryDTO> result = new ArrayList<>();

            for (int i = 0; i < jobPosition.getEmployees().size(); i++) {
                Employee employee = jobPosition.getEmployees().get(i);
                logger.info("🔄 Processing employee {}/{}", i + 1, jobPosition.getEmployees().size());

                try {
                    if (employee == null) {
                        logger.warn("⚠️ Employee {} is null, skipping", i + 1);
                        continue;
                    }

                    logger.info("👤 Converting employee: {} {}", employee.getFirstName(), employee.getLastName());

                    // ✅ FIXED: Build DTO with safe field access and departmentName instead of department object
                    EmployeeSummaryDTO dto = EmployeeSummaryDTO.builder()
                            .id(employee.getId())
                            .firstName(employee.getFirstName())
                            .lastName(employee.getLastName())
                            .fullName(employee.getFullName())
                            .email(employee.getEmail())
                            .phoneNumber(employee.getPhoneNumber())
                            .status(employee.getStatus())
                            .photoUrl(employee.getPhotoUrl())
                            .hireDate(employee.getHireDate())
                            .monthlySalary(employee.getMonthlySalary())
                            .contractType(employee.getJobPosition() != null && employee.getJobPosition().getContractType() != null ?
                                    employee.getJobPosition().getContractType().toString() : null)
                            .eligibleForPromotion(employee.isEligibleForPromotion())
                            .monthsSinceHire(employee.getMonthsSinceHire())
                            .monthsSinceLastPromotion(employee.getMonthsSinceLastPromotion())
                            .promotionCount(employee.getPromotionCount())
                            .siteName(employee.getSite() != null ? employee.getSite().getName() : null)
                            .position(employee.getJobPosition() != null ? employee.getJobPosition().getPositionName() : null)

                            // ✅ FIXED: Use departmentName string instead of department object
                            .departmentName(employee.getJobPosition() != null && employee.getJobPosition().getDepartment() != null ?
                                    employee.getJobPosition().getDepartment().getName() : null)

                            .salary(employee.getBaseSalary())
                            .employmentType(employee.getJobPosition() != null && employee.getJobPosition().getContractType() != null ?
                                    employee.getJobPosition().getContractType().toString() : null)
                            .build();

                    result.add(dto);
                    logger.info("✅ Successfully converted employee: {} {}", employee.getFirstName(), employee.getLastName());

                } catch (Exception e) {
                    logger.error("❌ Error converting employee {}: {}", i + 1, e.getMessage(), e);
                    // Continue with next employee
                }
            }

            logger.info("🎉 Successfully converted {}/{} employees to DTOs", result.size(), jobPosition.getEmployees().size());
            return result;

        } catch (Exception e) {
            logger.error("💥 Fatal error in getEmployeesByJobPositionId: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to get employees: " + e.getMessage(), e);
        }
    }

    /**
     * Get promotion statistics for a job position
     */
    public Map<String, Object> getPromotionStatistics(UUID id) {
        JobPosition jobPosition = getJobPositionById(id);
        return jobPosition.getPromotionStatistics();
    }

    /**
     * Get all promotions FROM this position
     */
    public List<PromotionRequest> getPromotionsFromPosition(UUID id) {
        JobPosition jobPosition = getJobPositionById(id);
        return jobPosition.getPromotionsFromThisPosition();
    }

    /**
     * Get all promotions TO this position
     */
    public List<PromotionRequest> getPromotionsToPosition(UUID id) {
        JobPosition jobPosition = getJobPositionById(id);
        return jobPosition.getPromotionsToThisPosition();
    }

    /**
     * Get pending promotions FROM this position
     */
    public List<PromotionRequest> getPendingPromotionsFromPosition(UUID id) {
        JobPosition jobPosition = getJobPositionById(id);
        return jobPosition.getPendingPromotionsFrom();
    }

    /**
     * Get pending promotions TO this position
     */
    public List<PromotionRequest> getPendingPromotionsToPosition(UUID id) {
        JobPosition jobPosition = getJobPositionById(id);
        return jobPosition.getPendingPromotionsTo();
    }

    /**
     * Get career path suggestions from this position
     */
    public List<String> getCareerPathSuggestions(UUID id) {
        JobPosition jobPosition = getJobPositionById(id);
        return jobPosition.getCareerPathSuggestions();
    }

    /**
     * Get employees eligible for promotion from this position
     */
    public List<Employee> getEmployeesEligibleForPromotion(UUID id) {
        JobPosition jobPosition = getJobPositionById(id);

        // Use the Employee model's eligibility check methods
        if (jobPosition.getEmployees() != null) {
            return jobPosition.getEmployees().stream()
                    .filter(Employee::isEligibleForPromotion)
                    .collect(Collectors.toList());
        }

        return Collections.emptyList();
    }

    /**
     * Get salary statistics for this position
     */
    public Map<String, Object> getSalaryStatistics(UUID id) {
        JobPosition jobPosition = getJobPositionById(id);
        Map<String, Object> stats = new HashMap<>();

        // Basic salary information
        stats.put("baseSalary", jobPosition.getBaseSalary());
        stats.put("contractType", jobPosition.getContractType());
        stats.put("calculatedMonthlySalary", jobPosition.calculateMonthlySalary());
        stats.put("calculatedDailySalary", jobPosition.calculateDailySalary());

        // Contract-specific salary details
        switch (jobPosition.getContractType()) {
            case HOURLY:
                stats.put("hourlyRate", jobPosition.getHourlyRate());
                stats.put("hoursPerShift", jobPosition.getHoursPerShift());
                stats.put("workingDaysPerWeek", jobPosition.getWorkingDaysPerWeek());
                stats.put("overtimeMultiplier", jobPosition.getOvertimeMultiplier());
                break;
            case DAILY:
                stats.put("dailyRate", jobPosition.getDailyRate());
                stats.put("workingDaysPerMonth", jobPosition.getWorkingDaysPerMonth());
                stats.put("includesWeekends", jobPosition.getIncludesWeekends());
                break;
            case MONTHLY:
                stats.put("monthlyBaseSalary", jobPosition.getMonthlyBaseSalary());
                stats.put("workingHours", jobPosition.getWorkingHours());
                stats.put("startTime", jobPosition.getStartTime());
                stats.put("endTime", jobPosition.getEndTime());
                stats.put("workingTimeRange", jobPosition.getWorkingTimeRange());
                break;
        }

        // Employee salary statistics
        List<Employee> employees = jobPosition.getEmployees();
        if (employees != null && !employees.isEmpty()) {
            stats.put("numberOfEmployees", employees.size());

            // Calculate average, min, max salaries of current employees using getMonthlySalary()
            List<BigDecimal> salaries = employees.stream()
                    .map(Employee::getMonthlySalary)
                    .filter(salary -> salary != null && salary.compareTo(BigDecimal.ZERO) > 0)
                    .collect(Collectors.toList());

            if (!salaries.isEmpty()) {
                BigDecimal totalSalary = salaries.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
                BigDecimal avgSalary = totalSalary.divide(BigDecimal.valueOf(salaries.size()), 2, RoundingMode.HALF_UP);

                stats.put("averageEmployeeSalary", avgSalary.doubleValue());
                stats.put("minEmployeeSalary", Collections.min(salaries).doubleValue());
                stats.put("maxEmployeeSalary", Collections.max(salaries).doubleValue());
                stats.put("totalPayroll", totalSalary.doubleValue());
            }
        } else {
            stats.put("numberOfEmployees", 0);
        }

        return stats;
    }
    /**
     * Get salary statistics for this position
     */

    /**
     * Get position validation status
     */
    public Map<String, Object> getPositionValidation(UUID id) {
        JobPosition jobPosition = getJobPositionById(id);
        Map<String, Object> validation = new HashMap<>();

        validation.put("isValid", jobPosition.isValidConfiguration());
        validation.put("isActive", jobPosition.getActive());
        validation.put("isEligibleForPromotionFrom", jobPosition.isEligibleForPromotionFrom());
        validation.put("isEligibleForPromotionTo", jobPosition.isEligibleForPromotionTo());
        validation.put("isHighLevelPosition", jobPosition.isHighLevelPosition());
        validation.put("hasCareerProgression", jobPosition.hasCareerProgression());
        validation.put("isPromotionDestination", jobPosition.isPromotionDestination());
        validation.put("hasEmployeesReadyForPromotion", jobPosition.hasEmployeesReadyForPromotion());

        // Validation messages
        List<String> issues = new ArrayList<>();
        List<String> recommendations = new ArrayList<>();

        if (!jobPosition.isValidConfiguration()) {
            issues.add("Position configuration is incomplete or invalid");
            recommendations.add("Review and complete all required fields for this contract type");
        }

        if (!jobPosition.getActive()) {
            issues.add("Position is currently inactive");
            recommendations.add("Activate position to make it available for hiring");
        }

        if (jobPosition.getEmployees() != null && !jobPosition.getEmployees().isEmpty() && !jobPosition.getActive()) {
            issues.add("Inactive position has assigned employees");
            recommendations.add("Consider reassigning employees or reactivating the position");
        }

        if (jobPosition.getBaseSalary() == null || jobPosition.getBaseSalary() <= 0) {
            issues.add("No salary information configured");
            recommendations.add("Set up salary structure for this position");
        }

        validation.put("issues", issues);
        validation.put("recommendations", recommendations);
        validation.put("issueCount", issues.size());

        return validation;
    }

    /**
     * Get comprehensive position analytics
     */
    public Map<String, Object> getPositionAnalytics(UUID id) {
        JobPosition jobPosition = getJobPositionById(id);
        Map<String, Object> analytics = new HashMap<>();

        analytics.put("basic", convertToDTO(jobPosition));
        analytics.put("promotionStats", jobPosition.getPromotionStatistics());
        analytics.put("salaryStats", getSalaryStatistics(id));
        analytics.put("validation", getPositionValidation(id));

        analytics.put("employeeCount", jobPosition.getEmployees() != null ? jobPosition.getEmployees().size() : 0);
        analytics.put("vacancyCount", jobPosition.getVacancies() != null ? jobPosition.getVacancies().size() : 0);
        analytics.put("departmentName", jobPosition.getDepartment() != null ?
                jobPosition.getDepartment().getName() : null);
        analytics.put("hierarchyLevel", jobPosition.getHierarchyLevel());
        analytics.put("hierarchyPath", jobPosition.getHierarchyPath());

        return analytics;
    }

    /**
     * Check if position can be safely deleted
     */
    public Map<String, Object> canDeletePosition(UUID id) {
        JobPosition jobPosition = getJobPositionById(id);
        Map<String, Object> result = new HashMap<>();

        boolean canDelete = true;
        List<String> blockingReasons = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        // Check for assigned employees
        int employeeCount = jobPosition.getEmployees() != null ? jobPosition.getEmployees().size() : 0;
        if (employeeCount > 0) {
            canDelete = false;
            blockingReasons.add(employeeCount + " employee(s) are currently assigned to this position");
        }

        // Check for active vacancies
        long activeVacancyCount = jobPosition.getVacancies() != null ?
                jobPosition.getVacancies().stream()
                        .filter(vacancy -> vacancy.getStatus() != null && vacancy.getStatus().equals("ACTIVE"))
                        .count() : 0;

        if (activeVacancyCount > 0) {
            canDelete = false;
            blockingReasons.add(activeVacancyCount + " active vacanc(ies) exist for this position");
        }

        // Check for pending promotions
        int pendingPromotionsFrom = jobPosition.getPendingPromotionsFrom().size();
        int pendingPromotionsTo = jobPosition.getPendingPromotionsTo().size();

        if (pendingPromotionsFrom > 0 || pendingPromotionsTo > 0) {
            warnings.add("Position has " + (pendingPromotionsFrom + pendingPromotionsTo) + " pending promotion(s)");
        }

        // Check for historical data
        long totalPromotions = jobPosition.getPromotionsFromCount() + jobPosition.getPromotionsToCount();
        if (totalPromotions > 0) {
            warnings.add("Position has historical promotion data (" + totalPromotions + " promotion(s))");
        }

        result.put("canDelete", canDelete);
        result.put("blockingReasons", blockingReasons);
        result.put("warnings", warnings);
        result.put("employeeCount", employeeCount);
        result.put("activeVacancyCount", activeVacancyCount);
        result.put("pendingPromotionsCount", pendingPromotionsFrom + pendingPromotionsTo);
        result.put("totalPromotionsCount", totalPromotions);

        return result;
    }

    /**
     * Get positions that can be promoted to from this position
     */
    public List<JobPositionDTO> getPromotionDestinations(UUID id) {
        JobPosition jobPosition = getJobPositionById(id);

        // Get common promotion destinations based on historical data
        Map<String, Long> destinations = jobPosition.getCommonPromotionDestinations();

        // Find actual position objects for these destinations
        List<JobPositionDTO> destinationPositions = new ArrayList<>();

        for (String positionName : destinations.keySet()) {
            List<JobPosition> positions = jobPositionRepository.findByPositionNameContainingIgnoreCase(positionName);
            for (JobPosition pos : positions) {
                if (!pos.getId().equals(id) && pos.getActive()) { // Exclude self and inactive positions
                    destinationPositions.add(convertToDTO(pos));
                }
            }
        }

        // Also suggest positions in higher levels or related departments
        if (destinationPositions.isEmpty()) {
            // Fallback: suggest senior positions in same department
            if (jobPosition.getDepartment() != null) {
                List<JobPosition> departmentPositions = jobPositionRepository.findByDepartment(jobPosition.getDepartment());
                for (JobPosition pos : departmentPositions) {
                    if (!pos.getId().equals(id) && pos.getActive() && pos.isHighLevelPosition()) {
                        destinationPositions.add(convertToDTO(pos));
                    }
                }
            }
        }

        return destinationPositions.stream().distinct().limit(10).collect(Collectors.toList());
    }

    /**
     * Get positions that commonly promote to this position
     */
    public List<JobPositionDTO> getPromotionSources(UUID id) {
        JobPosition jobPosition = getJobPositionById(id);

        // Get positions that have promoted to this position
        List<JobPositionDTO> sourcePositions = new ArrayList<>();

        List<PromotionRequest> promotionsTo = jobPosition.getPromotionsToThisPosition();
        Set<UUID> sourcePositionIds = promotionsTo.stream()
                .filter(promotion -> promotion.getCurrentJobPosition() != null)
                .map(promotion -> promotion.getCurrentJobPosition().getId())
                .collect(Collectors.toSet());

        for (UUID sourceId : sourcePositionIds) {
            try {
                JobPosition sourcePosition = getJobPositionById(sourceId);
                if (sourcePosition.getActive()) {
                    sourcePositions.add(convertToDTO(sourcePosition));
                }
            } catch (Exception e) {
                // Position might have been deleted, skip
            }
        }

        return sourcePositions.stream().distinct().collect(Collectors.toList());
    }

    /**
     * Get detailed employee analytics for this position
     */

    public PromotionStatsDTO getSimplifiedPromotionStats(UUID jobPositionId) {
        try {
            JobPosition jobPosition = getJobPositionById(jobPositionId);

            // Get basic counts from collections with null checks
            Long totalFrom = (long) (jobPosition.getPromotionsFromThisPosition() != null ?
                    jobPosition.getPromotionsFromThisPosition().size() : 0);
            Long totalTo = (long) (jobPosition.getPromotionsToThisPosition() != null ?
                    jobPosition.getPromotionsToThisPosition().size() : 0);

            // Count by status with null checks
            Long pendingFrom = jobPosition.getPromotionsFromThisPosition() != null ?
                    jobPosition.getPromotionsFromThisPosition().stream()
                            .filter(p -> p != null && ("PENDING".equals(p.getStatus()) || "UNDER_REVIEW".equals(p.getStatus())))
                            .count() : 0;

            Long pendingTo = jobPosition.getPromotionsToThisPosition() != null ?
                    jobPosition.getPromotionsToThisPosition().stream()
                            .filter(p -> p != null && ("PENDING".equals(p.getStatus()) || "UNDER_REVIEW".equals(p.getStatus())))
                            .count() : 0;

            Long implementedFrom = jobPosition.getPromotionsFromThisPosition() != null ?
                    jobPosition.getPromotionsFromThisPosition().stream()
                            .filter(p -> p != null && "IMPLEMENTED".equals(p.getStatus()))
                            .count() : 0;

            Long implementedTo = jobPosition.getPromotionsToThisPosition() != null ?
                    jobPosition.getPromotionsToThisPosition().stream()
                            .filter(p -> p != null && "IMPLEMENTED".equals(p.getStatus()))
                            .count() : 0;

            // Calculate averages (simplified)
            BigDecimal avgSalaryIncrease = jobPosition.getAverageSalaryIncreaseFromPosition();
            Double avgTimeBeforePromotion = jobPosition.getAverageTimeBeforePromotion();
            Double promotionRate = jobPosition.getPromotionRateFromPosition();

            // Get top destinations (simplified)
            Map<String, Long> topDestinations = jobPosition.getCommonPromotionDestinations();

            return PromotionStatsDTO.builder()
                    .totalPromotionsFrom(totalFrom)
                    .totalPromotionsTo(totalTo)
                    .pendingPromotionsFrom(pendingFrom)
                    .pendingPromotionsTo(pendingTo)
                    .implementedPromotionsFrom(implementedFrom)
                    .implementedPromotionsTo(implementedTo)
                    .averageSalaryIncrease(avgSalaryIncrease)
                    .averageTimeBeforePromotion(avgTimeBeforePromotion)
                    .promotionRate(promotionRate)
                    .hasCareerProgression(implementedFrom > 0)
                    .isPromotionDestination(implementedTo > 0)
                    .topPromotionDestinations(topDestinations)
                    .promotionsLastYear(0L) // You can calculate this if needed
                    .promotionsLastQuarter(0L) // You can calculate this if needed
                    .build();
        } catch (Exception e) {
            logger.error("Error getting simplified promotion stats for job position: " + jobPositionId, e);
            // Return empty stats instead of throwing exception
            return PromotionStatsDTO.builder()
                    .totalPromotionsFrom(0L)
                    .totalPromotionsTo(0L)
                    .pendingPromotionsFrom(0L)
                    .pendingPromotionsTo(0L)
                    .implementedPromotionsFrom(0L)
                    .implementedPromotionsTo(0L)
                    .averageSalaryIncrease(BigDecimal.ZERO)
                    .averageTimeBeforePromotion(0.0)
                    .promotionRate(0.0)
                    .hasCareerProgression(false)
                    .isPromotionDestination(false)
                    .topPromotionDestinations(new HashMap<>())
                    .promotionsLastYear(0L)
                    .promotionsLastQuarter(0L)
                    .build();
        }
    }


    /**
     * Get simplified list of promotions FROM this position
     */
    public List<PromotionSummaryDTO> getSimplifiedPromotionsFrom(UUID jobPositionId) {
        try {
            JobPosition jobPosition = getJobPositionById(jobPositionId);

            if (jobPosition.getPromotionsFromThisPosition() == null) {
                return Collections.emptyList();
            }

            return jobPosition.getPromotionsFromThisPosition().stream()
                    .filter(promotion -> promotion != null)
                    .map(this::convertToPromotionSummary)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            logger.error("Error getting simplified promotions from job position: " + jobPositionId, e);
            return Collections.emptyList();
        }
    }

    /**
     * Get simplified list of promotions TO this position
     */
    public List<PromotionSummaryDTO> getSimplifiedPromotionsTo(UUID jobPositionId) {
        try {
            JobPosition jobPosition = getJobPositionById(jobPositionId);

            if (jobPosition.getPromotionsToThisPosition() == null) {
                return Collections.emptyList();
            }

            return jobPosition.getPromotionsToThisPosition().stream()
                    .filter(promotion -> promotion != null)
                    .map(this::convertToPromotionSummary)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            logger.error("Error getting simplified promotions to job position: " + jobPositionId, e);
            return Collections.emptyList();
        }
    }

    /**
     * Convert PromotionRequest to simplified PromotionSummaryDTO
     */
    private PromotionSummaryDTO convertToPromotionSummary(PromotionRequest promotion) {
        try {
            BigDecimal salaryIncrease = BigDecimal.ZERO;
            Double salaryIncreasePercentage = 0.0;

            if (promotion.getCurrentSalary() != null && promotion.getApprovedSalary() != null) {
                salaryIncrease = promotion.getApprovedSalary().subtract(promotion.getCurrentSalary());
                if (promotion.getCurrentSalary().compareTo(BigDecimal.ZERO) > 0) {
                    salaryIncreasePercentage = salaryIncrease
                            .divide(promotion.getCurrentSalary(), 4, RoundingMode.HALF_UP)
                            .multiply(BigDecimal.valueOf(100))
                            .doubleValue();
                }
            }

            return PromotionSummaryDTO.builder()
                    .id(promotion.getId())
                    .employeeName(promotion.getEmployee() != null ?
                            promotion.getEmployee().getFirstName() + " " + promotion.getEmployee().getLastName() : "Unknown")
                    .currentPositionName(promotion.getCurrentJobPosition() != null ?
                            promotion.getCurrentJobPosition().getPositionName() : "Unknown")
                    .promotedToPositionName(promotion.getPromotedToJobPosition() != null ?
                            promotion.getPromotedToJobPosition().getPositionName() : "Unknown")
                    .status(promotion.getStatus() != null ? promotion.getStatus().toString() : "UNKNOWN")
                    .currentSalary(promotion.getCurrentSalary())
                    .proposedSalary(promotion.getApprovedSalary())
                    .salaryIncrease(salaryIncrease)
                    .salaryIncreasePercentage(salaryIncreasePercentage)
                    .requestDate(promotion.getCreatedAt())
                    .effectiveDate(promotion.getActualEffectiveDate() != null ?
                            promotion.getActualEffectiveDate().atStartOfDay() : null)
                    .requestedBy(promotion.getRequestedBy())
                    .approvedBy(promotion.getApprovedBy())
                    .yearsInCurrentPosition(promotion.getYearsInCurrentPosition())
                    .justification(promotion.getJustification())
                    .build();
        } catch (Exception e) {
            logger.error("Error converting promotion to summary: " + promotion.getId(), e);
            // Return a basic summary with available data
            return PromotionSummaryDTO.builder()
                    .id(promotion.getId())
                    .employeeName("Unknown")
                    .currentPositionName("Unknown")
                    .promotedToPositionName("Unknown")
                    .status("UNKNOWN")
                    .currentSalary(BigDecimal.ZERO)
                    .proposedSalary(BigDecimal.ZERO)
                    .salaryIncrease(BigDecimal.ZERO)
                    .salaryIncreasePercentage(0.0)
                    .requestDate(null)
                    .effectiveDate(null)
                    .requestedBy(null)
                    .approvedBy(null)
                    .yearsInCurrentPosition(null)
                    .justification(null)
                    .build();
        }
    }

// ===============================
// FIXED: getJobPositionDetailsDTO method with corrected field names
// ===============================

    @Transactional()
    public JobPositionDetailsDTO getJobPositionDetailsDTO(UUID id) {
        JobPosition jobPosition = getJobPositionById(id);

        JobPositionDetailsDTO.JobPositionDetailsDTOBuilder builder = JobPositionDetailsDTO.builder();

        // Basic info
        builder.id(jobPosition.getId())
                .positionName(jobPosition.getPositionName())
                .departmentName(jobPosition.getDepartment() != null ? jobPosition.getDepartment().getName() : null)
                .head(jobPosition.getHead())
                .baseSalary(jobPosition.getBaseSalary())
                .probationPeriod(jobPosition.getProbationPeriod())
                .contractType(String.valueOf(jobPosition.getContractType()))
                .experienceLevel(jobPosition.getExperienceLevel())
                .active(jobPosition.getActive());

        // Contract-specific fields
        builder.workingDaysPerWeek(jobPosition.getWorkingDaysPerWeek())
                .hoursPerShift(jobPosition.getHoursPerShift())
                // FIX: Add null check for hourlyRate before converting to BigDecimal
                .hourlyRate(jobPosition.getHourlyRate() != null ? BigDecimal.valueOf(jobPosition.getHourlyRate()) : null)
                // FIX: Add null check for overtimeMultiplier
                .overtimeMultiplier(jobPosition.getOvertimeMultiplier() != null ? BigDecimal.valueOf(jobPosition.getOvertimeMultiplier()) : null)
                .trackBreaks(jobPosition.getTrackBreaks())
                .breakDurationMinutes(jobPosition.getBreakDurationMinutes())
                // FIX: Add null check for dailyRate
                .dailyRate(jobPosition.getDailyRate() != null ? BigDecimal.valueOf(jobPosition.getDailyRate()) : null)
                .includesWeekends(jobPosition.getIncludesWeekends())
                // FIX: Add null check for monthlyBaseSalary
                .monthlyBaseSalary(jobPosition.getMonthlyBaseSalary() != null ? BigDecimal.valueOf(jobPosition.getMonthlyBaseSalary()) : null)
                .shifts(jobPosition.getShifts())
                .workingHours(jobPosition.getWorkingHours())
                .vacations(jobPosition.getVacations())
                .startTime(jobPosition.getStartTime())
                .endTime(jobPosition.getEndTime());

        // NEW: Monthly deduction fields
        builder.absentDeduction(jobPosition.getAbsentDeduction())
                .lateDeduction(jobPosition.getLateDeduction())
                .lateForgivenessMinutes(jobPosition.getLateForgivenessMinutes())
                .lateForgivenessCountPerQuarter(jobPosition.getLateForgivenessCountPerQuarter())
                .leaveDeduction(jobPosition.getLeaveDeduction());

        // Calculated fields
        try {
            builder.calculatedMonthlySalary(jobPosition.calculateMonthlySalary())
                    .calculatedDailySalary(jobPosition.calculateDailySalary())
                    .isValidConfiguration(jobPosition.isValidConfiguration())
                    .workingTimeRange(jobPosition.getWorkingTimeRange());
        } catch (Exception e) {
            logger.warn("Could not calculate derived fields: {}", e.getMessage());
            builder.calculatedMonthlySalary(0.0)
                    .calculatedDailySalary(0.0)
                    .isValidConfiguration(false);
        }

        // Hierarchy fields
        builder.parentJobPositionId(jobPosition.getParentJobPosition() != null ?
                        jobPosition.getParentJobPosition().getId() : null)
                .parentJobPositionName(jobPosition.getParentJobPosition() != null ?
                        jobPosition.getParentJobPosition().getPositionName() : null)
                .isRootPosition(jobPosition.isRootPosition())
                .hierarchyLevel(jobPosition.getHierarchyLevel())
                .hierarchyPath(jobPosition.getHierarchyPath());

        // Employee data
        List<Employee> employees = jobPosition.getEmployees();
        builder.employeeCount(employees != null ? employees.size() : 0);

        if (employees != null && !employees.isEmpty()) {
            List<EmployeeSummaryDTO> employeeSummaries = employees.stream()
                    .map(emp -> EmployeeSummaryDTO.builder()
                            .id(emp.getId())
                            .firstName(emp.getFirstName())
                            .lastName(emp.getLastName())
                            .email(emp.getEmail())
                            .photoUrl(emp.getPhotoUrl())
                            .status(emp.getStatus())
                            .hireDate(emp.getHireDate())
                            .siteName(emp.getSite() != null ? emp.getSite().getName() : null)
                            .build())
                    .collect(Collectors.toList());
            builder.employees(employeeSummaries);
        } else {
            builder.employees(new ArrayList<>());
        }



        return builder.build();
    }

    /**
     * Safe version of buildPositionPromotions with extensive error handling
     */
    private PositionPromotionsDTO buildPositionPromotions(JobPosition jobPosition) {
        logger.debug("🚀 Building promotions for position: {}", jobPosition.getPositionName());

        try {
            // Get simplified promotion stats to avoid lazy loading issues
            logger.debug("📊 Getting promotion stats");
            PromotionStatsDTO stats = null;
            try {
                stats = getSimplifiedPromotionStats(jobPosition.getId());
                logger.debug("✅ Promotion stats retrieved successfully");
            } catch (Exception e) {
                logger.warn("⚠️ Could not get promotion stats: {}", e.getMessage());
                // Create empty stats
                stats = PromotionStatsDTO.builder()
                        .totalPromotionsFrom(0L)
                        .totalPromotionsTo(0L)
                        .pendingPromotionsFrom(0L)
                        .pendingPromotionsTo(0L)
                        .implementedPromotionsFrom(0L)
                        .implementedPromotionsTo(0L)
                        .averageSalaryIncrease(BigDecimal.ZERO)
                        .averageTimeBeforePromotion(0.0)
                        .promotionRate(0.0)
                        .hasCareerProgression(false)
                        .isPromotionDestination(false)
                        .topPromotionDestinations(new HashMap<>())
                        .promotionsLastYear(0L)
                        .promotionsLastQuarter(0L)
                        .build();
            }

            // Get promotion lists
            logger.debug("📋 Getting promotion lists");
            List<PromotionSummaryDTO> promotionsFromList = Collections.emptyList();
            List<PromotionSummaryDTO> promotionsToList = Collections.emptyList();

            try {
                promotionsFromList = getSimplifiedPromotionsFrom(jobPosition.getId());
                promotionsToList = getSimplifiedPromotionsTo(jobPosition.getId());
                logger.debug("✅ Promotion lists retrieved: from={}, to={}",
                        promotionsFromList.size(), promotionsToList.size());
            } catch (Exception e) {
                logger.warn("⚠️ Could not get promotion lists: {}", e.getMessage());
            }

            // Filter for pending and recent promotions safely
            List<PromotionSummaryDTO> pendingFromList = Collections.emptyList();
            List<PromotionSummaryDTO> pendingToList = Collections.emptyList();
            List<PromotionSummaryDTO> recentPromotions = Collections.emptyList();

            try {
                pendingFromList = promotionsFromList.stream()
                        .filter(p -> p != null && ("PENDING".equals(p.getStatus()) || "UNDER_REVIEW".equals(p.getStatus())))
                        .collect(Collectors.toList());

                pendingToList = promotionsToList.stream()
                        .filter(p -> p != null && ("PENDING".equals(p.getStatus()) || "UNDER_REVIEW".equals(p.getStatus())))
                        .collect(Collectors.toList());

                recentPromotions = promotionsFromList.stream()
                        .filter(p -> p != null && p.getEffectiveDate() != null &&
                                p.getEffectiveDate().isAfter(LocalDateTime.now().minusMonths(6)))
                        .collect(Collectors.toList());

                logger.debug("✅ Filtered lists: pendingFrom={}, pendingTo={}, recent={}",
                        pendingFromList.size(), pendingToList.size(), recentPromotions.size());

            } catch (Exception e) {
                logger.warn("⚠️ Could not filter promotion lists: {}", e.getMessage());
            }

            // Get career path suggestions safely
            List<String> careerPathSuggestions = Collections.emptyList();
            try {
                careerPathSuggestions = getCareerPathSuggestions(jobPosition.getId());
            } catch (Exception e) {
                logger.warn("⚠️ Could not get career path suggestions: {}", e.getMessage());
            }

            // Build the DTO
            return PositionPromotionsDTO.builder()
                    .totalPromotionsFrom(stats.getTotalPromotionsFrom())
                    .totalPromotionsTo(stats.getTotalPromotionsTo())
                    .pendingPromotionsFromCount(stats.getPendingPromotionsFrom())
                    .pendingPromotionsToCount(stats.getPendingPromotionsTo())
                    .implementedPromotionsFrom(stats.getImplementedPromotionsFrom())
                    .implementedPromotionsTo(stats.getImplementedPromotionsTo())
                    .rejectedPromotionsFrom(0L)
                    .rejectedPromotionsTo(0L)
                    .averageSalaryIncrease(stats.getAverageSalaryIncrease())
                    .averageTimeBeforePromotion(stats.getAverageTimeBeforePromotion())
                    .promotionRate(stats.getPromotionRate())
                    .promotionSuccessRate(calculatePromotionSuccessRate(stats))
                    .hasCareerProgression(stats.getHasCareerProgression())
                    .isPromotionDestination(stats.getIsPromotionDestination())
                    .topPromotionDestinations(stats.getTopPromotionDestinations())
                    .commonPromotionSources(new HashMap<>())
                    .promotionsFromList(promotionsFromList)
                    .promotionsToList(promotionsToList)
                    .pendingPromotionsFromList(pendingFromList)
                    .pendingPromotionsToList(pendingToList)
                    .recentPromotions(recentPromotions)
                    .careerPathSuggestions(careerPathSuggestions)
                    .promotionDestinations(Collections.emptyList())
                    .promotionSources(Collections.emptyList())
                    .promotionsLastYear(stats.getPromotionsLastYear())
                    .promotionsLastQuarter(stats.getPromotionsLastQuarter())
                    .promotionsThisMonth(0L)
                    .build();

        } catch (Exception e) {
            logger.error("💥 Fatal error building promotions data: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to build promotions data: " + e.getMessage(), e);
        }
    }

    /**
     * Safe helper method to calculate promotion success rate
     */
    private Double calculatePromotionSuccessRate(PromotionStatsDTO stats) {
        try {
            if (stats == null) return 0.0;

            Long total = stats.getTotalPromotionsFrom();
            Long implemented = stats.getImplementedPromotionsFrom();

            if (total == null || total == 0) return 0.0;
            if (implemented == null) return 0.0;

            return (double) implemented / total * 100.0;
        } catch (Exception e) {
            logger.warn("⚠️ Could not calculate promotion success rate: {}", e.getMessage());
            return 0.0;
        }
    }

    /**
     * Get employee summaries for a position (separate query to avoid lazy loading)
     */
    private List<EmployeeSummaryDTO> getEmployeeSummariesForPosition(UUID jobPositionId) {
        try {
            // Use a separate repository method or query to get employees
            JobPosition position = jobPositionRepository.findByIdWithEmployees(jobPositionId).orElse(null);
            if (position == null || position.getEmployees() == null) {
                return Collections.emptyList();
            }

            return position.getEmployees().stream()
                    .filter(employee -> employee != null) // Add null check
                    .map(this::convertToEmployeeSummary)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            logger.warn("Could not load employees for position {}: {}", jobPositionId, e.getMessage());
            return Collections.emptyList();
        }
    }

    private EmployeeSummaryDTO convertToEmployeeSummaryDTO(Employee employee) {
        return EmployeeSummaryDTO.builder()
                .id(employee.getId())
                .firstName(employee.getFirstName())
                .lastName(employee.getLastName())
                .fullName(employee.getFirstName() + " " + employee.getLastName())
                .email(employee.getEmail())
                .phoneNumber(employee.getPhoneNumber()) // Changed from getPhoneNumber()
                .status(employee.isActive() ? "ACTIVE" : "INACTIVE")
                .photoUrl(employee.getPhotoUrl())
                .hireDate(employee.getHireDate()) // Try both fields
                .monthlySalary(employee.getMonthlySalary() != null ? employee.getMonthlySalary() : employee.getBaseSalary())
                .contractType(employee.getContractType() != null ? employee.getContractType().toString() : "UNKNOWN")
                .eligibleForPromotion(employee.isEligibleForPromotion())
                .monthsSinceHire(calculateMonthsSinceHire(employee.getHireDate()))
                .monthsSinceLastPromotion(employee.getMonthsSinceLastPromotion())
                .promotionCount(employee.getPromotionCount())
                .siteName(employee.getSite() != null ? employee.getSite().getName() : null)
//                .performanceRating(employee.getPerformanceRating() != null ? employee.getPerformanceRating() : 0.0)
                .lastPromotionDate(String.valueOf(employee.getLastPromotion().getActualEffectiveDate()))
                .position(employee.getJobPosition() != null ? employee.getJobPosition().getPositionName() : null)
                .department(employee.getJobPosition().getDepartment()) // This should return the Department object
                .salary(employee.getBaseSalary())
                .build();
    }

    /**
     * Helper method to calculate months since hire date
     */
    private Integer calculateMonthsSinceHire(LocalDate hireDate) {
        if (hireDate == null) {
            return 0;
        }

        try {
            return (int) java.time.temporal.ChronoUnit.MONTHS.between(hireDate, LocalDate.now());
        } catch (Exception e) {
            logger.warn("Error calculating months since hire: {}", e.getMessage());
            return 0;
        }
    }


    /**
     * Convert Employee to EmployeeSummaryDTO with improved null handling
     */
    private EmployeeSummaryDTO convertToEmployeeSummary(Employee employee) {
        if (employee == null) {
            return null;
        }

        try {
            return EmployeeSummaryDTO.builder()
                    .id(employee.getId())
                    .firstName(employee.getFirstName())
                    .lastName(employee.getLastName())
                    .fullName(employee.getFullName())
                    .email(employee.getEmail())
                    .phoneNumber(employee.getPhoneNumber())
                    .status(employee.getStatus() != null ? employee.getStatus() : "UNKNOWN")
                    .photoUrl(employee.getPhotoUrl())
                    .hireDate(employee.getHireDate())
                    .monthlySalary(employee.getMonthlySalary())

                    // ✅ FIXED: Handle contract type properly
                    .contractType(employee.getJobPosition() != null && employee.getJobPosition().getContractType() != null ?
                            employee.getJobPosition().getContractType().name() : null)

                    // ✅ FIXED: No null check needed - method returns boolean primitive
                    .eligibleForPromotion(employee.isEligibleForPromotion())

                    // ✅ FIXED: No null check needed - method returns Integer primitive
                    .monthsSinceHire(employee.getMonthsSinceHire())

                    // ✅ FIXED: No null check needed - method returns Integer primitive
                    .monthsSinceLastPromotion(employee.getMonthsSinceLastPromotion())

                    // ✅ FIXED: No null check needed - method returns Integer primitive
                    .promotionCount(employee.getPromotionCount())

                    .siteName(employee.getSite() != null ? employee.getSite().getName() : null)
                    .build();

        } catch (Exception e) {
            logger.warn("Error converting employee {} to summary DTO: {}", employee.getId(), e.getMessage());
            // Return a basic DTO with available data
            return EmployeeSummaryDTO.builder()
                    .id(employee.getId())
                    .firstName(employee.getFirstName() != null ? employee.getFirstName() : "Unknown")
                    .lastName(employee.getLastName() != null ? employee.getLastName() : "Unknown")
                    .fullName(employee.getFullName() != null ? employee.getFullName() : "Unknown Employee")
                    .status("UNKNOWN")
                    .eligibleForPromotion(false)  // Default value
                    .monthsSinceHire(0)           // Default value
                    .monthsSinceLastPromotion(0L)  // Default value
                    .promotionCount(0)            // Default value
                    .build();
        }
    }

    /**
     * Get vacancy count for a position (simple implementation)
     */
    private int getVacancyCountForPosition(UUID jobPositionId) {
        try {
            Optional<JobPosition> positionOpt = jobPositionRepository.findById(jobPositionId);
            if (positionOpt.isPresent()) {
                JobPosition position = positionOpt.get();
                return position.getVacancies() != null ? position.getVacancies().size() : 0;
            }
            return 0;
        } catch (Exception e) {
            logger.warn("Could not get vacancy count for position {}: {}", jobPositionId, e.getMessage());
            return 0;
        }
    }

    /**
     * Get active vacancy count for a position (simple implementation)
     */
    private int getActiveVacancyCountForPosition(UUID jobPositionId) {
        try {
            Optional<JobPosition> positionOpt = jobPositionRepository.findById(jobPositionId);
            if (positionOpt.isPresent()) {
                JobPosition position = positionOpt.get();
                if (position.getVacancies() != null) {
                    return (int) position.getVacancies().stream()
                            .filter(v -> v.getStatus() != null && "OPEN".equals(v.getStatus()))
                            .count();
                }
            }
            return 0;
        } catch (Exception e) {
            logger.warn("Could not get active vacancy count for position {}: {}", jobPositionId, e.getMessage());
            return 0;
        }
    }

    /**
     * Get employee count for a position without loading full collections
     */
    private int getEmployeeCountForPosition(UUID jobPositionId) {
        try {
            JobPosition position = jobPositionRepository.findById(jobPositionId).orElse(null);
            if (position == null || position.getEmployees() == null) {
                return 0;
            }
            return position.getEmployees().size();
        } catch (Exception e) {
            logger.warn("Could not get employee count for position {}: {}", jobPositionId, e.getMessage());
            return 0;
        }
    }


    /**
     * Build comprehensive position analytics DTO
     */
    private PositionAnalyticsDTO buildPositionAnalytics(JobPosition jobPosition, List<EmployeeSummaryDTO> employees) {
        try {
            PositionAnalyticsDTO.PositionAnalyticsDTOBuilder builder = PositionAnalyticsDTO.builder();

            // ===============================
            // SALARY ANALYTICS
            // ===============================
            if (!employees.isEmpty()) {
                List<BigDecimal> salaries = employees.stream()
                        .map(EmployeeSummaryDTO::getMonthlySalary)
                        .filter(salary -> salary != null && salary.compareTo(BigDecimal.ZERO) > 0)
                        .collect(Collectors.toList());

                if (!salaries.isEmpty()) {
                    BigDecimal totalSalary = salaries.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
                    BigDecimal avgSalary = totalSalary.divide(BigDecimal.valueOf(salaries.size()), 2, RoundingMode.HALF_UP);
                    BigDecimal minSalary = Collections.min(salaries);
                    BigDecimal maxSalary = Collections.max(salaries);

                    builder.averageEmployeeSalary(avgSalary)
                            .minEmployeeSalary(minSalary)
                            .maxEmployeeSalary(maxSalary)
                            .totalPayroll(totalSalary);
                } else {
                    builder.averageEmployeeSalary(BigDecimal.ZERO)
                            .minEmployeeSalary(BigDecimal.ZERO)
                            .maxEmployeeSalary(BigDecimal.ZERO)
                            .totalPayroll(BigDecimal.ZERO);
                }
            } else {
                builder.averageEmployeeSalary(BigDecimal.ZERO)
                        .minEmployeeSalary(BigDecimal.ZERO)
                        .maxEmployeeSalary(BigDecimal.ZERO)
                        .totalPayroll(BigDecimal.ZERO);
            }

            // Position base salary
            BigDecimal positionBaseSalary = jobPosition.getBaseSalary() != null ?
                    BigDecimal.valueOf(jobPosition.getBaseSalary()) : BigDecimal.ZERO;
            builder.positionBaseSalary(positionBaseSalary);

            // ===============================
            // EMPLOYEE ANALYTICS
            // ===============================
            int totalEmployees = employees.size();
            int activeEmployees = (int) employees.stream()
                    .filter(e -> "ACTIVE".equals(e.getStatus()))
                    .count();
            int eligibleForPromotionCount = (int) employees.stream()
                    .filter(EmployeeSummaryDTO::getEligibleForPromotion)
                    .count();

            Double promotionEligibilityRate = totalEmployees > 0 ?
                    (double) eligibleForPromotionCount / totalEmployees * 100 : 0.0;

            Double averageMonthsInPosition = employees.stream()
                    .mapToLong(EmployeeSummaryDTO::getMonthsSinceLastPromotion)
                    .average().orElse(0.0);

            builder.totalEmployees(totalEmployees)
                    .activeEmployees(activeEmployees)
                    .eligibleForPromotionCount(eligibleForPromotionCount)
                    .promotionEligibilityRate(promotionEligibilityRate)
                    .averageMonthsInPosition(averageMonthsInPosition)
                    .employeeTurnoverRate(0.0); // You can calculate this if needed

            // ===============================
            // PROMOTION ANALYTICS
            // ===============================
            Double promotionRate = jobPosition.getPromotionRateFromPosition();
            Double avgTimeBeforePromotion = jobPosition.getAverageTimeBeforePromotion();
            BigDecimal avgSalaryIncrease = jobPosition.getAverageSalaryIncreaseFromPosition();

            int totalPromotionsFrom = jobPosition.getPromotionsFromThisPosition() != null ?
                    jobPosition.getPromotionsFromThisPosition().size() : 0;
            int totalPromotionsTo = jobPosition.getPromotionsToThisPosition() != null ?
                    jobPosition.getPromotionsToThisPosition().size() : 0;

            builder.promotionRate(promotionRate != null ? promotionRate : 0.0)
                    .averageTimeBeforePromotion(avgTimeBeforePromotion != null ? avgTimeBeforePromotion : 0.0)
                    .averageSalaryIncrease(avgSalaryIncrease != null ? avgSalaryIncrease : BigDecimal.ZERO)
                    .totalPromotionsFrom(totalPromotionsFrom)
                    .totalPromotionsTo(totalPromotionsTo)
                    .hasCareerProgression(totalPromotionsFrom > 0)
                    .isPromotionDestination(totalPromotionsTo > 0);

            // ===============================
            // DISTRIBUTION ANALYTICS
            // ===============================
            Map<String, Long> statusDistribution = employees.stream()
                    .collect(Collectors.groupingBy(
                            e -> e.getStatus() != null ? e.getStatus() : "UNKNOWN",
                            Collectors.counting()
                    ));

            Map<String, Long> contractTypeDistribution = employees.stream()
                    .filter(e -> e.getContractType() != null)
                    .collect(Collectors.groupingBy(
                            EmployeeSummaryDTO::getContractType,
                            Collectors.counting()
                    ));

            // Create experience level distribution
            Map<String, Long> experienceLevelDistribution = new HashMap<>();
            experienceLevelDistribution.put(jobPosition.getExperienceLevel() != null ?
                    jobPosition.getExperienceLevel() : "Unknown", (long) totalEmployees);

            // Department distribution
            Map<String, Long> departmentDistribution = new HashMap<>();
            String deptName = jobPosition.getDepartment() != null ?
                    jobPosition.getDepartment().getName() : "Unknown";
            departmentDistribution.put(deptName, (long) totalEmployees);

            builder.statusDistribution(statusDistribution)
                    .contractTypeDistribution(contractTypeDistribution)
                    .experienceLevelDistribution(experienceLevelDistribution)
                    .departmentDistribution(departmentDistribution);

            // ===============================
            // PERFORMANCE METRICS
            // ===============================
            // Calculate average performance rating if available
            Double avgPerformanceRating = employees.stream()
                    .map(EmployeeSummaryDTO::getPerformanceRating)
                    .filter(Objects::nonNull)
                    .mapToDouble(Double::doubleValue)
                    .average().orElse(0.0);

            // Vacancy metrics
            int vacanciesCreated = getVacancyCountForPosition(jobPosition.getId());
            int vacanciesFilled = totalEmployees; // Assuming filled = current employees
            Double vacancyFillRate = vacanciesCreated > 0 ?
                    (double) vacanciesFilled / vacanciesCreated * 100 : 0.0;

            builder.averagePerformanceRating(avgPerformanceRating)
                    .positionsFilledLastYear(0) // You can calculate this if needed
                    .vacanciesCreated(vacanciesCreated)
                    .vacanciesFilled(vacanciesFilled)
                    .vacancyFillRate(vacancyFillRate);

            // ===============================
            // VALIDATION & HEALTH
            // ===============================
            Boolean isValidConfiguration = jobPosition.isValidConfiguration();
            List<String> validationIssues = new ArrayList<>();
            List<String> recommendations = new ArrayList<>();

            if (!isValidConfiguration) {
                validationIssues.add("Position configuration is incomplete or invalid");
                recommendations.add("Review and complete all required fields for this contract type");
            }

            if (!jobPosition.getActive()) {
                validationIssues.add("Position is currently inactive");
                recommendations.add("Activate position to make it available for hiring");
            }

            if (totalEmployees == 0) {
                validationIssues.add("No employees currently assigned to this position");
                recommendations.add("Consider recruiting for this position or reviewing its necessity");
            }

            if (jobPosition.getBaseSalary() == null || jobPosition.getBaseSalary() <= 0) {
                validationIssues.add("No salary information configured");
                recommendations.add("Set up appropriate salary structure for this position");
            }

            builder.isValidConfiguration(isValidConfiguration)
                    .validationIssueCount(validationIssues.size())
                    .validationIssues(validationIssues)
                    .recommendations(recommendations);

            return builder.build();

        } catch (Exception e) {
            logger.warn("Could not build position analytics for position {}: {}", jobPosition.getId(), e.getMessage());
            // Return empty analytics
            return PositionAnalyticsDTO.builder()
                    .averageEmployeeSalary(BigDecimal.ZERO)
                    .minEmployeeSalary(BigDecimal.ZERO)
                    .maxEmployeeSalary(BigDecimal.ZERO)
                    .totalPayroll(BigDecimal.ZERO)
                    .positionBaseSalary(BigDecimal.ZERO)
                    .totalEmployees(0)
                    .activeEmployees(0)
                    .eligibleForPromotionCount(0)
                    .promotionEligibilityRate(0.0)
                    .averageMonthsInPosition(0.0)
                    .employeeTurnoverRate(0.0)
                    .promotionRate(0.0)
                    .averageTimeBeforePromotion(0.0)
                    .averageSalaryIncrease(BigDecimal.ZERO)
                    .totalPromotionsFrom(0)
                    .totalPromotionsTo(0)
                    .hasCareerProgression(false)
                    .isPromotionDestination(false)
                    .statusDistribution(new HashMap<>())
                    .contractTypeDistribution(new HashMap<>())
                    .experienceLevelDistribution(new HashMap<>())
                    .departmentDistribution(new HashMap<>())
                    .averagePerformanceRating(0.0)
                    .positionsFilledLastYear(0)
                    .vacanciesCreated(0)
                    .vacanciesFilled(0)
                    .vacancyFillRate(0.0)
                    .isValidConfiguration(false)
                    .validationIssueCount(0)
                    .validationIssues(Collections.emptyList())
                    .recommendations(Collections.emptyList())
                    .build();
        }
    }


}


// ======================================
// DETAILS DTO
// ======================================

