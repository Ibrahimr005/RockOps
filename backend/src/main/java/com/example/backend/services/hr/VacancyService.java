package com.example.backend.services.hr;

import com.example.backend.models.hr.Candidate;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.hr.Vacancy;
import com.example.backend.models.notification.NotificationType;
import com.example.backend.repositories.VacancyRepository;
import com.example.backend.repositories.hr.CandidateRepository;
import com.example.backend.repositories.hr.JobPositionRepository;
import com.example.backend.services.notification.NotificationService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class VacancyService {

    @Autowired
    private VacancyRepository vacancyRepository;

    @Autowired
    private JobPositionRepository jobPositionRepository;

    @Autowired
    private CandidateRepository candidateRepository;

    @Autowired
    private NotificationService notificationService;

    public List<Vacancy> getAllVacancies() {
        return vacancyRepository.findAll();
    }

    public Vacancy getVacancyById(UUID id) {
        return vacancyRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Vacancy not found with id: " + id));
    }

    @Transactional
    public Vacancy createVacancy(Map<String, Object> vacancyData) {
        try {
            // Parse dates
            LocalDate postingDate = null;
            LocalDate closingDate = null;

            if (vacancyData.get("postingDate") != null && !((String) vacancyData.get("postingDate")).trim().isEmpty()) {
                postingDate = LocalDate.parse((String) vacancyData.get("postingDate"));
            }
            if (vacancyData.get("closingDate") != null && !((String) vacancyData.get("closingDate")).trim().isEmpty()) {
                closingDate = LocalDate.parse((String) vacancyData.get("closingDate"));
            }

            // Parse number of positions
            Integer numberOfPositions = 1; // default value
            if (vacancyData.get("numberOfPositions") != null) {
                Object numPositions = vacancyData.get("numberOfPositions");
                if (numPositions instanceof Integer) {
                    numberOfPositions = (Integer) numPositions;
                } else if (numPositions instanceof String) {
                    numberOfPositions = Integer.parseInt((String) numPositions);
                } else if (numPositions instanceof Number) {
                    numberOfPositions = ((Number) numPositions).intValue();
                }
            }

            // Handle job position
            JobPosition jobPosition = null;
            if (vacancyData.get("jobPosition") != null) {
                Map<String, Object> jobPositionData = (Map<String, Object>) vacancyData.get("jobPosition");
                if (jobPositionData.get("id") != null) {
                    String jobPositionId = (String) jobPositionData.get("id");
                    jobPosition = jobPositionRepository.findById(UUID.fromString(jobPositionId))
                            .orElseThrow(() -> new EntityNotFoundException("Job position not found"));
                }
            }

            // Use builder pattern
            Vacancy vacancy = Vacancy.builder()
                    .title((String) vacancyData.get("title"))
                    .description((String) vacancyData.get("description"))
                    .requirements((String) vacancyData.get("requirements"))
                    .responsibilities((String) vacancyData.get("responsibilities"))
                    .status((String) vacancyData.get("status"))
                    .priority((String) vacancyData.get("priority"))
                    .postingDate(postingDate)
                    .closingDate(closingDate)
                    .numberOfPositions(numberOfPositions)
                    .jobPosition(jobPosition)
                    .hiredCount(0)
                    .build();

            Vacancy savedVacancy = vacancyRepository.save(vacancy);

            // Send notifications about new vacancy
            String departmentName = jobPosition != null && jobPosition.getDepartment() != null
                    ? jobPosition.getDepartment().getName()
                    : "General";

            // Notify HR users about new vacancy
            notificationService.sendNotificationToHRUsers(
                    "New Vacancy Created",
                    "New vacancy '" + savedVacancy.getTitle() + "' has been created for " + departmentName + " department",
                    NotificationType.INFO,
                    "/vacancies/" + savedVacancy.getId(),
                    "new-vacancy-" + savedVacancy.getId()
            );

            // If it's a high priority vacancy, send additional notification
            if ("HIGH".equalsIgnoreCase(savedVacancy.getPriority())) {
                notificationService.sendNotificationToHRUsers(
                        "High Priority Vacancy",
                        "🚨 HIGH PRIORITY: " + savedVacancy.getTitle() + " - " + numberOfPositions + " position(s) needed urgently",
                        NotificationType.WARNING,
                        "/vacancies/" + savedVacancy.getId(),
                        "high-priority-vacancy-" + savedVacancy.getId()
                );
            }

            // Notify procurement if it's a procurement-related position
            if (jobPosition != null && jobPosition.getDepartment() != null) {
                String deptName = jobPosition.getDepartment().getName().toLowerCase();
                if (deptName.contains("procurement") || deptName.contains("purchasing")) {
                    notificationService.sendNotificationToProcurementUsers(
                            "New Procurement Vacancy",
                            "New vacancy in procurement: " + savedVacancy.getTitle(),
                            NotificationType.INFO,
                            "/vacancies/" + savedVacancy.getId(),
                            "procurement-vacancy-" + savedVacancy.getId()
                    );
                }
            }

            return savedVacancy;

        } catch (Exception e) {
            // Log the error for debugging
            System.err.println("Error creating vacancy: " + e.getMessage());
            e.printStackTrace();

            // Send error notification
            notificationService.sendNotificationToHRUsers(
                    "Vacancy Creation Failed",
                    "Failed to create vacancy: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/vacancies",
                    "vacancy-creation-error-" + System.currentTimeMillis()
            );

            throw new RuntimeException("Failed to create vacancy: " + e.getMessage(), e);
        }
    }

    @Transactional
    public Vacancy updateVacancy(UUID id, Vacancy vacancyDetails) {
        try {
            Vacancy vacancy = getVacancyById(id);
            String oldStatus = vacancy.getStatus();
            String oldPriority = vacancy.getPriority();
            LocalDate oldClosingDate = vacancy.getClosingDate();

            vacancy.setTitle(vacancyDetails.getTitle());
            vacancy.setDescription(vacancyDetails.getDescription());
            vacancy.setRequirements(vacancyDetails.getRequirements());
            vacancy.setResponsibilities(vacancyDetails.getResponsibilities());
            vacancy.setPostingDate(vacancyDetails.getPostingDate());
            vacancy.setClosingDate(vacancyDetails.getClosingDate());
            vacancy.setStatus(vacancyDetails.getStatus());
            vacancy.setNumberOfPositions(vacancyDetails.getNumberOfPositions());
            vacancy.setPriority(vacancyDetails.getPriority());
            vacancy.setJobPosition(vacancyDetails.getJobPosition());

            Vacancy updatedVacancy = vacancyRepository.save(vacancy);

            // Send notifications about significant changes
            sendVacancyUpdateNotifications(updatedVacancy, oldStatus, oldPriority, oldClosingDate);

            return updatedVacancy;

        } catch (Exception e) {
            // Send error notification
            notificationService.sendNotificationToHRUsers(
                    "Vacancy Update Failed",
                    "Failed to update vacancy: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/vacancies/" + id,
                    "vacancy-update-error-" + id
            );
            throw e;
        }
    }

    /**
     * Send notifications for vacancy updates
     */
    private void sendVacancyUpdateNotifications(Vacancy vacancy, String oldStatus, String oldPriority, LocalDate oldClosingDate) {
        // Status change notification
        if (!vacancy.getStatus().equals(oldStatus)) {
            NotificationType notificationType = getNotificationTypeForStatus(vacancy.getStatus());

            notificationService.sendNotificationToHRUsers(
                    "Vacancy Status Changed",
                    "Vacancy '" + vacancy.getTitle() + "' status changed from " + oldStatus + " to " + vacancy.getStatus(),
                    notificationType,
                    "/vacancies/" + vacancy.getId(),
                    "status-change-" + vacancy.getId() + "-" + vacancy.getStatus()
            );

            // Special handling for closed vacancies
            if ("CLOSED".equalsIgnoreCase(vacancy.getStatus())) {
                notificationService.sendNotificationToHRUsers(
                        "Vacancy Closed",
                        "Vacancy '" + vacancy.getTitle() + "' has been closed. " +
                                vacancy.getHiredCount() + "/" + vacancy.getNumberOfPositions() + " positions filled.",
                        NotificationType.SUCCESS,
                        "/vacancies/" + vacancy.getId() + "/statistics",
                        "vacancy-closed-" + vacancy.getId()
                );
            }
        }

        // Priority change notification
        if (!vacancy.getPriority().equals(oldPriority)) {
            if ("HIGH".equalsIgnoreCase(vacancy.getPriority())) {
                notificationService.sendNotificationToHRUsers(
                        "Vacancy Priority Elevated",
                        "🚨 Vacancy '" + vacancy.getTitle() + "' has been marked as HIGH PRIORITY",
                        NotificationType.WARNING,
                        "/vacancies/" + vacancy.getId(),
                        "priority-high-" + vacancy.getId()
                );
            }
        }

        // Closing date change notification
        if (vacancy.getClosingDate() != null && !vacancy.getClosingDate().equals(oldClosingDate)) {
            if (vacancy.getClosingDate().isBefore(LocalDate.now().plusDays(7))) {
                notificationService.sendNotificationToHRUsers(
                        "Vacancy Closing Soon",
                        "⏰ Vacancy '" + vacancy.getTitle() + "' will close on " + vacancy.getClosingDate(),
                        NotificationType.WARNING,
                        "/vacancies/" + vacancy.getId(),
                        "closing-soon-" + vacancy.getId()
                );
            }
        }
    }

    /**
     * Get notification type based on vacancy status
     */
    private NotificationType getNotificationTypeForStatus(String status) {
        switch (status.toUpperCase()) {
            case "ACTIVE":
                return NotificationType.SUCCESS;
            case "CLOSED":
                return NotificationType.INFO;
            case "SUSPENDED":
                return NotificationType.WARNING;
            case "CANCELLED":
                return NotificationType.ERROR;
            default:
                return NotificationType.INFO;
        }
    }

    @Transactional
    public void deleteVacancy(UUID id) {
        try {
            if (!vacancyRepository.existsById(id)) {
                throw new EntityNotFoundException("Vacancy not found with id: " + id);
            }

            Vacancy vacancy = getVacancyById(id);
            String vacancyTitle = vacancy.getTitle();

            // Handle candidates when deleting vacancy
            List<Candidate> candidates = candidateRepository.findByVacancyId(id);
            int candidatesAffected = 0;
            for (Candidate candidate : candidates) {
                if (candidate.getCandidateStatus() == Candidate.CandidateStatus.POTENTIAL) {
                    // Keep potential candidates but remove vacancy association
                    candidate.setVacancy(null);
                    candidateRepository.save(candidate);
                    candidatesAffected++;
                }
            }

            vacancyRepository.deleteById(id);

            // Send notification about vacancy deletion
            notificationService.sendNotificationToHRUsers(
                    "Vacancy Deleted",
                    "Vacancy '" + vacancyTitle + "' has been deleted. " + candidatesAffected + " candidates moved to potential list.",
                    NotificationType.WARNING,
                    "/vacancies",
                    "vacancy-deleted-" + id
            );

            // If there were active candidates, send additional warning
            if (candidatesAffected > 0) {
                notificationService.sendNotificationToHRUsers(
                        "Candidates Affected by Vacancy Deletion",
                        candidatesAffected + " candidates from '" + vacancyTitle + "' have been moved to the potential candidates list",
                        NotificationType.INFO,
                        "/candidates/potential",
                        "candidates-affected-" + id
                );
            }

        } catch (Exception e) {
            // Send error notification
            notificationService.sendNotificationToHRUsers(
                    "Vacancy Deletion Failed",
                    "Failed to delete vacancy: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/vacancies",
                    "vacancy-delete-error-" + id
            );
            throw e;
        }
    }

    /**
     * Hire a candidate and update vacancy position count
     */
    @Transactional
    public void hireCandidate(UUID candidateId) {
        try {
            Candidate candidate = candidateRepository.findById(candidateId)
                    .orElseThrow(() -> new EntityNotFoundException("Candidate not found"));

            Vacancy vacancy = candidate.getVacancy();
            if (vacancy == null) {
                throw new IllegalStateException("Candidate is not associated with any vacancy");
            }

            // Check if vacancy has available positions
            if (!vacancy.hasAvailablePositions()) {
                throw new IllegalStateException("No available positions in this vacancy");
            }

            String candidateName = candidate.getFirstName() + " " + candidate.getLastName();
            String vacancyTitle = vacancy.getTitle();

            // Update candidate status
            candidate.setCandidateStatus(Candidate.CandidateStatus.HIRED);
            candidate.setHiredDate(LocalDate.now());
            candidateRepository.save(candidate);

            // Update vacancy hired count
            vacancy.incrementHiredCount();
            vacancyRepository.save(vacancy);

            // Send hiring notifications
            notificationService.sendNotificationToHRUsers(
                    "Candidate Hired Successfully",
                    "🎉 " + candidateName + " has been hired for " + vacancyTitle + ". " +
                            "Positions filled: " + vacancy.getHiredCount() + "/" + vacancy.getNumberOfPositions(),
                    NotificationType.SUCCESS,
                    "/candidates/" + candidateId,
                    "hired-success-" + candidateId
            );

            // Check if vacancy is now full
            if (vacancy.isFull()) {
                notificationService.sendNotificationToHRUsers(
                        "Vacancy Fully Filled",
                        "✅ All positions for '" + vacancyTitle + "' have been filled! " +
                                "Remaining candidates will be moved to potential list.",
                        NotificationType.SUCCESS,
                        "/vacancies/" + vacancy.getId() + "/statistics",
                        "vacancy-full-" + vacancy.getId()
                );

                // Move remaining candidates to potential list
                moveCandidatesToPotentialList(vacancy.getId());
            } else {
                // Send update about remaining positions
                int remaining = vacancy.getRemainingPositions();
                notificationService.sendNotificationToHRUsers(
                        "Vacancy Update",
                        vacancyTitle + " - " + remaining + " position(s) still available",
                        NotificationType.INFO,
                        "/vacancies/" + vacancy.getId(),
                        "positions-remaining-" + vacancy.getId()
                );
            }

            // Notify relevant department
            if (vacancy.getJobPosition() != null && vacancy.getJobPosition().getDepartment() != null) {
                String departmentName = vacancy.getJobPosition().getDepartment().getName();
                notificationService.sendNotificationToHRUsers(
                        "New Hire for " + departmentName,
                        candidateName + " will be joining " + departmentName + " as " + vacancy.getJobPosition().getPositionName(),
                        NotificationType.SUCCESS,
                        "/employees/onboarding",
                        "new-hire-dept-" + candidateId
                );
            }

        } catch (Exception e) {
            // Send error notification
            notificationService.sendNotificationToHRUsers(
                    "Hiring Process Failed",
                    "Failed to hire candidate: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/candidates/" + candidateId,
                    "hire-error-" + candidateId
            );
            throw e;
        }
    }

    /**
     * Move candidates to potential list when vacancy becomes full
     */
    @Transactional
    public void moveCandidatesToPotentialList(UUID vacancyId) {
        try {
            List<Candidate> activeCandidates = candidateRepository.findByVacancyId(vacancyId)
                    .stream()
                    .filter(Candidate::isActive)
                    .collect(Collectors.toList());

            int candidatesMoved = 0;
            for (Candidate candidate : activeCandidates) {
                candidate.setCandidateStatus(Candidate.CandidateStatus.POTENTIAL);
                candidateRepository.save(candidate);
                candidatesMoved++;
            }

            if (candidatesMoved > 0) {
                notificationService.sendNotificationToHRUsers(
                        "Candidates Moved to Potential List",
                        candidatesMoved + " candidates have been moved to the potential candidates list",
                        NotificationType.INFO,
                        "/candidates/potential",
                        "moved-to-potential-" + vacancyId + "-" + candidatesMoved
                );
            }

        } catch (Exception e) {
            notificationService.sendNotificationToHRUsers(
                    "Error Moving Candidates",
                    "Failed to move candidates to potential list: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/candidates",
                    "move-error-" + vacancyId
            );
        }
    }

    /**
     * Get vacancy statistics including position information
     */
    public Map<String, Object> getVacancyStatistics(UUID vacancyId) {
        Vacancy vacancy = getVacancyById(vacancyId);
        List<Candidate> candidates = candidateRepository.findByVacancyId(vacancyId);

        long appliedCount = candidates.stream()
                .filter(c -> c.getCandidateStatus() == Candidate.CandidateStatus.APPLIED)
                .count();
        long underReviewCount = candidates.stream()
                .filter(c -> c.getCandidateStatus() == Candidate.CandidateStatus.UNDER_REVIEW)
                .count();
        long interviewedCount = candidates.stream()
                .filter(c -> c.getCandidateStatus() == Candidate.CandidateStatus.INTERVIEWED)
                .count();
        long hiredCount = candidates.stream()
                .filter(c -> c.getCandidateStatus() == Candidate.CandidateStatus.HIRED)
                .count();
        long potentialCount = candidates.stream()
                .filter(c -> c.getCandidateStatus() == Candidate.CandidateStatus.POTENTIAL)
                .count();

        // Check for vacancy status alerts
        checkVacancyAlerts(vacancy, candidates.size());

        return Map.of(
                "totalPositions", vacancy.getNumberOfPositions(),
                "remainingPositions", vacancy.getRemainingPositions(),
                "hiredCount", vacancy.getHiredCount(),
                "filledPercentage", vacancy.getFilledPercentage(),
                "isFull", vacancy.isFull(),
                "closingDate", vacancy.getClosingDate(),
                "candidateStats", Map.of(
                        "applied", appliedCount,
                        "underReview", underReviewCount,
                        "interviewed", interviewedCount,
                        "hired", hiredCount,
                        "potential", potentialCount,
                        "total", candidates.size()
                )
        );
    }

    /**
     * Check for vacancy alerts and send notifications
     */
    private void checkVacancyAlerts(Vacancy vacancy, int totalCandidates) {
        LocalDate now = LocalDate.now();

        // Check if vacancy is closing soon
        if (vacancy.getClosingDate() != null) {
            long daysUntilClose = java.time.temporal.ChronoUnit.DAYS.between(now, vacancy.getClosingDate());

            if (daysUntilClose <= 3 && daysUntilClose > 0 && !vacancy.isFull()) {
                notificationService.sendNotificationToHRUsers(
                        "Vacancy Closing Soon",
                        "⏰ Vacancy '" + vacancy.getTitle() + "' closes in " + daysUntilClose + " day(s). " +
                                vacancy.getRemainingPositions() + " position(s) still available.",
                        NotificationType.WARNING,
                        "/vacancies/" + vacancy.getId(),
                        "closing-alert-" + vacancy.getId() + "-" + daysUntilClose
                );
            }
        }

        // Check if there are no candidates for high priority vacancy
        if ("HIGH".equalsIgnoreCase(vacancy.getPriority()) && totalCandidates == 0) {
            notificationService.sendNotificationToHRUsers(
                    "High Priority Vacancy Needs Attention",
                    "🚨 HIGH PRIORITY vacancy '" + vacancy.getTitle() + "' has no candidates yet!",
                    NotificationType.ERROR,
                    "/vacancies/" + vacancy.getId(),
                    "no-candidates-high-priority-" + vacancy.getId()
            );
        }

        // Check if vacancy has been open for too long without fills
        if (vacancy.getPostingDate() != null) {
            long daysOpen = java.time.temporal.ChronoUnit.DAYS.between(vacancy.getPostingDate(), now);

            if (daysOpen > 30 && vacancy.getHiredCount() == 0) {
                notificationService.sendNotificationToHRUsers(
                        "Long-Open Vacancy Alert",
                        "📅 Vacancy '" + vacancy.getTitle() + "' has been open for " + daysOpen + " days with no hires. Review may be needed.",
                        NotificationType.WARNING,
                        "/vacancies/" + vacancy.getId(),
                        "long-open-" + vacancy.getId()
                );
            }
        }
    }

    /**
     * Get potential candidates (from filled vacancies)
     */
    public List<Candidate> getPotentialCandidates() {
        return candidateRepository.findAll().stream()
                .filter(c -> c.getCandidateStatus() == Candidate.CandidateStatus.POTENTIAL)
                .collect(Collectors.toList());
    }
}