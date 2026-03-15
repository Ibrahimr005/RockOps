package com.example.backend.controllers.transaction;

import com.example.backend.config.JwtService;
import com.example.backend.dto.transaction.TransactionCreateRequestDTO;
import com.example.backend.dto.transaction.TransactionDTO;
import com.example.backend.dto.transaction.TransactionItemRequestDTO;
import com.example.backend.models.PartyType;
import com.example.backend.models.transaction.Transaction;
import com.example.backend.models.transaction.TransactionStatus;
import com.example.backend.models.warehouse.ItemResolution;
import com.example.backend.models.warehouse.ItemType;
import com.example.backend.repositories.transaction.TransactionRepository;
import com.example.backend.repositories.warehouse.ItemResolutionRepository;
import com.example.backend.repositories.warehouse.ItemTypeRepository;
import com.example.backend.services.transaction.TransactionMapperService;
import com.example.backend.services.transaction.TransactionService;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = TransactionController.class)
@AutoConfigureMockMvc(addFilters = false)
public class TransactionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TransactionService transactionService;

    @MockBean
    private TransactionMapperService transactionMapperService;

    @MockBean
    private ItemTypeRepository itemTypeRepository;

    @MockBean
    private TransactionRepository transactionRepository;

    @MockBean
    private ItemResolutionRepository itemResolutionRepository;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper.registerModule(new JavaTimeModule());
    }

    // ==================== Helper builders ====================

    private TransactionDTO buildTransactionDTO(UUID id) {
        return TransactionDTO.builder()
                .id(id)
                .status(TransactionStatus.PENDING)
                .batchNumber(1)
                .build();
    }

    private Transaction buildTransaction(UUID id) {
        Transaction t = new Transaction();
        t.setId(id);
        return t;
    }

    // ==================== POST /api/v1/transactions/create ====================

    @Test
    public void createTransaction_happyPath_shouldReturn200() throws Exception {
        UUID itemTypeId = UUID.randomUUID();
        UUID senderId = UUID.randomUUID();
        UUID receiverId = UUID.randomUUID();
        UUID transactionId = UUID.randomUUID();

        ItemType itemType = new ItemType();
        itemType.setId(itemTypeId);

        Transaction savedTransaction = buildTransaction(transactionId);
        TransactionDTO dto = buildTransactionDTO(transactionId);

        given(itemTypeRepository.findById(itemTypeId)).willReturn(Optional.of(itemType));
        given(transactionService.createTransaction(
                eq(senderId), any(PartyType.class), eq(receiverId),
                anyList(), any(), anyString(), anyInt(), anyString()))
                .willReturn(savedTransaction);
        given(transactionMapperService.toDTO(savedTransaction)).willReturn(dto);

        TransactionCreateRequestDTO request = TransactionCreateRequestDTO.builder()
                .senderId(senderId)
                .receiverType(PartyType.EQUIPMENT)
                .receiverId(receiverId)
                .username("admin")
                .batchNumber(1)
                .description("Test transaction")
                .transactionDate(LocalDateTime.now())
                .items(List.of(TransactionItemRequestDTO.builder()
                        .itemTypeId(itemTypeId)
                        .quantity(5)
                        .build()))
                .build();

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/transactions/create")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(transactionId.toString()));
    }

    @Test
    public void createTransaction_itemTypeNotFound_shouldReturn400() throws Exception {
        UUID itemTypeId = UUID.randomUUID();

        given(itemTypeRepository.findById(itemTypeId)).willReturn(Optional.empty());

        TransactionCreateRequestDTO request = TransactionCreateRequestDTO.builder()
                .senderId(UUID.randomUUID())
                .receiverType(PartyType.EQUIPMENT)
                .receiverId(UUID.randomUUID())
                .username("admin")
                .batchNumber(1)
                .items(List.of(TransactionItemRequestDTO.builder()
                        .itemTypeId(itemTypeId)
                        .quantity(3)
                        .build()))
                .build();

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/transactions/create")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    public void createTransaction_serviceThrowsException_shouldReturn500() throws Exception {
        UUID itemTypeId = UUID.randomUUID();

        ItemType itemType = new ItemType();
        itemType.setId(itemTypeId);

        given(itemTypeRepository.findById(itemTypeId)).willReturn(Optional.of(itemType));
        given(transactionService.createTransaction(
                any(), any(), any(), anyList(), any(), anyString(), anyInt(), anyString()))
                .willThrow(new RuntimeException("DB error"));

        TransactionCreateRequestDTO request = TransactionCreateRequestDTO.builder()
                .senderId(UUID.randomUUID())
                .receiverType(PartyType.EQUIPMENT)
                .receiverId(UUID.randomUUID())
                .username("admin")
                .batchNumber(1)
                .items(List.of(TransactionItemRequestDTO.builder()
                        .itemTypeId(itemTypeId)
                        .quantity(2)
                        .build()))
                .build();

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/transactions/create")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isInternalServerError());
    }

    // ==================== POST /api/v1/transactions/{transactionId}/accept ====================

    @Test
    public void acceptTransaction_happyPath_shouldReturn200() throws Exception {
        UUID transactionId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();
        Transaction transaction = buildTransaction(transactionId);
        TransactionDTO dto = buildTransactionDTO(transactionId);

        given(transactionService.acceptTransaction(eq(transactionId), any(), any(), anyString(), anyString()))
                .willReturn(transaction);
        given(transactionMapperService.toDTO(transaction)).willReturn(dto);

        Map<String, Object> body = new HashMap<>();
        body.put("username", "admin");
        body.put("acceptanceComment", "All good");
        Map<String, Object> receivedItem = new HashMap<>();
        receivedItem.put("transactionItemId", itemId.toString());
        receivedItem.put("receivedQuantity", "10");
        receivedItem.put("itemNotReceived", "false");
        body.put("receivedItems", List.of(receivedItem));

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/transactions/{transactionId}/accept", transactionId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(transactionId.toString()));
    }

    @Test
    public void acceptTransaction_missingUsername_shouldReturn400() throws Exception {
        UUID transactionId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        Map<String, Object> body = new HashMap<>();
        body.put("username", "");
        Map<String, Object> receivedItem = new HashMap<>();
        receivedItem.put("transactionItemId", itemId.toString());
        receivedItem.put("receivedQuantity", "5");
        body.put("receivedItems", List.of(receivedItem));

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/transactions/{transactionId}/accept", transactionId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    public void acceptTransaction_missingReceivedItems_shouldReturn400() throws Exception {
        UUID transactionId = UUID.randomUUID();

        Map<String, Object> body = new HashMap<>();
        body.put("username", "admin");
        body.put("receivedItems", Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/transactions/{transactionId}/accept", transactionId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    public void acceptTransaction_serviceThrowsException_shouldReturn500() throws Exception {
        UUID transactionId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        given(transactionService.acceptTransaction(eq(transactionId), any(), any(), anyString(), anyString()))
                .willThrow(new RuntimeException("Unexpected failure"));

        Map<String, Object> body = new HashMap<>();
        body.put("username", "admin");
        Map<String, Object> receivedItem = new HashMap<>();
        receivedItem.put("transactionItemId", itemId.toString());
        receivedItem.put("receivedQuantity", "10");
        body.put("receivedItems", List.of(receivedItem));

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/transactions/{transactionId}/accept", transactionId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isInternalServerError());
    }

    // ==================== POST /api/v1/transactions/{transactionId}/reject ====================

    @Test
    public void rejectTransaction_happyPath_shouldReturn200() throws Exception {
        UUID transactionId = UUID.randomUUID();
        Transaction transaction = buildTransaction(transactionId);
        TransactionDTO dto = buildTransactionDTO(transactionId);

        given(transactionService.rejectTransaction(eq(transactionId), anyString(), anyString()))
                .willReturn(transaction);
        given(transactionMapperService.toDTO(transaction)).willReturn(dto);

        Map<String, String> body = Map.of(
                "username", "admin",
                "rejectionReason", "Wrong items");

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/transactions/{transactionId}/reject", transactionId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(transactionId.toString()));
    }

    @Test
    public void rejectTransaction_missingUsername_shouldReturn400() throws Exception {
        UUID transactionId = UUID.randomUUID();

        Map<String, String> body = Map.of("rejectionReason", "Wrong items");

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/transactions/{transactionId}/reject", transactionId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    public void rejectTransaction_serviceThrowsException_shouldReturn500() throws Exception {
        UUID transactionId = UUID.randomUUID();

        given(transactionService.rejectTransaction(eq(transactionId), anyString(), anyString()))
                .willThrow(new RuntimeException("Unexpected error"));

        Map<String, String> body = Map.of("username", "admin", "rejectionReason", "Error");

        mockMvc.perform(MockMvcRequestBuilders
                        .post("/api/v1/transactions/{transactionId}/reject", transactionId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isInternalServerError());
    }

    // ==================== PUT /api/v1/transactions/{id} ====================

    @Test
    public void updateTransaction_happyPath_shouldReturn200() throws Exception {
        UUID id = UUID.randomUUID();
        UUID itemTypeId = UUID.randomUUID();
        ItemType itemType = new ItemType();
        itemType.setId(itemTypeId);
        Transaction updated = buildTransaction(id);
        TransactionDTO dto = buildTransactionDTO(id);

        given(itemTypeRepository.findById(itemTypeId)).willReturn(Optional.of(itemType));
        given(transactionService.updateTransaction(
                eq(id), any(), any(), any(), anyList(), any(), anyString(), anyInt(), anyString()))
                .willReturn(updated);
        given(transactionMapperService.toDTO(updated)).willReturn(dto);

        TransactionCreateRequestDTO request = TransactionCreateRequestDTO.builder()
                .senderId(UUID.randomUUID())
                .receiverType(PartyType.EQUIPMENT)
                .receiverId(UUID.randomUUID())
                .username("admin")
                .batchNumber(1)
                .items(List.of(TransactionItemRequestDTO.builder()
                        .itemTypeId(itemTypeId)
                        .quantity(5)
                        .build()))
                .build();

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/v1/transactions/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()));
    }

    @Test
    public void updateTransaction_itemTypeNotFound_shouldReturn400() throws Exception {
        UUID id = UUID.randomUUID();
        UUID itemTypeId = UUID.randomUUID();

        given(itemTypeRepository.findById(itemTypeId)).willReturn(Optional.empty());

        TransactionCreateRequestDTO request = TransactionCreateRequestDTO.builder()
                .senderId(UUID.randomUUID())
                .receiverType(PartyType.EQUIPMENT)
                .receiverId(UUID.randomUUID())
                .username("admin")
                .batchNumber(1)
                .items(List.of(TransactionItemRequestDTO.builder()
                        .itemTypeId(itemTypeId)
                        .quantity(5)
                        .build()))
                .build();

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/v1/transactions/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    // ==================== DELETE /api/v1/transactions/{transactionId} ====================

    @Test
    public void deleteTransaction_happyPath_shouldReturn200() throws Exception {
        UUID transactionId = UUID.randomUUID();

        willDoNothing().given(transactionService).deleteTransaction(transactionId);

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/v1/transactions/{transactionId}", transactionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Transaction deleted successfully"));
    }

    @Test
    public void deleteTransaction_illegalArgument_shouldReturn400() throws Exception {
        UUID transactionId = UUID.randomUUID();

        willThrow(new IllegalArgumentException("Transaction not found"))
                .given(transactionService).deleteTransaction(transactionId);

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/v1/transactions/{transactionId}", transactionId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    public void deleteTransaction_unexpectedException_shouldReturn500() throws Exception {
        UUID transactionId = UUID.randomUUID();

        willThrow(new RuntimeException("DB failure"))
                .given(transactionService).deleteTransaction(transactionId);

        mockMvc.perform(MockMvcRequestBuilders
                        .delete("/api/v1/transactions/{transactionId}", transactionId))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ==================== GET /api/v1/transactions/{transactionId} ====================

    @Test
    public void getTransactionById_found_shouldReturn200() throws Exception {
        UUID transactionId = UUID.randomUUID();
        Transaction transaction = buildTransaction(transactionId);
        TransactionDTO dto = buildTransactionDTO(transactionId);

        given(transactionRepository.findById(transactionId)).willReturn(Optional.of(transaction));
        given(transactionMapperService.toDTO(transaction)).willReturn(dto);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/transactions/{transactionId}", transactionId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(transactionId.toString()));
    }

    @Test
    public void getTransactionById_notFound_shouldReturn404() throws Exception {
        UUID transactionId = UUID.randomUUID();

        given(transactionRepository.findById(transactionId)).willReturn(Optional.empty());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/transactions/{transactionId}", transactionId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    public void getTransactionById_serviceThrowsException_shouldReturn500() throws Exception {
        UUID transactionId = UUID.randomUUID();

        given(transactionRepository.findById(transactionId))
                .willThrow(new RuntimeException("DB error"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/transactions/{transactionId}", transactionId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/transactions/warehouse/{warehouseId} ====================

    @Test
    public void getTransactionsForWarehouse_shouldReturn200WithList() throws Exception {
        UUID warehouseId = UUID.randomUUID();
        UUID txId = UUID.randomUUID();
        Transaction transaction = buildTransaction(txId);
        TransactionDTO dto = buildTransactionDTO(txId);

        given(transactionService.getTransactionsForWarehouse(warehouseId)).willReturn(List.of(transaction));
        given(transactionMapperService.toDTOs(List.of(transaction))).willReturn(List.of(dto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/transactions/warehouse/{warehouseId}", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value(txId.toString()));
    }

    @Test
    public void getTransactionsForWarehouse_emptyResult_shouldReturn200() throws Exception {
        UUID warehouseId = UUID.randomUUID();

        given(transactionService.getTransactionsForWarehouse(warehouseId)).willReturn(Collections.emptyList());
        given(transactionMapperService.toDTOs(Collections.emptyList())).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/transactions/warehouse/{warehouseId}", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    public void getTransactionsForWarehouse_serviceThrowsException_shouldReturn500() throws Exception {
        UUID warehouseId = UUID.randomUUID();

        given(transactionService.getTransactionsForWarehouse(warehouseId))
                .willThrow(new RuntimeException("DB failure"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/transactions/warehouse/{warehouseId}", warehouseId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/transactions/equipment/{equipmentId} ====================

    @Test
    public void getTransactionsForEquipment_shouldReturn200WithList() throws Exception {
        UUID equipmentId = UUID.randomUUID();
        UUID txId = UUID.randomUUID();
        Transaction transaction = buildTransaction(txId);
        TransactionDTO dto = buildTransactionDTO(txId);

        given(transactionService.getTransactionsForEquipment(equipmentId)).willReturn(List.of(transaction));
        given(transactionMapperService.toDTOs(List.of(transaction))).willReturn(List.of(dto));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/transactions/equipment/{equipmentId}", equipmentId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    public void getTransactionsForEquipment_serviceThrowsException_shouldReturn500() throws Exception {
        UUID equipmentId = UUID.randomUUID();

        given(transactionService.getTransactionsForEquipment(equipmentId))
                .willThrow(new RuntimeException("Error"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/transactions/equipment/{equipmentId}", equipmentId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    // ==================== GET /api/v1/transactions/batch/{batchNumber} ====================

    @Test
    public void findByBatchNumber_found_shouldReturn200() throws Exception {
        int batchNumber = 42;
        UUID txId = UUID.randomUUID();
        Transaction transaction = buildTransaction(txId);
        TransactionDTO dto = buildTransactionDTO(txId);

        given(transactionRepository.findByBatchNumber(batchNumber)).willReturn(Optional.of(transaction));
        given(transactionMapperService.toDTO(transaction)).willReturn(dto);

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/transactions/batch/{batchNumber}", batchNumber)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(txId.toString()));
    }

    @Test
    public void findByBatchNumber_notFound_shouldReturn404() throws Exception {
        int batchNumber = 999;

        given(transactionRepository.findByBatchNumber(batchNumber)).willReturn(Optional.empty());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/transactions/batch/{batchNumber}", batchNumber)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    // ==================== PUT /api/v1/transactions/{id}/details ====================

    @Test
    public void updateTransactionDetails_happyPath_shouldReturn200() throws Exception {
        UUID id = UUID.randomUUID();
        Transaction transaction = buildTransaction(id);
        TransactionDTO dto = buildTransactionDTO(id);

        given(transactionRepository.findById(id)).willReturn(Optional.of(transaction));
        given(transactionRepository.save(transaction)).willReturn(transaction);
        given(transactionMapperService.toDTO(transaction)).willReturn(dto);

        Map<String, String> updates = Map.of(
                "description", "Updated description",
                "handledBy", "supervisor");

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/v1/transactions/{id}/details", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updates)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()));
    }

    @Test
    public void updateTransactionDetails_notFound_shouldReturn400() throws Exception {
        UUID id = UUID.randomUUID();

        given(transactionRepository.findById(id)).willReturn(Optional.empty());

        Map<String, String> updates = Map.of("description", "Something");

        mockMvc.perform(MockMvcRequestBuilders
                        .put("/api/v1/transactions/{id}/details", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updates)))
                .andExpect(status().isBadRequest());
    }

    // ==================== PATCH /api/v1/transactions/{transactionId}/resolve ====================

    @Test
    public void markTransactionAsResolved_happyPath_shouldReturn200() throws Exception {
        UUID transactionId = UUID.randomUUID();
        Transaction transaction = buildTransaction(transactionId);
        TransactionDTO dto = buildTransactionDTO(transactionId);
        dto.setStatus(TransactionStatus.RESOLVED);

        given(transactionRepository.findById(transactionId)).willReturn(Optional.of(transaction));
        given(transactionRepository.save(transaction)).willReturn(transaction);
        given(transactionMapperService.toDTO(transaction)).willReturn(dto);

        Map<String, String> request = Map.of(
                "resolvedBy", "manager",
                "resolutionComment", "Issue resolved");

        mockMvc.perform(MockMvcRequestBuilders
                        .patch("/api/v1/transactions/{transactionId}/resolve", transactionId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(transactionId.toString()));
    }

    @Test
    public void markTransactionAsResolved_notFound_shouldReturn400() throws Exception {
        UUID transactionId = UUID.randomUUID();

        given(transactionRepository.findById(transactionId)).willReturn(Optional.empty());

        Map<String, String> request = Map.of("resolvedBy", "manager");

        mockMvc.perform(MockMvcRequestBuilders
                        .patch("/api/v1/transactions/{transactionId}/resolve", transactionId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    // ==================== GET /api/v1/transactions/resolutions/transaction/{transactionId} ====================

    @Test
    public void getResolutionsByTransaction_shouldReturn200WithList() throws Exception {
        UUID transactionId = UUID.randomUUID();
        ItemResolution resolution = new ItemResolution();

        given(itemResolutionRepository.findByTransactionId(transactionId.toString()))
                .willReturn(List.of(resolution));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/transactions/resolutions/transaction/{transactionId}", transactionId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    public void getResolutionsByTransaction_emptyResult_shouldReturn200() throws Exception {
        UUID transactionId = UUID.randomUUID();

        given(itemResolutionRepository.findByTransactionId(transactionId.toString()))
                .willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/transactions/resolutions/transaction/{transactionId}", transactionId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    public void getResolutionsByTransaction_serviceThrowsException_shouldReturn500() throws Exception {
        UUID transactionId = UUID.randomUUID();

        given(itemResolutionRepository.findByTransactionId(transactionId.toString()))
                .willThrow(new RuntimeException("DB error"));

        mockMvc.perform(MockMvcRequestBuilders
                        .get("/api/v1/transactions/resolutions/transaction/{transactionId}", transactionId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
    }
}