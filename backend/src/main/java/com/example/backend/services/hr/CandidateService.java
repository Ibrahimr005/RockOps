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

            if (candidateData.get("applicationDate") != null &&
                    !candidateData.get("applicationDate").toString().isEmpty()) {
                candidate.setApplicationDate(LocalDate.parse(candidateData.get("applicationDate").toString()));
            } else {
                candidate.setApplicationDate(LocalDate.now());
            }

            // Set default status
            candidate.setCandidateStatus(Candidate.CandidateStatus.APPLIED);

            // Handle vacancy association
            if (candidateData.get("vacancyId") != null) {
                UUID vacancyId = UUID.fromString(candidateData.get("vacancyId").toString());
                Vacancy vacancy = vacancyRepository.findById(vacancyId)
                        .orElseThrow(() -> new EntityNotFoundException("Vacancy not found"));
                candidate.setVacancy(vacancy);
            }

            // Handle resume file upload
            if (resumeFile != null && !resumeFile.isEmpty()) {
                try {
                    minioService.uploadFile(resumeFile, "resumes");
                    String resumeUrl = minioService.getFileUrl("resumes");
                    candidate.setResumeUrl(resumeUrl);
                } catch (Exception e) {
                    throw new RuntimeException("Failed to upload resume file", e);
                }
            }

            // Save candidate
            Candidate savedCandidate = candidateRepository.save(candidate);

            // Send notification
            String candidateName = savedCandidate.getFirstName() + " " + savedCandidate.getLastName();
            String vacancyInfo = savedCandidate.getVacancy() != null ?
                    " for " + savedCandidate.getVacancy().getTitle() : "";

            notificationService.sendNotificationToHRUsers(
                    "New Candidate Application",
                    "📝 " + candidateName + " has applied" + vacancyInfo,
                    NotificationType.INFO,
                    "/candidates/" + savedCandidate.getId(),
                    "new-candidate-" + savedCandidate.getId()
            );

            // Return response
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Candidate created successfully");
            response.put("candidate", savedCandidate);
            return response;

        } catch (Exception e) {
            // Send error notification
            notificationService.sendNotificationToHRUsers(
                    "Candidate Creation Failed",
                    "Failed to create new candidate: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/candidates",
                    "candidate-creation-error"
            );
            throw e;
        }
    }

    /**
     * Update existing candidate - NEW METHOD
     */
    @Transactional
    public Map<String, Object> updateCandidate(UUID id, Map<String, Object> candidateData, MultipartFile resumeFile) {
        try {
            Candidate candidate = candidateRepository.findById(id)
                    .orElseThrow(() -> new EntityNotFoundException("Candidate not found with id: " + id));

            // Update fields
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
            if (candidateData.get("applicationDate") != null &&
                    !candidateData.get("applicationDate").toString().isEmpty()) {
                candidate.setApplicationDate(LocalDate.parse(candidateData.get("applicationDate").toString()));
            }

            // Handle resume file upload
            if (resumeFile != null && !resumeFile.isEmpty()) {
                try {
                    // Delete old resume if exists
                    if (candidate.getResumeUrl() != null) {
                        // Extract filename from URL and delete
                        String oldFileName = candidate.getResumeUrl().substring(
                                candidate.getResumeUrl().lastIndexOf("/") + 1
                        );
                        minioService.deleteFile("resumes", oldFileName);
                    }

                    // Upload new resume
                    minioService.uploadFile(resumeFile, "resumes");
                    String resumeUrl = minioService.getFileUrl("resumes");
                    candidate.setResumeUrl(resumeUrl);
                } catch (Exception e) {
                    throw new RuntimeException("Failed to update resume file", e);
                }
            }

            // Save updated candidate
            Candidate updatedCandidate = candidateRepository.save(candidate);

            // Send notification
            String candidateName = updatedCandidate.getFirstName() + " " + updatedCandidate.getLastName();
            notificationService.sendNotificationToHRUsers(
                    "Candidate Updated",
                    "✏️ " + candidateName + "'s profile has been updated",
                    NotificationType.INFO,
                    "/candidates/" + updatedCandidate.getId(),
                    "candidate-updated-" + updatedCandidate.getId()
            );

            // Return response
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Candidate updated successfully");
            response.put("candidate", updatedCandidate);
            return response;

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

    /**
     * Update candidate status with enhanced logic for PENDING_HIRE - UPDATED METHOD
     */
    @Transactional
    public Candidate updateCandidateStatus(UUID candidateId, String newStatus) {
        try {
            Candidate candidate = candidateRepository.findById(candidateId)
                    .orElseThrow(() -> new EntityNotFoundException("Candidate not found"));

            String oldStatus = candidate.getCandidateStatus() != null ?
                    candidate.getCandidateStatus().name() : "APPLIED";
            String candidateName = candidate.getFirstName() + " " + candidate.getLastName();

            try {
                Candidate.CandidateStatus status = Candidate.CandidateStatus.valueOf(newStatus.toUpperCase());
                candidate.setCandidateStatus(status);

                // Special handling for different statuses
                switch (status) {
                    case PENDING_HIRE:
                        // Set as pending hire but don't update vacancy counts yet
                        break;
                    case HIRED:
                        // Only set hired date if moving from PENDING_HIRE to HIRED
                        candidate.setHiredDate(LocalDate.now());
                        break;
                    default:
                        break;
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
     * Delete candidate - NEW METHOD
     */
    @Transactional
    public void deleteCandidate(UUID id) {
        try {
            Candidate candidate = candidateRepository.findById(id)
                    .orElseThrow(() -> new EntityNotFoundException("Candidate not found with id: " + id));

            String candidateName = candidate.getFirstName() + " " + candidate.getLastName();

            // Delete resume file if exists
            if (candidate.getResumeUrl() != null) {
                try {
                    String fileName = candidate.getResumeUrl().substring(
                            candidate.getResumeUrl().lastIndexOf("/") + 1
                    );
                    minioService.deleteFile("resumes", fileName);
                } catch (Exception e) {
                    // Log warning but don't fail the deletion
                    System.out.println("Warning: Failed to delete resume file: " + e.getMessage());
                }
            }

            // Delete the candidate
            candidateRepository.delete(candidate);

            // Send notification
            notificationService.sendNotificationToHRUsers(
                    "Candidate Deleted",
                    "🗑️ " + candidateName + " has been removed from the system",
                    NotificationType.WARNING,
                    "/candidates",
                    "candidate-deleted-" + id
            );

        } catch (Exception e) {
            // Send error notification
            notificationService.sendNotificationToHRUsers(
                    "Candidate Deletion Failed",
                    "Failed to delete candidate: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/candidates/" + id,
                    "candidate-delete-error-" + id
            );
            throw e;
        }
    }

    /**
     * Convert candidate to employee data - EXISTING METHOD
     */
    public Map<String, Object> convertCandidateToEmployee(UUID candidateId) {
        Candidate candidate = candidateRepository.findById(candidateId)
                .orElseThrow(() -> new EntityNotFoundException("Candidate not found"));

        Map<String, Object> employeeData = new HashMap<>();

        // Basic information
        employeeData.put("candidateId", candidate.getId());
        employeeData.put("firstName", candidate.getFirstName());
        employeeData.put("lastName", candidate.getLastName());
        employeeData.put("email", candidate.getEmail());
        employeeData.put("phoneNumber", candidate.getPhoneNumber());
        employeeData.put("country", candidate.getCountry());

        // Previous employment info
        employeeData.put("previousPosition", candidate.getCurrentPosition());
        employeeData.put("previousCompany", candidate.getCurrentCompany());

        // Application context
        employeeData.put("applicationDate", candidate.getApplicationDate());
        employeeData.put("notes", "Hired from candidate application. " +
                (candidate.getNotes() != null ? "Previous notes: " + candidate.getNotes() : ""));

        // Vacancy information if available
        if (candidate.getVacancy() != null) {
            employeeData.put("vacancyId", candidate.getVacancy().getId());
            employeeData.put("vacancyTitle", candidate.getVacancy().getTitle());

            if (candidate.getVacancy().getJobPosition() != null) {
                employeeData.put("jobPositionId", candidate.getVacancy().getJobPosition().getId());
                employeeData.put("jobPositionName", candidate.getVacancy().getJobPosition().getPositionName());
            }


        }

        return employeeData;
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

            case "PENDING_HIRE":
                notificationService.sendNotificationToHRUsers(
                        "Candidate Pending Hire",
                        "⏳ " + candidateName + " is now pending hire" + vacancyInfo + ". Please complete the employee form to finalize hiring.",
                        NotificationType.WARNING,
                        "/candidates/" + candidate.getId(),
                        "pending-hire-" + candidate.getId()
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
                break;

            case "REJECTED":
                notificationService.sendNotificationToHRUsers(
                        "Candidate Rejected",
                        "❌ " + candidateName + " has been rejected" + vacancyInfo,
                        NotificationType.INFO,
                        "/candidates/" + candidate.getId(),
                        "rejected-" + candidate.getId()
                );
                break;

            case "POTENTIAL":
                notificationService.sendNotificationToHRUsers(
                        "Candidate Moved to Potential",
                        candidateName + " has been moved to potential candidates list" + vacancyInfo,
                        NotificationType.INFO,
                        "/candidates/" + candidate.getId(),
                        "potential-" + candidate.getId()
                );
                break;

            case "WITHDRAWN":
                notificationService.sendNotificationToHRUsers(
                        "Candidate Withdrawn",
                        candidateName + " has withdrawn their application" + vacancyInfo,
                        NotificationType.INFO,
                        "/candidates/" + candidate.getId(),
                        "withdrawn-" + candidate.getId()
                );
                break;

            default:
                // Generic status change notification
                notificationService.sendNotificationToHRUsers(
                        "Candidate Status Updated",
                        candidateName + "'s status changed from " + oldStatus + " to " + newStatus + vacancyInfo,
                        NotificationType.INFO,
                        "/candidates/" + candidate.getId(),
                        "status-change-" + candidate.getId()
                );
                break;
        }
    }


}