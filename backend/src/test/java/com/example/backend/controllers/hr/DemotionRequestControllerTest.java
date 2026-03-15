package com.example.backend.controllers.hr;

import com.example.backend.config.JwtService;
import com.example.backend.dto.hr.demotion.DemotionRequestCreateDTO;
import com.example.backend.dto.hr.demotion.DemotionRequestDTO;
import com.example.backend.dto.hr.demotion.DemotionReviewDTO;
import com.example.backend.models.user.User;
import com.example.backend.services.hr.DemotionRequestService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = DemotionRequestController.class)
@AutoConfigureMockMvc(addFilters = false)
public class DemotionRequestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DemotionRequestService demotionRequestService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    private UUID requestId;
    private UUID employeeId;
    private UUID newPositionId;
    private DemotionRequestDTO sampleDTO;
    private DemotionRequestCreateDTO createDTO;
    private DemotionReviewDTO reviewDTO;
    private UsernamePasswordAuthenticationToken authToken;

    @BeforeEach
    void setUp() {
        objectMapper.registerModule(new JavaTimeModule());

        requestId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        newPositionId = UUID.randomUUID();

        sampleDTO = DemotionRequestDTO.builder()
                .id(requestId)
                .requestNumber("DEM-2026-00001")
                .employeeId(employeeId)
                .employeeName("Alice Johnson")
                .employeeNumber("EMP-2025-00001")
                .currentPositionName("Senior Engineer")
                .newPositionName("Junior Engineer")
                .currentSalary(new BigDecimal("8000.00"))
                .newSalary(new BigDecimal("5000.00"))
                .salaryReductionAmount(new BigDecimal("3000.00"))
                .salaryReductionPercentage(new BigDecimal("37.50"))
                .effectiveDate(LocalDate.of(2026, 4, 1))
                .reason("Performance issues documented over 6 months")
                .status("PENDING")
                .requestedBy("hr.manager")
                .requestedAt(LocalDateTime.of(2026, 3, 15, 10, 0))
                .build();

        createDTO = new DemotionRequestCreateDTO(
                employeeId,
                newPositionId,
                "L2",
                new BigDecimal("5000.00"),
                LocalDate.of(2026, 4, 1),
                "Performance issues documented over 6 months of review period"
        );

        reviewDTO = new DemotionReviewDTO(true, "Approved by department head", null);

        User mockUser = User.builder()
                .id(UUID.randomUUID())
                .username("hr.manager")
                .password("password")
                .firstName("HR")
                .lastName("Manager")
                .build();

        authToken = new UsernamePasswordAuthenticationToken(
                mockUser, null, mockUser.getAuthorities());
    }

    // ==================== POST /api/v1/hr/demotion-requests ====================

    @Test
    void createRequest_validData_shouldReturn201() throws Exception {
        given(demotionRequestService.createRequest(any(DemotionRequestCreateDTO.class), anyString()))
                .willReturn(sampleDTO);

        mockMvc.perform(post("/api/v1/hr/demotion-requests")
                        .with(authentication(authToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createDTO)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.requestNumber").value("DEM-2026-00001"))
                .andExpect(jsonPath("$.employeeName").value("Alice Johnson"))
                .andExpect(jsonPath("$.status").value("PENDING_DEPT_HEAD"));
    }

    @Test
    void createRequest_noPrincipal_usesSystemUsername_shouldReturn201() throws Exception {
        given(demotionRequestService.createRequest(any(DemotionRequestCreateDTO.class), eq("SYSTEM")))
                .willReturn(sampleDTO);

        mockMvc.perform(post("/api/v1/hr/demotion-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createDTO)))
                .andExpect(status().isCreated());
    }

    @Test
    void createRequest_serviceThrowsException_shouldReturn500() throws Exception {
        given(demotionRequestService.createRequest(any(DemotionRequestCreateDTO.class), anyString()))
                .willThrow(new RuntimeException("Employee not found"));

        mockMvc.perform(post("/api/v1/hr/demotion-requests")
                        .with(authentication(authToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createDTO)))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/hr/demotion-requests ====================

    @Test
    void getAll_noFilters_shouldReturn200WithList() throws Exception {
        given(demotionRequestService.getAll()).willReturn(List.of(sampleDTO));

        mockMvc.perform(get("/api/v1/hr/demotion-requests")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].requestNumber").value("DEM-2026-00001"))
                .andExpect(jsonPath("$[0].status").value("PENDING"));
    }

    @Test
    void getAll_emptyList_shouldReturn200() throws Exception {
        given(demotionRequestService.getAll()).willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/hr/demotion-requests")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void getAll_filterByEmployeeId_shouldReturn200WithList() throws Exception {
        given(demotionRequestService.getByEmployee(employeeId)).willReturn(List.of(sampleDTO));

        mockMvc.perform(get("/api/v1/hr/demotion-requests")
                        .param("employeeId", employeeId.toString())
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].employeeId").value(employeeId.toString()));
    }

    @Test
    void getAll_filterByStatus_validStatus_shouldReturn200() throws Exception {
        given(demotionRequestService.getByStatus(any())).willReturn(List.of(sampleDTO));

        mockMvc.perform(get("/api/v1/hr/demotion-requests")
                        .param("status", "PENDING")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void getAll_filterByStatus_invalidStatus_fallsBackToGetAll_shouldReturn200() throws Exception {
        // Invalid status enum value causes fallback to getAll()
        given(demotionRequestService.getAll()).willReturn(List.of(sampleDTO));

        mockMvc.perform(get("/api/v1/hr/demotion-requests")
                        .param("status", "INVALID_STATUS")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    // ==================== GET /api/v1/hr/demotion-requests/{id} ====================

    @Test
    void getById_existingId_shouldReturn200() throws Exception {
        given(demotionRequestService.getById(requestId)).willReturn(sampleDTO);

        mockMvc.perform(get("/api/v1/hr/demotion-requests/{id}", requestId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(requestId.toString()))
                .andExpect(jsonPath("$.requestNumber").value("DEM-2026-00001"));
    }

    @Test
    void getById_serviceThrowsException_shouldReturn500() throws Exception {
        given(demotionRequestService.getById(requestId))
                .willThrow(new RuntimeException("Not found"));

        mockMvc.perform(get("/api/v1/hr/demotion-requests/{id}", requestId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/hr/demotion-requests/statistics ====================

    @Test
    void getStatistics_shouldReturn200() throws Exception {
        Map<String, Object> stats = Map.of(
                "total", 10,
                "pending", 3,
                "approved", 5,
                "rejected", 2
        );
        given(demotionRequestService.getStatistics()).willReturn(stats);

        mockMvc.perform(get("/api/v1/hr/demotion-requests/statistics")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(10))
                .andExpect(jsonPath("$.pending").value(3));
    }

    @Test
    void getStatistics_serviceThrowsException_shouldReturn500() throws Exception {
        given(demotionRequestService.getStatistics())
                .willThrow(new RuntimeException("DB error"));

        mockMvc.perform(get("/api/v1/hr/demotion-requests/statistics")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== PUT /api/v1/hr/demotion-requests/{id}/dept-head-decision ====================

    @Test
    void deptHeadDecision_approve_shouldReturn200() throws Exception {
        DemotionRequestDTO approvedDTO = DemotionRequestDTO.builder()
                .id(requestId)
                .requestNumber("DEM-2026-00001")
                .status("PENDING_HR")
                .deptHeadApprovedBy("dept.head")
                .deptHeadComments("Approved by department head")
                .build();

        given(demotionRequestService.deptHeadDecision(eq(requestId), any(DemotionReviewDTO.class), anyString()))
                .willReturn(approvedDTO);

        mockMvc.perform(put("/api/v1/hr/demotion-requests/{id}/dept-head-decision", requestId)
                        .with(authentication(authToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reviewDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING_HR"))
                .andExpect(jsonPath("$.deptHeadComments").value("Approved by department head"));
    }

    @Test
    void deptHeadDecision_reject_shouldReturn200() throws Exception {
        DemotionReviewDTO rejectDTO = new DemotionReviewDTO(false, null, "Insufficient evidence");
        DemotionRequestDTO rejectedDTO = DemotionRequestDTO.builder()
                .id(requestId)
                .requestNumber("DEM-2026-00001")
                .status("REJECTED")
                .deptHeadRejectionReason("Insufficient evidence")
                .build();

        given(demotionRequestService.deptHeadDecision(eq(requestId), any(DemotionReviewDTO.class), anyString()))
                .willReturn(rejectedDTO);

        mockMvc.perform(put("/api/v1/hr/demotion-requests/{id}/dept-head-decision", requestId)
                        .with(authentication(authToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(rejectDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));
    }

    @Test
    void deptHeadDecision_noPrincipal_usesSystemUsername_shouldReturn200() throws Exception {
        given(demotionRequestService.deptHeadDecision(eq(requestId), any(DemotionReviewDTO.class), eq("SYSTEM")))
                .willReturn(sampleDTO);

        mockMvc.perform(put("/api/v1/hr/demotion-requests/{id}/dept-head-decision", requestId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reviewDTO)))
                .andExpect(status().isOk());
    }

    @Test
    void deptHeadDecision_serviceThrowsException_shouldReturn500() throws Exception {
        given(demotionRequestService.deptHeadDecision(eq(requestId), any(DemotionReviewDTO.class), anyString()))
                .willThrow(new RuntimeException("Invalid state transition"));

        mockMvc.perform(put("/api/v1/hr/demotion-requests/{id}/dept-head-decision", requestId)
                        .with(authentication(authToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reviewDTO)))
                .andExpect(status().isInternalServerError());
    }

    // ==================== PUT /api/v1/hr/demotion-requests/{id}/hr-decision ====================

    @Test
    void hrDecision_approve_shouldReturn200() throws Exception {
        DemotionRequestDTO approvedDTO = DemotionRequestDTO.builder()
                .id(requestId)
                .requestNumber("DEM-2026-00001")
                .status("APPROVED")
                .hrApprovedBy("hr.manager")
                .hrComments("HR approval granted")
                .build();

        given(demotionRequestService.hrDecision(eq(requestId), any(DemotionReviewDTO.class), anyString()))
                .willReturn(approvedDTO);

        mockMvc.perform(put("/api/v1/hr/demotion-requests/{id}/hr-decision", requestId)
                        .with(authentication(authToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reviewDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.hrApprovedBy").value("hr.manager"));
    }

    @Test
    void hrDecision_reject_shouldReturn200() throws Exception {
        DemotionReviewDTO rejectDTO = new DemotionReviewDTO(false, null, "Does not meet demotion criteria");
        DemotionRequestDTO rejectedDTO = DemotionRequestDTO.builder()
                .id(requestId)
                .requestNumber("DEM-2026-00001")
                .status("REJECTED")
                .hrRejectionReason("Does not meet demotion criteria")
                .build();

        given(demotionRequestService.hrDecision(eq(requestId), any(DemotionReviewDTO.class), anyString()))
                .willReturn(rejectedDTO);

        mockMvc.perform(put("/api/v1/hr/demotion-requests/{id}/hr-decision", requestId)
                        .with(authentication(authToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(rejectDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));
    }

    @Test
    void hrDecision_noPrincipal_usesSystemUsername_shouldReturn200() throws Exception {
        given(demotionRequestService.hrDecision(eq(requestId), any(DemotionReviewDTO.class), eq("SYSTEM")))
                .willReturn(sampleDTO);

        mockMvc.perform(put("/api/v1/hr/demotion-requests/{id}/hr-decision", requestId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reviewDTO)))
                .andExpect(status().isOk());
    }

    @Test
    void hrDecision_serviceThrowsException_shouldReturn500() throws Exception {
        given(demotionRequestService.hrDecision(eq(requestId), any(DemotionReviewDTO.class), anyString()))
                .willThrow(new RuntimeException("Demotion application failed"));

        mockMvc.perform(put("/api/v1/hr/demotion-requests/{id}/hr-decision", requestId)
                        .with(authentication(authToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reviewDTO)))
                .andExpect(status().isInternalServerError());
    }
}