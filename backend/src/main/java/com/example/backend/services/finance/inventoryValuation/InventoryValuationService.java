package com.example.backend.services.finance.inventoryValuation;

import com.example.backend.dto.finance.inventoryValuation.*;
import com.example.backend.models.PartyType;
import com.example.backend.models.finance.inventoryValuation.ApprovalStatus;
import com.example.backend.models.finance.inventoryValuation.ItemPriceApproval;
import com.example.backend.models.notification.NotificationType;
import com.example.backend.models.site.Site;
import com.example.backend.models.transaction.Transaction;
import com.example.backend.models.transaction.TransactionItem;
import com.example.backend.models.user.Role;
import com.example.backend.models.warehouse.Item;
import com.example.backend.models.warehouse.ItemStatus;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.repositories.finance.inventoryValuation.ItemPriceApprovalRepository;
import com.example.backend.repositories.site.SiteRepository;
import com.example.backend.repositories.transaction.TransactionRepository;
import com.example.backend.repositories.warehouse.ItemRepository;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import com.example.backend.services.notification.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class InventoryValuationService {

    @Autowired
    private ItemPriceApprovalRepository itemPriceApprovalRepository;

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private WarehouseRepository warehouseRepository;

    @Autowired
    private SiteRepository siteRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private TransactionRepository transactionRepository;

    /**
     * Get all pending item price approvals across all warehouses
     */
    public List<PendingItemApprovalDTO> getAllPendingApprovals() {
        List<ItemPriceApproval> pendingApprovals = itemPriceApprovalRepository
                .findByApprovalStatusOrderByRequestedAtDesc(ApprovalStatus.PENDING);

        return pendingApprovals.stream()
                .map(this::convertToPendingApprovalDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get pending approvals for a specific warehouse
     */
    public List<PendingItemApprovalDTO> getPendingApprovalsByWarehouse(UUID warehouseId) {
        Warehouse warehouse = warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new IllegalArgumentException("Warehouse not found"));

        List<ItemPriceApproval> pendingApprovals = itemPriceApprovalRepository
                .findByWarehouseAndApprovalStatusOrderByRequestedAtDesc(warehouse, ApprovalStatus.PENDING);

        return pendingApprovals.stream()
                .map(this::convertToPendingApprovalDTO)
                .collect(Collectors.toList());
    }

    /**
     * Approve a single item price
     */
    @Transactional
    public ItemPriceApproval approveItemPrice(UUID itemId, Double approvedPrice, String approvedBy) {
        System.out.println("💰 Approving price for item: " + itemId + " with price: " + approvedPrice);

        // Find the approval request
        ItemPriceApproval approval = itemPriceApprovalRepository.findByItemId(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Price approval request not found for item"));

        if (approval.getApprovalStatus() != ApprovalStatus.PENDING) {
            throw new IllegalArgumentException("Item price has already been processed");
        }

        // Get the item
        Item item = approval.getItem();

        // Update item with price
        item.setUnitPrice(approvedPrice);
        item.calculateTotalValue(); // This sets totalValue = quantity * unitPrice
        item.setItemStatus(ItemStatus.IN_WAREHOUSE); // Move from PENDING to IN_WAREHOUSE
        item.setPriceApprovedBy(approvedBy);
        item.setPriceApprovedAt(LocalDateTime.now());

        itemRepository.save(item);
        System.out.println("✅ Item price set: " + approvedPrice + ", Total value: " + item.getTotalValue());

        // Update approval record
        approval.setApprovalStatus(ApprovalStatus.APPROVED);
        approval.setApprovedPrice(approvedPrice);
        approval.setApprovedBy(approvedBy);
        approval.setApprovedAt(LocalDateTime.now());

        ItemPriceApproval savedApproval = itemPriceApprovalRepository.save(approval);

        // Update warehouse balance
        updateWarehouseBalance(item.getWarehouse().getId());

        // Update site balance
        updateSiteBalance(item.getWarehouse().getSite().getId());

        // Send notification to warehouse users
        try {
            String warehouseName = item.getWarehouse().getName();
            String itemTypeName = item.getItemType().getName();

            notificationService.sendNotificationToUsersByRoles(
                    Arrays.asList(Role.WAREHOUSE_MANAGER, Role.WAREHOUSE_EMPLOYEE),
                    "Item Price Approved",
                    itemTypeName + " (" + item.getQuantity() + " units) in " + warehouseName +
                            " has been approved at " + approvedPrice + " per unit",
                    NotificationType.SUCCESS,
                    "/warehouses/" + item.getWarehouse().getId(),
                    "ITEM_" + item.getId()
            );
        } catch (Exception e) {
            System.err.println("⚠️ Failed to send approval notification: " + e.getMessage());
        }

        return savedApproval;
    }

    /**
     * Bulk approve multiple item prices
     */
    @Transactional
    public List<ItemPriceApproval> bulkApproveItemPrices(BulkPriceApprovalRequestDTO request, String approvedBy) {
        List<ItemPriceApproval> approvedItems = new ArrayList<>();

        for (ItemPriceApprovalRequestDTO itemApproval : request.getItems()) {
            try {
                ItemPriceApproval approved = approveItemPrice(
                        itemApproval.getItemId(),
                        itemApproval.getUnitPrice(),
                        approvedBy
                );
                approvedItems.add(approved);
            } catch (Exception e) {
                System.err.println("❌ Failed to approve item " + itemApproval.getItemId() + ": " + e.getMessage());
                // Continue with other items
            }
        }

        System.out.println("✅ Bulk approval completed: " + approvedItems.size() + "/" + request.getItems().size());
        return approvedItems;
    }

    /**
     * Update warehouse balance based on all IN_WAREHOUSE items
     */
    @Transactional
    public void updateWarehouseBalance(UUID warehouseId) {
        System.out.println("📊 Updating balance for warehouse: " + warehouseId);

        Warehouse warehouse = warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new IllegalArgumentException("Warehouse not found"));

        // Calculate total value from all IN_WAREHOUSE items
        Double totalValue = itemRepository.calculateWarehouseBalance(warehouse);

        warehouse.setBalance(totalValue != null ? totalValue : 0.0);
        warehouse.setBalanceUpdatedAt(LocalDateTime.now());

        warehouseRepository.save(warehouse);

        System.out.println("✅ Warehouse balance updated: " + warehouse.getBalance());
    }

    /**
     * Update site balance (sum of all warehouse balances in site)
     */
    @Transactional
    public void updateSiteBalance(UUID siteId) {
        System.out.println("📊 Updating balance for site: " + siteId);

        Site site = siteRepository.findById(siteId)
                .orElseThrow(() -> new IllegalArgumentException("Site not found"));

        // Sum all warehouse balances in this site
        Double totalBalance = site.getWarehouses().stream()
                .mapToDouble(warehouse -> warehouse.getBalance() != null ? warehouse.getBalance() : 0.0)
                .sum();

        site.setTotalBalance(totalBalance);
        site.setBalanceUpdatedAt(LocalDateTime.now());

        siteRepository.save(site);

        System.out.println("✅ Site balance updated: " + site.getTotalBalance());
    }

    /**
     * Get balance information for a specific warehouse
     */
    public WarehouseBalanceDTO getWarehouseBalance(UUID warehouseId) {
        Warehouse warehouse = warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new IllegalArgumentException("Warehouse not found"));

        Integer totalItems = itemRepository.getTotalQuantityInWarehouse(warehouse);
        Long pendingCount = itemPriceApprovalRepository.countPendingApprovalsByWarehouse(warehouse);

        return WarehouseBalanceDTO.builder()
                .warehouseId(warehouse.getId())
                .warehouseName(warehouse.getName())
                .siteId(warehouse.getSite().getId())
                .siteName(warehouse.getSite().getName())
                .totalValue(warehouse.getBalance() != null ? warehouse.getBalance() : 0.0)
                .totalItems(totalItems != null ? totalItems : 0)
                .pendingApprovalCount(pendingCount.intValue())
                .build();
    }

    /**
     * Get all warehouse balances for a site
     */
    public SiteBalanceDTO getSiteBalance(UUID siteId) {
        Site site = siteRepository.findById(siteId)
                .orElseThrow(() -> new IllegalArgumentException("Site not found"));

        List<WarehouseBalanceDTO> warehouseBalances = site.getWarehouses().stream()
                .map(warehouse -> getWarehouseBalance(warehouse.getId()))
                .collect(Collectors.toList());

        return SiteBalanceDTO.builder()
                .siteId(site.getId())
                .siteName(site.getName())
                .totalValue(site.getTotalBalance() != null ? site.getTotalBalance() : 0.0)
                .totalWarehouses(site.getWarehouses().size())
                .warehouses(warehouseBalances)
                .build();
    }

    /**
     * Get all site balances
     */
    public List<SiteBalanceDTO> getAllSiteBalances() {
        List<Site> sites = siteRepository.findAll();

        return sites.stream()
                .map(site -> getSiteBalance(site.getId()))
                .collect(Collectors.toList());
    }

    /**
     * Helper method to convert ItemPriceApproval to DTO
     */
    private PendingItemApprovalDTO convertToPendingApprovalDTO(ItemPriceApproval approval) {
        Item item = approval.getItem();

        return PendingItemApprovalDTO.builder()
                .itemId(item.getId())
                .warehouseId(approval.getWarehouse().getId())
                .warehouseName(approval.getWarehouse().getName())
                .siteName(approval.getWarehouse().getSite().getName())
                .itemTypeId(item.getItemType().getId())
                .itemTypeName(item.getItemType().getName())
                .itemTypeCategory(item.getItemType().getItemCategory().getName())
                .measuringUnit(item.getItemType().getMeasuringUnit())
                .quantity(item.getQuantity())
                .suggestedPrice(approval.getSuggestedPrice())
                .createdBy(approval.getRequestedBy())
                .createdAt(approval.getRequestedAt().toString())
                .comment(item.getComment())
                .build();
    }

    /**
     * Get all approved item price approvals (history)
     */
    public List<ApprovedItemHistoryDTO> getApprovalHistory() {
        List<ItemPriceApproval> approvedItems = itemPriceApprovalRepository
                .findByApprovalStatusOrderByApprovedAtDesc(ApprovalStatus.APPROVED);

        return approvedItems.stream()
                .map(this::convertToApprovedHistoryDTO)
                .collect(Collectors.toList());
    }

    /**
     * Helper method to convert ItemPriceApproval to Approved History DTO
     */
    private ApprovedItemHistoryDTO convertToApprovedHistoryDTO(ItemPriceApproval approval) {
        Item item = approval.getItem();

        return ApprovedItemHistoryDTO.builder()
                .itemId(item.getId())
                .warehouseId(approval.getWarehouse().getId())
                .warehouseName(approval.getWarehouse().getName())
                .siteName(approval.getWarehouse().getSite().getName())
                .itemTypeName(item.getItemType().getName())
                .itemTypeCategory(item.getItemType().getItemCategory().getName())
                .measuringUnit(item.getItemType().getMeasuringUnit())
                .quantity(item.getQuantity())
                .approvedPrice(approval.getApprovedPrice())
                .totalValue(approval.getApprovedPrice() * item.getQuantity())
                .approvedBy(approval.getApprovedBy())
                .approvedAt(approval.getApprovedAt().toString())
                .build();
    }

    /**
     * Get item breakdown (value composition) for a warehouse
     */
    public List<ItemBreakdownDTO> getWarehouseItemBreakdown(UUID warehouseId) {
        Warehouse warehouse = warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new IllegalArgumentException("Warehouse not found"));

        // Get all IN_WAREHOUSE items with approved prices
        List<Item> items = itemRepository.findByWarehouseAndItemStatus(warehouse, ItemStatus.IN_WAREHOUSE);

        return items.stream()
                .filter(item -> item.getUnitPrice() != null && item.getUnitPrice() > 0)
                .map(item -> ItemBreakdownDTO.builder()
                        .itemId(item.getId())
                        .itemName(item.getItemType().getName())
                        .quantity(item.getQuantity())
                        .measuringUnit(item.getItemType().getMeasuringUnit())
                        .unitPrice(item.getUnitPrice())
                        .totalValue(item.getTotalValue())
                        .build())
                .collect(Collectors.toList());
    }
    /**
     * Get transaction history for a warehouse (finance view)
     */
    /**
     * Get transaction history for a warehouse (finance view)
     * Returns one row per transaction item
     */
    public List<WarehouseTransactionHistoryDTO> getWarehouseTransactionHistory(UUID warehouseId) {
        Warehouse warehouse = warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new IllegalArgumentException("Warehouse not found"));

        // Get all transactions where this warehouse is sender or receiver
        List<Transaction> transactions = transactionRepository.findBySenderIdOrReceiverId(warehouseId, warehouseId);

        List<WarehouseTransactionHistoryDTO> result = new ArrayList<>();

        for (Transaction tx : transactions) {
            // Get sender and receiver names
            String senderName = getEntityName(tx.getSenderType(), tx.getSenderId());
            String receiverName = getEntityName(tx.getReceiverType(), tx.getReceiverId());

            // Create one row per transaction item
            for (TransactionItem txItem : tx.getItems()) {
                // Get unit price from warehouse items
                Double unitPrice = getItemUnitPrice(txItem.getItemType().getId(), warehouseId);

                // Determine quantity based on role
                boolean isReceiver = tx.getReceiverId().equals(warehouseId);
                Integer quantity = isReceiver
                        ? (txItem.getReceivedQuantity() != null ? txItem.getReceivedQuantity() : txItem.getQuantity())
                        : txItem.getQuantity();

                Double totalValue = null;
                if (unitPrice != null && quantity != null) {
                    totalValue = unitPrice * quantity;
                }

                result.add(WarehouseTransactionHistoryDTO.builder()
                        .transactionId(tx.getId())
                        .batchNumber(tx.getBatchNumber())
                        .transactionDate(tx.getTransactionDate() != null ? tx.getTransactionDate().toString() : null)
                        .status(tx.getStatus().name())
                        .senderName(senderName)
                        .senderType(tx.getSenderType().name())
                        .receiverName(receiverName)
                        .receiverType(tx.getReceiverType().name())
                        .itemName(txItem.getItemType().getName())
                        .quantity(quantity)
                        .measuringUnit(txItem.getItemType().getMeasuringUnit())
                        .unitPrice(unitPrice)
                        .totalValue(totalValue)
                        .createdBy(tx.getAddedBy())
                        .approvedBy(tx.getApprovedBy())
                        .completedAt(tx.getCompletedAt() != null ? tx.getCompletedAt().toString() : null)
                        .build());
            }
        }

        // Sort by transaction date descending (most recent first)
        result.sort((a, b) -> {
            String dateA = a.getTransactionDate();
            String dateB = b.getTransactionDate();
            if (dateA == null) return 1;
            if (dateB == null) return -1;
            return dateB.compareTo(dateA);
        });

        return result;
    }

    private Double getItemUnitPrice(UUID itemTypeId, UUID warehouseId) {
        List<Item> items = itemRepository.findAllByItemTypeIdAndWarehouseIdAndItemStatus(
                itemTypeId, warehouseId, ItemStatus.IN_WAREHOUSE);

        return items.stream()
                .map(Item::getUnitPrice)
                .filter(price -> price != null && price > 0)
                .findFirst()
                .orElse(null);
    }

    /**
     * Helper to get entity name by type and ID
     */
    private String getEntityName(PartyType type, UUID id) {
        try {
            if (type == PartyType.WAREHOUSE) {
                return warehouseRepository.findById(id)
                        .map(Warehouse::getName)
                        .orElse("Unknown Warehouse");
            } else if (type == PartyType.EQUIPMENT) {
                return "Equipment"; // You'd need EquipmentRepository for full name
            }
            return "Unknown";
        } catch (Exception e) {
            return "Unknown";
        }
    }
}