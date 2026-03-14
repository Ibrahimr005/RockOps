package com.example.backend.services.hr;

import com.example.backend.models.hr.Candidate;
import com.example.backend.models.hr.Vacancy;
import com.example.backend.models.notification.NotificationType;
import com.example.backend.repositories.VacancyRepository;
import com.example.backend.repositories.hr.CandidateRepository;
import com.example.backend.services.notification.NotificationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VacancyScheduledServiceTest {

    @Mock
    private VacancyRepository vacancyRepository;

    @Mock
    private CandidateRepository candidateRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private VacancyScheduledService vacancyScheduledService;

    private Vacancy createVacancy(UUID id, String title, String status, LocalDate closingDate,
                                  Integer numberOfPositions, Integer hiredCount) {
        return Vacancy.builder()
                .id(id)
                .title(title)
                .status(status)
                .closingDate(closingDate)
                .numberOfPositions(numberOfPositions)
                .hiredCount(hiredCount)
                .build();
    }

    private Candidate createCandidate(UUID id, Candidate.CandidateStatus status) {
        Candidate candidate = new Candidate();
        candidate.setId(id);
        candidate.setFirstName("John");
        candidate.setLastName("Doe");
        candidate.setCandidateStatus(status);
        return candidate;
    }

    // =========================================================================
    // processExpiredVacancies
    // =========================================================================
    @Nested
    @DisplayName("processExpiredVacancies")
    class ProcessExpiredVacancies {

        @Test
        @DisplayName("should do nothing when no expired vacancies exist")
        void shouldDoNothingWhenNoExpired() {
            when(vacancyRepository.findByClosingDateBefore(any(LocalDate.class)))
                    .thenReturn(Collections.emptyList());

            vacancyScheduledService.processExpiredVacancies();

            verify(vacancyRepository, never()).save(any(Vacancy.class));
            verify(candidateRepository, never()).findByVacancyId(any());
            // No summary notification should be sent since processedCount is 0
            verify(notificationService, never()).sendNotificationToHRUsers(
                    eq("Daily Vacancy Processing Complete"),
                    anyString(),
                    any(NotificationType.class),
                    anyString(),
                    anyString()
            );
        }

        @Test
        @DisplayName("should close expired vacancies and move active candidates to POTENTIAL")
        void shouldCloseExpiredAndMoveCandidates() {
            UUID vacancyId = UUID.randomUUID();
            Vacancy expiredVacancy = createVacancy(vacancyId, "Software Engineer",
                    "OPEN", LocalDate.now().minusDays(1), 2, 0);

            Candidate activeCandidate = createCandidate(UUID.randomUUID(), Candidate.CandidateStatus.APPLIED);
            Candidate hiredCandidate = createCandidate(UUID.randomUUID(), Candidate.CandidateStatus.HIRED);

            when(vacancyRepository.findByClosingDateBefore(any(LocalDate.class)))
                    .thenReturn(List.of(expiredVacancy));
            when(candidateRepository.findByVacancyId(vacancyId))
                    .thenReturn(List.of(activeCandidate, hiredCandidate));
            when(candidateRepository.save(any(Candidate.class))).thenAnswer(inv -> inv.getArgument(0));
            when(vacancyRepository.save(any(Vacancy.class))).thenAnswer(inv -> inv.getArgument(0));

            vacancyScheduledService.processExpiredVacancies();

            // The vacancy should be saved with CLOSED status
            verify(vacancyRepository).save(argThat(v -> "CLOSED".equals(v.getStatus())));

            // Only active candidate should be moved to POTENTIAL (HIRED is not active)
            verify(candidateRepository).save(argThat(c ->
                    c.getCandidateStatus() == Candidate.CandidateStatus.POTENTIAL));

            // Per-vacancy notification
            verify(notificationService).sendNotificationToHRUsers(
                    eq("Vacancy Automatically Closed"),
                    anyString(),
                    eq(NotificationType.INFO),
                    contains(vacancyId.toString()),
                    anyString()
            );

            // Summary notification
            verify(notificationService).sendNotificationToHRUsers(
                    eq("Daily Vacancy Processing Complete"),
                    anyString(),
                    eq(NotificationType.SUCCESS),
                    eq("/hr/vacancies"),
                    anyString()
            );
        }

        @Test
        @DisplayName("should send error notification when vacancy processing fails")
        void shouldSendErrorNotificationOnProcessingError() {
            UUID vacancyId = UUID.randomUUID();
            Vacancy expiredVacancy = createVacancy(vacancyId, "Failed Vacancy",
                    "OPEN", LocalDate.now().minusDays(1), 1, 0);

            when(vacancyRepository.findByClosingDateBefore(any(LocalDate.class)))
                    .thenReturn(List.of(expiredVacancy));
            when(candidateRepository.findByVacancyId(vacancyId))
                    .thenThrow(new RuntimeException("Database error"));

            vacancyScheduledService.processExpiredVacancies();

            verify(notificationService).sendNotificationToHRUsers(
                    eq("Error Processing Expired Vacancy"),
                    contains("Database error"),
                    eq(NotificationType.ERROR),
                    contains(vacancyId.toString()),
                    anyString()
            );
        }

        @Test
        @DisplayName("should handle expired vacancy with no candidates")
        void shouldHandleExpiredVacancyWithNoCandidates() {
            UUID vacancyId = UUID.randomUUID();
            Vacancy expiredVacancy = createVacancy(vacancyId, "No Candidates Job",
                    "OPEN", LocalDate.now().minusDays(2), 3, 0);

            when(vacancyRepository.findByClosingDateBefore(any(LocalDate.class)))
                    .thenReturn(List.of(expiredVacancy));
            when(candidateRepository.findByVacancyId(vacancyId))
                    .thenReturn(Collections.emptyList());
            when(vacancyRepository.save(any(Vacancy.class))).thenAnswer(inv -> inv.getArgument(0));

            vacancyScheduledService.processExpiredVacancies();

            verify(vacancyRepository).save(argThat(v -> "CLOSED".equals(v.getStatus())));
            verify(candidateRepository, never()).save(any(Candidate.class));
        }
    }

    // =========================================================================
    // checkVacanciesClosingSoon
    // =========================================================================
    @Nested
    @DisplayName("checkVacanciesClosingSoon")
    class CheckVacanciesClosingSoon {

        @Test
        @DisplayName("should do nothing when no vacancies are closing soon")
        void shouldDoNothingWhenNoneClosingSoon() {
            when(vacancyRepository.findByStatusAndClosingDateBetween(
                    eq("OPEN"), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(Collections.emptyList());

            vacancyScheduledService.checkVacanciesClosingSoon();

            verify(notificationService, never()).sendNotificationToHRUsers(
                    anyString(), anyString(), any(), anyString(), anyString());
        }

        @Test
        @DisplayName("should send warning for vacancies closing soon that are not full")
        void shouldSendWarningForNotFullVacancies() {
            UUID vacancyId = UUID.randomUUID();
            // Not full: 3 positions, 1 hired
            Vacancy closingSoon = createVacancy(vacancyId, "Urgent Role",
                    "OPEN", LocalDate.now().plusDays(2), 3, 1);

            when(vacancyRepository.findByStatusAndClosingDateBetween(
                    eq("OPEN"), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(List.of(closingSoon));

            vacancyScheduledService.checkVacanciesClosingSoon();

            verify(notificationService).sendNotificationToHRUsers(
                    eq("Vacancy Closing Soon"),
                    anyString(),
                    eq(NotificationType.WARNING),
                    contains(vacancyId.toString()),
                    anyString()
            );
        }

        @Test
        @DisplayName("should not send notification for full vacancies closing soon")
        void shouldNotNotifyForFullVacancies() {
            UUID vacancyId = UUID.randomUUID();
            // Full: 2 positions, 2 hired
            Vacancy fullVacancy = createVacancy(vacancyId, "Full Role",
                    "OPEN", LocalDate.now().plusDays(1), 2, 2);

            when(vacancyRepository.findByStatusAndClosingDateBetween(
                    eq("OPEN"), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(List.of(fullVacancy));

            vacancyScheduledService.checkVacanciesClosingSoon();

            verify(notificationService, never()).sendNotificationToHRUsers(
                    anyString(), anyString(), any(), anyString(), anyString());
        }

        @Test
        @DisplayName("should send notifications for multiple non-full vacancies closing soon")
        void shouldNotifyMultipleNonFullVacancies() {
            Vacancy v1 = createVacancy(UUID.randomUUID(), "Role A",
                    "OPEN", LocalDate.now().plusDays(1), 5, 2);
            Vacancy v2 = createVacancy(UUID.randomUUID(), "Role B",
                    "OPEN", LocalDate.now().plusDays(2), 3, 0);

            when(vacancyRepository.findByStatusAndClosingDateBetween(
                    eq("OPEN"), any(LocalDate.class), any(LocalDate.class)))
                    .thenReturn(List.of(v1, v2));

            vacancyScheduledService.checkVacanciesClosingSoon();

            verify(notificationService, times(2)).sendNotificationToHRUsers(
                    eq("Vacancy Closing Soon"),
                    anyString(),
                    eq(NotificationType.WARNING),
                    anyString(),
                    anyString()
            );
        }
    }
}