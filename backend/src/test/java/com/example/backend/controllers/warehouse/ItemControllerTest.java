package com.example.backend.controllers.warehouse;

import com.example.backend.config.JwtService;
import com.example.backend.dto.item.ItemResolutionDTO;
import com.example.backend.models.warehouse.Item;
import com.example.backend.models.warehouse.ItemResolution;
import com.example.backend.models.warehouse.ItemStatus;
import com.example.backend.models.warehouse.ResolutionType;
import com.example.backend.repositories.warehouse.ItemRepository;
import com.example.backend.services.warehouse.ItemCategoryService;
import com.example.backend.services.warehouse.ItemService;
import com.example.backend.services.warehouse.WarehouseService;
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

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.doNothing;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ItemController.class)
@AutoConfigureMockMvc(addFilters = false)
public class ItemControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ItemService itemService;

    @MockBean
    private WarehouseService warehouseService;

    @MockBean
    private ItemCategoryService itemCategoryService;

    @MockBean
    private ItemRepository itemRepository;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    // ==================== GET /api/v1/items/warehouse/{warehouseId} ====================

    @Test
    @WithMockUser
    public void getItemsByWarehouse_shouldReturn200WithList() throws Exception {
        UUID warehouseId = UUID.randomUUID();
        Item item = new Item();
        item.setItemStatus(ItemStatus.IN_WAREHOUSE);

        given(itemService.getItemsByWarehouse(warehouseId)).willReturn(List.of(item));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/items/warehouse/{warehouseId}", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    public void getItemsByWarehouse_emptyList_shouldReturn200() throws Exception {
        UUID warehouseId = UUID.randomUUID();

        given(itemService.getItemsByWarehouse(warehouseId)).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/items/warehouse/{warehouseId}", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @WithMockUser
    public void getItemsByWarehouse_whenIllegalArgument_shouldReturn400() throws Exception {
        UUID warehouseId = UUID.randomUUID();

        given(itemService.getItemsByWarehouse(warehouseId))
                .willThrow(new IllegalArgumentException("Invalid warehouse"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/items/warehouse/{warehouseId}", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    public void getItemsByWarehouse_whenUnexpectedException_shouldReturn500() throws Exception {
        UUID warehouseId = UUID.randomUUID();

        given(itemService.getItemsByWarehouse(warehouseId))
                .willThrow(new RuntimeException("Unexpected error"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/items/warehouse/{warehouseId}", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== POST /api/v1/items ====================

    @Test
    @WithMockUser
    public void createItem_shouldReturn200WithItem() throws Exception {
        UUID itemTypeId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();
        Item newItem = new Item();
        newItem.setQuantity(10);
        newItem.setItemStatus(ItemStatus.IN_WAREHOUSE);

        given(itemService.createItem(any(UUID.class), any(UUID.class), anyInt(), anyString(), any(LocalDateTime.class)))
                .willReturn(newItem);

        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("itemTypeId", itemTypeId.toString());
        requestBody.put("warehouseId", warehouseId.toString());
        requestBody.put("initialQuantity", 10);
        requestBody.put("username", "testuser");
        requestBody.put("createdAt", "2026-03-15");

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    public void createItem_missingItemTypeId_shouldReturn400() throws Exception {
        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("warehouseId", UUID.randomUUID().toString());
        requestBody.put("initialQuantity", 10);
        requestBody.put("username", "testuser");

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation Error"));
    }

    @Test
    @WithMockUser
    public void createItem_missingWarehouseId_shouldReturn400() throws Exception {
        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("itemTypeId", UUID.randomUUID().toString());
        requestBody.put("initialQuantity", 10);
        requestBody.put("username", "testuser");

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation Error"));
    }

    @Test
    @WithMockUser
    public void createItem_missingInitialQuantity_shouldReturn400() throws Exception {
        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("itemTypeId", UUID.randomUUID().toString());
        requestBody.put("warehouseId", UUID.randomUUID().toString());
        requestBody.put("username", "testuser");

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation Error"));
    }

    @Test
    @WithMockUser
    public void createItem_missingUsername_shouldReturn400() throws Exception {
        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("itemTypeId", UUID.randomUUID().toString());
        requestBody.put("warehouseId", UUID.randomUUID().toString());
        requestBody.put("initialQuantity", 5);

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation Error"));
    }

    @Test
    @WithMockUser
    public void createItem_whenServiceThrowsRuntimeException_shouldReturn500() throws Exception {
        UUID itemTypeId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();

        given(itemService.createItem(any(UUID.class), any(UUID.class), anyInt(), anyString(), any(LocalDateTime.class)))
                .willThrow(new RuntimeException("Service failure"));

        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("itemTypeId", itemTypeId.toString());
        requestBody.put("warehouseId", warehouseId.toString());
        requestBody.put("initialQuantity", 10);
        requestBody.put("username", "testuser");

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Server Error"));
    }

    // ==================== DELETE /api/v1/items/{itemId} ====================

    @Test
    @WithMockUser
    public void deleteItem_shouldReturn200() throws Exception {
        UUID itemId = UUID.randomUUID();

        doNothing().when(itemService).deleteItem(itemId);

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/v1/items/{itemId}", itemId))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    public void deleteItem_whenIllegalArgument_shouldReturn400() throws Exception {
        UUID itemId = UUID.randomUUID();

        willThrow(new IllegalArgumentException("Item not found"))
                .given(itemService).deleteItem(any(UUID.class));

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/v1/items/{itemId}", itemId))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    public void deleteItem_whenUnexpectedException_shouldReturn500() throws Exception {
        UUID itemId = UUID.randomUUID();

        willThrow(new RuntimeException("Unexpected error"))
                .given(itemService).deleteItem(any(UUID.class));

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/v1/items/{itemId}", itemId))
                .andExpect(status().isInternalServerError());
    }

    // ==================== POST /api/v1/items/resolve-discrepancy ====================

    @Test
    @WithMockUser
    public void resolveDiscrepancy_shouldReturn200WithResolution() throws Exception {
        UUID itemId = UUID.randomUUID();
        ItemResolution resolution = new ItemResolution();
        resolution.setId(UUID.randomUUID());
        resolution.setResolutionType(ResolutionType.ACKNOWLEDGE_LOSS);
        resolution.setResolvedBy("admin");

        given(itemService.resolveDiscrepancy(any(ItemResolutionDTO.class))).willReturn(resolution);

        ItemResolutionDTO requestBody = new ItemResolutionDTO();
        requestBody.setItemId(itemId);
        requestBody.setResolutionType(ResolutionType.ACKNOWLEDGE_LOSS);
        requestBody.setNotes("Item was acknowledged as lost");
        requestBody.setResolvedBy("admin");

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/items/resolve-discrepancy")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    public void resolveDiscrepancy_whenIllegalArgument_shouldReturn400() throws Exception {
        given(itemService.resolveDiscrepancy(any(ItemResolutionDTO.class)))
                .willThrow(new IllegalArgumentException("Item already resolved"));

        ItemResolutionDTO requestBody = new ItemResolutionDTO();
        requestBody.setItemId(UUID.randomUUID());
        requestBody.setResolutionType(ResolutionType.COUNTING_ERROR);

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/items/resolve-discrepancy")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Item already resolved"));
    }

    @Test
    @WithMockUser
    public void resolveDiscrepancy_whenUnexpectedException_shouldReturn500() throws Exception {
        given(itemService.resolveDiscrepancy(any(ItemResolutionDTO.class)))
                .willThrow(new RuntimeException("Unexpected error"));

        ItemResolutionDTO requestBody = new ItemResolutionDTO();
        requestBody.setItemId(UUID.randomUUID());
        requestBody.setResolutionType(ResolutionType.ACCEPT_SURPLUS);

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/items/resolve-discrepancy")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/items/{itemId}/resolutions ====================

    @Test
    @WithMockUser
    public void getItemResolutionHistory_shouldReturn200WithList() throws Exception {
        UUID itemId = UUID.randomUUID();
        ItemResolution resolution = new ItemResolution();
        resolution.setId(UUID.randomUUID());
        resolution.setResolvedBy("admin");

        given(itemService.getItemResolutionHistory(itemId)).willReturn(List.of(resolution));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/items/{itemId}/resolutions", itemId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    public void getItemResolutionHistory_whenException_shouldReturn500() throws Exception {
        UUID itemId = UUID.randomUUID();

        given(itemService.getItemResolutionHistory(itemId))
                .willThrow(new RuntimeException("Unexpected error"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/items/{itemId}/resolutions", itemId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/items/warehouse/{warehouseId}/discrepancies ====================

    @Test
    @WithMockUser
    public void getDiscrepancyItems_shouldReturn200WithList() throws Exception {
        UUID warehouseId = UUID.randomUUID();
        Item item = new Item();
        item.setItemStatus(ItemStatus.MISSING);

        given(itemService.getDiscrepancyItems(warehouseId)).willReturn(List.of(item));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/items/warehouse/{warehouseId}/discrepancies", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    public void getDiscrepancyItems_whenIllegalArgument_shouldReturn400() throws Exception {
        UUID warehouseId = UUID.randomUUID();

        given(itemService.getDiscrepancyItems(warehouseId))
                .willThrow(new IllegalArgumentException("Warehouse not found"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/items/warehouse/{warehouseId}/discrepancies", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }

    // ==================== GET /api/v1/items/warehouse/{warehouseId}/resolved ====================

    @Test
    @WithMockUser
    public void getResolvedItems_shouldReturn200WithList() throws Exception {
        UUID warehouseId = UUID.randomUUID();
        Item item = new Item();
        item.setResolved(true);
        item.setItemStatus(ItemStatus.MISSING);

        given(itemService.getResolvedItems(warehouseId)).willReturn(List.of(item));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/items/warehouse/{warehouseId}/resolved", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    public void getResolvedItems_whenIllegalArgument_shouldReturn400() throws Exception {
        UUID warehouseId = UUID.randomUUID();

        given(itemService.getResolvedItems(warehouseId))
                .willThrow(new IllegalArgumentException("Warehouse not found"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/items/warehouse/{warehouseId}/resolved", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }

    // ==================== GET /api/v1/items/resolutions/user/{username} ====================

    @Test
    @WithMockUser
    public void getResolutionsByUser_shouldReturn200WithList() throws Exception {
        String username = "warehouseadmin";
        ItemResolution resolution = new ItemResolution();
        resolution.setId(UUID.randomUUID());
        resolution.setResolvedBy(username);

        given(itemService.getItemResolutionsByUser(username)).willReturn(List.of(resolution));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/items/resolutions/user/{username}", username)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    public void getResolutionsByUser_whenException_shouldReturn500() throws Exception {
        String username = "unknownuser";

        given(itemService.getItemResolutionsByUser(username))
                .willThrow(new RuntimeException("Unexpected error"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/items/resolutions/user/{username}", username)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/items/warehouse/{warehouseId}/stolen ====================

    @Test
    @WithMockUser
    public void getStolenItems_shouldReturn200WithFilteredList() throws Exception {
        UUID warehouseId = UUID.randomUUID();

        Item stolenItem = new Item();
        stolenItem.setItemStatus(ItemStatus.MISSING);
        stolenItem.setResolved(false);

        Item resolvedStolenItem = new Item();
        resolvedStolenItem.setItemStatus(ItemStatus.MISSING);
        resolvedStolenItem.setResolved(true);

        Item inWarehouseItem = new Item();
        inWarehouseItem.setItemStatus(ItemStatus.IN_WAREHOUSE);
        inWarehouseItem.setResolved(false);

        given(itemService.getItemsByWarehouse(warehouseId))
                .willReturn(List.of(stolenItem, resolvedStolenItem, inWarehouseItem));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/items/warehouse/{warehouseId}/stolen", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    public void getStolenItems_whenIllegalArgument_shouldReturn400() throws Exception {
        UUID warehouseId = UUID.randomUUID();

        given(itemService.getItemsByWarehouse(warehouseId))
                .willThrow(new IllegalArgumentException("Warehouse not found"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/items/warehouse/{warehouseId}/stolen", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }

    // ==================== GET /api/v1/items/warehouse/{warehouseId}/overreceived ====================

    @Test
    @WithMockUser
    public void getOverReceivedItems_shouldReturn200WithFilteredList() throws Exception {
        UUID warehouseId = UUID.randomUUID();

        Item overReceivedItem = new Item();
        overReceivedItem.setItemStatus(ItemStatus.OVERRECEIVED);
        overReceivedItem.setResolved(false);

        given(itemService.getItemsByWarehouse(warehouseId))
                .willReturn(List.of(overReceivedItem));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/items/warehouse/{warehouseId}/overreceived", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    public void getOverReceivedItems_whenIllegalArgument_shouldReturn400() throws Exception {
        UUID warehouseId = UUID.randomUUID();

        given(itemService.getItemsByWarehouse(warehouseId))
                .willThrow(new IllegalArgumentException("Warehouse not found"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/items/warehouse/{warehouseId}/overreceived", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }

    // ==================== GET /api/v1/items/warehouse/{warehouseId}/counts ====================

    @Test
    @WithMockUser
    public void getItemStatusCounts_shouldReturn200WithCounts() throws Exception {
        UUID warehouseId = UUID.randomUUID();

        Item inWarehouseItem = new Item();
        inWarehouseItem.setItemStatus(ItemStatus.IN_WAREHOUSE);
        inWarehouseItem.setResolved(false);

        given(itemService.getItemsByWarehouse(warehouseId)).willReturn(List.of(inWarehouseItem));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/items/warehouse/{warehouseId}/counts", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.inWarehouse").exists())
                .andExpect(jsonPath("$.stolen").exists())
                .andExpect(jsonPath("$.overReceived").exists())
                .andExpect(jsonPath("$.total").exists());
    }

    @Test
    @WithMockUser
    public void getItemStatusCounts_whenIllegalArgument_shouldReturn400() throws Exception {
        UUID warehouseId = UUID.randomUUID();

        given(itemService.getItemsByWarehouse(warehouseId))
                .willThrow(new IllegalArgumentException("Warehouse not found"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/items/warehouse/{warehouseId}/counts", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }

    // ==================== GET /api/v1/items/{itemId}/can-resolve ====================

    @Test
    @WithMockUser
    public void canResolveItem_missingItem_canResolve_shouldReturn200True() throws Exception {
        UUID itemId = UUID.randomUUID();

        Item item = new Item();
        item.setItemStatus(ItemStatus.MISSING);
        item.setResolved(false);

        given(itemRepository.findById(itemId)).willReturn(Optional.of(item));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/items/{itemId}/can-resolve", itemId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.canResolve").value(true))
                .andExpect(jsonPath("$.status").value("MISSING"))
                .andExpect(jsonPath("$.resolved").value(false));
    }

    @Test
    @WithMockUser
    public void canResolveItem_alreadyResolved_shouldReturn200False() throws Exception {
        UUID itemId = UUID.randomUUID();

        Item item = new Item();
        item.setItemStatus(ItemStatus.MISSING);
        item.setResolved(true);

        given(itemRepository.findById(itemId)).willReturn(Optional.of(item));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/items/{itemId}/can-resolve", itemId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.canResolve").value(false))
                .andExpect(jsonPath("$.resolved").value(true));
    }

    @Test
    @WithMockUser
    public void canResolveItem_inWarehouseStatus_shouldReturn200False() throws Exception {
        UUID itemId = UUID.randomUUID();

        Item item = new Item();
        item.setItemStatus(ItemStatus.IN_WAREHOUSE);
        item.setResolved(false);

        given(itemRepository.findById(itemId)).willReturn(Optional.of(item));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/items/{itemId}/can-resolve", itemId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.canResolve").value(false));
    }

    @Test
    @WithMockUser
    public void canResolveItem_whenItemNotFound_shouldReturn400() throws Exception {
        UUID itemId = UUID.randomUUID();

        given(itemRepository.findById(itemId)).willReturn(Optional.empty());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/items/{itemId}/can-resolve", itemId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.canResolve").value(false))
                .andExpect(jsonPath("$.error").exists());
    }

    // ==================== GET /api/v1/items/warehouse/{warehouseId}/active ====================

    @Test
    @WithMockUser
    public void getActiveItems_shouldReturn200WithUnresolvedItems() throws Exception {
        UUID warehouseId = UUID.randomUUID();

        Item activeItem = new Item();
        activeItem.setItemStatus(ItemStatus.IN_WAREHOUSE);
        activeItem.setResolved(false);

        Item resolvedItem = new Item();
        resolvedItem.setItemStatus(ItemStatus.MISSING);
        resolvedItem.setResolved(true);

        given(itemService.getItemsByWarehouse(warehouseId)).willReturn(List.of(activeItem, resolvedItem));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/items/warehouse/{warehouseId}/active", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    public void getActiveItems_whenIllegalArgument_shouldReturn400() throws Exception {
        UUID warehouseId = UUID.randomUUID();

        given(itemService.getItemsByWarehouse(warehouseId))
                .willThrow(new IllegalArgumentException("Warehouse not found"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/items/warehouse/{warehouseId}/active", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }

    // ==================== GET /api/v1/items/warehouse/{warehouseId}/summary ====================

    @Test
    @WithMockUser
    public void getWarehouseSummary_shouldReturn200WithSummary() throws Exception {
        UUID warehouseId = UUID.randomUUID();

        Item inWarehouseItem = new Item();
        inWarehouseItem.setItemStatus(ItemStatus.IN_WAREHOUSE);
        inWarehouseItem.setResolved(false);

        Item missingItem = new Item();
        missingItem.setItemStatus(ItemStatus.MISSING);
        missingItem.setResolved(false);

        given(itemService.getItemsByWarehouse(warehouseId)).willReturn(List.of(inWarehouseItem, missingItem));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/items/warehouse/{warehouseId}/summary", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").exists())
                .andExpect(jsonPath("$.activeDiscrepancies").exists())
                .andExpect(jsonPath("$.resolvedDiscrepancies").exists())
                .andExpect(jsonPath("$.regularInventory").exists())
                .andExpect(jsonPath("$.needsAttention").exists());
    }

    @Test
    @WithMockUser
    public void getWarehouseSummary_whenIllegalArgument_shouldReturn400() throws Exception {
        UUID warehouseId = UUID.randomUUID();

        given(itemService.getItemsByWarehouse(warehouseId))
                .willThrow(new IllegalArgumentException("Warehouse not found"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/items/warehouse/{warehouseId}/summary", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }

    // ==================== GET /api/v1/items/resolution-history/warehouse/{warehouseId} ====================

    @Test
    @WithMockUser
    public void getResolutionHistoryByWarehouse_shouldReturn200WithList() throws Exception {
        UUID warehouseId = UUID.randomUUID();
        ItemResolution resolution = new ItemResolution();
        resolution.setId(UUID.randomUUID());
        resolution.setResolvedBy("admin");

        given(itemService.getResolutionHistoryByWarehouse(warehouseId)).willReturn(List.of(resolution));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/items/resolution-history/warehouse/{warehouseId}", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    public void getResolutionHistoryByWarehouse_whenIllegalArgument_shouldReturn404() throws Exception {
        UUID warehouseId = UUID.randomUUID();

        given(itemService.getResolutionHistoryByWarehouse(warehouseId))
                .willThrow(new IllegalArgumentException("Warehouse not found"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/items/resolution-history/warehouse/{warehouseId}", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
    public void getResolutionHistoryByWarehouse_whenUnexpectedException_shouldReturn500() throws Exception {
        UUID warehouseId = UUID.randomUUID();

        given(itemService.getResolutionHistoryByWarehouse(warehouseId))
                .willThrow(new RuntimeException("Unexpected error"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/items/resolution-history/warehouse/{warehouseId}", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/items/transaction-details/{warehouseId}/{itemTypeId} ====================

    @Test
    @WithMockUser
    public void getItemTransactionDetails_shouldReturn200WithList() throws Exception {
        UUID warehouseId = UUID.randomUUID();
        UUID itemTypeId = UUID.randomUUID();

        Item item = new Item();
        item.setItemStatus(ItemStatus.IN_WAREHOUSE);

        given(itemService.getItemTransactionDetails(warehouseId, itemTypeId)).willReturn(List.of(item));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/items/transaction-details/{warehouseId}/{itemTypeId}", warehouseId, itemTypeId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    public void getItemTransactionDetails_whenIllegalArgument_shouldReturn404() throws Exception {
        UUID warehouseId = UUID.randomUUID();
        UUID itemTypeId = UUID.randomUUID();

        given(itemService.getItemTransactionDetails(warehouseId, itemTypeId))
                .willThrow(new IllegalArgumentException("Not found"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/items/transaction-details/{warehouseId}/{itemTypeId}", warehouseId, itemTypeId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
    public void getItemTransactionDetails_whenUnexpectedException_shouldReturn500() throws Exception {
        UUID warehouseId = UUID.randomUUID();
        UUID itemTypeId = UUID.randomUUID();

        given(itemService.getItemTransactionDetails(warehouseId, itemTypeId))
                .willThrow(new RuntimeException("Unexpected error"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/items/transaction-details/{warehouseId}/{itemTypeId}", warehouseId, itemTypeId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }
}