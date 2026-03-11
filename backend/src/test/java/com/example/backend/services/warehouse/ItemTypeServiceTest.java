package com.example.backend.services.warehouse;

import com.example.backend.models.warehouse.*;
import com.example.backend.repositories.finance.inventoryValuation.ItemPriceApprovalRepository;
import com.example.backend.repositories.procurement.PurchaseOrderRepository;
import com.example.backend.repositories.warehouse.ItemCategoryRepository;
import com.example.backend.repositories.warehouse.ItemRepository;
import com.example.backend.repositories.warehouse.ItemTypeRepository;
import com.example.backend.repositories.warehouse.MeasuringUnitRepository;
import com.example.backend.services.notification.NotificationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ItemTypeServiceTest {

    @Mock
    private ItemTypeRepository itemTypeRepository;

    @Mock
    private ItemCategoryRepository itemCategoryRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private ItemRepository itemRepository;

    @Mock
    private ItemPriceApprovalRepository itemPriceApprovalRepository;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    @Mock
    private MeasuringUnitRepository measuringUnitRepository;

    @InjectMocks
    private ItemTypeService itemTypeService;

    // ==================== addItemType ====================

    @Test
    public void addItemType_withAllFields_shouldCreate() {
        UUID categoryId = UUID.randomUUID();
        ItemCategory category = new ItemCategory();
        category.setId(categoryId);
        category.setName("Electronics");

        MeasuringUnit unit = new MeasuringUnit();
        unit.setName("Piece");

        Map<String, Object> request = new HashMap<>();
        request.put("name", "Laptop");
        request.put("comment", "Dell laptops");
        request.put("measuringUnit", "Piece");
        request.put("status", "active");
        request.put("minQuantity", 5);
        request.put("serialNumber", "SN-001");
        request.put("basePrice", 1500.0);
        request.put("itemCategory", categoryId.toString());

        when(measuringUnitRepository.findByName("Piece")).thenReturn(Optional.of(unit));
        when(itemCategoryRepository.findById(categoryId)).thenReturn(Optional.of(category));
        when(itemTypeRepository.save(any(ItemType.class))).thenAnswer(invocation -> {
            ItemType it = invocation.getArgument(0);
            it.setId(UUID.randomUUID());
            return it;
        });

        ItemType result = itemTypeService.addItemType(request);

        assertNotNull(result);
        assertEquals("Laptop", result.getName());
        assertEquals("Dell laptops", result.getComment());
        assertEquals("active", result.getStatus());
        assertEquals(5, result.getMinQuantity());
        assertEquals("SN-001", result.getSerialNumber());
        assertEquals(1500.0, result.getBasePrice());
        assertEquals(category, result.getItemCategory());
        verify(itemTypeRepository).save(any(ItemType.class));
    }

    @Test
    public void addItemType_withNewMeasuringUnit_shouldAutoCreate() {
        Map<String, Object> request = new HashMap<>();
        request.put("name", "Cable");
        request.put("measuringUnit", "Roll");

        when(measuringUnitRepository.findByName("Roll")).thenReturn(Optional.empty());
        when(measuringUnitRepository.save(any(MeasuringUnit.class))).thenAnswer(i -> {
            MeasuringUnit u = i.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });
        when(itemTypeRepository.save(any(ItemType.class))).thenAnswer(i -> {
            ItemType it = i.getArgument(0);
            it.setId(UUID.randomUUID());
            return it;
        });

        ItemType result = itemTypeService.addItemType(request);

        assertNotNull(result);
        verify(measuringUnitRepository).save(any(MeasuringUnit.class));
    }

    @Test
    public void addItemType_withInvalidCategory_shouldThrow() {
        UUID fakeId = UUID.randomUUID();
        Map<String, Object> request = new HashMap<>();
        request.put("name", "Item");
        request.put("itemCategory", fakeId.toString());

        when(itemCategoryRepository.findById(fakeId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> itemTypeService.addItemType(request));
    }

    @Test
    public void addItemType_withBasePriceAsString_shouldParse() {
        Map<String, Object> request = new HashMap<>();
        request.put("name", "Screw");
        request.put("basePrice", "25.50");

        when(itemTypeRepository.save(any(ItemType.class))).thenAnswer(i -> {
            ItemType it = i.getArgument(0);
            it.setId(UUID.randomUUID());
            return it;
        });

        ItemType result = itemTypeService.addItemType(request);

        assertEquals(25.50, result.getBasePrice());
    }

    @Test
    public void addItemType_withInvalidBasePriceString_shouldThrow() {
        Map<String, Object> request = new HashMap<>();
        request.put("name", "Screw");
        request.put("basePrice", "not-a-number");

        assertThrows(IllegalArgumentException.class,
                () -> itemTypeService.addItemType(request));
    }

    // ==================== getItemTypeById ====================

    @Test
    public void getItemTypeById_found_shouldReturn() {
        UUID id = UUID.randomUUID();
        ItemType itemType = new ItemType();
        itemType.setId(id);
        itemType.setName("Bolt");

        when(itemTypeRepository.findById(id)).thenReturn(Optional.of(itemType));

        ItemType result = itemTypeService.getItemTypeById(id);

        assertEquals("Bolt", result.getName());
    }

    @Test
    public void getItemTypeById_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(itemTypeRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> itemTypeService.getItemTypeById(id));
    }

    // ==================== getAllItemTypes ====================

    @Test
    public void getAllItemTypes_shouldReturnAll() {
        ItemType it1 = new ItemType();
        it1.setName("Type1");
        ItemType it2 = new ItemType();
        it2.setName("Type2");

        when(itemTypeRepository.findAll()).thenReturn(List.of(it1, it2));

        List<ItemType> result = itemTypeService.getAllItemTypes();

        assertEquals(2, result.size());
    }

    // ==================== updateItemType ====================

    @Test
    public void updateItemType_basicFields_shouldUpdate() {
        UUID id = UUID.randomUUID();
        ItemType existing = new ItemType();
        existing.setId(id);
        existing.setName("OldName");

        when(itemTypeRepository.findById(id)).thenReturn(Optional.of(existing));
        when(itemTypeRepository.save(any(ItemType.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> request = new HashMap<>();
        request.put("name", "NewName");
        request.put("status", "inactive");
        request.put("minQuantity", 10);
        request.put("comment", "Updated comment");

        ItemType result = itemTypeService.updateItemType(id, request);

        assertEquals("NewName", result.getName());
        assertEquals("inactive", result.getStatus());
        assertEquals(10, result.getMinQuantity());
        assertEquals("Updated comment", result.getComment());
    }

    @Test
    public void updateItemType_emptyComment_shouldSetDefault() {
        UUID id = UUID.randomUUID();
        ItemType existing = new ItemType();
        existing.setId(id);
        existing.setName("Name");

        when(itemTypeRepository.findById(id)).thenReturn(Optional.of(existing));
        when(itemTypeRepository.save(any(ItemType.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> request = new HashMap<>();
        request.put("name", "Name");
        request.put("comment", "");

        ItemType result = itemTypeService.updateItemType(id, request);

        assertEquals("No comment", result.getComment());
    }

    // ==================== deleteItemType ====================

    @Test
    public void deleteItemType_noDependencies_shouldDelete() {
        UUID id = UUID.randomUUID();
        ItemType itemType = new ItemType();
        itemType.setId(id);
        itemType.setName("ToDelete");
        itemType.setItems(new ArrayList<>());
        itemType.setTransactionItems(new ArrayList<>());
        itemType.setRequestOrderItems(new ArrayList<>());
        itemType.setOfferItems(new ArrayList<>());

        when(itemTypeRepository.findById(id)).thenReturn(Optional.of(itemType));

        itemTypeService.deleteItemType(id);

        verify(itemTypeRepository).delete(itemType);
    }

    @Test
    public void deleteItemType_hasItems_shouldThrow() {
        UUID id = UUID.randomUUID();
        ItemType itemType = new ItemType();
        itemType.setId(id);
        itemType.setName("HasItems");
        itemType.setItems(List.of(new Item()));
        itemType.setTransactionItems(new ArrayList<>());

        when(itemTypeRepository.findById(id)).thenReturn(Optional.of(itemType));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> itemTypeService.deleteItemType(id));
        assertEquals("ITEMS_EXIST", ex.getMessage());
    }

    @Test
    public void deleteItemType_hasTransactionItems_shouldThrow() {
        UUID id = UUID.randomUUID();
        ItemType itemType = new ItemType();
        itemType.setId(id);
        itemType.setName("HasTransactions");
        itemType.setItems(new ArrayList<>());
        itemType.setTransactionItems(List.of(new com.example.backend.models.transaction.TransactionItem()));

        when(itemTypeRepository.findById(id)).thenReturn(Optional.of(itemType));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> itemTypeService.deleteItemType(id));
        assertEquals("TRANSACTION_ITEMS_EXIST", ex.getMessage());
    }

    @Test
    public void deleteItemType_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(itemTypeRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> itemTypeService.deleteItemType(id));
    }
}