package com.example.backend.services.finance.inventoryValuation;

import com.example.backend.dto.finance.inventoryValuation.*;
import com.example.backend.models.finance.inventoryValuation.ApprovalStatus;
import com.example.backend.models.finance.inventoryValuation.ItemPriceApproval;
import com.example.backend.models.notification.NotificationType;
import com.example.backend.models.site.Site;
import com.example.backend.models.user.Role;
import com.example.backend.models.warehouse.Item;
import com.example.backend.models.warehouse.ItemStatus;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.repositories.finance.inventoryValuation.ItemPriceApprovalRepository;
import com.example.backend.repositories.site.SiteRepository;
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
}