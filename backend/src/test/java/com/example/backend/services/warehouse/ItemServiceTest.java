package com.example.backend.services.warehouse;

import com.example.backend.dto.item.ItemResolutionDTO;
import com.example.backend.models.finance.inventoryValuation.ItemPriceApproval;
import com.example.backend.models.warehouse.*;
import com.example.backend.repositories.finance.inventoryValuation.ItemPriceApprovalRepository;
import com.example.backend.repositories.transaction.TransactionRepository;
import com.example.backend.repositories.warehouse.ItemRepository;
import com.example.backend.repositories.warehouse.ItemResolutionRepository;
import com.example.backend.repositories.warehouse.ItemTypeRepository;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import com.example.backend.services.notification.NotificationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ItemServiceTest {

    @Mock
    private ItemRepository itemRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private WarehouseRepository warehouseRepository;

    @Mock
    private ItemTypeRepository itemTypeRepository;

    @Mock
    private ItemResolutionRepository itemResolutionRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private ItemPriceApprovalRepository itemPriceApprovalRepository;

    @InjectMocks
    private ItemService itemService;

    // ==================== createItem ====================

    @Test
    public void createItem_validInputs_shouldCreateWithPendingStatus() {
        UUID itemTypeId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();

        ItemType itemType = createItemType(itemTypeId, "Cement", 100.0);
        Warehouse warehouse = createWarehouse(warehouseId, "Main WH");

        when(itemTypeRepository.findById(itemTypeId)).thenReturn(Optional.of(itemType));
        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.of(warehouse));
        when(itemRepository.save(any(Item.class))).thenAnswer(invocation -> {
            Item item = invocation.getArgument(0);
            item.setId(UUID.randomUUID());
            return item;
        });
        when(itemPriceApprovalRepository.save(any(ItemPriceApproval.class))).thenAnswer(i -> i.getArgument(0));

        Item result = itemService.createItem(itemTypeId, warehouseId, 50, "admin", LocalDateTime.now());

        assertNotNull(result);
        assertEquals(ItemStatus.PENDING, result.getItemStatus());
        assertEquals(50, result.getQuantity());
        assertEquals(ItemSource.MANUAL_ENTRY, result.getItemSource());
        assertNull(result.getUnitPrice());
        assertEquals(0.0, result.getTotalValue());
        verify(itemRepository).save(any(Item.class));
        verify(itemPriceApprovalRepository).save(any(ItemPriceApproval.class));
    }

    @Test
    public void createItem_invalidItemType_shouldThrow() {
        UUID fakeId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();

        when(itemTypeRepository.findById(fakeId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> itemService.createItem(fakeId, warehouseId, 10, "admin", LocalDateTime.now()));
    }

    @Test
    public void createItem_invalidWarehouse_shouldThrow() {
        UUID itemTypeId = UUID.randomUUID();
        UUID fakeWarehouseId = UUID.randomUUID();

        ItemType itemType = createItemType(itemTypeId, "Cement", 100.0);
        when(itemTypeRepository.findById(itemTypeId)).thenReturn(Optional.of(itemType));
        when(warehouseRepository.findById(fakeWarehouseId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> itemService.createItem(itemTypeId, fakeWarehouseId, 10, "admin", LocalDateTime.now()));
    }

    // ==================== getItemsByWarehouse ====================

    @Test
    public void getItemsByWarehouse_validWarehouse_shouldReturnItems() {
        UUID warehouseId = UUID.randomUUID();
        Warehouse warehouse = createWarehouse(warehouseId, "WH");

        List<Item> items = List.of(createItem(ItemStatus.IN_WAREHOUSE), createItem(ItemStatus.PENDING));

        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.of(warehouse));
        when(itemRepository.findByWarehouseWithTransactionItems(warehouse)).thenReturn(items);

        List<Item> result = itemService.getItemsByWarehouse(warehouseId);

        assertEquals(2, result.size());
    }

    @Test
    public void getItemsByWarehouse_invalidWarehouse_shouldThrow() {
        UUID fakeId = UUID.randomUUID();
        when(warehouseRepository.findById(fakeId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> itemService.getItemsByWarehouse(fakeId));
    }

    // ==================== getDiscrepancyItems ====================

    @Test
    public void getDiscrepancyItems_shouldReturnUnresolvedDiscrepancies() {
        UUID warehouseId = UUID.randomUUID();
        Warehouse warehouse = createWarehouse(warehouseId, "WH");

        Item missing = createItem(ItemStatus.MISSING);
        Item overreceived = createItem(ItemStatus.OVERRECEIVED);

        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.of(warehouse));
        when(itemRepository.findByWarehouseAndItemStatusInAndResolvedFalse(
                eq(warehouse), eq(List.of(ItemStatus.MISSING, ItemStatus.OVERRECEIVED))))
                .thenReturn(List.of(missing, overreceived));

        List<Item> result = itemService.getDiscrepancyItems(warehouseId);

        assertEquals(2, result.size());
    }

    @Test
    public void getDiscrepancyItems_invalidWarehouse_shouldThrow() {
        UUID fakeId = UUID.randomUUID();
        when(warehouseRepository.findById(fakeId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> itemService.getDiscrepancyItems(fakeId));
    }

    // ==================== getResolvedItems ====================

    @Test
    public void getResolvedItems_shouldReturnResolved() {
        UUID warehouseId = UUID.randomUUID();
        Warehouse warehouse = createWarehouse(warehouseId, "WH");

        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.of(warehouse));
        when(itemRepository.findByWarehouseAndResolvedTrue(warehouse))
                .thenReturn(List.of(createItem(ItemStatus.MISSING)));

        List<Item> result = itemService.getResolvedItems(warehouseId);

        assertEquals(1, result.size());
    }

    // ==================== deleteItem ====================

    @Test
    public void deleteItem_found_shouldDelete() {
        UUID itemId = UUID.randomUUID();
        Item item = createItem(ItemStatus.IN_WAREHOUSE);
        item.setId(itemId);

        when(itemRepository.findById(itemId)).thenReturn(Optional.of(item));

        itemService.deleteItem(itemId);

        verify(itemRepository).delete(item);
    }

    @Test
    public void deleteItem_notFound_shouldThrow() {
        UUID fakeId = UUID.randomUUID();
        when(itemRepository.findById(fakeId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> itemService.deleteItem(fakeId));
    }

    // ==================== hasExistingWarehouseItems ====================

    @Test
    public void hasExistingWarehouseItems_exists_shouldReturnTrue() {
        UUID warehouseId = UUID.randomUUID();
        UUID itemTypeId = UUID.randomUUID();

        when(itemRepository.findAllByItemTypeIdAndWarehouseIdAndItemStatus(itemTypeId, warehouseId, ItemStatus.IN_WAREHOUSE))
                .thenReturn(List.of(createItem(ItemStatus.IN_WAREHOUSE)));

        assertTrue(itemService.hasExistingWarehouseItems(warehouseId, itemTypeId));
    }

    @Test
    public void hasExistingWarehouseItems_notExists_shouldReturnFalse() {
        UUID warehouseId = UUID.randomUUID();
        UUID itemTypeId = UUID.randomUUID();

        when(itemRepository.findAllByItemTypeIdAndWarehouseIdAndItemStatus(itemTypeId, warehouseId, ItemStatus.IN_WAREHOUSE))
                .thenReturn(List.of());

        assertFalse(itemService.hasExistingWarehouseItems(warehouseId, itemTypeId));
    }

    // ==================== getTotalQuantityByType ====================

    @Test
    public void getTotalQuantityByType_shouldSumAllStatuses() {
        UUID warehouseId = UUID.randomUUID();
        UUID itemTypeId = UUID.randomUUID();

        Item item1 = createItem(ItemStatus.IN_WAREHOUSE);
        item1.setQuantity(30);
        Item item2 = createItem(ItemStatus.PENDING);
        item2.setQuantity(20);

        when(itemRepository.findAllByItemTypeIdAndWarehouseId(itemTypeId, warehouseId))
                .thenReturn(List.of(item1, item2));

        assertEquals(50, itemService.getTotalQuantityByType(warehouseId, itemTypeId));
    }

    // ==================== getAvailableQuantityByType ====================

    @Test
    public void getAvailableQuantityByType_shouldSumOnlyInWarehouse() {
        UUID warehouseId = UUID.randomUUID();
        UUID itemTypeId = UUID.randomUUID();

        Item item1 = createItem(ItemStatus.IN_WAREHOUSE);
        item1.setQuantity(30);

        when(itemRepository.findAllByItemTypeIdAndWarehouseIdAndItemStatus(itemTypeId, warehouseId, ItemStatus.IN_WAREHOUSE))
                .thenReturn(List.of(item1));

        assertEquals(30, itemService.getAvailableQuantityByType(warehouseId, itemTypeId));
    }

    // ==================== mergeDuplicateItems ====================

    @Test
    public void mergeDuplicateItems_withDuplicates_shouldMerge() {
        UUID warehouseId = UUID.randomUUID();
        UUID itemTypeId = UUID.randomUUID();

        Item item1 = createItem(ItemStatus.IN_WAREHOUSE);
        item1.setQuantity(10);
        Item item2 = createItem(ItemStatus.IN_WAREHOUSE);
        item2.setQuantity(20);
        Item item3 = createItem(ItemStatus.IN_WAREHOUSE);
        item3.setQuantity(15);

        when(itemRepository.findAllByItemTypeIdAndWarehouseIdAndItemStatus(itemTypeId, warehouseId, ItemStatus.IN_WAREHOUSE))
                .thenReturn(List.of(item1, item2, item3));

        itemService.mergeDuplicateItems(warehouseId, itemTypeId, ItemStatus.IN_WAREHOUSE);

        assertEquals(45, item1.getQuantity()); // 10 + 20 + 15
        verify(itemRepository).save(item1);
        verify(itemRepository).delete(item2);
        verify(itemRepository).delete(item3);
    }

    @Test
    public void mergeDuplicateItems_singleItem_shouldDoNothing() {
        UUID warehouseId = UUID.randomUUID();
        UUID itemTypeId = UUID.randomUUID();

        when(itemRepository.findAllByItemTypeIdAndWarehouseIdAndItemStatus(itemTypeId, warehouseId, ItemStatus.IN_WAREHOUSE))
                .thenReturn(List.of(createItem(ItemStatus.IN_WAREHOUSE)));

        itemService.mergeDuplicateItems(warehouseId, itemTypeId, ItemStatus.IN_WAREHOUSE);

        verify(itemRepository, never()).save(any());
        verify(itemRepository, never()).delete(any());
    }

    // ==================== resolveDiscrepancy ====================

    @Test
    public void resolveDiscrepancy_acknowledgeLoss_shouldResolve() {
        Item missingItem = createItem(ItemStatus.MISSING);
        missingItem.setId(UUID.randomUUID());
        missingItem.setTransactionItem(null);

        ItemResolutionDTO request = new ItemResolutionDTO();
        request.setItemId(missingItem.getId());
        request.setResolutionType(ResolutionType.ACKNOWLEDGE_LOSS);
        request.setNotes("Items lost in transit");
        request.setResolvedBy("admin");

        when(itemRepository.findById(missingItem.getId())).thenReturn(Optional.of(missingItem));
        when(itemResolutionRepository.save(any(ItemResolution.class))).thenAnswer(invocation -> {
            ItemResolution res = invocation.getArgument(0);
            res.setId(UUID.randomUUID());
            return res;
        });

        ItemResolution result = itemService.resolveDiscrepancy(request);

        assertNotNull(result);
        assertTrue(missingItem.isResolved());
        assertEquals(ResolutionType.ACKNOWLEDGE_LOSS, result.getResolutionType());
        assertEquals(ItemStatus.MISSING, result.getOriginalStatus());
    }

    @Test
    public void resolveDiscrepancy_itemNotDiscrepancy_shouldThrow() {
        Item normalItem = createItem(ItemStatus.IN_WAREHOUSE);
        normalItem.setId(UUID.randomUUID());

        ItemResolutionDTO request = new ItemResolutionDTO();
        request.setItemId(normalItem.getId());
        request.setResolutionType(ResolutionType.ACKNOWLEDGE_LOSS);

        when(itemRepository.findById(normalItem.getId())).thenReturn(Optional.of(normalItem));

        assertThrows(IllegalArgumentException.class,
                () -> itemService.resolveDiscrepancy(request));
    }

    @Test
    public void resolveDiscrepancy_itemNotFound_shouldThrow() {
        UUID fakeId = UUID.randomUUID();

        ItemResolutionDTO request = new ItemResolutionDTO();
        request.setItemId(fakeId);

        when(itemRepository.findById(fakeId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> itemService.resolveDiscrepancy(request));
    }

    @Test
    public void resolveDiscrepancy_acceptSurplus_shouldResolveWithoutAddingToInventory() {
        Item overreceivedItem = createItem(ItemStatus.OVERRECEIVED);
        overreceivedItem.setId(UUID.randomUUID());
        overreceivedItem.setQuantity(5);
        overreceivedItem.setTransactionItem(null);

        ItemResolutionDTO request = new ItemResolutionDTO();
        request.setItemId(overreceivedItem.getId());
        request.setResolutionType(ResolutionType.ACCEPT_SURPLUS);
        request.setNotes("Surplus accepted");
        request.setResolvedBy("admin");

        when(itemRepository.findById(overreceivedItem.getId())).thenReturn(Optional.of(overreceivedItem));
        when(itemResolutionRepository.save(any(ItemResolution.class))).thenAnswer(i -> {
            ItemResolution res = i.getArgument(0);
            res.setId(UUID.randomUUID());
            return res;
        });

        ItemResolution result = itemService.resolveDiscrepancy(request);

        assertTrue(overreceivedItem.isResolved());
        assertEquals(ResolutionType.ACCEPT_SURPLUS, result.getResolutionType());
        assertEquals(ItemStatus.OVERRECEIVED, result.getOriginalStatus());
    }

    @Test
    public void resolveDiscrepancy_returnToSender_shouldSetPendingStatus() {
        Item overreceivedItem = createItem(ItemStatus.OVERRECEIVED);
        overreceivedItem.setId(UUID.randomUUID());
        overreceivedItem.setTransactionItem(null);

        ItemResolutionDTO request = new ItemResolutionDTO();
        request.setItemId(overreceivedItem.getId());
        request.setResolutionType(ResolutionType.RETURN_TO_SENDER);
        request.setNotes("Return to sender");
        request.setResolvedBy("admin");

        when(itemRepository.findById(overreceivedItem.getId())).thenReturn(Optional.of(overreceivedItem));
        when(itemResolutionRepository.save(any(ItemResolution.class))).thenAnswer(i -> {
            ItemResolution res = i.getArgument(0);
            res.setId(UUID.randomUUID());
            return res;
        });

        itemService.resolveDiscrepancy(request);

        assertTrue(overreceivedItem.isResolved());
        assertEquals(ItemStatus.PENDING, overreceivedItem.getItemStatus());
    }

    // ==================== getItemResolutionHistory ====================

    @Test
    public void getItemResolutionHistory_shouldReturnResolutions() {
        UUID itemId = UUID.randomUUID();
        List<ItemResolution> resolutions = List.of(
                ItemResolution.builder().id(UUID.randomUUID()).build()
        );
        when(itemResolutionRepository.findByItemId(itemId)).thenReturn(resolutions);

        List<ItemResolution> result = itemService.getItemResolutionHistory(itemId);

        assertEquals(1, result.size());
    }

    // ==================== getItemResolutionsByUser ====================

    @Test
    public void getItemResolutionsByUser_shouldReturnResolutions() {
        when(itemResolutionRepository.findByResolvedBy("admin"))
                .thenReturn(List.of(ItemResolution.builder().id(UUID.randomUUID()).build()));

        List<ItemResolution> result = itemService.getItemResolutionsByUser("admin");

        assertEquals(1, result.size());
    }

    // ==================== getWarehouseItemHistory ====================

    @Test
    public void getWarehouseItemHistory_shouldReturnInWarehouseItems() {
        UUID warehouseId = UUID.randomUUID();
        Warehouse warehouse = createWarehouse(warehouseId, "WH");

        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.of(warehouse));
        when(itemRepository.findByWarehouseAndItemStatus(warehouse, ItemStatus.IN_WAREHOUSE))
                .thenReturn(List.of(createItem(ItemStatus.IN_WAREHOUSE)));

        List<Item> result = itemService.getWarehouseItemHistory(warehouseId);

        assertEquals(1, result.size());
    }

    @Test
    public void getWarehouseItemHistory_invalidWarehouse_shouldThrow() {
        UUID fakeId = UUID.randomUUID();
        when(warehouseRepository.findById(fakeId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> itemService.getWarehouseItemHistory(fakeId));
    }

    // ==================== Helpers ====================

    private ItemType createItemType(UUID id, String name, Double basePrice) {
        ItemType itemType = new ItemType();
        itemType.setId(id);
        itemType.setName(name);
        itemType.setBasePrice(basePrice);
        return itemType;
    }

    private Warehouse createWarehouse(UUID id, String name) {
        Warehouse warehouse = new Warehouse();
        warehouse.setId(id);
        warehouse.setName(name);
        return warehouse;
    }

    private Item createItem(ItemStatus status) {
        Item item = new Item();
        item.setId(UUID.randomUUID());
        item.setItemStatus(status);
        item.setQuantity(10);
        item.setResolved(false);

        ItemType itemType = new ItemType();
        itemType.setId(UUID.randomUUID());
        itemType.setName("Test Item Type");
        item.setItemType(itemType);

        Warehouse warehouse = new Warehouse();
        warehouse.setId(UUID.randomUUID());
        warehouse.setName("Test Warehouse");
        item.setWarehouse(warehouse);

        return item;
    }
}