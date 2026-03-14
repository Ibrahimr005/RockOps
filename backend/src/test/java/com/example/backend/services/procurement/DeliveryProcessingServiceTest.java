package com.example.backend.services.procurement;

import com.example.backend.dto.procurement.EquipmentReceiptRequest;
import com.example.backend.dto.procurement.ProcessDeliveryRequest;
import com.example.backend.dto.procurement.ProcessItemReceiptRequest;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.procurement.DeliveryItemReceipt;
import com.example.backend.models.procurement.DeliverySession;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrder;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderItem;
import com.example.backend.models.procurement.RequestOrder.RequestOrder;
import com.example.backend.models.warehouse.*;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.repositories.procurement.*;
import com.example.backend.repositories.warehouse.ItemRepository;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import com.example.backend.services.warehouse.ItemTypeService;
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
public class DeliveryProcessingServiceTest {

    @Mock
    private DeliverySessionRepository deliverySessionRepository;

    @Mock
    private DeliveryItemReceiptRepository deliveryItemReceiptRepository;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    @Mock
    private PurchaseOrderItemRepository purchaseOrderItemRepository;

    @Mock
    private PurchaseOrderIssueRepository purchaseOrderIssueRepository;

    @Mock
    private ItemRepository itemRepository;

    @Mock
    private WarehouseRepository warehouseRepository;

    @Mock
    private ItemTypeService itemTypeService;

    @Mock
    private PurchaseOrderService purchaseOrderService;

    @Mock
    private EquipmentRepository equipmentRepository;

    @InjectMocks
    private DeliveryProcessingService deliveryProcessingService;

    // ==================== processDelivery ====================

