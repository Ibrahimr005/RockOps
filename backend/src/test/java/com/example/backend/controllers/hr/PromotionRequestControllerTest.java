package com.example.backend.controllers.hr;

import com.example.backend.config.JwtService;
import com.example.backend.dto.hr.promotions.*;
import com.example.backend.models.hr.PromotionRequest;
import com.example.backend.services.hr.PromotionRequestMapperService;
import com.example.backend.services.hr.PromotionRequestService;
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
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = PromotionRequestController.class)
@AutoConfigureMockMvc(addFilters = false)
public class PromotionRequestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PromotionRequestService promotionRequestService;

    @MockBean
    private PromotionRequestMapperService mapperService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    private Authentication hrManagerAuth;
    private Authentication hrEmployeeAuth;

    @BeforeEach
    void setUp() {
        objectMapper.registerModule(new JavaTimeModule());

        hrManagerAuth = new UsernamePasswordAuthenticationToken(
                "manager@site.com",
                null,
                List.of(new SimpleGrantedAuthority("ROLE_HR_MANAGER"))
        );

        hrEmployeeAuth = new UsernamePasswordAuthenticationToken(
                "employee@site.com",
                null,
                List.of(new SimpleGrantedAuthority("ROLE_HR_EMPLOYEE"))
        );
    }

    private PromotionRequest buildPromotionRequest(UUID id) {
        PromotionRequest request = new PromotionRequest();
        request.setId(id);
        request.setRequestTitle("Senior Engineer Promotion");
        request.setStatus(PromotionRequest.PromotionStatus.PENDING);
        return request;
    }

    private PromotionRequestResponseDTO buildResponseDTO(UUID id) {
        return PromotionRequestResponseDTO.builder()
                .id(id)
                .requestTitle("Senior Engineer Promotion")
                .status("PENDING")
                .priority("NORMAL")
                .employeeName("Ahmad Ali")
                .build();
    }

    // ==================== POST /api/v1/promotions ====================

    @Test
    public void createPromotionRequest_shouldReturn201WithData() throws Exception {
        UUID id = UUID.randomUUID();
        PromotionRequest created = buildPromotionRequest(id);
        PromotionRequestResponseDTO responseDTO = buildResponseDTO(id);

        willDoNothing().given(mapperService).validateCreateDTO(any());
        given(promotionRequestService.createPromotionRequest(any(), anyString()))
                .willReturn(created);
        given(mapperService.toResponseDTO(created)).willReturn(responseDTO);

        PromotionRequestCreateDTO createDTO = PromotionRequestCreateDTO.builder()
                .employeeId(UUID.randomUUID())
                .promotedToJobPositionId(UUID.randomUUID())
                .requestTitle("Senior Engineer Promotion")
                .justification("Outstanding performance over 2 years")
                .proposedEffectiveDate(LocalDate.now().plusMonths(1))
                .proposedSalary(new BigDecimal("8000.00"))
                .priority("NORMAL")
                .build();

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/promotions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createDTO))
                        .with(authentication(hrEmployeeAuth)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Promotion request created successfully"))
                .andExpect(jsonPath("$.data.requestTitle").value("Senior Engineer Promotion"));
    }

    @Test
    public void createPromotionRequest_whenValidationFails_shouldReturn400() throws Exception {
        willThrow(new IllegalArgumentException("Employee ID is required"))
                .given(mapperService).validateCreateDTO(any());

        PromotionRequestCreateDTO createDTO = PromotionRequestCreateDTO.builder()
                .requestTitle("Missing Employee")
                .build();

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/promotions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createDTO))
                        .with(authentication(hrEmployeeAuth)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    public void createPromotionRequest_whenServiceFails_shouldReturn400() throws Exception {
        willDoNothing().given(mapperService).validateCreateDTO(any());
        given(promotionRequestService.createPromotionRequest(any(), anyString()))
                .willThrow(new RuntimeException("Duplicate promotion request"));

        PromotionRequestCreateDTO createDTO = PromotionRequestCreateDTO.builder()
                .employeeId(UUID.randomUUID())
                .requestTitle("Duplicate")
                .build();

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/promotions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createDTO))
                        .with(authentication(hrEmployeeAuth)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ==================== GET /api/v1/promotions ====================

    @Test
    public void getAllPromotionRequests_noFilters_shouldReturn200WithList() throws Exception {
        UUID id = UUID.randomUUID();
        PromotionRequest request = buildPromotionRequest(id);
        PromotionRequestResponseDTO dto = buildResponseDTO(id);

        given(promotionRequestService.getAllPromotionRequests(isNull(), isNull(), isNull()))
                .willReturn(List.of(request));
        given(mapperService.toResponseDTOList(any())).willReturn(List.of(dto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/promotions")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.total").value(1));
    }

    @Test
    public void getAllPromotionRequests_withStatusFilter_shouldReturn200() throws Exception {
        given(promotionRequestService.getAllPromotionRequests(
                eq(PromotionRequest.PromotionStatus.PENDING), isNull(), isNull()))
                .willReturn(Collections.emptyList());
        given(mapperService.toResponseDTOList(any())).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/promotions")
                        .param("status", "PENDING")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.total").value(0));
    }

    @Test
    public void getAllPromotionRequests_withEmployeeIdFilter_shouldReturn200() throws Exception {
        UUID employeeId = UUID.randomUUID();
        given(promotionRequestService.getAllPromotionRequests(isNull(), eq(employeeId), isNull()))
                .willReturn(Collections.emptyList());
        given(mapperService.toResponseDTOList(any())).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/promotions")
                        .param("employeeId", employeeId.toString())
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    public void getAllPromotionRequests_whenInvalidStatus_shouldReturn400() throws Exception {
        // Passing an invalid status that triggers IllegalArgumentException from valueOf
        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/promotions")
                        .param("status", "INVALID_STATUS")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ==================== GET /api/v1/promotions/pending ====================

    @Test
    public void getPendingPromotionRequests_shouldReturn200WithList() throws Exception {
        UUID id = UUID.randomUUID();
        PromotionRequest request = buildPromotionRequest(id);
        PromotionRequestResponseDTO dto = buildResponseDTO(id);

        given(promotionRequestService.getPendingPromotionRequests()).willReturn(List.of(request));
        given(mapperService.toResponseDTOList(any())).willReturn(List.of(dto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/promotions/pending")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.count").value(1));
    }

    @Test
    public void getPendingPromotionRequests_empty_shouldReturn200WithZeroCount() throws Exception {
        given(promotionRequestService.getPendingPromotionRequests()).willReturn(Collections.emptyList());
        given(mapperService.toResponseDTOList(any())).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/promotions/pending")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(0));
    }

    @Test
    public void getPendingPromotionRequests_whenServiceThrows_shouldReturn500() throws Exception {
        given(promotionRequestService.getPendingPromotionRequests())
                .willThrow(new RuntimeException("Service unavailable"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/promotions/pending")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ==================== PUT /api/v1/promotions/{id}/review ====================

    @Test
    public void reviewPromotionRequest_approve_shouldReturn200() throws Exception {
        UUID id = UUID.randomUUID();
        PromotionRequest reviewed = buildPromotionRequest(id);
        reviewed.setStatus(PromotionRequest.PromotionStatus.APPROVED);
        PromotionRequestResponseDTO responseDTO = buildResponseDTO(id);
        responseDTO.setStatus("APPROVED");

        willDoNothing().given(mapperService).validateReviewDTO(any());
        given(promotionRequestService.reviewPromotionRequest(eq(id), any(), anyString()))
                .willReturn(reviewed);
        given(mapperService.toResponseDTO(reviewed)).willReturn(responseDTO);

        PromotionRequestReviewDTO reviewDTO = PromotionRequestReviewDTO.builder()
                .action("approve")
                .managerComments("Well deserved promotion")
                .approvedSalary(new BigDecimal("8500.00"))
                .actualEffectiveDate(LocalDate.now().plusMonths(1))
                .build();

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/v1/promotions/{id}/review", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reviewDTO))
                        .with(authentication(hrManagerAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("APPROVED"));
    }

    @Test
    public void reviewPromotionRequest_reject_shouldReturn200() throws Exception {
        UUID id = UUID.randomUUID();
        PromotionRequest reviewed = buildPromotionRequest(id);
        reviewed.setStatus(PromotionRequest.PromotionStatus.REJECTED);
        PromotionRequestResponseDTO responseDTO = buildResponseDTO(id);
        responseDTO.setStatus("REJECTED");

        willDoNothing().given(mapperService).validateReviewDTO(any());
        given(promotionRequestService.reviewPromotionRequest(eq(id), any(), anyString()))
                .willReturn(reviewed);
        given(mapperService.toResponseDTO(reviewed)).willReturn(responseDTO);

        PromotionRequestReviewDTO reviewDTO = PromotionRequestReviewDTO.builder()
                .action("reject")
                .rejectionReason("Position not available at this time")
                .build();

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/v1/promotions/{id}/review", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reviewDTO))
                        .with(authentication(hrManagerAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    public void reviewPromotionRequest_whenValidationFails_shouldReturn400() throws Exception {
        UUID id = UUID.randomUUID();
        willThrow(new IllegalArgumentException("Action is required"))
                .given(mapperService).validateReviewDTO(any());

        PromotionRequestReviewDTO reviewDTO = PromotionRequestReviewDTO.builder().build();

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/v1/promotions/{id}/review", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reviewDTO))
                        .with(authentication(hrManagerAuth)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    public void reviewPromotionRequest_whenRequestNotFound_shouldReturn400() throws Exception {
        UUID id = UUID.randomUUID();
        willDoNothing().given(mapperService).validateReviewDTO(any());
        given(promotionRequestService.reviewPromotionRequest(eq(id), any(), anyString()))
                .willThrow(new RuntimeException("Promotion request not found"));

        PromotionRequestReviewDTO reviewDTO = PromotionRequestReviewDTO.builder()
                .action("approve")
                .build();

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/v1/promotions/{id}/review", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reviewDTO))
                        .with(authentication(hrManagerAuth)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ==================== GET /api/v1/promotions/statistics ====================

    @Test
    public void getPromotionStatistics_shouldReturn200WithData() throws Exception {
        Map<String, Object> statsMap = new HashMap<>();
        statsMap.put("totalRequests", 20L);
        statsMap.put("pendingRequests", 5L);

        PromotionStatisticsDTO statsDTO = PromotionStatisticsDTO.builder()
                .totalRequests(20L)
                .pendingRequests(5L)
                .approvedRequests(10L)
                .rejectedRequests(5L)
                .approvalRate(0.75)
                .build();

        given(promotionRequestService.getPromotionStatistics()).willReturn(statsMap);
        given(mapperService.toStatisticsDTO(statsMap)).willReturn(statsDTO);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/promotions/statistics")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalRequests").value(20));
    }

    @Test
    public void getPromotionStatistics_whenServiceThrows_shouldReturn500() throws Exception {
        given(promotionRequestService.getPromotionStatistics())
                .willThrow(new RuntimeException("Statistics computation failed"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/promotions/statistics")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ==================== GET /api/v1/promotions/{id} ====================

    @Test
    public void getPromotionRequestById_shouldReturn200WithData() throws Exception {
        UUID id = UUID.randomUUID();
        PromotionRequest request = buildPromotionRequest(id);
        PromotionRequestResponseDTO dto = buildResponseDTO(id);

        given(promotionRequestService.getPromotionRequestById(id)).willReturn(request);
        given(mapperService.toResponseDTO(request)).willReturn(dto);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/promotions/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(id.toString()))
                .andExpect(jsonPath("$.data.requestTitle").value("Senior Engineer Promotion"));
    }

    @Test
    public void getPromotionRequestById_whenNotFound_shouldReturn404() throws Exception {
        UUID id = UUID.randomUUID();
        given(promotionRequestService.getPromotionRequestById(id))
                .willThrow(new RuntimeException("Promotion request not found"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/promotions/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").exists());
    }

    // ==================== POST /api/v1/promotions/{id}/implement ====================

    @Test
    public void implementPromotionRequest_shouldReturn200() throws Exception {
        UUID id = UUID.randomUUID();
        PromotionRequest implemented = buildPromotionRequest(id);
        implemented.setStatus(PromotionRequest.PromotionStatus.IMPLEMENTED);
        PromotionRequestResponseDTO responseDTO = buildResponseDTO(id);
        responseDTO.setStatus("IMPLEMENTED");

        given(promotionRequestService.implementPromotionRequest(eq(id), anyString()))
                .willReturn(implemented);
        given(mapperService.toResponseDTO(implemented)).willReturn(responseDTO);

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/promotions/{id}/implement", id)
                        .with(authentication(hrManagerAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Promotion implemented successfully"))
                .andExpect(jsonPath("$.data.status").value("IMPLEMENTED"));
    }

    @Test
    public void implementPromotionRequest_whenNotApproved_shouldReturn400() throws Exception {
        UUID id = UUID.randomUUID();
        given(promotionRequestService.implementPromotionRequest(eq(id), anyString()))
                .willThrow(new IllegalStateException("Cannot implement: promotion is not in APPROVED status"));

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/promotions/{id}/implement", id)
                        .with(authentication(hrManagerAuth)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ==================== GET /api/v1/promotions/ready-for-implementation ====================

    @Test
    public void getPromotionsReadyForImplementation_shouldReturn200WithList() throws Exception {
        UUID id = UUID.randomUUID();
        PromotionRequest request = buildPromotionRequest(id);
        PromotionRequestResponseDTO dto = buildResponseDTO(id);

        given(promotionRequestService.getPromotionsReadyForImplementation())
                .willReturn(List.of(request));
        given(mapperService.toResponseDTOList(any())).willReturn(List.of(dto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/promotions/ready-for-implementation")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.count").value(1));
    }

    @Test
    public void getPromotionsReadyForImplementation_whenServiceThrows_shouldReturn500() throws Exception {
        given(promotionRequestService.getPromotionsReadyForImplementation())
                .willThrow(new RuntimeException("Service error"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/promotions/ready-for-implementation")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ==================== GET /api/v1/promotions/employee/{employeeId}/summary ====================

    @Test
    public void getEmployeePromotionSummary_shouldReturn200() throws Exception {
        UUID employeeId = UUID.randomUUID();

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/promotions/employee/{employeeId}/summary", employeeId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.employeeId").value(employeeId.toString()));
    }

    // ==================== GET /api/v1/promotions/employee/{employeeId}/eligibility ====================

    @Test
    public void checkEmployeePromotionEligibility_shouldReturn200() throws Exception {
        UUID employeeId = UUID.randomUUID();

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/promotions/employee/{employeeId}/eligibility", employeeId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.employeeId").value(employeeId.toString()));
    }

    // ==================== POST /api/v1/promotions/{id}/cancel ====================

    @Test
    public void cancelPromotionRequest_withReason_shouldReturn200() throws Exception {
        UUID id = UUID.randomUUID();
        PromotionRequest cancelled = buildPromotionRequest(id);
        cancelled.setStatus(PromotionRequest.PromotionStatus.CANCELLED);
        PromotionRequestResponseDTO responseDTO = buildResponseDTO(id);
        responseDTO.setStatus("CANCELLED");

        given(promotionRequestService.cancelPromotionRequest(eq(id), anyString(), anyString()))
                .willReturn(cancelled);
        given(mapperService.toResponseDTO(cancelled)).willReturn(responseDTO);

        Map<String, Object> cancelData = new HashMap<>();
        cancelData.put("reason", "Position no longer available");

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/promotions/{id}/cancel", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(cancelData))
                        .with(authentication(hrEmployeeAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Promotion request cancelled successfully"));
    }

    @Test
    public void cancelPromotionRequest_withoutReason_shouldReturn400() throws Exception {
        UUID id = UUID.randomUUID();

        Map<String, Object> cancelData = new HashMap<>();
        // No "reason" key - controller returns 400

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/promotions/{id}/cancel", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(cancelData))
                        .with(authentication(hrEmployeeAuth)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("Cancellation reason is required"));
    }

    @Test
    public void cancelPromotionRequest_withBlankReason_shouldReturn400() throws Exception {
        UUID id = UUID.randomUUID();

        Map<String, Object> cancelData = new HashMap<>();
        cancelData.put("reason", "   ");

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/promotions/{id}/cancel", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(cancelData))
                        .with(authentication(hrEmployeeAuth)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    public void cancelPromotionRequest_whenServiceThrows_shouldReturn400() throws Exception {
        UUID id = UUID.randomUUID();
        given(promotionRequestService.cancelPromotionRequest(eq(id), anyString(), anyString()))
                .willThrow(new RuntimeException("Cannot cancel: already implemented"));

        Map<String, Object> cancelData = new HashMap<>();
        cancelData.put("reason", "Change of plans");

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/promotions/{id}/cancel", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(cancelData))
                        .with(authentication(hrEmployeeAuth)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ==================== GET /api/v1/promotions/department/{departmentId} ====================

    @Test
    public void getPromotionRequestsByDepartment_shouldReturn200() throws Exception {
        UUID departmentId = UUID.randomUUID();

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/promotions/department/{departmentId}", departmentId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.departmentId").value(departmentId.toString()))
                .andExpect(jsonPath("$.type").value("current"));
    }

    @Test
    public void getPromotionRequestsByDepartment_withCustomType_shouldReturn200() throws Exception {
        UUID departmentId = UUID.randomUUID();

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/promotions/department/{departmentId}", departmentId)
                        .param("type", "historical")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("historical"));
    }

    // ==================== POST /api/v1/promotions/bulk-action ====================

    @Test
    public void bulkPromotionAction_shouldReturn200() throws Exception {
        BulkPromotionActionDTO bulkDTO = BulkPromotionActionDTO.builder()
                .promotionRequestIds(List.of(UUID.randomUUID(), UUID.randomUUID()))
                .action("approve")
                .comments("Batch approval")
                .build();

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/promotions/bulk-action")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(bulkDTO))
                        .with(authentication(hrManagerAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.action").value("approve"))
                .andExpect(jsonPath("$.requestCount").value(2));
    }

    // ==================== GET /api/v1/promotions/analytics ====================

    @Test
    public void getPromotionAnalytics_noParams_shouldReturn200() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/promotions/analytics")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    public void getPromotionAnalytics_withYearAndDepartment_shouldReturn200() throws Exception {
        UUID departmentId = UUID.randomUUID();

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/promotions/analytics")
                        .param("year", "2025")
                        .param("departmentId", departmentId.toString())
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.year").value(2025));
    }

    // ==================== GET /api/v1/promotions/export ====================

    @Test
    public void exportPromotionData_defaultFormat_shouldReturn200() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/promotions/export")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.format").value("csv"));
    }

    @Test
    public void exportPromotionData_withStatusAndDepartment_shouldReturn200() throws Exception {
        UUID departmentId = UUID.randomUUID();

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/promotions/export")
                        .param("format", "xlsx")
                        .param("status", "APPROVED")
                        .param("departmentId", departmentId.toString())
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.format").value("xlsx"))
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    // ==================== GET /api/v1/promotions/health ====================

    @Test
    public void healthCheck_shouldReturn200WithStatusOk() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/promotions/health")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OK"))
                .andExpect(jsonPath("$.service").value("Enhanced Promotion Request API"))
                .andExpect(jsonPath("$.version").value("1.0.0"));
    }
}