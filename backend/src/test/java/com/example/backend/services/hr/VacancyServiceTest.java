//package com.example.backend.services.hr;
//
//import com.example.backend.dto.hr.vacancy.CreateVacancyDTO;
//import com.example.backend.dto.hr.vacancy.UpdateVacancyDTO;
//import com.example.backend.dto.hr.vacancy.VacancyDTO;
//import com.example.backend.models.hr.Candidate;
//import com.example.backend.models.hr.Candidate.CandidateStatus;
//import com.example.backend.models.hr.Department;
//import com.example.backend.models.hr.JobPosition;
//import com.example.backend.models.hr.Vacancy;
//import com.example.backend.models.id.EntityTypeConfig;
//import com.example.backend.repositories.VacancyRepository;
//import com.example.backend.repositories.hr.CandidateRepository;
//import com.example.backend.repositories.hr.JobPositionRepository;
//import com.example.backend.services.id.EntityIdGeneratorService;
//import com.example.backend.services.notification.NotificationService;
//import jakarta.persistence.EntityNotFoundException;
//import org.junit.jupiter.api.BeforeEach;
//import org.junit.jupiter.api.DisplayName;
//import org.junit.jupiter.api.Nested;
//import org.junit.jupiter.api.Test;
//import org.junit.jupiter.api.extension.ExtendWith;
//import org.mockito.InjectMocks;
//import org.mockito.Mock;
//import org.mockito.junit.jupiter.MockitoExtension;
//
//import java.time.LocalDate;
//import java.util.*;
//
//import static org.assertj.core.api.Assertions.*;
//import static org.mockito.ArgumentMatchers.*;
//import static org.mockito.Mockito.*;
//
//@ExtendWith(MockitoExtension.class)
//class VacancyServiceTest {
//
//    @Mock
//    private VacancyRepository vacancyRepository;
//
//    @Mock
//    private JobPositionRepository jobPositionRepository;
//
//    @Mock
//    private CandidateRepository candidateRepository;
//
//    @Mock
//    private NotificationService notificationService;
//
//    @Mock
//    private EntityIdGeneratorService entityIdGeneratorService;
//
//    @InjectMocks
//    private VacancyService vacancyService;
//
//    private Vacancy vacancy;
//    private JobPosition jobPosition;
//    private Department department;
//    private UUID vacancyId;
//    private UUID jobPositionId;
//
//    @BeforeEach
//    void setUp() {
//        vacancyId = UUID.randomUUID();
//        jobPositionId = UUID.randomUUID();
//
//        department = new Department();
//        department.setId(UUID.randomUUID());
//        department.setName("Engineering");
//
//        jobPosition = JobPosition.builder()
//                .id(jobPositionId)
//                .positionName("Developer")
//                .department(department)
//                .contractType(JobPosition.ContractType.MONTHLY)
//                .active(true)
//                .build();
//
//        vacancy = Vacancy.builder()
//                .id(vacancyId)
//                .vacancyNumber("VAC-000001")
//                .title("Senior Developer")
//                .description("Looking for a senior developer")
//                .status("OPEN")
//                .postingDate(LocalDate.now().minusDays(5))
//                .closingDate(LocalDate.now().plusDays(30))
//                .numberOfPositions(3)
//                .hiredCount(0)
//                .priority("MEDIUM")
//                .jobPosition(jobPosition)
//                .build();
//    }
//
//    @Nested
//    @DisplayName("getAllVacancies")
//    class GetAllVacancies {
//
//        @Test
//        @DisplayName("should return list of vacancy DTOs")
//        void shouldReturnDTOs() {
//            when(vacancyRepository.findAll()).thenReturn(List.of(vacancy));
//
//            List<VacancyDTO> result = vacancyService.getAllVacancies();
//
//            assertThat(result).hasSize(1);
//            assertThat(result.get(0).getTitle()).isEqualTo("Senior Developer");
//            assertThat(result.get(0).getJobPosition()).isNotNull();
//        }
//
//        @Test
//        @DisplayName("should return empty list when no vacancies")
//        void shouldReturnEmpty() {
//            when(vacancyRepository.findAll()).thenReturn(Collections.emptyList());
//
//            List<VacancyDTO> result = vacancyService.getAllVacancies();
//
//            assertThat(result).isEmpty();
//        }
//    }
//
//    @Nested
//    @DisplayName("getVacancyById")
//    class GetVacancyById {
//
//        @Test
//        @DisplayName("should return vacancy DTO when found")
//        void shouldReturnVacancy() {
//            when(vacancyRepository.findById(vacancyId)).thenReturn(Optional.of(vacancy));
//
//            VacancyDTO result = vacancyService.getVacancyById(vacancyId);
//
//            assertThat(result.getTitle()).isEqualTo("Senior Developer");
//        }
//
//        @Test
//        @DisplayName("should throw EntityNotFoundException when not found")
//        void shouldThrowWhenNotFound() {
//            UUID unknownId = UUID.randomUUID();
//            when(vacancyRepository.findById(unknownId)).thenReturn(Optional.empty());
//
//            assertThatThrownBy(() -> vacancyService.getVacancyById(unknownId))
//                    .isInstanceOf(EntityNotFoundException.class)
//                    .hasMessageContaining("Vacancy not found");
//        }
//    }
//
//    @Nested
//    @DisplayName("createVacancy")
//    class CreateVacancy {
//
//        @Test
//        @DisplayName("should create vacancy successfully")
//        void shouldCreateSuccessfully() {
//            CreateVacancyDTO dto = new CreateVacancyDTO();
//            dto.setTitle("New Vacancy");
//            dto.setDescription("A new role");
//            dto.setClosingDate(LocalDate.now().plusDays(30));
//            dto.setPostingDate(LocalDate.now());
//            dto.setNumberOfPositions(2);
//            dto.setJobPositionId(jobPositionId);
//
//            when(vacancyRepository.existsByTitleIgnoreCase("New Vacancy")).thenReturn(false);
//            when(jobPositionRepository.findByIdWithDepartment(jobPositionId)).thenReturn(Optional.of(jobPosition));
//            when(entityIdGeneratorService.generateNextId(EntityTypeConfig.VACANCY)).thenReturn("VAC-000002");
//            when(vacancyRepository.save(any(Vacancy.class))).thenAnswer(inv -> {
//                Vacancy v = inv.getArgument(0);
//                v.setId(UUID.randomUUID());
//                return v;
//            });
//
//            Vacancy result = vacancyService.createVacancy(dto);
//
//            assertThat(result).isNotNull();
//            assertThat(result.getTitle()).isEqualTo("New Vacancy");
//            verify(vacancyRepository).save(any(Vacancy.class));
//        }
//
//        @Test
//        @DisplayName("should throw when title is null")
//        void shouldThrowWhenTitleNull() {
//            CreateVacancyDTO dto = new CreateVacancyDTO();
//            dto.setDescription("desc");
//            dto.setClosingDate(LocalDate.now().plusDays(30));
//
//            assertThatThrownBy(() -> vacancyService.createVacancy(dto))
//                    .isInstanceOf(IllegalArgumentException.class)
//                    .hasMessageContaining("Title is required");
//        }
//
//        @Test
//        @DisplayName("should throw when title is blank")
//        void shouldThrowWhenTitleBlank() {
//            CreateVacancyDTO dto = new CreateVacancyDTO();
//            dto.setTitle("   ");
//            dto.setDescription("desc");
//            dto.setClosingDate(LocalDate.now().plusDays(30));
//
//            assertThatThrownBy(() -> vacancyService.createVacancy(dto))
//                    .isInstanceOf(IllegalArgumentException.class)
//                    .hasMessageContaining("Title is required");
//        }
//
//        @Test
//        @DisplayName("should throw when title is duplicate")
//        void shouldThrowWhenDuplicate() {
//            CreateVacancyDTO dto = new CreateVacancyDTO();
//            dto.setTitle("Existing Title");
//            dto.setDescription("desc");
//            dto.setClosingDate(LocalDate.now().plusDays(30));
//
//            when(vacancyRepository.existsByTitleIgnoreCase("Existing Title")).thenReturn(true);
//
//            assertThatThrownBy(() -> vacancyService.createVacancy(dto))
//                    .isInstanceOf(IllegalArgumentException.class)
//                    .hasMessageContaining("Vacancy title already exists");
//        }
//
//        @Test
//        @DisplayName("should throw when description is null")
//        void shouldThrowWhenDescriptionNull() {
//            CreateVacancyDTO dto = CreateVacancyDTO.builder()
//                    .title("Valid Title")
//                    .closingDate(LocalDate.now().plusDays(30))
//                    .build();
//
//            when(vacancyRepository.existsByTitleIgnoreCase("Valid Title")).thenReturn(false);
//
//            assertThatThrownBy(() -> vacancyService.createVacancy(dto))
//                    .isInstanceOf(IllegalArgumentException.class)
//                    .hasMessageContaining("Description is required");
//        }
//
//        @Test
//        @DisplayName("should throw when closing date is null")
//        void shouldThrowWhenClosingDateNull() {
//            CreateVacancyDTO dto = CreateVacancyDTO.builder()
//                    .title("Valid Title")
//                    .description("Valid desc")
//                    .build();
//
//            when(vacancyRepository.existsByTitleIgnoreCase("Valid Title")).thenReturn(false);
//
//            assertThatThrownBy(() -> vacancyService.createVacancy(dto))
//                    .isInstanceOf(IllegalArgumentException.class)
//                    .hasMessageContaining("Closing date is required");
//        }
//
//        @Test
//        @DisplayName("should throw when closing date is before posting date")
//        void shouldThrowWhenClosingBeforePosting() {
//            CreateVacancyDTO dto = CreateVacancyDTO.builder()
//                    .title("Valid Title")
//                    .description("Valid desc")
//                    .postingDate(LocalDate.now().plusDays(10))
//                    .closingDate(LocalDate.now().plusDays(5))
//                    .build();
//
//            when(vacancyRepository.existsByTitleIgnoreCase("Valid Title")).thenReturn(false);
//
//            assertThatThrownBy(() -> vacancyService.createVacancy(dto))
//                    .isInstanceOf(IllegalArgumentException.class)
//                    .hasMessageContaining("Closing date cannot be before posting date");
//        }
//
//        @Test
//        @DisplayName("should throw when number of positions is less than 1")
//        void shouldThrowWhenPositionsLessThanOne() {
//            CreateVacancyDTO dto = CreateVacancyDTO.builder()
//                    .title("Valid Title")
//                    .description("Valid desc")
//                    .closingDate(LocalDate.now().plusDays(30))
//                    .numberOfPositions(0)
//                    .build();
//
//            when(vacancyRepository.existsByTitleIgnoreCase("Valid Title")).thenReturn(false);
//
//            assertThatThrownBy(() -> vacancyService.createVacancy(dto))
//                    .isInstanceOf(IllegalArgumentException.class)
//                    .hasMessageContaining("Number of positions must be at least 1");
//        }
//
//        @Test
//        @DisplayName("should throw when job position not found")
//        void shouldThrowWhenJobPositionNotFound() {
//            UUID unknownJobPosId = UUID.randomUUID();
//            CreateVacancyDTO dto = CreateVacancyDTO.builder()
//                    .title("Valid Title")
//                    .description("Valid desc")
//                    .closingDate(LocalDate.now().plusDays(30))
//                    .jobPositionId(unknownJobPosId)
//                    .build();
//
//            when(vacancyRepository.existsByTitleIgnoreCase("Valid Title")).thenReturn(false);
//            when(jobPositionRepository.findByIdWithDepartment(unknownJobPosId)).thenReturn(Optional.empty());
//
//            assertThatThrownBy(() -> vacancyService.createVacancy(dto))
//                    .isInstanceOf(EntityNotFoundException.class)
//                    .hasMessageContaining("Job position not found");
//        }
//    }
//
//    @Nested
//    @DisplayName("updateVacancy")
//    class UpdateVacancy {
//
//        @Test
//        @DisplayName("should update vacancy successfully")
//        void shouldUpdateSuccessfully() {
//            UpdateVacancyDTO dto = UpdateVacancyDTO.builder()
//                    .title("Updated Title")
//                    .description("Updated desc")
//                    .closingDate(LocalDate.now().plusDays(60))
//                    .status("OPEN")
//                    .priority("HIGH")
//                    .build();
//
//            when(vacancyRepository.findById(vacancyId)).thenReturn(Optional.of(vacancy));
//            when(vacancyRepository.existsByTitleIgnoreCase("Updated Title")).thenReturn(false);
//            when(vacancyRepository.save(any(Vacancy.class))).thenReturn(vacancy);
//
//            Vacancy result = vacancyService.updateVacancy(vacancyId, dto);
//
//            assertThat(result).isNotNull();
//            verify(vacancyRepository).save(any(Vacancy.class));
//        }
//
//        @Test
//        @DisplayName("should throw when vacancy not found")
//        void shouldThrowWhenNotFound() {
//            UUID unknownId = UUID.randomUUID();
//            UpdateVacancyDTO dto = UpdateVacancyDTO.builder().title("Title").build();
//
//            when(vacancyRepository.findById(unknownId)).thenReturn(Optional.empty());
//
//            assertThatThrownBy(() -> vacancyService.updateVacancy(unknownId, dto))
//                    .isInstanceOf(EntityNotFoundException.class);
//        }
//    }
//
//    @Nested
//    @DisplayName("deleteVacancy")
//    class DeleteVacancy {
//
//        @Test
//        @DisplayName("should delete vacancy and move potential candidates")
//        void shouldDeleteWithPotentialCandidates() {
//            Candidate potentialCandidate = Candidate.builder()
//                    .id(UUID.randomUUID())
//                    .firstName("Test")
//                    .lastName("Candidate")
//                    .candidateStatus(CandidateStatus.POTENTIAL)
//                    .vacancy(vacancy)
//                    .build();
//
//            when(vacancyRepository.existsById(vacancyId)).thenReturn(true);
//            when(vacancyRepository.findById(vacancyId)).thenReturn(Optional.of(vacancy));
//            when(candidateRepository.findByVacancyId(vacancyId)).thenReturn(List.of(potentialCandidate));
//
//            vacancyService.deleteVacancy(vacancyId);
//
//            verify(candidateRepository).save(potentialCandidate);
//            assertThat(potentialCandidate.getVacancy()).isNull();
//            verify(vacancyRepository).deleteById(vacancyId);
//        }
//
//        @Test
//        @DisplayName("should throw when vacancy not found")
//        void shouldThrowWhenNotFound() {
//            UUID unknownId = UUID.randomUUID();
//            when(vacancyRepository.existsById(unknownId)).thenReturn(false);
//
//            assertThatThrownBy(() -> vacancyService.deleteVacancy(unknownId))
//                    .isInstanceOf(EntityNotFoundException.class);
//        }
//    }
//
//    @Nested
//    @DisplayName("hireCandidate")
//    class HireCandidate {
//
//        private Candidate hireCandidate;
//        private UUID hireCandidateId;
//
//        @BeforeEach
//        void setUpHireCandidate() {
//            hireCandidateId = UUID.randomUUID();
//            hireCandidate = Candidate.builder()
//                    .id(hireCandidateId)
//                    .firstName("Hire")
//                    .lastName("Me")
//                    .candidateStatus(CandidateStatus.INTERVIEWED)
//                    .vacancy(vacancy)
//                    .build();
//        }
//
//        @Test
//        @DisplayName("should hire candidate successfully")
//        void shouldHireSuccessfully() {
//            when(candidateRepository.findById(hireCandidateId)).thenReturn(Optional.of(hireCandidate));
//            when(candidateRepository.save(any(Candidate.class))).thenReturn(hireCandidate);
//            when(vacancyRepository.save(any(Vacancy.class))).thenReturn(vacancy);
//            when(candidateRepository.findByVacancyId(vacancyId)).thenReturn(Collections.emptyList());
//
//            vacancyService.hireCandidate(hireCandidateId);
//
//            assertThat(hireCandidate.getCandidateStatus()).isEqualTo(CandidateStatus.HIRED);
//            assertThat(hireCandidate.getHiredDate()).isEqualTo(LocalDate.now());
//            verify(candidateRepository).save(hireCandidate);
//            verify(vacancyRepository).save(vacancy);
//        }
//
//        @Test
//        @DisplayName("should throw when candidate not found")
//        void shouldThrowWhenCandidateNotFound() {
//            UUID unknownId = UUID.randomUUID();
//            when(candidateRepository.findById(unknownId)).thenReturn(Optional.empty());
//
//            assertThatThrownBy(() -> vacancyService.hireCandidate(unknownId))
//                    .isInstanceOf(EntityNotFoundException.class);
//        }
//
//        @Test
//        @DisplayName("should throw when candidate has no vacancy")
//        void shouldThrowWhenNoVacancy() {
//            hireCandidate = Candidate.builder()
//                    .id(hireCandidateId)
//                    .firstName("No")
//                    .lastName("Vacancy")
//                    .candidateStatus(CandidateStatus.INTERVIEWED)
//                    .build();
//
//            when(candidateRepository.findById(hireCandidateId)).thenReturn(Optional.of(hireCandidate));
//
//            assertThatThrownBy(() -> vacancyService.hireCandidate(hireCandidateId))
//                    .isInstanceOf(IllegalStateException.class)
//                    .hasMessageContaining("not associated with any vacancy");
//        }
//
//        @Test
//        @DisplayName("should throw when no available positions")
//        void shouldThrowWhenNoPositions() {
//            vacancy.setHiredCount(3); // all 3 positions filled
//            when(candidateRepository.findById(hireCandidateId)).thenReturn(Optional.of(hireCandidate));
//
//            assertThatThrownBy(() -> vacancyService.hireCandidate(hireCandidateId))
//                    .isInstanceOf(IllegalStateException.class)
//                    .hasMessageContaining("No available positions");
//        }
//
//        @Test
//        @DisplayName("should move remaining candidates when vacancy is full after hire")
//        void shouldMoveCandidatesWhenFull() {
//            vacancy.setNumberOfPositions(1);
//            vacancy.setHiredCount(0);
//
//            Candidate activeCandidate = Candidate.builder()
//                    .id(UUID.randomUUID())
//                    .firstName("Active")
//                    .lastName("Candidate")
//                    .candidateStatus(CandidateStatus.APPLIED)
//                    .build();
//
//            when(candidateRepository.findById(hireCandidateId)).thenReturn(Optional.of(hireCandidate));
//            when(candidateRepository.save(any(Candidate.class))).thenAnswer(inv -> inv.getArgument(0));
//            when(vacancyRepository.save(any(Vacancy.class))).thenReturn(vacancy);
//            when(candidateRepository.findByVacancyId(vacancyId)).thenReturn(List.of(activeCandidate));
//
//            vacancyService.hireCandidate(hireCandidateId);
//
//            assertThat(vacancy.isFull()).isTrue();
//        }
//    }
//
//    @Nested
//    @DisplayName("moveCandidatesToPotentialList")
//    class MoveCandidatesToPotentialList {
//
//        @Test
//        @DisplayName("should move active candidates to potential")
//        void shouldMoveActiveCandidates() {
//            Candidate activeCandidate = Candidate.builder()
//                    .id(UUID.randomUUID())
//                    .firstName("Active")
//                    .lastName("One")
//                    .candidateStatus(CandidateStatus.APPLIED)
//                    .build();
//
//            when(candidateRepository.findByVacancyId(vacancyId)).thenReturn(List.of(activeCandidate));
//            when(candidateRepository.save(any(Candidate.class))).thenAnswer(inv -> inv.getArgument(0));
//
//            vacancyService.moveCandidatesToPotentialList(vacancyId);
//
//            assertThat(activeCandidate.getCandidateStatus()).isEqualTo(CandidateStatus.POTENTIAL);
//            verify(candidateRepository).save(activeCandidate);
//        }
//
//        @Test
//        @DisplayName("should do nothing when no active candidates")
//        void shouldDoNothingWhenNoCandidates() {
//            when(candidateRepository.findByVacancyId(vacancyId)).thenReturn(Collections.emptyList());
//
//            vacancyService.moveCandidatesToPotentialList(vacancyId);
//
//            verify(candidateRepository, never()).save(any());
//        }
//    }
//
//    @Nested
//    @DisplayName("getVacancyStatistics")
//    class GetVacancyStatistics {
//
//        @Test
//        @DisplayName("should return vacancy statistics")
//        void shouldReturnStats() {
//            Candidate appliedCandidate = Candidate.builder()
//                    .id(UUID.randomUUID())
//                    .firstName("A")
//                    .lastName("B")
//                    .candidateStatus(CandidateStatus.APPLIED)
//                    .build();
//
//            when(vacancyRepository.findById(vacancyId)).thenReturn(Optional.of(vacancy));
//            when(candidateRepository.findByVacancyId(vacancyId)).thenReturn(List.of(appliedCandidate));
//
//            Map<String, Object> stats = vacancyService.getVacancyStatistics(vacancyId);
//
//            assertThat(stats).containsKey("totalPositions");
//            assertThat(stats).containsKey("remainingPositions");
//            assertThat(stats).containsKey("hiredCount");
//            assertThat(stats).containsKey("candidateStats");
//        }
//    }
//
//    @Nested
//    @DisplayName("getPotentialCandidates")
//    class GetPotentialCandidates {
//
//        @Test
//        @DisplayName("should return only potential candidates")
//        void shouldReturnFiltered() {
//            Candidate potentialCandidate = Candidate.builder()
//                    .id(UUID.randomUUID())
//                    .firstName("Pot")
//                    .lastName("Candidate")
//                    .candidateStatus(CandidateStatus.POTENTIAL)
//                    .build();
//
//            Candidate appliedCandidate = Candidate.builder()
//                    .id(UUID.randomUUID())
//                    .firstName("App")
//                    .lastName("Candidate")
//                    .candidateStatus(CandidateStatus.APPLIED)
//                    .build();
//
//            when(candidateRepository.findAll()).thenReturn(List.of(potentialCandidate, appliedCandidate));
//
//            List<Candidate> result = vacancyService.getPotentialCandidates();
//
//            assertThat(result).hasSize(1);
//            assertThat(result.get(0).getCandidateStatus()).isEqualTo(CandidateStatus.POTENTIAL);
//        }
//    }
//}