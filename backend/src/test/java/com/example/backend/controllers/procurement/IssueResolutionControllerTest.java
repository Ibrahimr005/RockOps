package com.example.backend.controllers.procurement;

import com.example.backend.config.JwtService;
import com.example.backend.dto.procurement.ResolveIssueRequest;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderResolutionType;
import com.example.backend.services.procurement.IssueResolutionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = IssueResolutionController.class)
@AutoConfigureMockMvc(addFilters = false)
public class IssueResolutionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private IssueResolutionService issueResolutionService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    private ResolveIssueRequest resolveRequest;

    @BeforeEach
    void setUp() {
        objectMapper.registerModule(new JavaTimeModule());

        resolveRequest = new ResolveIssueRequest();
        resolveRequest.setIssueId(UUID.randomUUID());
        resolveRequest.setResolutionType(PurchaseOrderResolutionType.REDELIVERY);
        resolveRequest.setResolutionNotes("Merchant agreed to reship the missing items within 5 days.");
    }

    // ==================== POST /api/procurement/issues/resolve ====================

    @Test
    @WithMockUser(username = "procurement.manager")
    void resolveIssues_validSingleRequest_shouldReturn200() throws Exception {
        willDoNothing().given(issueResolutionService).resolveIssues(anyList(), anyString());

        mockMvc.perform(post("/api/procurement/issues/resolve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(List.of(resolveRequest))))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "procurement.manager")
    void resolveIssues_multipleRequests_shouldReturn200() throws Exception {
        ResolveIssueRequest refundRequest = new ResolveIssueRequest();
        refundRequest.setIssueId(UUID.randomUUID());
        refundRequest.setResolutionType(PurchaseOrderResolutionType.REFUND);
        refundRequest.setResolutionNotes("Refund issued for damaged goods.");

        ResolveIssueRequest acceptRequest = new ResolveIssueRequest();
        acceptRequest.setIssueId(UUID.randomUUID());
        acceptRequest.setResolutionType(PurchaseOrderResolutionType.ACCEPT_SHORTAGE);
        acceptRequest.setResolutionNotes("Shortage accepted due to market constraints.");

        willDoNothing().given(issueResolutionService).resolveIssues(anyList(), anyString());

        mockMvc.perform(post("/api/procurement/issues/resolve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(List.of(refundRequest, acceptRequest))))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "procurement.manager")
    void resolveIssues_emptyList_shouldReturn200() throws Exception {
        willDoNothing().given(issueResolutionService).resolveIssues(anyList(), anyString());

        mockMvc.perform(post("/api/procurement/issues/resolve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Collections.emptyList())))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "procurement.manager")
    void resolveIssues_replacementPoResolution_shouldReturn200() throws Exception {
        ResolveIssueRequest replacementRequest = new ResolveIssueRequest();
        replacementRequest.setIssueId(UUID.randomUUID());
        replacementRequest.setResolutionType(PurchaseOrderResolutionType.REPLACEMENT_PO);
        replacementRequest.setResolutionNotes("Creating a new PO with an alternative supplier.");

        willDoNothing().given(issueResolutionService).resolveIssues(anyList(), anyString());

        mockMvc.perform(post("/api/procurement/issues/resolve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(List.of(replacementRequest))))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "procurement.manager")
    void resolveIssues_serviceThrowsRuntimeException_shouldReturn500() throws Exception {
        willThrow(new RuntimeException("Issue not found or already resolved"))
                .given(issueResolutionService).resolveIssues(anyList(), anyString());

        mockMvc.perform(post("/api/procurement/issues/resolve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(List.of(resolveRequest))))
                .andExpect(status().isInternalServerError());
    }

    @Test
    @WithMockUser(username = "procurement.manager")
    void resolveIssues_serviceThrowsIllegalStateException_shouldReturn500() throws Exception {
        willThrow(new IllegalStateException("Cannot resolve issue in current state"))
                .given(issueResolutionService).resolveIssues(anyList(), anyString());

        mockMvc.perform(post("/api/procurement/issues/resolve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(List.of(resolveRequest))))
                .andExpect(status().isInternalServerError());
    }
}