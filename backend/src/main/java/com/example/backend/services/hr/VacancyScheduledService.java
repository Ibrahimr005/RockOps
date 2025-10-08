package com.example.backend.services.hr;

import com.example.backend.models.hr.Candidate;
import com.example.backend.models.hr.Vacancy;
import com.example.backend.models.notification.NotificationType;
import com.example.backend.repositories.VacancyRepository;
import com.example.backend.repositories.hr.CandidateRepository;
import com.example.backend.services.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class VacancyScheduledService {

    private final VacancyRepository vacancyRepository;
    private final CandidateRepository candidateRepository;
    private final NotificationService notificationService;

    /**
     * Check for vacancies that have reached their closure date and need automatic processing
     * Runs daily at 9:00 AM
     */
    @Scheduled(cron = "0 0 9 * * ?")
//    @Scheduled(cron = "0 */1 * * * ?")  // Every 5 minutes for testing
    @Transactional
    public void processExpiredVacancies() {
        log.info("Starting daily vacancy expiration check");
        
        LocalDate today = LocalDate.now();
        List<Vacancy> expiredVacancies = vacancyRepository.findByClosingDateBefore(today);


        System.out.println("expired vacancies: " + expiredVacancies.stream().toList().toString());
        int processedCount = 0;
        int totalCandidatesMoved = 0;
        
        for (Vacancy vacancy : expiredVacancies) {
            try {
                log.info("Processing expired vacancy: {} (ID: {})", vacancy.getTitle(), vacancy.getId());
                
                // Move candidates to potential list
                int candidatesMoved = moveCandidatesToPotential(vacancy);
                System.out.println("Candidates moved: " + candidatesMoved);
                totalCandidatesMoved += candidatesMoved;
                
                // Update vacancy status to CLOSED
                vacancy.setStatus("CLOSED");
                vacancyRepository.save(vacancy);
                
                processedCount++;
                
                // Send notification for this specific vacancy
                notificationService.sendNotificationToHRUsers(
                    "Vacancy Automatically Closed",
                    String.format("Vacancy '%s' reached its closing date and has been automatically closed. " +
                                 "%d candidates moved to potential list.", 
                                 vacancy.getTitle(), candidatesMoved),
                    NotificationType.INFO,
                    "/hr/vacancies/" + vacancy.getId(),
                    "auto-closed-" + vacancy.getId()
                );
                
            } catch (Exception e) {
                log.error("Error processing expired vacancy {}: {}", vacancy.getId(), e.getMessage(), e);
                
                // Send error notification
                notificationService.sendNotificationToHRUsers(
                    "Error Processing Expired Vacancy",
                    String.format("Failed to process expired vacancy '%s': %s", 
                                 vacancy.getTitle(), e.getMessage()),
                    NotificationType.ERROR,
                    "/hr/vacancies/" + vacancy.getId(),
                    "auto-close-error-" + vacancy.getId()
                );
            }
        }
        
        if (processedCount > 0) {
            log.info("Processed {} expired vacancies, moved {} total candidates to potential list", 
                    processedCount, totalCandidatesMoved);
            
            // Send summary notification
            notificationService.sendNotificationToHRUsers(
                "Daily Vacancy Processing Complete",
                String.format("Automatically processed %d expired vacancies and moved %d candidates to potential list.", 
                             processedCount, totalCandidatesMoved),
                NotificationType.SUCCESS,
                "/hr/vacancies",
                "daily-processing-" + today
            );
        }
    }
    
    /**
     * Move active candidates from a vacancy to potential list
     */
    private int moveCandidatesToPotential(Vacancy vacancy) {
        List<Candidate> activeCandidates = candidateRepository.findByVacancyId(vacancy.getId())
            .stream()
            .filter(Candidate::isActive)
            .toList();
            
        int movedCount = 0;
        
        for (Candidate candidate : activeCandidates) {
            candidate.setCandidateStatus(Candidate.CandidateStatus.POTENTIAL);
            candidateRepository.save(candidate);
            movedCount++;
            
            log.debug("Moved candidate {} {} to potential list", 
                     candidate.getFirstName(), candidate.getLastName());
        }
        
        return movedCount;
    }
    
    /**
     * Check for vacancies closing soon (runs daily at 8:00 AM)
     * Sends warning notifications for vacancies closing within 3 days
     */
    @Scheduled(cron = "0 0 8 * * ?")
    public void checkVacanciesClosingSoon() {
        log.info("Checking for vacancies closing soon");
        
        LocalDate today = LocalDate.now();
        LocalDate threeDaysFromNow = today.plusDays(3);
        
        List<Vacancy> closingSoonVacancies = vacancyRepository
            .findByStatusAndClosingDateBetween("OPEN", today.plusDays(1), threeDaysFromNow);
            
        for (Vacancy vacancy : closingSoonVacancies) {
            long daysUntilClose = java.time.temporal.ChronoUnit.DAYS.between(today, vacancy.getClosingDate());
            
            if (!vacancy.isFull()) {
                notificationService.sendNotificationToHRUsers(
                    "Vacancy Closing Soon",
                    String.format("⏰ Vacancy '%s' closes in %d day(s). %d position(s) still available.",
                                 vacancy.getTitle(), daysUntilClose, vacancy.getRemainingPositions()),
                    NotificationType.WARNING,
                    "/hr/vacancies/" + vacancy.getId(),
                    "closing-soon-" + vacancy.getId() + "-" + daysUntilClose
                );
            }
        }
    }
}