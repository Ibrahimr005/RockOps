package com.example.backend.controllers.hr;

import com.example.backend.config.JwtService;
import com.example.backend.dto.hr.employee.EmployeeSummaryDTO;
import com.example.backend.dto.hr.jobposition.JobPositionDTO;
import com.example.backend.dto.hr.jobposition.JobPositionDetailsDTO;
import com.example.backend.models.hr.JobPosition;
import com.example.backend.repositories.hr.JobPositionRepository;
import com.example.backend.services.hr.JobPositionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = JobPositionController.class)
@AutoConfigureMockMvc(addFilters = false)
public class JobPositionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JobPositionService jobPositionService;

    @MockBean
    private JobPositionRepository jobPositionRepository;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    private UUID positionId;
    private JobPositionDTO sampleDTO;

    @BeforeEach
    void setUp() {
        objectMapper.registerModule(new JavaTimeModule());
        positionId = UUID.randomUUID();
        sampleDTO = new JobPositionDTO();
        sampleDTO.setId(positionId);
        sampleDTO.setPositionName("Senior Engineer");
        sampleDTO.setContractType(JobPosition.ContractType.MONTHLY);
        sampleDTO.setActive(true);
    }

    // -----------------------------------------------------------------------
    // POST /api/v1/job-positions
    // -----------------------------------------------------------------------

    @Test
    void createJobPosition_happyPath_returns201() throws Exception {
        given(jobPositionService.createJobPosition(any(JobPositionDTO.class))).willReturn(sampleDTO);

        mockMvc.perform(post("/api/v1/job-positions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleDTO)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.positionName").value("Senior Engineer"));
    }

    @Test
    void createJobPosition_validationError_returns400() throws Exception {
        given(jobPositionService.createJobPosition(any(JobPositionDTO.class)))
                .willThrow(new IllegalArgumentException("Position name is required"));

        mockMvc.perform(post("/api/v1/job-positions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleDTO)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"));
    }

    @Test
    void createJobPosition_entityNotFound_returns404() throws Exception {
        given(jobPositionService.createJobPosition(any(JobPositionDTO.class)))
                .willThrow(new EntityNotFoundException("Department not found"));

        mockMvc.perform(post("/api/v1/job-positions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleDTO)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("ENTITY_NOT_FOUND"));
    }

    @Test
    void createJobPosition_duplicateConstraint_returns409() throws Exception {
        given(jobPositionService.createJobPosition(any(JobPositionDTO.class)))
                .willThrow(new DataIntegrityViolationException("Duplicate entry"));

        mockMvc.perform(post("/api/v1/job-positions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleDTO)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("DUPLICATE_OR_CONSTRAINT_ERROR"));
    }

    @Test
    void createJobPosition_unexpectedError_returns500() throws Exception {
        given(jobPositionService.createJobPosition(any(JobPositionDTO.class)))
                .willThrow(new RuntimeException("Unexpected failure"));

        mockMvc.perform(post("/api/v1/job-positions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleDTO)))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("CREATION_ERROR"));
    }

    // -----------------------------------------------------------------------
    // PUT /api/v1/job-positions/{id}
    // -----------------------------------------------------------------------

    @Test
    void updateJobPosition_happyPath_returns200() throws Exception {
        given(jobPositionService.updateJobPosition(eq(positionId), any(JobPositionDTO.class)))
                .willReturn(sampleDTO);

        mockMvc.perform(put("/api/v1/job-positions/{id}", positionId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.positionName").value("Senior Engineer"));
    }

    @Test
    void updateJobPosition_validationError_returns400() throws Exception {
        given(jobPositionService.updateJobPosition(eq(positionId), any(JobPositionDTO.class)))
                .willThrow(new IllegalArgumentException("Invalid contract type"));

        mockMvc.perform(put("/api/v1/job-positions/{id}", positionId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleDTO)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"));
    }

    @Test
    void updateJobPosition_notFound_returns404() throws Exception {
        given(jobPositionService.updateJobPosition(eq(positionId), any(JobPositionDTO.class)))
                .willThrow(new EntityNotFoundException("Job position not found"));

        mockMvc.perform(put("/api/v1/job-positions/{id}", positionId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleDTO)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("ENTITY_NOT_FOUND"));
    }

    @Test
    void updateJobPosition_duplicateConstraint_returns409() throws Exception {
        given(jobPositionService.updateJobPosition(eq(positionId), any(JobPositionDTO.class)))
                .willThrow(new DataIntegrityViolationException("unique constraint violation"));

        mockMvc.perform(put("/api/v1/job-positions/{id}", positionId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleDTO)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("DATABASE_CONSTRAINT_VIOLATION"));
    }

    @Test
    void updateJobPosition_unexpectedError_returns500() throws Exception {
        given(jobPositionService.updateJobPosition(eq(positionId), any(JobPositionDTO.class)))
                .willThrow(new RuntimeException("Crash"));

        mockMvc.perform(put("/api/v1/job-positions/{id}", positionId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleDTO)))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("UNEXPECTED_ERROR"));
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/job-positions
    // -----------------------------------------------------------------------

    @Test
    void getAllJobPositions_happyPath_returns200() throws Exception {
        given(jobPositionService.getAllJobPositionDTOs()).willReturn(List.of(sampleDTO));

        mockMvc.perform(get("/api/v1/job-positions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].positionName").value("Senior Engineer"));
    }

    @Test
    void getAllJobPositions_serviceThrows_returns500() throws Exception {
        given(jobPositionService.getAllJobPositionDTOs())
                .willThrow(new RuntimeException("DB error"));

        mockMvc.perform(get("/api/v1/job-positions"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("FETCH_ERROR"));
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/job-positions/{id}
    // -----------------------------------------------------------------------

    @Test
    void getJobPositionById_happyPath_returns200() throws Exception {
        given(jobPositionService.getJobPositionDTOById(positionId)).willReturn(sampleDTO);

        mockMvc.perform(get("/api/v1/job-positions/{id}", positionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.positionName").value("Senior Engineer"));
    }

    @Test
    void getJobPositionById_notFound_returns404() throws Exception {
        given(jobPositionService.getJobPositionDTOById(positionId))
                .willThrow(new EntityNotFoundException("Not found"));

        mockMvc.perform(get("/api/v1/job-positions/{id}", positionId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("NOT_FOUND"));
    }

    @Test
    void getJobPositionById_serviceThrows_returns500() throws Exception {
        given(jobPositionService.getJobPositionDTOById(positionId))
                .willThrow(new RuntimeException("DB failure"));

        mockMvc.perform(get("/api/v1/job-positions/{id}", positionId))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("FETCH_ERROR"));
    }

    // -----------------------------------------------------------------------
    // DELETE /api/v1/job-positions/{id}
    // -----------------------------------------------------------------------

    @Test
    void deleteJobPosition_happyPath_returns204() throws Exception {
        willDoNothing().given(jobPositionService).deleteJobPosition(positionId);

        mockMvc.perform(delete("/api/v1/job-positions/{id}", positionId))
                .andExpect(status().isNoContent());
    }

    @Test
    void deleteJobPosition_hasAssignedEmployees_returns409() throws Exception {
        willThrow(new IllegalStateException("Position has assigned employees"))
                .given(jobPositionService).deleteJobPosition(positionId);

        mockMvc.perform(delete("/api/v1/job-positions/{id}", positionId))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("DELETE_CONFLICT"));
    }

    @Test
    void deleteJobPosition_notFound_returns404() throws Exception {
        willThrow(new EntityNotFoundException("Position not found"))
                .given(jobPositionService).deleteJobPosition(positionId);

        mockMvc.perform(delete("/api/v1/job-positions/{id}", positionId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("NOT_FOUND"));
    }

    @Test
    void deleteJobPosition_unexpectedError_returns500() throws Exception {
        willThrow(new RuntimeException("Crash"))
                .given(jobPositionService).deleteJobPosition(positionId);

        mockMvc.perform(delete("/api/v1/job-positions/{id}", positionId))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("DELETE_ERROR"));
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/job-positions/{id}/employees
    // -----------------------------------------------------------------------

    @Test
    void getEmployeesByJobPositionId_happyPath_returns200() throws Exception {
        given(jobPositionService.getEmployeesByJobPositionId(positionId))
                .willReturn(List.of(new EmployeeSummaryDTO()));

        mockMvc.perform(get("/api/v1/job-positions/{id}/employees", positionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void getEmployeesByJobPositionId_notFound_returns404() throws Exception {
        given(jobPositionService.getEmployeesByJobPositionId(positionId))
                .willThrow(new EntityNotFoundException("Position not found"));

        mockMvc.perform(get("/api/v1/job-positions/{id}/employees", positionId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("NOT_FOUND"));
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/job-positions/{id}/details
    // -----------------------------------------------------------------------

    @Test
    void getJobPositionDetails_happyPath_returns200() throws Exception {
        given(jobPositionService.getJobPositionDetailsDTO(positionId))
                .willReturn(new JobPositionDetailsDTO());

        mockMvc.perform(get("/api/v1/job-positions/{id}/details", positionId))
                .andExpect(status().isOk());
    }

    @Test
    void getJobPositionDetails_notFound_returns404() throws Exception {
        given(jobPositionService.getJobPositionDetailsDTO(positionId))
                .willThrow(new EntityNotFoundException("Not found"));

        mockMvc.perform(get("/api/v1/job-positions/{id}/details", positionId))
                .andExpect(status().isNotFound());
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/job-positions/{id}/promotion-statistics
    // -----------------------------------------------------------------------

    @Test
    void getPromotionStatistics_happyPath_returns200() throws Exception {
        given(jobPositionService.getPromotionStatistics(positionId))
                .willReturn(Map.of("total", 5));

        mockMvc.perform(get("/api/v1/job-positions/{id}/promotion-statistics", positionId))
                .andExpect(status().isOk());
    }

    @Test
    void getPromotionStatistics_serviceThrows_returns500() throws Exception {
        given(jobPositionService.getPromotionStatistics(positionId))
                .willThrow(new RuntimeException("Error"));

        mockMvc.perform(get("/api/v1/job-positions/{id}/promotion-statistics", positionId))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("FETCH_ERROR"));
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/job-positions/{id}/promotions/from
    // -----------------------------------------------------------------------

    @Test
    void getPromotionsFromPosition_happyPath_returns200() throws Exception {
        given(jobPositionService.getPromotionsFromPosition(positionId)).willReturn(List.of());

        mockMvc.perform(get("/api/v1/job-positions/{id}/promotions/from", positionId))
                .andExpect(status().isOk());
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/job-positions/{id}/promotions/to
    // -----------------------------------------------------------------------

    @Test
    void getPromotionsToPosition_happyPath_returns200() throws Exception {
        given(jobPositionService.getPromotionsToPosition(positionId)).willReturn(List.of());

        mockMvc.perform(get("/api/v1/job-positions/{id}/promotions/to", positionId))
                .andExpect(status().isOk());
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/job-positions/{id}/promotions/from/pending
    // -----------------------------------------------------------------------

    @Test
    void getPendingPromotionsFromPosition_happyPath_returns200() throws Exception {
        given(jobPositionService.getPendingPromotionsFromPosition(positionId)).willReturn(List.of());

        mockMvc.perform(get("/api/v1/job-positions/{id}/promotions/from/pending", positionId))
                .andExpect(status().isOk());
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/job-positions/{id}/promotions/to/pending
    // -----------------------------------------------------------------------

    @Test
    void getPendingPromotionsToPosition_happyPath_returns200() throws Exception {
        given(jobPositionService.getPendingPromotionsToPosition(positionId)).willReturn(List.of());

        mockMvc.perform(get("/api/v1/job-positions/{id}/promotions/to/pending", positionId))
                .andExpect(status().isOk());
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/job-positions/{id}/career-path-suggestions
    // -----------------------------------------------------------------------

    @Test
    void getCareerPathSuggestions_happyPath_returns200() throws Exception {
        given(jobPositionService.getCareerPathSuggestions(positionId)).willReturn(List.of());

        mockMvc.perform(get("/api/v1/job-positions/{id}/career-path-suggestions", positionId))
                .andExpect(status().isOk());
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/job-positions/{id}/employees/eligible-for-promotion
    // -----------------------------------------------------------------------

    @Test
    void getEmployeesEligibleForPromotion_happyPath_returns200() throws Exception {
        given(jobPositionService.getEmployeesEligibleForPromotion(positionId)).willReturn(List.of());

        mockMvc.perform(get("/api/v1/job-positions/{id}/employees/eligible-for-promotion", positionId))
                .andExpect(status().isOk());
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/job-positions/{id}/salary-statistics
    // -----------------------------------------------------------------------

    @Test
    void getSalaryStatistics_happyPath_returns200() throws Exception {
        given(jobPositionService.getSalaryStatistics(positionId))
                .willReturn(Map.of("average", 5000.0));

        mockMvc.perform(get("/api/v1/job-positions/{id}/salary-statistics", positionId))
                .andExpect(status().isOk());
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/job-positions/{id}/validation
    // -----------------------------------------------------------------------

    @Test
    void getPositionValidation_happyPath_returns200() throws Exception {
        given(jobPositionService.getPositionValidation(positionId))
                .willReturn(Map.of("valid", true));

        mockMvc.perform(get("/api/v1/job-positions/{id}/validation", positionId))
                .andExpect(status().isOk());
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/job-positions/{id}/analytics
    // -----------------------------------------------------------------------

    @Test
    void getPositionAnalytics_happyPath_returns200() throws Exception {
        given(jobPositionService.getPositionAnalytics(positionId))
                .willReturn(Map.of("headcount", 3));

        mockMvc.perform(get("/api/v1/job-positions/{id}/analytics", positionId))
                .andExpect(status().isOk());
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/job-positions/{id}/can-delete
    // -----------------------------------------------------------------------

    @Test
    void canDeletePosition_happyPath_returns200() throws Exception {
        given(jobPositionService.canDeletePosition(positionId))
                .willReturn(Map.of("canDelete", true));

        mockMvc.perform(get("/api/v1/job-positions/{id}/can-delete", positionId))
                .andExpect(status().isOk());
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/job-positions/{id}/promotion-destinations
    // -----------------------------------------------------------------------

    @Test
    void getPromotionDestinations_happyPath_returns200() throws Exception {
        given(jobPositionService.getPromotionDestinations(positionId)).willReturn(List.of());

        mockMvc.perform(get("/api/v1/job-positions/{id}/promotion-destinations", positionId))
                .andExpect(status().isOk());
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/job-positions/{id}/promotion-sources
    // -----------------------------------------------------------------------

    @Test
    void getPromotionSources_happyPath_returns200() throws Exception {
        given(jobPositionService.getPromotionSources(positionId)).willReturn(List.of());

        mockMvc.perform(get("/api/v1/job-positions/{id}/promotion-sources", positionId))
                .andExpect(status().isOk());
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/job-positions/{id}/promotion-stats-simple
    // -----------------------------------------------------------------------

    @Test
    void getSimplifiedPromotionStats_happyPath_returns200() throws Exception {
        given(jobPositionService.getSimplifiedPromotionStats(positionId))
                .willReturn(Map.of("total", 0));

        mockMvc.perform(get("/api/v1/job-positions/{id}/promotion-stats-simple", positionId))
                .andExpect(status().isOk());
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/job-positions/{id}/promotions-from-simple
    // -----------------------------------------------------------------------

    @Test
    void getSimplifiedPromotionsFrom_happyPath_returns200() throws Exception {
        given(jobPositionService.getSimplifiedPromotionsFrom(positionId)).willReturn(List.of());

        mockMvc.perform(get("/api/v1/job-positions/{id}/promotions-from-simple", positionId))
                .andExpect(status().isOk());
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/job-positions/{id}/promotions-to-simple
    // -----------------------------------------------------------------------

    @Test
    void getSimplifiedPromotionsTo_happyPath_returns200() throws Exception {
        given(jobPositionService.getSimplifiedPromotionsTo(positionId)).willReturn(List.of());

        mockMvc.perform(get("/api/v1/job-positions/{id}/promotions-to-simple", positionId))
                .andExpect(status().isOk());
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/job-positions/hierarchy
    // -----------------------------------------------------------------------

    @Test
    void getJobPositionHierarchy_happyPath_returns200() throws Exception {
        given(jobPositionRepository.findByParentJobPositionIsNull()).willReturn(List.of());

        mockMvc.perform(get("/api/v1/job-positions/hierarchy"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void getJobPositionHierarchy_repositoryThrows_returns500() throws Exception {
        given(jobPositionRepository.findByParentJobPositionIsNull())
                .willThrow(new RuntimeException("DB error"));

        mockMvc.perform(get("/api/v1/job-positions/hierarchy"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("FETCH_ERROR"));
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/job-positions/{id}/children
    // -----------------------------------------------------------------------

    @Test
    void getChildPositions_happyPath_returns200() throws Exception {
        given(jobPositionRepository.findByParentJobPositionId(positionId)).willReturn(List.of());

        mockMvc.perform(get("/api/v1/job-positions/{id}/children", positionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void getChildPositions_repositoryThrows_returns500() throws Exception {
        given(jobPositionRepository.findByParentJobPositionId(positionId))
                .willThrow(new RuntimeException("DB error"));

        mockMvc.perform(get("/api/v1/job-positions/{id}/children", positionId))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("FETCH_ERROR"));
    }
}