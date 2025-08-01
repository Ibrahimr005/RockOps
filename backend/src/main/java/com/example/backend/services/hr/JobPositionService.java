package com.example.backend.services.hr;

import com.example.backend.dto.hr.EmployeeSummaryDTO;
import com.example.backend.dto.hr.JobPositionDTO;
import com.example.backend.dto.hr.JobPositionDetailsDTO;
import com.example.backend.dto.hr.PositionAnalyticsDTO;
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
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

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
    @Transactional
    public JobPositionDTO createJobPosition(JobPositionDTO jobPositionDTO) {
        try {
            // Find the department if a department name is provided
            Department department = null;
            if (jobPositionDTO.getDepartment() != null) {
                department = departmentRepository.findByName(jobPositionDTO.getDepartment())
                        .orElseThrow(() -> new RuntimeException("Department not found: " + jobPositionDTO.getDepartment()));
            }

            // Set active to true by default if not provided
            if (jobPositionDTO.getActive() == null) {
                jobPositionDTO.setActive(true);
            }

            // Create new job position
            JobPosition jobPosition = new JobPosition();

            // Set basic fields from DTO
            jobPosition.setPositionName(jobPositionDTO.getPositionName());
            jobPosition.setDepartment(department);
            jobPosition.setHead(jobPositionDTO.getHead());
            jobPosition.setProbationPeriod(jobPositionDTO.getProbationPeriod());
            jobPosition.setContractType(jobPositionDTO.getContractType());
            jobPosition.setExperienceLevel(jobPositionDTO.getExperienceLevel());
            jobPosition.setActive(jobPositionDTO.getActive());

            // Set contract type specific fields
            switch (jobPositionDTO.getContractType()) {
                case HOURLY:
                    jobPosition.setWorkingDaysPerWeek(jobPositionDTO.getWorkingDaysPerWeek());
                    jobPosition.setHoursPerShift(jobPositionDTO.getHoursPerShift());
                    jobPosition.setHourlyRate(jobPositionDTO.getHourlyRate());
                    jobPosition.setOvertimeMultiplier(jobPositionDTO.getOvertimeMultiplier());
                    jobPosition.setTrackBreaks(jobPositionDTO.getTrackBreaks());
                    jobPosition.setBreakDurationMinutes(jobPositionDTO.getBreakDurationMinutes());
                    // Set baseSalary for backward compatibility
                    jobPosition.setBaseSalary(jobPositionDTO.getBaseSalary());
                    break;
                case DAILY:
                    jobPosition.setDailyRate(jobPositionDTO.getDailyRate());
                    jobPosition.setWorkingDaysPerMonth(jobPositionDTO.getWorkingDaysPerMonth());
                    jobPosition.setIncludesWeekends(jobPositionDTO.getIncludesWeekends());
                    // Set baseSalary for backward compatibility
                    jobPosition.setBaseSalary(jobPositionDTO.getBaseSalary());
                    break;
                case MONTHLY:
                    jobPosition.setMonthlyBaseSalary(jobPositionDTO.getMonthlyBaseSalary());
                    jobPosition.setWorkingDaysPerMonth(jobPositionDTO.getWorkingDaysPerMonth());
                    jobPosition.setShifts(jobPositionDTO.getShifts());
                    jobPosition.setWorkingHours(jobPositionDTO.getWorkingHours());
                    jobPosition.setVacations(jobPositionDTO.getVacations());

                    // Set time fields for MONTHLY contracts
                    jobPosition.setStartTime(jobPositionDTO.getStartTime());
                    jobPosition.setEndTime(jobPositionDTO.getEndTime());

                    // Set baseSalary for backward compatibility
                    jobPosition.setBaseSalary(jobPositionDTO.getBaseSalary());
                    break;
            }

            // Save the entity
            JobPosition savedJobPosition = jobPositionRepository.save(jobPosition);

            // Send notifications about new job position
            String departmentName = department != null ? department.getName() : "General";

            notificationService.sendNotificationToHRUsers(
                    "New Job Position Created",
                    "Job position '" + savedJobPosition.getPositionName() + "' has been created in " + departmentName + " department",
                    NotificationType.SUCCESS,
                    "/job-positions/" + savedJobPosition.getId(),
                    "new-job-position-" + savedJobPosition.getId()
            );

            // Send department-specific notification if applicable
            if (department != null) {
                // Check if it's a leadership position
                if (isLeadershipPosition(savedJobPosition.getPositionName())) {
                    notificationService.sendNotificationToHRUsers(
                            "Leadership Position Created",
                            "🎯 Leadership position '" + savedJobPosition.getPositionName() + "' created in " + departmentName,
                            NotificationType.INFO,
                            "/job-positions/" + savedJobPosition.getId(),
                            "leadership-position-" + savedJobPosition.getId()
                    );
                }

                // Check if it's a driver position (auto-created by equipment)
                if (savedJobPosition.getPositionName().toLowerCase().contains("driver")) {
                    notificationService.sendNotificationToHRUsers(
                            "Driver Position Available",
                            "New driver position '" + savedJobPosition.getPositionName() + "' is now available for recruitment",
                            NotificationType.INFO,
                            "/job-positions/" + savedJobPosition.getId(),
                            "driver-position-" + savedJobPosition.getId()
                    );
                }
            }

            // Convert back to DTO and return
            return convertToDTO(savedJobPosition);

        } catch (Exception e) {
            logger.error("Error creating job position", e);

            notificationService.sendNotificationToHRUsers(
                    "Job Position Creation Failed",
                    "Failed to create job position: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/job-positions",
                    "job-position-error-" + System.currentTimeMillis()
            );

            throw e;
        }
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
            // Find the existing job position
            JobPosition existingJobPosition = jobPositionRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Job position not found with id: " + id));

            String oldPositionName = existingJobPosition.getPositionName();
            String oldDepartmentName = existingJobPosition.getDepartment() != null ?
                    existingJobPosition.getDepartment().getName() : null;
            Boolean oldActiveStatus = existingJobPosition.getActive();

            // Update department if provided
            if (jobPositionDTO.getDepartment() != null) {
                Department department = departmentRepository.findByName(jobPositionDTO.getDepartment())
                        .orElseThrow(() -> new RuntimeException("Department not found: " + jobPositionDTO.getDepartment()));
                existingJobPosition.setDepartment(department);
            }

            // Update basic fields if provided
            if (jobPositionDTO.getPositionName() != null) {
                existingJobPosition.setPositionName(jobPositionDTO.getPositionName());
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

            // Update contract type specific fields
            if (jobPositionDTO.getContractType() != null) {
                switch (jobPositionDTO.getContractType()) {
                    case HOURLY:
                        if (jobPositionDTO.getWorkingDaysPerWeek() != null) {
                            existingJobPosition.setWorkingDaysPerWeek(jobPositionDTO.getWorkingDaysPerWeek());
                        }
                        if (jobPositionDTO.getHoursPerShift() != null) {
                            existingJobPosition.setHoursPerShift(jobPositionDTO.getHoursPerShift());
                        }
                        if (jobPositionDTO.getHourlyRate() != null) {
                            existingJobPosition.setHourlyRate(jobPositionDTO.getHourlyRate());
                        }
                        if (jobPositionDTO.getOvertimeMultiplier() != null) {
                            existingJobPosition.setOvertimeMultiplier(jobPositionDTO.getOvertimeMultiplier());
                        }
                        if (jobPositionDTO.getTrackBreaks() != null) {
                            existingJobPosition.setTrackBreaks(jobPositionDTO.getTrackBreaks());
                        }
                        if (jobPositionDTO.getBreakDurationMinutes() != null) {
                            existingJobPosition.setBreakDurationMinutes(jobPositionDTO.getBreakDurationMinutes());
                        }
                        break;
                    case DAILY:
                        if (jobPositionDTO.getDailyRate() != null) {
                            existingJobPosition.setDailyRate(jobPositionDTO.getDailyRate());
                        }
                        if (jobPositionDTO.getWorkingDaysPerMonth() != null) {
                            existingJobPosition.setWorkingDaysPerMonth(jobPositionDTO.getWorkingDaysPerMonth());
                        }
                        if (jobPositionDTO.getIncludesWeekends() != null) {
                            existingJobPosition.setIncludesWeekends(jobPositionDTO.getIncludesWeekends());
                        }
                        break;
                    case MONTHLY:
                        if (jobPositionDTO.getMonthlyBaseSalary() != null) {
                            existingJobPosition.setMonthlyBaseSalary(jobPositionDTO.getMonthlyBaseSalary());
                        }
                        if (jobPositionDTO.getWorkingDaysPerMonth() != null) {
                            existingJobPosition.setWorkingDaysPerMonth(jobPositionDTO.getWorkingDaysPerMonth());
                        }
                        if (jobPositionDTO.getShifts() != null) {
                            existingJobPosition.setShifts(jobPositionDTO.getShifts());
                        }
                        if (jobPositionDTO.getWorkingHours() != null) {
                            existingJobPosition.setWorkingHours(jobPositionDTO.getWorkingHours());
                        }
                        if (jobPositionDTO.getVacations() != null) {
                            existingJobPosition.setVacations(jobPositionDTO.getVacations());
                        }

                        // Update time fields for MONTHLY contracts
                        if (jobPositionDTO.getStartTime() != null) {
                            existingJobPosition.setStartTime(jobPositionDTO.getStartTime());
                        }
                        if (jobPositionDTO.getEndTime() != null) {
                            existingJobPosition.setEndTime(jobPositionDTO.getEndTime());
                        }
                        break;
                }
            }

            // Save the updated entity
            JobPosition updatedJobPosition = jobPositionRepository.save(existingJobPosition);

            // Send notifications about significant changes
            sendJobPositionUpdateNotifications(updatedJobPosition, oldPositionName, oldDepartmentName, oldActiveStatus);

            // Convert back to DTO and return
            return convertToDTO(updatedJobPosition);

        } catch (Exception e) {
            logger.error("Error updating job position", e);

            notificationService.sendNotificationToHRUsers(
                    "Job Position Update Failed",
                    "Failed to update job position: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/job-positions/" + id,
                    "job-position-update-error-" + id
            );

            throw e;
        }
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
                    "/job-positions/" + jobPosition.getId(),
                    "position-renamed-" + jobPosition.getId()
            );
        }

        // Department change
        if (!currentDepartmentName.equals(oldDepartmentName)) {
            notificationService.sendNotificationToHRUsers(
                    "Job Position Department Changed",
                    "'" + jobPosition.getPositionName() + "' moved from " + oldDepartmentName + " to " + currentDepartmentName,
                    NotificationType.INFO,
                    "/job-positions/" + jobPosition.getId(),
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
                        "/job-positions/" + jobPosition.getId(),
                        "position-activated-" + jobPosition.getId()
                );
            } else {
                notificationService.sendNotificationToHRUsers(
                        "Job Position Deactivated",
                        "Job position '" + jobPosition.getPositionName() + "' has been deactivated",
                        NotificationType.WARNING,
                        "/job-positions/" + jobPosition.getId(),
                        "position-deactivated-" + jobPosition.getId()
                );

                // Check if there are employees in this position
                int employeeCount = jobPosition.getEmployees() != null ? jobPosition.getEmployees().size() : 0;
                if (employeeCount > 0) {
                    notificationService.sendNotificationToHRUsers(
                            "Deactivated Position Has Employees",
                            "⚠️ Deactivated position '" + jobPosition.getPositionName() + "' still has " + employeeCount + " employee(s) assigned",
                            NotificationType.WARNING,
                            "/job-positions/" + jobPosition.getId() + "/employees",
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
                        "/job-positions/" + id,
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
                    "/job-positions/" + id,
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
     * Get employees by job position ID
     */
    public List<Employee> getEmployeesByJobPositionId(UUID jobPositionId) {
        JobPosition jobPosition = getJobPositionById(jobPositionId);
        return jobPosition.getEmployees();
    }

    /**
     * Create job position from Map (original method for backward compatibility)
     */
    @Transactional
    public JobPosition createJobPosition(Map<String, Object> jobPositionMap) {
        JobPosition jobPosition = new JobPosition();

        // Set basic fields
        if (jobPositionMap.containsKey("positionName")) {
            jobPosition.setPositionName((String) jobPositionMap.get("positionName"));
        }
        if (jobPositionMap.containsKey("department")) {
            String departmentName = (String) jobPositionMap.get("department");
            Department department = departmentRepository.findByName(departmentName)
                    .orElseThrow(() -> new RuntimeException("Department not found: " + departmentName));
            jobPosition.setDepartment(department);
        }
        if (jobPositionMap.containsKey("head")) {
            jobPosition.setHead((String) jobPositionMap.get("head"));
        }
        if (jobPositionMap.containsKey("baseSalary")) {
            Object salaryObj = jobPositionMap.get("baseSalary");
            try {
                if (salaryObj instanceof Integer) {
                    jobPosition.setBaseSalary(((Integer) salaryObj).doubleValue());
                } else if (salaryObj instanceof Double) {
                    jobPosition.setBaseSalary((Double) salaryObj);
                } else if (salaryObj instanceof String) {
                    jobPosition.setBaseSalary(Double.parseDouble((String) salaryObj));
                }
            } catch (NumberFormatException e) {
                throw new RuntimeException("Invalid base salary format");
            }
        }
        if (jobPositionMap.containsKey("probationPeriod")) {
            try {
                Object probationObj = jobPositionMap.get("probationPeriod");
                if (probationObj instanceof Integer) {
                    jobPosition.setProbationPeriod((Integer) probationObj);
                } else if (probationObj instanceof String) {
                    jobPosition.setProbationPeriod(Integer.parseInt((String) probationObj));
                }
            } catch (NumberFormatException e) {
                throw new RuntimeException("Invalid probation period format");
            }
        }
        if (jobPositionMap.containsKey("contractType")) {
            String contractType = (String) jobPositionMap.get("contractType");
            try {
                jobPosition.setContractType(JobPosition.ContractType.valueOf(contractType.toUpperCase()));
            } catch (IllegalArgumentException e) {
                throw new RuntimeException("Invalid contract type: " + contractType);
            }
        }
        if (jobPositionMap.containsKey("experienceLevel")) {
            jobPosition.setExperienceLevel((String) jobPositionMap.get("experienceLevel"));
        }
        if (jobPositionMap.containsKey("active")) {
            jobPosition.setActive((Boolean) jobPositionMap.get("active"));
        } else {
            jobPosition.setActive(true);
        }

        // Set contract type specific fields
        JobPosition.ContractType contractType = jobPosition.getContractType();
        if (contractType != null) {
            switch (contractType) {
                case HOURLY:
                    setHourlyFields(jobPosition, jobPositionMap);
                    break;
                case DAILY:
                    setDailyFields(jobPosition, jobPositionMap);
                    break;
                case MONTHLY:
                    setMonthlyFields(jobPosition, jobPositionMap);
                    break;
            }
        }

        JobPosition savedJobPosition = jobPositionRepository.save(jobPosition);

        // Send notification about creation
        String departmentName = savedJobPosition.getDepartment() != null ?
                savedJobPosition.getDepartment().getName() : "General";

        notificationService.sendNotificationToHRUsers(
                "New Job Position Created",
                "Job position '" + savedJobPosition.getPositionName() + "' has been created in " + departmentName + " department",
                NotificationType.SUCCESS,
                "/job-positions/" + savedJobPosition.getId(),
                "new-job-position-" + savedJobPosition.getId()
        );

        return savedJobPosition;
    }

    private void setHourlyFields(JobPosition jobPosition, Map<String, Object> jobPositionMap) {
        if (jobPositionMap.containsKey("workingDaysPerWeek")) {
            try {
                Object daysObj = jobPositionMap.get("workingDaysPerWeek");
                if (daysObj instanceof Integer) {
                    jobPosition.setWorkingDaysPerWeek((Integer) daysObj);
                } else if (daysObj instanceof String) {
                    jobPosition.setWorkingDaysPerWeek(Integer.parseInt((String) daysObj));
                }
            } catch (NumberFormatException e) {
                throw new RuntimeException("Invalid working days per week format");
            }
        }
        if (jobPositionMap.containsKey("hoursPerShift")) {
            try {
                Object hoursObj = jobPositionMap.get("hoursPerShift");
                if (hoursObj instanceof Integer) {
                    jobPosition.setHoursPerShift((Integer) hoursObj);
                } else if (hoursObj instanceof String) {
                    jobPosition.setHoursPerShift(Integer.parseInt((String) hoursObj));
                }
            } catch (NumberFormatException e) {
                throw new RuntimeException("Invalid hours per shift format");
            }
        }
        if (jobPositionMap.containsKey("hourlyRate")) {
            try {
                Object rateObj = jobPositionMap.get("hourlyRate");
                if (rateObj instanceof Integer) {
                    jobPosition.setHourlyRate(((Integer) rateObj).doubleValue());
                } else if (rateObj instanceof Double) {
                    jobPosition.setHourlyRate((Double) rateObj);
                } else if (rateObj instanceof String) {
                    jobPosition.setHourlyRate(Double.parseDouble((String) rateObj));
                }
            } catch (NumberFormatException e) {
                throw new RuntimeException("Invalid hourly rate format");
            }
        }
        if (jobPositionMap.containsKey("overtimeMultiplier")) {
            try {
                Object multiplierObj = jobPositionMap.get("overtimeMultiplier");
                if (multiplierObj instanceof Integer) {
                    jobPosition.setOvertimeMultiplier(((Integer) multiplierObj).doubleValue());
                } else if (multiplierObj instanceof Double) {
                    jobPosition.setOvertimeMultiplier((Double) multiplierObj);
                } else if (multiplierObj instanceof String) {
                    jobPosition.setOvertimeMultiplier(Double.parseDouble((String) multiplierObj));
                }
            } catch (NumberFormatException e) {
                throw new RuntimeException("Invalid overtime multiplier format");
            }
        }
        if (jobPositionMap.containsKey("trackBreaks")) {
            jobPosition.setTrackBreaks((Boolean) jobPositionMap.get("trackBreaks"));
        }
        if (jobPositionMap.containsKey("breakDurationMinutes")) {
            try {
                Object minutesObj = jobPositionMap.get("breakDurationMinutes");
                if (minutesObj instanceof Integer) {
                    jobPosition.setBreakDurationMinutes((Integer) minutesObj);
                } else if (minutesObj instanceof String) {
                    jobPosition.setBreakDurationMinutes(Integer.parseInt((String) minutesObj));
                }
            } catch (NumberFormatException e) {
                throw new RuntimeException("Invalid break duration format");
            }
        }
    }

    private void setDailyFields(JobPosition jobPosition, Map<String, Object> jobPositionMap) {
        if (jobPositionMap.containsKey("dailyRate")) {
            try {
                Object rateObj = jobPositionMap.get("dailyRate");
                if (rateObj instanceof Integer) {
                    jobPosition.setDailyRate(((Integer) rateObj).doubleValue());
                } else if (rateObj instanceof Double) {
                    jobPosition.setDailyRate((Double) rateObj);
                } else if (rateObj instanceof String) {
                    jobPosition.setDailyRate(Double.parseDouble((String) rateObj));
                }
            } catch (NumberFormatException e) {
                throw new RuntimeException("Invalid daily rate format");
            }
        }
        if (jobPositionMap.containsKey("workingDaysPerMonth")) {
            try {
                Object daysObj = jobPositionMap.get("workingDaysPerMonth");
                if (daysObj instanceof Integer) {
                    jobPosition.setWorkingDaysPerMonth((Integer) daysObj);
                } else if (daysObj instanceof String) {
                    jobPosition.setWorkingDaysPerMonth(Integer.parseInt((String) daysObj));
                }
            } catch (NumberFormatException e) {
                throw new RuntimeException("Invalid working days per month format");
            }
        }
        if (jobPositionMap.containsKey("includesWeekends")) {
            jobPosition.setIncludesWeekends((Boolean) jobPositionMap.get("includesWeekends"));
        }
    }

    private void setMonthlyFields(JobPosition jobPosition, Map<String, Object> jobPositionMap) {
        if (jobPositionMap.containsKey("monthlyBaseSalary")) {
            try {
                Object salaryObj = jobPositionMap.get("monthlyBaseSalary");
                if (salaryObj instanceof Integer) {
                    jobPosition.setMonthlyBaseSalary(((Integer) salaryObj).doubleValue());
                } else if (salaryObj instanceof Double) {
                    jobPosition.setMonthlyBaseSalary((Double) salaryObj);
                } else if (salaryObj instanceof String) {
                    jobPosition.setMonthlyBaseSalary(Double.parseDouble((String) salaryObj));
                }
            } catch (NumberFormatException e) {
                throw new RuntimeException("Invalid monthly base salary format");
            }
        }
        if (jobPositionMap.containsKey("shifts")) {
            jobPosition.setShifts((String) jobPositionMap.get("shifts"));
        }
        if (jobPositionMap.containsKey("workingHours")) {
            try {
                Object hoursObj = jobPositionMap.get("workingHours");
                if (hoursObj instanceof Integer) {
                    jobPosition.setWorkingHours((Integer) hoursObj);
                } else if (hoursObj instanceof String) {
                    jobPosition.setWorkingHours(Integer.parseInt((String) hoursObj));
                }
            } catch (NumberFormatException e) {
                throw new RuntimeException("Invalid working hours format");
            }
        }
        if (jobPositionMap.containsKey("vacations")) {
            jobPosition.setVacations((String) jobPositionMap.get("vacations"));
        }

        // Handle time fields
        if (jobPositionMap.containsKey("startTime")) {
            try {
                Object startTimeObj = jobPositionMap.get("startTime");
                if (startTimeObj instanceof String) {
                    jobPosition.setStartTime(LocalTime.parse((String) startTimeObj));
                }
            } catch (DateTimeParseException e) {
                throw new RuntimeException("Invalid start time format. Use HH:mm format");
            }
        }
        if (jobPositionMap.containsKey("endTime")) {
            try {
                Object endTimeObj = jobPositionMap.get("endTime");
                if (endTimeObj instanceof String) {
                    jobPosition.setEndTime(LocalTime.parse((String) endTimeObj));
                }
            } catch (DateTimeParseException e) {
                throw new RuntimeException("Invalid end time format. Use HH:mm format");
            }
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
            }
        } else {
            stats.put("numberOfEmployees", 0);
        }

        return stats;
    }

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

        // Combine all statistical data
        analytics.put("basic", convertToDTO(jobPosition));
        analytics.put("promotionStats", jobPosition.getPromotionStatistics());
        analytics.put("salaryStats", getSalaryStatistics(id));
        analytics.put("validation", getPositionValidation(id));

        // Additional analytics
        analytics.put("employeeCount", jobPosition.getEmployees() != null ? jobPosition.getEmployees().size() : 0);
        analytics.put("vacancyCount", jobPosition.getVacancies() != null ? jobPosition.getVacancies().size() : 0);
        analytics.put("departmentName", jobPosition.getDepartment() != null ? jobPosition.getDepartment().getName() : null);
        analytics.put("createdDate", jobPosition.getId()); // Assuming timestamp in UUID, or add actual timestamp field

        // Performance metrics
        analytics.put("promotionRate", jobPosition.getPromotionRateFromPosition());
        analytics.put("averageTimeBeforePromotion", jobPosition.getAverageTimeBeforePromotion());
        analytics.put("averageSalaryIncrease", jobPosition.getAverageSalaryIncreaseFromPosition());

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
    public Map<String, Object> getEmployeeAnalytics(UUID id) {
        List<Employee> employees = getEmployeesByJobPositionId(id);
        Map<String, Object> analytics = new HashMap<>();

        if (employees.isEmpty()) {
            analytics.put("totalEmployees", 0);
            analytics.put("eligibleForPromotion", 0);
            analytics.put("averageMonthsInPosition", 0.0);
            analytics.put("promotionRate", 0.0);
            return analytics;
        }

        // Basic counts
        analytics.put("totalEmployees", employees.size());

        // Promotion eligibility
        long eligibleCount = employees.stream()
                .filter(Employee::isEligibleForPromotion)
                .count();
        analytics.put("eligibleForPromotion", eligibleCount);
        analytics.put("promotionEligibilityRate", (double) eligibleCount / employees.size() * 100);

        // Average time in position
        double avgMonthsInPosition = employees.stream()
                .mapToLong(Employee::getMonthsSinceLastPromotion)
                .average()
                .orElse(0.0);
        analytics.put("averageMonthsInPosition", avgMonthsInPosition);

        // Salary analytics
        List<Employee> employeesWithSalary = employees.stream()
                .filter(emp -> emp.getMonthlySalary() != null && emp.getMonthlySalary().compareTo(BigDecimal.ZERO) > 0)
                .collect(Collectors.toList());

        if (!employeesWithSalary.isEmpty()) {
            BigDecimal totalSalary = employeesWithSalary.stream()
                    .map(Employee::getMonthlySalary)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal avgSalary = totalSalary.divide(BigDecimal.valueOf(employeesWithSalary.size()), 2, RoundingMode.HALF_UP);

            BigDecimal minSalary = employeesWithSalary.stream()
                    .map(Employee::getMonthlySalary)
                    .min(BigDecimal::compareTo)
                    .orElse(BigDecimal.ZERO);

            BigDecimal maxSalary = employeesWithSalary.stream()
                    .map(Employee::getMonthlySalary)
                    .max(BigDecimal::compareTo)
                    .orElse(BigDecimal.ZERO);

            analytics.put("averageSalary", avgSalary.doubleValue());
            analytics.put("minSalary", minSalary.doubleValue());
            analytics.put("maxSalary", maxSalary.doubleValue());
            analytics.put("totalPayroll", totalSalary.doubleValue());
        }

        // Status distribution
        Map<String, Long> statusDistribution = employees.stream()
                .collect(Collectors.groupingBy(
                        emp -> emp.getStatus() != null ? emp.getStatus() : "ACTIVE",
                        Collectors.counting()
                ));
        analytics.put("statusDistribution", statusDistribution);

        // Contract type distribution
        Map<String, Long> contractDistribution = employees.stream()
                .filter(emp -> emp.getJobPosition() != null)
                .collect(Collectors.groupingBy(
                        emp -> emp.getJobPosition().getContractType().name(),
                        Collectors.counting()
                ));
        analytics.put("contractTypeDistribution", contractDistribution);

        // Promotion statistics
        int totalPromotions = employees.stream()
                .mapToInt(Employee::getPromotionCount)
                .sum();
        analytics.put("totalPromotionsFromPosition", totalPromotions);

        long employeesWithPromotions = employees.stream()
                .filter(emp -> emp.getPromotionCount() > 0)
                .count();

        if (employees.size() > 0) {
            analytics.put("employeePromotionRate", (double) employeesWithPromotions / employees.size() * 100);
        }

        return analytics;
    }

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
// 1. FIXED: getJobPositionDetailsDTO method with corrected field names
// ===============================

    @Transactional()
    public JobPositionDetailsDTO getJobPositionDetailsDTO(UUID id) {
        logger.info("🔍 Starting getJobPositionDetailsDTO for id: {}", id);

        try {
            // Step 1: Get basic job position with department
            logger.debug("📋 Step 1: Fetching basic job position with department");
            JobPosition jobPosition = jobPositionRepository.findByIdWithDepartment(id)
                    .orElseThrow(() -> new RuntimeException("Job position not found with id: " + id));

            logger.info("✅ Job position found: {} ({})", jobPosition.getPositionName(), jobPosition.getContractType());

            // Step 2: Build the comprehensive DTO
            logger.debug("🏗️ Step 2: Building DTO");
            JobPositionDetailsDTO.JobPositionDetailsDTOBuilder builder = JobPositionDetailsDTO.builder();

            // ===============================
            // OVERVIEW DATA
            // ===============================
            logger.debug("📊 Building overview data");
            try {
                builder.id(jobPosition.getId())
                        .positionName(jobPosition.getPositionName())
                        .department(jobPosition.getDepartment())
                        .departmentName(jobPosition.getDepartment() != null ? jobPosition.getDepartment().getName() : null)
                        .head(jobPosition.getHead())
                        .baseSalary(jobPosition.getBaseSalary())
                        .probationPeriod(jobPosition.getProbationPeriod())
                        .contractType(jobPosition.getContractType())
                        .experienceLevel(jobPosition.getExperienceLevel())
                        .active(jobPosition.getActive());

                // Contract-specific fields
                builder.workingDaysPerWeek(jobPosition.getWorkingDaysPerWeek())
                        .hoursPerShift(jobPosition.getHoursPerShift())
                        .hourlyRate(jobPosition.getHourlyRate())
                        .overtimeMultiplier(jobPosition.getOvertimeMultiplier())
                        .trackBreaks(jobPosition.getTrackBreaks())
                        .breakDurationMinutes(jobPosition.getBreakDurationMinutes())
                        .dailyRate(jobPosition.getDailyRate())
                        .workingDaysPerMonth(jobPosition.getWorkingDaysPerMonth())
                        .includesWeekends(jobPosition.getIncludesWeekends())
                        .monthlyBaseSalary(jobPosition.getMonthlyBaseSalary())
                        .shifts(jobPosition.getShifts())
                        .workingHours(jobPosition.getWorkingHours())
                        .vacations(jobPosition.getVacations())
                        .startTime(jobPosition.getStartTime())
                        .endTime(jobPosition.getEndTime());

                // Working time range - safely handle this
                try {
                    builder.workingTimeRange(jobPosition.getWorkingTimeRange());
                } catch (Exception e) {
                    logger.warn("⚠️ Could not get working time range: {}", e.getMessage());
                    builder.workingTimeRange(null);
                }

                // Calculated fields - safely handle these
                try {
                    builder.calculatedMonthlySalary(jobPosition.calculateMonthlySalary())
                            .calculatedDailySalary(jobPosition.calculateDailySalary())
                            .isValidConfiguration(jobPosition.isValidConfiguration())
                            .isHighLevelPosition(jobPosition.isHighLevelPosition());
                } catch (Exception e) {
                    logger.warn("⚠️ Could not calculate derived fields: {}", e.getMessage());
                    builder.calculatedMonthlySalary(0.0)
                            .calculatedDailySalary(0.0)
                            .isValidConfiguration(false)
                            .isHighLevelPosition(false);
                }

                logger.debug("✅ Overview data built successfully");

            } catch (Exception e) {
                logger.error("❌ Error building overview data: {}", e.getMessage(), e);
                throw new RuntimeException("Failed to build overview data: " + e.getMessage());
            }

            // ===============================
            // EMPLOYEES DATA
            // ===============================
            logger.debug("👥 Building employees data");
            List<EmployeeSummaryDTO> employees = Collections.emptyList();
            try {
                employees = getEmployeeSummariesForPosition(id);
                logger.info("✅ Found {} employees", employees.size());

                builder.employees(employees)
                        .totalEmployeeCount(employees.size())
                        .activeEmployeeCount((int) employees.stream()
                                .filter(e -> e != null && "ACTIVE".equals(e.getStatus())).count())
                        .inactiveEmployeeCount((int) employees.stream()
                                .filter(e -> e != null && !"ACTIVE".equals(e.getStatus())).count())
                        .eligibleForPromotionEmployees(employees.stream()
                                .filter(e -> e != null && Boolean.TRUE.equals(e.getEligibleForPromotion()))
                                .collect(Collectors.toList()));

            } catch (Exception e) {
                logger.error("❌ Error building employees data: {}", e.getMessage(), e);
                // Use empty data instead of failing
                builder.employees(Collections.emptyList())
                        .totalEmployeeCount(0)
                        .activeEmployeeCount(0)
                        .inactiveEmployeeCount(0)
                        .eligibleForPromotionEmployees(Collections.emptyList());
            }

            // ===============================
            // ANALYTICS DATA
            // ===============================
            logger.debug("📈 Building analytics data");
            PositionAnalyticsDTO analytics = null;
            try {
                analytics = buildPositionAnalytics(jobPosition, employees);
                builder.analytics(analytics);
                logger.debug("✅ Analytics data built successfully");
            } catch (Exception e) {
                logger.error("❌ Error building analytics data: {}", e.getMessage(), e);
                // Create minimal analytics data
                analytics = PositionAnalyticsDTO.builder()
                        .averageEmployeeSalary(BigDecimal.ZERO)
                        .minEmployeeSalary(BigDecimal.ZERO)
                        .maxEmployeeSalary(BigDecimal.ZERO)
                        .totalPayroll(BigDecimal.ZERO)
                        .positionBaseSalary(BigDecimal.valueOf(jobPosition.getBaseSalary() != null ? jobPosition.getBaseSalary() : 0))
                        .totalEmployees(employees.size())
                        .activeEmployees(0)
                        .eligibleForPromotionCount(0)
                        .promotionEligibilityRate(0.0)
                        .averageMonthsInPosition(0.0)
                        .statusDistribution(new HashMap<>())
                        .contractTypeDistribution(new HashMap<>())
                        .isValidConfiguration(true)
                        .validationIssueCount(0)
                        .validationIssues(Collections.emptyList())
                        .recommendations(Collections.emptyList())
                        .build();
                builder.analytics(analytics);
            }

            // ===============================
            // PROMOTIONS DATA
            // ===============================
            logger.debug("🚀 Building promotions data");
            PositionPromotionsDTO promotions = null;
            try {
                promotions = buildPositionPromotions(jobPosition);
                builder.promotions(promotions);
                logger.debug("✅ Promotions data built successfully");
            } catch (Exception e) {
                logger.error("❌ Error building promotions data: {}", e.getMessage(), e);
                // Create minimal promotions data
                promotions = PositionPromotionsDTO.builder()
                        .totalPromotionsFrom(0L)
                        .totalPromotionsTo(0L)
                        .pendingPromotionsFromCount(0L)
                        .pendingPromotionsToCount(0L)
                        .implementedPromotionsFrom(0L)
                        .implementedPromotionsTo(0L)
                        .rejectedPromotionsFrom(0L)
                        .rejectedPromotionsTo(0L)
                        .averageSalaryIncrease(BigDecimal.ZERO)
                        .averageTimeBeforePromotion(0.0)
                        .promotionRate(0.0)
                        .promotionSuccessRate(0.0)
                        .hasCareerProgression(false)
                        .isPromotionDestination(false)
                        .topPromotionDestinations(new HashMap<>())
                        .commonPromotionSources(new HashMap<>())
                        .promotionsFromList(Collections.emptyList())
                        .promotionsToList(Collections.emptyList())
                        .pendingPromotionsFromList(Collections.emptyList())
                        .pendingPromotionsToList(Collections.emptyList())
                        .recentPromotions(Collections.emptyList())
                        .careerPathSuggestions(Collections.emptyList())
                        .promotionDestinations(Collections.emptyList())
                        .promotionSources(Collections.emptyList())
                        .promotionsLastYear(0L)
                        .promotionsLastQuarter(0L)
                        .promotionsThisMonth(0L)
                        .build();
                builder.promotions(promotions);
            }

            // ===============================
            // SUMMARY COUNTS
            // ===============================
            logger.debug("🔢 Building summary counts");
            try {
                int vacancyCount = getVacancyCountForPosition(id);
                int activeVacancyCount = getActiveVacancyCountForPosition(id);

                int totalPromotionsCount = 0;
                int pendingPromotionsCount = 0;

                if (promotions != null) {
                    totalPromotionsCount = (promotions.getTotalPromotionsFrom() != null ? promotions.getTotalPromotionsFrom().intValue() : 0) +
                            (promotions.getTotalPromotionsTo() != null ? promotions.getTotalPromotionsTo().intValue() : 0);
                    pendingPromotionsCount = (promotions.getPendingPromotionsFromCount() != null ? promotions.getPendingPromotionsFromCount().intValue() : 0) +
                            (promotions.getPendingPromotionsToCount() != null ? promotions.getPendingPromotionsToCount().intValue() : 0);
                }

                builder.vacancyCount(vacancyCount)
                        .activeVacancyCount(activeVacancyCount)
                        .totalPromotionsCount(totalPromotionsCount)
                        .pendingPromotionsCount(pendingPromotionsCount);

                logger.debug("✅ Summary counts: vacancies={}, activeVacancies={}, promotions={}, pending={}",
                        vacancyCount, activeVacancyCount, totalPromotionsCount, pendingPromotionsCount);

            } catch (Exception e) {
                logger.error("❌ Error building summary counts: {}", e.getMessage(), e);
                // Use zero counts
                builder.vacancyCount(0)
                        .activeVacancyCount(0)
                        .totalPromotionsCount(0)
                        .pendingPromotionsCount(0);
            }

            // Build and return
            logger.info("🎉 Successfully built JobPositionDetailsDTO for position: {}", jobPosition.getPositionName());
            return builder.build();

        } catch (Exception e) {
            logger.error("💥 Fatal error in getJobPositionDetailsDTO for id {}: {}", id, e.getMessage(), e);
            throw new RuntimeException("Failed to create job position details: " + e.getMessage(), e);
        }
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

// ===============================
// 2. FIXED: getEmployeeSummariesForPosition method (no changes needed, but improved error handling)
// ===============================

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

// ===============================
// 3. FIXED: convertToEmployeeSummary method (improved with better null handling)
// ===============================

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

// ===============================
// 4. MISSING HELPER METHODS - Add these to your JobPositionService
// ===============================

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

            // Create experience level distribution (you might need to add this field to EmployeeSummaryDTO)
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