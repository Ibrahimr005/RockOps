package com.example.backend.services.hr;

import com.example.backend.dto.hr.employee.EmployeeDistributionDTO;
import com.example.backend.dto.hr.employee.EmployeeRequestDTO;
import com.example.backend.dto.hr.SalaryStatisticsDTO;
import com.example.backend.models.notification.NotificationType;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import com.example.backend.services.MinioService;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.site.Site;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.hr.JobPositionRepository;
import com.example.backend.repositories.site.SiteRepository;
import com.example.backend.services.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class HREmployeeService {

    // Subfolder in MinIO bucket for employee images
    private static final String EMPLOYEE_IMAGES_FOLDER = "employees";
    private final EmployeeRepository employeeRepository;
    private final SiteRepository siteRepository;
    private final JobPositionRepository jobPositionRepository;
    private final WarehouseRepository warehouseRepository;
    private final MinioService minioService;
    private final NotificationService notificationService;
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;

    /**
     * Calculate and retrieve salary statistics
     */
    public SalaryStatisticsDTO getSalaryStatistics() {
        try {
            List<Employee> employees = employeeRepository.findAll();

            BigDecimal totalSalary = BigDecimal.ZERO;
            BigDecimal minSalary = BigDecimal.valueOf(Double.MAX_VALUE);
            BigDecimal maxSalary = BigDecimal.ZERO;
            Map<String, BigDecimal> departmentSalaries = new HashMap<>();
            Map<String, Integer> departmentCounts = new HashMap<>();

            for (Employee employee : employees) {
                BigDecimal monthlySalary = employee.getMonthlySalary();
                totalSalary = totalSalary.add(monthlySalary);

                if (monthlySalary.compareTo(minSalary) < 0) {
                    minSalary = monthlySalary;
                }
                if (monthlySalary.compareTo(maxSalary) > 0) {
                    maxSalary = monthlySalary;
                }

                if (employee.getJobPosition() != null && employee.getJobPosition().getDepartment() != null) {
                    String deptName = employee.getJobPosition().getDepartment().getName();
                    departmentSalaries.merge(deptName, monthlySalary, BigDecimal::add);
                    departmentCounts.merge(deptName, 1, Integer::sum);
                }
            }

            int employeeCount = employees.size();
            BigDecimal avgSalary = employeeCount > 0 ?
                    totalSalary.divide(BigDecimal.valueOf(employeeCount), 2, RoundingMode.HALF_UP) :
                    BigDecimal.ZERO;

            Map<String, BigDecimal> departmentAverages = new HashMap<>();
            departmentSalaries.forEach((dept, total) -> {
                int count = departmentCounts.get(dept);
                departmentAverages.put(dept,
                        total.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP));
            });

            return SalaryStatisticsDTO.builder()
                    .totalSalaries(totalSalary)
                    .averageSalary(avgSalary)
                    .minSalary(minSalary)
                    .maxSalary(maxSalary)
                    .employeeCount(employeeCount)
                    .departmentAverageSalaries(departmentAverages)
                    .build();

        } catch (Exception e) {
            log.error("Error calculating salary statistics", e);

            notificationService.sendNotificationToHRUsers(
                    "Salary Statistics Error",
                    "Failed to calculate salary statistics: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/employees/statistics",
                    "salary-stats-error-" + System.currentTimeMillis()
            );

            throw e;
        }
    }

    /**
     * Get employee distribution by site
     */
    public List<EmployeeDistributionDTO> getEmployeeDistribution() {
        try {
            List<Employee> employees = employeeRepository.findAll();
            Map<String, Map<String, Integer>> distribution = new HashMap<>();

            for (Employee employee : employees) {
                if (employee.getJobPosition() != null && employee.getJobPosition().getDepartment() != null) {
                    String deptName = employee.getJobPosition().getDepartment().getName();
                    String contractType = employee.getJobPosition().getContractType().name();

                    distribution.computeIfAbsent(deptName, k -> new HashMap<>())
                            .merge(contractType, 1, Integer::sum);
                }
            }

            List<EmployeeDistributionDTO> result = new ArrayList<>();
            distribution.forEach((dept, contractCounts) -> {
                EmployeeDistributionDTO dto = EmployeeDistributionDTO.builder()
                        .departmentCounts(contractCounts)
                        .totalEmployees(contractCounts.values().stream().mapToInt(Integer::intValue).sum())
                        .build();
                result.add(dto);
            });

            return result;

        } catch (Exception e) {
            log.error("Error calculating employee distribution", e);

            notificationService.sendNotificationToHRUsers(
                    "Employee Distribution Error",
                    "Failed to calculate employee distribution: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/employees/distribution",
                    "distribution-error-" + System.currentTimeMillis()
            );

            throw e;
        }
    }

    /**
     * Add a new employee with photos
     */
    @Transactional
    public Map<String, Object> addEmployee(
            EmployeeRequestDTO employeeData,
            MultipartFile photo,
            MultipartFile idFrontImage,
            MultipartFile idBackImage) {
        try {
            log.info("Starting employee creation for: {}", employeeData.getFirstName() + " " + employeeData.getLastName());

            Employee employee = new Employee();
            updateEmployeeFromDTO(employee, employeeData);

            // Set job position if provided
            JobPosition jobPosition = null;
            if (employeeData.getJobPositionId() != null) {
                jobPosition = jobPositionRepository.findById(employeeData.getJobPositionId())
                        .orElseThrow(() -> new RuntimeException("Job position not found"));
                employee.setJobPosition(jobPosition);
            }

            // Set site if provided
            if (employeeData.getSiteId() != null) {
                Site site = siteRepository.findById(employeeData.getSiteId())
                        .orElseThrow(() -> new RuntimeException("Site not found"));
                employee.setSite(site);
            }

            // Save the employee entity
            Employee savedEmployee = employeeRepository.save(employee);
            log.info("Successfully saved employee with ID: {}", savedEmployee.getId());

            // Send notifications about new employee
            String employeeName = savedEmployee.getFirstName() + " " + savedEmployee.getLastName();
            String departmentName = jobPosition != null && jobPosition.getDepartment() != null ?
                    jobPosition.getDepartment().getName() : "General";
            String positionName = jobPosition != null ? jobPosition.getPositionName() : "Unassigned";

            // Main HR notification
            notificationService.sendNotificationToHRUsers(
                    "New Employee Added",
                    "New employee " + employeeName + " has been added as " + positionName + " in " + departmentName,
                    NotificationType.SUCCESS,
                    "/employees/" + savedEmployee.getId(),
                    "new-employee-" + savedEmployee.getId()
            );

            // Department-specific notifications
            if (jobPosition != null && jobPosition.getDepartment() != null) {
                // Send to department managers
                notificationService.sendNotificationToHRUsers(
                        "New Team Member - " + departmentName,
                        "👋 " + employeeName + " has joined " + departmentName + " as " + positionName,
                        NotificationType.INFO,
                        "/employees/" + savedEmployee.getId(),
                        "new-team-member-" + savedEmployee.getId()
                );

                // Special notifications for specific departments
                String deptLower = departmentName.toLowerCase();
                if (deptLower.contains("warehouse")) {
                    notificationService.sendNotificationToWarehouseUsers(
                            "New Warehouse Team Member",
                            employeeName + " has joined the warehouse team as " + positionName,
                            NotificationType.INFO,
                            "/employees/" + savedEmployee.getId(),
                            "new-warehouse-employee-" + savedEmployee.getId()
                    );
                } else if (deptLower.contains("finance")) {
                    notificationService.sendNotificationToFinanceUsers(
                            "New Finance Team Member",
                            employeeName + " has joined the finance team as " + positionName,
                            NotificationType.INFO,
                            "/employees/" + savedEmployee.getId(),
                            "new-finance-employee-" + savedEmployee.getId()
                    );
                }
            }

            // Check for onboarding requirements
            if (savedEmployee.getHireDate() != null) {
                LocalDate today = LocalDate.now();
                if (savedEmployee.getHireDate().isAfter(today) || savedEmployee.getHireDate().isEqual(today)) {
                    notificationService.sendNotificationToHRUsers(
                            "Employee Onboarding Required",
                            "📋 " + employeeName + " requires onboarding. Start date: " + savedEmployee.getHireDate(),
                            NotificationType.WARNING,
                            "/employees/" + savedEmployee.getId() + "/onboarding",
                            "onboarding-required-" + savedEmployee.getId()
                    );
                }
            }

            // Convert employee to Map with proper URLs (to return in the response)
            return convertEmployeeToMap(savedEmployee);

        } catch (Exception e) {
            log.error("Error creating employee: ", e);

            notificationService.sendNotificationToHRUsers(
                    "Employee Creation Failed",
                    "Failed to create new employee: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/employees",
                    "employee-creation-error-" + System.currentTimeMillis()
            );

            throw e;
        }
    }

    /**
     * Update an existing employee
     */
    @Transactional
    public Map<String, Object> updateEmployee(
            UUID id,
            EmployeeRequestDTO employeeData,
            MultipartFile photo,
            MultipartFile idFrontImage,
            MultipartFile idBackImage) {

        try {
            // Find existing employee
            Employee existingEmployee = employeeRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Employee not found"));

            String oldEmployeeName = existingEmployee.getFirstName() + " " + existingEmployee.getLastName();
            String oldStatus = existingEmployee.getStatus();
            JobPosition oldJobPosition = existingEmployee.getJobPosition();
            Site oldSite = existingEmployee.getSite();

            // Store existing image URLs before update
            String existingPhotoUrl = existingEmployee.getPhotoUrl();
            String existingIdFrontUrl = existingEmployee.getIdFrontImage();
            String existingIdBackUrl = existingEmployee.getIdBackImage();

            // Update employee data
            updateEmployeeFromDTO(existingEmployee, employeeData);

            // Update site if provided in the request
            if (employeeData.getSiteId() != null) {
                Site site = siteRepository.findById(employeeData.getSiteId())
                        .orElseThrow(() -> new RuntimeException("Site not found with ID: " + employeeData.getSiteId()));
                existingEmployee.setSite(site);
            }

            // Handle image URLs: if new URLs are provided in DTO, use them; otherwise keep existing
            if (employeeData.getPhotoUrl() != null && !employeeData.getPhotoUrl().trim().isEmpty()) {
                existingEmployee.setPhotoUrl(employeeData.getPhotoUrl());
            } else {
                existingEmployee.setPhotoUrl(existingPhotoUrl);
            }

            if (employeeData.getIdFrontImage() != null && !employeeData.getIdFrontImage().trim().isEmpty()) {
                existingEmployee.setIdFrontImage(employeeData.getIdFrontImage());
            } else {
                existingEmployee.setIdFrontImage(existingIdFrontUrl);
            }

            if (employeeData.getIdBackImage() != null && !employeeData.getIdBackImage().trim().isEmpty()) {
                existingEmployee.setIdBackImage(employeeData.getIdBackImage());
            } else {
                existingEmployee.setIdBackImage(existingIdBackUrl);
            }

            // Update job position if provided
            if (employeeData.getJobPositionId() != null) {
                JobPosition jobPosition = jobPositionRepository.findById(employeeData.getJobPositionId())
                        .orElseThrow(() -> new RuntimeException("Job position not found"));
                existingEmployee.setJobPosition(jobPosition);
            }

            // Save updated employee
            Employee updatedEmployee = employeeRepository.save(existingEmployee);

            // Send notifications for significant changes
            sendEmployeeUpdateNotifications(updatedEmployee, oldEmployeeName, oldStatus, oldJobPosition, oldSite);

            // Return response as Map
            return convertEmployeeToMap(updatedEmployee);

        } catch (Exception e) {
            log.error("Error updating employee: ", e);

            notificationService.sendNotificationToHRUsers(
                    "Employee Update Failed",
                    "Failed to update employee: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/employees/" + id,
                    "employee-update-error-" + id
            );

            throw e;
        }
    }

    /**
     * Send notifications for employee updates
     */
    private void sendEmployeeUpdateNotifications(Employee employee, String oldEmployeeName,
                                                 String oldStatus, JobPosition oldJobPosition, Site oldSite) {
        String currentEmployeeName = employee.getFirstName() + " " + employee.getLastName();

        // Name change
        if (!currentEmployeeName.equals(oldEmployeeName)) {
            notificationService.sendNotificationToHRUsers(
                    "Employee Name Updated",
                    "Employee name changed from '" + oldEmployeeName + "' to '" + currentEmployeeName + "'",
                    NotificationType.INFO,
                    "/employees/" + employee.getId(),
                    "name-change-" + employee.getId()
            );
        }

        // Status change
        if (!employee.getStatus().equals(oldStatus)) {
            NotificationType notificationType = getNotificationTypeForStatus(employee.getStatus());

            notificationService.sendNotificationToHRUsers(
                    "Employee Status Changed",
                    currentEmployeeName + " status changed from " + oldStatus + " to " + employee.getStatus(),
                    notificationType,
                    "/employees/" + employee.getId(),
                    "status-change-" + employee.getId()
            );

            // Special handling for termination
            if ("TERMINATED".equalsIgnoreCase(employee.getStatus()) || "RESIGNED".equalsIgnoreCase(employee.getStatus())) {
                notificationService.sendNotificationToHRUsers(
                        "Employee Departure",
                        "⚠️ " + currentEmployeeName + " has left the company (" + employee.getStatus() + "). Exit procedures may be required.",
                        NotificationType.ERROR,
                        "/employees/" + employee.getId() + "/exit",
                        "departure-" + employee.getId()
                );
            }
        }

        // Job position change
        if ((oldJobPosition == null && employee.getJobPosition() != null) ||
                (oldJobPosition != null && !oldJobPosition.equals(employee.getJobPosition()))) {

            String oldPositionName = oldJobPosition != null ? oldJobPosition.getPositionName() : "Unassigned";
            String newPositionName = employee.getJobPosition() != null ? employee.getJobPosition().getPositionName() : "Unassigned";

            notificationService.sendNotificationToHRUsers(
                    "Employee Position Changed",
                    currentEmployeeName + " moved from " + oldPositionName + " to " + newPositionName,
                    NotificationType.INFO,
                    "/employees/" + employee.getId(),
                    "position-change-" + employee.getId()
            );

            // Department change notification
            String oldDeptName = oldJobPosition != null && oldJobPosition.getDepartment() != null ?
                    oldJobPosition.getDepartment().getName() : "No Department";
            String newDeptName = employee.getJobPosition() != null && employee.getJobPosition().getDepartment() != null ?
                    employee.getJobPosition().getDepartment().getName() : "No Department";

            if (!oldDeptName.equals(newDeptName)) {
                notificationService.sendNotificationToHRUsers(
                        "Employee Department Transfer",
                        "🔄 " + currentEmployeeName + " transferred from " + oldDeptName + " to " + newDeptName,
                        NotificationType.WARNING,
                        "/employees/" + employee.getId(),
                        "dept-transfer-" + employee.getId()
                );
            }
        }

        // Site change
        if ((oldSite == null && employee.getSite() != null) ||
                (oldSite != null && !oldSite.equals(employee.getSite()))) {

            String oldSiteName = oldSite != null ? oldSite.getName() : "No Site";
            String newSiteName = employee.getSite() != null ? employee.getSite().getName() : "No Site";

            notificationService.sendNotificationToHRUsers(
                    "Employee Site Assignment Changed",
                    currentEmployeeName + " site assignment changed from " + oldSiteName + " to " + newSiteName,
                    NotificationType.INFO,
                    "/employees/" + employee.getId(),
                    "site-change-" + employee.getId()
            );
        }
    }

    /**
     * Get notification type based on employee status
     */
    private NotificationType getNotificationTypeForStatus(String status) {
        switch (status.toUpperCase()) {
            case "ACTIVE":
                return NotificationType.SUCCESS;
            case "INACTIVE":
            case "ON_LEAVE":
                return NotificationType.WARNING;
            case "TERMINATED":
            case "RESIGNED":
                return NotificationType.ERROR;
            default:
                return NotificationType.INFO;
        }
    }

    /**
     * Get employee by ID
     */
    public Map<String, Object> getEmployeeById(UUID id) {
        try {
            Employee employee = employeeRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Employee not found"));

            return convertEmployeeToMap(employee);
        } catch (Exception e) {
            log.error("Error retrieving employee: ", e);
            throw e;
        }
    }

    /**
     * Delete employee by ID
     */
    @Transactional
    public void deleteEmployee(UUID id) {
        try {
            log.info("Starting employee deletion for ID: {}", id);

            Employee employee = employeeRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Employee not found"));

            String employeeName = employee.getFirstName() + " " + employee.getLastName();
            String departmentName = employee.getJobPosition() != null && employee.getJobPosition().getDepartment() != null ?
                    employee.getJobPosition().getDepartment().getName() : "General";

            // Delete images from MinIO
            try {
                if (employee.getPhotoUrl() != null) {
                    minioService.deleteFile(employee.getPhotoUrl());
                }

                if (employee.getIdFrontImage() != null) {
                    minioService.deleteFile(employee.getIdFrontImage());
                }

                if (employee.getIdBackImage() != null) {
                    minioService.deleteFile(employee.getIdBackImage());
                }
            } catch (Exception e) {
                log.error("Error deleting employee images", e);
                // Continue with employee deletion even if image deletion fails
            }

            employeeRepository.delete(employee);
            log.info("Successfully deleted employee with ID: {}", id);

            // Send notifications about employee deletion
            notificationService.sendNotificationToHRUsers(
                    "Employee Record Deleted",
                    "Employee record for " + employeeName + " from " + departmentName + " has been permanently deleted",
                    NotificationType.ERROR,
                    "/employees",
                    "employee-deleted-" + id
            );

            // Send warning about data loss
            notificationService.sendNotificationToHRUsers(
                    "Employee Data Permanently Removed",
                    "⚠️ All data for " + employeeName + " has been permanently removed from the system. This action cannot be undone.",
                    NotificationType.ERROR,
                    "/employees",
                    "data-loss-warning-" + id
            );

        } catch (Exception e) {
            log.error("Error deleting employee: ", e);

            notificationService.sendNotificationToHRUsers(
                    "Employee Deletion Failed",
                    "Failed to delete employee: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/employees/" + id,
                    "employee-delete-error-" + id
            );

            throw e;
        }
    }

    /**
     * Convert Employee entity to Map
     */
    private Map<String, Object> convertEmployeeToMap(Employee employee) {
        Map<String, Object> employeeMap = new HashMap<>();

        // Basic information
        employeeMap.put("id", employee.getId());
        employeeMap.put("firstName", employee.getFirstName());
        employeeMap.put("lastName", employee.getLastName());
        employeeMap.put("middleName", employee.getMiddleName());
        employeeMap.put("fullName", employee.getFullName());
        employeeMap.put("email", employee.getEmail());
        employeeMap.put("phoneNumber", employee.getPhoneNumber());
        employeeMap.put("address", employee.getAddress());
        employeeMap.put("city", employee.getCity());
        employeeMap.put("country", employee.getCountry());
        // Format dates as ISO strings
        employeeMap.put("birthDate", employee.getBirthDate() != null ? employee.getBirthDate().toString() : null);
        employeeMap.put("hireDate", employee.getHireDate() != null ? employee.getHireDate().toString() : null);
        employeeMap.put("maritalStatus", employee.getMaritalStatus());
        employeeMap.put("militaryStatus", employee.getMilitaryStatus());
        employeeMap.put("nationalIDNumber", employee.getNationalIDNumber());
        employeeMap.put("gender", employee.getGender());
        employeeMap.put("status", employee.getStatus());
        employeeMap.put("education", employee.getEducation());
        employeeMap.put("photoUrl", employee.getPhotoUrl());
        employeeMap.put("idFrontImage", employee.getIdFrontImage());
        employeeMap.put("idBackImage", employee.getIdBackImage());

        // Salary information
        employeeMap.put("baseSalaryOverride", employee.getBaseSalaryOverride());
        employeeMap.put("salaryMultiplier", employee.getSalaryMultiplier());
        employeeMap.put("monthlySalary", employee.getMonthlySalary());
        employeeMap.put("annualTotalCompensation", employee.getAnnualTotalCompensation());

        // Job position information
        if (employee.getJobPosition() != null) {
            JobPosition jobPosition = employee.getJobPosition();
            Map<String, Object> jobPositionMap = new HashMap<>();
            jobPositionMap.put("id", jobPosition.getId());
            jobPositionMap.put("positionName", jobPosition.getPositionName());
            jobPositionMap.put("contractType", jobPosition.getContractType().name());
            jobPositionMap.put("experienceLevel", jobPosition.getExperienceLevel());
            jobPositionMap.put("baseSalary", jobPosition.getBaseSalary());

            // Department information
            if (jobPosition.getDepartment() != null) {
                Map<String, Object> departmentMap = new HashMap<>();
                departmentMap.put("id", jobPosition.getDepartment().getId());
                departmentMap.put("name", jobPosition.getDepartment().getName());
                jobPositionMap.put("department", departmentMap);
            }

            // Contract-specific fields
            switch (jobPosition.getContractType()) {
                case HOURLY:
                    jobPositionMap.put("workingDaysPerWeek", jobPosition.getWorkingDaysPerWeek());
                    jobPositionMap.put("hoursPerShift", jobPosition.getHoursPerShift());
                    jobPositionMap.put("hourlyRate", jobPosition.getHourlyRate());
                    jobPositionMap.put("overtimeMultiplier", jobPosition.getOvertimeMultiplier());
                    jobPositionMap.put("trackBreaks", jobPosition.getTrackBreaks());
                    jobPositionMap.put("breakDurationMinutes", jobPosition.getBreakDurationMinutes());
                    break;
                case DAILY:
                    jobPositionMap.put("workingDaysPerMonth", jobPosition.getWorkingDaysPerMonth());
                    jobPositionMap.put("dailyRate", jobPosition.getDailyRate());
                    jobPositionMap.put("includesWeekends", jobPosition.getIncludesWeekends());
                    break;
                case MONTHLY:
                    jobPositionMap.put("monthlyBaseSalary", jobPosition.getMonthlyBaseSalary());
                    jobPositionMap.put("workingHours", jobPosition.getWorkingHours());
                    jobPositionMap.put("shifts", jobPosition.getShifts());
                    jobPositionMap.put("vacations", jobPosition.getVacations());
                    break;
            }

            employeeMap.put("jobPosition", jobPositionMap);
        }

        // Site information
        if (employee.getSite() != null) {
            Map<String, Object> siteMap = new HashMap<>();
            siteMap.put("id", employee.getSite().getId());
            siteMap.put("name", employee.getSite().getName());
            employeeMap.put("site", siteMap);
        }

        return employeeMap;
    }

    /**
     * Generate a unique file name for an employee image
     */
    private String generateImageFileName(UUID employeeId, String imageType, String originalFilename) {
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }

        return employeeId + "/" + imageType + "_" + System.currentTimeMillis() + extension;
    }

    /**
     * Map DTO to entity
     */
    private Employee mapToEntity(EmployeeRequestDTO dto) {
        Employee employee = new Employee();

        // Set basic personal details
        employee.setFirstName(dto.getFirstName());
        employee.setLastName(dto.getLastName());
        employee.setMiddleName(dto.getMiddleName());
        employee.setEmail(dto.getEmail());
        employee.setPhoneNumber(dto.getPhoneNumber());
        employee.setAddress(dto.getAddress());
        employee.setCity(dto.getCity());
        employee.setCountry(dto.getCountry());

        // Handle dates
        if (dto.getBirthDate() != null && !dto.getBirthDate().trim().isEmpty()) {
            employee.setBirthDate(LocalDate.parse(dto.getBirthDate(), DATE_FORMATTER));
        }
        if (dto.getHireDate() != null && !dto.getHireDate().trim().isEmpty()) {
            employee.setHireDate(LocalDate.parse(dto.getHireDate(), DATE_FORMATTER));
        }

        employee.setMaritalStatus(dto.getMaritalStatus());
        employee.setMilitaryStatus(dto.getMilitaryStatus());
        employee.setNationalIDNumber(dto.getNationalIDNumber());
        employee.setGender(dto.getGender());
        employee.setStatus(dto.getStatus());
        employee.setEducation(dto.getEducation());
        employee.setPhotoUrl(dto.getPhotoUrl());
        employee.setIdFrontImage(dto.getIdFrontImage());
        employee.setIdBackImage(dto.getIdBackImage());

        // Set job position
        if (dto.getJobPositionId() != null) {
            JobPosition jobPosition = jobPositionRepository.findById(dto.getJobPositionId())
                    .orElseThrow(() -> new RuntimeException("Job position not found"));
            employee.setJobPosition(jobPosition);
        }

        return employee;
    }

    /**
     * Update entity from DTO
     */
    private void updateEmployeeFromDTO(Employee employee, EmployeeRequestDTO dto) {
        employee.setFirstName(dto.getFirstName());
        employee.setLastName(dto.getLastName());
        employee.setMiddleName(dto.getMiddleName());
        employee.setEmail(dto.getEmail());
        employee.setPhoneNumber(dto.getPhoneNumber());
        employee.setAddress(dto.getAddress());
        employee.setCity(dto.getCity());
        employee.setCountry(dto.getCountry());

        // Handle dates
        if (dto.getBirthDate() != null && !dto.getBirthDate().trim().isEmpty()) {
            employee.setBirthDate(LocalDate.parse(dto.getBirthDate(), DATE_FORMATTER));
        }
        if (dto.getHireDate() != null && !dto.getHireDate().trim().isEmpty()) {
            employee.setHireDate(LocalDate.parse(dto.getHireDate(), DATE_FORMATTER));
        }

        employee.setMaritalStatus(dto.getMaritalStatus());
        employee.setMilitaryStatus(dto.getMilitaryStatus());
        employee.setNationalIDNumber(dto.getNationalIDNumber());
        employee.setGender(dto.getGender());
        employee.setStatus(dto.getStatus());
        employee.setEducation(dto.getEducation());

        // Only update image URLs if they are not null (preserve existing images)
        if (dto.getPhotoUrl() != null) {
            employee.setPhotoUrl(dto.getPhotoUrl());
        }
        if (dto.getIdFrontImage() != null) {
            employee.setIdFrontImage(dto.getIdFrontImage());
        }
        if (dto.getIdBackImage() != null) {
            employee.setIdBackImage(dto.getIdBackImage());
        }

        // Handle salary overrides
        if (dto.getBaseSalaryOverride() != null) {
            employee.setBaseSalaryOverride(dto.getBaseSalaryOverride());
        }
    }
}