package com.example.backend.services.procurement;



import com.example.backend.models.PartyType;
import com.example.backend.models.RequestStatus;
import com.example.backend.models.notification.NotificationType;
import com.example.backend.models.procurement.RequestOrder.RequestOrder;
import com.example.backend.models.procurement.RequestOrder.RequestOrderItem;
import com.example.backend.models.user.Role;
import com.example.backend.models.warehouse.ItemType;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.repositories.procurement.RequestOrderRepository;
import com.example.backend.repositories.warehouse.ItemTypeRepository;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import com.example.backend.services.notification.NotificationService;
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

    @Autowired
    private NotificationService notificationService;

    public RequestOrder createRequest(Map<String, Object> requestData) {
        try {
            System.out.println("Creating request with data: " + requestData);

            // Basic info
            String title = (String) requestData.get("title");
            String description = (String) requestData.get("description");
            String createdBy = (String) requestData.get("createdBy");
            String status = (String) requestData.get("status");
            String partyTypeStr = (String) requestData.get("partyType");
            String requesterIdStr = (String) requestData.get("requesterId");

            // Validate status
            if (status == null || status.trim().isEmpty()) {
                throw new RuntimeException("Status is required");
            }

            // For DRAFT status, only title and createdBy are required
            // For other statuses, all fields are required
            if ("DRAFT".equalsIgnoreCase(status)) {
                if (title == null || title.trim().isEmpty() || createdBy == null) {
                    throw new RuntimeException("Title and createdBy are required for drafts");
                }
            } else {
                if (title == null || description == null || createdBy == null ||
                        status == null || partyTypeStr == null || requesterIdStr == null) {
                    throw new RuntimeException("Missing required fields");
                }
            }

            // Parse requesterId (can be null for drafts)
            UUID requesterId = null;
            if (requesterIdStr != null && !requesterIdStr.trim().isEmpty()) {
                try {
                    requesterId = UUID.fromString(requesterIdStr);
                } catch (IllegalArgumentException e) {
                    throw new RuntimeException("Invalid requesterId format: " + requesterIdStr);
                }
            }

            // Check for duplicate title only if not draft and requesterId exists
            if (!"DRAFT".equalsIgnoreCase(status) && requesterId != null) {
                if (requestOrderRepository.existsByTitleAndRequesterIdAndStatusPending(title.trim(), requesterId)) {
                    throw new RuntimeException("A request order with the title '" + title + "' already exists for this requester. Please use a different title or change the requester.");
                }
            }

            // Handle employeeRequestedBy (can be null)
            String employeeRequestedByStr = (String) requestData.get("employeeRequestedBy");
            String employeeRequestedBy = null;
            if (employeeRequestedByStr != null && !employeeRequestedByStr.trim().isEmpty()) {
                employeeRequestedBy = employeeRequestedByStr;
            }

            // Handle deadline parsing (can be null for drafts)
            String deadlineStr = (String) requestData.get("deadline");
            LocalDateTime deadline = null;
            if (deadlineStr != null && !deadlineStr.trim().isEmpty()) {
                try {
                    if (deadlineStr.contains("T")) {
                        deadline = LocalDateTime.parse(deadlineStr);
                    } else if (deadlineStr.contains("Z")) {
                        deadline = LocalDateTime.parse(deadlineStr.replace("Z", ""));
                    } else {
                        deadline = LocalDateTime.parse(deadlineStr);
                    }
                } catch (Exception e) {
                    System.err.println("Error parsing deadline: " + deadlineStr + ", error: " + e.getMessage());
                    throw new RuntimeException("Invalid deadline format: " + deadlineStr);
                }
            }

            // Parse partyType (can be null for drafts)
            PartyType partyType = null;
            if (partyTypeStr != null && !partyTypeStr.trim().isEmpty()) {
                try {
                    partyType = PartyType.valueOf(partyTypeStr.toUpperCase());
                } catch (IllegalArgumentException e) {
                    throw new RuntimeException("Invalid partyType: " + partyTypeStr);
                }
            }

            // Determine requester name (can be null for drafts)
            // Determine requester name (can be null for drafts)
            String requesterName = null;
            if (requesterId != null && partyType == PartyType.WAREHOUSE) {
                try {
                    final UUID finalRequesterId = requesterId; // Make it final for lambda
                    Warehouse warehouse = warehouseRepository.findById(finalRequesterId)
                            .orElseThrow(() -> new RuntimeException("Warehouse not found: " + finalRequesterId));
                    requesterName = warehouse.getName();
                } catch (Exception e) {
                    System.err.println("Error finding requester: " + e.getMessage());
                    throw new RuntimeException("Failed to find requester with ID: " + requesterId);
                }
            }

            // Create the RequestOrder
            RequestOrder requestOrder = RequestOrder.builder()
                    .title(title)
                    .description(description != null ? description : "")
                    .createdAt(LocalDateTime.now())
                    .createdBy(createdBy)
                    .status(status.toUpperCase())
                    .partyType(partyType != null ? String.valueOf(partyType) : null)
                    .requesterId(requesterId)
                    .requesterName(requesterName)
                    .employeeRequestedBy(employeeRequestedBy)
                    .deadline(deadline)
                    .build();

            // Handle items (optional for drafts)
            Object itemsObj = requestData.get("items");
            List<RequestOrderItem> items = new ArrayList<>();

            if (itemsObj != null) {
                List<Map<String, Object>> itemsData;
                try {
                    itemsData = (List<Map<String, Object>>) itemsObj;
                } catch (ClassCastException e) {
                    throw new RuntimeException("Invalid items data format");
                }

                // For non-draft status, at least one item is required
                if (!"DRAFT".equalsIgnoreCase(status) && itemsData.isEmpty()) {
                    throw new RuntimeException("At least one item is required");
                }

                for (int i = 0; i < itemsData.size(); i++) {
                    final int itemIndex = i;
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
            }

            requestOrder.setRequestItems(items);

            // Save and return
            try {
                RequestOrder savedOrder = requestOrderRepository.save(requestOrder);
                System.out.println("Request order created successfully with ID: " + savedOrder.getId());

                // Send notifications only for non-draft orders with warehouse party type
                if (!"DRAFT".equalsIgnoreCase(status) && partyType == PartyType.WAREHOUSE) {
                    try {
                        if (notificationService != null && !savedOrder.getRequestItems().isEmpty()) {
                            String itemsSummary = savedOrder.getRequestItems().stream()
                                    .map(item -> item.getQuantity() + "x " + item.getItemType().getName())
                                    .collect(java.util.stream.Collectors.joining(", "));

                            // Notify ALL warehouse users
                            String warehouseNotificationTitle = "New Request Order Created";
                            String warehouseNotificationMessage = "Request order '" + savedOrder.getTitle() +
                                    "' has been created by " + savedOrder.getRequesterName() + ": " + itemsSummary;

                            List<Role> warehouseRoles = Arrays.asList(
                                    Role.WAREHOUSE_MANAGER,
                                    Role.WAREHOUSE_EMPLOYEE
                            );

                            notificationService.sendNotificationToUsersByRoles(
                                    warehouseRoles,
                                    warehouseNotificationTitle,
                                    warehouseNotificationMessage,
                                    NotificationType.INFO,
                                    "/warehouses/" + savedOrder.getRequesterId(),
                                    "REQUEST_" + savedOrder.getId()
                            );

                            // Notify ALL procurement users
                            String procurementNotificationTitle = "New Incoming Request Order";
                            String procurementNotificationMessage = "New request order '" + savedOrder.getTitle() +
                                    "' received from " + savedOrder.getRequesterName() + ": " + itemsSummary;

                            List<Role> procurementRoles = Arrays.asList(Role.PROCUREMENT);

                            notificationService.sendNotificationToUsersByRoles(
                                    procurementRoles,
                                    procurementNotificationTitle,
                                    procurementNotificationMessage,
                                    NotificationType.WARNING,
                                    "/procurement/request-orders",
                                    "REQUEST_" + savedOrder.getId()
                            );

                            System.out.println("✅ Request order creation notifications sent successfully");
                        }
                    } catch (Exception e) {
                        System.err.println("⚠️ Failed to send request order creation notifications: " + e.getMessage());
                    }
                }

                return savedOrder;
            } catch (Exception e) {
                System.err.println("Error saving request order: " + e.getMessage());
                throw new RuntimeException("Failed to save request order: " + e.getMessage());
            }

        } catch (RuntimeException e) {
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
        // Use the new method that doesn't fetch purchaseOrders
        return requestOrderRepository.findByIdForDetails(id);
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
            String requesterIdStr = (String) requestData.get("requesterId");

            // Validate status
            if (statusStr == null || statusStr.trim().isEmpty()) {
                throw new RuntimeException("Status is required");
            }

            // For DRAFT status, only title is required
            // For other statuses, all fields are required
            if ("DRAFT".equalsIgnoreCase(statusStr)) {
                if (title == null || title.trim().isEmpty()) {
                    throw new RuntimeException("Title is required");
                }
            } else {
                if (title == null || description == null || statusStr == null ||
                        partyTypeStr == null || requesterIdStr == null) {
                    throw new RuntimeException("Missing required fields");
                }
            }

            // Parse requesterId (can be null for drafts)
            UUID requesterId = null;
            if (requesterIdStr != null && !requesterIdStr.trim().isEmpty()) {
                try {
                    requesterId = UUID.fromString(requesterIdStr);
                } catch (IllegalArgumentException e) {
                    throw new RuntimeException("Invalid requesterId format: " + requesterIdStr);
                }
            }

            // Check for duplicate title only if not draft and requesterId exists
            if (!"DRAFT".equalsIgnoreCase(statusStr) && requesterId != null) {
                if ((!title.trim().equalsIgnoreCase(existingOrder.getTitle().trim()) ||
                        !requesterId.equals(existingOrder.getRequesterId())) &&
                        requestOrderRepository.existsByTitleAndRequesterIdAndStatusPendingExcludingId(
                                title.trim(), requesterId, requestOrderId)) {
                    throw new RuntimeException("A request order with the title '" + title +
                            "' already exists for this requester with PENDING status. Please use a different title.");
                }
            }

            // Handle deadline parsing (can be null for drafts)
            String deadlineStr = (String) requestData.get("deadline");
            LocalDateTime deadline = null;
            if (deadlineStr != null && !deadlineStr.trim().isEmpty()) {
                try {
                    deadline = LocalDateTime.parse(deadlineStr);
                } catch (Exception e) {
                    System.err.println("Error parsing deadline: " + deadlineStr);
                    throw new RuntimeException("Invalid deadline format: " + deadlineStr);
                }
            }

            // Parse partyType (can be null for drafts)
            PartyType partyType = null;
            if (partyTypeStr != null && !partyTypeStr.trim().isEmpty()) {
                try {
                    partyType = PartyType.valueOf(partyTypeStr.toUpperCase());
                } catch (IllegalArgumentException e) {
                    throw new RuntimeException("Invalid partyType: " + partyTypeStr);
                }
            }

            // Update requester name if requesterId changed (can be null for drafts)
            String requesterName = existingOrder.getRequesterName();
            if (requesterId != null && partyType == PartyType.WAREHOUSE) {
                if (!requesterId.equals(existingOrder.getRequesterId()) ||
                        (partyType != null && !partyType.toString().equals(existingOrder.getPartyType()))) {
                    try {
                        final UUID finalRequesterId = requesterId;
                        Warehouse warehouse = warehouseRepository.findById(finalRequesterId)
                                .orElseThrow(() -> new RuntimeException("Warehouse not found: " + finalRequesterId));
                        requesterName = warehouse.getName();
                    } catch (Exception e) {
                        System.err.println("Error finding warehouse: " + e.getMessage());
                        throw new RuntimeException("Failed to find warehouse with ID: " + requesterId);
                    }
                }
            } else if (requesterId == null) {
                // If requesterId is null (draft), clear the requester name
                requesterName = null;
            }

            // Update the order properties
            existingOrder.setTitle(title);
            existingOrder.setDescription(description != null ? description : "");
            existingOrder.setStatus(statusStr.toUpperCase());
            existingOrder.setPartyType(partyType != null ? String.valueOf(partyType) : null);
            existingOrder.setRequesterId(requesterId);
            existingOrder.setRequesterName(requesterName);
            existingOrder.setDeadline(deadline);
            existingOrder.setUpdatedAt(LocalDateTime.now());
            existingOrder.setUpdatedBy(updatedBy);

            // Handle items (optional for drafts)
            Object itemsObj = requestData.get("items");

            // Clear existing items
            existingOrder.getRequestItems().clear();

            if (itemsObj != null) {
                List<Map<String, Object>> itemsData;
                try {
                    itemsData = (List<Map<String, Object>>) itemsObj;
                } catch (ClassCastException e) {
                    throw new RuntimeException("Invalid items data format");
                }

                // For non-draft status, at least one item is required
                if (!"DRAFT".equalsIgnoreCase(statusStr) && itemsData.isEmpty()) {
                    throw new RuntimeException("At least one item is required");
                }

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
                            .comment(comment != null ? comment.trim() : "")
                            .requestOrder(existingOrder)
                            .build();

                    existingOrder.getRequestItems().add(item);
                }
            }

            RequestOrder updatedOrder = requestOrderRepository.save(existingOrder);

            // Send notifications only for non-draft orders with warehouse party type
            if (!"DRAFT".equalsIgnoreCase(statusStr) && partyType == PartyType.WAREHOUSE &&
                    !updatedOrder.getRequestItems().isEmpty()) {
                try {
                    if (notificationService != null) {
                        String itemsSummary = updatedOrder.getRequestItems().stream()
                                .map(item -> item.getQuantity() + "x " + item.getItemType().getName())
                                .collect(java.util.stream.Collectors.joining(", "));

                        // Notify ALL warehouse users
                        String warehouseNotificationTitle = "Request Order Updated";
                        String warehouseNotificationMessage = "Request order '" + updatedOrder.getTitle() +
                                "' has been updated by " + updatedOrder.getRequesterName() + ": " + itemsSummary;

                        List<Role> warehouseRoles = Arrays.asList(
                                Role.WAREHOUSE_MANAGER,
                                Role.WAREHOUSE_EMPLOYEE
                        );

                        notificationService.sendNotificationToUsersByRoles(
                                warehouseRoles,
                                warehouseNotificationTitle,
                                warehouseNotificationMessage,
                                NotificationType.INFO,
                                "/warehouses/" + updatedOrder.getRequesterId(),
                                "REQUEST_" + updatedOrder.getId()
                        );

                        // Notify ALL procurement users
                        String procurementNotificationTitle = "Request Order Updated";
                        String procurementNotificationMessage = "Request order '" + updatedOrder.getTitle() +
                                "' has been updated by " + updatedOrder.getRequesterName() + ": " + itemsSummary;

                        List<Role> procurementRoles = Arrays.asList(Role.PROCUREMENT);

                        notificationService.sendNotificationToUsersByRoles(
                                procurementRoles,
                                procurementNotificationTitle,
                                procurementNotificationMessage,
                                NotificationType.INFO,
                                "/procurement/request-orders",
                                "REQUEST_" + updatedOrder.getId()
                        );

                        System.out.println("✅ Request order update notifications sent successfully");
                    }
                } catch (Exception e) {
                    System.err.println("⚠️ Failed to send request order update notifications: " + e.getMessage());
                }
            }

            return updatedOrder;

        } catch (Exception e) {
            System.err.println("Error updating request order: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to update request order", e);
        }
    }

