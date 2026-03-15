package com.example.backend.controllers.hr;

import com.example.backend.config.JwtService;
import com.example.backend.models.hr.Candidate;
import com.example.backend.models.hr.Candidate.CandidateStatus;
import com.example.backend.services.hr.CandidateService;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = CandidateController.class)
@AutoConfigureMockMvc(addFilters = false)
public class CandidateControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private CandidateService candidateService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    private UUID candidateId;
    private UUID vacancyId;
    private Candidate sampleCandidate;

    @BeforeEach
    void setUp() {
        objectMapper.registerModule(new JavaTimeModule());

        candidateId = UUID.randomUUID();
        vacancyId = UUID.randomUUID();

        sampleCandidate = Candidate.builder()
                .id(candidateId)
                .firstName("John")
                .lastName("Doe")
                .email("john.doe@example.com")
                .phoneNumber("+1234567890")
                .country("US")
                .currentPosition("Software Engineer")
                .currentCompany("Acme Corp")
                .applicationDate(LocalDate.of(2026, 1, 15))
                .candidateStatus(CandidateStatus.APPLIED)
                .build();
    }

    // ==================== GET /api/v1/candidates ====================

    @Test
    void getAllCandidates_shouldReturn200WithList() throws Exception {
        given(candidateService.getAllCandidates()).willReturn(List.of(sampleCandidate));

        mockMvc.perform(get("/api/v1/candidates")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].firstName").value("John"))
                .andExpect(jsonPath("$[0].lastName").value("Doe"));
    }

    @Test
    void getAllCandidates_emptyList_shouldReturn200() throws Exception {
        given(candidateService.getAllCandidates()).willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/candidates")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/v1/candidates/{id} ====================

    @Test
    void getCandidateById_existingId_shouldReturn200() throws Exception {
        given(candidateService.getCandidateById(candidateId)).willReturn(sampleCandidate);

        mockMvc.perform(get("/api/v1/candidates/{id}", candidateId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(candidateId.toString()))
                .andExpect(jsonPath("$.email").value("john.doe@example.com"));
    }

    @Test
    void getCandidateById_notFound_shouldReturn404() throws Exception {
        given(candidateService.getCandidateById(candidateId))
                .willThrow(new EntityNotFoundException("Candidate not found"));

        mockMvc.perform(get("/api/v1/candidates/{id}", candidateId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    // ==================== GET /api/v1/candidates/vacancy/{vacancyId} ====================

    @Test
    void getCandidatesByVacancyId_shouldReturn200WithList() throws Exception {
        given(candidateService.getCandidatesByVacancyId(vacancyId))
                .willReturn(List.of(sampleCandidate));

        mockMvc.perform(get("/api/v1/candidates/vacancy/{vacancyId}", vacancyId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].firstName").value("John"));
    }

    @Test
    void getCandidatesByVacancyId_emptyList_shouldReturn200() throws Exception {
        given(candidateService.getCandidatesByVacancyId(vacancyId))
                .willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/candidates/vacancy/{vacancyId}", vacancyId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== POST /api/v1/candidates ====================

    @Test
    void createCandidate_validData_shouldReturn201() throws Exception {
        Map<String, Object> responseData = Map.of(
                "id", candidateId.toString(),
                "firstName", "John",
                "lastName", "Doe"
        );
        given(candidateService.createCandidate(any(), isNull())).willReturn(responseData);

        Map<String, Object> candidateData = new HashMap<>();
        candidateData.put("firstName", "John");
        candidateData.put("lastName", "Doe");
        candidateData.put("email", "john.doe@example.com");

        MockMultipartFile candidateDataPart = new MockMultipartFile(
                "candidateData",
                "",
                MediaType.APPLICATION_JSON_VALUE,
                objectMapper.writeValueAsBytes(candidateData)
        );

        mockMvc.perform(multipart("/api/v1/candidates")
                        .file(candidateDataPart))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.firstName").value("John"));
    }

    @Test
    void createCandidate_withResume_shouldReturn201() throws Exception {
        Map<String, Object> responseData = Map.of(
                "id", candidateId.toString(),
                "firstName", "Jane"
        );
        given(candidateService.createCandidate(any(), any())).willReturn(responseData);

        Map<String, Object> candidateData = new HashMap<>();
        candidateData.put("firstName", "Jane");
        candidateData.put("lastName", "Smith");

        MockMultipartFile candidateDataPart = new MockMultipartFile(
                "candidateData",
                "",
                MediaType.APPLICATION_JSON_VALUE,
                objectMapper.writeValueAsBytes(candidateData)
        );
        MockMultipartFile resumeFile = new MockMultipartFile(
                "resume",
                "resume.pdf",
                MediaType.APPLICATION_PDF_VALUE,
                "resume content".getBytes()
        );

        mockMvc.perform(multipart("/api/v1/candidates")
                        .file(candidateDataPart)
                        .file(resumeFile))
                .andExpect(status().isCreated());
    }

    @Test
    void createCandidate_invalidJson_shouldReturn400() throws Exception {
        MockMultipartFile candidateDataPart = new MockMultipartFile(
                "candidateData",
                "",
                MediaType.APPLICATION_JSON_VALUE,
                "not-valid-json".getBytes()
        );

        mockMvc.perform(multipart("/api/v1/candidates")
                        .file(candidateDataPart))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createCandidate_serviceThrowsException_shouldReturn400() throws Exception {
        given(candidateService.createCandidate(any(), any()))
                .willThrow(new RuntimeException("Validation error"));

        Map<String, Object> candidateData = new HashMap<>();
        candidateData.put("firstName", "John");

        MockMultipartFile candidateDataPart = new MockMultipartFile(
                "candidateData",
                "",
                MediaType.APPLICATION_JSON_VALUE,
                objectMapper.writeValueAsBytes(candidateData)
        );

        mockMvc.perform(multipart("/api/v1/candidates")
                        .file(candidateDataPart))
                .andExpect(status().isBadRequest());
    }

    // ==================== PUT /api/v1/candidates/{id} ====================

    @Test
    void updateCandidate_existingId_shouldReturn200() throws Exception {
        given(candidateService.updateCandidate(eq(candidateId), any(), isNull()))
                .willReturn(sampleCandidate);

        Map<String, Object> candidateData = new HashMap<>();
        candidateData.put("firstName", "John");
        candidateData.put("lastName", "Updated");

        MockMultipartFile candidateDataPart = new MockMultipartFile(
                "candidateData",
                "",
                MediaType.APPLICATION_JSON_VALUE,
                objectMapper.writeValueAsBytes(candidateData)
        );

        mockMvc.perform(multipart("/api/v1/candidates/{id}", candidateId)
                        .file(candidateDataPart)
                        .with(request -> { request.setMethod("PUT"); return request; }))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("John"));
    }

    @Test
    void updateCandidate_notFound_shouldReturn404() throws Exception {
        given(candidateService.updateCandidate(eq(candidateId), any(), any()))
                .willThrow(new EntityNotFoundException("Candidate not found"));

        Map<String, Object> candidateData = new HashMap<>();
        candidateData.put("firstName", "John");

        MockMultipartFile candidateDataPart = new MockMultipartFile(
                "candidateData",
                "",
                MediaType.APPLICATION_JSON_VALUE,
                objectMapper.writeValueAsBytes(candidateData)
        );

        mockMvc.perform(multipart("/api/v1/candidates/{id}", candidateId)
                        .file(candidateDataPart)
                        .with(request -> { request.setMethod("PUT"); return request; }))
                .andExpect(status().isNotFound());
    }

    @Test
    void updateCandidate_serviceThrowsGenericException_shouldReturn400() throws Exception {
        given(candidateService.updateCandidate(eq(candidateId), any(), any()))
                .willThrow(new RuntimeException("Unexpected error"));

        Map<String, Object> candidateData = new HashMap<>();
        candidateData.put("firstName", "John");

        MockMultipartFile candidateDataPart = new MockMultipartFile(
                "candidateData",
                "",
                MediaType.APPLICATION_JSON_VALUE,
                objectMapper.writeValueAsBytes(candidateData)
        );

        mockMvc.perform(multipart("/api/v1/candidates/{id}", candidateId)
                        .file(candidateDataPart)
                        .with(request -> { request.setMethod("PUT"); return request; }))
                .andExpect(status().isBadRequest());
    }

    // ==================== DELETE /api/v1/candidates/{id} ====================

    @Test
    void deleteCandidate_existingId_shouldReturn204() throws Exception {
        willDoNothing().given(candidateService).deleteCandidate(candidateId);

        mockMvc.perform(delete("/api/v1/candidates/{id}", candidateId))
                .andExpect(status().isNoContent());
    }

    @Test
    void deleteCandidate_notFound_shouldReturn404() throws Exception {
        willThrow(new EntityNotFoundException("Candidate not found"))
                .given(candidateService).deleteCandidate(candidateId);

        mockMvc.perform(delete("/api/v1/candidates/{id}", candidateId))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteCandidate_serviceThrowsGenericException_shouldReturn500() throws Exception {
        willThrow(new RuntimeException("Database error"))
                .given(candidateService).deleteCandidate(candidateId);

        mockMvc.perform(delete("/api/v1/candidates/{id}", candidateId))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/candidates/{id}/to-employee ====================

    @Test
    void convertCandidateToEmployee_existingId_shouldReturn200() throws Exception {
        Map<String, Object> employeeData = Map.of(
                "firstName", "John",
                "lastName", "Doe",
                "email", "john.doe@example.com"
        );
        given(candidateService.convertCandidateToEmployee(candidateId)).willReturn(employeeData);

        mockMvc.perform(get("/api/v1/candidates/{id}/to-employee", candidateId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("John"));
    }

    @Test
    void convertCandidateToEmployee_notFound_shouldReturn404() throws Exception {
        given(candidateService.convertCandidateToEmployee(candidateId))
                .willThrow(new EntityNotFoundException("Candidate not found"));

        mockMvc.perform(get("/api/v1/candidates/{id}/to-employee", candidateId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    void convertCandidateToEmployee_serviceThrowsGenericException_shouldReturn500() throws Exception {
        given(candidateService.convertCandidateToEmployee(candidateId))
                .willThrow(new RuntimeException("Conversion failed"));

        mockMvc.perform(get("/api/v1/candidates/{id}/to-employee", candidateId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== PUT /api/v1/candidates/{id}/rating ====================

    @Test
    void updateCandidateRating_validRating_shouldReturn200() throws Exception {
        Candidate rated = Candidate.builder()
                .id(candidateId)
                .firstName("John")
                .lastName("Doe")
                .rating(4)
                .ratingNotes("Good candidate")
                .candidateStatus(CandidateStatus.INTERVIEWED)
                .build();
        given(candidateService.updateCandidateRating(eq(candidateId), eq(4), anyString()))
                .willReturn(rated);

        Map<String, Object> ratingData = new HashMap<>();
        ratingData.put("rating", 4);
        ratingData.put("ratingNotes", "Good candidate");

        mockMvc.perform(put("/api/v1/candidates/{id}/rating", candidateId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(ratingData)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rating").value(4));
    }

    @Test
    void updateCandidateRating_nullRating_shouldReturn400() throws Exception {
        Map<String, Object> ratingData = new HashMap<>();
        ratingData.put("ratingNotes", "Some notes");

        mockMvc.perform(put("/api/v1/candidates/{id}/rating", candidateId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(ratingData)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateCandidateRating_ratingBelowRange_shouldReturn400() throws Exception {
        Map<String, Object> ratingData = new HashMap<>();
        ratingData.put("rating", 0);

        mockMvc.perform(put("/api/v1/candidates/{id}/rating", candidateId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(ratingData)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateCandidateRating_ratingAboveRange_shouldReturn400() throws Exception {
        Map<String, Object> ratingData = new HashMap<>();
        ratingData.put("rating", 6);

        mockMvc.perform(put("/api/v1/candidates/{id}/rating", candidateId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(ratingData)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateCandidateRating_candidateNotFound_shouldReturn404() throws Exception {
        given(candidateService.updateCandidateRating(eq(candidateId), anyInt(), any()))
                .willThrow(new EntityNotFoundException("Candidate not found"));

        Map<String, Object> ratingData = new HashMap<>();
        ratingData.put("rating", 3);

        mockMvc.perform(put("/api/v1/candidates/{id}/rating", candidateId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(ratingData)))
                .andExpect(status().isNotFound());
    }

    @Test
    void updateCandidateRating_serviceThrowsGenericException_shouldReturn500() throws Exception {
        given(candidateService.updateCandidateRating(eq(candidateId), anyInt(), any()))
                .willThrow(new RuntimeException("Unexpected error"));

        Map<String, Object> ratingData = new HashMap<>();
        ratingData.put("rating", 3);

        mockMvc.perform(put("/api/v1/candidates/{id}/rating", candidateId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(ratingData)))
                .andExpect(status().isInternalServerError());
    }

    // ==================== PUT /api/v1/candidates/{id}/status ====================

    @Test
    void updateCandidateStatus_validStatus_shouldReturn200() throws Exception {
        Candidate updated = Candidate.builder()
                .id(candidateId)
                .firstName("John")
                .lastName("Doe")
                .candidateStatus(CandidateStatus.UNDER_REVIEW)
                .build();
        given(candidateService.updateCandidateStatusWithDetails(
                eq(candidateId), eq("UNDER_REVIEW"), isNull(), isNull(), isNull()))
                .willReturn(updated);

        Map<String, Object> statusUpdate = new HashMap<>();
        statusUpdate.put("status", "UNDER_REVIEW");

        mockMvc.perform(put("/api/v1/candidates/{id}/status", candidateId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(statusUpdate)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.candidateStatus").value("UNDER_REVIEW"));
    }

    @Test
    void updateCandidateStatus_withRejectionReason_shouldReturn200() throws Exception {
        Candidate updated = Candidate.builder()
                .id(candidateId)
                .firstName("John")
                .lastName("Doe")
                .candidateStatus(CandidateStatus.REJECTED)
                .rejectionReason("Not qualified")
                .build();
        given(candidateService.updateCandidateStatusWithDetails(
                eq(candidateId), eq("REJECTED"), eq("Not qualified"), isNull(), isNull()))
                .willReturn(updated);

        Map<String, Object> statusUpdate = new HashMap<>();
        statusUpdate.put("status", "REJECTED");
        statusUpdate.put("rejectionReason", "Not qualified");

        mockMvc.perform(put("/api/v1/candidates/{id}/status", candidateId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(statusUpdate)))
                .andExpect(status().isOk());
    }

    @Test
    void updateCandidateStatus_withRating_shouldReturn200() throws Exception {
        Candidate updated = Candidate.builder()
                .id(candidateId)
                .firstName("John")
                .lastName("Doe")
                .candidateStatus(CandidateStatus.INTERVIEWED)
                .rating(5)
                .build();
        given(candidateService.updateCandidateStatusWithDetails(
                eq(candidateId), eq("INTERVIEWED"), isNull(), eq(5), isNull()))
                .willReturn(updated);

        Map<String, Object> statusUpdate = new HashMap<>();
        statusUpdate.put("status", "INTERVIEWED");
        statusUpdate.put("rating", 5);

        mockMvc.perform(put("/api/v1/candidates/{id}/status", candidateId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(statusUpdate)))
                .andExpect(status().isOk());
    }

    @Test
    void updateCandidateStatus_emptyBody_shouldReturn400() throws Exception {
        mockMvc.perform(put("/api/v1/candidates/{id}/status", candidateId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateCandidateStatus_missingStatus_shouldReturn400() throws Exception {
        Map<String, Object> statusUpdate = new HashMap<>();
        statusUpdate.put("rejectionReason", "Not qualified");

        mockMvc.perform(put("/api/v1/candidates/{id}/status", candidateId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(statusUpdate)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateCandidateStatus_invalidRatingFormat_shouldReturn400() throws Exception {
        Map<String, Object> statusUpdate = new HashMap<>();
        statusUpdate.put("status", "INTERVIEWED");
        statusUpdate.put("rating", "not-a-number");

        mockMvc.perform(put("/api/v1/candidates/{id}/status", candidateId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(statusUpdate)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateCandidateStatus_ratingOutOfRange_shouldReturn400() throws Exception {
        Map<String, Object> statusUpdate = new HashMap<>();
        statusUpdate.put("status", "INTERVIEWED");
        statusUpdate.put("rating", 10);

        mockMvc.perform(put("/api/v1/candidates/{id}/status", candidateId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(statusUpdate)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateCandidateStatus_candidateNotFound_shouldReturn404() throws Exception {
        given(candidateService.updateCandidateStatusWithDetails(
                eq(candidateId), anyString(), any(), any(), any()))
                .willThrow(new EntityNotFoundException("Candidate not found"));

        Map<String, Object> statusUpdate = new HashMap<>();
        statusUpdate.put("status", "UNDER_REVIEW");

        mockMvc.perform(put("/api/v1/candidates/{id}/status", candidateId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(statusUpdate)))
                .andExpect(status().isNotFound());
    }

    @Test
    void updateCandidateStatus_illegalArgument_shouldReturn400() throws Exception {
        given(candidateService.updateCandidateStatusWithDetails(
                eq(candidateId), anyString(), any(), any(), any()))
                .willThrow(new IllegalArgumentException("Invalid status transition"));

        Map<String, Object> statusUpdate = new HashMap<>();
        statusUpdate.put("status", "HIRED");

        mockMvc.perform(put("/api/v1/candidates/{id}/status", candidateId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(statusUpdate)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateCandidateStatus_serviceThrowsGenericException_shouldReturn500() throws Exception {
        given(candidateService.updateCandidateStatusWithDetails(
                eq(candidateId), anyString(), any(), any(), any()))
                .willThrow(new RuntimeException("Unexpected error"));

        Map<String, Object> statusUpdate = new HashMap<>();
        statusUpdate.put("status", "UNDER_REVIEW");

        mockMvc.perform(put("/api/v1/candidates/{id}/status", candidateId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(statusUpdate)))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/candidates/{id}/available-statuses ====================

    @Test
    void getAvailableStatuses_existingId_shouldReturn200() throws Exception {
        given(candidateService.getAvailableStatusTransitions(candidateId))
                .willReturn(List.of("UNDER_REVIEW", "REJECTED", "WITHDRAWN"));

        mockMvc.perform(get("/api/v1/candidates/{id}/available-statuses", candidateId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0]").value("UNDER_REVIEW"));
    }

    @Test
    void getAvailableStatuses_notFound_shouldReturn404() throws Exception {
        given(candidateService.getAvailableStatusTransitions(candidateId))
                .willThrow(new EntityNotFoundException("Candidate not found"));

        mockMvc.perform(get("/api/v1/candidates/{id}/available-statuses", candidateId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    void getAvailableStatuses_serviceThrowsGenericException_shouldReturn500() throws Exception {
        given(candidateService.getAvailableStatusTransitions(candidateId))
                .willThrow(new RuntimeException("Unexpected error"));

        mockMvc.perform(get("/api/v1/candidates/{id}/available-statuses", candidateId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }
}