package com.example.backend.controllers.procurement;

import com.example.backend.config.JwtService;
import com.example.backend.dto.procurement.RequestOrderDTO;
import com.example.backend.mappers.procurement.RequestOrderMapper;
import com.example.backend.models.procurement.RequestOrder.RequestOrder;
import com.example.backend.services.procurement.RequestOrderService;
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
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = RequestOrderController.class)
@AutoConfigureMockMvc(addFilters = false)
public class RequestOrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private RequestOrderService requestOrderService;

    @MockBean
    private RequestOrderMapper requestOrderMapper;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    // ==================== POST /api/v1/requestOrders ====================

    @Test
    @WithMockUser
    public void createRequest_happyPath_shouldReturn200WithOrder() throws Exception {
        RequestOrder order = new RequestOrder();

        given(requestOrderService.createRequest(anyMap())).willReturn(order);

        Map<String, Object> body = new HashMap<>();
        body.put("title", "New Request");
        body.put("description", "Test description");

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/requestOrders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    public void createRequest_whenRuntimeException_shouldReturn400() throws Exception {
        given(requestOrderService.createRequest(anyMap()))
                .willThrow(new RuntimeException("Invalid warehouse"));

        Map<String, Object> body = new HashMap<>();
        body.put("title", "Bad Request");

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/requestOrders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid warehouse"))
                .andExpect(jsonPath("$.error").value("Request creation failed"));
    }

    @Test
    @WithMockUser
    public void createRequest_whenUnexpectedException_shouldReturn500() throws Exception {
        given(requestOrderService.createRequest(anyMap()))
                .willThrow(new Error("JVM crash"));

        Map<String, Object> body = new HashMap<>();
        body.put("title", "Bad Request");

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/requestOrders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Internal server error"));
    }

    // ==================== GET /api/v1/requestOrders ====================

    @Test
    @WithMockUser
    public void getAllRequestOrders_happyPath_shouldReturn200WithList() throws Exception {
        RequestOrder order = new RequestOrder();
        given(requestOrderService.getAllRequestOrders()).willReturn(List.of(order));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/requestOrders")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    public void getAllRequestOrders_emptyList_shouldReturn200() throws Exception {
        given(requestOrderService.getAllRequestOrders()).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/requestOrders")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @WithMockUser
    public void getAllRequestOrders_whenException_shouldReturn500() throws Exception {
        given(requestOrderService.getAllRequestOrders())
                .willThrow(new RuntimeException("DB failure"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/requestOrders")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/requestOrders/{id} ====================

    @Test
    @WithMockUser
    public void getRequestOrderById_happyPath_shouldReturn200() throws Exception {
        UUID id = UUID.randomUUID();
        RequestOrder order = new RequestOrder();
        RequestOrderDTO dto = RequestOrderDTO.builder()
                .id(id)
                .title("Order 1")
                .build();

        given(requestOrderService.findById(id)).willReturn(Optional.of(order));
        given(requestOrderMapper.toDTO(order)).willReturn(dto);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/requestOrders/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.title").value("Order 1"));
    }

    @Test
    @WithMockUser
    public void getRequestOrderById_whenNotFound_shouldReturn404() throws Exception {
        UUID id = UUID.randomUUID();
        given(requestOrderService.findById(id)).willReturn(Optional.empty());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/requestOrders/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser
    public void getRequestOrderById_whenException_shouldReturn500() throws Exception {
        UUID id = UUID.randomUUID();
        RequestOrder order = new RequestOrder();

        given(requestOrderService.findById(id)).willReturn(Optional.of(order));
        given(requestOrderMapper.toDTO(order))
                .willThrow(new RuntimeException("Mapping error"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/requestOrders/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== PUT /api/v1/requestOrders/{id} ====================

    @Test
    @WithMockUser
    public void updateRequestOrder_happyPath_shouldReturn200() throws Exception {
        UUID id = UUID.randomUUID();
        RequestOrder updated = new RequestOrder();

        given(requestOrderService.updateRequest(eq(id), anyMap())).willReturn(updated);

        Map<String, Object> body = new HashMap<>();
        body.put("title", "Updated Request");

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/v1/requestOrders/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    public void updateRequestOrder_whenException_shouldReturn500() throws Exception {
        UUID id = UUID.randomUUID();

        given(requestOrderService.updateRequest(eq(id), anyMap()))
                .willThrow(new RuntimeException("Order not found"));

        Map<String, Object> body = new HashMap<>();
        body.put("title", "Updated Request");

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/v1/requestOrders/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value("Order not found"));
    }

    // ==================== PUT /api/v1/requestOrders/{id}/status ====================

    @Test
    @WithMockUser
    public void updateRequestOrderStatus_happyPath_shouldReturn200() throws Exception {
        UUID id = UUID.randomUUID();
        RequestOrder updated = new RequestOrder();

        given(requestOrderService.updateStatus(eq(id), eq("APPROVED"))).willReturn(updated);

        Map<String, String> body = new HashMap<>();
        body.put("status", "APPROVED");

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/v1/requestOrders/{id}/status", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    public void updateRequestOrderStatus_whenException_shouldReturn500() throws Exception {
        UUID id = UUID.randomUUID();

        given(requestOrderService.updateStatus(eq(id), anyString()))
                .willThrow(new RuntimeException("Status transition invalid"));

        Map<String, String> body = new HashMap<>();
        body.put("status", "INVALID");

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/v1/requestOrders/{id}/status", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value("Status transition invalid"));
    }

    // ==================== GET /api/v1/requestOrders/warehouse ====================

    @Test
    @WithMockUser
    public void getRequestsByWarehouseAndStatus_happyPath_shouldReturn200() throws Exception {
        UUID warehouseId = UUID.randomUUID();
        RequestOrder order = new RequestOrder();

        given(requestOrderService.getRequestsByWarehouseAndStatus(eq(warehouseId), eq("PENDING")))
                .willReturn(List.of(order));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/requestOrders/warehouse")
                        .param("warehouseId", warehouseId.toString())
                        .param("status", "PENDING")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser
    public void getRequestsByWarehouseAndStatus_whenIllegalArgument_shouldReturn400() throws Exception {
        UUID warehouseId = UUID.randomUUID();

        given(requestOrderService.getRequestsByWarehouseAndStatus(any(), anyString()))
                .willThrow(new IllegalArgumentException("Invalid status value"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/requestOrders/warehouse")
                        .param("warehouseId", warehouseId.toString())
                        .param("status", "INVALID")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    public void getRequestsByWarehouseAndStatus_whenException_shouldReturn500() throws Exception {
        UUID warehouseId = UUID.randomUUID();

        given(requestOrderService.getRequestsByWarehouseAndStatus(any(), anyString()))
                .willThrow(new RuntimeException("DB error"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/requestOrders/warehouse")
                        .param("warehouseId", warehouseId.toString())
                        .param("status", "PENDING")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== POST /api/v1/requestOrders/validate-restock ====================

    @Test
    @WithMockUser
    public void validateRestockItems_happyPath_shouldReturn200() throws Exception {
        UUID warehouseId = UUID.randomUUID();
        List<UUID> itemTypeIds = List.of(UUID.randomUUID(), UUID.randomUUID());

        Map<String, Object> validationResult = new HashMap<>();
        validationResult.put("valid", true);
        validationResult.put("items", List.of());

        given(requestOrderService.getRestockValidationInfo(eq(warehouseId), anyList()))
                .willReturn(validationResult);

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/requestOrders/validate-restock")
                        .param("warehouseId", warehouseId.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(itemTypeIds)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true));
    }

    @Test
    @WithMockUser
    public void validateRestockItems_whenException_shouldReturn500() throws Exception {
        UUID warehouseId = UUID.randomUUID();
        List<UUID> itemTypeIds = List.of(UUID.randomUUID());

        given(requestOrderService.getRestockValidationInfo(any(), anyList()))
                .willThrow(new RuntimeException("Warehouse not found"));

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/requestOrders/validate-restock")
                        .param("warehouseId", warehouseId.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(itemTypeIds)))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value("Warehouse not found"))
                .andExpect(jsonPath("$.error").value("Validation failed"));
    }

    // ==================== DELETE /api/v1/requestOrders/{id} ====================

    @Test
    @WithMockUser
    public void deleteRequestOrder_happyPath_shouldReturn200WithMessage() throws Exception {
        UUID id = UUID.randomUUID();

        willDoNothing().given(requestOrderService).deleteRequest(id);

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/v1/requestOrders/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Request order deleted successfully"));
    }

    @Test
    @WithMockUser
    public void deleteRequestOrder_whenException_shouldReturn500() throws Exception {
        UUID id = UUID.randomUUID();

        willThrow(new RuntimeException("Order not found")).given(requestOrderService).deleteRequest(id);

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/v1/requestOrders/{id}", id))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value("Order not found"));
    }
}