package com.example.backend.controllers.procurement;

import com.example.backend.config.JwtService;
import com.example.backend.dto.procurement.DeliverySessionDTO;
import com.example.backend.dto.procurement.ProcessDeliveryRequest;
import com.example.backend.services.procurement.DeliveryProcessingService;
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
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = DeliveryController.class)
@AutoConfigureMockMvc(addFilters = false)
public class DeliveryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DeliveryProcessingService deliveryProcessingService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    // ==================== POST /api/procurement/deliveries/process ====================

    @Test
    @WithMockUser(username = "warehouse_user")
    public void processDelivery_happyPath_shouldReturn200WithSession() throws Exception {
        UUID poId = UUID.randomUUID();
        UUID merchantId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();

        ProcessDeliveryRequest request = new ProcessDeliveryRequest();
        request.setPurchaseOrderId(poId);
        request.setMerchantId(merchantId);
        request.setDeliveryNotes("Delivered on time");
        request.setItemReceipts(Collections.emptyList());

        DeliverySessionDTO responseDto = DeliverySessionDTO.builder()
                .id(sessionId)
                .purchaseOrderId(poId)
                .merchantId(merchantId)
                .merchantName("Test Merchant")
                .processedBy("warehouse_user")
                .processedAt(LocalDateTime.now())
                .deliveryNotes("Delivered on time")
                .itemReceipts(Collections.emptyList())
                .build();

        given(deliveryProcessingService.processDelivery(any(ProcessDeliveryRequest.class)))
                .willReturn(responseDto);

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/procurement/deliveries/process")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(sessionId.toString()))
                .andExpect(jsonPath("$.purchaseOrderId").value(poId.toString()))
                .andExpect(jsonPath("$.merchantId").value(merchantId.toString()))
                .andExpect(jsonPath("$.merchantName").value("Test Merchant"))
                .andExpect(jsonPath("$.processedBy").value("warehouse_user"))
                .andExpect(jsonPath("$.deliveryNotes").value("Delivered on time"));
    }

    @Test
    @WithMockUser(username = "warehouse_user")
    public void processDelivery_setsProcessedByFromAuthenticatedUser() throws Exception {
        UUID poId = UUID.randomUUID();

        ProcessDeliveryRequest request = new ProcessDeliveryRequest();
        request.setPurchaseOrderId(poId);
        // processedBy intentionally not set — controller should override it

        DeliverySessionDTO responseDto = DeliverySessionDTO.builder()
                .id(UUID.randomUUID())
                .purchaseOrderId(poId)
                .processedBy("warehouse_user")
                .build();

        given(deliveryProcessingService.processDelivery(any(ProcessDeliveryRequest.class)))
                .willReturn(responseDto);

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/procurement/deliveries/process")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.processedBy").value("warehouse_user"));
    }

    @Test
    @WithMockUser(username = "warehouse_user")
    public void processDelivery_withMinimalRequest_shouldReturn200() throws Exception {
        ProcessDeliveryRequest request = new ProcessDeliveryRequest();

        DeliverySessionDTO responseDto = DeliverySessionDTO.builder()
                .id(UUID.randomUUID())
                .processedBy("warehouse_user")
                .build();

        given(deliveryProcessingService.processDelivery(any(ProcessDeliveryRequest.class)))
                .willReturn(responseDto);

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/procurement/deliveries/process")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNotEmpty());
    }
}