    @Test
    public void processDelivery_poNotFound_shouldThrow() {
        UUID poId = UUID.randomUUID();
        ProcessDeliveryRequest request = new ProcessDeliveryRequest();
        request.setPurchaseOrderId(poId);

        when(purchaseOrderRepository.findById(poId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> deliveryProcessingService.processDelivery(request));
    }

    @Test
    public void processDelivery_poItemNotFound_shouldThrow() {
        UUID poId = UUID.randomUUID();
        UUID poItemId = UUID.randomUUID();

        Merchant merchant = new Merchant();
        merchant.setId(UUID.randomUUID());
        merchant.setName("Supplier A");

        PurchaseOrderItem poItem = new PurchaseOrderItem();
        poItem.setId(UUID.randomUUID());
        poItem.setMerchant(merchant);

        PurchaseOrder po = new PurchaseOrder();
        po.setId(poId);
        po.setPoNumber("PO-001");
        po.setPurchaseOrderItems(List.of(poItem));

        ProcessItemReceiptRequest itemReceipt = new ProcessItemReceiptRequest();
        itemReceipt.setPurchaseOrderItemId(poItemId);
        itemReceipt.setGoodQuantity(5.0);
        itemReceipt.setIsRedelivery(false);

        ProcessDeliveryRequest request = new ProcessDeliveryRequest();
        request.setPurchaseOrderId(poId);
        request.setProcessedBy("admin");
        request.setItemReceipts(List.of(itemReceipt));

        when(purchaseOrderRepository.findById(poId)).thenReturn(Optional.of(po));
        when(purchaseOrderItemRepository.findById(poItemId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> deliveryProcessingService.processDelivery(request));
    }

    @Test
    public void processDelivery_success_shouldCreateSessionAndReceipts() {
        UUID poId = UUID.randomUUID();
        UUID poItemId = UUID.randomUUID();
        UUID warehouseId = UUID.randomUUID();

        Merchant merchant = new Merchant();
        merchant.setId(UUID.randomUUID());
        merchant.setName("Supplier A");

        ItemType itemType = new ItemType();
        itemType.setId(UUID.randomUUID());
        itemType.setName("Cement");

        PurchaseOrderItem poItem = new PurchaseOrderItem();
        poItem.setId(poItemId);
        poItem.setMerchant(merchant);
        poItem.setItemType(itemType);
        poItem.setQuantity(10.0);
        poItem.setUnitPrice(100.0);
        poItem.setItemReceipts(new ArrayList<>());
        poItem.setStatus("PENDING");

        RequestOrder ro = new RequestOrder();
        ro.setId(UUID.randomUUID());
        ro.setPartyType("WAREHOUSE");
        ro.setRequesterId(warehouseId);

        PurchaseOrder po = new PurchaseOrder();
        po.setId(poId);
        po.setPoNumber("PO-001");
        po.setPurchaseOrderItems(new ArrayList<>(List.of(poItem)));
        po.setRequestOrder(ro);
        poItem.setPurchaseOrder(po);

        Warehouse warehouse = new Warehouse();
        warehouse.setId(warehouseId);
        warehouse.setName("Main Warehouse");

        ProcessItemReceiptRequest itemReceipt = new ProcessItemReceiptRequest();
        itemReceipt.setPurchaseOrderItemId(poItemId);
        itemReceipt.setGoodQuantity(10.0);
        itemReceipt.setIsRedelivery(false);

        ProcessDeliveryRequest request = new ProcessDeliveryRequest();
        request.setPurchaseOrderId(poId);
        request.setProcessedBy("admin");
        request.setDeliveryNotes("All items received");
        request.setItemReceipts(List.of(itemReceipt));

        when(purchaseOrderRepository.findById(poId)).thenReturn(Optional.of(po));
        when(purchaseOrderItemRepository.findById(poItemId)).thenReturn(Optional.of(poItem));
        when(deliverySessionRepository.save(any(DeliverySession.class))).thenAnswer(i -> {
            DeliverySession s = i.getArgument(0);
            s.setId(UUID.randomUUID());
            return s;
        });
        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.of(warehouse));
        when(itemRepository.save(any(Item.class))).thenAnswer(i -> {
            Item item = i.getArgument(0);
            item.setId(UUID.randomUUID());
            return item;
        });
        when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(i -> i.getArgument(0));

        var result = deliveryProcessingService.processDelivery(request);

        assertNotNull(result);
        verify(deliverySessionRepository).save(any(DeliverySession.class));
        verify(itemRepository, atLeastOnce()).save(any(Item.class));
        verify(purchaseOrderService).updatePurchaseOrderStatusComplete(poId);
    }

    // ==================== processEquipmentDelivery ====================

    @Test
    public void processEquipmentDelivery_poNotFound_shouldThrow() {
        UUID poId = UUID.randomUUID();
        EquipmentReceiptRequest request = new EquipmentReceiptRequest();

        when(purchaseOrderRepository.findById(poId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> deliveryProcessingService.processEquipmentDelivery(poId, request));
    }

    @Test
    public void processEquipmentDelivery_notEquipmentOrder_shouldThrow() {
        UUID poId = UUID.randomUUID();

        Merchant merchant = new Merchant();
        merchant.setId(UUID.randomUUID());
        merchant.setName("Supplier");

        PurchaseOrderItem poItem = new PurchaseOrderItem();
        poItem.setId(UUID.randomUUID());
        poItem.setMerchant(merchant);

        RequestOrder ro = new RequestOrder();
        ro.setId(UUID.randomUUID());
        ro.setPartyType("WAREHOUSE"); // Not EQUIPMENT

        PurchaseOrder po = new PurchaseOrder();
        po.setId(poId);
        po.setPoNumber("PO-001");
        po.setRequestOrder(ro);
        po.setPurchaseOrderItems(List.of(poItem));

        EquipmentReceiptRequest request = new EquipmentReceiptRequest();

        when(purchaseOrderRepository.findById(poId)).thenReturn(Optional.of(po));

        assertThrows(RuntimeException.class,
                () -> deliveryProcessingService.processEquipmentDelivery(poId, request));
    }

    @Test
    public void processEquipmentDelivery_nullRequestOrder_shouldThrow() {
        UUID poId = UUID.randomUUID();

        PurchaseOrder po = new PurchaseOrder();
        po.setId(poId);
        po.setPoNumber("PO-001");
        po.setRequestOrder(null);
        po.setPurchaseOrderItems(new ArrayList<>());

        EquipmentReceiptRequest request = new EquipmentReceiptRequest();

        when(purchaseOrderRepository.findById(poId)).thenReturn(Optional.of(po));

        assertThrows(RuntimeException.class,
                () -> deliveryProcessingService.processEquipmentDelivery(poId, request));
    }
}