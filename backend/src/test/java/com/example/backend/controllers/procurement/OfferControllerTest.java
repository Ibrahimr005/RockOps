package com.example.backend.controllers.procurement;

import com.example.backend.config.JwtService;
import com.example.backend.dto.procurement.*;
import com.example.backend.dto.procurement.PurchaseOrder.PurchaseOrderDTO;
import com.example.backend.mappers.procurement.OfferMapper;
import com.example.backend.models.procurement.Offer.Offer;
import com.example.backend.repositories.procurement.OfferRepository;
import com.example.backend.services.procurement.OfferService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.math.BigDecimal;
import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = OfferController.class)
@AutoConfigureMockMvc(addFilters = false)
public class OfferControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OfferService offerService;

    @MockBean
    private OfferRepository offerRepository;

    @MockBean
    private OfferMapper offerMapper;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    // ==================== POST /api/v1/offers ====================

    @Test
    @WithMockUser(username = "procurement_user")
    public void createOffer_happyPath_shouldReturn201() throws Exception {
        UUID offerId = UUID.randomUUID();
        OfferDTO requestDto = OfferDTO.builder()
                .title("New Offer")
                .build();
        OfferDTO responseDto = OfferDTO.builder()
                .id(offerId)
                .title("New Offer")
                .status("DRAFT")
                .build();

        given(offerService.createOffer(any(OfferDTO.class), eq("procurement_user")))
                .willReturn(responseDto);

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/offers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(offerId.toString()))
                .andExpect(jsonPath("$.title").value("New Offer"));
    }

    // ==================== POST /api/v1/offers/{offerId}/items ====================

    @Test
    @WithMockUser
    public void addOfferItems_happyPath_shouldReturn200() throws Exception {
        UUID offerId = UUID.randomUUID();
        OfferItemDTO item = OfferItemDTO.builder()
                .id(UUID.randomUUID())
                .quantity(5.0)
                .unitPrice(BigDecimal.valueOf(100))
                .currency("USD")
                .build();

        given(offerService.addOfferItems(eq(offerId), anyList())).willReturn(List.of(item));

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/offers/{offerId}/items", offerId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(List.of(item))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].quantity").value(5.0));
    }

    @Test
    @WithMockUser
    public void addOfferItems_whenException_shouldReturn500() throws Exception {
        UUID offerId = UUID.randomUUID();

        given(offerService.addOfferItems(eq(offerId), anyList()))
                .willThrow(new RuntimeException("Offer not found"));

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/offers/{offerId}/items", offerId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(List.of())))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Server Error"));
    }

    // ==================== PUT /api/v1/offers/{offerId}/status ====================

    @Test
    @WithMockUser(username = "manager_user")
    public void updateOfferStatus_happyPath_shouldReturn200() throws Exception {
        UUID offerId = UUID.randomUUID();
        OfferDTO updatedDto = OfferDTO.builder()
                .id(offerId)
                .status("APPROVED")
                .build();

        given(offerService.updateOfferStatus(eq(offerId), eq("APPROVED"), eq("manager_user"), isNull()))
                .willReturn(updatedDto);

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/v1/offers/{offerId}/status", offerId)
                        .param("status", "APPROVED")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    @WithMockUser(username = "manager_user")
    public void updateOfferStatus_withRejectionReason_shouldReturn200() throws Exception {
        UUID offerId = UUID.randomUUID();
        OfferDTO updatedDto = OfferDTO.builder()
                .id(offerId)
                .status("REJECTED")
                .rejectionReason("Price too high")
                .build();

        given(offerService.updateOfferStatus(eq(offerId), eq("REJECTED"), eq("manager_user"), eq("Price too high")))
                .willReturn(updatedDto);

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/v1/offers/{offerId}/status", offerId)
                        .param("status", "REJECTED")
                        .param("rejectionReason", "Price too high")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));
    }

    // ==================== PUT /api/v1/offers/items/{offerItemId} ====================

    @Test
    @WithMockUser
    public void updateOfferItem_happyPath_shouldReturn200() throws Exception {
        UUID offerItemId = UUID.randomUUID();
        OfferItemDTO requestDto = OfferItemDTO.builder()
                .quantity(10.0)
                .unitPrice(BigDecimal.valueOf(200))
                .build();
        OfferItemDTO responseDto = OfferItemDTO.builder()
                .id(offerItemId)
                .quantity(10.0)
                .unitPrice(BigDecimal.valueOf(200))
                .build();

        given(offerService.updateOfferItem(eq(offerItemId), any(OfferItemDTO.class))).willReturn(responseDto);

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/v1/offers/items/{offerItemId}", offerItemId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(offerItemId.toString()))
                .andExpect(jsonPath("$.quantity").value(10.0));
    }

    // ==================== DELETE /api/v1/offers/items/{offerItemId} ====================

    @Test
    @WithMockUser
    public void deleteOfferItem_happyPath_shouldReturn204() throws Exception {
        UUID offerItemId = UUID.randomUUID();

        willDoNothing().given(offerService).deleteOfferItem(offerItemId);

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/v1/offers/items/{offerItemId}", offerItemId))
                .andExpect(status().isNoContent());
    }

    // ==================== DELETE /api/v1/offers/{offerId} ====================

    @Test
    @WithMockUser
    public void deleteOffer_happyPath_shouldReturn204() throws Exception {
        UUID offerId = UUID.randomUUID();

        willDoNothing().given(offerService).deleteOffer(offerId);

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/v1/offers/{offerId}", offerId))
                .andExpect(status().isNoContent());
    }

    // ==================== GET /api/v1/offers ====================

    @Test
    @WithMockUser
    public void getOffers_noStatus_shouldReturn200WithAllOffers() throws Exception {
        OfferDTO dto = OfferDTO.builder().id(UUID.randomUUID()).title("Offer A").build();
        given(offerService.getAllOffers()).willReturn(List.of(dto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/offers")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].title").value("Offer A"));
    }

    @Test
    @WithMockUser
    public void getOffers_withStatus_shouldReturn200WithFilteredOffers() throws Exception {
        OfferDTO dto = OfferDTO.builder().id(UUID.randomUUID()).status("APPROVED").build();
        given(offerService.getOffersByStatus("APPROVED")).willReturn(List.of(dto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/offers")
                        .param("status", "approved")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    public void getOffers_emptyList_shouldReturn200Empty() throws Exception {
        given(offerService.getAllOffers()).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/offers")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/v1/offers/by-request/{requestOrderId} ====================

    @Test
    @WithMockUser
    public void getOffersByRequestOrder_happyPath_shouldReturn200() throws Exception {
        UUID requestOrderId = UUID.randomUUID();
        OfferDTO dto = OfferDTO.builder().id(UUID.randomUUID()).requestOrderId(requestOrderId).build();
        given(offerService.getOffersByRequestOrder(requestOrderId)).willReturn(List.of(dto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/offers/by-request/{requestOrderId}", requestOrderId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    // ==================== GET /api/v1/offers/{offerId} ====================

    @Test
    @WithMockUser
    public void getOfferById_happyPath_shouldReturn200() throws Exception {
        UUID offerId = UUID.randomUUID();
        OfferDTO dto = OfferDTO.builder().id(offerId).title("Specific Offer").build();
        given(offerService.getOfferById(offerId)).willReturn(dto);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/offers/{offerId}", offerId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(offerId.toString()))
                .andExpect(jsonPath("$.title").value("Specific Offer"));
    }

    // ==================== GET /api/v1/offers/{offerId}/items ====================

    @Test
    @WithMockUser
    public void getOfferItemsByOffer_happyPath_shouldReturn200() throws Exception {
        UUID offerId = UUID.randomUUID();
        OfferItemDTO item = OfferItemDTO.builder().id(UUID.randomUUID()).offerId(offerId).build();
        given(offerService.getOfferItemsByOffer(offerId)).willReturn(List.of(item));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/offers/{offerId}/items", offerId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    // ==================== GET /api/v1/offers/items/by-request-item/{requestOrderItemId} ====================

    @Test
    @WithMockUser
    public void getOfferItemsByRequestOrderItem_happyPath_shouldReturn200() throws Exception {
        UUID requestOrderItemId = UUID.randomUUID();
        OfferItemDTO item = OfferItemDTO.builder().id(UUID.randomUUID()).build();
        given(offerService.getOfferItemsByRequestOrderItem(requestOrderItemId)).willReturn(List.of(item));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/offers/items/by-request-item/{requestOrderItemId}", requestOrderItemId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    // ==================== GET /api/v1/offers/status ====================

    @Test
    @WithMockUser
    public void getOffersByStatus_happyPath_shouldReturn200() throws Exception {
        OfferDTO dto = OfferDTO.builder().id(UUID.randomUUID()).status("PENDING").build();
        given(offerService.getOffersByStatus("PENDING")).willReturn(List.of(dto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/offers/status")
                        .param("status", "pending")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    // ==================== GET /api/v1/offers/{offerId}/request-order ====================

    @Test
    @WithMockUser
    public void getRequestOrderByOfferId_happyPath_shouldReturn200() throws Exception {
        UUID offerId = UUID.randomUUID();
        RequestOrderDTO requestOrderDTO = RequestOrderDTO.builder()
                .id(UUID.randomUUID())
                .title("Request Order 1")
                .build();
        given(offerService.getRequestOrderByOfferId(offerId)).willReturn(requestOrderDTO);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/offers/{offerId}/request-order", offerId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Request Order 1"));
    }

    // ==================== POST /api/v1/offers/{offerId}/retry ====================

    @Test
    @WithMockUser(username = "retry_user")
    public void retryOffer_happyPath_shouldReturn200() throws Exception {
        UUID offerId = UUID.randomUUID();
        OfferDTO retriedDto = OfferDTO.builder().id(offerId).status("DRAFT").build();
        given(offerService.retryOffer(eq(offerId), eq("retry_user"))).willReturn(retriedDto);

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/offers/{offerId}/retry", offerId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DRAFT"));
    }

    @Test
    @WithMockUser(username = "retry_user")
    public void retryOffer_whenIllegalStateException_shouldReturn400() throws Exception {
        UUID offerId = UUID.randomUUID();
        given(offerService.retryOffer(eq(offerId), anyString()))
                .willThrow(new IllegalStateException("Offer cannot be retried in current state"));

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/offers/{offerId}/retry", offerId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Offer cannot be retried in current state"));
    }

    @Test
    @WithMockUser(username = "retry_user")
    public void retryOffer_whenRuntimeException_shouldReturn404() throws Exception {
        UUID offerId = UUID.randomUUID();
        given(offerService.retryOffer(eq(offerId), anyString()))
                .willThrow(new RuntimeException("Offer not found"));

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/offers/{offerId}/retry", offerId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    // ==================== PUT /api/v1/offers/{offerId}/finance-status ====================

    @Test
    @WithMockUser
    public void updateFinanceStatus_happyPath_shouldReturn200() throws Exception {
        UUID offerId = UUID.randomUUID();
        OfferDTO updatedDto = OfferDTO.builder().id(offerId).financeStatus("APPROVED").build();
        given(offerService.updateFinanceStatus(eq(offerId), eq("APPROVED"))).willReturn(updatedDto);

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/v1/offers/{offerId}/finance-status", offerId)
                        .param("financeStatus", "APPROVED")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.financeStatus").value("APPROVED"));
    }

    @Test
    @WithMockUser
    public void updateFinanceStatus_whenException_shouldReturn500() throws Exception {
        UUID offerId = UUID.randomUUID();
        given(offerService.updateFinanceStatus(eq(offerId), anyString()))
                .willThrow(new RuntimeException("Offer not found"));

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/v1/offers/{offerId}/finance-status", offerId)
                        .param("financeStatus", "APPROVED")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/offers/finance-status/{status} ====================

    @Test
    @WithMockUser
    public void getOffersByFinanceStatus_happyPath_shouldReturn200() throws Exception {
        OfferDTO dto = OfferDTO.builder().id(UUID.randomUUID()).financeStatus("PENDING").build();
        given(offerService.getOffersByFinanceStatus("PENDING")).willReturn(List.of(dto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/offers/finance-status/{status}", "PENDING")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    public void getOffersByFinanceStatus_whenException_shouldReturn500() throws Exception {
        given(offerService.getOffersByFinanceStatus(anyString()))
                .willThrow(new RuntimeException("DB error"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/offers/finance-status/{status}", "PENDING")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== PUT /api/v1/offers/offer-items/{offerItemId}/financeStatus ====================

    @Test
    @WithMockUser(username = "finance_user")
    public void updateOfferItemStatus_happyPath_shouldReturn200() throws Exception {
        UUID offerItemId = UUID.randomUUID();
        OfferItemDTO updatedItem = OfferItemDTO.builder()
                .id(offerItemId)
                .financeStatus("APPROVED")
                .build();
        given(offerService.updateOfferItemFinanceStatus(eq(offerItemId), eq("APPROVED"), isNull()))
                .willReturn(updatedItem);

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/v1/offers/offer-items/{offerItemId}/financeStatus", offerItemId)
                        .param("financeStatus", "APPROVED")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.financeStatus").value("APPROVED"));
    }

    @Test
    @WithMockUser(username = "finance_user")
    public void updateOfferItemStatus_whenException_shouldReturn500() throws Exception {
        UUID offerItemId = UUID.randomUUID();
        given(offerService.updateOfferItemFinanceStatus(any(), anyString(), any()))
                .willThrow(new RuntimeException("Item not found"));

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/v1/offers/offer-items/{offerItemId}/financeStatus", offerItemId)
                        .param("financeStatus", "APPROVED")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/offers/completed-offers ====================

    @Test
    @WithMockUser
    public void getCompletedFinanceOffers_happyPath_shouldReturn200() throws Exception {
        OfferDTO dto = OfferDTO.builder().id(UUID.randomUUID()).financeStatus("COMPLETED").build();
        given(offerService.getFinanceCompletedOffers()).willReturn(List.of(dto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/offers/completed-offers")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    public void getCompletedFinanceOffers_whenException_shouldReturn500() throws Exception {
        given(offerService.getFinanceCompletedOffers())
                .willThrow(new RuntimeException("DB error"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/offers/completed-offers")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== POST /api/v1/offers/{offerId}/complete-review ====================

    @Test
    @WithMockUser(username = "finance_user")
    public void completeFinanceReview_happyPath_shouldReturn200() throws Exception {
        UUID offerId = UUID.randomUUID();
        OfferDTO updatedDto = OfferDTO.builder().id(offerId).status("FINANCE_REVIEWED").build();
        given(offerService.completeFinanceReview(eq(offerId), eq("finance_user"))).willReturn(updatedDto);

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/offers/{offerId}/complete-review", offerId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "finance_user")
    public void completeFinanceReview_whenException_shouldReturn500() throws Exception {
        UUID offerId = UUID.randomUUID();
        given(offerService.completeFinanceReview(any(), anyString()))
                .willThrow(new RuntimeException("Offer not in correct state"));

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/offers/{offerId}/complete-review", offerId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/offers/{offerId}/timeline ====================

    @Test
    @WithMockUser
    public void getOfferTimeline_happyPath_shouldReturn200() throws Exception {
        UUID offerId = UUID.randomUUID();
        OfferTimelineEventDTO event = OfferTimelineEventDTO.builder()
                .id(UUID.randomUUID())
                .offerId(offerId)
                .build();
        given(offerService.getOfferTimeline(offerId)).willReturn(List.of(event));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/offers/{offerId}/timeline", offerId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    public void getOfferTimeline_whenRuntimeException_shouldReturn404() throws Exception {
        UUID offerId = UUID.randomUUID();
        given(offerService.getOfferTimeline(offerId))
                .willThrow(new RuntimeException("Offer not found"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/offers/{offerId}/timeline", offerId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    // ==================== GET /api/v1/offers/{offerId}/timeline/retryable ====================

    @Test
    @WithMockUser
    public void getRetryableEvents_happyPath_shouldReturn200() throws Exception {
        UUID offerId = UUID.randomUUID();
        given(offerService.getRetryableEvents(offerId)).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/offers/{offerId}/timeline/retryable", offerId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    public void getRetryableEvents_whenRuntimeException_shouldReturn404() throws Exception {
        UUID offerId = UUID.randomUUID();
        given(offerService.getRetryableEvents(offerId))
                .willThrow(new RuntimeException("Offer not found"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/offers/{offerId}/timeline/retryable", offerId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    // ==================== GET /api/v1/offers/{offerId}/timeline/attempt/{attemptNumber} ====================

    @Test
    @WithMockUser
    public void getTimelineForAttempt_happyPath_shouldReturn200() throws Exception {
        UUID offerId = UUID.randomUUID();
        given(offerService.getTimelineForAttempt(offerId, 1)).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/offers/{offerId}/timeline/attempt/{attemptNumber}", offerId, 1)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    public void getTimelineForAttempt_whenRuntimeException_shouldReturn404() throws Exception {
        UUID offerId = UUID.randomUUID();
        given(offerService.getTimelineForAttempt(eq(offerId), eq(99)))
                .willThrow(new RuntimeException("Attempt not found"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/offers/{offerId}/timeline/attempt/{attemptNumber}", offerId, 99)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    // ==================== GET /api/v1/offers/{offerId}/timeline/stats ====================

    @Test
    @WithMockUser
    public void getTimelineStats_happyPath_shouldReturn200WithStats() throws Exception {
        UUID offerId = UUID.randomUUID();
        OfferDTO dto = OfferDTO.builder()
                .id(offerId)
                .currentAttemptNumber(2)
                .totalRetries(1)
                .build();
        given(offerService.getOfferById(offerId)).willReturn(dto);
        given(offerService.getOfferTimeline(offerId)).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/offers/{offerId}/timeline/stats", offerId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalAttempts").value(2))
                .andExpect(jsonPath("$.totalRetries").value(1));
    }

    @Test
    @WithMockUser
    public void getTimelineStats_whenRuntimeException_shouldReturn404() throws Exception {
        UUID offerId = UUID.randomUUID();
        given(offerService.getOfferById(offerId))
                .willThrow(new RuntimeException("Offer not found"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/offers/{offerId}/timeline/stats", offerId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    // ==================== POST /api/v1/offers/{offerId}/continue-and-return ====================

    @Test
    @WithMockUser(username = "proc_user")
    public void continueAndReturnOffer_happyPath_shouldReturn200() throws Exception {
        UUID offerId = UUID.randomUUID();
        Map<String, Object> result = Map.of("offerId", offerId.toString(), "status", "CONTINUED");
        given(offerService.continueAndReturnOffer(eq(offerId), eq("proc_user"))).willReturn(result);

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/offers/{offerId}/continue-and-return", offerId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONTINUED"));
    }

    @Test
    @WithMockUser(username = "proc_user")
    public void continueAndReturnOffer_whenIllegalStateException_shouldReturn400() throws Exception {
        UUID offerId = UUID.randomUUID();
        given(offerService.continueAndReturnOffer(any(), anyString()))
                .willThrow(new IllegalStateException("Offer cannot be continued"));

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/offers/{offerId}/continue-and-return", offerId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Offer cannot be continued"));
    }

    @Test
    @WithMockUser(username = "proc_user")
    public void continueAndReturnOffer_whenException_shouldReturn500() throws Exception {
        UUID offerId = UUID.randomUUID();
        given(offerService.continueAndReturnOffer(any(), anyString()))
                .willThrow(new RuntimeException("Unexpected error"));

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/offers/{offerId}/continue-and-return", offerId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== POST /api/v1/offers/{offerId}/finalize-with-remaining ====================

    @Test
    @WithMockUser(username = "proc_user")
    public void finalizeWithRemaining_happyPath_shouldReturn200() throws Exception {
        UUID offerId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();
        Map<String, Object> serviceResult = new HashMap<>();
        serviceResult.put("offerId", offerId.toString());

        given(offerService.finalizeWithRemaining(eq(offerId), anyList(), anyString()))
                .willReturn(serviceResult);

        Map<String, Object> body = new HashMap<>();
        body.put("finalizedItemIds", List.of(itemId.toString()));
        body.put("username", "proc_user");

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/offers/{offerId}/finalize-with-remaining", offerId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Offer finalized successfully"));
    }

    @Test
    @WithMockUser(username = "proc_user")
    public void finalizeWithRemaining_missingFinalizedItemIds_shouldReturn400() throws Exception {
        UUID offerId = UUID.randomUUID();

        Map<String, Object> body = new HashMap<>();
        body.put("username", "proc_user");
        // finalizedItemIds intentionally missing

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/offers/{offerId}/finalize-with-remaining", offerId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("finalizedItemIds is required"));
    }

    @Test
    @WithMockUser(username = "proc_user")
    public void finalizeWithRemaining_whenException_shouldReturn500() throws Exception {
        UUID offerId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        given(offerService.finalizeWithRemaining(any(), anyList(), anyString()))
                .willThrow(new RuntimeException("Finalization failed"));

        Map<String, Object> body = new HashMap<>();
        body.put("finalizedItemIds", List.of(itemId.toString()));

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/offers/{offerId}/finalize-with-remaining", offerId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isInternalServerError());
    }

    // ==================== POST /api/v1/offers/{offerId}/create-purchase-order ====================

    @Test
    @WithMockUser(username = "proc_user")
    public void createPurchaseOrderFromItems_happyPath_shouldReturn200() throws Exception {
        UUID offerId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();
        PurchaseOrderDTO poDto = PurchaseOrderDTO.builder()
                .id(UUID.randomUUID())
                .poNumber("PO-2026-001")
                .build();

        given(offerService.createPurchaseOrderFromItems(eq(offerId), anyList(), eq("proc_user")))
                .willReturn(poDto);

        Map<String, Object> body = new HashMap<>();
        body.put("offerItemIds", List.of(itemId.toString()));

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/offers/{offerId}/create-purchase-order", offerId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.poNumber").value("PO-2026-001"));
    }

    @Test
    @WithMockUser(username = "proc_user")
    public void createPurchaseOrderFromItems_missingOfferItemIds_shouldReturn400() throws Exception {
        UUID offerId = UUID.randomUUID();

        Map<String, Object> body = new HashMap<>();
        // offerItemIds intentionally missing

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/offers/{offerId}/create-purchase-order", offerId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("offerItemIds is required"));
    }

    @Test
    @WithMockUser(username = "proc_user")
    public void createPurchaseOrderFromItems_whenException_shouldReturn500() throws Exception {
        UUID offerId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        given(offerService.createPurchaseOrderFromItems(any(), anyList(), anyString()))
                .willThrow(new RuntimeException("Creation failed"));

        Map<String, Object> body = new HashMap<>();
        body.put("offerItemIds", List.of(itemId.toString()));

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/offers/{offerId}/create-purchase-order", offerId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isInternalServerError());
    }

    // ==================== POST /api/v1/offers/items/finalize ====================

    @Test
    @WithMockUser(username = "proc_user")
    public void finalizeSpecificItems_happyPath_shouldReturn200() throws Exception {
        UUID itemId = UUID.randomUUID();

        willDoNothing().given(offerService).finalizeSpecificItems(anyList(), anyString());

        Map<String, Object> body = new HashMap<>();
        body.put("offerItemIds", List.of(itemId.toString()));

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/offers/items/finalize")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Items finalized successfully"));
    }

    @Test
    @WithMockUser(username = "proc_user")
    public void finalizeSpecificItems_missingOfferItemIds_shouldReturn400() throws Exception {
        Map<String, Object> body = new HashMap<>();
        // offerItemIds missing

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/offers/items/finalize")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("offerItemIds is required"));
    }

    @Test
    @WithMockUser(username = "proc_user")
    public void finalizeSpecificItems_whenException_shouldReturn500() throws Exception {
        UUID itemId = UUID.randomUUID();

        willThrow(new RuntimeException("Finalization failed"))
                .given(offerService).finalizeSpecificItems(anyList(), anyString());

        Map<String, Object> body = new HashMap<>();
        body.put("offerItemIds", List.of(itemId.toString()));

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/offers/items/finalize")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isInternalServerError());
    }

    // ==================== POST /api/v1/offers/{originalOfferId}/copy-timeline-to/{newOfferId} ====================

    @Test
    @WithMockUser
    public void copyTimeline_happyPath_shouldReturn200() throws Exception {
        UUID originalOfferId = UUID.randomUUID();
        UUID newOfferId = UUID.randomUUID();

        willDoNothing().given(offerService).addTimelineHistoryToOffer(originalOfferId, newOfferId);

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/offers/{originalOfferId}/copy-timeline-to/{newOfferId}",
                                originalOfferId, newOfferId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Timeline copied successfully"));
    }

    @Test
    @WithMockUser
    public void copyTimeline_whenException_shouldReturn500() throws Exception {
        UUID originalOfferId = UUID.randomUUID();
        UUID newOfferId = UUID.randomUUID();

        willThrow(new RuntimeException("Copy failed"))
                .given(offerService).addTimelineHistoryToOffer(any(), any());

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/offers/{originalOfferId}/copy-timeline-to/{newOfferId}",
                                originalOfferId, newOfferId))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Failed to copy timeline: Copy failed"));
    }

    // ==================== PUT /api/v1/offers/{id}/finance-validation-status ====================

    @Test
    @WithMockUser
    public void updateFinanceValidationStatus_happyPath_shouldReturn200() throws Exception {
        UUID id = UUID.randomUUID();
        Offer offer = new Offer();
        OfferDTO dto = OfferDTO.builder().id(id).build();

        given(offerRepository.findById(id)).willReturn(Optional.of(offer));
        given(offerRepository.save(offer)).willReturn(offer);
        given(offerMapper.toDTO(offer)).willReturn(dto);

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/v1/offers/{id}/finance-validation-status", id)
                        .param("status", "PENDING_FINANCE_VALIDATION")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    public void updateFinanceValidationStatus_whenInvalidStatus_shouldReturn400() throws Exception {
        UUID id = UUID.randomUUID();

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/v1/offers/{id}/finance-validation-status", id)
                        .param("status", "INVALID_STATUS_VALUE")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }

    // ==================== PUT /api/v1/offers/{id}/finance-validation-response ====================

    @Test
    @WithMockUser
    public void handleFinanceValidationResponse_happyPath_shouldReturn200() throws Exception {
        UUID id = UUID.randomUUID();
        UUID reviewerUserId = UUID.randomUUID();
        OfferDTO dto = OfferDTO.builder().id(id).status("FINANCE_APPROVED").build();

        given(offerService.handleFinanceValidationResponse(eq(id), eq("APPROVE"), eq(reviewerUserId)))
                .willReturn(dto);

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/v1/offers/{id}/finance-validation-response", id)
                        .param("decision", "APPROVE")
                        .param("reviewerUserId", reviewerUserId.toString())
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    public void handleFinanceValidationResponse_whenRuntimeException_shouldReturn400() throws Exception {
        UUID id = UUID.randomUUID();
        UUID reviewerUserId = UUID.randomUUID();

        given(offerService.handleFinanceValidationResponse(any(), anyString(), any()))
                .willThrow(new RuntimeException("Invalid decision"));

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/v1/offers/{id}/finance-validation-response", id)
                        .param("decision", "APPROVE")
                        .param("reviewerUserId", reviewerUserId.toString())
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }

    // ==================== PUT /api/v1/offers/{id}/inspection ====================

    @Test
    @WithMockUser(username = "inspector_user")
    public void handleInspectionDecision_happyPath_shouldReturn200() throws Exception {
        UUID id = UUID.randomUUID();
        OfferDTO dto = OfferDTO.builder().id(id).build();

        given(offerService.handleInspectionDecision(eq(id), eq("APPROVE"), eq("inspector_user"), isNull(), isNull()))
                .willReturn(dto);

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/v1/offers/{id}/inspection", id)
                        .param("decision", "APPROVE")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "inspector_user")
    public void handleInspectionDecision_whenIllegalStateException_shouldReturn400() throws Exception {
        UUID id = UUID.randomUUID();

        given(offerService.handleInspectionDecision(any(), anyString(), anyString(), any(), any()))
                .willThrow(new IllegalStateException("Offer not in inspectable state"));

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/v1/offers/{id}/inspection", id)
                        .param("decision", "REJECT")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Offer not in inspectable state"));
    }

    @Test
    @WithMockUser(username = "inspector_user")
    public void handleInspectionDecision_whenException_shouldReturn500() throws Exception {
        UUID id = UUID.randomUUID();

        given(offerService.handleInspectionDecision(any(), anyString(), anyString(), any(), any()))
                .willThrow(new RuntimeException("Unexpected error"));

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/v1/offers/{id}/inspection", id)
                        .param("decision", "APPROVE")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }
}