package com.example.backend.services.hr;

import com.example.backend.dto.hr.jobposition.MinimalJobPositionDTO;
import com.example.backend.dto.hr.vacancy.CreateVacancyDTO;
import com.example.backend.dto.hr.vacancy.UpdateVacancyDTO;
import com.example.backend.dto.hr.vacancy.VacancyDTO;
import com.example.backend.models.hr.Candidate;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.hr.Vacancy;
import com.example.backend.models.id.EntityTypeConfig;
import com.example.backend.models.notification.NotificationType;
import com.example.backend.repositories.VacancyRepository;
import com.example.backend.repositories.hr.CandidateRepository;
import com.example.backend.repositories.hr.JobPositionRepository;
import com.example.backend.services.id.EntityIdGeneratorService;
import com.example.backend.services.notification.NotificationService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Date;
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

    @Autowired
    private EntityIdGeneratorService entityIdGeneratorService;

    public List<VacancyDTO> getAllVacancies() {
        return vacancyRepository.findAll().stream()
                .map(this::mapVacanciesDTO)
                .collect(Collectors.toList());
    }

    private VacancyDTO mapVacanciesDTO(Vacancy vacancy) {
        MinimalJobPositionDTO jobPositionDTO = null;
        JobPosition jobPosition = vacancy.getJobPosition();

        if (jobPosition != null) {
            jobPositionDTO = MinimalJobPositionDTO.builder()
                    .id(jobPosition.getId())
                    .positionNumber(jobPosition.getPositionNumber())
                    .positionName(jobPosition.getPositionName())
                    .experienceLevel(jobPosition.getExperienceLevel())
                    .contractType(jobPosition.getContractType().name())
                    .active(jobPosition.isActive())
                    .departmentName(jobPosition.getDepartment() != null ? jobPosition.getDepartment().getName() : null)
                    .build();
        }

        return VacancyDTO.builder()
                .id(vacancy.getId())
                .vacancyNumber(vacancy.getVacancyNumber())
                .title(vacancy.getTitle())
                .description(vacancy.getDescription())
                .status(vacancy.getStatus())
                .postingDate(vacancy.getPostingDate())
                .closingDate(vacancy.getClosingDate())
                .numberOfPositions(vacancy.getNumberOfPositions())
                .hiredCount(vacancy.getHiredCount())
                .priority(vacancy.getPriority())
                .requirements(vacancy.getRequirements())
                .responsibilities(vacancy.getResponsibilities())
                .jobPosition(jobPositionDTO)
                .build();
    }


    public VacancyDTO getVacancyById(UUID id) {
        Vacancy vacancy = vacancyRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Vacancy not found with id: " + id));

        return mapVacanciesDTO(vacancy);
    }

    @Transactional
    public Vacancy createVacancy(CreateVacancyDTO dto) {

        // Basic validations
        if (dto.getTitle() == null || dto.getTitle().isBlank()) {
            throw new IllegalArgumentException("Title is required");
        }

        String trimmedTitle = dto.getTitle().trim();

        // Duplicate title check
        if (vacancyRepository.existsByTitleIgnoreCase(trimmedTitle)) {
            throw new IllegalArgumentException("Vacancy title already exists");
        }

        if (dto.getDescription() == null || dto.getDescription().isBlank()) {
            throw new IllegalArgumentException("Description is required");
        }

        if (dto.getClosingDate() == null) {
            throw new IllegalArgumentException("Closing date is required");
        }

        if (dto.getPostingDate() != null && dto.getClosingDate().isBefore(dto.getPostingDate())) {
            throw new IllegalArgumentException("Closing date cannot be before posting date");
        }

        if (dto.getNumberOfPositions() != null && dto.getNumberOfPositions() < 1) {
            throw new IllegalArgumentException("Number of positions must be at least 1");
        }

        JobPosition jobPosition = null;
        if (dto.getJobPositionId() != null) {
            UUID jobPositionId = dto.getJobPositionId();
            jobPosition = jobPositionRepository.findByIdWithDepartment(jobPositionId)
                    .orElseThrow(() -> new EntityNotFoundException("Job position not found with ID: " + jobPositionId));
        }

        String determinedStatus = determineVacancyStatus(dto);

        // Generate vacancy number
        String vacancyNumber = entityIdGeneratorService.generateNextId(EntityTypeConfig.VACANCY);

        Vacancy vacancy = Vacancy.builder()
                .vacancyNumber(vacancyNumber)
                .title(trimmedTitle)
                .description(dto.getDescription().trim())
                .requirements(dto.getRequirements() != null ? dto.getRequirements().trim() : null)
                .responsibilities(dto.getResponsibilities() != null ? dto.getResponsibilities().trim() : null)
                .postingDate(dto.getPostingDate())
                .closingDate(dto.getClosingDate())
                .status(determinedStatus)
                .priority(dto.getPriority() != null ? dto.getPriority() : "MEDIUM")
                .numberOfPositions(dto.getNumberOfPositions() != null ? dto.getNumberOfPositions() : 1)
                .jobPosition(jobPosition)
                .hiredCount(0)
                .build();

        return vacancyRepository.save(vacancy);
    }


    /**
     * Send notifications for vacancy creation (isolated from main logic)
     */
    private void sendVacancyCreationNotifications(Vacancy savedVacancy, JobPosition jobPosition) {
        try {
            // Send notifications about new vacancy
            String departmentName = jobPosition != null && jobPosition.getDepartment() != null
                    ? jobPosition.getDepartment().getName()
                    : "General";

            // Notify HR users about new vacancy
            notificationService.sendNotificationToHRUsers(
                    "New Vacancy Created",
                    "New vacancy '" + savedVacancy.getTitle() + "' has been created for " + departmentName + " department",
                    NotificationType.INFO,
                    "/hr/vacancies/" + savedVacancy.getId(),
                    "new-vacancy-" + savedVacancy.getId()
            );

            // If it's a high priority vacancy, send additional notification
            if ("HIGH".equalsIgnoreCase(savedVacancy.getPriority())) {
                notificationService.sendNotificationToHRUsers(
                        "High Priority Vacancy",
                        "🚨 HIGH PRIORITY: " + savedVacancy.getTitle() + " - " + savedVacancy.getNumberOfPositions() + " position(s) needed urgently",
                        NotificationType.WARNING,
                        "/hr/vacancies/" + savedVacancy.getId(),
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
                            "/hr/vacancies/" + savedVacancy.getId(),
                            "procurement-vacancy-" + savedVacancy.getId()
                    );
                }
            }
        } catch (Exception e) {
            System.err.println("Error sending vacancy creation notifications: " + e.getMessage());
            throw e; // Re-throw to be caught by caller
        }
    }
    @Transactional
    public Vacancy updateVacancy(UUID id, UpdateVacancyDTO dto) {


        try {
            Vacancy vacancy = getVacancyEntityById(id); // use entity version
            String oldStatus = vacancy.getStatus();
            String oldPriority = vacancy.getPriority();
            LocalDate oldClosingDate = vacancy.getClosingDate();



            // Basic validations
            if (dto.getTitle() != null && dto.getTitle().isBlank()) {
                throw new IllegalArgumentException("Title cannot be empty");
            }

            String trimmedTitle = dto.getTitle().trim();

            if (vacancyRepository.existsByTitleIgnoreCase(trimmedTitle)) {
                throw new IllegalArgumentException("Vacancy title already exists");
            }

            if (dto.getDescription() != null && dto.getDescription().isBlank()) {
                throw new IllegalArgumentException("Description cannot be empty");
            }

            if (dto.getPostingDate() != null && dto.getClosingDate() != null &&
                    dto.getClosingDate().isBefore(dto.getPostingDate())) {
                throw new IllegalArgumentException("Closing date cannot be before posting date");
            }

            if (dto.getNumberOfPositions() != null && dto.getNumberOfPositions() < 1) {
                throw new IllegalArgumentException("Number of positions must be at least 1");
            }

            // Handle job position update
            JobPosition jobPosition = null;
            if (dto.getJobPositionId() != null) {
                jobPosition = jobPositionRepository.findByIdWithDepartment(dto.getJobPositionId())
                        .orElseThrow(() -> new EntityNotFoundException("Job position not found with ID: " + dto.getJobPositionId()));
                System.out.println("DEBUG: Found job position: " + jobPosition.getPositionName());
            }

            // Update fields only if they're provided
            if (dto.getTitle() != null) vacancy.setTitle(dto.getTitle().trim());
            if (dto.getDescription() != null) vacancy.setDescription(dto.getDescription().trim());
            if (dto.getRequirements() != null) vacancy.setRequirements(dto.getRequirements().trim());
            if (dto.getResponsibilities() != null) vacancy.setResponsibilities(dto.getResponsibilities().trim());
            if (dto.getPostingDate() != null) vacancy.setPostingDate(dto.getPostingDate());
            if (dto.getClosingDate() != null) vacancy.setClosingDate(dto.getClosingDate());
            if (dto.getStatus() != null) vacancy.setStatus(dto.getStatus());
            if (dto.getNumberOfPositions() != null) vacancy.setNumberOfPositions(dto.getNumberOfPositions());
            if (dto.getPriority() != null) vacancy.setPriority(dto.getPriority());
            if (dto.getJobPositionId() != null) vacancy.setJobPosition(jobPosition);

            Vacancy updatedVacancy = vacancyRepository.save(vacancy);

            // Send notifications about significant changes
            sendVacancyUpdateNotifications(updatedVacancy, oldStatus, oldPriority, oldClosingDate);

            // Return DTO instead of entity
            return updatedVacancy;

        } catch (Exception e) {
            System.err.println("Error updating vacancy: " + e.getMessage());
            notificationService.sendNotificationToHRUsers(
                    "Vacancy Update Failed",
                    "Failed to update vacancy: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/hr/vacancies/" + id,
                    "vacancy-update-error-" + id
            );
            throw e;
        }
    }

    private Vacancy getVacancyEntityById(UUID id) {
        return vacancyRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Vacancy not found with id: " + id));
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
                    "/hr/vacancies/" + vacancy.getId(),
                    "status-change-" + vacancy.getId() + "-" + vacancy.getStatus()
            );

            // Special handling for closed vacancies
            if ("CLOSED".equalsIgnoreCase(vacancy.getStatus())) {
                notificationService.sendNotificationToHRUsers(
                        "Vacancy Closed",
                        "Vacancy '" + vacancy.getTitle() + "' has been closed. " +
                                vacancy.getHiredCount() + "/" + vacancy.getNumberOfPositions() + " positions filled.",
                        NotificationType.SUCCESS,
                        "/hr/vacancies/" + vacancy.getId() + "/statistics",
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
                        "/hr/vacancies/" + vacancy.getId(),
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
                        "/hr/vacancies/" + vacancy.getId(),
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

            Vacancy vacancy = getVacancyEntityById(id);
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
                    "/hr/vacancies",
                    "vacancy-deleted-" + id
            );

            // If there were active candidates, send additional warning
            if (candidatesAffected > 0) {
                notificationService.sendNotificationToHRUsers(
                        "Candidates Affected by Vacancy Deletion",
                        candidatesAffected + " candidates from '" + vacancyTitle + "' have been moved to the potential candidates list",
                        NotificationType.INFO,
                        "/hr/potential-candidates",
                        "candidates-affected-" + id
                );
            }

        } catch (Exception e) {
            // Send error notification
            notificationService.sendNotificationToHRUsers(
                    "Vacancy Deletion Failed",
                    "Failed to delete vacancy: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/hr/vacancies",
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
                    "/hr/potential-candidates/" + candidateId,
                    "hired-success-" + candidateId
            );

            // Check if vacancy is now full
            if (vacancy.isFull()) {
                notificationService.sendNotificationToHRUsers(
                        "Vacancy Fully Filled",
                        "✅ All positions for '" + vacancyTitle + "' have been filled! " +
                                "Remaining candidates will be moved to potential list.",
                        NotificationType.SUCCESS,
                        "/hr/vacancies/" + vacancy.getId() + "/statistics",
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
                        "/hr/vacancies/" + vacancy.getId(),
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
                        "/hr/:id/onboarding",
                        "new-hire-dept-" + candidateId
                );
            }

        } catch (Exception e) {
            // Send error notification
            notificationService.sendNotificationToHRUsers(
                    "Hiring Process Failed",
                    "Failed to hire candidate: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/hr/potential-candidates/" + candidateId,
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
                        "/hr/potential-candidates",
                        "moved-to-potential-" + vacancyId + "-" + candidatesMoved
                );
            }

        } catch (Exception e) {
            notificationService.sendNotificationToHRUsers(
                    "Error Moving Candidates",
                    "Failed to move candidates to potential list: " + e.getMessage(),
                    NotificationType.ERROR,
                    "/hr/potential-candidates",
                    "move-error-" + vacancyId
            );
        }
    }

    /**
     * Get vacancy statistics including position information
     */
    public Map<String, Object> getVacancyStatistics(UUID vacancyId) {
        Vacancy vacancy = getVacancyEntityById(vacancyId);
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
                        "/hr/vacancies/" + vacancy.getId(),
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
                    "/hr/vacancies/" + vacancy.getId(),
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
                        "/hr/vacancies/" + vacancy.getId(),
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

    private String determineVacancyStatus(CreateVacancyDTO dto) {
        LocalDate today = LocalDate.now();
        LocalDate closingDate = dto.getClosingDate();

        // If user explicitly sets a status, respect it (with validation)
        if (dto.getStatus() != null && !dto.getStatus().isEmpty()) {
            String requestedStatus = dto.getStatus().toUpperCase();

            // Validate that requested status makes sense with dates
            if ("OPEN".equals(requestedStatus) && closingDate.isBefore(today)) {
                throw new IllegalArgumentException(
                        "Cannot set vacancy as OPEN with a past closing date: " + closingDate
                );
            }

            return requestedStatus;
        }

        // Auto-determine status based on dates
        if (closingDate.isAfter(today)) {
            return "OPEN";
        } else if (closingDate.equals(today)) {
            return "OPEN"; // Still open on closing day
        } else {
            return "CLOSED"; // Past closing date
        }
    }
}