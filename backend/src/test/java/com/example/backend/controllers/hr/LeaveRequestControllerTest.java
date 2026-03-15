package com.example.backend.controllers.hr;

import com.example.backend.config.JwtService;
import com.example.backend.dto.hr.leave.LeaveRequestCreateDTO;
import com.example.backend.dto.hr.leave.LeaveRequestFilterDTO;
import com.example.backend.dto.hr.leave.LeaveRequestResponseDTO;
import com.example.backend.exceptions.InsufficientVacationBalanceException;
import com.example.backend.models.hr.LeaveRequest;
import com.example.backend.services.hr.LeaveRequestMapperService;
import com.example.backend.services.hr.LeaveRequestService;
import com.example.backend.services.hr.VacationBalanceService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = LeaveRequestController.class)
@AutoConfigureMockMvc(addFilters = false)
public class LeaveRequestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private LeaveRequestService leaveRequestService;

    @MockBean
    private LeaveRequestMapperService mapperService;

    @MockBean
    private VacationBalanceService vacationBalanceService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    private UsernamePasswordAuthenticationToken auth;
    private UUID leaveRequestId;
    private LeaveRequestResponseDTO responseDTO;
    private LeaveRequest leaveRequest;

    @BeforeEach
    void setUp() {
        objectMapper.registerModule(new JavaTimeModule());
        auth = new UsernamePasswordAuthenticationToken("hr.manager@rockops.com", null, Collections.emptyList());
        leaveRequestId = UUID.randomUUID();
        responseDTO = new LeaveRequestResponseDTO();
        leaveRequest = new LeaveRequest();
        leaveRequest.setId(leaveRequestId);
    }

    private LeaveRequestCreateDTO buildCreateDTO() {
        LeaveRequestCreateDTO dto = new LeaveRequestCreateDTO();
        dto.setLeaveType(LeaveRequest.LeaveType.VACATION);
        dto.setStartDate(LocalDate.of(2026, 4, 1));
        dto.setEndDate(LocalDate.of(2026, 4, 5));
        dto.setReason("Annual vacation");
        return dto;
    }

    // -----------------------------------------------------------------------
    // POST /api/v1/leave-requests
    // -----------------------------------------------------------------------

    @Test
    void submitLeaveRequest_happyPath_returns201() throws Exception {
        given(leaveRequestService.submitLeaveRequest(any(LeaveRequestCreateDTO.class), anyString()))
                .willReturn(leaveRequest);
        given(mapperService.mapToResponseDTO(leaveRequest)).willReturn(responseDTO);

        mockMvc.perform(post("/api/v1/leave-requests")
                        .with(authentication(auth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(buildCreateDTO())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Leave request submitted successfully"));
    }

    @Test
    void submitLeaveRequest_insufficientBalance_returns400() throws Exception {
        given(leaveRequestService.submitLeaveRequest(any(LeaveRequestCreateDTO.class), anyString()))
                .willThrow(new InsufficientVacationBalanceException("Insufficient balance"));

        mockMvc.perform(post("/api/v1/leave-requests")
                        .with(authentication(auth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(buildCreateDTO())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorType").value("INSUFFICIENT_BALANCE"));
    }

    @Test
    void submitLeaveRequest_invalidData_returns400() throws Exception {
        given(leaveRequestService.submitLeaveRequest(any(LeaveRequestCreateDTO.class), anyString()))
                .willThrow(new IllegalArgumentException("Start date must be before end date"));

        mockMvc.perform(post("/api/v1/leave-requests")
                        .with(authentication(auth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(buildCreateDTO())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorType").value("VALIDATION_ERROR"));
    }

    @Test
    void submitLeaveRequest_unexpectedError_returns400() throws Exception {
        given(leaveRequestService.submitLeaveRequest(any(LeaveRequestCreateDTO.class), anyString()))
                .willThrow(new RuntimeException("Unexpected"));

        mockMvc.perform(post("/api/v1/leave-requests")
                        .with(authentication(auth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(buildCreateDTO())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/leave-requests
    // -----------------------------------------------------------------------

    @Test
    void getLeaveRequests_happyPath_returns200() throws Exception {
        Page<LeaveRequest> page = new PageImpl<>(List.of(leaveRequest), PageRequest.of(0, 20), 1);
        given(leaveRequestService.getLeaveRequests(any(LeaveRequestFilterDTO.class))).willReturn(page);
        given(mapperService.mapToResponseDTOList(any())).willReturn(List.of(responseDTO));

        mockMvc.perform(get("/api/v1/leave-requests"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void getLeaveRequests_withEmployeeIdFilter_returns200() throws Exception {
        UUID employeeId = UUID.randomUUID();
        Page<LeaveRequest> page = new PageImpl<>(List.of(), PageRequest.of(0, 20), 0);
        given(leaveRequestService.getLeaveRequests(any(LeaveRequestFilterDTO.class))).willReturn(page);
        given(mapperService.mapToResponseDTOList(any())).willReturn(List.of());

        mockMvc.perform(get("/api/v1/leave-requests")
                        .param("employeeId", employeeId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void getLeaveRequests_serviceThrows_returns500() throws Exception {
        given(leaveRequestService.getLeaveRequests(any(LeaveRequestFilterDTO.class)))
                .willThrow(new RuntimeException("DB error"));

        mockMvc.perform(get("/api/v1/leave-requests"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false));
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/leave-requests/{id}
    // -----------------------------------------------------------------------

    @Test
    void getLeaveRequest_happyPath_returns200() throws Exception {
        Page<LeaveRequest> page = new PageImpl<>(List.of(leaveRequest), PageRequest.of(0, 20), 1);
        given(leaveRequestService.getLeaveRequests(any(LeaveRequestFilterDTO.class))).willReturn(page);
        given(mapperService.mapToResponseDTO(leaveRequest)).willReturn(responseDTO);

        mockMvc.perform(get("/api/v1/leave-requests/{id}", leaveRequestId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void getLeaveRequest_notFound_returns404() throws Exception {
        UUID otherId = UUID.randomUUID();
        // The page contains a request with a different id, so the filter won't find otherId
        Page<LeaveRequest> page = new PageImpl<>(List.of(leaveRequest), PageRequest.of(0, 20), 1);
        given(leaveRequestService.getLeaveRequests(any(LeaveRequestFilterDTO.class))).willReturn(page);

        mockMvc.perform(get("/api/v1/leave-requests/{id}", otherId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    // -----------------------------------------------------------------------
    // PUT /api/v1/leave-requests/{id}/approve
    // -----------------------------------------------------------------------

    @Test
    void approveLeaveRequest_happyPath_returns200() throws Exception {
        given(leaveRequestService.approveLeaveRequest(eq(leaveRequestId), anyString(), anyString()))
                .willReturn(leaveRequest);
        given(mapperService.mapToResponseDTO(leaveRequest)).willReturn(responseDTO);

        Map<String, String> body = Map.of("comments", "Approved for vacation");

        mockMvc.perform(put("/api/v1/leave-requests/{id}/approve", leaveRequestId)
                        .with(authentication(auth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Leave request approved successfully"));
    }

    @Test
    void approveLeaveRequest_noBody_returns200() throws Exception {
        given(leaveRequestService.approveLeaveRequest(eq(leaveRequestId), anyString(), anyString()))
                .willReturn(leaveRequest);
        given(mapperService.mapToResponseDTO(leaveRequest)).willReturn(responseDTO);

        mockMvc.perform(put("/api/v1/leave-requests/{id}/approve", leaveRequestId)
                        .with(authentication(auth))
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void approveLeaveRequest_serviceThrows_returns400() throws Exception {
        given(leaveRequestService.approveLeaveRequest(eq(leaveRequestId), anyString(), anyString()))
                .willThrow(new RuntimeException("Already approved"));

        mockMvc.perform(put("/api/v1/leave-requests/{id}/approve", leaveRequestId)
                        .with(authentication(auth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // -----------------------------------------------------------------------
    // PUT /api/v1/leave-requests/{id}/reject
    // -----------------------------------------------------------------------

    @Test
    void rejectLeaveRequest_happyPath_returns200() throws Exception {
        given(leaveRequestService.rejectLeaveRequest(eq(leaveRequestId), anyString(), anyString()))
                .willReturn(leaveRequest);
        given(mapperService.mapToResponseDTO(leaveRequest)).willReturn(responseDTO);

        Map<String, String> body = Map.of("comments", "Business critical period");

        mockMvc.perform(put("/api/v1/leave-requests/{id}/reject", leaveRequestId)
                        .with(authentication(auth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Leave request rejected successfully"));
    }

    @Test
    void rejectLeaveRequest_missingComments_returns400() throws Exception {
        Map<String, String> body = Map.of("comments", "  ");

        mockMvc.perform(put("/api/v1/leave-requests/{id}/reject", leaveRequestId)
                        .with(authentication(auth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("Comments are required when rejecting a leave request"));
    }

    @Test
    void rejectLeaveRequest_serviceThrows_returns400() throws Exception {
        given(leaveRequestService.rejectLeaveRequest(eq(leaveRequestId), anyString(), anyString()))
                .willThrow(new RuntimeException("Already rejected"));

        Map<String, String> body = Map.of("comments", "Not approved");

        mockMvc.perform(put("/api/v1/leave-requests/{id}/reject", leaveRequestId)
                        .with(authentication(auth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // -----------------------------------------------------------------------
    // PUT /api/v1/leave-requests/{id}/cancel
    // -----------------------------------------------------------------------

    @Test
    void cancelLeaveRequest_happyPath_returns200() throws Exception {
        given(leaveRequestService.cancelLeaveRequest(eq(leaveRequestId), anyString()))
                .willReturn(leaveRequest);
        given(mapperService.mapToResponseDTO(leaveRequest)).willReturn(responseDTO);

        mockMvc.perform(put("/api/v1/leave-requests/{id}/cancel", leaveRequestId)
                        .with(authentication(auth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Leave request cancelled successfully"));
    }

    @Test
    void cancelLeaveRequest_serviceThrows_returns400() throws Exception {
        given(leaveRequestService.cancelLeaveRequest(eq(leaveRequestId), anyString()))
                .willThrow(new RuntimeException("Cannot cancel approved request"));

        mockMvc.perform(put("/api/v1/leave-requests/{id}/cancel", leaveRequestId)
                        .with(authentication(auth)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/leave-requests/pending
    // -----------------------------------------------------------------------

    @Test
    void getPendingLeaveRequests_happyPath_returns200() throws Exception {
        given(leaveRequestService.getPendingLeaveRequests()).willReturn(List.of(leaveRequest));
        given(mapperService.mapToResponseDTOList(List.of(leaveRequest))).willReturn(List.of(responseDTO));

        mockMvc.perform(get("/api/v1/leave-requests/pending"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.count").value(1));
    }

    @Test
    void getPendingLeaveRequests_serviceThrows_returns500() throws Exception {
        given(leaveRequestService.getPendingLeaveRequests())
                .willThrow(new RuntimeException("DB error"));

        mockMvc.perform(get("/api/v1/leave-requests/pending"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false));
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/leave-requests/employee/{employeeId}
    // -----------------------------------------------------------------------

    @Test
    void getEmployeeLeaveRequests_happyPath_returns200() throws Exception {
        UUID employeeId = UUID.randomUUID();
        given(leaveRequestService.getEmployeeLeaveRequests(employeeId)).willReturn(List.of(leaveRequest));
        given(mapperService.mapToResponseDTOList(List.of(leaveRequest))).willReturn(List.of(responseDTO));

        mockMvc.perform(get("/api/v1/leave-requests/employee/{employeeId}", employeeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.count").value(1));
    }

    @Test
    void getEmployeeLeaveRequests_serviceThrows_returns500() throws Exception {
        UUID employeeId = UUID.randomUUID();
        given(leaveRequestService.getEmployeeLeaveRequests(employeeId))
                .willThrow(new RuntimeException("Not found"));

        mockMvc.perform(get("/api/v1/leave-requests/employee/{employeeId}", employeeId))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false));
    }

    // -----------------------------------------------------------------------
    // GET /api/v1/leave-requests/statistics
    // -----------------------------------------------------------------------

    @Test
    void getLeaveStatistics_happyPath_returns200() throws Exception {
        given(leaveRequestService.getLeaveStatistics(2026))
                .willReturn(Map.of("totalRequests", 15, "approved", 10));

        mockMvc.perform(get("/api/v1/leave-requests/statistics")
                        .param("year", "2026"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void getLeaveStatistics_noYear_returns200() throws Exception {
        given(leaveRequestService.getLeaveStatistics(null))
                .willReturn(Map.of("totalRequests", 15));

        mockMvc.perform(get("/api/v1/leave-requests/statistics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void getLeaveStatistics_serviceThrows_returns500() throws Exception {
        given(leaveRequestService.getLeaveStatistics(any()))
                .willThrow(new RuntimeException("Statistics failed"));

        mockMvc.perform(get("/api/v1/leave-requests/statistics"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false));
    }
}