//    public RequestOrder updateStatus(UUID requestOrderId, String newStatus) {
//        try {
//            System.out.println("Updating request order status: " + requestOrderId + " -> " + newStatus);
//
//            RequestOrder requestOrder = requestOrderRepository.findById(requestOrderId)
//                    .orElseThrow(() -> new RuntimeException("Request order not found with ID: " + requestOrderId));
//
//            requestOrder.setStatus(newStatus);
//            requestOrder.setUpdatedAt(LocalDateTime.now());
//
//            // Get username if available from SecurityContext, otherwise use system
//            String username = "system";
//            try {
//                org.springframework.security.core.Authentication authentication =
//                        org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
//                if (authentication != null && authentication.isAuthenticated()) {
//                    username = authentication.getName();
//                }
//            } catch (Exception e) {
//                System.err.println("Error getting authenticated user: " + e.getMessage());
//            }
//
//            requestOrder.setApprovedBy(username);
//            requestOrder.setApprovedAt(LocalDateTime.now());
//
//            return requestOrderRepository.save(requestOrder);
//        } catch (Exception e) {
//            System.err.println("Error updating request order status: " + e.getMessage());
//            e.printStackTrace();
//            throw new RuntimeException("Failed to update request order status", e);
//        }
//    }

    public RequestOrder updateStatus(UUID requestOrderId, String newStatus) {
        try {
            System.out.println("Updating request order status: " + requestOrderId + " -> " + newStatus);

            RequestOrder requestOrder = requestOrderRepository.findById(requestOrderId)
                    .orElseThrow(() -> new RuntimeException("Request order not found with ID: " + requestOrderId));

            String oldStatus = requestOrder.getStatus();
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

            RequestOrder updatedOrder = requestOrderRepository.save(requestOrder);

            // Send notifications only if party type is WAREHOUSE
            if (PartyType.WAREHOUSE.name().equals(requestOrder.getPartyType())) {
                try {
                    if (notificationService != null) {
                        String itemsSummary = updatedOrder.getRequestItems().stream()
                                .map(item -> item.getQuantity() + "x " + item.getItemType().getName())
                                .collect(java.util.stream.Collectors.joining(", "));

                        // Determine notification type based on status
                        NotificationType notificationType;
                        if ("APPROVED".equalsIgnoreCase(newStatus)) {
                            notificationType = NotificationType.SUCCESS;
                        } else if ("REJECTED".equalsIgnoreCase(newStatus)) {
                            notificationType = NotificationType.ERROR;
                        } else {
                            notificationType = NotificationType.INFO;
                        }

                        // Notify ALL warehouse users
                        String warehouseNotificationTitle = "Request Order Status Changed";
                        String warehouseNotificationMessage = "Request order '" + updatedOrder.getTitle() +
                                "' status changed from " + oldStatus + " to " + newStatus + ": " + itemsSummary;

                        List<Role> warehouseRoles = Arrays.asList(
                                Role.WAREHOUSE_MANAGER,
                                Role.WAREHOUSE_EMPLOYEE
                        );

                        notificationService.sendNotificationToUsersByRoles(
                                warehouseRoles,
                                warehouseNotificationTitle,
                                warehouseNotificationMessage,
                                notificationType,
                                "/warehouses/" + updatedOrder.getRequesterId(),
                                "REQUEST_" + updatedOrder.getId()
                        );

                        // Notify ALL procurement users
                        String procurementNotificationTitle = "Request Order Status Changed";
                        String procurementNotificationMessage = "Request order '" + updatedOrder.getTitle() +
                                "' status changed from " + oldStatus + " to " + newStatus + ": " + itemsSummary;

                        List<Role> procurementRoles = Arrays.asList(Role.PROCUREMENT);

                        notificationService.sendNotificationToUsersByRoles(
                                procurementRoles,
                                procurementNotificationTitle,
                                procurementNotificationMessage,
                                notificationType,
                                "/procurement/request-orders",
                                "REQUEST_" + updatedOrder.getId()
                        );

                        System.out.println("✅ Request order status change notifications sent successfully");
                    }
                } catch (Exception e) {
                    System.err.println("⚠️ Failed to send request order status change notifications: " + e.getMessage());
                }
            }

            return updatedOrder;
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

    public void deleteRequest(UUID requestOrderId) {
        try {
            System.out.println("Deleting request order with ID: " + requestOrderId);

            RequestOrder requestOrder = requestOrderRepository.findById(requestOrderId)
                    .orElseThrow(() -> new RuntimeException("Request order not found with ID: " + requestOrderId));

            // Only allow deletion of DRAFT orders
            if (!"DRAFT".equalsIgnoreCase(requestOrder.getStatus())) {
                throw new RuntimeException("Only draft request orders can be deleted");
            }

            requestOrderRepository.delete(requestOrder);
            System.out.println("Request order deleted successfully");
        } catch (Exception e) {
            System.err.println("Error deleting request order: " + e.getMessage());
            throw new RuntimeException("Failed to delete request order: " + e.getMessage());
        }
    }

    }


