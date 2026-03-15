package com.example.backend.controllers.warehouse;

import com.example.backend.config.JwtService;
import com.example.backend.dto.warehouse.ItemTypeDetailsDTO;
import com.example.backend.models.warehouse.ItemType;
import com.example.backend.services.warehouse.ItemTypeService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.SecurityFilterAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = ItemTypeController.class,
        excludeAutoConfiguration = {SecurityAutoConfiguration.class, SecurityFilterAutoConfiguration.class}
)
@AutoConfigureMockMvc(addFilters = false)
public class ItemTypeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ItemTypeService itemTypeService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    // --- Helpers ---

    private ItemType buildItemType(UUID id, String name) {
        ItemType itemType = new ItemType();
        itemType.setId(id);
        itemType.setName(name);
        itemType.setStatus("ACTIVE");
        itemType.setMinQuantity(5);
        return itemType;
    }

    private Map<String, Object> buildRequestBody(String name) {
        Map<String, Object> body = new HashMap<>();
        body.put("name", name);
        body.put("status", "ACTIVE");
        body.put("minQuantity", 5);
        return body;
    }

    private ItemTypeDetailsDTO buildDetailsDTO(UUID id, String name) {
        return ItemTypeDetailsDTO.builder()
                .itemTypeId(id)
                .itemTypeName(name)
                .categoryName("Spare Parts")
                .measuringUnit("kg")
                .totalQuantity(100)
                .totalValue(5000.0)
                .warehouseCount(2)
                .build();
    }

    // --- POST /api/v1/itemTypes ---

    @Test
    @WithMockUser
    void addItemType_returns200WithCreatedItemType() throws Exception {
        UUID id = UUID.randomUUID();
        ItemType created = buildItemType(id, "Engine Oil");
        Map<String, Object> requestBody = buildRequestBody("Engine Oil");

        given(itemTypeService.addItemType(anyMap())).willReturn(created);

        mockMvc.perform(MockMvcRequestBuilders.post("/api/v1/itemTypes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.name").value("Engine Oil"));
    }

    // --- GET /api/v1/itemTypes ---

    @Test
    @WithMockUser
    void getAllItemTypes_returns200WithList() throws Exception {
        List<ItemType> itemTypes = Arrays.asList(
                buildItemType(UUID.randomUUID(), "Engine Oil"),
                buildItemType(UUID.randomUUID(), "Air Filter")
        );
        given(itemTypeService.getAllItemTypes()).willReturn(itemTypes);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/v1/itemTypes")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("Engine Oil"))
                .andExpect(jsonPath("$[1].name").value("Air Filter"));
    }

    @Test
    @WithMockUser
    void getAllItemTypes_returns200WithEmptyList_whenNoneExist() throws Exception {
        given(itemTypeService.getAllItemTypes()).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders.get("/api/v1/itemTypes")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // --- PUT /api/v1/itemTypes/{id} ---

    @Test
    @WithMockUser
    void updateItemType_returns200WithUpdatedItemType() throws Exception {
        UUID id = UUID.randomUUID();
        ItemType updated = buildItemType(id, "Updated Engine Oil");
        Map<String, Object> requestBody = buildRequestBody("Updated Engine Oil");

        given(itemTypeService.updateItemType(eq(id), anyMap())).willReturn(updated);

        mockMvc.perform(MockMvcRequestBuilders.put("/api/v1/itemTypes/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.name").value("Updated Engine Oil"));
    }

    // --- DELETE /api/v1/itemTypes/{id} ---

    @Test
    @WithMockUser
    void deleteItemType_returns200_whenSuccessful() throws Exception {
        UUID id = UUID.randomUUID();
        willDoNothing().given(itemTypeService).deleteItemType(id);

        mockMvc.perform(MockMvcRequestBuilders.delete("/api/v1/itemTypes/{id}", id))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void deleteItemType_returns409_whenItemsExist() throws Exception {
        UUID id = UUID.randomUUID();
        willThrow(new RuntimeException("ITEMS_EXIST"))
                .given(itemTypeService).deleteItemType(id);

        mockMvc.perform(MockMvcRequestBuilders.delete("/api/v1/itemTypes/{id}", id))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser
    void deleteItemType_returns409_whenTransactionItemsExist() throws Exception {
        UUID id = UUID.randomUUID();
        willThrow(new RuntimeException("TRANSACTION_ITEMS_EXIST"))
                .given(itemTypeService).deleteItemType(id);

        mockMvc.perform(MockMvcRequestBuilders.delete("/api/v1/itemTypes/{id}", id))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser
    void deleteItemType_returns409_whenRequestOrderItemsExist() throws Exception {
        UUID id = UUID.randomUUID();
        willThrow(new RuntimeException("REQUEST_ORDER_ITEMS_EXIST"))
                .given(itemTypeService).deleteItemType(id);

        mockMvc.perform(MockMvcRequestBuilders.delete("/api/v1/itemTypes/{id}", id))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser
    void deleteItemType_returns409_whenOfferItemsExist() throws Exception {
        UUID id = UUID.randomUUID();
        willThrow(new RuntimeException("OFFER_ITEMS_EXIST"))
                .given(itemTypeService).deleteItemType(id);

        mockMvc.perform(MockMvcRequestBuilders.delete("/api/v1/itemTypes/{id}", id))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser
    void deleteItemType_returns404_whenItemTypeNotFound() throws Exception {
        UUID id = UUID.randomUUID();
        willThrow(new RuntimeException("ItemType not found with id: " + id))
                .given(itemTypeService).deleteItemType(id);

        mockMvc.perform(MockMvcRequestBuilders.delete("/api/v1/itemTypes/{id}", id))
                .andExpect(status().isNotFound());
    }

    // --- GET /api/v1/itemTypes/{itemTypeId}/details ---

    @Test
    @WithMockUser
    void getItemTypeDetails_returns200WithDetails() throws Exception {
        UUID id = UUID.randomUUID();
        ItemTypeDetailsDTO details = buildDetailsDTO(id, "Engine Oil");
        given(itemTypeService.getItemTypeDetails(id)).willReturn(details);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/v1/itemTypes/{itemTypeId}/details", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.itemTypeId").value(id.toString()))
                .andExpect(jsonPath("$.itemTypeName").value("Engine Oil"))
                .andExpect(jsonPath("$.categoryName").value("Spare Parts"))
                .andExpect(jsonPath("$.totalQuantity").value(100))
                .andExpect(jsonPath("$.warehouseCount").value(2));
    }

    @Test
    @WithMockUser
    void getItemTypeDetails_returns404_whenItemTypeNotFound() throws Exception {
        UUID id = UUID.randomUUID();
        given(itemTypeService.getItemTypeDetails(id))
                .willThrow(new IllegalArgumentException("Item type not found with id: " + id));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/v1/itemTypes/{itemTypeId}/details", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
    void getItemTypeDetails_returns500_whenUnexpectedErrorOccurs() throws Exception {
        UUID id = UUID.randomUUID();
        given(itemTypeService.getItemTypeDetails(id))
                .willThrow(new RuntimeException("Unexpected database error"));

        mockMvc.perform(MockMvcRequestBuilders.get("/api/v1/itemTypes/{itemTypeId}/details", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }
}