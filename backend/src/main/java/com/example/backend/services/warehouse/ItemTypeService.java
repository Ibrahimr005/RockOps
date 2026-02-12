package com.example.backend.services.warehouse;


import com.example.backend.dto.warehouse.ItemTypeDetailsDTO;
import com.example.backend.dto.warehouse.ItemTypePriceHistoryDTO;
import com.example.backend.dto.warehouse.ItemTypeWarehouseDistributionDTO;
import com.example.backend.models.finance.inventoryValuation.ApprovalStatus;
import com.example.backend.models.finance.inventoryValuation.ItemPriceApproval;
import com.example.backend.models.notification.NotificationType;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrder;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderItem;
import com.example.backend.models.user.Role;
import com.example.backend.models.warehouse.*;
import com.example.backend.repositories.finance.inventoryValuation.ItemPriceApprovalRepository;
import com.example.backend.repositories.procurement.PurchaseOrderRepository;
import com.example.backend.repositories.warehouse.ItemCategoryRepository;
import com.example.backend.repositories.warehouse.ItemRepository;
import com.example.backend.repositories.warehouse.ItemTypeRepository;
import com.example.backend.services.notification.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ItemTypeService {

    @Autowired
    private ItemTypeRepository itemTypeRepository;

    @Autowired
    private ItemCategoryRepository itemCategoryRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private ItemPriceApprovalRepository itemPriceApprovalRepository;

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    public ItemType addItemType(Map<String, Object> requestBody) {
        ItemType itemType = new ItemType();

        if (requestBody.containsKey("name")) {
            itemType.setName((String) requestBody.get("name"));
        }
        if (requestBody.containsKey("comment")) {
            itemType.setComment((String) requestBody.get("comment"));
        }
        if (requestBody.containsKey("measuringUnit")) {
            itemType.setMeasuringUnit((String) requestBody.get("measuringUnit"));
        }
        if (requestBody.containsKey("status")) {
            itemType.setStatus((String) requestBody.get("status"));
        }
        if (requestBody.containsKey("minQuantity")) {
            itemType.setMinQuantity((int) requestBody.get("minQuantity"));
        }
        if (requestBody.containsKey("serialNumber")) {
            itemType.setSerialNumber((String) requestBody.get("serialNumber"));
        }
        if (requestBody.containsKey("basePrice")) {
            Object basePriceObj = requestBody.get("basePrice");
            if (basePriceObj != null) {
                if (basePriceObj instanceof Number) {
                    itemType.setBasePrice(((Number) basePriceObj).doubleValue());
                } else if (basePriceObj instanceof String) {
                    try {
                        itemType.setBasePrice(Double.parseDouble((String) basePriceObj));
                    } catch (NumberFormatException e) {
                        throw new IllegalArgumentException("Invalid base price format");
                    }
                }
                itemType.setBasePriceUpdatedAt(LocalDateTime.now());
                // Assuming you have a way to get current username, otherwise use "SYSTEM"
                itemType.setBasePriceUpdatedBy("SYSTEM"); // Replace with actual username if available
            }
        }

        if (requestBody.containsKey("itemCategory")) {
            UUID categoryId = UUID.fromString((String) requestBody.get("itemCategory"));
            ItemCategory category = itemCategoryRepository.findById(categoryId)
                    .orElseThrow(() -> new IllegalArgumentException("ItemCategory not found with id: " + categoryId));
            itemType.setItemCategory(category);
        }

        ItemType savedItemType = itemTypeRepository.save(itemType);

// Send notification to warehouse users and ADMIN
        try {
            if (notificationService != null) {
                String notificationTitle = "New Item Type Created";
                String notificationMessage = "A new item type '" + savedItemType.getName() +
                        "' has been added to the system";

                List<Role> targetRoles = Arrays.asList(
                        Role.WAREHOUSE_MANAGER,
                        Role.WAREHOUSE_EMPLOYEE,
                        Role.ADMIN
                );

                notificationService.sendNotificationToUsersByRoles(
                        targetRoles,
                        notificationTitle,
                        notificationMessage,
                        NotificationType.SUCCESS,
                        "/warehouses/item-types",
                        "ItemType_" + savedItemType.getId()
                );

                System.out.println("✅ Item type creation notifications sent successfully");
            }
        } catch (Exception e) {
            System.err.println("⚠️ Failed to send item type creation notification: " + e.getMessage());
        }

        return savedItemType;

        //return itemTypeRepository.save(itemType);
    }

    public ItemType getItemTypeById(UUID id) {
        return itemTypeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("ItemType not found"));
    }

    public List<ItemType> getAllItemTypes() {
        return itemTypeRepository.findAll();
    }

    public ItemType updateItemType(UUID id, Map<String, Object> requestBody) {
        ItemType existingItemType = getItemTypeById(id);

        if (requestBody.containsKey("name")) {
            existingItemType.setName((String) requestBody.get("name"));
        }
        if (requestBody.containsKey("measuringUnit")) {
            existingItemType.setMeasuringUnit((String) requestBody.get("measuringUnit"));
        }
        if (requestBody.containsKey("status")) {
            existingItemType.setStatus((String) requestBody.get("status"));
        }
        if (requestBody.containsKey("minQuantity")) {
            Integer minQuantity = (Integer) requestBody.get("minQuantity");
            if (minQuantity >= 0) {
                existingItemType.setMinQuantity(minQuantity);
            }
        }
        if (requestBody.containsKey("serialNumber")) {
            existingItemType.setSerialNumber((String) requestBody.get("serialNumber"));
        }
        if (requestBody.containsKey("itemCategory")) {
            UUID categoryId = UUID.fromString((String) requestBody.get("itemCategory"));
            ItemCategory category = itemCategoryRepository.findById(categoryId)
                    .orElseThrow(() -> new IllegalArgumentException("ItemCategory not found with id: " + categoryId));
            existingItemType.setItemCategory(category);
        }
        if (requestBody.containsKey("comment")) {
            String comment = (String) requestBody.get("comment");
            existingItemType.setComment((comment == null || comment.trim().isEmpty()) ? "No comment" : comment);
        }
        if (requestBody.containsKey("basePrice")) {
            Object basePriceObj = requestBody.get("basePrice");
            if (basePriceObj != null) {
                if (basePriceObj instanceof Number) {
                    existingItemType.setBasePrice(((Number) basePriceObj).doubleValue());
                } else if (basePriceObj instanceof String) {
                    try {
                        existingItemType.setBasePrice(Double.parseDouble((String) basePriceObj));
                    } catch (NumberFormatException e) {
                        throw new IllegalArgumentException("Invalid base price format");
                    }
                }
                existingItemType.setBasePriceUpdatedAt(LocalDateTime.now());
                existingItemType.setBasePriceUpdatedBy("SYSTEM"); // Replace with actual username if available
            }
        }

        ItemType updatedItemType = itemTypeRepository.save(existingItemType);

// Send notification to warehouse users and ADMIN
        try {
            if (notificationService != null) {
                String notificationTitle = "Item Type Updated";
                String notificationMessage = "Item type '" + updatedItemType.getName() +
                        "' has been updated";

                List<Role> targetRoles = Arrays.asList(
                        Role.WAREHOUSE_MANAGER,
                        Role.WAREHOUSE_EMPLOYEE,
                        Role.ADMIN
                );

                notificationService.sendNotificationToUsersByRoles(
                        targetRoles,
                        notificationTitle,
                        notificationMessage,
                        NotificationType.INFO,
                        "/warehouses/item-types",
                        "ItemType_" + updatedItemType.getId()
                );

                System.out.println("✅ Item type update notifications sent successfully");
            }
        } catch (Exception e) {
            System.err.println("⚠️ Failed to send item type update notification: " + e.getMessage());
        }

        return updatedItemType;

       // return itemTypeRepository.save(existingItemType);
    }

    public void deleteItemType(UUID id) {
        ItemType itemType = itemTypeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("ItemType not found with id: " + id));

        // Check for warehouse items
        if (!itemType.getItems().isEmpty()) {
            throw new RuntimeException("ITEMS_EXIST");
        }

        // Check for transaction items
        if (!itemType.getTransactionItems().isEmpty()) {
            throw new RuntimeException("TRANSACTION_ITEMS_EXIST");
        }

        // Check for request order items
        if (!itemType.getRequestOrderItems().isEmpty()) {
            throw new RuntimeException("REQUEST_ORDER_ITEMS_EXIST");
        }

        // Check for offer items
        if (!itemType.getOfferItems().isEmpty()) {
            throw new RuntimeException("OFFER_ITEMS_EXIST");
        }

