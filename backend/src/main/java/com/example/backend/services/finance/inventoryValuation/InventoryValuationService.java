package com.example.backend.services.finance.inventoryValuation;

import com.example.backend.dto.finance.inventoryValuation.*;
import com.example.backend.dto.finance.valuation.*;
import com.example.backend.models.PartyType;
import com.example.backend.models.equipment.Consumable;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.finance.inventoryValuation.ApprovalStatus;
import com.example.backend.models.finance.inventoryValuation.ItemPriceApproval;
import com.example.backend.models.finance.Valuation.EquipmentValuation;
import com.example.backend.models.finance.Valuation.SiteValuation;
import com.example.backend.models.finance.Valuation.WarehouseValuation;
import com.example.backend.models.notification.NotificationType;
import com.example.backend.models.site.Site;
import com.example.backend.models.transaction.Transaction;
import com.example.backend.models.transaction.TransactionItem;
import com.example.backend.models.user.Role;
import com.example.backend.models.warehouse.Item;
import com.example.backend.models.warehouse.ItemStatus;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.repositories.equipment.ConsumableRepository;
import com.example.backend.repositories.finance.inventoryValuation.ItemPriceApprovalRepository;
import com.example.backend.repositories.site.SiteRepository;
import com.example.backend.repositories.transaction.TransactionRepository;
import com.example.backend.repositories.warehouse.ItemRepository;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import com.example.backend.services.finance.valuation.EquipmentValuationService;
import com.example.backend.services.finance.valuation.SiteValuationService;
import com.example.backend.services.finance.valuation.WarehouseValuationService;
import com.example.backend.services.notification.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Main service for inventory valuation operations
 * Orchestrates warehouse, equipment, and site valuation services
 */
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

    // NEW: Valuation services
    @Autowired
    private WarehouseValuationService warehouseValuationService;

    @Autowired
    private EquipmentValuationService equipmentValuationService;

    @Autowired
    private SiteValuationService siteValuationService;

    @Autowired
    private ConsumableRepository consumableRepository;

    // ==================== PRICE APPROVAL METHODS (UNCHANGED) ====================

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
     * NOW TRIGGERS VALUATION UPDATE
     */
    @Transactional
    public ItemPriceApproval approveItemPrice(UUID itemId, Double approvedPrice, String approvedBy) {
        System.out.println("💰 Approving price for item: " + itemId + " with price: " + approvedPrice);

        ItemPriceApproval approval = itemPriceApprovalRepository.findByItemId(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Price approval request not found for item"));

        if (approval.getApprovalStatus() != ApprovalStatus.PENDING) {
            throw new IllegalArgumentException("Item price has already been processed");
        }

        Item item = approval.getItem();

        // Update item with price
        item.setUnitPrice(approvedPrice);
        item.calculateTotalValue();
        item.setItemStatus(ItemStatus.IN_WAREHOUSE);
        item.setPriceApprovedBy(approvedBy);
        item.setPriceApprovedAt(LocalDateTime.now());

        itemRepository.save(item);

        // Update approval record
        approval.setApprovalStatus(ApprovalStatus.APPROVED);
        approval.setApprovedPrice(approvedPrice);
        approval.setApprovedBy(approvedBy);
        approval.setApprovedAt(LocalDateTime.now());

        ItemPriceApproval savedApproval = itemPriceApprovalRepository.save(approval);

        // ✅ NEW: Update valuations using new service
        warehouseValuationService.calculateWarehouseValuation(item.getWarehouse().getId(), approvedBy);
        siteValuationService.calculateSiteValuation(item.getWarehouse().getSite().getId(), approvedBy);

        // Send notification
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
            }
        }

        System.out.println("✅ Bulk approval completed: " + approvedItems.size() + "/" + request.getItems().size());
        return approvedItems;
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

    // ==================== NEW VALUATION METHODS ====================

    /**
     * Get warehouse balance with valuation data
     */
    public WarehouseBalanceDTO getWarehouseBalance(UUID warehouseId) {
        Warehouse warehouse = warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new IllegalArgumentException("Warehouse not found"));

        // Get valuation data (will calculate if doesn't exist)
        WarehouseValuation valuation = warehouseValuationService.getWarehouseValuation(warehouseId);

        Long pendingCount = itemPriceApprovalRepository.countPendingApprovalsByWarehouse(warehouse);

        return WarehouseBalanceDTO.builder()
                .warehouseId(warehouse.getId())
                .warehouseName(warehouse.getName())
                .siteId(warehouse.getSite().getId())
                .siteName(warehouse.getSite().getName())
                .totalValue(valuation.getCurrentValue())
                .totalItems(valuation.getTotalItems())
                .pendingApprovalCount(pendingCount.intValue())
                 .photoUrl(warehouse.getPhotoUrl())
                .build();
    }

    /**
     * Get site balance with full valuation data
     */
    public SiteBalanceDTO getSiteBalance(UUID siteId) {
        Site site = siteRepository.findById(siteId)
                .orElseThrow(() -> new IllegalArgumentException("Site not found"));

        // Get site valuation (will calculate if doesn't exist)
        SiteValuation siteValuation = siteValuationService.getSiteValuation(siteId);

        // Get warehouse balances
        List<WarehouseBalanceDTO> warehouseBalances = site.getWarehouses().stream()
                .map(warehouse -> getWarehouseBalance(warehouse.getId()))
                .collect(Collectors.toList());

        return SiteBalanceDTO.builder()
                .siteId(site.getId())
                .siteName(site.getName())
                .totalValue(siteValuation.getTotalValue())
                .totalWarehouses(siteValuation.getWarehouseCount())
                .equipmentCount(siteValuation.getEquipmentCount())
                .totalEquipmentValue(siteValuation.getEquipmentValue())
                .totalWarehouseValue(siteValuation.getWarehouseValue())
                .warehouses(warehouseBalances)
                .build();
    }

    /**
     * Get all site balances with valuation data
     */
    public List<SiteBalanceDTO> getAllSiteBalances() {
        List<Site> sites = siteRepository.findAll();

        return sites.stream()
                .map(site -> getSiteBalance(site.getId()))
                .collect(Collectors.toList());
    }

    /**
     * NEW: Get complete site valuation with expenses
     */
    /**
     * NEW: Get complete site valuation with expenses
     * ALWAYS recalculates to ensure fresh data
     */
    public SiteValuationDTO getSiteValuationComplete(UUID siteId) {
        Site site = siteRepository.findById(siteId)
                .orElseThrow(() -> new IllegalArgumentException("Site not found"));

        // ✅ ALWAYS recalculate to get fresh data
        SiteValuation valuation = siteValuationService.calculateSiteValuation(siteId, "SYSTEM");

        return SiteValuationDTO.builder()
                .siteId(site.getId())
                .siteName(site.getName())
                .photoUrl(site.getPhotoUrl())
                .totalValue(valuation.getTotalValue())
                .totalExpenses(valuation.getTotalExpenses())
                .warehouseValue(valuation.getWarehouseValue())
                .equipmentValue(valuation.getEquipmentValue())
                .fixedAssetsValue(valuation.getFixedAssetsValue())
                .warehouseExpenses(valuation.getWarehouseExpenses())
                .equipmentExpenses(valuation.getEquipmentExpenses())
                .fixedAssetsExpenses(valuation.getFixedAssetsExpenses())
                .warehouseCount(valuation.getWarehouseCount())
                .equipmentCount(valuation.getEquipmentCount())
                .fixedAssetsCount(valuation.getFixedAssetsCount())
                .lastCalculatedAt(valuation.getLastCalculatedAt() != null ? valuation.getLastCalculatedAt().toString() : null)
                .lastCalculatedBy(valuation.getLastCalculatedBy())
                .build();
    }

    /**
     * NEW: Get all sites with complete valuation data including expenses
     * ALWAYS recalculates to ensure fresh data
     */
    public List<SiteValuationDTO> getAllSiteValuations() {
        List<Site> sites = siteRepository.findAll();

        return sites.stream()
                .map(site -> {
                    // ✅ Recalculate is now called inside getSiteValuationComplete
                    return getSiteValuationComplete(site.getId());
                })
                .collect(Collectors.toList());
    }
    /**
     * NEW: Get equipment financial breakdown
     */
    /**
     * NEW: Get equipment financial breakdown
     * ALWAYS recalculates to ensure fresh data
     */
    public EquipmentFinancialBreakdownDTO getEquipmentFinancials(UUID equipmentId) {
        // ✅ ALWAYS recalculate to get fresh depreciation
        EquipmentValuation valuation = equipmentValuationService.calculateEquipmentValuation(equipmentId, "SYSTEM");

        return EquipmentFinancialBreakdownDTO.builder()
                .purchasePrice(valuation.getPurchasePrice())
                .currentValue(valuation.getCurrentValue())
                .currentInventoryValue(valuation.getCurrentInventoryValue())
                .totalExpenses(valuation.getTotalExpenses())
                .accumulatedDepreciation(valuation.getAccumulatedDepreciation())
                .lastUpdated(valuation.getLastCalculatedAt() != null ? valuation.getLastCalculatedAt().toString() : null)
                .build();
    }

    // ==================== HELPER METHODS (UNCHANGED) ====================

    /**
     * Get item breakdown (value composition) for a warehouse
     */
    public List<ItemBreakdownDTO> getWarehouseItemBreakdown(UUID warehouseId) {
        Warehouse warehouse = warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new IllegalArgumentException("Warehouse not found"));

        List<Item> items = itemRepository.findByWarehouseAndItemStatus(warehouse, ItemStatus.IN_WAREHOUSE);

        return items.stream()
                .filter(item -> item.getUnitPrice() != null && item.getUnitPrice() > 0)
                .map(item -> ItemBreakdownDTO.builder()
                        .itemId(item.getId())
                        .itemName(item.getItemType().getName())
                        .quantity(item.getQuantity())
                        .measuringUnit(item.getItemType().getMeasuringUnit() != null ?
                                item.getItemType().getMeasuringUnit().getName() : null)
                        .unitPrice(item.getUnitPrice())
                        .totalValue(item.getTotalValue())
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * Get ALL item history for a warehouse
     */
    public List<WarehouseTransactionHistoryDTO> getWarehouseAllItemHistory(UUID warehouseId) {
        Warehouse warehouse = warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new IllegalArgumentException("Warehouse not found"));

        List<WarehouseTransactionHistoryDTO> result = new ArrayList<>();
        List<Item> allItems = itemRepository.findByWarehouseAndItemStatus(warehouse, ItemStatus.IN_WAREHOUSE);

        for (Item item : allItems) {
            String itemSource = item.getItemSource() != null ? item.getItemSource().name() : "UNKNOWN";

            if (item.getTransactionItem() != null && item.getTransactionItem().getTransaction() != null) {
                Transaction tx = item.getTransactionItem().getTransaction();
                String senderName = getEntityName(tx.getSenderType(), tx.getSenderId());

                result.add(WarehouseTransactionHistoryDTO.builder()
                        .itemId(item.getId())
                        .transactionId(tx.getId())
                        .batchNumber(tx.getBatchNumber())
                        .transactionDate(tx.getTransactionDate() != null ? tx.getTransactionDate().toString() : null)
                        .status(tx.getStatus() != null ? tx.getStatus().name() : null)
                        .senderName(senderName)
                        .senderType(tx.getSenderType() != null ? tx.getSenderType().name() : null)
                        .receiverName(warehouse.getName())
                        .receiverType("WAREHOUSE")
                        .itemName(item.getItemType().getName())
                        .quantity(item.getQuantity())
                        .measuringUnit(item.getItemType().getMeasuringUnit() != null ?
                                item.getItemType().getMeasuringUnit().getName() : null)
                        .unitPrice(item.getUnitPrice())
                        .totalValue(item.getTotalValue())
                        .createdBy(item.getCreatedBy())
                        .approvedBy(tx.getApprovedBy())
                        .completedAt(tx.getCompletedAt() != null ? tx.getCompletedAt().toString() : null)
                        .itemSource("TRANSACTION")
                        .sourceReference(tx.getBatchNumber() != null ? tx.getBatchNumber().toString() : null)
                        .merchantName(null)
                        .createdAt(item.getCreatedAt() != null ? item.getCreatedAt().toString() : null)
                        .build());
            } else {
                result.add(WarehouseTransactionHistoryDTO.builder()
                        .itemId(item.getId())
                        .transactionId(null)
                        .batchNumber(null)
                        .transactionDate(null)
                        .status(null)
                        .senderName(item.getMerchantName())
                        .senderType(null)
                        .receiverName(warehouse.getName())
                        .receiverType("WAREHOUSE")
                        .itemName(item.getItemType().getName())
                        .quantity(item.getQuantity())
                        .measuringUnit(item.getItemType().getMeasuringUnit() != null ?
                                item.getItemType().getMeasuringUnit().getName() : null)
                        .unitPrice(item.getUnitPrice())
                        .totalValue(item.getTotalValue())
                        .createdBy(item.getCreatedBy())
                        .approvedBy(item.getPriceApprovedBy())
                        .completedAt(item.getPriceApprovedAt() != null ? item.getPriceApprovedAt().toString() : null)
                        .itemSource(itemSource)
                        .sourceReference(item.getSourceReference())
                        .merchantName(item.getMerchantName())
                        .createdAt(item.getCreatedAt() != null ? item.getCreatedAt().toString() : null)
                        .build());
            }
        }

        result.sort((a, b) -> {
            String dateA = a.getCreatedAt();
            String dateB = b.getCreatedAt();
            if (dateA == null) return 1;
            if (dateB == null) return -1;
            return dateB.compareTo(dateA);
        });

        return result;
    }

    private String getEntityName(PartyType type, UUID id) {
        try {
            if (type == PartyType.WAREHOUSE) {
                return warehouseRepository.findById(id)
                        .map(Warehouse::getName)
                        .orElse("Unknown Warehouse");
            } else if (type == PartyType.EQUIPMENT) {
                return "Equipment";
            }
            return "Unknown";
        } catch (Exception e) {
            return "Unknown";
        }
    }

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
                .measuringUnit(item.getItemType().getMeasuringUnit() != null ?
                        item.getItemType().getMeasuringUnit().getName() : null)
                .quantity(item.getQuantity())
                .suggestedPrice(approval.getSuggestedPrice())
                .createdBy(approval.getRequestedBy())
                .createdAt(approval.getRequestedAt().toString())
                .comment(item.getComment())
                .build();
    }

    private ApprovedItemHistoryDTO convertToApprovedHistoryDTO(ItemPriceApproval approval) {
        Item item = approval.getItem();

        return ApprovedItemHistoryDTO.builder()
                .itemId(item.getId())
                .warehouseId(approval.getWarehouse().getId())
                .warehouseName(approval.getWarehouse().getName())
                .siteName(approval.getWarehouse().getSite().getName())
                .itemTypeName(item.getItemType().getName())
                .itemTypeCategory(item.getItemType().getItemCategory().getName())
                .measuringUnit(item.getItemType().getMeasuringUnit() != null ?
                        item.getItemType().getMeasuringUnit().getName() : null)
                .quantity(item.getQuantity())
                .approvedPrice(approval.getApprovedPrice())
                .totalValue(approval.getApprovedPrice() * item.getQuantity())
                .approvedBy(approval.getApprovedBy())
                .approvedAt(approval.getApprovedAt().toString())
                .build();
    }


    public List<ConsumableBreakdownDTO> getEquipmentConsumablesBreakdown(UUID equipmentId) {
        List<Consumable> consumables = consumableRepository.findByEquipmentIdAndStatus(
                equipmentId, ItemStatus.IN_WAREHOUSE);

        return consumables.stream()
                .filter(c -> c.getTotalValue() != null && c.getTotalValue() > 0)
                .map(c -> ConsumableBreakdownDTO.builder()
                        .itemName(c.getItemType().getName())
                        .quantity(c.getQuantity())
                        .measuringUnit(c.getItemType().getMeasuringUnit() != null ?
                                c.getItemType().getMeasuringUnit().getName() : null)
                        .unitPrice(c.getUnitPrice())
                        .totalValue(c.getTotalValue())
                        .build())
                .toList();
    }
}