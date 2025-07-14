package com.example.backend.services.hr;

import com.example.backend.dto.hr.JobPositionDTO;
import com.example.backend.models.hr.Department;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.notification.NotificationType;
import com.example.backend.repositories.hr.DepartmentRepository;
import com.example.backend.repositories.hr.JobPositionRepository;
import com.example.backend.repositories.site.SiteRepository;
import com.example.backend.services.notification.NotificationService;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
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
}