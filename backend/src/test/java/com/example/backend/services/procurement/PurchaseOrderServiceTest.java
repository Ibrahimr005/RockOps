package com.example.backend.services.procurement;

import com.example.backend.mappers.procurement.PurchaseOrderMapper;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.procurement.Offer.Offer;
import com.example.backend.models.procurement.Offer.OfferItem;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrder;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderItem;
import com.example.backend.models.procurement.RequestOrder.RequestOrder;
import com.example.backend.models.warehouse.ItemType;
import com.example.backend.repositories.procurement.*;
import com.example.backend.repositories.warehouse.ItemRepository;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import com.example.backend.services.finance.accountsPayable.PaymentRequestService;
import com.example.backend.services.warehouse.ItemTypeService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class PurchaseOrderServiceTest {

    @Mock
    private OfferRepository offerRepository;

    @Mock
    private OfferItemRepository offerItemRepository;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    @Mock
    private PurchaseOrderItemRepository purchaseOrderItemRepository;

    @Mock
    private OfferTimelineService offerTimelineService;

    @Mock
    private ItemRepository itemRepository;

    @Mock
    private WarehouseRepository warehouseRepository;

    @Mock
    private DeliverySessionRepository deliverySessionRepository;

    @Mock
    private DeliveryItemReceiptRepository deliveryItemReceiptRepository;

    @Mock
    private PaymentRequestService paymentRequestService;

    @Mock
    private PurchaseOrderMapper purchaseOrderMapper;

    @Mock
    private ItemTypeService itemTypeService;

    @InjectMocks
    private PurchaseOrderService purchaseOrderService;

    // ==================== getAllPurchaseOrders ====================

    @Test
    public void getAllPurchaseOrders_shouldReturnAll() {
        PurchaseOrder po = createPurchaseOrder(UUID.randomUUID());
        when(purchaseOrderRepository.findAll()).thenReturn(List.of(po));

        List<PurchaseOrder> result = purchaseOrderService.getAllPurchaseOrders();

        assertEquals(1, result.size());
    }

    @Test
    public void getAllPurchaseOrders_empty_shouldReturnEmpty() {
        when(purchaseOrderRepository.findAll()).thenReturn(List.of());

        List<PurchaseOrder> result = purchaseOrderService.getAllPurchaseOrders();

        assertTrue(result.isEmpty());
    }

    // ==================== getPurchaseOrderById ====================

    @Test
    public void getPurchaseOrderById_found_shouldReturn() {
        UUID id = UUID.randomUUID();
        PurchaseOrder po = createPurchaseOrder(id);

        when(purchaseOrderRepository.findByIdWithDetails(id)).thenReturn(Optional.of(po));

        PurchaseOrder result = purchaseOrderService.getPurchaseOrderById(id);

        assertNotNull(result);
        assertEquals(id, result.getId());
    }

    @Test
    public void getPurchaseOrderById_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(purchaseOrderRepository.findByIdWithDetails(id)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> purchaseOrderService.getPurchaseOrderById(id));
    }

    // ==================== getPurchaseOrderByOffer ====================

    @Test
    public void getPurchaseOrderByOffer_found_shouldReturn() {
        UUID offerId = UUID.randomUUID();
        Offer offer = createOffer(offerId);
        PurchaseOrder po = createPurchaseOrder(UUID.randomUUID());
        po.setOffer(offer);

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(purchaseOrderRepository.findAll()).thenReturn(List.of(po));

        PurchaseOrder result = purchaseOrderService.getPurchaseOrderByOffer(offerId);

        assertNotNull(result);
    }

    @Test
    public void getPurchaseOrderByOffer_noMatch_shouldReturnNull() {
        UUID offerId = UUID.randomUUID();
        Offer offer = createOffer(offerId);
        PurchaseOrder po = createPurchaseOrder(UUID.randomUUID());
        po.setOffer(createOffer(UUID.randomUUID())); // Different offer

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(purchaseOrderRepository.findAll()).thenReturn(List.of(po));

        PurchaseOrder result = purchaseOrderService.getPurchaseOrderByOffer(offerId);

        assertNull(result);
    }

    @Test
    public void getPurchaseOrderByOffer_offerNotFound_shouldThrow() {
        UUID offerId = UUID.randomUUID();
        when(offerRepository.findById(offerId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> purchaseOrderService.getPurchaseOrderByOffer(offerId));
    }

    // ==================== getOffersPendingFinanceReview ====================

    @Test
    public void getOffersPendingFinanceReview_shouldFilterCorrectly() {
        Offer pendingNull = createOffer(UUID.randomUUID());
        pendingNull.setStatus("ACCEPTED");
        pendingNull.setFinanceStatus(null);

        Offer pendingReview = createOffer(UUID.randomUUID());
        pendingReview.setStatus("ACCEPTED");
        pendingReview.setFinanceStatus("PENDING_FINANCE_REVIEW");

        Offer inProgress = createOffer(UUID.randomUUID());
        inProgress.setStatus("ACCEPTED");
        inProgress.setFinanceStatus("FINANCE_IN_PROGRESS");

        Offer completed = createOffer(UUID.randomUUID());
        completed.setStatus("ACCEPTED");
        completed.setFinanceStatus("FINANCE_ACCEPTED");

        Offer wrongStatus = createOffer(UUID.randomUUID());
        wrongStatus.setStatus("SUBMITTED"); // Not ACCEPTED

        when(offerRepository.findByStatus("ACCEPTED")).thenReturn(
                List.of(pendingNull, pendingReview, inProgress, completed));

        List<Offer> result = purchaseOrderService.getOffersPendingFinanceReview();

        assertEquals(3, result.size());
    }

    // ==================== updatePurchaseOrderStatus ====================

    @Test
    public void updatePurchaseOrderStatus_approved_shouldSetApprovedBy() {
        UUID id = UUID.randomUUID();
        PurchaseOrder po = createPurchaseOrder(id);
        po.setPurchaseOrderItems(new ArrayList<>());

        when(purchaseOrderRepository.findById(id)).thenReturn(Optional.of(po));
        when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(i -> i.getArgument(0));

        PurchaseOrder result = purchaseOrderService.updatePurchaseOrderStatus(id, "APPROVED", "manager");

        assertEquals("APPROVED", result.getStatus());
        assertEquals("manager", result.getApprovedBy());
        assertNotNull(result.getFinanceApprovalDate());
    }

    @Test
    public void updatePurchaseOrderStatus_pending_shouldUpdate() {
        UUID id = UUID.randomUUID();
        PurchaseOrder po = createPurchaseOrder(id);

        when(purchaseOrderRepository.findById(id)).thenReturn(Optional.of(po));
        when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(i -> i.getArgument(0));

        PurchaseOrder result = purchaseOrderService.updatePurchaseOrderStatus(id, "PENDING", "admin");

        assertEquals("PENDING", result.getStatus());
        assertNull(result.getApprovedBy());
    }

    @Test
    public void updatePurchaseOrderStatus_completed_shouldUpdateBasePrices() {
        UUID id = UUID.randomUUID();
        UUID itemTypeId = UUID.randomUUID();

        ItemType itemType = new ItemType();
        itemType.setId(itemTypeId);
        itemType.setName("Cement");

        PurchaseOrderItem poItem = new PurchaseOrderItem();
        poItem.setId(UUID.randomUUID());
        poItem.setItemType(itemType);

        PurchaseOrder po = createPurchaseOrder(id);
        po.setStatus("APPROVED"); // Previous status
        po.setPurchaseOrderItems(List.of(poItem));

        when(purchaseOrderRepository.findById(id)).thenReturn(Optional.of(po));
        when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(i -> i.getArgument(0));

        PurchaseOrder result = purchaseOrderService.updatePurchaseOrderStatus(id, "COMPLETED", "admin");

        assertEquals("COMPLETED", result.getStatus());
        verify(itemTypeService).updateItemTypeBasePriceFromCompletedPOs(eq(itemTypeId), eq("admin"));
    }

    @Test
    public void updatePurchaseOrderStatus_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(purchaseOrderRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> purchaseOrderService.updatePurchaseOrderStatus(id, "APPROVED", "admin"));
    }

    // ==================== finalizeOfferAndCreatePurchaseOrder ====================

    @Test
    public void finalizeOffer_offerNotFound_shouldThrow() {
        UUID offerId = UUID.randomUUID();
        when(offerRepository.findById(offerId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> purchaseOrderService.finalizeOfferAndCreatePurchaseOrder(offerId, List.of(), "admin"));
    }

    @Test
    public void finalizeOffer_wrongStatus_shouldThrow() {
        UUID offerId = UUID.randomUUID();
        Offer offer = createOffer(offerId);
        offer.setStatus("SUBMITTED"); // Not FINALIZING

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));

        assertThrows(IllegalStateException.class,
                () -> purchaseOrderService.finalizeOfferAndCreatePurchaseOrder(offerId, List.of(), "admin"));
    }

    @Test
    public void finalizeOffer_noValidItems_shouldThrow() {
        UUID offerId = UUID.randomUUID();
        Offer offer = createOffer(offerId);
        offer.setStatus("FINALIZING");

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(offerItemRepository.findAllById(List.of())).thenReturn(List.of());

        assertThrows(IllegalArgumentException.class,
                () -> purchaseOrderService.finalizeOfferAndCreatePurchaseOrder(offerId, List.of(), "admin"));
    }

    @Test
    public void finalizeOffer_itemNotAccepted_shouldThrow() {
        UUID offerId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();
        Offer offer = createOffer(offerId);
        offer.setStatus("FINALIZING");

        OfferItem item = new OfferItem();
        item.setId(itemId);
        item.setOffer(offer);
        item.setFinanceStatus("FINANCE_REJECTED"); // Not accepted

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(offerItemRepository.findAllById(List.of(itemId))).thenReturn(List.of(item));

        assertThrows(IllegalArgumentException.class,
                () -> purchaseOrderService.finalizeOfferAndCreatePurchaseOrder(offerId, List.of(itemId), "admin"));
    }

    @Test
    public void finalizeOffer_itemFromDifferentOffer_shouldThrow() {
        UUID offerId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();
        Offer offer = createOffer(offerId);
        offer.setStatus("FINALIZING");

        Offer otherOffer = createOffer(UUID.randomUUID());
        OfferItem item = new OfferItem();
        item.setId(itemId);
        item.setOffer(otherOffer); // Different offer
        item.setFinanceStatus("ACCEPTED");

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(offerItemRepository.findAllById(List.of(itemId))).thenReturn(List.of(item));

        assertThrows(IllegalArgumentException.class,
                () -> purchaseOrderService.finalizeOfferAndCreatePurchaseOrder(offerId, List.of(itemId), "admin"));
    }

    // ==================== getPurchaseOrderWithDeliveries ====================

    @Test
    public void getPurchaseOrderWithDeliveries_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(purchaseOrderRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> purchaseOrderService.getPurchaseOrderWithDeliveries(id));
    }

    // ==================== Helpers ====================

    private PurchaseOrder createPurchaseOrder(UUID id) {
        PurchaseOrder po = new PurchaseOrder();
        po.setId(id);
        po.setPoNumber("PO-001");
        po.setStatus("PENDING");
        po.setCreatedAt(LocalDateTime.now());
        po.setUpdatedAt(LocalDateTime.now());
        po.setTotalAmount(10000.0);
        po.setCurrency("EGP");
        po.setPurchaseOrderItems(new ArrayList<>());
        po.setDeliverySessions(new ArrayList<>());
        po.setTotalPaidAmount(BigDecimal.ZERO);
        return po;
    }

    private Offer createOffer(UUID id) {
        RequestOrder ro = new RequestOrder();
        ro.setId(UUID.randomUUID());
        ro.setRequestItems(new ArrayList<>());

        Offer offer = new Offer();
        offer.setId(id);
        offer.setTitle("Test Offer");
        offer.setStatus("UNSTARTED");
        offer.setCreatedAt(LocalDateTime.now());
        offer.setRequestOrder(ro);
        offer.setOfferItems(new ArrayList<>());
        offer.setTimelineEvents(new ArrayList<>());
        offer.setCurrentAttemptNumber(1);
        offer.setTotalRetries(0);
        return offer;
    }
}