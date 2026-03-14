package com.example.backend.services.procurement;

import com.example.backend.dto.procurement.PurchaseOrderReturn.CreatePurchaseOrderReturnDTO;
import com.example.backend.dto.procurement.PurchaseOrderReturn.PurchaseOrderReturnResponseDTO;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrder;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderItem;
import com.example.backend.models.procurement.PurchaseOrderReturn.PurchaseOrderReturn;
import com.example.backend.models.procurement.PurchaseOrderReturn.PurchaseOrderReturnItem;
import com.example.backend.models.procurement.PurchaseOrderReturn.PurchaseOrderReturnStatus;
import com.example.backend.models.warehouse.ItemType;
import com.example.backend.repositories.procurement.PurchaseOrderItemRepository;
import com.example.backend.repositories.procurement.PurchaseOrderRepository;
import com.example.backend.repositories.procurement.PurchaseOrderReturnRepository;
import com.example.backend.services.finance.incomingPayments.IncomingPaymentRequestService;
import com.example.backend.services.id.EntityIdGeneratorService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class PurchaseOrderReturnServiceTest {

    @Mock
    private PurchaseOrderReturnRepository purchaseOrderReturnRepository;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    @Mock
    private PurchaseOrderItemRepository purchaseOrderItemRepository;

    @Mock
    private IncomingPaymentRequestService incomingPaymentRequestService;

    @Mock
    private EntityIdGeneratorService entityIdGeneratorService;

    @InjectMocks
    private PurchaseOrderReturnService service;

    // ==================== getAllPurchaseOrderReturns ====================

    @Test
    public void getAllPurchaseOrderReturns_shouldReturnAll() {
        PurchaseOrderReturn poReturn = createPOReturn();
        when(purchaseOrderReturnRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(poReturn));

        List<PurchaseOrderReturnResponseDTO> result = service.getAllPurchaseOrderReturns();

        assertEquals(1, result.size());
    }

    @Test
    public void getAllPurchaseOrderReturns_empty_shouldReturnEmpty() {
        when(purchaseOrderReturnRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of());

        List<PurchaseOrderReturnResponseDTO> result = service.getAllPurchaseOrderReturns();

        assertTrue(result.isEmpty());
    }

    // ==================== getPurchaseOrderReturnsByStatus ====================

    @Test
    public void getPurchaseOrderReturnsByStatus_shouldReturnFiltered() {
        PurchaseOrderReturn poReturn = createPOReturn();
        when(purchaseOrderReturnRepository.findByStatusOrderByCreatedAtDesc(PurchaseOrderReturnStatus.PENDING))
                .thenReturn(List.of(poReturn));

        List<PurchaseOrderReturnResponseDTO> result = service.getPurchaseOrderReturnsByStatus(PurchaseOrderReturnStatus.PENDING);

        assertEquals(1, result.size());
    }

    // ==================== getPurchaseOrderReturnById ====================

    @Test
    public void getPurchaseOrderReturnById_found_shouldReturn() {
        UUID id = UUID.randomUUID();
        PurchaseOrderReturn poReturn = createPOReturn();
        poReturn.setId(id);

        when(purchaseOrderReturnRepository.findById(id)).thenReturn(Optional.of(poReturn));

        PurchaseOrderReturnResponseDTO result = service.getPurchaseOrderReturnById(id);

        assertNotNull(result);
        assertEquals(id, result.getId());
    }

    @Test
    public void getPurchaseOrderReturnById_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(purchaseOrderReturnRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> service.getPurchaseOrderReturnById(id));
    }

    // ==================== createPurchaseOrderReturn ====================

    @Test
    public void createPurchaseOrderReturn_success_shouldCreate() {
        UUID poId = UUID.randomUUID();
        UUID poItemId = UUID.randomUUID();

        PurchaseOrder po = createPurchaseOrder(poId);
        PurchaseOrderItem poItem = createPOItem(poItemId, po);

        CreatePurchaseOrderReturnDTO.ReturnItemRequest itemRequest = new CreatePurchaseOrderReturnDTO.ReturnItemRequest();
        itemRequest.setPurchaseOrderItemId(poItemId);
        itemRequest.setReturnQuantity(5.0);
        itemRequest.setReason("Defective");

        CreatePurchaseOrderReturnDTO dto = new CreatePurchaseOrderReturnDTO();
        dto.setReason("Quality issue");
        dto.setItems(List.of(itemRequest));

        when(purchaseOrderRepository.findById(poId)).thenReturn(Optional.of(po));
        when(purchaseOrderItemRepository.findAllById(List.of(poItemId))).thenReturn(List.of(poItem));
        when(purchaseOrderItemRepository.findById(poItemId)).thenReturn(Optional.of(poItem));
        when(entityIdGeneratorService.generateNextId(any())).thenReturn("POR-001");
        when(purchaseOrderReturnRepository.save(any(PurchaseOrderReturn.class))).thenAnswer(i -> {
            PurchaseOrderReturn saved = i.getArgument(0);
            saved.setId(UUID.randomUUID());
            saved.setCreatedAt(LocalDateTime.now());
            return saved;
        });

        PurchaseOrderReturnResponseDTO result = service.createPurchaseOrderReturn(poId, dto, "admin");

        assertNotNull(result);
        verify(purchaseOrderReturnRepository).save(any(PurchaseOrderReturn.class));
    }

    @Test
    public void createPurchaseOrderReturn_poNotFound_shouldThrow() {
        UUID poId = UUID.randomUUID();
        CreatePurchaseOrderReturnDTO dto = new CreatePurchaseOrderReturnDTO();
        dto.setItems(List.of());

        when(purchaseOrderRepository.findById(poId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> service.createPurchaseOrderReturn(poId, dto, "admin"));
    }

    @Test
    public void createPurchaseOrderReturn_quantityExceedsPurchased_shouldThrow() {
        UUID poId = UUID.randomUUID();
        UUID poItemId = UUID.randomUUID();

        PurchaseOrder po = createPurchaseOrder(poId);
        PurchaseOrderItem poItem = createPOItem(poItemId, po);
        poItem.setQuantity(5.0); // Only 5 purchased

        CreatePurchaseOrderReturnDTO.ReturnItemRequest itemRequest = new CreatePurchaseOrderReturnDTO.ReturnItemRequest();
        itemRequest.setPurchaseOrderItemId(poItemId);
        itemRequest.setReturnQuantity(10.0); // Trying to return 10
        itemRequest.setReason("Defective");

        CreatePurchaseOrderReturnDTO dto = new CreatePurchaseOrderReturnDTO();
        dto.setReason("Quality issue");
        dto.setItems(List.of(itemRequest));

        when(purchaseOrderRepository.findById(poId)).thenReturn(Optional.of(po));
        when(purchaseOrderItemRepository.findAllById(List.of(poItemId))).thenReturn(List.of(poItem));
        when(purchaseOrderItemRepository.findById(poItemId)).thenReturn(Optional.of(poItem));
        when(entityIdGeneratorService.generateNextId(any())).thenReturn("POR-001");

        assertThrows(RuntimeException.class, () -> service.createPurchaseOrderReturn(poId, dto, "admin"));
    }

    @Test
    public void createPurchaseOrderReturn_itemNotBelongingToPO_shouldThrow() {
        UUID poId = UUID.randomUUID();
        UUID otherPoId = UUID.randomUUID();
        UUID poItemId = UUID.randomUUID();

        PurchaseOrder po = createPurchaseOrder(poId);
        PurchaseOrder otherPo = createPurchaseOrder(otherPoId);
        PurchaseOrderItem poItem = createPOItem(poItemId, otherPo); // Belongs to different PO

        CreatePurchaseOrderReturnDTO.ReturnItemRequest itemRequest = new CreatePurchaseOrderReturnDTO.ReturnItemRequest();
        itemRequest.setPurchaseOrderItemId(poItemId);
        itemRequest.setReturnQuantity(5.0);

        CreatePurchaseOrderReturnDTO dto = new CreatePurchaseOrderReturnDTO();
        dto.setReason("Quality issue");
        dto.setItems(List.of(itemRequest));

        when(purchaseOrderRepository.findById(poId)).thenReturn(Optional.of(po));
        when(purchaseOrderItemRepository.findAllById(List.of(poItemId))).thenReturn(List.of(poItem));

        assertThrows(RuntimeException.class, () -> service.createPurchaseOrderReturn(poId, dto, "admin"));
    }

    // ==================== Helpers ====================

    private PurchaseOrderReturn createPOReturn() {
        Merchant merchant = new Merchant();
        merchant.setId(UUID.randomUUID());
        merchant.setName("Supplier A");

        PurchaseOrder po = createPurchaseOrder(UUID.randomUUID());

        PurchaseOrderReturn poReturn = new PurchaseOrderReturn();
        poReturn.setId(UUID.randomUUID());
        poReturn.setReturnId("POR-001");
        poReturn.setPurchaseOrder(po);
        poReturn.setStatus(PurchaseOrderReturnStatus.PENDING);
        poReturn.setReason("Quality issue");
        poReturn.setRequestedBy("admin");
        poReturn.setRequestedAt(LocalDateTime.now());
        poReturn.setCreatedAt(LocalDateTime.now());
        poReturn.setTotalReturnAmount(BigDecimal.valueOf(1000));

        PurchaseOrderReturnItem item = new PurchaseOrderReturnItem();
        item.setId(UUID.randomUUID());
        item.setPurchaseOrderReturn(poReturn);
        item.setMerchant(merchant);
        item.setItemTypeName("Cement");
        item.setReturnQuantity(BigDecimal.valueOf(5));
        item.setUnitPrice(BigDecimal.valueOf(200));
        item.setTotalReturnAmount(BigDecimal.valueOf(1000));

        PurchaseOrderItem poItem = new PurchaseOrderItem();
        poItem.setId(UUID.randomUUID());
        poItem.setPurchaseOrder(po);
        item.setPurchaseOrderItem(poItem);

        poReturn.setReturnItems(new ArrayList<>(List.of(item)));

        return poReturn;
    }

    private PurchaseOrder createPurchaseOrder(UUID id) {
        PurchaseOrder po = new PurchaseOrder();
        po.setId(id);
        po.setPoNumber("PO-001");
        po.setPurchaseOrderItems(new ArrayList<>());
        po.setDeliverySessions(new ArrayList<>());
        return po;
    }

    private PurchaseOrderItem createPOItem(UUID id, PurchaseOrder po) {
        Merchant merchant = new Merchant();
        merchant.setId(UUID.randomUUID());
        merchant.setName("Supplier A");

        ItemType itemType = new ItemType();
        itemType.setId(UUID.randomUUID());
        itemType.setName("Cement");

        PurchaseOrderItem item = new PurchaseOrderItem();
        item.setId(id);
        item.setPurchaseOrder(po);
        item.setMerchant(merchant);
        item.setItemType(itemType);
        item.setQuantity(10.0);
        item.setUnitPrice(200.0);
        item.setTotalPrice(2000.0);
        item.setStatus("PENDING");
        item.setItemReceipts(new ArrayList<>());
        return item;
    }
}