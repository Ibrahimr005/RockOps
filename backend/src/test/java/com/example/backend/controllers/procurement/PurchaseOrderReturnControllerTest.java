package com.example.backend.controllers.procurement;

import com.example.backend.config.JwtService;
import com.example.backend.dto.procurement.PurchaseOrderReturn.CreatePurchaseOrderReturnDTO;
import com.example.backend.dto.procurement.PurchaseOrderReturn.PurchaseOrderReturnResponseDTO;
import com.example.backend.models.procurement.PurchaseOrderReturn.PurchaseOrderReturnStatus;
import com.example.backend.services.procurement.PurchaseOrderReturnService;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = PurchaseOrderReturnController.class)
@AutoConfigureMockMvc(addFilters = false)
public class PurchaseOrderReturnControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PurchaseOrderReturnService purchaseOrderReturnService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    private UUID returnId;
    private UUID purchaseOrderId;
    private PurchaseOrderReturnResponseDTO sampleReturn;
    private CreatePurchaseOrderReturnDTO createDTO;

    @BeforeEach
    void setUp() {
        objectMapper.registerModule(new JavaTimeModule());

        returnId = UUID.randomUUID();
        purchaseOrderId = UUID.randomUUID();

        CreatePurchaseOrderReturnDTO.ReturnItemRequest itemRequest =
                new CreatePurchaseOrderReturnDTO.ReturnItemRequest(
                        UUID.randomUUID(), 5.0, "Items arrived damaged"
                );

        createDTO = new CreatePurchaseOrderReturnDTO(
                "Damaged goods received from supplier",
                List.of(itemRequest)
        );

        sampleReturn = PurchaseOrderReturnResponseDTO.builder()
                .id(returnId)
                .returnId("RET-2026-00001")
                .purchaseOrderId(purchaseOrderId)
                .purchaseOrderNumber("PO-2026-00042")
                .merchantId(UUID.randomUUID())
                .merchantName("Acme Supplies Ltd")
                .totalReturnAmount(new BigDecimal("1250.00"))
                .status("PENDING")
                .reason("Damaged goods received from supplier")
                .requestedBy("procurement.manager")
                .requestedAt(LocalDateTime.of(2026, 3, 10, 9, 0))
                .createdAt(LocalDateTime.of(2026, 3, 10, 9, 0))
                .returnItems(Collections.emptyList())
                .build();
    }

    // ==================== POST /api/v1/purchase-order-returns/purchase-orders/{purchaseOrderId} ====================

    @Test
    @WithMockUser(username = "procurement.manager")
    void createPurchaseOrderReturn_validRequest_shouldReturn200WithSuccessResponse() throws Exception {
        willDoNothing().given(purchaseOrderReturnService)
                .createPurchaseOrderReturn(any(UUID.class), any(CreatePurchaseOrderReturnDTO.class), anyString());

        mockMvc.perform(post("/api/v1/purchase-order-returns/purchase-orders/{purchaseOrderId}",
                        purchaseOrderId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Purchase order return created successfully"));
    }

    @Test
    @WithMockUser(username = "procurement.manager")
    void createPurchaseOrderReturn_multipleItems_shouldReturn200() throws Exception {
        CreatePurchaseOrderReturnDTO.ReturnItemRequest item1 =
                new CreatePurchaseOrderReturnDTO.ReturnItemRequest(UUID.randomUUID(), 3.0, "Wrong item delivered");
        CreatePurchaseOrderReturnDTO.ReturnItemRequest item2 =
                new CreatePurchaseOrderReturnDTO.ReturnItemRequest(UUID.randomUUID(), 2.0, "Defective product");

        CreatePurchaseOrderReturnDTO multiItemDTO = new CreatePurchaseOrderReturnDTO(
                "Multiple issues with delivery", List.of(item1, item2)
        );

        willDoNothing().given(purchaseOrderReturnService)
                .createPurchaseOrderReturn(any(UUID.class), any(CreatePurchaseOrderReturnDTO.class), anyString());

        mockMvc.perform(post("/api/v1/purchase-order-returns/purchase-orders/{purchaseOrderId}",
                        purchaseOrderId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(multiItemDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    // ==================== GET /api/v1/purchase-order-returns ====================

    @Test
    @WithMockUser
    void getAllPurchaseOrderReturns_shouldReturn200WithList() throws Exception {
        given(purchaseOrderReturnService.getAllPurchaseOrderReturns())
                .willReturn(List.of(sampleReturn));

        mockMvc.perform(get("/api/v1/purchase-order-returns")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].returnId").value("RET-2026-00001"))
                .andExpect(jsonPath("$[0].purchaseOrderNumber").value("PO-2026-00042"))
                .andExpect(jsonPath("$[0].status").value("PENDING"));
    }

    @Test
    @WithMockUser
    void getAllPurchaseOrderReturns_emptyList_shouldReturn200WithEmptyArray() throws Exception {
        given(purchaseOrderReturnService.getAllPurchaseOrderReturns())
                .willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/purchase-order-returns")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/v1/purchase-order-returns/status/{status} ====================

    @Test
    @WithMockUser
    void getPurchaseOrderReturnsByStatus_pendingStatus_shouldReturn200WithList() throws Exception {
        given(purchaseOrderReturnService.getPurchaseOrderReturnsByStatus(PurchaseOrderReturnStatus.PENDING))
                .willReturn(List.of(sampleReturn));

        mockMvc.perform(get("/api/v1/purchase-order-returns/status/{status}", "PENDING")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].returnId").value("RET-2026-00001"))
                .andExpect(jsonPath("$[0].status").value("PENDING"));
    }

    @Test
    @WithMockUser
    void getPurchaseOrderReturnsByStatus_confirmedStatus_shouldReturn200WithList() throws Exception {
        PurchaseOrderReturnResponseDTO confirmedReturn = PurchaseOrderReturnResponseDTO.builder()
                .id(UUID.randomUUID())
                .returnId("RET-2026-00002")
                .status("CONFIRMED")
                .reason("Items confirmed as defective")
                .build();

        given(purchaseOrderReturnService.getPurchaseOrderReturnsByStatus(PurchaseOrderReturnStatus.CONFIRMED))
                .willReturn(List.of(confirmedReturn));

        mockMvc.perform(get("/api/v1/purchase-order-returns/status/{status}", "CONFIRMED")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].returnId").value("RET-2026-00002"))
                .andExpect(jsonPath("$[0].status").value("CONFIRMED"));
    }

    @Test
    @WithMockUser
    void getPurchaseOrderReturnsByStatus_rejectedStatus_shouldReturn200WithList() throws Exception {
        PurchaseOrderReturnResponseDTO rejectedReturn = PurchaseOrderReturnResponseDTO.builder()
                .id(UUID.randomUUID())
                .returnId("RET-2026-00003")
                .status("REJECTED")
                .rejectedBy("approver.user")
                .rejectionReason("Return not justified per contract terms")
                .build();

        given(purchaseOrderReturnService.getPurchaseOrderReturnsByStatus(PurchaseOrderReturnStatus.REJECTED))
                .willReturn(List.of(rejectedReturn));

        mockMvc.perform(get("/api/v1/purchase-order-returns/status/{status}", "REJECTED")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].status").value("REJECTED"));
    }

    @Test
    @WithMockUser
    void getPurchaseOrderReturnsByStatus_noMatchingReturns_shouldReturn200WithEmptyList() throws Exception {
        given(purchaseOrderReturnService.getPurchaseOrderReturnsByStatus(PurchaseOrderReturnStatus.CONFIRMED))
                .willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/purchase-order-returns/status/{status}", "CONFIRMED")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @WithMockUser
    void getPurchaseOrderReturnsByStatus_lowercaseStatus_shouldReturn200() throws Exception {
        given(purchaseOrderReturnService.getPurchaseOrderReturnsByStatus(PurchaseOrderReturnStatus.PENDING))
                .willReturn(List.of(sampleReturn));

        mockMvc.perform(get("/api/v1/purchase-order-returns/status/{status}", "pending")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].returnId").value("RET-2026-00001"));
    }

    // ==================== GET /api/v1/purchase-order-returns/{id} ====================

    @Test
    @WithMockUser
    void getPurchaseOrderReturnById_existingId_shouldReturn200() throws Exception {
        given(purchaseOrderReturnService.getPurchaseOrderReturnById(returnId))
                .willReturn(sampleReturn);

        mockMvc.perform(get("/api/v1/purchase-order-returns/{id}", returnId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(returnId.toString()))
                .andExpect(jsonPath("$.returnId").value("RET-2026-00001"))
                .andExpect(jsonPath("$.merchantName").value("Acme Supplies Ltd"))
                .andExpect(jsonPath("$.totalReturnAmount").value(1250.00));
    }

    @Test
    @WithMockUser
    void getPurchaseOrderReturnById_withApprovalFields_shouldReturn200() throws Exception {
        PurchaseOrderReturnResponseDTO approvedReturn = PurchaseOrderReturnResponseDTO.builder()
                .id(returnId)
                .returnId("RET-2026-00001")
                .purchaseOrderId(purchaseOrderId)
                .status("CONFIRMED")
                .approvedBy("finance.manager")
                .approvedAt(LocalDateTime.of(2026, 3, 12, 10, 30))
                .build();

        given(purchaseOrderReturnService.getPurchaseOrderReturnById(returnId))
                .willReturn(approvedReturn);

        mockMvc.perform(get("/api/v1/purchase-order-returns/{id}", returnId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(returnId.toString()))
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.approvedBy").value("finance.manager"));
    }
}