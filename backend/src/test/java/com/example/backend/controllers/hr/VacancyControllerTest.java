package com.example.backend.controllers.hr;

import com.example.backend.config.JwtService;
import com.example.backend.dto.hr.vacancy.CreateVacancyDTO;
import com.example.backend.dto.hr.vacancy.UpdateVacancyDTO;
import com.example.backend.dto.hr.vacancy.VacancyDTO;
import com.example.backend.models.hr.Candidate;
import com.example.backend.models.hr.Candidate.CandidateStatus;
import com.example.backend.models.hr.Vacancy;
import com.example.backend.services.hr.VacancyService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = VacancyController.class)
@AutoConfigureMockMvc(addFilters = false)
public class VacancyControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private VacancyService vacancyService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    private UUID vacancyId;
    private UUID candidateId;
    private UUID jobPositionId;
    private VacancyDTO sampleVacancyDTO;
    private Vacancy sampleVacancy;
    private CreateVacancyDTO createDTO;
    private UpdateVacancyDTO updateDTO;

    @BeforeEach
    void setUp() {
        objectMapper.registerModule(new JavaTimeModule());

        vacancyId = UUID.randomUUID();
        candidateId = UUID.randomUUID();
        jobPositionId = UUID.randomUUID();

        sampleVacancyDTO = VacancyDTO.builder()
                .id(vacancyId)
                .vacancyNumber("VAC-2026-00001")
                .title("Senior Software Engineer")
                .description("We are looking for an experienced engineer")
                .status("OPEN")
                .postingDate(LocalDate.of(2026, 3, 1))
                .closingDate(LocalDate.of(2026, 4, 30))
                .numberOfPositions(3)
                .hiredCount(0)
                .priority("HIGH")
                .requirements("5+ years experience in Java")
                .responsibilities("Lead backend development")
                .build();

        sampleVacancy = Vacancy.builder()
                .id(vacancyId)
                .vacancyNumber("VAC-2026-00001")
                .title("Senior Software Engineer")
                .description("We are looking for an experienced engineer")
                .status("OPEN")
                .postingDate(LocalDate.of(2026, 3, 1))
                .closingDate(LocalDate.of(2026, 4, 30))
                .numberOfPositions(3)
                .priority("HIGH")
                .requirements("5+ years experience in Java")
                .responsibilities("Lead backend development")
                .build();

        createDTO = new CreateVacancyDTO();
        createDTO.setTitle("Senior Software Engineer");
        createDTO.setDescription("We are looking for an experienced engineer");
        createDTO.setRequirements("5+ years experience in Java");
        createDTO.setResponsibilities("Lead backend development");
        createDTO.setPostingDate(LocalDate.of(2026, 3, 1));
        createDTO.setClosingDate(LocalDate.of(2026, 4, 30));
        createDTO.setStatus("OPEN");
        createDTO.setNumberOfPositions(3);
        createDTO.setPriority("HIGH");
        createDTO.setJobPositionId(jobPositionId);

        updateDTO = new UpdateVacancyDTO();
        updateDTO.setTitle("Lead Software Engineer");
        updateDTO.setStatus("OPEN");
        updateDTO.setNumberOfPositions(5);
    }

    // ==================== POST /api/v1/vacancies ====================

    @Test
    void createVacancy_validData_shouldReturn200() throws Exception {
        given(vacancyService.createVacancy(any(CreateVacancyDTO.class))).willReturn(sampleVacancy);

        mockMvc.perform(post("/api/v1/vacancies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Senior Software Engineer"))
                .andExpect(jsonPath("$.status").value("OPEN"));
    }

    @Test
    void createVacancy_illegalArgument_shouldReturn400() throws Exception {
        given(vacancyService.createVacancy(any(CreateVacancyDTO.class)))
                .willThrow(new IllegalArgumentException("Job position is required"));

        mockMvc.perform(post("/api/v1/vacancies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createDTO)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation Error"))
                .andExpect(jsonPath("$.message").value("Job position is required"));
    }

    @Test
    void createVacancy_entityNotFound_shouldReturn404() throws Exception {
        given(vacancyService.createVacancy(any(CreateVacancyDTO.class)))
                .willThrow(new EntityNotFoundException("Job position not found"));

        mockMvc.perform(post("/api/v1/vacancies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createDTO)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Entity Not Found"))
                .andExpect(jsonPath("$.message").value("Job position not found"));
    }

    @Test
    void createVacancy_serviceThrowsGenericException_shouldReturn500() throws Exception {
        given(vacancyService.createVacancy(any(CreateVacancyDTO.class)))
                .willThrow(new RuntimeException("Database connection failed"));

        mockMvc.perform(post("/api/v1/vacancies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createDTO)))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Internal Server Error"));
    }

    // ==================== GET /api/v1/vacancies ====================

    @Test
    void getAllVacancies_shouldReturn200WithList() throws Exception {
        given(vacancyService.getAllVacancies()).willReturn(List.of(sampleVacancyDTO));

        mockMvc.perform(get("/api/v1/vacancies")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].vacancyNumber").value("VAC-2026-00001"))
                .andExpect(jsonPath("$[0].title").value("Senior Software Engineer"));
    }

    @Test
    void getAllVacancies_emptyList_shouldReturn200() throws Exception {
        given(vacancyService.getAllVacancies()).willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/vacancies")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/v1/vacancies/{id} ====================

    @Test
    void getVacancyById_existingId_shouldReturn200() throws Exception {
        given(vacancyService.getVacancyById(vacancyId)).willReturn(sampleVacancyDTO);

        mockMvc.perform(get("/api/v1/vacancies/{id}", vacancyId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(vacancyId.toString()))
                .andExpect(jsonPath("$.vacancyNumber").value("VAC-2026-00001"))
                .andExpect(jsonPath("$.priority").value("HIGH"));
    }

    @Test
    void getVacancyById_serviceThrowsException_shouldReturn500() throws Exception {
        given(vacancyService.getVacancyById(vacancyId))
                .willThrow(new RuntimeException("Vacancy not found"));

        mockMvc.perform(get("/api/v1/vacancies/{id}", vacancyId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== PUT /api/v1/vacancies/{id} ====================

    @Test
    void updateVacancy_existingId_shouldReturn200() throws Exception {
        Vacancy updatedVacancy = Vacancy.builder()
                .id(vacancyId)
                .vacancyNumber("VAC-2026-00001")
                .title("Lead Software Engineer")
                .status("OPEN")
                .numberOfPositions(5)
                .build();

        given(vacancyService.updateVacancy(eq(vacancyId), any(UpdateVacancyDTO.class)))
                .willReturn(updatedVacancy);

        mockMvc.perform(put("/api/v1/vacancies/{id}", vacancyId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Lead Software Engineer"))
                .andExpect(jsonPath("$.numberOfPositions").value(5));
    }

    @Test
    void updateVacancy_illegalArgument_shouldReturn400() throws Exception {
        given(vacancyService.updateVacancy(eq(vacancyId), any(UpdateVacancyDTO.class)))
                .willThrow(new IllegalArgumentException("Invalid status value"));

        mockMvc.perform(put("/api/v1/vacancies/{id}", vacancyId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateDTO)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation Error"));
    }

    @Test
    void updateVacancy_notFound_shouldReturn404() throws Exception {
        given(vacancyService.updateVacancy(eq(vacancyId), any(UpdateVacancyDTO.class)))
                .willThrow(new EntityNotFoundException("Vacancy not found"));

        mockMvc.perform(put("/api/v1/vacancies/{id}", vacancyId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateDTO)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Entity Not Found"));
    }

    @Test
    void updateVacancy_serviceThrowsGenericException_shouldReturn500() throws Exception {
        given(vacancyService.updateVacancy(eq(vacancyId), any(UpdateVacancyDTO.class)))
                .willThrow(new RuntimeException("Unexpected error"));

        mockMvc.perform(put("/api/v1/vacancies/{id}", vacancyId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateDTO)))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Internal Server Error"));
    }

    // ==================== DELETE /api/v1/vacancies/{id} ====================

    @Test
    void deleteVacancy_existingId_shouldReturn204() throws Exception {
        willDoNothing().given(vacancyService).deleteVacancy(vacancyId);

        mockMvc.perform(delete("/api/v1/vacancies/{id}", vacancyId))
                .andExpect(status().isNoContent());
    }

    @Test
    void deleteVacancy_serviceThrowsException_shouldReturn500() throws Exception {
        given(vacancyService.getAllVacancies()).willReturn(Collections.emptyList());
        org.mockito.BDDMockito.willThrow(new RuntimeException("Cannot delete vacancy with candidates"))
                .given(vacancyService).deleteVacancy(vacancyId);

        mockMvc.perform(delete("/api/v1/vacancies/{id}", vacancyId))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/vacancies/{id}/statistics ====================

    @Test
    void getVacancyStatistics_existingId_shouldReturn200() throws Exception {
        Map<String, Object> statistics = Map.of(
                "totalCandidates", 12,
                "appliedCount", 5,
                "underReviewCount", 3,
                "interviewedCount", 2,
                "hiredCount", 1,
                "rejectedCount", 1,
                "vacancyId", vacancyId.toString(),
                "title", "Senior Software Engineer",
                "numberOfPositions", 3,
                "remainingPositions", 2
        );
        given(vacancyService.getVacancyStatistics(vacancyId)).willReturn(statistics);

        mockMvc.perform(get("/api/v1/vacancies/{id}/statistics", vacancyId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCandidates").value(12))
                .andExpect(jsonPath("$.hiredCount").value(1))
                .andExpect(jsonPath("$.numberOfPositions").value(3));
    }

    @Test
    void getVacancyStatistics_serviceThrowsException_shouldReturn500() throws Exception {
        given(vacancyService.getVacancyStatistics(vacancyId))
                .willThrow(new RuntimeException("Vacancy not found"));

        mockMvc.perform(get("/api/v1/vacancies/{id}/statistics", vacancyId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== POST /api/v1/vacancies/hire-candidate/{candidateId} ====================

    @Test
    void hireCandidate_validCandidate_shouldReturn200() throws Exception {
        willDoNothing().given(vacancyService).hireCandidate(candidateId);

        mockMvc.perform(post("/api/v1/vacancies/hire-candidate/{candidateId}", candidateId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Candidate hired successfully"));
    }

    @Test
    void hireCandidate_vacancyFull_shouldReturn400() throws Exception {
        org.mockito.BDDMockito.willThrow(new IllegalStateException("Vacancy is already full"))
                .given(vacancyService).hireCandidate(candidateId);

        mockMvc.perform(post("/api/v1/vacancies/hire-candidate/{candidateId}", candidateId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Vacancy is already full"));
    }

    @Test
    void hireCandidate_candidateAlreadyHired_shouldReturn400() throws Exception {
        org.mockito.BDDMockito.willThrow(new IllegalStateException("Candidate is already hired"))
                .given(vacancyService).hireCandidate(candidateId);

        mockMvc.perform(post("/api/v1/vacancies/hire-candidate/{candidateId}", candidateId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Candidate is already hired"));
    }

    // ==================== POST /api/v1/vacancies/{id}/move-to-potential ====================

    @Test
    void moveCandidatesToPotential_existingVacancy_shouldReturn200() throws Exception {
        willDoNothing().given(vacancyService).moveCandidatesToPotentialList(vacancyId);

        mockMvc.perform(post("/api/v1/vacancies/{id}/move-to-potential", vacancyId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Candidates moved to potential list"));
    }

    @Test
    void moveCandidatesToPotential_serviceThrowsException_shouldReturn500() throws Exception {
        org.mockito.BDDMockito.willThrow(new RuntimeException("Vacancy not found"))
                .given(vacancyService).moveCandidatesToPotentialList(vacancyId);

        mockMvc.perform(post("/api/v1/vacancies/{id}/move-to-potential", vacancyId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/vacancies/potential-candidates ====================

    @Test
    void getPotentialCandidates_shouldReturn200WithList() throws Exception {
        Candidate potentialCandidate = Candidate.builder()
                .id(UUID.randomUUID())
                .firstName("Charlie")
                .lastName("Brown")
                .email("charlie.brown@example.com")
                .candidateStatus(CandidateStatus.POTENTIAL)
                .build();

        given(vacancyService.getPotentialCandidates()).willReturn(List.of(potentialCandidate));

        mockMvc.perform(get("/api/v1/vacancies/potential-candidates")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].firstName").value("Charlie"))
                .andExpect(jsonPath("$[0].candidateStatus").value("POTENTIAL"));
    }

    @Test
    void getPotentialCandidates_emptyList_shouldReturn200() throws Exception {
        given(vacancyService.getPotentialCandidates()).willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/vacancies/potential-candidates")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void getPotentialCandidates_serviceThrowsException_shouldReturn500() throws Exception {
        given(vacancyService.getPotentialCandidates())
                .willThrow(new RuntimeException("DB error"));

        mockMvc.perform(get("/api/v1/vacancies/potential-candidates")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }
}