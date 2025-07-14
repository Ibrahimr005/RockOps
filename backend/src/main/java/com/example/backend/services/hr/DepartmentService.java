package com.example.backend.services.hr;

import com.example.backend.models.hr.Department;
import com.example.backend.models.notification.NotificationType;
import com.example.backend.repositories.hr.DepartmentRepository;
import com.example.backend.services.notification.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class DepartmentService {

    private static final Logger logger = LoggerFactory.getLogger(DepartmentService.class);

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private NotificationService notificationService;

    /**
     * Get all departments as Map objects
     */
    public List<Map<String, Object>> getAllDepartmentsAsMap() {
        try {
            logger.info("Fetching departments from repository...");
            List<Department> departments = departmentRepository.findAll();
            logger.info("Found {} departments", departments.size());

            return departments.stream()
                    .map(this::convertDepartmentToMap)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            logger.error("Error in getAllDepartmentsAsMap: ", e);

            // Send error notification to HR users
            notificationService.sendNotificationToHRUsers(
                    "Department Fetch Error",
                    "Failed to retrieve departments: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/departments",
                    "department-fetch-error-" + System.currentTimeMillis()
            );

            throw new RuntimeException("Failed to fetch departments: " + e.getMessage());
        }
    }

    /**
     * Get department by ID as Map
     */
    public Map<String, Object> getDepartmentByIdAsMap(UUID id) {
        try {
            logger.info("Fetching department by id: {}", id);
            Optional<Department> departmentOpt = departmentRepository.findById(id);
            if (departmentOpt.isPresent()) {
                return convertDepartmentToMap(departmentOpt.get());
            }
            return null;
        } catch (Exception e) {
            logger.error("Error in getDepartmentByIdAsMap: ", e);

            notificationService.sendNotificationToHRUsers(
                    "Department Retrieval Error",
                    "Failed to fetch department: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/departments/" + id,
                    "department-get-error-" + id
            );

            throw new RuntimeException("Failed to fetch department: " + e.getMessage());
        }
    }

    /**
     * Create department from Map
     */
    @Transactional
    public Map<String, Object> createDepartmentFromMap(Map<String, Object> departmentData) {
        try {
            logger.info("Creating department: {}", departmentData.get("name"));

            // Basic validation
            if (departmentData.get("name") == null ||
                    departmentData.get("name").toString().trim().isEmpty()) {
                throw new IllegalArgumentException("Department name is required");
            }

            String name = departmentData.get("name").toString().trim();
            String description = departmentData.get("description") != null ?
                    departmentData.get("description").toString().trim() : null;

            // Check if department with same name already exists
            if (departmentRepository.existsByName(name)) {
                throw new IllegalArgumentException("Department with name '" + name + "' already exists");
            }

            // Create new department
            Department department = Department.builder()
                    .name(name)
                    .description(description != null && !description.isEmpty() ? description : null)
                    .jobPositions(new ArrayList<>())
                    .build();

            Department savedDepartment = departmentRepository.save(department);
            logger.info("Successfully created department with id: {}", savedDepartment.getId());

            // Send notification about new department creation
            notificationService.sendNotificationToHRUsers(
                    "New Department Created",
                    "Department '" + name + "' has been successfully created",
                    NotificationType.SUCCESS,
                    "/departments/" + savedDepartment.getId(),
                    "new-department-" + savedDepartment.getId()
            );

            // If it's a strategic department, send additional notification
            if (isStrategicDepartment(name)) {
                notificationService.sendNotificationToHRUsers(
                        "Strategic Department Added",
                        "🏢 Strategic department '" + name + "' has been added to the organization",
                        NotificationType.INFO,
                        "/departments/" + savedDepartment.getId(),
                        "strategic-dept-" + savedDepartment.getId()
                );
            }

            return convertDepartmentToMap(savedDepartment);

        } catch (IllegalArgumentException e) {
            logger.warn("Validation error: {}", e.getMessage());

            notificationService.sendNotificationToHRUsers(
                    "Department Creation Failed",
                    "Failed to create department: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/departments",
                    "dept-creation-error-" + System.currentTimeMillis()
            );

            throw e;
        } catch (Exception e) {
            logger.error("Error creating department: ", e);

            notificationService.sendNotificationToHRUsers(
                    "Department Creation Error",
                    "Unexpected error creating department: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/departments",
                    "dept-creation-error-" + System.currentTimeMillis()
            );

            throw new RuntimeException("Failed to create department: " + e.getMessage());
        }
    }

    /**
     * Update department from Map
     */
    @Transactional
    public Map<String, Object> updateDepartmentFromMap(UUID id, Map<String, Object> departmentData) {
        try {
            logger.info("Updating department with id: {}", id);

            Department existingDepartment = departmentRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Department not found with id: " + id));

            String oldName = existingDepartment.getName();
            String oldDescription = existingDepartment.getDescription();

            // Validate name if provided
            if (departmentData.get("name") != null) {
                String newName = departmentData.get("name").toString().trim();
                if (newName.isEmpty()) {
                    throw new IllegalArgumentException("Department name cannot be empty");
                }

                // Check if another department with the same name exists
                if (!existingDepartment.getName().equals(newName) &&
                        departmentRepository.existsByName(newName)) {
                    throw new IllegalArgumentException("Department with name '" + newName + "' already exists");
                }

                existingDepartment.setName(newName);
            }

            // Update description if provided
            if (departmentData.containsKey("description")) {
                String description = departmentData.get("description") != null ?
                        departmentData.get("description").toString().trim() : null;
                existingDepartment.setDescription(description != null && !description.isEmpty() ? description : null);
            }

            Department updatedDepartment = departmentRepository.save(existingDepartment);
            logger.info("Successfully updated department: {}", updatedDepartment.getName());

            // Send notification about department update
            StringBuilder updateMessage = new StringBuilder("Department updated: ");
            if (!oldName.equals(updatedDepartment.getName())) {
                updateMessage.append("Name changed from '").append(oldName).append("' to '").append(updatedDepartment.getName()).append("'");
            } else {
                updateMessage.append("'").append(updatedDepartment.getName()).append("' information updated");
            }

            notificationService.sendNotificationToHRUsers(
                    "Department Updated",
                    updateMessage.toString(),
                    NotificationType.INFO,
                    "/departments/" + updatedDepartment.getId(),
                    "dept-updated-" + updatedDepartment.getId()
            );

            // If the department name changed, notify affected job positions
            if (!oldName.equals(updatedDepartment.getName())) {
                int jobPositionCount = updatedDepartment.getJobPositions() != null ?
                        updatedDepartment.getJobPositions().size() : 0;

                if (jobPositionCount > 0) {
                    notificationService.sendNotificationToHRUsers(
                            "Department Rename Impact",
                            "Department rename from '" + oldName + "' to '" + updatedDepartment.getName() +
                                    "' affects " + jobPositionCount + " job position(s)",
                            NotificationType.WARNING,
                            "/departments/" + updatedDepartment.getId(),
                            "dept-rename-impact-" + updatedDepartment.getId()
                    );
                }
            }

            return convertDepartmentToMap(updatedDepartment);

        } catch (IllegalArgumentException e) {
            logger.warn("Validation error: {}", e.getMessage());

            notificationService.sendNotificationToHRUsers(
                    "Department Update Failed",
                    "Failed to update department: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/departments/" + id,
                    "dept-update-error-" + id
            );

            throw e;
        } catch (Exception e) {
            logger.error("Error updating department: ", e);

            notificationService.sendNotificationToHRUsers(
                    "Department Update Error",
                    "Unexpected error updating department: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/departments/" + id,
                    "dept-update-error-" + id
            );

            throw new RuntimeException("Failed to update department: " + e.getMessage());
        }
    }

    /**
     * Delete department by ID
     */
    @Transactional
    public void deleteDepartment(UUID id) {
        try {
            logger.info("Deleting department with id: {}", id);

            Department department = departmentRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Department not found with id: " + id));

            String departmentName = department.getName();

            // Check if department has job positions
            long jobPositionCount = departmentRepository.countJobPositionsByDepartmentId(id);
            if (jobPositionCount > 0) {
                String errorMessage = "Cannot delete department with existing job positions. " +
                        "Please reassign or delete the " + jobPositionCount + " job position(s) first.";

                notificationService.sendNotificationToHRUsers(
                        "Department Deletion Blocked",
                        "Cannot delete '" + departmentName + "': " + jobPositionCount + " job positions must be handled first",
                        NotificationType.WARNING,
                        "/departments/" + id,
                        "dept-delete-blocked-" + id
                );

                throw new IllegalStateException(errorMessage);
            }

            departmentRepository.delete(department);
            logger.info("Successfully deleted department: {}", departmentName);

            // Send notification about department deletion
            notificationService.sendNotificationToHRUsers(
                    "Department Deleted",
                    "Department '" + departmentName + "' has been successfully deleted",
                    NotificationType.WARNING,
                    "/departments",
                    "dept-deleted-" + id
            );

            // If it was a strategic department, send additional notification
            if (isStrategicDepartment(departmentName)) {
                notificationService.sendNotificationToHRUsers(
                        "Strategic Department Removed",
                        "⚠️ Strategic department '" + departmentName + "' has been removed from the organization",
                        NotificationType.ERROR,
                        "/departments",
                        "strategic-dept-deleted-" + id
                );
            }

        } catch (IllegalStateException e) {
            // This is a business rule violation, not a system error
            throw e;
        } catch (Exception e) {
            logger.error("Error deleting department: ", e);

            notificationService.sendNotificationToHRUsers(
                    "Department Deletion Error",
                    "Failed to delete department: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/departments/" + id,
                    "dept-delete-error-" + id
            );

            throw new RuntimeException("Failed to delete department: " + e.getMessage());
        }
    }

    /**
     * Check if a department is considered strategic
     */
    private boolean isStrategicDepartment(String departmentName) {
        String name = departmentName.toLowerCase();
        return name.contains("executive") ||
                name.contains("management") ||
                name.contains("strategy") ||
                name.contains("board") ||
                name.contains("ceo") ||
                name.contains("cto") ||
                name.contains("cfo");
    }

    /**
     * Convert Department entity to Map
     */
    private Map<String, Object> convertDepartmentToMap(Department department) {
        Map<String, Object> departmentMap = new HashMap<>();

        departmentMap.put("id", department.getId());
        departmentMap.put("name", department.getName());
        departmentMap.put("description", department.getDescription());

        // Add job positions count without loading the entire collection
        int jobPositionCount = department.getJobPositions() != null ?
                department.getJobPositions().size() : 0;
        departmentMap.put("jobPositionCount", jobPositionCount);

        // Add basic job position info if available (without triggering lazy loading issues)
        if (department.getJobPositions() != null && !department.getJobPositions().isEmpty()) {
            List<Map<String, Object>> jobPositions = department.getJobPositions().stream()
                    .map(jobPosition -> {
                        Map<String, Object> jpMap = new HashMap<>();
                        jpMap.put("id", jobPosition.getId());
                        jpMap.put("positionName", jobPosition.getPositionName());
                        jpMap.put("type", jobPosition.getType());
                        jpMap.put("active", jobPosition.getActive());
                        return jpMap;
                    })
                    .collect(Collectors.toList());
            departmentMap.put("jobPositions", jobPositions);
        } else {
            departmentMap.put("jobPositions", new ArrayList<>());
        }

        return departmentMap;
    }

    // Keep original methods for backward compatibility
    public List<Department> getAllDepartments() {
        try {
            logger.info("Fetching departments from repository...");
            List<Department> departments = departmentRepository.findAll();
            logger.info("Found {} departments", departments.size());
            return departments;
        } catch (Exception e) {
            logger.error("Error in getAllDepartments: ", e);

            notificationService.sendNotificationToHRUsers(
                    "Department Fetch Error",
                    "Failed to retrieve departments: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/departments",
                    "department-fetch-error-" + System.currentTimeMillis()
            );

            throw new RuntimeException("Failed to fetch departments: " + e.getMessage());
        }
    }

    public Optional<Department> getDepartmentById(UUID id) {
        try {
            logger.info("Fetching department by id: {}", id);
            return departmentRepository.findById(id);
        } catch (Exception e) {
            logger.error("Error in getDepartmentById: ", e);
            throw new RuntimeException("Failed to fetch department: " + e.getMessage());
        }
    }

    public Department createDepartment(Department department) {
        try {
            logger.info("Creating department: {}", department.getName());

            // Basic validation
            if (department.getName() == null || department.getName().trim().isEmpty()) {
                throw new IllegalArgumentException("Department name is required");
            }

            // Set ID to null to let JPA generate it
            department.setId(null);

            // Trim whitespace
            department.setName(department.getName().trim());
            if (department.getDescription() != null) {
                department.setDescription(department.getDescription().trim());
                if (department.getDescription().isEmpty()) {
                    department.setDescription(null);
                }
            }

            // Initialize jobPositions list to prevent null issues
            if (department.getJobPositions() == null) {
                department.setJobPositions(new ArrayList<>());
            }

            Department saved = departmentRepository.save(department);
            logger.info("Successfully created department with id: {}", saved.getId());

            // Send notification about new department creation
            notificationService.sendNotificationToHRUsers(
                    "New Department Created",
                    "Department '" + saved.getName() + "' has been successfully created",
                    NotificationType.SUCCESS,
                    "/departments/" + saved.getId(),
                    "new-department-" + saved.getId()
            );

            return saved;

        } catch (IllegalArgumentException e) {
            logger.warn("Validation error: {}", e.getMessage());

            notificationService.sendNotificationToHRUsers(
                    "Department Creation Failed",
                    "Failed to create department: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/departments",
                    "dept-creation-error-" + System.currentTimeMillis()
            );

            throw e;
        } catch (Exception e) {
            logger.error("Error creating department: ", e);

            notificationService.sendNotificationToHRUsers(
                    "Department Creation Error",
                    "Unexpected error creating department: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/departments",
                    "dept-creation-error-" + System.currentTimeMillis()
            );

            throw new RuntimeException("Failed to create department: " + e.getMessage());
        }
    }

    public Department updateDepartment(UUID id, Department departmentDetails) {
        try {
            logger.info("Updating department with id: {}", id);

            Department existingDepartment = departmentRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Department not found with id: " + id));

            String oldName = existingDepartment.getName();

            // Validate
            if (departmentDetails.getName() == null || departmentDetails.getName().trim().isEmpty()) {
                throw new IllegalArgumentException("Department name is required");
            }

            // Update fields
            existingDepartment.setName(departmentDetails.getName().trim());
            existingDepartment.setDescription(
                    departmentDetails.getDescription() != null ?
                            departmentDetails.getDescription().trim() : null
            );

            Department updated = departmentRepository.save(existingDepartment);
            logger.info("Successfully updated department: {}", updated.getName());

            // Send notification about department update
            if (!oldName.equals(updated.getName())) {
                notificationService.sendNotificationToHRUsers(
                        "Department Renamed",
                        "Department renamed from '" + oldName + "' to '" + updated.getName() + "'",
                        NotificationType.INFO,
                        "/departments/" + updated.getId(),
                        "dept-renamed-" + updated.getId()
                );
            } else {
                notificationService.sendNotificationToHRUsers(
                        "Department Updated",
                        "Department '" + updated.getName() + "' information has been updated",
                        NotificationType.INFO,
                        "/departments/" + updated.getId(),
                        "dept-updated-" + updated.getId()
                );
            }

            return updated;

        } catch (IllegalArgumentException e) {
            logger.warn("Validation error: {}", e.getMessage());

            notificationService.sendNotificationToHRUsers(
                    "Department Update Failed",
                    "Failed to update department: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/departments/" + id,
                    "dept-update-error-" + id
            );

            throw e;
        } catch (Exception e) {
            logger.error("Error updating department: ", e);

            notificationService.sendNotificationToHRUsers(
                    "Department Update Error",
                    "Unexpected error updating department: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/departments/" + id,
                    "dept-update-error-" + id
            );

            throw new RuntimeException("Failed to update department: " + e.getMessage());
        }
    }

    public boolean existsByName(String name) {
        try {
            return departmentRepository.existsByName(name);
        } catch (Exception e) {
            logger.error("Error checking if department exists: ", e);
            return false;
        }
    }

    public long getTotalCount() {
        try {
            return departmentRepository.count();
        } catch (Exception e) {
            logger.error("Error getting department count: ", e);
            return 0;
        }
    }
}