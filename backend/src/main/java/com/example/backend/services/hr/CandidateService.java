package com.example.backend.services.hr;

import com.example.backend.services.MinioService;
import com.example.backend.models.hr.Candidate;
import com.example.backend.models.hr.Vacancy;
import com.example.backend.models.notification.NotificationType;
import com.example.backend.repositories.hr.CandidateRepository;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.VacancyRepository;
import com.example.backend.services.notification.NotificationService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class CandidateService {

    @Autowired
    private CandidateRepository candidateRepository;

    @Autowired
    private VacancyRepository vacancyRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private MinioService minioService;

    @Autowired
    private NotificationService notificationService;

    // Get all candidates
    public List<Candidate> getAllCandidates() {
        return candidateRepository.findAll();
    }

    // Get candidate by ID
    public Candidate getCandidateById(UUID id) {
        return candidateRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Candidate not found with id: " + id));
    }

    // Get candidates by vacancy ID
    public List<Candidate> getCandidatesByVacancyId(UUID vacancyId) {
        return candidateRepository.findByVacancyId(vacancyId);
    }

    @Transactional
    public Map<String, Object> createCandidate(Map<String, Object> candidateData, MultipartFile resumeFile) {
        try {
            Candidate candidate = new Candidate();

            candidate.setFirstName((String) candidateData.get("firstName"));
            candidate.setLastName((String) candidateData.get("lastName"));
            candidate.setEmail((String) candidateData.get("email"));
            candidate.setPhoneNumber((String) candidateData.get("phoneNumber"));
            candidate.setCountry((String) candidateData.get("country"));
            candidate.setCurrentPosition((String) candidateData.get("currentPosition"));
            candidate.setCurrentCompany((String) candidateData.get("currentCompany"));
            candidate.setNotes((String) candidateData.get("notes"));

            if (candidateData.get("applicationDate") != null && !((String) candidateData.get("applicationDate")).trim().isEmpty()) {
                candidate.setApplicationDate(LocalDate.parse((String) candidateData.get("applicationDate")));
            } else {
                candidate.setApplicationDate(LocalDate.now());
            }

            Vacancy vacancy = null;
            if (candidateData.get("vacancyId") != null) {
                UUID vacancyId = UUID.fromString((String) candidateData.get("vacancyId"));
                vacancy = vacancyRepository.findById(vacancyId)
                        .orElseThrow(() -> new EntityNotFoundException("Vacancy not found with id: " + vacancyId));
                candidate.setVacancy(vacancy);
            }

            if (resumeFile != null && !resumeFile.isEmpty()) {
                try {
                    String fileName = "resumes/" + UUID.randomUUID() + "_" + resumeFile.getOriginalFilename();
                    minioService.uploadFile(resumeFile, fileName);
                    String fileUrl = minioService.getFileUrl(fileName);
                    candidate.setResumeUrl(fileUrl);
                } catch (Exception e) {
                    throw new RuntimeException("Could not upload resume: " + e.getMessage());
                }
            }

            Candidate savedCandidate = candidateRepository.save(candidate);

            // Send notifications about new candidate
            String candidateName = savedCandidate.getFirstName() + " " + savedCandidate.getLastName();
            String vacancyTitle = vacancy != null ? vacancy.getTitle() : "General Application";

            // Notify HR users about new candidate
            notificationService.sendNotificationToHRUsers(
                    "New Candidate Application",
                    "New candidate " + candidateName + " has applied for " + vacancyTitle,
                    NotificationType.INFO,
                    "/candidates/" + savedCandidate.getId(),
                    "new-candidate-" + savedCandidate.getId()
            );

            // If vacancy has specific requirements, notify procurement/hiring managers
            if (vacancy != null && vacancy.getJobPosition() != null) {
                String departmentName = vacancy.getJobPosition().getDepartment() != null
                        ? vacancy.getJobPosition().getDepartment().getName()
                        : "Unknown Department";

                notificationService.sendNotificationToHRUsers(
                        "Candidate for " + departmentName,
                        candidateName + " has applied for " + vacancyTitle + " in " + departmentName,
                        NotificationType.INFO,
                        "/vacancies/" + vacancy.getId() + "/candidates",
                        "dept-candidate-" + savedCandidate.getId()
                );
            }

            // Now convert the saved candidate entity to Map<String, Object> for return
            Map<String, Object> response = new HashMap<>();
            response.put("id", savedCandidate.getId());
            response.put("firstName", savedCandidate.getFirstName());
            response.put("lastName", savedCandidate.getLastName());
            response.put("email", savedCandidate.getEmail());
            response.put("phoneNumber", savedCandidate.getPhoneNumber());
            response.put("country", savedCandidate.getCountry());
            response.put("currentPosition", savedCandidate.getCurrentPosition());
            response.put("currentCompany", savedCandidate.getCurrentCompany());
            response.put("notes", savedCandidate.getNotes());
            response.put("applicationDate", savedCandidate.getApplicationDate());
            response.put("resumeUrl", savedCandidate.getResumeUrl());

            if (savedCandidate.getVacancy() != null) {
                response.put("vacancyId", savedCandidate.getVacancy().getId());
            }

            return response;

        } catch (Exception e) {
            // Send error notification
            notificationService.sendNotificationToHRUsers(
                    "Candidate Creation Failed",
                    "Failed to create candidate application: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/candidates",
                    "candidate-creation-error-" + System.currentTimeMillis()
            );
            throw e;
        }
    }

    // Update an existing candidate
    @Transactional
    public Candidate updateCandidate(UUID id, Map<String, Object> candidateData, MultipartFile resumeFile) {
        try {
            Candidate candidate = getCandidateById(id);
            String oldStatus = candidate.getCandidateStatus() != null ? candidate.getCandidateStatus().name() : "APPLIED";

            // Update basic properties if provided
            if (candidateData.get("firstName") != null) {
                candidate.setFirstName((String) candidateData.get("firstName"));
            }

            if (candidateData.get("lastName") != null) {
                candidate.setLastName((String) candidateData.get("lastName"));
            }

            if (candidateData.get("email") != null) {
                candidate.setEmail((String) candidateData.get("email"));
            }

            if (candidateData.get("phoneNumber") != null) {
                candidate.setPhoneNumber((String) candidateData.get("phoneNumber"));
            }

            if (candidateData.get("country") != null) {
                candidate.setCountry((String) candidateData.get("country"));
            }

            if (candidateData.get("currentPosition") != null) {
                candidate.setCurrentPosition((String) candidateData.get("currentPosition"));
            }

            if (candidateData.get("currentCompany") != null) {
                candidate.setCurrentCompany((String) candidateData.get("currentCompany"));
            }

            if (candidateData.get("notes") != null) {
                candidate.setNotes((String) candidateData.get("notes"));
            }

            if (candidateData.get("applicationDate") != null && !((String) candidateData.get("applicationDate")).trim().isEmpty()) {
                candidate.setApplicationDate(LocalDate.parse((String) candidateData.get("applicationDate")));
            }

            // Update vacancy if provided
            if (candidateData.get("vacancyId") != null) {
                UUID vacancyId = UUID.fromString((String) candidateData.get("vacancyId"));
                Vacancy vacancy = vacancyRepository.findById(vacancyId)
                        .orElseThrow(() -> new EntityNotFoundException("Vacancy not found with id: " + vacancyId));
                candidate.setVacancy(vacancy);
            }

            // Upload new resume if provided
            if (resumeFile != null && !resumeFile.isEmpty()) {
                try {
                    // Delete old resume file if exists
                    // Implement deletion logic here if needed

                    // Upload new resume
                    String fileName = "resumes/" + UUID.randomUUID() + "_" + resumeFile.getOriginalFilename();
                    minioService.uploadFile(resumeFile, fileName);
                    String fileUrl = minioService.getFileUrl(fileName);
                    candidate.setResumeUrl(fileUrl);
                } catch (Exception e) {
                    throw new RuntimeException("Could not upload resume: " + e.getMessage());
                }
            }

            Candidate updatedCandidate = candidateRepository.save(candidate);

            // Send notification about candidate update
            String candidateName = updatedCandidate.getFirstName() + " " + updatedCandidate.getLastName();
            String newStatus = updatedCandidate.getCandidateStatus() != null ? updatedCandidate.getCandidateStatus().name() : "APPLIED";

            if (!oldStatus.equals(newStatus)) {
                notificationService.sendNotificationToHRUsers(
                        "Candidate Status Updated",
                        candidateName + " status changed from " + oldStatus + " to " + newStatus,
                        NotificationType.INFO,
                        "/candidates/" + updatedCandidate.getId(),
                        "candidate-status-" + updatedCandidate.getId() + "-" + newStatus
                );
            } else {
                notificationService.sendNotificationToHRUsers(
                        "Candidate Information Updated",
                        candidateName + " information has been updated",
                        NotificationType.INFO,
                        "/candidates/" + updatedCandidate.getId(),
                        "candidate-updated-" + updatedCandidate.getId()
                );
            }

            return updatedCandidate;

        } catch (Exception e) {
            // Send error notification
            notificationService.sendNotificationToHRUsers(
                    "Candidate Update Failed",
                    "Failed to update candidate: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/candidates/" + id,
                    "candidate-update-error-" + id
            );
            throw e;
        }
    }

    // Delete a candidate
    @Transactional
    public void deleteCandidate(UUID id) {
        try {
            Candidate candidate = getCandidateById(id);
            String candidateName = candidate.getFirstName() + " " + candidate.getLastName();

            // Delete resume file if exists
            if (candidate.getResumeUrl() != null && !candidate.getResumeUrl().isEmpty()) {
                try {
                    // Extract file name from URL and delete
                    // Implement deletion logic here if needed
                } catch (Exception e) {
                    // Log error but continue with deletion
                    System.err.println("Error deleting resume file: " + e.getMessage());
                }
            }

            candidateRepository.delete(candidate);

            // Send notification about candidate deletion
            notificationService.sendNotificationToHRUsers(
                    "Candidate Deleted",
                    "Candidate " + candidateName + " has been removed from the system",
                    NotificationType.INFO,
                    "/candidates",
                    "candidate-deleted-" + id
            );

        } catch (Exception e) {
            // Send error notification
            notificationService.sendNotificationToHRUsers(
                    "Candidate Deletion Failed",
                    "Failed to delete candidate: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/candidates",
                    "candidate-delete-error-" + id
            );
            throw e;
        }
    }

    // Convert candidate to employee
    @Transactional
    public Map<String, Object> convertToEmployeeData(UUID candidateId) {
        try {
            Candidate candidate = getCandidateById(candidateId);

            // Create a map with employee initial data from candidate
            Map<String, Object> employeeData = Map.of(
                    "firstName", candidate.getFirstName(),
                    "lastName", candidate.getLastName(),
                    "email", candidate.getEmail(),
                    "phoneNumber", candidate.getPhoneNumber(),
                    "country", candidate.getCountry(),
                    "previousPosition", candidate.getCurrentPosition(),
                    "previousCompany", candidate.getCurrentCompany(),
                    "hireDate", LocalDate.now().toString()
                    // Other fields will need to be filled in by the user
            );

            // Send notification about conversion preparation
            String candidateName = candidate.getFirstName() + " " + candidate.getLastName();
            notificationService.sendNotificationToHRUsers(
                    "Candidate to Employee Conversion",
                    "Employee data prepared for candidate " + candidateName + ". Please complete the employee creation process.",
                    NotificationType.INFO,
                    "hr/employees/add" + candidateId,
                    "candidate-to-employee-" + candidateId
            );

            return employeeData;

        } catch (Exception e) {
            // Send error notification
            notificationService.sendNotificationToHRUsers(
                    "Candidate Conversion Failed",
                    "Failed to convert candidate to employee data: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/candidates/" + candidateId,
                    "conversion-error-" + candidateId
            );
            throw e;
        }
    }

    // Update candidate status
    @Transactional
    public Candidate updateCandidateStatus(UUID candidateId, String newStatus) {
        try {
            Candidate candidate = getCandidateById(candidateId);
            String oldStatus = candidate.getCandidateStatus() != null ? candidate.getCandidateStatus().name() : "APPLIED";
            String candidateName = candidate.getFirstName() + " " + candidate.getLastName();

            try {
                Candidate.CandidateStatus status = Candidate.CandidateStatus.valueOf(newStatus.toUpperCase());
                candidate.setCandidateStatus(status);

                // Set hired date if status is HIRED
                if (status == Candidate.CandidateStatus.HIRED) {
                    candidate.setHiredDate(LocalDate.now());
                }

                Candidate updatedCandidate = candidateRepository.save(candidate);

                // Send specific notifications based on status change
                sendStatusChangeNotifications(candidate, oldStatus, newStatus, candidateName);

                return updatedCandidate;

            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid candidate status: " + newStatus);
            }

        } catch (Exception e) {
            // Send error notification
            notificationService.sendNotificationToHRUsers(
                    "Status Update Failed",
                    "Failed to update candidate status: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/candidates/" + candidateId,
                    "status-error-" + candidateId
            );
            throw e;
        }
    }

    /**
     * Send specific notifications based on candidate status changes
     */
    private void sendStatusChangeNotifications(Candidate candidate, String oldStatus, String newStatus, String candidateName) {
        String vacancyInfo = candidate.getVacancy() != null ? " for " + candidate.getVacancy().getTitle() : "";

        switch (newStatus.toUpperCase()) {
            case "UNDER_REVIEW":
                notificationService.sendNotificationToHRUsers(
                        "Candidate Under Review",
                        candidateName + " is now under review" + vacancyInfo,
                        NotificationType.INFO,
                        "/candidates/" + candidate.getId(),
                        "under-review-" + candidate.getId()
                );
                break;

            case "INTERVIEWED":
                notificationService.sendNotificationToHRUsers(
                        "Candidate Interviewed",
                        candidateName + " has been interviewed" + vacancyInfo,
                        NotificationType.INFO,
                        "/candidates/" + candidate.getId(),
                        "interviewed-" + candidate.getId()
                );
                break;

            case "HIRED":
                // High priority notification for hiring
                notificationService.sendNotificationToHRUsers(
                        "Candidate Hired",
                        "🎉 " + candidateName + " has been HIRED" + vacancyInfo + "! Please proceed with onboarding.",
                        NotificationType.SUCCESS,
                        "/candidates/" + candidate.getId(),
                        "hired-" + candidate.getId()
                );

                // Also notify relevant department if vacancy has job position
                if (candidate.getVacancy() != null && candidate.getVacancy().getJobPosition() != null) {
                    String department = candidate.getVacancy().getJobPosition().getDepartment() != null
                            ? candidate.getVacancy().getJobPosition().getDepartment().getName()
                            : "Unknown Department";

                    notificationService.sendNotificationToHRUsers(
                            "New Hire for " + department,
                            candidateName + " has been hired for " + candidate.getVacancy().getJobPosition().getPositionName() + " in " + department,
                            NotificationType.SUCCESS,
                            "/employees/onboarding",
                            "new-hire-dept-" + candidate.getId()
                    );
                }
                break;

            case "REJECTED":
                notificationService.sendNotificationToHRUsers(
                        "Candidate Rejected",
                        candidateName + " has been rejected" + vacancyInfo,
                        NotificationType.WARNING,
                        "/candidates/" + candidate.getId(),
                        "rejected-" + candidate.getId()
                );
                break;

            case "POTENTIAL":
                notificationService.sendNotificationToHRUsers(
                        "Candidate Moved to Potential",
                        candidateName + " has been moved to potential candidates list",
                        NotificationType.INFO,
                        "/candidates/potential",
                        "potential-" + candidate.getId()
                );
                break;

            default:
                // General status change notification
                notificationService.sendNotificationToHRUsers(
                        "Candidate Status Updated",
                        candidateName + " status changed from " + oldStatus + " to " + newStatus,
                        NotificationType.INFO,
                        "/candidates/" + candidate.getId(),
                        "status-change-" + candidate.getId()
                );
                break;
        }
    }
}