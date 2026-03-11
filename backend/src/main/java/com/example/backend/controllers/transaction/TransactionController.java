package com.example.backend.controllers.transaction;

import com.example.backend.dto.transaction.*;
import com.example.backend.models.transaction.TransactionItem;
import com.example.backend.models.transaction.TransactionStatus;
import com.example.backend.models.warehouse.ItemResolution;
import com.example.backend.models.warehouse.ItemType;
import com.example.backend.repositories.transaction.TransactionRepository;
import com.example.backend.repositories.warehouse.ItemResolutionRepository;
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

    @Autowired
    private ItemResolutionRepository itemResolutionRepository;

    // ========================================
    // CREATE
    // Sender is always the warehouse — no senderType or sentFirst needed.
    // ========================================

    @PostMapping("/create")
    public ResponseEntity<TransactionDTO> createTransaction(@RequestBody TransactionCreateRequestDTO request) {
        try {
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

            Transaction transaction = transactionService.createTransaction(
                    request.getSenderId(),
                    request.getReceiverType(), request.getReceiverId(),
                    items,
                    request.getTransactionDate(),
                    request.getUsername(),
                    request.getBatchNumber(),
                    request.getDescription()
            );

            if (request.getHandledBy() != null) {
                transaction.setHandledBy(request.getHandledBy());
                transaction = transactionRepository.save(transaction);
            }

            return ResponseEntity.ok(transactionMapperService.toDTO(transaction));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(null);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    // ========================================
    // ACCEPT
    // Receiver validates quantities. No purpose or equipment-specific handling here.
    // ========================================

    @PostMapping("/{transactionId}/accept")
    public ResponseEntity<TransactionDTO> acceptTransaction(
            @PathVariable UUID transactionId,
            @RequestBody Map<String, Object> requestBody) {

        System.out.println("=== ACCEPT TRANSACTION ===");
        System.out.println("Transaction ID: " + transactionId);

        try {
            String username = (String) requestBody.get("username");
            String acceptanceComment = (String) requestBody.get("acceptanceComment");
            List<Map<String, Object>> receivedItemsList =
                    (List<Map<String, Object>>) requestBody.get("receivedItems");

            if (username == null || username.trim().isEmpty()) {
                throw new IllegalArgumentException("Username is required");
            }
            if (receivedItemsList == null || receivedItemsList.isEmpty()) {
                throw new IllegalArgumentException("Received items list is required");
            }

            Map<UUID, Integer> receivedQuantities = new HashMap<>();
            Map<UUID, Boolean> itemsNotReceived = new HashMap<>();

            for (int i = 0; i < receivedItemsList.size(); i++) {
                Map<String, Object> receivedItem = receivedItemsList.get(i);

                Object itemIdObj = receivedItem.get("transactionItemId");
                if (itemIdObj == null) throw new IllegalArgumentException("Missing transactionItemId for item " + i);
                UUID itemId = UUID.fromString(itemIdObj.toString());

                Object quantityObj = receivedItem.get("receivedQuantity");
                if (quantityObj == null) throw new IllegalArgumentException("Missing receivedQuantity for item " + i);
                Integer receivedQuantity = Integer.parseInt(quantityObj.toString());

                Object notReceivedObj = receivedItem.get("itemNotReceived");
                Boolean notReceived = notReceivedObj != null
                        ? Boolean.parseBoolean(notReceivedObj.toString())
                        : false;

                receivedQuantities.put(itemId, receivedQuantity);
                itemsNotReceived.put(itemId, notReceived);

                System.out.println("  Item " + i + ": id=" + itemId + " qty=" + receivedQuantity + " notReceived=" + notReceived);
            }

            Transaction transaction = transactionService.acceptTransaction(
                    transactionId, receivedQuantities, itemsNotReceived, username, acceptanceComment);

            System.out.println("=== ACCEPT SUCCESS ===");
            return ResponseEntity.ok(transactionMapperService.toDTO(transaction));

        } catch (IllegalArgumentException e) {
            System.err.println("Accept failed - bad request: " + e.getMessage());
            return ResponseEntity.badRequest().body(null);
        } catch (Exception e) {
            System.err.println("Accept failed - server error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    // ========================================
    // REJECT
    // ========================================

    @PostMapping("/{transactionId}/reject")
    public ResponseEntity<TransactionDTO> rejectTransaction(
            @PathVariable UUID transactionId,
            @RequestBody Map<String, String> requestBody) {
        try {
            String username = requestBody.get("username");
            String rejectionReason = requestBody.get("rejectionReason");

            if (username == null || username.trim().isEmpty()) {
                throw new IllegalArgumentException("Username is required");
            }

            Transaction transaction = transactionService.rejectTransaction(
                    transactionId, rejectionReason, username);

            return ResponseEntity.ok(transactionMapperService.toDTO(transaction));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(null);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    // ========================================
    // UPDATE
    // Sender is always a warehouse — no senderType or sentFirst needed.
    // ========================================

    @PutMapping("/{id}")
    public ResponseEntity<TransactionDTO> updateTransaction(
            @PathVariable UUID id,
            @RequestBody TransactionCreateRequestDTO request) {
        try {
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

            Transaction updated = transactionService.updateTransaction(
                    id,
                    request.getSenderId(),
                    request.getReceiverType(), request.getReceiverId(),
                    items,
                    request.getTransactionDate(),
                    request.getUsername(),
                    request.getBatchNumber(),
                    request.getDescription()
            );

            return ResponseEntity.ok(transactionMapperService.toDTO(updated));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(null);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    // ========================================
    // DELETE
    // ========================================

    @DeleteMapping("/{transactionId}")
    public ResponseEntity<Map<String, Object>> deleteTransaction(@PathVariable UUID transactionId) {
        try {
            System.out.println("DELETE /transactions/" + transactionId);
            transactionService.deleteTransaction(transactionId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Transaction deleted successfully");
            response.put("transactionId", transactionId);
            response.put("deletedAt", LocalDateTime.now());

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "Invalid Request");
            error.put("message", e.getMessage());
            error.put("transactionId", transactionId);
            return ResponseEntity.badRequest().body(error);

        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "Server Error");
            error.put("message", "An unexpected error occurred while deleting the transaction");
            error.put("transactionId", transactionId);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    // ========================================
    // QUERY
    // ========================================

    @GetMapping("/{transactionId}")
    public ResponseEntity<TransactionDTO> getTransactionById(@PathVariable UUID transactionId) {
        try {
            Optional<Transaction> transaction = transactionRepository.findById(transactionId);
            if (transaction.isPresent()) {
                return ResponseEntity.ok(transactionMapperService.toDTO(transaction.get()));
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/warehouse/{warehouseId}")
    public ResponseEntity<List<TransactionDTO>> getTransactionsForWarehouse(@PathVariable UUID warehouseId) {
        try {
            List<Transaction> transactions = transactionService.getTransactionsForWarehouse(warehouseId);
            return ResponseEntity.ok(transactionMapperService.toDTOs(transactions));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/equipment/{equipmentId}")
    public ResponseEntity<List<TransactionDTO>> getTransactionsForEquipment(@PathVariable UUID equipmentId) {
        try {
            List<Transaction> transactions = transactionService.getTransactionsForEquipment(equipmentId);
            return ResponseEntity.ok(transactionMapperService.toDTOs(transactions));
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
                return ResponseEntity.ok(transactionMapperService.toDTO(transaction.get()));
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    // ========================================
    // PATCH ENDPOINTS — direct field updates
    // ========================================

    @PutMapping("/{id}/details")
    public ResponseEntity<TransactionDTO> updateTransactionDetails(
            @PathVariable UUID id,
            @RequestBody Map<String, String> updates) {
        try {
            Transaction transaction = transactionRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));

            if (updates.containsKey("description"))       transaction.setDescription(updates.get("description"));
            if (updates.containsKey("handledBy"))         transaction.setHandledBy(updates.get("handledBy"));
            if (updates.containsKey("rejectionReason"))   transaction.setRejectionReason(updates.get("rejectionReason"));
            if (updates.containsKey("acceptanceComment")) transaction.setAcceptanceComment(updates.get("acceptanceComment"));

            return ResponseEntity.ok(transactionMapperService.toDTO(transactionRepository.save(transaction)));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(null);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @PatchMapping("/{transactionId}/resolve")
    public ResponseEntity<TransactionDTO> markTransactionAsResolved(
            @PathVariable UUID transactionId,
            @RequestBody Map<String, String> request) {
        try {
            Transaction transaction = transactionRepository.findById(transactionId)
                    .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));

            transaction.setStatus(TransactionStatus.RESOLVED);
            transaction.setCompletedAt(LocalDateTime.now());

            if (request.containsKey("resolvedBy"))        transaction.setApprovedBy(request.get("resolvedBy"));
            if (request.containsKey("resolutionComment")) transaction.setAcceptanceComment(request.get("resolutionComment"));

            return ResponseEntity.ok(transactionMapperService.toDTO(transactionRepository.save(transaction)));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(null);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }


    @GetMapping("/resolutions/transaction/{transactionId}")
    public ResponseEntity<List<ItemResolution>> getResolutionsByTransaction(@PathVariable UUID transactionId) {
        try {
            // transactionId is stored as String in ItemResolution — convert UUID to String
            List<ItemResolution> resolutions = itemResolutionRepository.findByTransactionId(transactionId.toString());
            return ResponseEntity.ok(resolutions);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }
}