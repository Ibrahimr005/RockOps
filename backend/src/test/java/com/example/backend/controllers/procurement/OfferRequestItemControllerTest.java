package com.example.backend.controllers.procurement;

import com.example.backend.config.JwtService;
import com.example.backend.dto.procurement.OfferRequestItemDTO;
import com.example.backend.dto.procurement.RequestItemModificationDTO;
import com.example.backend.services.procurement.OfferRequestItemService;
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

import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doNothing;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = OfferRequestItemController.class)
@AutoConfigureMockMvc(addFilters = false)
public class OfferRequestItemControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OfferRequestItemService offerRequestItemService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    // ==================== GET /api/procurement/offers/{offerId}/request-items ====================

    @Test
    @WithMockUser
    public void getEffectiveRequestItems_shouldReturn200WithList() throws Exception {
        UUID offerId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        OfferRequestItemDTO dto = OfferRequestItemDTO.builder()
                .id(itemId)
                .offerId(offerId)
                .itemTypeName("Hydraulic Oil")
                .quantity(10.0)
                .build();

        given(offerRequestItemService.getEffectiveRequestItems(offerId)).willReturn(List.of(dto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/procurement/offers/{offerId}/request-items", offerId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value(itemId.toString()))
                .andExpect(jsonPath("$[0].itemTypeName").value("Hydraulic Oil"));
    }

    @Test
    @WithMockUser
    public void getEffectiveRequestItems_emptyList_shouldReturn200() throws Exception {
        UUID offerId = UUID.randomUUID();

        given(offerRequestItemService.getEffectiveRequestItems(offerId)).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/procurement/offers/{offerId}/request-items", offerId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== POST /api/procurement/offers/{offerId}/request-items/initialize ====================

    @Test
    @WithMockUser(username = "procurement.user")
    public void initializeModifiedItems_shouldReturn200WithList() throws Exception {
        UUID offerId = UUID.randomUUID();

        OfferRequestItemDTO dto = OfferRequestItemDTO.builder()
                .id(UUID.randomUUID())
                .offerId(offerId)
                .itemTypeName("Engine Filter")
                .quantity(5.0)
                .build();

        given(offerRequestItemService.initializeModifiedItems(eq(offerId), any(String.class)))
                .willReturn(List.of(dto));

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/procurement/offers/{offerId}/request-items/initialize", offerId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].itemTypeName").value("Engine Filter"));
    }

    @Test
    @WithMockUser(username = "procurement.user")
    public void initializeModifiedItems_emptyResult_shouldReturn200() throws Exception {
        UUID offerId = UUID.randomUUID();

        given(offerRequestItemService.initializeModifiedItems(eq(offerId), any(String.class)))
                .willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/procurement/offers/{offerId}/request-items/initialize", offerId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== POST /api/procurement/offers/{offerId}/request-items ====================

    @Test
    @WithMockUser(username = "procurement.user")
    public void addRequestItem_shouldReturn200WithCreatedItem() throws Exception {
        UUID offerId = UUID.randomUUID();
        UUID createdItemId = UUID.randomUUID();

        OfferRequestItemDTO requestDto = OfferRequestItemDTO.builder()
                .itemTypeName("Steel Bolt")
                .quantity(100.0)
                .comment("Urgent order")
                .build();

        OfferRequestItemDTO createdDto = OfferRequestItemDTO.builder()
                .id(createdItemId)
                .offerId(offerId)
                .itemTypeName("Steel Bolt")
                .quantity(100.0)
                .comment("Urgent order")
                .build();

        given(offerRequestItemService.addRequestItem(eq(offerId), any(OfferRequestItemDTO.class), any(String.class)))
                .willReturn(createdDto);

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/procurement/offers/{offerId}/request-items", offerId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDto))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(createdItemId.toString()))
                .andExpect(jsonPath("$.itemTypeName").value("Steel Bolt"))
                .andExpect(jsonPath("$.quantity").value(100.0));
    }

    // ==================== PUT /api/procurement/offers/{offerId}/request-items/{itemId} ====================

    @Test
    @WithMockUser(username = "procurement.user")
    public void updateRequestItem_shouldReturn200WithUpdatedItem() throws Exception {
        UUID offerId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        OfferRequestItemDTO requestDto = OfferRequestItemDTO.builder()
                .itemTypeName("Diesel Filter")
                .quantity(20.0)
                .comment("Updated quantity")
                .build();

        OfferRequestItemDTO updatedDto = OfferRequestItemDTO.builder()
                .id(itemId)
                .offerId(offerId)
                .itemTypeName("Diesel Filter")
                .quantity(20.0)
                .comment("Updated quantity")
                .build();

        given(offerRequestItemService.updateRequestItem(eq(itemId), any(OfferRequestItemDTO.class), any(String.class)))
                .willReturn(updatedDto);

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/procurement/offers/{offerId}/request-items/{itemId}", offerId, itemId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDto))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(itemId.toString()))
                .andExpect(jsonPath("$.itemTypeName").value("Diesel Filter"))
                .andExpect(jsonPath("$.quantity").value(20.0));
    }

    // ==================== DELETE /api/procurement/offers/{offerId}/request-items/{itemId} ====================

    @Test
    @WithMockUser(username = "procurement.user")
    public void deleteRequestItem_shouldReturn204() throws Exception {
        UUID offerId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        doNothing().when(offerRequestItemService).deleteRequestItem(eq(itemId), any(String.class));

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/procurement/offers/{offerId}/request-items/{itemId}", offerId, itemId))
                .andExpect(status().isNoContent());
    }

    // ==================== GET /api/procurement/offers/{offerId}/request-items/history ====================

    @Test
    @WithMockUser
    public void getModificationHistory_shouldReturn200WithList() throws Exception {
        UUID offerId = UUID.randomUUID();

        RequestItemModificationDTO historyDto = RequestItemModificationDTO.builder()
                .id(UUID.randomUUID())
                .offerId(offerId)
                .actionBy("procurement.user")
                .itemTypeName("Engine Part")
                .oldQuantity(5.0)
                .newQuantity(10.0)
                .build();

        given(offerRequestItemService.getModificationHistory(offerId)).willReturn(List.of(historyDto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/procurement/offers/{offerId}/request-items/history", offerId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].actionBy").value("procurement.user"))
                .andExpect(jsonPath("$[0].itemTypeName").value("Engine Part"));
    }

    @Test
    @WithMockUser
    public void getModificationHistory_emptyHistory_shouldReturn200() throws Exception {
        UUID offerId = UUID.randomUUID();

        given(offerRequestItemService.getModificationHistory(offerId)).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/procurement/offers/{offerId}/request-items/history", offerId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }
}