// Store item type name for notification
        String itemTypeName = itemType.getName();

// Send notification to warehouse users and ADMIN
        try {
            if (notificationService != null) {
                String notificationTitle = "Item Type Deleted";
                String notificationMessage = "Item type '" + itemTypeName +
                        "' has been removed from the system";

                List<Role> targetRoles = Arrays.asList(
                        Role.WAREHOUSE_MANAGER,
                        Role.WAREHOUSE_EMPLOYEE,
                        Role.ADMIN
                );

                notificationService.sendNotificationToUsersByRoles(
                        targetRoles,
                        notificationTitle,
                        notificationMessage,
                        NotificationType.WARNING,
                        "/warehouses/item-types",
                        "ItemType"
                );

                System.out.println("✅ Item type deletion notifications sent successfully");
            }
        } catch (Exception e) {
            System.err.println("⚠️ Failed to send item type deletion notification: " + e.getMessage());
        }

// If no dependencies, proceed with deletion
        itemType.setItemCategory(null);
        itemTypeRepository.delete(itemType);
    }

    /**
     * Get item type details with warehouse distribution
     */
    public ItemTypeDetailsDTO getItemTypeDetails(UUID itemTypeId) {
        ItemType itemType = itemTypeRepository.findById(itemTypeId)
                .orElseThrow(() -> new IllegalArgumentException("Item type not found"));

        // Get all items of this type across all warehouses (IN_WAREHOUSE status)
        List<Item> items = itemRepository.findByItemTypeAndItemStatus(itemType, ItemStatus.IN_WAREHOUSE);

        // Calculate totals
        int totalQuantity = items.stream().mapToInt(Item::getQuantity).sum();
        double totalValue = items.stream()
                .filter(item -> item.getTotalValue() != null)
                .mapToDouble(Item::getTotalValue)
                .sum();

        // Get unique warehouses count
        long warehouseCount = items.stream()
                .map(item -> item.getWarehouse().getId())
                .distinct()
                .count();

        // Group by warehouse for distribution
        List<ItemTypeWarehouseDistributionDTO> distribution = items.stream()
                .collect(Collectors.groupingBy(item -> item.getWarehouse().getId()))
                .entrySet().stream()
                .map(entry -> {
                    List<Item> warehouseItems = entry.getValue();
                    Item firstItem = warehouseItems.get(0);
                    Warehouse warehouse = firstItem.getWarehouse();

                    int qty = warehouseItems.stream().mapToInt(Item::getQuantity).sum();
                    Double unitPrice = warehouseItems.stream()
                            .filter(i -> i.getUnitPrice() != null)
                            .findFirst()
                            .map(Item::getUnitPrice)
                            .orElse(null);
                    double value = warehouseItems.stream()
                            .filter(i -> i.getTotalValue() != null)
                            .mapToDouble(Item::getTotalValue)
                            .sum();

                    return ItemTypeWarehouseDistributionDTO.builder()
                            .warehouseId(warehouse.getId())
                            .warehouseName(warehouse.getName())
                            .siteName(warehouse.getSite() != null ? warehouse.getSite().getName() : "Unknown")
                            .quantity(qty)
                            .unitPrice(unitPrice)
                            .totalValue(value)
                            .lastUpdated(warehouseItems.stream()
                                    .map(Item::getCreatedAt)
                                    .filter(Objects::nonNull)
                                    .max(LocalDateTime::compareTo)
                                    .map(LocalDateTime::toString)
                                    .orElse(null))
                            .build();
                })
                .collect(Collectors.toList());

        // Get price approval history for this item type
        List<ItemPriceApproval> approvals = itemPriceApprovalRepository
                .findByItemItemTypeOrderByApprovedAtDesc(itemType);

        List<ItemTypePriceHistoryDTO> priceHistory = approvals.stream()
                .filter(a -> a.getApprovalStatus() == ApprovalStatus.APPROVED)
                .map(a -> ItemTypePriceHistoryDTO.builder()
                        .approvalId(a.getId())
                        .warehouseName(a.getWarehouse().getName())
                        .approvedPrice(a.getApprovedPrice())
                        .quantity(a.getItem().getQuantity())
                        .approvedBy(a.getApprovedBy())
                        .approvedAt(a.getApprovedAt() != null ? a.getApprovedAt().toString() : null)
                        .build())
                .collect(Collectors.toList());

        // Calculate average price
        Double avgPrice = items.stream()
                .filter(i -> i.getUnitPrice() != null && i.getUnitPrice() > 0)
                .mapToDouble(Item::getUnitPrice)
                .average()
                .orElse(0.0);

        // Get pending approvals count
        long pendingCount = itemPriceApprovalRepository
                .countByItemItemTypeAndApprovalStatus(itemType, ApprovalStatus.PENDING);

        return ItemTypeDetailsDTO.builder()
                .itemTypeId(itemType.getId())
                .itemTypeName(itemType.getName())
                .categoryName(itemType.getItemCategory() != null ? itemType.getItemCategory().getName() : null)
                .parentCategoryName(itemType.getItemCategory() != null && itemType.getItemCategory().getParentCategory() != null
                        ? itemType.getItemCategory().getParentCategory().getName() : null)
                .measuringUnit(itemType.getMeasuringUnit())
                .basePrice(itemType.getBasePrice())
                .minQuantity(itemType.getMinQuantity())
                .serialNumber(itemType.getSerialNumber())
                .totalQuantity(totalQuantity)
                .totalValue(totalValue)
                .averageUnitPrice(avgPrice)
                .warehouseCount((int) warehouseCount)
                .pendingApprovalsCount((int) pendingCount)
                .warehouseDistribution(distribution)
                .priceHistory(priceHistory)
                .build();
    }

    /**
     * Update base price for a specific item type using weighted average of last 3 completed POs
     * Called automatically when a PO is marked as COMPLETED
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void updateItemTypeBasePriceFromCompletedPOs(UUID itemTypeId, String updatedBy) {
        try {
            ItemType itemType = itemTypeRepository.findById(itemTypeId)
                    .orElseThrow(() -> new RuntimeException("ItemType not found"));

            System.out.println("📊 Calculating base price for: " + itemType.getName());

            // Find last 3 COMPLETED POs that contain this ItemType
            List<PurchaseOrder> last3CompletedPOs = findLast3CompletedPOsWithItemType(itemTypeId);

            if (last3CompletedPOs.isEmpty()) {
                System.out.println("  ⚠️ No completed POs found for " + itemType.getName());
                return;
            }

            System.out.println("  📦 Found " + last3CompletedPOs.size() + " completed POs");

            // Calculate weighted average across ALL items from these POs
            double totalCost = 0.0;
            double totalQuantity = 0.0;

            for (PurchaseOrder po : last3CompletedPOs) {
                System.out.println("    Processing PO: " + po.getPoNumber());

                for (PurchaseOrderItem item : po.getPurchaseOrderItems()) {
                    if (item.getItemType() != null && item.getItemType().getId().equals(itemTypeId)) {
                        double itemCost = item.getUnitPrice() * item.getQuantity();
                        totalCost += itemCost;
                        totalQuantity += item.getQuantity();

                        String merchantName = "N/A";
                        try {
                            if (item.getMerchant() != null) {
                                merchantName = item.getMerchant().getName();
                            }
                        } catch (Exception e) {
                            System.err.println("      ⚠️ Could not load merchant name: " + e.getMessage());
                        }

                        System.out.println("      • PO: " + po.getPoNumber() +
                                " | Merchant: " + merchantName +
                                " | Qty: " + item.getQuantity() +
                                " | Unit Price: " + String.format("%.2f", item.getUnitPrice()));
                    }
                }
            }

            if (totalQuantity > 0) {
                double oldPrice = itemType.getBasePrice() != null ? itemType.getBasePrice() : 0.0;
                double newPrice = totalCost / totalQuantity;

                itemType.setBasePrice(newPrice);
                itemType.setBasePriceUpdatedAt(LocalDateTime.now());
                itemType.setBasePriceUpdatedBy(updatedBy);
                itemTypeRepository.save(itemType);

                System.out.println("  ✅ Base price updated: " +
                        String.format("%.2f", oldPrice) + " → " + String.format("%.2f", newPrice));
            } else {
                System.out.println("  ⚠️ No quantity found for calculation");
            }

        } catch (Exception e) {
            System.err.println("  ❌ Error updating base price: " + e.getClass().getName());
            System.err.println("  ❌ Message: " + e.getMessage());
            e.printStackTrace();
            System.err.println("  ⚠️ Could not update base price, but continuing anyway");
        }
    }
    private List<PurchaseOrder> findLast3CompletedPOsWithItemType(UUID itemTypeId) {
        System.out.println("  🔍 Fetching completed POs from repository...");
        List<PurchaseOrder> allCompletedPOs = purchaseOrderRepository.findCompletedPOsWithItems();
        System.out.println("  📋 Total completed POs fetched: " + allCompletedPOs.size());

        return allCompletedPOs.stream()
                .filter(po -> {
                    System.out.println("  🔎 Checking PO: " + po.getPoNumber());
                    try {
                        boolean hasItemType = po.getPurchaseOrderItems().stream()
                                .anyMatch(item -> item.getItemType() != null &&
                                        item.getItemType().getId().equals(itemTypeId));
                        System.out.println("    Result: " + hasItemType);
                        return hasItemType;
                    } catch (Exception e) {
                        System.err.println("    ❌ Error checking PO: " + e.getMessage());
                        e.printStackTrace();
                        return false;
                    }
                })
                .limit(3)
                .collect(Collectors.toList());
    }
}
