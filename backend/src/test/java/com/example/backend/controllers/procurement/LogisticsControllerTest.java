package com.example.backend.controllers.procurement;

import com.example.backend.config.JwtService;
import com.example.backend.dto.procurement.Logistics.CreateLogisticsDTO;
import com.example.backend.dto.procurement.Logistics.CreateLogisticsForReturnDTO;
import com.example.backend.dto.procurement.Logistics.LogisticsListDTO;
import com.example.backend.dto.procurement.Logistics.LogisticsResponseDTO;
import com.example.backend.dto.procurement.Logistics.POLogisticsDTO;
import com.example.backend.dto.procurement.Logistics.POReturnLogisticsDTO;
import com.example.backend.models.procurement.Logistics.LogisticsStatus;
import com.example.backend.services.procurement.LogisticsService;
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
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = LogisticsController.class)
@AutoConfigureMockMvc(addFilters = false)
public class LogisticsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private LogisticsService logisticsService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    private UUID logisticsId;
    private UUID purchaseOrderId;
    private UUID purchaseOrderReturnId;
    private LogisticsResponseDTO logisticsResponse;
    private LogisticsListDTO logisticsListItem;
    private CreateLogisticsDTO createLogisticsDTO;
    private CreateLogisticsForReturnDTO createLogisticsForReturnDTO;

    @BeforeEach
    void setUp() {
        objectMapper.registerModule(new JavaTimeModule());

        logisticsId = UUID.randomUUID();
        purchaseOrderId = UUID.randomUUID();
        purchaseOrderReturnId = UUID.randomUUID();

        logisticsResponse = LogisticsResponseDTO.builder()
                .id(logisticsId)
                .logisticsNumber("LOG-2026-00001")
                .merchantId(UUID.randomUUID())
                .merchantName("Fast Freight Co")
                .totalCost(new BigDecimal("1500.00"))
                .currency("USD")
                .carrierCompany("Acme Carriers")
                .driverName("John Driver")
                .driverPhone("+1-555-0001")
                .status(LogisticsStatus.PENDING_APPROVAL)
                .build();

        logisticsListItem = LogisticsListDTO.builder()
                .id(logisticsId)
                .logisticsNumber("LOG-2026-00001")
                .merchantName("Fast Freight Co")
                .carrierCompany("Acme Carriers")
                .totalCost(new BigDecimal("1500.00"))
                .currency("USD")
                .status(LogisticsStatus.PENDING_APPROVAL)
                .build();

        CreateLogisticsDTO.LogisticsPurchaseOrderDTO poRef =
                CreateLogisticsDTO.LogisticsPurchaseOrderDTO.builder()
                        .purchaseOrderId(purchaseOrderId)
                        .selectedItemIds(List.of(UUID.randomUUID()))
                        .build();

        createLogisticsDTO = CreateLogisticsDTO.builder()
                .merchantId(UUID.randomUUID())
                .totalCost(new BigDecimal("1500.00"))
                .currency("USD")
                .carrierCompany("Acme Carriers")
                .driverName("John Driver")
                .driverPhone("+1-555-0001")
                .notes("Handle with care")
                .purchaseOrders(List.of(poRef))
                .build();

        CreateLogisticsForReturnDTO returnDTO = new CreateLogisticsForReturnDTO();
        returnDTO.setMerchantId(UUID.randomUUID());
        returnDTO.setTotalCost(new BigDecimal("500.00"));
        returnDTO.setCurrency("USD");
        returnDTO.setCarrierCompany("Return Express");
        returnDTO.setDriverName("Jane Driver");
        returnDTO.setDriverPhone("+1-555-0002");
        returnDTO.setNotes("Return shipment");
        CreateLogisticsForReturnDTO.LogisticsPurchaseOrderReturnDTO returnRef =
                new CreateLogisticsForReturnDTO.LogisticsPurchaseOrderReturnDTO();
        returnRef.setPurchaseOrderReturnId(purchaseOrderReturnId);
        returnRef.setSelectedItemIds(List.of(UUID.randomUUID()));
        returnDTO.setPurchaseOrderReturns(List.of(returnRef));
        createLogisticsForReturnDTO = returnDTO;
    }

    // ==================== POST /api/procurement/logistics ====================

    @Test
    @WithMockUser(username = "logistics.manager")
    void createLogistics_validRequest_shouldReturn201() throws Exception {
        given(logisticsService.createLogistics(
                any(CreateLogisticsDTO.class), any(UUID.class), anyString()))
                .willReturn(logisticsResponse);

        mockMvc.perform(post("/api/procurement/logistics")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createLogisticsDTO)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.logisticsNumber").value("LOG-2026-00001"))
                .andExpect(jsonPath("$.merchantName").value("Fast Freight Co"));
    }

    @Test
    @WithMockUser(username = "logistics.manager")
    void createLogistics_serviceThrowsException_shouldReturn400WithErrorMessage() throws Exception {
        given(logisticsService.createLogistics(
                any(CreateLogisticsDTO.class), any(UUID.class), anyString()))
                .willThrow(new RuntimeException("Purchase order not found"));

        mockMvc.perform(post("/api/procurement/logistics")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createLogisticsDTO)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Purchase order not found"));
    }

    // ==================== GET /api/procurement/logistics/purchase-order/{purchaseOrderId} ====================

    @Test
    @WithMockUser
    void getLogisticsByPurchaseOrder_existingPO_shouldReturn200WithList() throws Exception {
        POLogisticsDTO poLogisticsDTO = POLogisticsDTO.builder()
                .logisticsId(logisticsId)
                .logisticsNumber("LOG-2026-00001")
                .merchantName("Fast Freight Co")
                .totalLogisticsCost(new BigDecimal("1500.00"))
                .status(LogisticsStatus.PENDING_APPROVAL)
                .build();

        given(logisticsService.getLogisticsByPurchaseOrder(purchaseOrderId))
                .willReturn(List.of(poLogisticsDTO));

        mockMvc.perform(get("/api/procurement/logistics/purchase-order/{purchaseOrderId}", purchaseOrderId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].logisticsNumber").value("LOG-2026-00001"));
    }

    @Test
    @WithMockUser
    void getLogisticsByPurchaseOrder_noResults_shouldReturn200WithEmptyList() throws Exception {
        given(logisticsService.getLogisticsByPurchaseOrder(purchaseOrderId))
                .willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/procurement/logistics/purchase-order/{purchaseOrderId}", purchaseOrderId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @WithMockUser
    void getLogisticsByPurchaseOrder_serviceThrowsException_shouldReturn500() throws Exception {
        given(logisticsService.getLogisticsByPurchaseOrder(purchaseOrderId))
                .willThrow(new RuntimeException("Database error"));

        mockMvc.perform(get("/api/procurement/logistics/purchase-order/{purchaseOrderId}", purchaseOrderId))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Database error"));
    }

    // ==================== GET /api/procurement/logistics/purchase-order/{purchaseOrderId}/total-cost ====================

    @Test
    @WithMockUser
    void getTotalLogisticsCostForPO_existingPO_shouldReturn200WithCost() throws Exception {
        given(logisticsService.getTotalLogisticsCostForPO(purchaseOrderId))
                .willReturn(new BigDecimal("1500.00"));

        mockMvc.perform(get("/api/procurement/logistics/purchase-order/{purchaseOrderId}/total-cost",
                        purchaseOrderId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.purchaseOrderId").value(purchaseOrderId.toString()))
                .andExpect(jsonPath("$.totalLogisticsCost").value(1500.00));
    }

    @Test
    @WithMockUser
    void getTotalLogisticsCostForPO_serviceThrowsException_shouldReturn500() throws Exception {
        given(logisticsService.getTotalLogisticsCostForPO(purchaseOrderId))
                .willThrow(new RuntimeException("Failed to compute total cost"));

        mockMvc.perform(get("/api/procurement/logistics/purchase-order/{purchaseOrderId}/total-cost",
                        purchaseOrderId))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Failed to compute total cost"));
    }

    // ==================== POST /api/procurement/logistics/returns ====================

    @Test
    @WithMockUser(username = "logistics.manager")
    void createLogisticsForReturn_validRequest_shouldReturn201() throws Exception {
        given(logisticsService.createLogisticsForReturn(
                any(CreateLogisticsForReturnDTO.class), any(UUID.class), anyString()))
                .willReturn(logisticsResponse);

        mockMvc.perform(post("/api/procurement/logistics/returns")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createLogisticsForReturnDTO)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.logisticsNumber").value("LOG-2026-00001"));
    }

    @Test
    @WithMockUser(username = "logistics.manager")
    void createLogisticsForReturn_serviceThrowsException_shouldReturn400WithErrorMessage() throws Exception {
        given(logisticsService.createLogisticsForReturn(
                any(CreateLogisticsForReturnDTO.class), any(UUID.class), anyString()))
                .willThrow(new RuntimeException("Return order not found"));

        mockMvc.perform(post("/api/procurement/logistics/returns")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createLogisticsForReturnDTO)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Return order not found"));
    }

    // ==================== GET /api/procurement/logistics/purchase-order-return/{purchaseOrderReturnId} ====================

    @Test
    @WithMockUser
    void getLogisticsByPurchaseOrderReturn_existingReturn_shouldReturn200WithList() throws Exception {
        POReturnLogisticsDTO returnLogisticsDTO = POReturnLogisticsDTO.builder()
                .logisticsId(logisticsId)
                .logisticsNumber("LOG-2026-00002")
                .merchantName("Return Express")
                .totalLogisticsCost(new BigDecimal("500.00"))
                .status(LogisticsStatus.PENDING_APPROVAL)
                .build();

        given(logisticsService.getLogisticsByPurchaseOrderReturn(purchaseOrderReturnId))
                .willReturn(List.of(returnLogisticsDTO));

        mockMvc.perform(get("/api/procurement/logistics/purchase-order-return/{purchaseOrderReturnId}",
                        purchaseOrderReturnId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].logisticsNumber").value("LOG-2026-00002"));
    }

    @Test
    @WithMockUser
    void getLogisticsByPurchaseOrderReturn_serviceThrowsException_shouldReturn500() throws Exception {
        given(logisticsService.getLogisticsByPurchaseOrderReturn(purchaseOrderReturnId))
                .willThrow(new RuntimeException("Return record not found"));

        mockMvc.perform(get("/api/procurement/logistics/purchase-order-return/{purchaseOrderReturnId}",
                        purchaseOrderReturnId))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Return record not found"));
    }

    // ==================== GET /api/procurement/logistics/purchase-order-return/{purchaseOrderReturnId}/total-cost ====================

    @Test
    @WithMockUser
    void getTotalLogisticsCostForPOReturn_existingReturn_shouldReturn200WithCost() throws Exception {
        given(logisticsService.getTotalLogisticsCostForPOReturn(purchaseOrderReturnId))
                .willReturn(new BigDecimal("500.00"));

        mockMvc.perform(get("/api/procurement/logistics/purchase-order-return/{purchaseOrderReturnId}/total-cost",
                        purchaseOrderReturnId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.purchaseOrderReturnId").value(purchaseOrderReturnId.toString()))
                .andExpect(jsonPath("$.totalLogisticsCost").value(500.00));
    }

    @Test
    @WithMockUser
    void getTotalLogisticsCostForPOReturn_serviceThrowsException_shouldReturn500() throws Exception {
        given(logisticsService.getTotalLogisticsCostForPOReturn(purchaseOrderReturnId))
                .willThrow(new RuntimeException("Cannot compute cost for return"));

        mockMvc.perform(get("/api/procurement/logistics/purchase-order-return/{purchaseOrderReturnId}/total-cost",
                        purchaseOrderReturnId))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Cannot compute cost for return"));
    }

    // ==================== GET /api/procurement/logistics/{id} ====================

    @Test
    @WithMockUser
    void getLogisticsById_existingId_shouldReturn200() throws Exception {
        given(logisticsService.getLogisticsById(logisticsId)).willReturn(logisticsResponse);

        mockMvc.perform(get("/api/procurement/logistics/{id}", logisticsId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(logisticsId.toString()))
                .andExpect(jsonPath("$.logisticsNumber").value("LOG-2026-00001"))
                .andExpect(jsonPath("$.currency").value("USD"));
    }

    @Test
    @WithMockUser
    void getLogisticsById_notFound_shouldReturn404WithErrorMessage() throws Exception {
        given(logisticsService.getLogisticsById(logisticsId))
                .willThrow(new RuntimeException("Logistics record not found"));

        mockMvc.perform(get("/api/procurement/logistics/{id}", logisticsId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Logistics record not found"));
    }

    // ==================== GET /api/procurement/logistics ====================

    @Test
    @WithMockUser
    void getAllLogistics_shouldReturn200WithList() throws Exception {
        given(logisticsService.getAllLogistics()).willReturn(List.of(logisticsListItem));

        mockMvc.perform(get("/api/procurement/logistics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].logisticsNumber").value("LOG-2026-00001"));
    }

    @Test
    @WithMockUser
    void getAllLogistics_emptyList_shouldReturn200() throws Exception {
        given(logisticsService.getAllLogistics()).willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/procurement/logistics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @WithMockUser
    void getAllLogistics_serviceThrowsException_shouldReturn500() throws Exception {
        given(logisticsService.getAllLogistics()).willThrow(new RuntimeException("Database unavailable"));

        mockMvc.perform(get("/api/procurement/logistics"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Database unavailable"));
    }

    // ==================== GET /api/procurement/logistics/pending-approval ====================

    @Test
    @WithMockUser
    void getPendingApprovalLogistics_shouldReturn200WithList() throws Exception {
        given(logisticsService.getPendingApprovalLogistics()).willReturn(List.of(logisticsListItem));

        mockMvc.perform(get("/api/procurement/logistics/pending-approval"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].status").value("PENDING_APPROVAL"));
    }

    @Test
    @WithMockUser
    void getPendingApprovalLogistics_serviceThrowsException_shouldReturn500() throws Exception {
        given(logisticsService.getPendingApprovalLogistics())
                .willThrow(new RuntimeException("Failed to load pending approvals"));

        mockMvc.perform(get("/api/procurement/logistics/pending-approval"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Failed to load pending approvals"));
    }

    // ==================== GET /api/procurement/logistics/pending-payment ====================

    @Test
    @WithMockUser
    void getPendingPaymentLogistics_shouldReturn200WithList() throws Exception {
        given(logisticsService.getPendingPaymentLogistics()).willReturn(List.of(logisticsListItem));

        mockMvc.perform(get("/api/procurement/logistics/pending-payment"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].logisticsNumber").value("LOG-2026-00001"));
    }

    @Test
    @WithMockUser
    void getPendingPaymentLogistics_emptyList_shouldReturn200() throws Exception {
        given(logisticsService.getPendingPaymentLogistics()).willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/procurement/logistics/pending-payment"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== GET /api/procurement/logistics/completed ====================

    @Test
    @WithMockUser
    void getCompletedLogistics_shouldReturn200WithList() throws Exception {
        LogisticsListDTO completedItem = LogisticsListDTO.builder()
                .id(UUID.randomUUID())
                .logisticsNumber("LOG-2026-00010")
                .status(LogisticsStatus.COMPLETED)
                .build();

        given(logisticsService.getCompletedLogistics()).willReturn(List.of(completedItem));

        mockMvc.perform(get("/api/procurement/logistics/completed"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].status").value("COMPLETED"));
    }

    @Test
    @WithMockUser
    void getCompletedLogistics_emptyList_shouldReturn200() throws Exception {
        given(logisticsService.getCompletedLogistics()).willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/procurement/logistics/completed"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ==================== PUT /api/procurement/logistics/{id} ====================

    @Test
    @WithMockUser(username = "logistics.manager")
    void updateLogistics_validRequest_shouldReturn200() throws Exception {
        given(logisticsService.updateLogistics(any(UUID.class), any(CreateLogisticsDTO.class), anyString()))
                .willReturn(logisticsResponse);

        mockMvc.perform(put("/api/procurement/logistics/{id}", logisticsId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createLogisticsDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.logisticsNumber").value("LOG-2026-00001"))
                .andExpect(jsonPath("$.carrierCompany").value("Acme Carriers"));
    }

    @Test
    @WithMockUser(username = "logistics.manager")
    void updateLogistics_serviceThrowsException_shouldReturn400WithErrorMessage() throws Exception {
        given(logisticsService.updateLogistics(any(UUID.class), any(CreateLogisticsDTO.class), anyString()))
                .willThrow(new RuntimeException("Logistics already approved, cannot update"));

        mockMvc.perform(put("/api/procurement/logistics/{id}", logisticsId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createLogisticsDTO)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Logistics already approved, cannot update"));
    }

    // ==================== DELETE /api/procurement/logistics/{id} ====================

    @Test
    @WithMockUser(username = "logistics.manager")
    void deleteLogistics_existingId_shouldReturn200WithSuccessMessage() throws Exception {
        willDoNothing().given(logisticsService).deleteLogistics(logisticsId);

        mockMvc.perform(delete("/api/procurement/logistics/{id}", logisticsId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Logistics deleted successfully"));
    }

    @Test
    @WithMockUser(username = "logistics.manager")
    void deleteLogistics_notFound_shouldReturn400WithErrorMessage() throws Exception {
        willThrow(new RuntimeException("Logistics record not found"))
                .given(logisticsService).deleteLogistics(logisticsId);

        mockMvc.perform(delete("/api/procurement/logistics/{id}", logisticsId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Logistics record not found"));
    }

    @Test
    @WithMockUser(username = "logistics.manager")
    void deleteLogistics_alreadyApproved_shouldReturn400WithErrorMessage() throws Exception {
        willThrow(new RuntimeException("Cannot delete approved logistics"))
                .given(logisticsService).deleteLogistics(logisticsId);

        mockMvc.perform(delete("/api/procurement/logistics/{id}", logisticsId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Cannot delete approved logistics"));
    }

    // ==================== GET /api/procurement/logistics/purchase-order/{purchaseOrderId}/returns ====================

    @Test
    @WithMockUser
    void getReturnLogisticsByPurchaseOrder_existingPO_shouldReturn200WithList() throws Exception {
        POReturnLogisticsDTO returnLogisticsDTO = POReturnLogisticsDTO.builder()
                .logisticsId(logisticsId)
                .logisticsNumber("LOG-2026-00003")
                .merchantName("Return Express")
                .status(LogisticsStatus.PENDING_APPROVAL)
                .build();

        given(logisticsService.getReturnLogisticsByPurchaseOrder(purchaseOrderId))
                .willReturn(List.of(returnLogisticsDTO));

        mockMvc.perform(get("/api/procurement/logistics/purchase-order/{purchaseOrderId}/returns",
                        purchaseOrderId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].logisticsNumber").value("LOG-2026-00003"));
    }

    @Test
    @WithMockUser
    void getReturnLogisticsByPurchaseOrder_noResults_shouldReturn200WithEmptyList() throws Exception {
        given(logisticsService.getReturnLogisticsByPurchaseOrder(purchaseOrderId))
                .willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/procurement/logistics/purchase-order/{purchaseOrderId}/returns",
                        purchaseOrderId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @WithMockUser
    void getReturnLogisticsByPurchaseOrder_serviceThrowsException_shouldReturn500() throws Exception {
        given(logisticsService.getReturnLogisticsByPurchaseOrder(purchaseOrderId))
                .willThrow(new RuntimeException("Failed to load return logistics"));

        mockMvc.perform(get("/api/procurement/logistics/purchase-order/{purchaseOrderId}/returns",
                        purchaseOrderId))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Failed to load return logistics"));
    }
}