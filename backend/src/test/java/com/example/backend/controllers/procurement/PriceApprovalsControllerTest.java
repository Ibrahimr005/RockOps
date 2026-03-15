package com.example.backend.controllers.procurement;

import com.example.backend.config.JwtService;
import com.example.backend.dto.finance.inventoryValuation.ApprovedItemHistoryDTO;
import com.example.backend.dto.finance.inventoryValuation.BulkPriceApprovalRequestDTO;
import com.example.backend.dto.finance.inventoryValuation.ItemPriceApprovalRequestDTO;
import com.example.backend.dto.finance.inventoryValuation.PendingItemApprovalDTO;
import com.example.backend.models.finance.inventoryValuation.ItemPriceApproval;
import com.example.backend.services.finance.inventoryValuation.InventoryValuationService;
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
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = PriceApprovalsController.class)
@AutoConfigureMockMvc(addFilters = false)
public class PriceApprovalsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private InventoryValuationService inventoryValuationService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    // ==================== GET /api/procurement/price-approvals/pending ====================

    @Test
    @WithMockUser
    public void getAllPendingApprovals_shouldReturn200WithList() throws Exception {
        UUID itemId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();

        PendingItemApprovalDTO dto = PendingItemApprovalDTO.builder()
                .itemId(itemId)
                .warehouseId(warehouseId)
                .warehouseName("Main Warehouse")
                .itemTypeName("Hydraulic Fluid")
                .quantity(50)
                .suggestedPrice(25.50)
                .build();

        given(inventoryValuationService.getAllPendingApprovals()).willReturn(List.of(dto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/procurement/price-approvals/pending")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].itemId").value(itemId.toString()))
                .andExpect(jsonPath("$[0].warehouseName").value("Main Warehouse"))
                .andExpect(jsonPath("$[0].itemTypeName").value("Hydraulic Fluid"));
    }

    @Test
    @WithMockUser
    public void getAllPendingApprovals_emptyList_shouldReturn200() throws Exception {
        given(inventoryValuationService.getAllPendingApprovals()).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/procurement/price-approvals/pending")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @WithMockUser
    public void getAllPendingApprovals_whenServiceThrows_shouldReturn500() throws Exception {
        given(inventoryValuationService.getAllPendingApprovals())
                .willThrow(new RuntimeException("Database connection failed"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/procurement/price-approvals/pending")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/procurement/price-approvals/pending/warehouse/{warehouseId} ====================

    @Test
    @WithMockUser
    public void getPendingApprovalsByWarehouse_shouldReturn200WithList() throws Exception {
        UUID warehouseId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        PendingItemApprovalDTO dto = PendingItemApprovalDTO.builder()
                .itemId(itemId)
                .warehouseId(warehouseId)
                .warehouseName("Site B Warehouse")
                .itemTypeName("Engine Oil")
                .quantity(30)
                .suggestedPrice(15.00)
                .build();

        given(inventoryValuationService.getPendingApprovalsByWarehouse(warehouseId)).willReturn(List.of(dto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/procurement/price-approvals/pending/warehouse/{warehouseId}", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].warehouseId").value(warehouseId.toString()))
                .andExpect(jsonPath("$[0].itemTypeName").value("Engine Oil"));
    }

    @Test
    @WithMockUser
    public void getPendingApprovalsByWarehouse_emptyList_shouldReturn200() throws Exception {
        UUID warehouseId = UUID.randomUUID();

        given(inventoryValuationService.getPendingApprovalsByWarehouse(warehouseId))
                .willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/procurement/price-approvals/pending/warehouse/{warehouseId}", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @WithMockUser
    public void getPendingApprovalsByWarehouse_whenWarehouseNotFound_shouldReturn404() throws Exception {
        UUID warehouseId = UUID.randomUUID();

        given(inventoryValuationService.getPendingApprovalsByWarehouse(warehouseId))
                .willThrow(new IllegalArgumentException("Warehouse not found"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/procurement/price-approvals/pending/warehouse/{warehouseId}", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
    public void getPendingApprovalsByWarehouse_whenServiceThrows_shouldReturn500() throws Exception {
        UUID warehouseId = UUID.randomUUID();

        given(inventoryValuationService.getPendingApprovalsByWarehouse(warehouseId))
                .willThrow(new RuntimeException("Unexpected error"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/procurement/price-approvals/pending/warehouse/{warehouseId}", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== POST /api/procurement/price-approvals/approve/{itemId} ====================

    @Test
    @WithMockUser(username = "finance.manager")
    public void approveItemPrice_shouldReturn200WithApproval() throws Exception {
        UUID itemId = UUID.randomUUID();

        ItemPriceApprovalRequestDTO requestDto = ItemPriceApprovalRequestDTO.builder()
                .itemId(itemId)
                .unitPrice(120.50)
                .build();

        ItemPriceApproval approval = ItemPriceApproval.builder()
                .id(UUID.randomUUID())
                .approvedPrice(120.50)
                .approvedBy("finance.manager")
                .build();

        given(inventoryValuationService.approveItemPrice(eq(itemId), anyDouble(), anyString()))
                .willReturn(approval);

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/procurement/price-approvals/approve/{itemId}", itemId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDto))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.approvedPrice").value(120.50))
                .andExpect(jsonPath("$.approvedBy").value("finance.manager"));
    }

    @Test
    @WithMockUser(username = "finance.manager")
    public void approveItemPrice_whenItemNotFound_shouldReturn400() throws Exception {
        UUID itemId = UUID.randomUUID();

        ItemPriceApprovalRequestDTO requestDto = ItemPriceApprovalRequestDTO.builder()
                .itemId(itemId)
                .unitPrice(50.00)
                .build();

        given(inventoryValuationService.approveItemPrice(eq(itemId), anyDouble(), anyString()))
                .willThrow(new IllegalArgumentException("Item not found"));

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/procurement/price-approvals/approve/{itemId}", itemId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDto))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "finance.manager")
    public void approveItemPrice_whenServiceThrows_shouldReturn500() throws Exception {
        UUID itemId = UUID.randomUUID();

        ItemPriceApprovalRequestDTO requestDto = ItemPriceApprovalRequestDTO.builder()
                .itemId(itemId)
                .unitPrice(75.00)
                .build();

        given(inventoryValuationService.approveItemPrice(eq(itemId), anyDouble(), anyString()))
                .willThrow(new RuntimeException("Unexpected database error"));

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/procurement/price-approvals/approve/{itemId}", itemId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDto))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== POST /api/procurement/price-approvals/approve/bulk ====================

    @Test
    @WithMockUser(username = "finance.manager")
    public void bulkApproveItemPrices_shouldReturn200WithApprovals() throws Exception {
        UUID itemId1 = UUID.randomUUID();
        UUID itemId2 = UUID.randomUUID();

        BulkPriceApprovalRequestDTO requestDto = BulkPriceApprovalRequestDTO.builder()
                .items(List.of(
                        ItemPriceApprovalRequestDTO.builder().itemId(itemId1).unitPrice(100.50).build(),
                        ItemPriceApprovalRequestDTO.builder().itemId(itemId2).unitPrice(200.75).build()
                ))
                .build();

        ItemPriceApproval approval1 = ItemPriceApproval.builder()
                .id(UUID.randomUUID())
                .approvedPrice(100.50)
                .approvedBy("finance.manager")
                .build();

        ItemPriceApproval approval2 = ItemPriceApproval.builder()
                .id(UUID.randomUUID())
                .approvedPrice(200.75)
                .approvedBy("finance.manager")
                .build();

        given(inventoryValuationService.bulkApproveItemPrices(any(BulkPriceApprovalRequestDTO.class), anyString()))
                .willReturn(List.of(approval1, approval2));

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/procurement/price-approvals/approve/bulk")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDto))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].approvedPrice").value(100.50))
                .andExpect(jsonPath("$[1].approvedPrice").value(200.75));
    }

    @Test
    @WithMockUser(username = "finance.manager")
    public void bulkApproveItemPrices_emptyItems_shouldReturn200() throws Exception {
        BulkPriceApprovalRequestDTO requestDto = BulkPriceApprovalRequestDTO.builder()
                .items(Collections.emptyList())
                .build();

        given(inventoryValuationService.bulkApproveItemPrices(any(BulkPriceApprovalRequestDTO.class), anyString()))
                .willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/procurement/price-approvals/approve/bulk")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDto))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @WithMockUser(username = "finance.manager")
    public void bulkApproveItemPrices_whenServiceThrows_shouldReturn500() throws Exception {
        BulkPriceApprovalRequestDTO requestDto = BulkPriceApprovalRequestDTO.builder()
                .items(List.of(
                        ItemPriceApprovalRequestDTO.builder().itemId(UUID.randomUUID()).unitPrice(50.00).build()
                ))
                .build();

        given(inventoryValuationService.bulkApproveItemPrices(any(BulkPriceApprovalRequestDTO.class), anyString()))
                .willThrow(new RuntimeException("Bulk approval failed"));

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/procurement/price-approvals/approve/bulk")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDto))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/procurement/price-approvals/history ====================

    @Test
    @WithMockUser
    public void getApprovalHistory_shouldReturn200WithList() throws Exception {
        ApprovedItemHistoryDTO historyDto = new ApprovedItemHistoryDTO();

        given(inventoryValuationService.getApprovalHistory()).willReturn(List.of(historyDto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/procurement/price-approvals/history")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    public void getApprovalHistory_emptyList_shouldReturn200() throws Exception {
        given(inventoryValuationService.getApprovalHistory()).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/procurement/price-approvals/history")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @WithMockUser
    public void getApprovalHistory_whenServiceThrows_shouldReturn500() throws Exception {
        given(inventoryValuationService.getApprovalHistory())
                .willThrow(new RuntimeException("Failed to fetch history"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/procurement/price-approvals/history")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }
}