package com.example.backend.controllers.transaction;

import com.example.backend.dto.transaction.*;
import com.example.backend.models.PartyType;
import com.example.backend.models.transaction.TransactionItem;
import com.example.backend.models.transaction.TransactionStatus;
import com.example.backend.models.warehouse.ItemType;
import com.example.backend.repositories.transaction.TransactionRepository;
import com.example.backend.repositories.warehouse.ItemTypeRepository;
import com.example.backend.services.transaction.TransactionMapperService;
import com.example.backend.services.transaction.TransactionService;
import com.example.backend.models.transaction.Transaction;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/v1/transactions")
public class TransactionController {

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private TransactionMapperService transactionMapperService;

    @Autowired
    private ItemTypeRepository itemTypeRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @PostMapping("/create")
    public ResponseEntity<TransactionDTO> createTransaction(@RequestBody TransactionCreateRequestDTO request) {
        try {
            // Convert DTO items to TransactionItem entities
            List<TransactionItem> items = new ArrayList<>();
            for (TransactionItemRequestDTO itemRequest : request.getItems()) {
                ItemType itemType = itemTypeRepository.findById(itemRequest.getItemTypeId())
                        .orElseThrow(() -> new IllegalArgumentException("Item type not found: " + itemRequest.getItemTypeId()));

                TransactionItem item = TransactionItem.builder()
                        .itemType(itemType)
                        .quantity(itemRequest.getQuantity())
                        .status(TransactionStatus.PENDING)
                        .build();

                items.add(item);
            }

            // Create the transaction using the service
            Transaction transaction = transactionService.createTransaction(
                    request.getSenderType(), request.getSenderId(),
                    request.getReceiverType(), request.getReceiverId(),
                    items,
                    request.getTransactionDate(),
                    request.getUsername(),
                    request.getBatchNumber(),
                    request.getSentFirst(),
                    request.getDescription()
            );

            // Convert to DTO and return
            TransactionDTO responseDTO = transactionMapperService.toDTO(transaction);
            return ResponseEntity.ok(responseDTO);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @PostMapping("/{transactionId}/accept")
    public ResponseEntity<TransactionDTO> acceptTransaction(
            @PathVariable UUID transactionId,
            @RequestBody TransactionAcceptRequestDTO request
    ) {
        try {
            // Convert received items from DTO to the format expected by service
            Map<UUID, Integer> receivedQuantities = new HashMap<>();
            Map<UUID, Boolean> itemsNotReceived = new HashMap<>();
            
            for (var receivedItem : request.getReceivedItems()) {
                UUID itemId = UUID.fromString(receivedItem.getTransactionItemId());
                receivedQuantities.put(itemId, receivedItem.getReceivedQuantity());
                
                // Extract itemNotReceived flag if present
                if (receivedItem.getItemNotReceived() != null) {
                    itemsNotReceived.put(itemId, receivedItem.getItemNotReceived());
                }
            }

            Transaction transaction = transactionService.acceptTransaction(
                    transactionId,
                    receivedQuantities,
                    itemsNotReceived,
                    request.getUsername(),
                    request.getAcceptanceComment()
            );

            TransactionDTO responseDTO = transactionMapperService.toDTO(transaction);
            return ResponseEntity.ok(responseDTO);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/warehouse/{warehouseId}")
    public ResponseEntity<List<TransactionDTO>> getTransactionsForWarehouse(@PathVariable UUID warehouseId) {
        try {
            List<Transaction> transactions = transactionService.getTransactionsForWarehouse(warehouseId);
            List<TransactionDTO> responseDTOs = transactionMapperService.toDTOs(transactions);
            return ResponseEntity.ok(responseDTOs);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/equipment/{equipmentId}")
    public ResponseEntity<List<TransactionDTO>> getTransactionsForEquipment(@PathVariable UUID equipmentId) {
        try {
            List<Transaction> transactions = transactionService.getTransactionsForEquipment(equipmentId);
            List<TransactionDTO> responseDTOs = transactionMapperService.toDTOs(transactions);
            return ResponseEntity.ok(responseDTOs);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<TransactionDTO> updateTransaction(
            @PathVariable UUID id,
            @RequestBody TransactionCreateRequestDTO request) {
        try {
            // Convert DTO items to TransactionItem entities
            List<TransactionItem> items = new ArrayList<>();
            for (TransactionItemRequestDTO itemRequest : request.getItems()) {
                ItemType itemType = itemTypeRepository.findById(itemRequest.getItemTypeId())
                        .orElseThrow(() -> new IllegalArgumentException("Item type not found: " + itemRequest.getItemTypeId()));

                TransactionItem item = new TransactionItem();
                item.setItemType(itemType);
                item.setQuantity(itemRequest.getQuantity());
                item.setStatus(TransactionStatus.PENDING);

                items.add(item);
            }

            Transaction updatedTransaction = transactionService.updateTransaction(
                    id,
                    request.getSenderType(), request.getSenderId(),
                    request.getReceiverType(), request.getReceiverId(),
                    items,
                    request.getTransactionDate(),
                    request.getUsername(),
                    request.getBatchNumber(),
                    request.getDescription()
            );

            TransactionDTO responseDTO = transactionMapperService.toDTO(updatedTransaction);
            return ResponseEntity.ok(responseDTO);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(null);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/{transactionId}")
    public ResponseEntity<TransactionDTO> getTransactionById(@PathVariable UUID transactionId) {
        try {
            Optional<Transaction> transaction = transactionRepository.findById(transactionId);
            if (transaction.isPresent()) {
                TransactionDTO responseDTO = transactionMapperService.toDTO(transaction.get());
                return ResponseEntity.ok(responseDTO);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/batch/{batchNumber}")
    public ResponseEntity<TransactionDTO> findByBatchNumber(@PathVariable int batchNumber) {
        try {
            Optional<Transaction> transaction = transactionRepository.findByBatchNumber(batchNumber);
            if (transaction.isPresent()) {
                TransactionDTO responseDTO = transactionMapperService.toDTO(transaction.get());
                return ResponseEntity.ok(responseDTO);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    // ========================================
    // LEGACY SUPPORT METHODS
    // Keep existing Map-based endpoints for backward compatibility
    // ========================================

    @PostMapping("/create-legacy")
    public ResponseEntity<Transaction> createTransactionLegacy(@RequestBody Map<String, Object> request) {
        // Extract the basic transaction information
        PartyType senderType = PartyType.valueOf((String) request.get("senderType"));
        UUID senderId = UUID.fromString((String) request.get("senderId"));
        PartyType receiverType = PartyType.valueOf((String) request.get("receiverType"));
        UUID receiverId = UUID.fromString((String) request.get("receiverId"));
        String username = (String) request.get("username");
        int batchNumber = (int) request.get("batchNumber");
        UUID sentFirst = UUID.fromString((String) request.get("sentFirst"));
        LocalDateTime transactionDate = LocalDateTime.parse((String) request.get("transactionDate"));
        String description = (String) request.get("description");

        // Extract the items array
        List<Map<String, Object>> itemsData = (List<Map<String, Object>>) request.get("items");
        List<TransactionItem> items = new ArrayList<>();

        // Create TransactionItem objects from the request data
        for (Map<String, Object> itemData : itemsData) {
            UUID itemTypeId = UUID.fromString((String) itemData.get("itemTypeId"));
            int quantity = (int) itemData.get("quantity");

            // Fetch the ItemType from the repository
            ItemType itemType = itemTypeRepository.findById(itemTypeId)
                    .orElseThrow(() -> new IllegalArgumentException("Item type not found: " + itemTypeId));

            // Create a new TransactionItem (without transaction reference yet)
            TransactionItem item = TransactionItem.builder()
                    .itemType(itemType)
                    .quantity(quantity)
                    .status(TransactionStatus.PENDING)
                    .build();

            items.add(item);
        }

        // Call the service to create the transaction with multiple items
        Transaction transaction = transactionService.createTransaction(
                senderType, senderId,
                receiverType, receiverId,
                items,
                transactionDate,
                username, batchNumber,
                sentFirst,
                description
        );

        return ResponseEntity.ok(transaction);
    }

    @PostMapping("/{transactionId}/accept-legacy")
    public ResponseEntity<Transaction> acceptTransactionLegacy(
            @PathVariable UUID transactionId,
            @RequestBody Map<String, Object> request
    ) {
        try {
            String username = (String) request.get("username");
            String acceptanceComment = (String) request.get("acceptanceComment");

            Object receivedItemsObj = request.get("receivedItems");
            if (!(receivedItemsObj instanceof List<?> receivedItemsList)) {
                throw new IllegalArgumentException("Invalid format for receivedItems");
            }

            Map<UUID, Integer> receivedQuantities = new HashMap<>();
            Map<UUID, Boolean> itemsNotReceived = new HashMap<>();

            for (Object itemObj : receivedItemsList) {
                if (!(itemObj instanceof Map<?, ?> itemMap)) {
                    throw new IllegalArgumentException("Invalid item in receivedItems list");
                }

                Object idObj = itemMap.get("transactionItemId");
                Object quantityObj = itemMap.get("receivedQuantity");

                if (idObj == null || quantityObj == null) {
                    throw new IllegalArgumentException("Missing item data in receivedItems");
                }

                UUID itemId = UUID.fromString(idObj.toString());
                int receivedQuantity = Integer.parseInt(quantityObj.toString());

                receivedQuantities.put(itemId, receivedQuantity);
                
                // Extract itemNotReceived flag if present
                Object itemNotReceivedObj = itemMap.get("itemNotReceived");
                if (itemNotReceivedObj != null) {
                    boolean itemNotReceived = Boolean.parseBoolean(itemNotReceivedObj.toString());
                    itemsNotReceived.put(itemId, itemNotReceived);
                }
            }

            Transaction transaction = transactionService.acceptTransaction(
                    transactionId,
                    receivedQuantities,
                    itemsNotReceived,
                    username,
                    acceptanceComment
            );

            return ResponseEntity.ok(transaction);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(null);
        }
    }
}
