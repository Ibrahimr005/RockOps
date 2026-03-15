package com.example.backend.controllers.procurement;

import com.example.backend.config.JwtService;
import com.example.backend.dto.procurement.*;
import com.example.backend.dto.procurement.PurchaseOrder.PurchaseOrderDTO;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.procurement.Offer.Offer;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrder;
import com.example.backend.services.equipment.EquipmentService;
import com.example.backend.services.finance.accountsPayable.PaymentRequestService;
import com.example.backend.services.procurement.DeliveryProcessingService;
import com.example.backend.services.procurement.IssueResolutionService;
import com.example.backend.services.procurement.PurchaseOrderService;
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

import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = PurchaseOrderController.class)
@AutoConfigureMockMvc(addFilters = false)
public class PurchaseOrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PurchaseOrderService purchaseOrderService;

    @MockBean
    private DeliveryProcessingService deliveryProcessingService;

    @MockBean
    private IssueResolutionService issueResolutionService;

    @MockBean
    private PaymentRequestService paymentRequestService;

    @MockBean
    private EquipmentService equipmentService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    // ==================== GET /api/v1/purchaseOrders/pending-offers ====================

    @Test
    @WithMockUser
    public void getPendingOffers_happyPath_shouldReturn200WithList() throws Exception {
        Offer offer = new Offer();
        given(purchaseOrderService.getOffersPendingFinanceReview()).willReturn(List.of(offer));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/purchaseOrders/pending-offers")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    public void getPendingOffers_emptyList_shouldReturn200() throws Exception {
        given(purchaseOrderService.getOffersPendingFinanceReview()).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/purchaseOrders/pending-offers")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @WithMockUser
    public void getPendingOffers_whenException_shouldReturn500() throws Exception {
        given(purchaseOrderService.getOffersPendingFinanceReview())
                .willThrow(new RuntimeException("DB failure"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/purchaseOrders/pending-offers")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/purchaseOrders/offers/{offerId}/purchase-order ====================

    @Test
    @WithMockUser
    public void getPurchaseOrderForOffer_happyPath_shouldReturn200() throws Exception {
        UUID offerId = UUID.randomUUID();
        PurchaseOrder po = new PurchaseOrder();
        given(purchaseOrderService.getPurchaseOrderByOffer(offerId)).willReturn(po);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/purchaseOrders/offers/{offerId}/purchase-order", offerId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    public void getPurchaseOrderForOffer_whenNull_shouldReturn204() throws Exception {
        UUID offerId = UUID.randomUUID();
        given(purchaseOrderService.getPurchaseOrderByOffer(offerId)).willReturn(null);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/purchaseOrders/offers/{offerId}/purchase-order", offerId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser
    public void getPurchaseOrderForOffer_whenException_shouldReturn500() throws Exception {
        UUID offerId = UUID.randomUUID();
        given(purchaseOrderService.getPurchaseOrderByOffer(offerId))
                .willThrow(new RuntimeException("Offer not found"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/purchaseOrders/offers/{offerId}/purchase-order", offerId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/purchaseOrders ====================

    @Test
    @WithMockUser
    public void getAllPurchaseOrders_happyPath_shouldReturn200WithList() throws Exception {
        PurchaseOrderDTO dto = PurchaseOrderDTO.builder()
                .id(UUID.randomUUID())
                .poNumber("PO-2026-001")
                .build();
        given(purchaseOrderService.getAllPurchaseOrderDTOs()).willReturn(List.of(dto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/purchaseOrders")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].poNumber").value("PO-2026-001"));
    }

    @Test
    @WithMockUser
    public void getAllPurchaseOrders_emptyList_shouldReturn200() throws Exception {
        given(purchaseOrderService.getAllPurchaseOrderDTOs()).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/purchaseOrders")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @WithMockUser
    public void getAllPurchaseOrders_whenException_shouldReturn500() throws Exception {
        given(purchaseOrderService.getAllPurchaseOrderDTOs())
                .willThrow(new RuntimeException("DB error"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/purchaseOrders")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/purchaseOrders/{id} ====================

    @Test
    @WithMockUser
    public void getPurchaseOrderById_happyPath_shouldReturn200() throws Exception {
        UUID id = UUID.randomUUID();
        PurchaseOrder po = new PurchaseOrder();
        given(purchaseOrderService.getPurchaseOrderById(id)).willReturn(po);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/purchaseOrders/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    public void getPurchaseOrderById_whenException_shouldReturn404() throws Exception {
        UUID id = UUID.randomUUID();
        given(purchaseOrderService.getPurchaseOrderById(id))
                .willThrow(new RuntimeException("Not found"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/purchaseOrders/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    // ==================== GET /api/v1/purchaseOrders/{id}/with-deliveries ====================

    @Test
    @WithMockUser
    public void getPurchaseOrderWithDeliveries_happyPath_shouldReturn200() throws Exception {
        UUID id = UUID.randomUUID();
        PurchaseOrderDTO dto = PurchaseOrderDTO.builder()
                .id(id)
                .poNumber("PO-2026-002")
                .build();
        given(purchaseOrderService.getPurchaseOrderWithDeliveries(id)).willReturn(dto);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/purchaseOrders/{id}/with-deliveries", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.poNumber").value("PO-2026-002"));
    }

    @Test
    @WithMockUser
    public void getPurchaseOrderWithDeliveries_whenException_shouldReturn500() throws Exception {
        UUID id = UUID.randomUUID();
        given(purchaseOrderService.getPurchaseOrderWithDeliveries(id))
                .willThrow(new RuntimeException("DB error"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/purchaseOrders/{id}/with-deliveries", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== PUT /api/v1/purchaseOrders/{id}/status ====================

    @Test
    @WithMockUser(username = "po_manager")
    public void updatePurchaseOrderStatus_happyPath_shouldReturn200() throws Exception {
        UUID id = UUID.randomUUID();
        PurchaseOrder updatedPo = new PurchaseOrder();
        given(purchaseOrderService.updatePurchaseOrderStatus(eq(id), eq("APPROVED"), eq("po_manager")))
                .willReturn(updatedPo);

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/v1/purchaseOrders/{id}/status", id)
                        .param("status", "APPROVED")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "po_manager")
    public void updatePurchaseOrderStatus_whenException_shouldReturn500() throws Exception {
        UUID id = UUID.randomUUID();
        given(purchaseOrderService.updatePurchaseOrderStatus(any(), anyString(), anyString()))
                .willThrow(new RuntimeException("PO not found"));

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/v1/purchaseOrders/{id}/status", id)
                        .param("status", "APPROVED")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== POST /api/v1/purchaseOrders/offers/{offerId}/finalize ====================

    @Test
    @WithMockUser(username = "proc_user")
    public void finalizeOffer_happyPath_shouldReturn200WithPoDetails() throws Exception {
        UUID offerId = UUID.randomUUID();
        UUID poId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        PurchaseOrder po = new PurchaseOrder();
        po.setId(poId);
        po.setPoNumber("PO-2026-003");
        po.setTotalAmount(5000.0);
        po.setCurrency("USD");

        given(purchaseOrderService.finalizeOfferAndCreatePurchaseOrder(eq(offerId), anyList(), eq("proc_user")))
                .willReturn(po);

        Map<String, Object> body = new HashMap<>();
        body.put("finalizedItemIds", List.of(itemId.toString()));

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/purchaseOrders/offers/{offerId}/finalize", offerId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.purchaseOrderNumber").value("PO-2026-003"))
                .andExpect(jsonPath("$.currency").value("USD"));
    }

    @Test
    @WithMockUser(username = "proc_user")
    public void finalizeOffer_missingFinalizedItemIds_shouldReturn400() throws Exception {
        UUID offerId = UUID.randomUUID();

        Map<String, Object> body = new HashMap<>();
        // finalizedItemIds intentionally absent

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/purchaseOrders/offers/{offerId}/finalize", offerId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("No finalized items provided"))
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @WithMockUser(username = "proc_user")
    public void finalizeOffer_whenIllegalArgumentException_shouldReturn400() throws Exception {
        UUID offerId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        given(purchaseOrderService.finalizeOfferAndCreatePurchaseOrder(any(), anyList(), anyString()))
                .willThrow(new IllegalArgumentException("Invalid UUID format"));

        Map<String, Object> body = new HashMap<>();
        body.put("finalizedItemIds", List.of(itemId.toString()));

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/purchaseOrders/offers/{offerId}/finalize", offerId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @WithMockUser(username = "proc_user")
    public void finalizeOffer_whenException_shouldReturn500() throws Exception {
        UUID offerId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        given(purchaseOrderService.finalizeOfferAndCreatePurchaseOrder(any(), anyList(), anyString()))
                .willThrow(new RuntimeException("Unexpected server error"));

        Map<String, Object> body = new HashMap<>();
        body.put("finalizedItemIds", List.of(itemId.toString()));

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/purchaseOrders/offers/{offerId}/finalize", offerId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ==================== POST /api/v1/purchaseOrders/{id}/process-delivery ====================

    @Test
    @WithMockUser(username = "warehouse_user")
    public void processDelivery_happyPath_shouldReturn200() throws Exception {
        UUID poId = UUID.randomUUID();
        UUID merchantId = UUID.randomUUID();

        ProcessDeliveryRequest request = new ProcessDeliveryRequest();
        request.setPurchaseOrderId(poId);
        request.setMerchantId(merchantId);
        request.setProcessedBy("warehouse_user");
        request.setItemReceipts(Collections.emptyList());

        DeliverySessionDTO sessionDto = DeliverySessionDTO.builder()
                .id(UUID.randomUUID())
                .purchaseOrderId(poId)
                .merchantId(merchantId)
                .processedBy("warehouse_user")
                .build();

        given(deliveryProcessingService.processDelivery(any(ProcessDeliveryRequest.class))).willReturn(sessionDto);

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/purchaseOrders/{id}/process-delivery", poId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.purchaseOrderId").value(poId.toString()));
    }

    @Test
    @WithMockUser(username = "warehouse_user")
    public void processDelivery_whenException_shouldReturn500() throws Exception {
        UUID poId = UUID.randomUUID();

        ProcessDeliveryRequest request = new ProcessDeliveryRequest();
        request.setPurchaseOrderId(poId);

        given(deliveryProcessingService.processDelivery(any(ProcessDeliveryRequest.class)))
                .willThrow(new RuntimeException("Delivery processing failed"));

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/purchaseOrders/{id}/process-delivery", poId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ==================== POST /api/v1/purchaseOrders/{id}/resolve-issues ====================

    @Test
    @WithMockUser
    public void resolveIssues_happyPath_shouldReturn200() throws Exception {
        UUID poId = UUID.randomUUID();

        willDoNothing().given(issueResolutionService).resolveIssues(anyList(), anyString());

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/purchaseOrders/{id}/resolve-issues", poId)
                        .param("resolvedBy", "warehouse_user")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Collections.emptyList())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Issues resolved successfully"));
    }

    @Test
    @WithMockUser
    public void resolveIssues_whenException_shouldReturn500() throws Exception {
        UUID poId = UUID.randomUUID();

        org.mockito.BDDMockito.willThrow(new RuntimeException("Resolution failed"))
                .given(issueResolutionService).resolveIssues(anyList(), anyString());

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/purchaseOrders/{id}/resolve-issues", poId)
                        .param("resolvedBy", "warehouse_user")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Collections.emptyList())))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ==================== POST /api/v1/purchaseOrders/{id}/retry-equipment-creation ====================

    @Test
    @WithMockUser
    public void retryEquipmentCreation_happyPath_shouldReturn200() throws Exception {
        UUID poId = UUID.randomUUID();
        PurchaseOrder po = new PurchaseOrder();
        Equipment eq1 = new Equipment();
        Equipment eq2 = new Equipment();

        given(purchaseOrderService.getPurchaseOrderById(poId)).willReturn(po);
        given(equipmentService.createFromPurchaseOrder(po)).willReturn(List.of(eq1, eq2));

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/purchaseOrders/{id}/retry-equipment-creation", poId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.count").value(2));
    }

    @Test
    @WithMockUser
    public void retryEquipmentCreation_whenException_shouldReturn500() throws Exception {
        UUID poId = UUID.randomUUID();
        given(purchaseOrderService.getPurchaseOrderById(poId))
                .willThrow(new RuntimeException("PO not found"));

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/purchaseOrders/{id}/retry-equipment-creation", poId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ==================== POST /api/v1/purchaseOrders/{id}/receive-equipment ====================

    @Test
    @WithMockUser(username = "warehouse_user")
    public void receiveEquipment_happyPath_shouldReturn200() throws Exception {
        UUID poId = UUID.randomUUID();
        Equipment equipment = new Equipment();

        EquipmentReceiptRequest request = new EquipmentReceiptRequest();
        request.setProcessedBy("warehouse_user");

        given(deliveryProcessingService.processEquipmentDelivery(eq(poId), any(EquipmentReceiptRequest.class)))
                .willReturn(List.of(equipment));

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/purchaseOrders/{id}/receive-equipment", poId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.count").value(1));
    }

    @Test
    @WithMockUser(username = "warehouse_user")
    public void receiveEquipment_whenException_shouldReturn500() throws Exception {
        UUID poId = UUID.randomUUID();

        EquipmentReceiptRequest request = new EquipmentReceiptRequest();
        request.setProcessedBy("warehouse_user");

        given(deliveryProcessingService.processEquipmentDelivery(any(), any()))
                .willThrow(new RuntimeException("PO not found or not in correct state"));

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/purchaseOrders/{id}/receive-equipment", poId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false));
    }
}