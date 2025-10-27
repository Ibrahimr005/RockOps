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
import java.util.*;
import java.util.stream.Collectors;

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
                    "/hr/potential-candidates/" + savedCandidate.getId(),
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
                    "/hr/potential-candidates",
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
                    "/hr/potential-candidates/" + updatedCandidate.getId(),
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
                    "/hr/potential-candidates/" + id,
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
                    "/hr/potential-candidates/" + candidateId,
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
                    "/hr/potential-candidates/",
                    "candidate-deleted-" + id
            );

        } catch (Exception e) {
            // Send error notification
            notificationService.sendNotificationToHRUsers(
                    "Candidate Deletion Failed",
                    "Failed to delete candidate: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/hr/potential-candidates/" + id,
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
                        "/hr/potential-candidates/" + candidate.getId(),
                        "under-review-" + candidate.getId()
                );
                break;

            case "INTERVIEWED":
                notificationService.sendNotificationToHRUsers(
                        "Candidate Interviewed",
                        candidateName + " has been interviewed" + vacancyInfo,
                        NotificationType.INFO,
                        "/hr/potential-candidates/" + candidate.getId(),
                        "interviewed-" + candidate.getId()
                );
                break;

            case "PENDING_HIRE":
                notificationService.sendNotificationToHRUsers(
                        "Candidate Pending Hire",
                        "⏳ " + candidateName + " is now pending hire" + vacancyInfo + ". Please complete the employee form to finalize hiring.",
                        NotificationType.WARNING,
                        "/hr/potential-candidates/" + candidate.getId(),
                        "pending-hire-" + candidate.getId()
                );
                break;

            case "HIRED":
                // High priority notification for hiring
                notificationService.sendNotificationToHRUsers(
                        "Candidate Hired",
                        "🎉 " + candidateName + " has been HIRED" + vacancyInfo + "! Please proceed with onboarding.",
                        NotificationType.SUCCESS,
                        "/hr/potential-candidates/" + candidate.getId(),
                        "hired-" + candidate.getId()
                );
                break;

            case "REJECTED":
                notificationService.sendNotificationToHRUsers(
                        "Candidate Rejected",
                        "❌ " + candidateName + " has been rejected" + vacancyInfo,
                        NotificationType.INFO,
                        "/hr/potential-candidates/" + candidate.getId(),
                        "rejected-" + candidate.getId()
                );
                break;

            case "POTENTIAL":
                notificationService.sendNotificationToHRUsers(
                        "Candidate Moved to Potential",
                        candidateName + " has been moved to potential candidates list" + vacancyInfo,
                        NotificationType.INFO,
                        "/hr/potential-candidates/" + candidate.getId(),
                        "potential-" + candidate.getId()
                );
                break;

            case "WITHDRAWN":
                notificationService.sendNotificationToHRUsers(
                        "Candidate Withdrawn",
                        candidateName + " has withdrawn their application" + vacancyInfo,
                        NotificationType.INFO,
                        "/hr/potential-candidates/" + candidate.getId(),
                        "withdrawn-" + candidate.getId()
                );
                break;

            default:
                // Generic status change notification
                notificationService.sendNotificationToHRUsers(
                        "Candidate Status Updated",
                        candidateName + "'s status changed from " + oldStatus + " to " + newStatus + vacancyInfo,
                        NotificationType.INFO,
                        "/hr/potential-candidates/" + candidate.getId(),
                        "status-change-" + candidate.getId()
                );
                break;
        }
    }


    /**
     * Get available status transitions for a candidate based on current status and business rules
     */
    public List<String> getAvailableStatusTransitions(UUID candidateId) {
        Candidate candidate = candidateRepository.findById(candidateId)
                .orElseThrow(() -> new EntityNotFoundException("Candidate not found"));

        Candidate.CandidateStatus currentStatus = candidate.getCandidateStatus();
        if (currentStatus == null) {
            currentStatus = Candidate.CandidateStatus.APPLIED;
        }

        return getAvailableTransitionsForStatus(currentStatus, candidate);
    }

    /**
     * Business logic for valid status transitions
     */
    private boolean isValidStatusTransition(Candidate.CandidateStatus currentStatus, String newStatus) {
        if (currentStatus == null) {
            currentStatus = Candidate.CandidateStatus.APPLIED;
        }

        try {
            Candidate.CandidateStatus newStatusEnum = Candidate.CandidateStatus.valueOf(newStatus.toUpperCase());

            // Define valid transitions
            switch (currentStatus) {
                case APPLIED:
                    return newStatusEnum == Candidate.CandidateStatus.UNDER_REVIEW ||
                            newStatusEnum == Candidate.CandidateStatus.INTERVIEWED ||
                            newStatusEnum == Candidate.CandidateStatus.REJECTED ||
                            newStatusEnum == Candidate.CandidateStatus.WITHDRAWN;

                case UNDER_REVIEW:
                    return newStatusEnum == Candidate.CandidateStatus.INTERVIEWED ||
                            newStatusEnum == Candidate.CandidateStatus.REJECTED ||
                            newStatusEnum == Candidate.CandidateStatus.WITHDRAWN ||
                            newStatusEnum == Candidate.CandidateStatus.APPLIED; // Can go back

                case INTERVIEWED:
                    return newStatusEnum == Candidate.CandidateStatus.PENDING_HIRE || // ADDED THIS
                            newStatusEnum == Candidate.CandidateStatus.HIRED ||
                            newStatusEnum == Candidate.CandidateStatus.REJECTED ||
                            newStatusEnum == Candidate.CandidateStatus.WITHDRAWN;

                case PENDING_HIRE:
                    return newStatusEnum == Candidate.CandidateStatus.HIRED ||
                            newStatusEnum == Candidate.CandidateStatus.REJECTED ||
                            newStatusEnum == Candidate.CandidateStatus.WITHDRAWN ||
                            newStatusEnum == Candidate.CandidateStatus.INTERVIEWED; // Can go back if needed

                case HIRED:
                    // Generally final, but allow for corrections
                    return newStatusEnum == Candidate.CandidateStatus.POTENTIAL;

                case REJECTED:
                    // Can be reconsidered
                    return newStatusEnum == Candidate.CandidateStatus.POTENTIAL ||
                            newStatusEnum == Candidate.CandidateStatus.APPLIED;

                case POTENTIAL:
                    // Can be moved back to active statuses
                    return newStatusEnum == Candidate.CandidateStatus.APPLIED ||
                            newStatusEnum == Candidate.CandidateStatus.UNDER_REVIEW;

                case WITHDRAWN:
                    // Can be reactivated
                    return newStatusEnum == Candidate.CandidateStatus.APPLIED ||
                            newStatusEnum == Candidate.CandidateStatus.POTENTIAL;

                default:
                    return false;
            }
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    /**
     * Get available status transitions for display in UI
     */
    private List<String> getAvailableTransitionsForStatus(Candidate.CandidateStatus currentStatus, Candidate candidate) {
        List<String> availableStatuses = new ArrayList<>();

        // Always include current status
        availableStatuses.add(currentStatus.name());

        switch (currentStatus) {
            case APPLIED:
                availableStatuses.addAll(Arrays.asList(
                        "UNDER_REVIEW", "INTERVIEWED", "REJECTED", "WITHDRAWN"
                ));
                break;

            case UNDER_REVIEW:
                availableStatuses.addAll(Arrays.asList(
                        "APPLIED", "INTERVIEWED", "REJECTED", "WITHDRAWN"
                ));
                break;

            case INTERVIEWED:
                availableStatuses.addAll(Arrays.asList(
                        "HIRED", "REJECTED", "WITHDRAWN", "APPLIED"
                ));
                break;

            case HIRED:
                availableStatuses.add("POTENTIAL");
                break;

            case REJECTED:
                availableStatuses.addAll(Arrays.asList(
                        "POTENTIAL", "APPLIED"
                ));
                break;

            case POTENTIAL:
                availableStatuses.addAll(Arrays.asList(
                        "APPLIED", "UNDER_REVIEW"
                ));
                break;

            case WITHDRAWN:
                availableStatuses.addAll(Arrays.asList(
                        "APPLIED", "POTENTIAL"
                ));
                break;
        }

        return availableStatuses.stream().distinct().collect(Collectors.toList());
    }

    // Add these methods to your existing CandidateService.java

    /**
     * NEW: Update candidate rating
     */
    @Transactional
    public Candidate updateCandidateRating(UUID candidateId, Integer rating, String ratingNotes) {
        try {
            Candidate candidate = candidateRepository.findById(candidateId)
                    .orElseThrow(() -> new EntityNotFoundException("Candidate not found"));

            candidate.setRating(rating);
            candidate.setRatingNotes(ratingNotes);

            Candidate updatedCandidate = candidateRepository.save(candidate);

            // Send notification
            String candidateName = updatedCandidate.getFirstName() + " " + updatedCandidate.getLastName();
            String stars = "★".repeat(rating) + "☆".repeat(5 - rating);

            notificationService.sendNotificationToHRUsers(
                    "Candidate Rated",
                    "⭐ " + candidateName + " has been rated: " + stars + " (" + rating + "/5)",
                    NotificationType.INFO,
                    "/hr/potential-candidates/" + updatedCandidate.getId(),
                    "candidate-rated-" + updatedCandidate.getId()
            );

            return updatedCandidate;

        } catch (Exception e) {
            notificationService.sendNotificationToHRUsers(
                    "Rating Update Failed",
                    "Failed to update candidate rating: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/hr/potential-candidates/" + candidateId,
                    "rating-error-" + candidateId
            );
            throw e;
        }
    }

    /**
     * ENHANCED: Update candidate status with all details (rating, rejection reason)
     */
  /**  @Transactional
    public Candidate updateCandidateStatusWithDetails(UUID candidateId, String newStatus,
                                                      String rejectionReason, Integer rating, String ratingNotes) {
        try {
            Candidate candidate = candidateRepository.findById(candidateId)
                    .orElseThrow(() -> new EntityNotFoundException("Candidate not found"));


            String oldStatus = candidate.getCandidateStatus() != null ?
                    candidate.getCandidateStatus().name() : "APPLIED";

            System.out.println(candidate.getCandidateStatus());

            String candidateName = candidate.getFirstName() + " " + candidate.getLastName();

            // Validate status transition
            if (!isValidStatusTransition(candidate.getCandidateStatus(), newStatus)) {
                throw new IllegalArgumentException("Invalid status transition from " + oldStatus + " to " + newStatus);
            }

            try {
                Candidate.CandidateStatus status = Candidate.CandidateStatus.valueOf(newStatus.toUpperCase());
                candidate.setCandidateStatus(status);

                // Update rating if provided
                if (rating != null) {
                    candidate.setRating(rating);
                    candidate.setRatingNotes(ratingNotes);
                }

                // Handle special status changes
                switch (status) {
                    case REJECTED:
                        if (rejectionReason != null && !rejectionReason.trim().isEmpty()) {
                            candidate.setRejectionReason(rejectionReason.trim());
                        }
                        break;
                    case PENDING_HIRE:
                        // Set as pending hire - actual hiring happens when employee form is completed
                        break;
                    case HIRED:
                        // Only set hired date if moving to HIRED
                        candidate.setHiredDate(LocalDate.now());
                        break;
                    default:
                        break;
                }

                Candidate updatedCandidate = candidateRepository.save(candidate);

                // Send notifications
                sendStatusChangeNotifications(candidate, oldStatus, newStatus, candidateName);

                return updatedCandidate;

            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid candidate status: " + newStatus);
            }

        } catch (Exception e) {
            notificationService.sendNotificationToHRUsers(
                    "Status Update Failed",
                    "Failed to update candidate status: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/candidates/" + candidateId,
                    "status-error-" + candidateId
            );
            throw e;
        }
    } */

    /**
     * ENHANCED: Update candidate status with all details (rating, rejection reason)
     * Added comprehensive debugging and error handling
     */
    @Transactional
    public Candidate updateCandidateStatusWithDetails(UUID candidateId, String newStatus,
                                                      String rejectionReason, Integer rating, String ratingNotes) {
        System.out.println("=== updateCandidateStatusWithDetails DEBUG ===");
        System.out.println("Candidate ID: " + candidateId);
        System.out.println("New Status: " + newStatus);
        System.out.println("Rejection Reason: " + rejectionReason);
        System.out.println("Rating: " + rating);
        System.out.println("Rating Notes: " + ratingNotes);

        // Validate input parameters
        if (candidateId == null) {
            System.out.println("ERROR: Candidate ID is null");
            throw new IllegalArgumentException("Candidate ID cannot be null");
        }

        if (newStatus == null || newStatus.trim().isEmpty()) {
            System.out.println("ERROR: New status is null or empty");
            throw new IllegalArgumentException("New status cannot be null or empty");
        }

        // Validate rating if provided
        if (rating != null && (rating < 1 || rating > 5)) {
            System.out.println("ERROR: Invalid rating value: " + rating);
            throw new IllegalArgumentException("Rating must be between 1 and 5, got: " + rating);
        }

        try {
            // Find candidate
            System.out.println("Searching for candidate...");
            Candidate candidate = candidateRepository.findById(candidateId)
                    .orElseThrow(() -> {
                        System.out.println("ERROR: Candidate not found with ID: " + candidateId);
                        return new EntityNotFoundException("Candidate not found with id: " + candidateId);
                    });

            System.out.println("Found candidate: " + candidate.getFirstName() + " " + candidate.getLastName());
            System.out.println("Current status: " + candidate.getCandidateStatus());

            String oldStatus = candidate.getCandidateStatus() != null ?
                    candidate.getCandidateStatus().name() : "APPLIED";
            String candidateName = candidate.getFirstName() + " " + candidate.getLastName();

            System.out.println("Old status: " + oldStatus + " -> New status: " + newStatus);

            // Validate status exists in enum
            Candidate.CandidateStatus statusEnum;
            try {
                statusEnum = Candidate.CandidateStatus.valueOf(newStatus.toUpperCase().trim());
                System.out.println("Status enum validation passed: " + statusEnum);
            } catch (IllegalArgumentException e) {
                System.out.println("ERROR: Invalid status enum value: " + newStatus);
                System.out.println("Available statuses: " + Arrays.toString(Candidate.CandidateStatus.values()));
                throw new IllegalArgumentException("Invalid candidate status: " + newStatus +
                        ". Available statuses: " + Arrays.toString(Candidate.CandidateStatus.values()));
            }

            // Validate status transition
            System.out.println("Validating status transition...");
            if (!isValidStatusTransition(candidate.getCandidateStatus(), newStatus)) {
                String errorMsg = "Invalid status transition from " + oldStatus + " to " + newStatus;
                System.out.println("ERROR: " + errorMsg);

                // Log available transitions for debugging
                try {
                    List<String> availableTransitions = getAvailableTransitionsForStatus(
                            candidate.getCandidateStatus() != null ? candidate.getCandidateStatus() : Candidate.CandidateStatus.APPLIED,
                            candidate
                    );
                    System.out.println("Available transitions from " + oldStatus + ": " + availableTransitions);
                    throw new IllegalArgumentException(errorMsg + ". Available transitions: " + availableTransitions);
                } catch (Exception ex) {
                    System.out.println("ERROR getting available transitions: " + ex.getMessage());
                    throw new IllegalArgumentException(errorMsg);
                }
            }
            System.out.println("Status transition validation passed");

            // Update candidate status
            System.out.println("Updating candidate status to: " + statusEnum);
            candidate.setCandidateStatus(statusEnum);

            // Update rating if provided
            if (rating != null) {
                System.out.println("Updating rating: " + rating + " with notes: " + ratingNotes);
                try {
                    candidate.setRating(rating);
                    candidate.setRatingNotes(ratingNotes != null ? ratingNotes.trim() : null);
                    System.out.println("Rating updated successfully");
                } catch (Exception e) {
                    System.out.println("ERROR updating rating: " + e.getMessage());
                    throw new IllegalArgumentException("Failed to update rating: " + e.getMessage());
                }
            }

            // Handle special status changes
            System.out.println("Processing special status change logic for: " + statusEnum);
            try {
                switch (statusEnum) {
                    case REJECTED:
                        if (rejectionReason != null && !rejectionReason.trim().isEmpty()) {
                            candidate.setRejectionReason(rejectionReason.trim());
                            System.out.println("Rejection reason set: " + rejectionReason.trim());
                        } else {
                            System.out.println("WARNING: No rejection reason provided for REJECTED status");
                        }
                        break;
                    case PENDING_HIRE:
                        System.out.println("Setting candidate to PENDING_HIRE - no additional actions needed");
                        break;
                    case HIRED:
                        candidate.setHiredDate(LocalDate.now());
                        System.out.println("Hired date set to: " + LocalDate.now());
                        break;
                    default:
                        System.out.println("No special processing needed for status: " + statusEnum);
                        break;
                }
            } catch (Exception e) {
                System.out.println("ERROR in status-specific processing: " + e.getMessage());
                throw new RuntimeException("Failed to process status-specific logic: " + e.getMessage());
            }

            // Save candidate
            System.out.println("Saving updated candidate...");
            Candidate updatedCandidate;
            try {
                updatedCandidate = candidateRepository.save(candidate);
                System.out.println("Candidate saved successfully with ID: " + updatedCandidate.getId());
                System.out.println("Final status: " + updatedCandidate.getCandidateStatus());
            } catch (Exception e) {
                System.out.println("ERROR saving candidate: " + e.getMessage());
                e.printStackTrace();
                throw new RuntimeException("Failed to save candidate: " + e.getMessage());
            }

            // Send notifications
            System.out.println("Sending status change notifications...");
            try {
                sendStatusChangeNotifications(candidate, oldStatus, newStatus, candidateName);
                System.out.println("Notifications sent successfully");
            } catch (Exception e) {
                System.out.println("WARNING: Failed to send notifications: " + e.getMessage());
                // Don't fail the entire operation for notification errors
            }

            System.out.println("=== updateCandidateStatusWithDetails COMPLETED SUCCESSFULLY ===");
            return updatedCandidate;

        } catch (EntityNotFoundException e) {
            System.out.println("ENTITY_NOT_FOUND: " + e.getMessage());
            throw e; // Re-throw as-is for proper HTTP status
        } catch (IllegalArgumentException e) {
            System.out.println("VALIDATION_ERROR: " + e.getMessage());
            throw e; // Re-throw as-is for proper HTTP status
        } catch (Exception e) {
            System.out.println("UNEXPECTED_ERROR: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            e.printStackTrace();

            // Send error notification
            try {
                notificationService.sendNotificationToHRUsers(
                        "Status Update Failed",
                        "Failed to update candidate status: " + e.getMessage(),
                        NotificationType.ERROR,
                        "/hr/potential-candidates/" + candidateId,
                        "status-error-" + candidateId
                );
            } catch (Exception notificationError) {
                System.out.println("ERROR sending error notification: " + notificationError.getMessage());
            }

            throw new RuntimeException("Unexpected error updating candidate status: " + e.getMessage(), e);
        }
    }
}