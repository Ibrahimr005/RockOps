package com.example.backend.services.hr;

import com.example.backend.models.hr.Candidate;
import com.example.backend.models.hr.Candidate.CandidateStatus;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.models.hr.Vacancy;
import com.example.backend.repositories.hr.CandidateRepository;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.VacancyRepository;
import com.example.backend.services.MinioService;
import com.example.backend.services.notification.NotificationService;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CandidateServiceTest {

    @Mock
    private CandidateRepository candidateRepository;

    @Mock
    private VacancyRepository vacancyRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private MinioService minioService;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private CandidateService candidateService;

    private Candidate candidate;
    private Vacancy vacancy;
    private UUID candidateId;
    private UUID vacancyId;

    @BeforeEach
    void setUp() {
        candidateId = UUID.randomUUID();
        vacancyId = UUID.randomUUID();

        JobPosition jobPosition = JobPosition.builder()
                .id(UUID.randomUUID())
                .positionName("Developer")
                .build();

        vacancy = Vacancy.builder()
                .id(vacancyId)
                .title("Senior Developer")
                .jobPosition(jobPosition)
                .numberOfPositions(3)
                .hiredCount(0)
                .build();

        candidate = Candidate.builder()
                .id(candidateId)
                .firstName("Alice")
                .lastName("Johnson")
                .email("alice@example.com")
                .phoneNumber("123456789")
                .country("US")
                .currentPosition("Junior Dev")
                .currentCompany("TechCo")
                .applicationDate(LocalDate.now())
                .candidateStatus(CandidateStatus.APPLIED)
                .vacancy(vacancy)
                .notes("Good candidate")
                .build();
    }

    @Nested
    @DisplayName("getAllCandidates")
    class GetAllCandidates {

        @Test
        @DisplayName("should return all candidates")
        void shouldReturnAll() {
            when(candidateRepository.findAll()).thenReturn(List.of(candidate));

            List<Candidate> result = candidateService.getAllCandidates();

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getFirstName()).isEqualTo("Alice");
        }
    }

    @Nested
    @DisplayName("getCandidateById")
    class GetCandidateById {

        @Test
        @DisplayName("should return candidate when found")
        void shouldReturnCandidate() {
            when(candidateRepository.findById(candidateId)).thenReturn(Optional.of(candidate));

            Candidate result = candidateService.getCandidateById(candidateId);

            assertThat(result.getFirstName()).isEqualTo("Alice");
        }

        @Test
        @DisplayName("should throw EntityNotFoundException when not found")
        void shouldThrowWhenNotFound() {
            UUID unknownId = UUID.randomUUID();
            when(candidateRepository.findById(unknownId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> candidateService.getCandidateById(unknownId))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("Candidate not found");
        }
    }

    @Nested
    @DisplayName("getCandidatesByVacancyId")
    class GetCandidatesByVacancyId {

        @Test
        @DisplayName("should return candidates for vacancy")
        void shouldReturnFiltered() {
            when(candidateRepository.findByVacancyId(vacancyId)).thenReturn(List.of(candidate));

            List<Candidate> result = candidateService.getCandidatesByVacancyId(vacancyId);

            assertThat(result).hasSize(1);
            verify(candidateRepository).findByVacancyId(vacancyId);
        }
    }

    @Nested
    @DisplayName("createCandidate")
    class CreateCandidate {

        @Test
        @DisplayName("should create candidate without resume")
        void shouldCreateWithoutResume() {
            Map<String, Object> data = new HashMap<>();
            data.put("firstName", "Bob");
            data.put("lastName", "Brown");

            when(candidateRepository.save(any(Candidate.class))).thenAnswer(inv -> {
                Candidate c = inv.getArgument(0);
                c.setId(UUID.randomUUID());
                return c;
            });

            Map<String, Object> result = candidateService.createCandidate(data, null);

            assertThat(result).containsKey("candidate");
            assertThat(result.get("message")).isEqualTo("Candidate created successfully");
            verify(candidateRepository).save(any(Candidate.class));
        }

        @Test
        @DisplayName("should create candidate with vacancy association")
        void shouldCreateWithVacancy() {
            Map<String, Object> data = new HashMap<>();
            data.put("firstName", "Carol");
            data.put("lastName", "Clark");
            data.put("vacancyId", vacancyId.toString());

            when(vacancyRepository.findById(vacancyId)).thenReturn(Optional.of(vacancy));
            when(candidateRepository.save(any(Candidate.class))).thenAnswer(inv -> {
                Candidate c = inv.getArgument(0);
                c.setId(UUID.randomUUID());
                return c;
            });

            Map<String, Object> result = candidateService.createCandidate(data, null);

            assertThat(result).containsKey("candidate");
            verify(vacancyRepository).findById(vacancyId);
        }
    }

    @Nested
    @DisplayName("updateCandidate")
    class UpdateCandidate {

        @Test
        @DisplayName("should update candidate successfully")
        void shouldUpdateSuccessfully() {
            Map<String, Object> data = new HashMap<>();
            data.put("firstName", "UpdatedAlice");

            when(candidateRepository.findById(candidateId)).thenReturn(Optional.of(candidate));
            when(candidateRepository.save(any(Candidate.class))).thenReturn(candidate);

            Map<String, Object> result = candidateService.updateCandidate(candidateId, data, null);

            assertThat(result.get("message")).isEqualTo("Candidate updated successfully");
            verify(candidateRepository).save(any(Candidate.class));
        }

        @Test
        @DisplayName("should throw EntityNotFoundException when candidate not found")
        void shouldThrowWhenNotFound() {
            UUID unknownId = UUID.randomUUID();
            when(candidateRepository.findById(unknownId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> candidateService.updateCandidate(unknownId, new HashMap<>(), null))
                    .isInstanceOf(EntityNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("updateCandidateStatus")
    class UpdateCandidateStatus {

        @Test
        @DisplayName("should update to valid status")
        void shouldUpdateValidStatus() {
            when(candidateRepository.findById(candidateId)).thenReturn(Optional.of(candidate));
            when(candidateRepository.save(any(Candidate.class))).thenReturn(candidate);

            Candidate result = candidateService.updateCandidateStatus(candidateId, "UNDER_REVIEW");

            assertThat(result).isNotNull();
            verify(candidateRepository).save(any(Candidate.class));
        }

        @Test
        @DisplayName("should set hired date when status is HIRED")
        void shouldSetHiredDate() {
            candidate.setCandidateStatus(CandidateStatus.INTERVIEWED);
            when(candidateRepository.findById(candidateId)).thenReturn(Optional.of(candidate));
            when(candidateRepository.save(any(Candidate.class))).thenAnswer(inv -> inv.getArgument(0));

            Candidate result = candidateService.updateCandidateStatus(candidateId, "HIRED");

            assertThat(result.getHiredDate()).isEqualTo(LocalDate.now());
        }

        @Test
        @DisplayName("should throw for invalid status string")
        void shouldThrowForInvalidStatus() {
            when(candidateRepository.findById(candidateId)).thenReturn(Optional.of(candidate));

            assertThatThrownBy(() -> candidateService.updateCandidateStatus(candidateId, "INVALID_STATUS"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Invalid candidate status");
        }
    }

    @Nested
    @DisplayName("deleteCandidate")
    class DeleteCandidate {

        @Test
        @DisplayName("should delete candidate with resume")
        void shouldDeleteWithResume() {
            candidate = Candidate.builder()
                    .id(candidateId)
                    .firstName("Alice")
                    .lastName("Johnson")
                    .candidateStatus(CandidateStatus.APPLIED)
                    .resumeUrl("http://minio/resumes/resume123.pdf")
                    .build();

            when(candidateRepository.findById(candidateId)).thenReturn(Optional.of(candidate));

            candidateService.deleteCandidate(candidateId);

            verify(minioService).deleteFile(eq("resumes"), anyString());
            verify(candidateRepository).delete(candidate);
        }

        @Test
        @DisplayName("should throw when candidate not found")
        void shouldThrowWhenNotFound() {
            UUID unknownId = UUID.randomUUID();
            when(candidateRepository.findById(unknownId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> candidateService.deleteCandidate(unknownId))
                    .isInstanceOf(EntityNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("convertCandidateToEmployee")
    class ConvertCandidateToEmployee {

        @Test
        @DisplayName("should convert candidate with vacancy")
        void shouldConvertWithVacancy() {
            when(candidateRepository.findById(candidateId)).thenReturn(Optional.of(candidate));

            Map<String, Object> result = candidateService.convertCandidateToEmployee(candidateId);

            assertThat(result.get("firstName")).isEqualTo("Alice");
            assertThat(result.get("lastName")).isEqualTo("Johnson");
            assertThat(result.get("vacancyId")).isEqualTo(vacancyId);
            assertThat(result.get("vacancyTitle")).isEqualTo("Senior Developer");
            assertThat(result).containsKey("jobPositionId");
        }

        @Test
        @DisplayName("should convert candidate without vacancy")
        void shouldConvertWithoutVacancy() {
            Candidate noVacancyCandidate = Candidate.builder()
                    .id(candidateId)
                    .firstName("Bob")
                    .lastName("Brown")
                    .email("bob@example.com")
                    .candidateStatus(CandidateStatus.APPLIED)
                    .applicationDate(LocalDate.now())
                    .build();

            when(candidateRepository.findById(candidateId)).thenReturn(Optional.of(noVacancyCandidate));

            Map<String, Object> result = candidateService.convertCandidateToEmployee(candidateId);

            assertThat(result.get("firstName")).isEqualTo("Bob");
            assertThat(result).doesNotContainKey("vacancyId");
        }
    }

    @Nested
    @DisplayName("getAvailableStatusTransitions")
    class GetAvailableStatusTransitions {

        @Test
        @DisplayName("should return transitions for APPLIED status")
        void shouldReturnTransitionsForApplied() {
            when(candidateRepository.findById(candidateId)).thenReturn(Optional.of(candidate));

            List<String> transitions = candidateService.getAvailableStatusTransitions(candidateId);

            assertThat(transitions).contains("APPLIED", "UNDER_REVIEW", "INTERVIEWED", "REJECTED", "WITHDRAWN");
        }

        @Test
        @DisplayName("should return limited transitions for HIRED status")
        void shouldReturnLimitedTransitionsForHired() {
            candidate.setCandidateStatus(CandidateStatus.HIRED);
            when(candidateRepository.findById(candidateId)).thenReturn(Optional.of(candidate));

            List<String> transitions = candidateService.getAvailableStatusTransitions(candidateId);

            assertThat(transitions).contains("HIRED", "POTENTIAL");
            assertThat(transitions).doesNotContain("APPLIED", "UNDER_REVIEW");
        }
    }

    @Nested
    @DisplayName("updateCandidateRating")
    class UpdateCandidateRating {

        @Test
        @DisplayName("should update rating successfully")
        void shouldUpdateRating() {
            when(candidateRepository.findById(candidateId)).thenReturn(Optional.of(candidate));
            when(candidateRepository.save(any(Candidate.class))).thenReturn(candidate);

            Candidate result = candidateService.updateCandidateRating(candidateId, 4, "Great candidate");

            assertThat(result).isNotNull();
            verify(candidateRepository).save(any(Candidate.class));
            verify(notificationService).sendNotificationToHRUsers(
                    eq("Candidate Rated"), anyString(), any(), anyString(), anyString()
            );
        }
    }

    @Nested
    @DisplayName("updateCandidateStatusWithDetails")
    class UpdateCandidateStatusWithDetails {

        @Test
        @DisplayName("should throw when candidateId is null")
        void shouldThrowWhenCandidateIdNull() {
            assertThatThrownBy(() ->
                    candidateService.updateCandidateStatusWithDetails(null, "UNDER_REVIEW", null, null, null)
            ).isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Candidate ID cannot be null");
        }

        @Test
        @DisplayName("should throw when status is null")
        void shouldThrowWhenStatusNull() {
            assertThatThrownBy(() ->
                    candidateService.updateCandidateStatusWithDetails(candidateId, null, null, null, null)
            ).isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("New status cannot be null or empty");
        }

        @Test
        @DisplayName("should throw when rating is out of range")
        void shouldThrowWhenInvalidRating() {
            assertThatThrownBy(() ->
                    candidateService.updateCandidateStatusWithDetails(candidateId, "UNDER_REVIEW", null, 6, null)
            ).isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Rating must be between 1 and 5");
        }
    }
}