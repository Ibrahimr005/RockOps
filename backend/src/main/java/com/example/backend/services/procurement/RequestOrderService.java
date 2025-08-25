package com.example.backend.services.procurement;



import com.example.backend.models.PartyType;
import com.example.backend.models.RequestStatus;
import com.example.backend.models.procurement.RequestOrder;
import com.example.backend.models.procurement.RequestOrderItem;
import com.example.backend.models.warehouse.ItemType;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.repositories.procurement.RequestOrderRepository;
import com.example.backend.repositories.warehouse.ItemTypeRepository;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class RequestOrderService {

    @Autowired
   private ItemTypeRepository itemTypeRepository;
    @Autowired
    private RequestOrderRepository requestOrderRepository;

    @Autowired
    private WarehouseRepository warehouseRepository;


    public RequestOrder createRequest(Map<String, Object> requestData) {
        try {
            System.out.println("Creating request with data: " + requestData);

            // Basic info
            String title = (String) requestData.get("title");
            String description = (String) requestData.get("description");
            String createdBy = (String) requestData.get("createdBy");
            String statusStr = (String) requestData.get("status");
            String partyTypeStr = (String) requestData.get("partyType");
            String requesterIdStr = (String) requestData.get("requesterId");

            // Validate required fields
            if (title == null || description == null || createdBy == null ||
                    statusStr == null || partyTypeStr == null || requesterIdStr == null) {
                throw new RuntimeException("Missing required fields");
            }

            UUID requesterId;
            try {
                requesterId = UUID.fromString(requesterIdStr);
            } catch (IllegalArgumentException e) {
                throw new RuntimeException("Invalid requesterId format: " + requesterIdStr);
            }

            // Handle employeeRequestedBy (can be null)
            String employeeRequestedByStr = (String) requestData.get("employeeRequestedBy");
            String employeeRequestedBy = null;
            if (employeeRequestedByStr != null && !employeeRequestedByStr.trim().isEmpty()) {
                employeeRequestedBy = employeeRequestedByStr;
            }

            // Handle deadline parsing
            String deadlineStr = (String) requestData.get("deadline");
            LocalDateTime deadline = null;
            if (deadlineStr != null && !deadlineStr.trim().isEmpty()) {
                try {
                    // Handle different date formats
                    if (deadlineStr.contains("T")) {
                        // Format from datetime-local input: "2024-01-15T14:30"
                        deadline = LocalDateTime.parse(deadlineStr);
                    } else if (deadlineStr.contains("Z")) {
                        // ISO format with timezone: "2024-01-15T14:30:00.000Z"
                        deadline = LocalDateTime.parse(deadlineStr.replace("Z", ""));
                    } else {
                        // Try parsing as ISO format without Z
                        deadline = LocalDateTime.parse(deadlineStr);
                    }
                } catch (Exception e) {
                    System.err.println("Error parsing deadline: " + deadlineStr + ", error: " + e.getMessage());
                    throw new RuntimeException("Invalid deadline format: " + deadlineStr);
                }
            }

            // Parse enums with error handling
            RequestStatus status;
            PartyType partyType;
            try {
                status = RequestStatus.valueOf(statusStr.toUpperCase());
                partyType = PartyType.valueOf(partyTypeStr.toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new RuntimeException("Invalid status or partyType: " + statusStr + ", " + partyTypeStr);
            }

            // Determine requester name from partyType and requesterId
            String requesterName;
            try {
                if (partyType == PartyType.WAREHOUSE) {
                    Warehouse warehouse = warehouseRepository.findById(requesterId)
                            .orElseThrow(() -> new RuntimeException("Warehouse not found: " + requesterId));
                    requesterName = warehouse.getName();
                } else {
                    throw new RuntimeException("Unsupported party type: " + partyType);
                }
            } catch (Exception e) {
                System.err.println("Error finding requester: " + e.getMessage());
                throw new RuntimeException("Failed to find requester with ID: " + requesterId);
            }

            // Create the RequestOrder
            RequestOrder requestOrder = RequestOrder.builder()
                    .title(title)
                    .description(description)
                    .createdAt(LocalDateTime.now())
                    .createdBy(createdBy)
                    .status(String.valueOf(status))
                    .partyType(String.valueOf(partyType))
                    .requesterId(requesterId)
                    .requesterName(requesterName)
                    .employeeRequestedBy(employeeRequestedBy)
                    .deadline(deadline)
                    .build();

            // Handle items
            Object itemsObj = requestData.get("items");
            if (itemsObj == null) {
                throw new RuntimeException("Items list is required");
            }

            List<Map<String, Object>> itemsData;
            try {
                itemsData = (List<Map<String, Object>>) itemsObj;
            } catch (ClassCastException e) {
                throw new RuntimeException("Invalid items data format");
            }

            if (itemsData.isEmpty()) {
                throw new RuntimeException("At least one item is required");
            }

            List<RequestOrderItem> items = new ArrayList<>();

            for (int i = 0; i < itemsData.size(); i++) {
                final int itemIndex = i; // Create final variable for lambda
                Map<String, Object> itemData = itemsData.get(i);
                try {
                    String itemTypeIdStr = (String) itemData.get("itemTypeId");
                    Object quantityObj = itemData.get("quantity");
                    String comment = (String) itemData.get("comment");

                    if (itemTypeIdStr == null || quantityObj == null) {
                        throw new RuntimeException("Item " + (itemIndex + 1) + ": itemTypeId and quantity are required");
                    }

                    UUID itemTypeId;
                    try {
                        itemTypeId = UUID.fromString(itemTypeIdStr);
                    } catch (IllegalArgumentException e) {
                        throw new RuntimeException("Item " + (itemIndex + 1) + ": Invalid itemTypeId format: " + itemTypeIdStr);
                    }

                    double quantity;
                    try {
                        quantity = Double.parseDouble(quantityObj.toString());
                        if (quantity <= 0) {
                            throw new RuntimeException("Item " + (itemIndex + 1) + ": Quantity must be greater than 0");
                        }
                    } catch (NumberFormatException e) {
                        throw new RuntimeException("Item " + (itemIndex + 1) + ": Invalid quantity format: " + quantityObj);
                    }

                    ItemType itemType = itemTypeRepository.findById(itemTypeId)
                            .orElseThrow(() -> new RuntimeException("Item " + (itemIndex + 1) + ": ItemType not found: " + itemTypeId));

                    RequestOrderItem item = RequestOrderItem.builder()
                            .itemType(itemType)
                            .quantity(quantity)
                            .comment(comment != null ? comment.trim() : "")
                            .requestOrder(requestOrder)
                            .build();

                    items.add(item);
                } catch (Exception e) {
                    System.err.println("Error processing item " + (itemIndex + 1) + ": " + e.getMessage());
                    throw new RuntimeException("Error processing item " + (itemIndex + 1) + ": " + e.getMessage());
                }
            }

            requestOrder.setRequestItems(items);

            // Save and return
            try {
                RequestOrder savedOrder = requestOrderRepository.save(requestOrder);
                System.out.println("Request order created successfully with ID: " + savedOrder.getId());
                return savedOrder;
            } catch (Exception e) {
                System.err.println("Error saving request order: " + e.getMessage());
                throw new RuntimeException("Failed to save request order: " + e.getMessage());
            }

        } catch (RuntimeException e) {
            // Re-throw runtime exceptions with original message
            throw e;
        } catch (Exception e) {
            System.err.println("Unexpected error creating request: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to create request order: " + e.getMessage(), e);
        }
    }

    public List<RequestOrder> getAllRequestOrders() {
        try {
            System.out.println("Fetching all request orders...");

            // Retrieve all request orders from the repository
            List<RequestOrder> requestOrders = requestOrderRepository.findAll();

            // Optional: You can filter, sort, or perform any other operations on the requestOrders list

            return requestOrders;

        } catch (Exception e) {
            System.err.println("Error fetching request orders: " + e.getMessage());
            throw new RuntimeException("Failed to fetch request orders", e);
        }
    }

    public Optional<RequestOrder> findById(UUID id) {
        // This uses a custom repository method that performs the necessary JOIN FETCHes
        return requestOrderRepository.findByIdWithItems(id);
    }

    public RequestOrder updateRequest(UUID requestOrderId, Map<String, Object> requestData) {
        try {
            System.out.println("Updating request order with ID: " + requestOrderId);

            // Find existing request order
            RequestOrder existingOrder = requestOrderRepository.findById(requestOrderId)
                    .orElseThrow(() -> new RuntimeException("Request order not found with ID: " + requestOrderId));

            // Basic info updates
            String title = (String) requestData.get("title");
            String description = (String) requestData.get("description");
            String updatedBy = (String) requestData.get("updatedBy");
            String statusStr = (String) requestData.get("status");
            String partyTypeStr = (String) requestData.get("partyType");
            UUID requesterId = UUID.fromString((String) requestData.get("requesterId"));

            // Other fields
            String deadlineStr = (String) requestData.get("deadline");
            LocalDateTime deadline = LocalDateTime.parse(deadlineStr);

            RequestStatus status = RequestStatus.valueOf(statusStr.toUpperCase());
            PartyType partyType = PartyType.valueOf(partyTypeStr.toUpperCase());

            // Update requester name if requesterId changed
            String requesterName = existingOrder.getRequesterName();
            if (!requesterId.equals(existingOrder.getRequesterId()) ||
                    !partyType.toString().equals(existingOrder.getPartyType())) {

                if (partyType == PartyType.WAREHOUSE) {
                    Warehouse warehouse = warehouseRepository.findById(requesterId)
                            .orElseThrow(() -> new RuntimeException("Warehouse not found: " + requesterId));
                    requesterName = warehouse.getName();
                } else {
                    throw new RuntimeException("Unsupported party type: " + partyType);
                }
            }

            // Update the order properties
            existingOrder.setTitle(title);
            existingOrder.setDescription(description);
            existingOrder.setStatus(String.valueOf(status));
            existingOrder.setPartyType(String.valueOf(partyType));
            existingOrder.setRequesterId(requesterId);
            existingOrder.setRequesterName(requesterName);
            existingOrder.setDeadline(deadline);
            existingOrder.setUpdatedAt(LocalDateTime.now());
            existingOrder.setUpdatedBy(updatedBy);

            // *** FIXED ITEMS UPDATE LOGIC ***
            List<Map<String, Object>> itemsData = (List<Map<String, Object>>) requestData.get("items");

            // Clear existing items completely
            existingOrder.getRequestItems().clear();

            // Add new items from the request data
            for (Map<String, Object> itemData : itemsData) {
                UUID itemTypeId = UUID.fromString((String) itemData.get("itemTypeId"));
                double quantity = Double.parseDouble(itemData.get("quantity").toString());
                String comment = (String) itemData.get("comment");

                ItemType itemType = itemTypeRepository.findById(itemTypeId)
                        .orElseThrow(() -> new RuntimeException("ItemType not found: " + itemTypeId));

                RequestOrderItem item = RequestOrderItem.builder()
                        .itemType(itemType)
                        .quantity(quantity)
                        .comment(comment)
                        .requestOrder(existingOrder)
                        .build();

                existingOrder.getRequestItems().add(item);
            }

            // Save and return the updated order
            return requestOrderRepository.save(existingOrder);

        } catch (Exception e) {
            System.err.println("Error updating request order: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to update request order", e);
        }
    }


    public RequestOrder updateStatus(UUID requestOrderId, String newStatus) {
        try {
            System.out.println("Updating request order status: " + requestOrderId + " -> " + newStatus);

            RequestOrder requestOrder = requestOrderRepository.findById(requestOrderId)
                    .orElseThrow(() -> new RuntimeException("Request order not found with ID: " + requestOrderId));

            requestOrder.setStatus(newStatus);
            requestOrder.setUpdatedAt(LocalDateTime.now());

            // Get username if available from SecurityContext, otherwise use system
            String username = "system";
            try {
                org.springframework.security.core.Authentication authentication =
                        org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
                if (authentication != null && authentication.isAuthenticated()) {
                    username = authentication.getName();
                }
            } catch (Exception e) {
                System.err.println("Error getting authenticated user: " + e.getMessage());
            }

            requestOrder.setApprovedBy(username);
            requestOrder.setApprovedAt(LocalDateTime.now());

            return requestOrderRepository.save(requestOrder);
        } catch (Exception e) {
            System.err.println("Error updating request order status: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to update request order status", e);
        }
    }

    public List<RequestOrder> getRequestsByWarehouseAndStatus(UUID warehouseId, String statusStr) {
        try {
            System.out.println("Fetching requests for warehouse: " + warehouseId + " with status: " + statusStr);

            RequestStatus status = RequestStatus.valueOf(statusStr.toUpperCase());

            // Find all request orders by warehouse and status
            return requestOrderRepository.findByRequesterIdAndStatusAndPartyType(
                    warehouseId, status.name(), PartyType.WAREHOUSE.name()
            );

        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid status value: " + statusStr, e);
        } catch (Exception e) {
            System.err.println("Error fetching requests by warehouse and status: " + e.getMessage());
            throw new RuntimeException("Failed to fetch request orders", e);
        }
    }

    // In RequestOrderService.java
    public Map<String, Object> getRestockValidationInfo(UUID warehouseId, List<UUID> itemTypeIds) {
        Map<String, Object> result = new HashMap<>();
        Map<String, Object> itemValidations = new HashMap<>();

        LocalDateTime threeDaysAgo = LocalDateTime.now().minusDays(3);

        for (UUID itemTypeId : itemTypeIds) {
            // Check for pending or approved requests in last 3 days
            List<RequestOrder> recentRequests = requestOrderRepository
                    .findByWarehouseAndItemTypeAndStatusInAndCreatedAtAfter(
                            warehouseId,
                            itemTypeId,
                            Arrays.asList("PENDING", "APPROVED"),
                            threeDaysAgo
                    );

            Map<String, Object> itemInfo = new HashMap<>();
            itemInfo.put("hasRecentRequest", !recentRequests.isEmpty());
            itemInfo.put("canStillRestock", true); // Always allow, but warn

            if (!recentRequests.isEmpty()) {
                RequestOrder mostRecent = recentRequests.get(0);
                Map<String, Object> requestInfo = new HashMap<>();
                requestInfo.put("id", mostRecent.getId());
                requestInfo.put("status", mostRecent.getStatus());
                requestInfo.put("createdAt", mostRecent.getCreatedAt());
                requestInfo.put("title", mostRecent.getTitle());
                requestInfo.put("daysSince", ChronoUnit.DAYS.between(mostRecent.getCreatedAt(), LocalDateTime.now()));

                itemInfo.put("mostRecentRequest", requestInfo);
            }

            itemValidations.put(itemTypeId.toString(), itemInfo);
        }

        result.put("validations", itemValidations);
        result.put("validationPeriodDays", 3);

        return result;
    }

    }


