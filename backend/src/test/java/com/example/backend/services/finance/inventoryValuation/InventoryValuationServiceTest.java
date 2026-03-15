package com.example.backend.services.finance.inventoryValuation;

import com.example.backend.dto.finance.inventoryValuation.*;
import com.example.backend.dto.finance.valuation.ConsumableBreakdownDTO;
import com.example.backend.dto.finance.valuation.EquipmentFinancialBreakdownDTO;
import com.example.backend.dto.finance.valuation.SiteValuationDTO;
import com.example.backend.models.equipment.Consumable;
import com.example.backend.models.finance.Valuation.EquipmentValuation;
import com.example.backend.models.finance.Valuation.SiteValuation;
import com.example.backend.models.finance.Valuation.WarehouseValuation;
import com.example.backend.models.finance.inventoryValuation.ApprovalStatus;
import com.example.backend.models.finance.inventoryValuation.ItemPriceApproval;
import com.example.backend.models.notification.NotificationType;
import com.example.backend.models.site.Site;
import com.example.backend.models.user.Role;
import com.example.backend.models.warehouse.*;
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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class InventoryValuationServiceTest {

    @Mock private ItemPriceApprovalRepository itemPriceApprovalRepository;
    @Mock private ItemRepository itemRepository;
    @Mock private WarehouseRepository warehouseRepository;
    @Mock private SiteRepository siteRepository;
    @Mock private NotificationService notificationService;
    @Mock private TransactionRepository transactionRepository;
    @Mock private WarehouseValuationService warehouseValuationService;
    @Mock private EquipmentValuationService equipmentValuationService;
    @Mock private SiteValuationService siteValuationService;
    @Mock private ConsumableRepository consumableRepository;

    @InjectMocks
    private InventoryValuationService inventoryValuationService;

    // ==================== FACTORY HELPERS ====================

    private MeasuringUnit createMeasuringUnit(String unitName) {
        MeasuringUnit mu = new MeasuringUnit();
        mu.setId(UUID.randomUUID());
        mu.setName(unitName);
        mu.setDisplayName(unitName);
        mu.setAbbreviation(unitName);
        return mu;
    }

    private ItemCategory createItemCategory(String categoryName) {
        ItemCategory category = new ItemCategory();
        category.setId(UUID.randomUUID());
        category.setName(categoryName);
        return category;
    }

    private ItemType createItemType(String name, MeasuringUnit mu, ItemCategory category) {
        ItemType itemType = new ItemType();
        itemType.setId(UUID.randomUUID());
        itemType.setName(name);
        itemType.setMeasuringUnit(mu);
        itemType.setItemCategory(category);
        return itemType;
    }

    private Warehouse createWarehouse(UUID id) {
        Site site = new Site();
        site.setId(UUID.randomUUID());
        site.setName("Test Site");
        site.setWarehouses(new ArrayList<>());

        Warehouse warehouse = new Warehouse();
        warehouse.setId(id);
        warehouse.setName("Test Warehouse");
        warehouse.setSite(site);
        return warehouse;
    }

    private Item createItem(UUID id, Warehouse warehouse) {
        MeasuringUnit mu = createMeasuringUnit("kg");
        ItemCategory category = createItemCategory("Test Category");
        ItemType itemType = createItemType("Test Item", mu, category);

        Item item = new Item();
        item.setId(id);
        item.setItemType(itemType);
        item.setWarehouse(warehouse);
        item.setQuantity(10);
        item.setUnitPrice(100.0);
        item.setTotalValue(1000.0);
        item.setItemStatus(ItemStatus.PENDING);
        return item;
    }

    private ItemPriceApproval createApproval(Item item, Warehouse warehouse, ApprovalStatus status) {
        ItemPriceApproval approval = new ItemPriceApproval();
        approval.setId(UUID.randomUUID());
        approval.setItem(item);
        approval.setWarehouse(warehouse);
        approval.setApprovalStatus(status);
        approval.setSuggestedPrice(100.0);
        approval.setRequestedBy("user1");
        approval.setRequestedAt(LocalDateTime.now());
        return approval;
    }

    private WarehouseValuation createWarehouseValuation(Warehouse warehouse) {
        WarehouseValuation val = new WarehouseValuation();
        val.setId(UUID.randomUUID());
        val.setWarehouse(warehouse);
        val.setCurrentValue(5000.0);
        val.setTotalExpenses(1000.0);
        val.setTotalItems(10);
        val.setLastCalculatedAt(LocalDateTime.now());
        val.setLastCalculatedBy("SYSTEM");
        return val;
    }

    private SiteValuation createSiteValuation(Site site) {
        SiteValuation val = new SiteValuation();
        val.setId(UUID.randomUUID());
        val.setSite(site);
        val.setTotalValue(20000.0);
        val.setWarehouseValue(10000.0);
        val.setEquipmentValue(8000.0);
        val.setFixedAssetsValue(2000.0);
        val.setTotalExpenses(5000.0);
        val.setWarehouseExpenses(2000.0);
        val.setEquipmentExpenses(2500.0);
        val.setFixedAssetsExpenses(500.0);
        val.setWarehouseCount(3);
        val.setEquipmentCount(5);
        val.setFixedAssetsCount(2);
        val.setLastCalculatedAt(LocalDateTime.now());
        val.setLastCalculatedBy("SYSTEM");
        return val;
    }

    private EquipmentValuation createEquipmentValuation() {
        EquipmentValuation val = new EquipmentValuation();
        val.setId(UUID.randomUUID());
        val.setPurchasePrice(50000.0);
        val.setCurrentValue(45000.0);
        val.setCurrentInventoryValue(3000.0);
        val.setTotalExpenses(2000.0);
        val.setAccumulatedDepreciation(5000.0);
        val.setLastCalculatedAt(LocalDateTime.now());
        val.setLastCalculatedBy("SYSTEM");
        return val;
    }

    private Consumable createConsumable(double unitPrice, double totalValue) {
        MeasuringUnit mu = createMeasuringUnit("liter");
        ItemCategory category = createItemCategory("Lubricants");
        ItemType itemType = createItemType("Engine Oil", mu, category);

        Consumable consumable = new Consumable();
        consumable.setId(UUID.randomUUID());
        consumable.setItemType(itemType);
        consumable.setQuantity(5);
        consumable.setUnitPrice(unitPrice);
        consumable.setTotalValue(totalValue);
        consumable.setStatus(ItemStatus.IN_WAREHOUSE);
        return consumable;
    }

    // ==================== getAllPendingApprovals ====================

    @Test
    public void getAllPendingApprovals_withPendingApprovals_shouldReturnMappedDTOList() {
        UUID warehouseId = UUID.randomUUID();
        Warehouse warehouse = createWarehouse(warehouseId);
        Item item = createItem(UUID.randomUUID(), warehouse);
        ItemPriceApproval approval = createApproval(item, warehouse, ApprovalStatus.PENDING);

        when(itemPriceApprovalRepository
                .findByApprovalStatusOrderByRequestedAtDesc(ApprovalStatus.PENDING))
                .thenReturn(List.of(approval));

        List<PendingItemApprovalDTO> result = inventoryValuationService.getAllPendingApprovals();

        assertNotNull(result);
        assertEquals(1, result.size());
        PendingItemApprovalDTO dto = result.get(0);
        assertEquals(item.getId(), dto.getItemId());
        assertEquals(warehouseId, dto.getWarehouseId());
        assertEquals("Test Warehouse", dto.getWarehouseName());
        assertEquals("Test Site", dto.getSiteName());
        assertEquals("Test Item", dto.getItemTypeName());
        assertEquals("Test Category", dto.getItemTypeCategory());
        assertEquals("kg", dto.getMeasuringUnit());
        assertEquals(100.0, dto.getSuggestedPrice());
        assertEquals("user1", dto.getCreatedBy());
    }

    @Test
    public void getAllPendingApprovals_noPendingApprovals_shouldReturnEmptyList() {
        when(itemPriceApprovalRepository
                .findByApprovalStatusOrderByRequestedAtDesc(ApprovalStatus.PENDING))
                .thenReturn(Collections.emptyList());

        List<PendingItemApprovalDTO> result = inventoryValuationService.getAllPendingApprovals();

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    public void getAllPendingApprovals_itemWithNullMeasuringUnit_shouldReturnNullMeasuringUnitInDTO() {
        UUID warehouseId = UUID.randomUUID();
        Warehouse warehouse = createWarehouse(warehouseId);
        Item item = createItem(UUID.randomUUID(), warehouse);
        item.getItemType().setMeasuringUnit(null);
        ItemPriceApproval approval = createApproval(item, warehouse, ApprovalStatus.PENDING);

        when(itemPriceApprovalRepository
                .findByApprovalStatusOrderByRequestedAtDesc(ApprovalStatus.PENDING))
                .thenReturn(List.of(approval));

        List<PendingItemApprovalDTO> result = inventoryValuationService.getAllPendingApprovals();

        assertEquals(1, result.size());
        assertNull(result.get(0).getMeasuringUnit());
    }

    // ==================== getPendingApprovalsByWarehouse ====================

    @Test
    public void getPendingApprovalsByWarehouse_warehouseNotFound_shouldThrowIllegalArgumentException() {
        UUID warehouseId = UUID.randomUUID();
        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> inventoryValuationService.getPendingApprovalsByWarehouse(warehouseId));

        assertEquals("Warehouse not found", ex.getMessage());
    }

    @Test
    public void getPendingApprovalsByWarehouse_validWarehouse_shouldReturnFilteredDTOList() {
        UUID warehouseId = UUID.randomUUID();
        Warehouse warehouse = createWarehouse(warehouseId);
        Item item = createItem(UUID.randomUUID(), warehouse);
        ItemPriceApproval approval = createApproval(item, warehouse, ApprovalStatus.PENDING);

        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.of(warehouse));
        when(itemPriceApprovalRepository
                .findByWarehouseAndApprovalStatusOrderByRequestedAtDesc(warehouse, ApprovalStatus.PENDING))
                .thenReturn(List.of(approval));

        List<PendingItemApprovalDTO> result =
                inventoryValuationService.getPendingApprovalsByWarehouse(warehouseId);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(warehouseId, result.get(0).getWarehouseId());
    }

    @Test
    public void getPendingApprovalsByWarehouse_validWarehouseNoPendingItems_shouldReturnEmptyList() {
        UUID warehouseId = UUID.randomUUID();
        Warehouse warehouse = createWarehouse(warehouseId);

        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.of(warehouse));
        when(itemPriceApprovalRepository
                .findByWarehouseAndApprovalStatusOrderByRequestedAtDesc(warehouse, ApprovalStatus.PENDING))
                .thenReturn(Collections.emptyList());

        List<PendingItemApprovalDTO> result =
                inventoryValuationService.getPendingApprovalsByWarehouse(warehouseId);

        assertTrue(result.isEmpty());
    }

    // ==================== approveItemPrice ====================

    @Test
    public void approveItemPrice_approvalNotFound_shouldThrowIllegalArgumentException() {
        UUID itemId = UUID.randomUUID();
        when(itemPriceApprovalRepository.findByItemId(itemId)).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> inventoryValuationService.approveItemPrice(itemId, 150.0, "admin"));

        assertEquals("Price approval request not found for item", ex.getMessage());
    }

    @Test
    public void approveItemPrice_alreadyApproved_shouldThrowIllegalArgumentException() {
        UUID itemId = UUID.randomUUID();
        Warehouse warehouse = createWarehouse(UUID.randomUUID());
        Item item = createItem(itemId, warehouse);
        ItemPriceApproval approval = createApproval(item, warehouse, ApprovalStatus.APPROVED);

        when(itemPriceApprovalRepository.findByItemId(itemId)).thenReturn(Optional.of(approval));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> inventoryValuationService.approveItemPrice(itemId, 150.0, "admin"));

        assertEquals("Item price has already been processed", ex.getMessage());
    }

    @Test
    public void approveItemPrice_alreadyRejected_shouldThrowIllegalArgumentException() {
        UUID itemId = UUID.randomUUID();
        Warehouse warehouse = createWarehouse(UUID.randomUUID());
        Item item = createItem(itemId, warehouse);
        ItemPriceApproval approval = createApproval(item, warehouse, ApprovalStatus.REJECTED);

        when(itemPriceApprovalRepository.findByItemId(itemId)).thenReturn(Optional.of(approval));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> inventoryValuationService.approveItemPrice(itemId, 150.0, "admin"));

        assertEquals("Item price has already been processed", ex.getMessage());
    }

    @Test
    public void approveItemPrice_pendingApproval_shouldUpdateItemPriceAndStatusAndAuditFields() {
        UUID itemId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();
        Warehouse warehouse = createWarehouse(warehouseId);
        Item item = createItem(itemId, warehouse);
        ItemPriceApproval approval = createApproval(item, warehouse, ApprovalStatus.PENDING);

        when(itemPriceApprovalRepository.findByItemId(itemId)).thenReturn(Optional.of(approval));
        when(itemRepository.save(any(Item.class))).thenReturn(item);
        when(itemPriceApprovalRepository.save(any(ItemPriceApproval.class))).thenReturn(approval);
        when(warehouseValuationService.calculateWarehouseValuation(any(UUID.class), anyString()))
                .thenReturn(createWarehouseValuation(warehouse));
        when(siteValuationService.calculateSiteValuation(any(UUID.class), anyString()))
                .thenReturn(createSiteValuation(warehouse.getSite()));

        inventoryValuationService.approveItemPrice(itemId, 150.0, "admin");

        assertEquals(150.0, item.getUnitPrice());
        assertEquals(ItemStatus.IN_WAREHOUSE, item.getItemStatus());
        assertEquals("admin", item.getPriceApprovedBy());
        assertNotNull(item.getPriceApprovedAt());
    }

    @Test
    public void approveItemPrice_pendingApproval_shouldPersistItemAndApprovalRecord() {
        UUID itemId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();
        Warehouse warehouse = createWarehouse(warehouseId);
        Item item = createItem(itemId, warehouse);
        ItemPriceApproval approval = createApproval(item, warehouse, ApprovalStatus.PENDING);

        when(itemPriceApprovalRepository.findByItemId(itemId)).thenReturn(Optional.of(approval));
        when(itemRepository.save(any(Item.class))).thenReturn(item);
        when(itemPriceApprovalRepository.save(any(ItemPriceApproval.class))).thenReturn(approval);
        when(warehouseValuationService.calculateWarehouseValuation(any(UUID.class), anyString()))
                .thenReturn(createWarehouseValuation(warehouse));
        when(siteValuationService.calculateSiteValuation(any(UUID.class), anyString()))
                .thenReturn(createSiteValuation(warehouse.getSite()));

        ItemPriceApproval result =
                inventoryValuationService.approveItemPrice(itemId, 150.0, "admin");

        assertNotNull(result);
        assertEquals(ApprovalStatus.APPROVED, approval.getApprovalStatus());
        assertEquals(150.0, approval.getApprovedPrice());
        assertEquals("admin", approval.getApprovedBy());
        assertNotNull(approval.getApprovedAt());
        verify(itemRepository).save(item);
        verify(itemPriceApprovalRepository).save(approval);
    }

    @Test
    public void approveItemPrice_pendingApproval_shouldTriggerWarehouseAndSiteValuationRecalculation() {
        UUID itemId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();
        Warehouse warehouse = createWarehouse(warehouseId);
        Item item = createItem(itemId, warehouse);
        UUID siteId = warehouse.getSite().getId();
        ItemPriceApproval approval = createApproval(item, warehouse, ApprovalStatus.PENDING);

        when(itemPriceApprovalRepository.findByItemId(itemId)).thenReturn(Optional.of(approval));
        when(itemRepository.save(any(Item.class))).thenReturn(item);
        when(itemPriceApprovalRepository.save(any(ItemPriceApproval.class))).thenReturn(approval);
        when(warehouseValuationService.calculateWarehouseValuation(warehouseId, "admin"))
                .thenReturn(createWarehouseValuation(warehouse));
        when(siteValuationService.calculateSiteValuation(siteId, "admin"))
                .thenReturn(createSiteValuation(warehouse.getSite()));

        inventoryValuationService.approveItemPrice(itemId, 150.0, "admin");

        verify(warehouseValuationService).calculateWarehouseValuation(warehouseId, "admin");
        verify(siteValuationService).calculateSiteValuation(siteId, "admin");
    }

    @Test
    public void approveItemPrice_pendingApproval_shouldSendNotificationToWarehouseRoles() {
        UUID itemId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();
        Warehouse warehouse = createWarehouse(warehouseId);
        Item item = createItem(itemId, warehouse);
        ItemPriceApproval approval = createApproval(item, warehouse, ApprovalStatus.PENDING);

        when(itemPriceApprovalRepository.findByItemId(itemId)).thenReturn(Optional.of(approval));
        when(itemRepository.save(any(Item.class))).thenReturn(item);
        when(itemPriceApprovalRepository.save(any(ItemPriceApproval.class))).thenReturn(approval);
        when(warehouseValuationService.calculateWarehouseValuation(any(UUID.class), anyString()))
                .thenReturn(createWarehouseValuation(warehouse));
        when(siteValuationService.calculateSiteValuation(any(UUID.class), anyString()))
                .thenReturn(createSiteValuation(warehouse.getSite()));

        inventoryValuationService.approveItemPrice(itemId, 150.0, "admin");

        verify(notificationService).sendNotificationToUsersByRoles(
                eq(Arrays.asList(Role.WAREHOUSE_MANAGER, Role.WAREHOUSE_EMPLOYEE)),
                eq("Item Price Approved"),
                contains("Test Item"),
                eq(NotificationType.SUCCESS),
                contains(warehouseId.toString()),
                contains(itemId.toString())
        );
    }

    @Test
    public void approveItemPrice_notificationServiceThrows_shouldStillReturnSavedApproval() {
        UUID itemId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();
        Warehouse warehouse = createWarehouse(warehouseId);
        Item item = createItem(itemId, warehouse);
        ItemPriceApproval approval = createApproval(item, warehouse, ApprovalStatus.PENDING);

        when(itemPriceApprovalRepository.findByItemId(itemId)).thenReturn(Optional.of(approval));
        when(itemRepository.save(any(Item.class))).thenReturn(item);
        when(itemPriceApprovalRepository.save(any(ItemPriceApproval.class))).thenReturn(approval);
        when(warehouseValuationService.calculateWarehouseValuation(any(UUID.class), anyString()))
                .thenReturn(createWarehouseValuation(warehouse));
        when(siteValuationService.calculateSiteValuation(any(UUID.class), anyString()))
                .thenReturn(createSiteValuation(warehouse.getSite()));
        doThrow(new RuntimeException("STOMP broker unavailable"))
                .when(notificationService)
                .sendNotificationToUsersByRoles(any(), any(), any(), any(), any(), any());

        ItemPriceApproval result =
                inventoryValuationService.approveItemPrice(itemId, 150.0, "admin");

        assertNotNull(result);
        assertEquals(ApprovalStatus.APPROVED, approval.getApprovalStatus());
    }

    // ==================== bulkApproveItemPrices ====================

    @Test
    public void bulkApproveItemPrices_allItemsValid_shouldReturnAllApprovedItems() {
        UUID itemId1 = UUID.randomUUID();
        UUID itemId2 = UUID.randomUUID();
        Warehouse warehouse = createWarehouse(UUID.randomUUID());

        Item item1 = createItem(itemId1, warehouse);
        Item item2 = createItem(itemId2, warehouse);
        ItemPriceApproval approval1 = createApproval(item1, warehouse, ApprovalStatus.PENDING);
        ItemPriceApproval approval2 = createApproval(item2, warehouse, ApprovalStatus.PENDING);

        when(itemPriceApprovalRepository.findByItemId(itemId1)).thenReturn(Optional.of(approval1));
        when(itemPriceApprovalRepository.findByItemId(itemId2)).thenReturn(Optional.of(approval2));
        when(itemRepository.save(any(Item.class))).thenAnswer(inv -> inv.getArgument(0));
        when(itemPriceApprovalRepository.save(any(ItemPriceApproval.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(warehouseValuationService.calculateWarehouseValuation(any(UUID.class), anyString()))
                .thenReturn(createWarehouseValuation(warehouse));
        when(siteValuationService.calculateSiteValuation(any(UUID.class), anyString()))
                .thenReturn(createSiteValuation(warehouse.getSite()));

        BulkPriceApprovalRequestDTO request = new BulkPriceApprovalRequestDTO();
        request.setItems(List.of(
                ItemPriceApprovalRequestDTO.builder().itemId(itemId1).unitPrice(120.0).build(),
                ItemPriceApprovalRequestDTO.builder().itemId(itemId2).unitPrice(200.0).build()
        ));

        List<ItemPriceApproval> result =
                inventoryValuationService.bulkApproveItemPrices(request, "admin");

        assertEquals(2, result.size());
    }

    @Test
    public void bulkApproveItemPrices_someItemsInvalid_shouldSkipFailedItemsAndReturnSuccessful() {
        UUID validItemId = UUID.randomUUID();
        UUID invalidItemId = UUID.randomUUID();
        Warehouse warehouse = createWarehouse(UUID.randomUUID());
        Item validItem = createItem(validItemId, warehouse);
        ItemPriceApproval approval = createApproval(validItem, warehouse, ApprovalStatus.PENDING);

        when(itemPriceApprovalRepository.findByItemId(validItemId)).thenReturn(Optional.of(approval));
        when(itemPriceApprovalRepository.findByItemId(invalidItemId)).thenReturn(Optional.empty());
        when(itemRepository.save(any(Item.class))).thenAnswer(inv -> inv.getArgument(0));
        when(itemPriceApprovalRepository.save(any(ItemPriceApproval.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(warehouseValuationService.calculateWarehouseValuation(any(UUID.class), anyString()))
                .thenReturn(createWarehouseValuation(warehouse));
        when(siteValuationService.calculateSiteValuation(any(UUID.class), anyString()))
                .thenReturn(createSiteValuation(warehouse.getSite()));

        BulkPriceApprovalRequestDTO request = new BulkPriceApprovalRequestDTO();
        request.setItems(List.of(
                ItemPriceApprovalRequestDTO.builder().itemId(validItemId).unitPrice(120.0).build(),
                ItemPriceApprovalRequestDTO.builder().itemId(invalidItemId).unitPrice(99.0).build()
        ));

        List<ItemPriceApproval> result =
                inventoryValuationService.bulkApproveItemPrices(request, "admin");

        assertEquals(1, result.size());
    }

    @Test
    public void bulkApproveItemPrices_allItemsInvalid_shouldReturnEmptyList() {
        UUID itemId = UUID.randomUUID();
        when(itemPriceApprovalRepository.findByItemId(itemId)).thenReturn(Optional.empty());

        BulkPriceApprovalRequestDTO request = new BulkPriceApprovalRequestDTO();
        request.setItems(List.of(
                ItemPriceApprovalRequestDTO.builder().itemId(itemId).unitPrice(50.0).build()
        ));

        List<ItemPriceApproval> result =
                inventoryValuationService.bulkApproveItemPrices(request, "admin");

        assertTrue(result.isEmpty());
    }

    // ==================== getApprovalHistory ====================

    @Test
    public void getApprovalHistory_withApprovedItems_shouldReturnMappedDTOList() {
        Warehouse warehouse = createWarehouse(UUID.randomUUID());
        Item item = createItem(UUID.randomUUID(), warehouse);
        ItemPriceApproval approval = createApproval(item, warehouse, ApprovalStatus.APPROVED);
        approval.setApprovedPrice(150.0);
        approval.setApprovedBy("admin");
        approval.setApprovedAt(LocalDateTime.now());

        when(itemPriceApprovalRepository
                .findByApprovalStatusOrderByApprovedAtDesc(ApprovalStatus.APPROVED))
                .thenReturn(List.of(approval));

        List<ApprovedItemHistoryDTO> result = inventoryValuationService.getApprovalHistory();

        assertNotNull(result);
        assertEquals(1, result.size());
        ApprovedItemHistoryDTO dto = result.get(0);
        assertEquals(item.getId(), dto.getItemId());
        assertEquals(warehouse.getId(), dto.getWarehouseId());
        assertEquals("Test Warehouse", dto.getWarehouseName());
        assertEquals(150.0, dto.getApprovedPrice());
        assertEquals("admin", dto.getApprovedBy());
        // totalValue = approvedPrice * quantity = 150 * 10
        assertEquals(1500.0, dto.getTotalValue());
    }

    @Test
    public void getApprovalHistory_noApprovedItems_shouldReturnEmptyList() {
        when(itemPriceApprovalRepository
                .findByApprovalStatusOrderByApprovedAtDesc(ApprovalStatus.APPROVED))
                .thenReturn(Collections.emptyList());

        List<ApprovedItemHistoryDTO> result = inventoryValuationService.getApprovalHistory();

        assertTrue(result.isEmpty());
    }

    // ==================== getWarehouseBalance ====================

    @Test
    public void getWarehouseBalance_warehouseNotFound_shouldThrowIllegalArgumentException() {
        UUID warehouseId = UUID.randomUUID();
        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> inventoryValuationService.getWarehouseBalance(warehouseId));

        assertEquals("Warehouse not found", ex.getMessage());
    }

    @Test
    public void getWarehouseBalance_validWarehouse_shouldReturnDTOWithAllValuationFields() {
        UUID warehouseId = UUID.randomUUID();
        Warehouse warehouse = createWarehouse(warehouseId);
        WarehouseValuation valuation = createWarehouseValuation(warehouse);

        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.of(warehouse));
        when(warehouseValuationService.getWarehouseValuation(warehouseId)).thenReturn(valuation);
        when(itemPriceApprovalRepository.countPendingApprovalsByWarehouse(warehouse)).thenReturn(3L);

        WarehouseBalanceDTO result = inventoryValuationService.getWarehouseBalance(warehouseId);

        assertNotNull(result);
        assertEquals(warehouseId, result.getWarehouseId());
        assertEquals("Test Warehouse", result.getWarehouseName());
        assertEquals(warehouse.getSite().getId(), result.getSiteId());
        assertEquals("Test Site", result.getSiteName());
        assertEquals(5000.0, result.getTotalValue());
        assertEquals(10, result.getTotalItems());
        assertEquals(3, result.getPendingApprovalCount());
    }

    @Test
    public void getWarehouseBalance_zeroPendingApprovals_shouldReportZeroPendingCount() {
        UUID warehouseId = UUID.randomUUID();
        Warehouse warehouse = createWarehouse(warehouseId);
        WarehouseValuation valuation = createWarehouseValuation(warehouse);

        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.of(warehouse));
        when(warehouseValuationService.getWarehouseValuation(warehouseId)).thenReturn(valuation);
        when(itemPriceApprovalRepository.countPendingApprovalsByWarehouse(warehouse)).thenReturn(0L);

        WarehouseBalanceDTO result = inventoryValuationService.getWarehouseBalance(warehouseId);

        assertEquals(0, result.getPendingApprovalCount());
    }

    // ==================== getSiteBalance ====================

    @Test
    public void getSiteBalance_siteNotFound_shouldThrowIllegalArgumentException() {
        UUID siteId = UUID.randomUUID();
        when(siteRepository.findById(siteId)).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> inventoryValuationService.getSiteBalance(siteId));

        assertEquals("Site not found", ex.getMessage());
    }

    @Test
    public void getSiteBalance_validSiteWithNoWarehouses_shouldReturnDTOWithEmptyWarehouseList() {
        UUID siteId = UUID.randomUUID();
        Site site = new Site();
        site.setId(siteId);
        site.setName("Mining Site Alpha");
        site.setWarehouses(new ArrayList<>());

        SiteValuation siteValuation = createSiteValuation(site);

        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));
        when(siteValuationService.getSiteValuation(siteId)).thenReturn(siteValuation);

        SiteBalanceDTO result = inventoryValuationService.getSiteBalance(siteId);

        assertNotNull(result);
        assertEquals(siteId, result.getSiteId());
        assertEquals("Mining Site Alpha", result.getSiteName());
        assertEquals(20000.0, result.getTotalValue());
        assertEquals(3, result.getTotalWarehouses());
        assertEquals(5, result.getEquipmentCount());
        assertEquals(8000.0, result.getTotalEquipmentValue());
        assertEquals(10000.0, result.getTotalWarehouseValue());
        assertTrue(result.getWarehouses().isEmpty());
    }

    @Test
    public void getSiteBalance_validSiteWithWarehouses_shouldIncludeWarehouseBalancesInDTO() {
        UUID siteId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();

        Site site = new Site();
        site.setId(siteId);
        site.setName("Mining Site Beta");

        Warehouse warehouse = new Warehouse();
        warehouse.setId(warehouseId);
        warehouse.setName("Beta Warehouse");
        warehouse.setSite(site);
        site.setWarehouses(List.of(warehouse));

        SiteValuation siteValuation = createSiteValuation(site);
        WarehouseValuation warehouseValuation = createWarehouseValuation(warehouse);

        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));
        when(siteValuationService.getSiteValuation(siteId)).thenReturn(siteValuation);
        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.of(warehouse));
        when(warehouseValuationService.getWarehouseValuation(warehouseId)).thenReturn(warehouseValuation);
        when(itemPriceApprovalRepository.countPendingApprovalsByWarehouse(warehouse)).thenReturn(2L);

        SiteBalanceDTO result = inventoryValuationService.getSiteBalance(siteId);

        assertEquals(1, result.getWarehouses().size());
        assertEquals(warehouseId, result.getWarehouses().get(0).getWarehouseId());
        assertEquals(2, result.getWarehouses().get(0).getPendingApprovalCount());
    }

    // ==================== getAllSiteBalances ====================

    @Test
    public void getAllSiteBalances_multipleSites_shouldReturnOneDTOPerSite() {
        UUID siteId1 = UUID.randomUUID();
        UUID siteId2 = UUID.randomUUID();

        Site site1 = new Site();
        site1.setId(siteId1);
        site1.setName("Site One");
        site1.setWarehouses(new ArrayList<>());

        Site site2 = new Site();
        site2.setId(siteId2);
        site2.setName("Site Two");
        site2.setWarehouses(new ArrayList<>());

        when(siteRepository.findAll()).thenReturn(List.of(site1, site2));
        when(siteRepository.findById(siteId1)).thenReturn(Optional.of(site1));
        when(siteRepository.findById(siteId2)).thenReturn(Optional.of(site2));
        when(siteValuationService.getSiteValuation(siteId1)).thenReturn(createSiteValuation(site1));
        when(siteValuationService.getSiteValuation(siteId2)).thenReturn(createSiteValuation(site2));

        List<SiteBalanceDTO> result = inventoryValuationService.getAllSiteBalances();

        assertNotNull(result);
        assertEquals(2, result.size());
    }

    @Test
    public void getAllSiteBalances_noSites_shouldReturnEmptyListWithoutCallingValuationService() {
        when(siteRepository.findAll()).thenReturn(Collections.emptyList());

        List<SiteBalanceDTO> result = inventoryValuationService.getAllSiteBalances();

        assertTrue(result.isEmpty());
        verifyNoInteractions(siteValuationService);
    }

    // ==================== getSiteValuationComplete ====================

    @Test
    public void getSiteValuationComplete_siteNotFound_shouldThrowIllegalArgumentException() {
        UUID siteId = UUID.randomUUID();
        when(siteRepository.findById(siteId)).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> inventoryValuationService.getSiteValuationComplete(siteId));

        assertEquals("Site not found", ex.getMessage());
    }

    @Test
    public void getSiteValuationComplete_validSite_shouldAlwaysRecalculateAndMapAllDTOFields() {
        UUID siteId = UUID.randomUUID();
        Site site = new Site();
        site.setId(siteId);
        site.setName("Full Site");
        site.setPhotoUrl("http://example.com/photo.jpg");

        SiteValuation valuation = createSiteValuation(site);

        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));
        when(siteValuationService.calculateSiteValuation(siteId, "SYSTEM")).thenReturn(valuation);

        SiteValuationDTO result = inventoryValuationService.getSiteValuationComplete(siteId);

        assertNotNull(result);
        assertEquals(siteId, result.getSiteId());
        assertEquals("Full Site", result.getSiteName());
        assertEquals("http://example.com/photo.jpg", result.getPhotoUrl());
        assertEquals(20000.0, result.getTotalValue());
        assertEquals(5000.0, result.getTotalExpenses());
        assertEquals(10000.0, result.getWarehouseValue());
        assertEquals(8000.0, result.getEquipmentValue());
        assertEquals(2000.0, result.getFixedAssetsValue());
        assertEquals(2000.0, result.getWarehouseExpenses());
        assertEquals(2500.0, result.getEquipmentExpenses());
        assertEquals(500.0, result.getFixedAssetsExpenses());
        assertEquals(3, result.getWarehouseCount());
        assertEquals(5, result.getEquipmentCount());
        assertEquals(2, result.getFixedAssetsCount());
        assertEquals("SYSTEM", result.getLastCalculatedBy());
        assertNotNull(result.getLastCalculatedAt());
        verify(siteValuationService).calculateSiteValuation(siteId, "SYSTEM");
    }

    @Test
    public void getSiteValuationComplete_nullLastCalculatedAt_shouldSetNullLastCalculatedAtInDTO() {
        UUID siteId = UUID.randomUUID();
        Site site = new Site();
        site.setId(siteId);
        site.setName("Null Date Site");

        SiteValuation valuation = createSiteValuation(site);
        valuation.setLastCalculatedAt(null);

        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));
        when(siteValuationService.calculateSiteValuation(siteId, "SYSTEM")).thenReturn(valuation);

        SiteValuationDTO result = inventoryValuationService.getSiteValuationComplete(siteId);

        assertNull(result.getLastCalculatedAt());
    }

    // ==================== getAllSiteValuations ====================

    @Test
    public void getAllSiteValuations_withSites_shouldRecalculateEachSiteAndReturnDTOList() {
        UUID siteId = UUID.randomUUID();
        Site site = new Site();
        site.setId(siteId);
        site.setName("Recalc Site");

        SiteValuation valuation = createSiteValuation(site);

        when(siteRepository.findAll()).thenReturn(List.of(site));
        when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));
        when(siteValuationService.calculateSiteValuation(siteId, "SYSTEM")).thenReturn(valuation);

        List<SiteValuationDTO> result = inventoryValuationService.getAllSiteValuations();

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(siteId, result.get(0).getSiteId());
        verify(siteValuationService).calculateSiteValuation(siteId, "SYSTEM");
    }

    @Test
    public void getAllSiteValuations_noSites_shouldReturnEmptyListWithoutCallingValuationService() {
        when(siteRepository.findAll()).thenReturn(Collections.emptyList());

        List<SiteValuationDTO> result = inventoryValuationService.getAllSiteValuations();

        assertTrue(result.isEmpty());
        verifyNoInteractions(siteValuationService);
    }

    // ==================== getEquipmentFinancials ====================

    @Test
    public void getEquipmentFinancials_validEquipment_shouldDelegateToCalculateAndMapAllFields() {
        UUID equipmentId = UUID.randomUUID();
        EquipmentValuation valuation = createEquipmentValuation();

        when(equipmentValuationService.calculateEquipmentValuation(equipmentId, "SYSTEM"))
                .thenReturn(valuation);

        EquipmentFinancialBreakdownDTO result =
                inventoryValuationService.getEquipmentFinancials(equipmentId);

        assertNotNull(result);
        assertEquals(50000.0, result.getPurchasePrice());
        assertEquals(45000.0, result.getCurrentValue());
        assertEquals(3000.0, result.getCurrentInventoryValue());
        assertEquals(2000.0, result.getTotalExpenses());
        assertEquals(5000.0, result.getAccumulatedDepreciation());
        assertNotNull(result.getLastUpdated());
        verify(equipmentValuationService).calculateEquipmentValuation(equipmentId, "SYSTEM");
    }

    @Test
    public void getEquipmentFinancials_nullLastCalculatedAt_shouldProduceNullLastUpdatedInDTO() {
        UUID equipmentId = UUID.randomUUID();
        EquipmentValuation valuation = createEquipmentValuation();
        valuation.setLastCalculatedAt(null);

        when(equipmentValuationService.calculateEquipmentValuation(equipmentId, "SYSTEM"))
                .thenReturn(valuation);

        EquipmentFinancialBreakdownDTO result =
                inventoryValuationService.getEquipmentFinancials(equipmentId);

        assertNull(result.getLastUpdated());
    }

    // ==================== getWarehouseItemBreakdown ====================

    @Test
    public void getWarehouseItemBreakdown_warehouseNotFound_shouldThrowIllegalArgumentException() {
        UUID warehouseId = UUID.randomUUID();
        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> inventoryValuationService.getWarehouseItemBreakdown(warehouseId));

        assertEquals("Warehouse not found", ex.getMessage());
    }

    @Test
    public void getWarehouseItemBreakdown_validWarehouseWithPricedItems_shouldReturnFullItemBreakdown() {
        UUID warehouseId = UUID.randomUUID();
        Warehouse warehouse = createWarehouse(warehouseId);
        Item item = createItem(UUID.randomUUID(), warehouse);
        item.setItemStatus(ItemStatus.IN_WAREHOUSE);
        item.setUnitPrice(200.0);
        item.setTotalValue(2000.0);

        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.of(warehouse));
        when(itemRepository.findByWarehouseAndItemStatus(warehouse, ItemStatus.IN_WAREHOUSE))
                .thenReturn(List.of(item));

        List<ItemBreakdownDTO> result =
                inventoryValuationService.getWarehouseItemBreakdown(warehouseId);

        assertNotNull(result);
        assertEquals(1, result.size());
        ItemBreakdownDTO dto = result.get(0);
        assertEquals(item.getId(), dto.getItemId());
        assertEquals("Test Item", dto.getItemName());
        assertEquals(200.0, dto.getUnitPrice());
        assertEquals(2000.0, dto.getTotalValue());
        assertEquals("kg", dto.getMeasuringUnit());
    }

    @Test
    public void getWarehouseItemBreakdown_itemsWithZeroPrice_shouldExcludeZeroPriceItems() {
        UUID warehouseId = UUID.randomUUID();
        Warehouse warehouse = createWarehouse(warehouseId);

        Item pricedItem = createItem(UUID.randomUUID(), warehouse);
        pricedItem.setItemStatus(ItemStatus.IN_WAREHOUSE);
        pricedItem.setUnitPrice(150.0);
        pricedItem.setTotalValue(1500.0);

        Item zeroPriceItem = createItem(UUID.randomUUID(), warehouse);
        zeroPriceItem.setItemStatus(ItemStatus.IN_WAREHOUSE);
        zeroPriceItem.setUnitPrice(0.0);
        zeroPriceItem.setTotalValue(0.0);

        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.of(warehouse));
        when(itemRepository.findByWarehouseAndItemStatus(warehouse, ItemStatus.IN_WAREHOUSE))
                .thenReturn(List.of(pricedItem, zeroPriceItem));

        List<ItemBreakdownDTO> result =
                inventoryValuationService.getWarehouseItemBreakdown(warehouseId);

        assertEquals(1, result.size());
        assertEquals(150.0, result.get(0).getUnitPrice());
    }

    @Test
    public void getWarehouseItemBreakdown_itemsWithNullPrice_shouldExcludeNullPriceItems() {
        UUID warehouseId = UUID.randomUUID();
        Warehouse warehouse = createWarehouse(warehouseId);
        Item nullPriceItem = createItem(UUID.randomUUID(), warehouse);
        nullPriceItem.setItemStatus(ItemStatus.IN_WAREHOUSE);
        nullPriceItem.setUnitPrice(null);

        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.of(warehouse));
        when(itemRepository.findByWarehouseAndItemStatus(warehouse, ItemStatus.IN_WAREHOUSE))
                .thenReturn(List.of(nullPriceItem));

        List<ItemBreakdownDTO> result =
                inventoryValuationService.getWarehouseItemBreakdown(warehouseId);

        assertTrue(result.isEmpty());
    }

    @Test
    public void getWarehouseItemBreakdown_itemWithNullMeasuringUnit_shouldSetNullMeasuringUnitInDTO() {
        UUID warehouseId = UUID.randomUUID();
        Warehouse warehouse = createWarehouse(warehouseId);
        Item item = createItem(UUID.randomUUID(), warehouse);
        item.setItemStatus(ItemStatus.IN_WAREHOUSE);
        item.setUnitPrice(100.0);
        item.getItemType().setMeasuringUnit(null);

        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.of(warehouse));
        when(itemRepository.findByWarehouseAndItemStatus(warehouse, ItemStatus.IN_WAREHOUSE))
                .thenReturn(List.of(item));

        List<ItemBreakdownDTO> result =
                inventoryValuationService.getWarehouseItemBreakdown(warehouseId);

        assertEquals(1, result.size());
        assertNull(result.get(0).getMeasuringUnit());
    }

    @Test
    public void getWarehouseItemBreakdown_emptyWarehouse_shouldReturnEmptyList() {
        UUID warehouseId = UUID.randomUUID();
        Warehouse warehouse = createWarehouse(warehouseId);

        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.of(warehouse));
        when(itemRepository.findByWarehouseAndItemStatus(warehouse, ItemStatus.IN_WAREHOUSE))
                .thenReturn(Collections.emptyList());

        List<ItemBreakdownDTO> result =
                inventoryValuationService.getWarehouseItemBreakdown(warehouseId);

        assertTrue(result.isEmpty());
    }

    // ==================== getEquipmentConsumablesBreakdown ====================

    @Test
    public void getEquipmentConsumablesBreakdown_consumablesWithPositiveValue_shouldReturnFullBreakdown() {
        UUID equipmentId = UUID.randomUUID();
        Consumable consumable = createConsumable(50.0, 250.0);

        when(consumableRepository.findByEquipmentIdAndStatus(equipmentId, ItemStatus.IN_WAREHOUSE))
                .thenReturn(List.of(consumable));

        List<ConsumableBreakdownDTO> result =
                inventoryValuationService.getEquipmentConsumablesBreakdown(equipmentId);

        assertNotNull(result);
        assertEquals(1, result.size());
        ConsumableBreakdownDTO dto = result.get(0);
        assertEquals("Engine Oil", dto.getItemName());
        assertEquals(50.0, dto.getUnitPrice());
        assertEquals(250.0, dto.getTotalValue());
        assertEquals("liter", dto.getMeasuringUnit());
    }

    @Test
    public void getEquipmentConsumablesBreakdown_consumablesWithZeroTotalValue_shouldExcludeItems() {
        UUID equipmentId = UUID.randomUUID();
        Consumable zero = createConsumable(0.0, 0.0);

        when(consumableRepository.findByEquipmentIdAndStatus(equipmentId, ItemStatus.IN_WAREHOUSE))
                .thenReturn(List.of(zero));

        List<ConsumableBreakdownDTO> result =
                inventoryValuationService.getEquipmentConsumablesBreakdown(equipmentId);

        assertTrue(result.isEmpty());
    }

    @Test
    public void getEquipmentConsumablesBreakdown_consumablesWithNullTotalValue_shouldExcludeItems() {
        UUID equipmentId = UUID.randomUUID();
        Consumable nullVal = createConsumable(0.0, 0.0);
        nullVal.setTotalValue(null);

        when(consumableRepository.findByEquipmentIdAndStatus(equipmentId, ItemStatus.IN_WAREHOUSE))
                .thenReturn(List.of(nullVal));

        List<ConsumableBreakdownDTO> result =
                inventoryValuationService.getEquipmentConsumablesBreakdown(equipmentId);

        assertTrue(result.isEmpty());
    }

    @Test
    public void getEquipmentConsumablesBreakdown_noConsumables_shouldReturnEmptyList() {
        UUID equipmentId = UUID.randomUUID();

        when(consumableRepository.findByEquipmentIdAndStatus(equipmentId, ItemStatus.IN_WAREHOUSE))
                .thenReturn(Collections.emptyList());

        List<ConsumableBreakdownDTO> result =
                inventoryValuationService.getEquipmentConsumablesBreakdown(equipmentId);

        assertTrue(result.isEmpty());
    }

    @Test
    public void getEquipmentConsumablesBreakdown_consumableWithNullMeasuringUnit_shouldReturnNullMeasuringUnit() {
        UUID equipmentId = UUID.randomUUID();
        Consumable consumable = createConsumable(80.0, 400.0);
        consumable.getItemType().setMeasuringUnit(null);

        when(consumableRepository.findByEquipmentIdAndStatus(equipmentId, ItemStatus.IN_WAREHOUSE))
                .thenReturn(List.of(consumable));

        List<ConsumableBreakdownDTO> result =
                inventoryValuationService.getEquipmentConsumablesBreakdown(equipmentId);

        assertEquals(1, result.size());
        assertNull(result.get(0).getMeasuringUnit());
    }

    @Test
    public void getEquipmentConsumablesBreakdown_mixedConsumables_shouldReturnOnlyPositiveValueOnes() {
        UUID equipmentId = UUID.randomUUID();
        Consumable positive = createConsumable(100.0, 500.0);
        Consumable zero = createConsumable(0.0, 0.0);
        Consumable nullVal = createConsumable(0.0, 0.0);
        nullVal.setTotalValue(null);

        when(consumableRepository.findByEquipmentIdAndStatus(equipmentId, ItemStatus.IN_WAREHOUSE))
                .thenReturn(List.of(positive, zero, nullVal));

        List<ConsumableBreakdownDTO> result =
                inventoryValuationService.getEquipmentConsumablesBreakdown(equipmentId);

        assertEquals(1, result.size());
        assertEquals(500.0, result.get(0).getTotalValue());
    }
}