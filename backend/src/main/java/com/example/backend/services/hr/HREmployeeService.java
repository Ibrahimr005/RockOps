package com.example.backend.services.hr;

import com.example.backend.dto.hr.EmployeeDistributionDTO;
import com.example.backend.dto.hr.EmployeeRequestDTO;
import com.example.backend.dto.hr.SalaryStatisticsDTO;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import com.example.backend.services.MinioService;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.site.Site;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.hr.JobPositionRepository;
import com.example.backend.repositories.site.SiteRepository;
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
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;

    /**
     * Calculate and retrieve salary statistics
     */
    public SalaryStatisticsDTO getSalaryStatistics() {
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
    }

    /**
     * Get employee distribution by site
     */
    public List<EmployeeDistributionDTO> getEmployeeDistribution() {
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
            log.info("Starting employee creation");
            Employee employee = new Employee();
            updateEmployeeFromDTO(employee, employeeData);
            
            // Set job position if provided
            if (employeeData.getJobPositionId() != null) {
                JobPosition jobPosition = jobPositionRepository.findById(employeeData.getJobPositionId())
                        .orElseThrow(() -> new RuntimeException("Job position not found"));
                employee.setJobPosition(jobPosition);
            }

            // Save the employee entity (with updated image URLs)
            Employee savedEmployee = employeeRepository.save(employee);
            log.info("Successfully saved employee with ID: {}", savedEmployee.getId());
            // Convert employee to Map with proper URLs (to return in the response)
            return convertEmployeeToMap(savedEmployee);
        } catch (Exception e) {
            log.error("Error creating employee: ", e);
            throw e;  // Re-throw the exception or handle accordingly
        }
    }

    /**
     * Update an existing employee
     */
    public Map<String, Object> updateEmployee(
            UUID id,
            EmployeeRequestDTO employeeData,
            MultipartFile photo,
            MultipartFile idFrontImage,
            MultipartFile idBackImage) {

        try {
            log.info("Starting employee update for ID: {}", id);

            // Find existing employee
            Employee existingEmployee = employeeRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Employee not found"));

            // Update employee data
            updateEmployeeFromDTO(existingEmployee, employeeData);

            // Update site if provided in the request
            if (employeeData.getSiteId() != null) {
                Site site = siteRepository.findById(employeeData.getSiteId())
                        .orElseThrow(() -> new RuntimeException("Site not found with ID: " + employeeData.getSiteId()));
                existingEmployee.setSite(site);
                log.info("Updated site directly from request: {}", site.getName());
            }

            // Update photo if provided
            if (photo != null && !photo.isEmpty()) {
                String photoFileName = generateImageFileName(id, "photo", photo.getOriginalFilename());
                try {
                    minioService.uploadFile(photo, EMPLOYEE_IMAGES_FOLDER + "/" + photoFileName);
                    existingEmployee.setPhotoUrl(EMPLOYEE_IMAGES_FOLDER + "/" + photoFileName);
                } catch (Exception e) {
                    log.error("Error updating employee photo", e);
                    throw new RuntimeException("Failed to update employee photo: " + e.getMessage());
                }
            }

            // Update ID front image if provided
            if (idFrontImage != null && !idFrontImage.isEmpty()) {
                String idFrontFileName = generateImageFileName(id, "id_front", idFrontImage.getOriginalFilename());
                try {
                    minioService.uploadFile(idFrontImage, EMPLOYEE_IMAGES_FOLDER + "/" + idFrontFileName);
                    existingEmployee.setIdFrontImage(EMPLOYEE_IMAGES_FOLDER + "/" + idFrontFileName);
                } catch (Exception e) {
                    log.error("Error updating ID front image", e);
                    throw new RuntimeException("Failed to update ID front image: " + e.getMessage());
                }
            }

            // Update ID back image if provided
            if (idBackImage != null && !idBackImage.isEmpty()) {
                String idBackFileName = generateImageFileName(id, "id_back", idBackImage.getOriginalFilename());
                try {
                    minioService.uploadFile(idBackImage, EMPLOYEE_IMAGES_FOLDER + "/" + idBackFileName);
                    existingEmployee.setIdBackImage(EMPLOYEE_IMAGES_FOLDER + "/" + idBackFileName);
                } catch (Exception e) {
                    log.error("Error updating ID back image", e);
                    throw new RuntimeException("Failed to update ID back image: " + e.getMessage());
                }
            }

            // Update job position if provided
            if (employeeData.getJobPositionId() != null) {
                JobPosition jobPosition = jobPositionRepository.findById(employeeData.getJobPositionId())
                        .orElseThrow(() -> new RuntimeException("Job position not found"));
                existingEmployee.setJobPosition(jobPosition);
            }

            // Save updated employee
            Employee updatedEmployee = employeeRepository.save(existingEmployee);
            log.info("Successfully updated employee with ID: {}", updatedEmployee.getId());

            // Return response as Map
            return convertEmployeeToMap(updatedEmployee);

        } catch (Exception e) {
            log.error("Error updating employee: ", e);
            throw e;
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
    public void deleteEmployee(UUID id) {
        try {
            log.info("Starting employee deletion for ID: {}", id);

            Employee employee = employeeRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Employee not found"));

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
        } catch (Exception e) {
            log.error("Error deleting employee: ", e);
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
        employee.setPhotoUrl(dto.getPhotoUrl());
        employee.setIdFrontImage(dto.getIdFrontImage());
        employee.setIdBackImage(dto.getIdBackImage());

        // Handle salary overrides
        if (dto.getBaseSalaryOverride() != null) {
            employee.setBaseSalaryOverride(dto.getBaseSalaryOverride());
        }
    }
}