package com.example.backend.services.procurement;

import com.example.backend.models.finance.accountsPayable.PaymentRequest;
import com.example.backend.models.finance.accountsPayable.enums.PaymentRequestStatus;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.procurement.Logistics.*;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrder;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderItem;
import com.example.backend.models.procurement.PurchaseOrderReturn.PurchaseOrderReturn;
import com.example.backend.models.procurement.PurchaseOrderReturn.PurchaseOrderReturnItem;
import com.example.backend.models.warehouse.ItemCategory;
import com.example.backend.models.warehouse.ItemType;
import com.example.backend.models.warehouse.MeasuringUnit;
import com.example.backend.repositories.finance.accountsPayable.PaymentRequestRepository;
import com.example.backend.repositories.merchant.MerchantRepository;
import com.example.backend.repositories.procurement.*;
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
public class LogisticsServiceTest {

    @Mock
    private LogisticsRepository logisticsRepository;

    @Mock
    private LogisticsPurchaseOrderRepository logisticsPurchaseOrderRepository;

    @Mock
    private LogisticsPurchaseOrderReturnRepository logisticsPurchaseOrderReturnRepository;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    @Mock
    private PurchaseOrderItemRepository purchaseOrderItemRepository;

    @Mock
    private PurchaseOrderReturnRepository purchaseOrderReturnRepository;

    @Mock
    private PurchaseOrderReturnItemRepository purchaseOrderReturnItemRepository;

    @Mock
    private MerchantRepository merchantRepository;

    @Mock
    private PaymentRequestRepository paymentRequestRepository;

    @InjectMocks
    private LogisticsService logisticsService;

    // ==================== getLogisticsById ====================

    @Test
    public void getLogisticsById_found_shouldReturn() {
        UUID id = UUID.randomUUID();
        Logistics logistics = createLogistics(id);

        when(logisticsRepository.findById(id)).thenReturn(Optional.of(logistics));

        var result = logisticsService.getLogisticsById(id);

        assertNotNull(result);
        assertEquals(id, result.getId());
    }

    @Test
    public void getLogisticsById_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(logisticsRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> logisticsService.getLogisticsById(id));
    }

    // ==================== getAllLogistics ====================

    @Test
    public void getAllLogistics_shouldReturnAll() {
        Logistics logistics = createLogistics(UUID.randomUUID());
        when(logisticsRepository.findAllOrderByCreatedAtDesc()).thenReturn(List.of(logistics));

        var result = logisticsService.getAllLogistics();

        assertEquals(1, result.size());
    }

    @Test
    public void getAllLogistics_empty_shouldReturnEmpty() {
        when(logisticsRepository.findAllOrderByCreatedAtDesc()).thenReturn(List.of());

        var result = logisticsService.getAllLogistics();

        assertTrue(result.isEmpty());
    }

    // ==================== getPendingApprovalLogistics ====================

    @Test
    public void getPendingApprovalLogistics_shouldReturnPending() {
        Logistics logistics = createLogistics(UUID.randomUUID());
        when(logisticsRepository.findByStatus(LogisticsStatus.PENDING_APPROVAL))
                .thenReturn(List.of(logistics));

        var result = logisticsService.getPendingApprovalLogistics();

        assertEquals(1, result.size());
    }

    // ==================== getPendingPaymentLogistics ====================

    @Test
    public void getPendingPaymentLogistics_shouldReturnPendingPayment() {
        Logistics logistics = createLogistics(UUID.randomUUID());
        when(logisticsRepository.findByStatus(LogisticsStatus.PENDING_PAYMENT))
                .thenReturn(List.of(logistics));

        var result = logisticsService.getPendingPaymentLogistics();

        assertEquals(1, result.size());
    }

    // ==================== getCompletedLogistics ====================

    @Test
    public void getCompletedLogistics_shouldReturnCompleted() {
        Logistics logistics = createLogistics(UUID.randomUUID());
        when(logisticsRepository.findByStatus(LogisticsStatus.COMPLETED))
                .thenReturn(List.of(logistics));

        var result = logisticsService.getCompletedLogistics();

        assertEquals(1, result.size());
    }

    // ==================== getLogisticsByPurchaseOrder ====================

    @Test
    public void getLogisticsByPurchaseOrder_shouldReturnForPO() {
        UUID poId = UUID.randomUUID();
        LogisticsPurchaseOrder lpo = createLogisticsPurchaseOrder(poId);

        when(logisticsPurchaseOrderRepository.findByPurchaseOrderId(poId))
                .thenReturn(List.of(lpo));

        var result = logisticsService.getLogisticsByPurchaseOrder(poId);

        assertEquals(1, result.size());
    }

    @Test
    public void getLogisticsByPurchaseOrder_empty_shouldReturnEmpty() {
        UUID poId = UUID.randomUUID();
        when(logisticsPurchaseOrderRepository.findByPurchaseOrderId(poId))
                .thenReturn(List.of());

        var result = logisticsService.getLogisticsByPurchaseOrder(poId);

        assertTrue(result.isEmpty());
    }

    // ==================== getTotalLogisticsCostForPO ====================

    @Test
    public void getTotalLogisticsCostForPO_shouldSumAllocatedCosts() {
        UUID poId = UUID.randomUUID();

        LogisticsPurchaseOrder lpo1 = createLogisticsPurchaseOrder(poId);
        lpo1.setAllocatedCost(BigDecimal.valueOf(500));

        LogisticsPurchaseOrder lpo2 = createLogisticsPurchaseOrder(poId);
        lpo2.setAllocatedCost(BigDecimal.valueOf(300));

        when(logisticsPurchaseOrderRepository.findByPurchaseOrderId(poId))
                .thenReturn(List.of(lpo1, lpo2));

        BigDecimal result = logisticsService.getTotalLogisticsCostForPO(poId);

        assertEquals(BigDecimal.valueOf(800), result);
    }

    @Test
    public void getTotalLogisticsCostForPO_noLogistics_shouldReturnZero() {
        UUID poId = UUID.randomUUID();
        when(logisticsPurchaseOrderRepository.findByPurchaseOrderId(poId))
                .thenReturn(List.of());

        BigDecimal result = logisticsService.getTotalLogisticsCostForPO(poId);

        assertEquals(BigDecimal.ZERO, result);
    }

    // ==================== getLogisticsByPurchaseOrderReturn ====================

    @Test
    public void getLogisticsByPurchaseOrderReturn_shouldReturn() {
        UUID porId = UUID.randomUUID();
        LogisticsPurchaseOrderReturn lpor = createLogisticsPurchaseOrderReturn(porId);

        when(logisticsPurchaseOrderReturnRepository.findByPurchaseOrderReturnId(porId))
                .thenReturn(List.of(lpor));

        var result = logisticsService.getLogisticsByPurchaseOrderReturn(porId);

        assertEquals(1, result.size());
    }

    // ==================== getTotalLogisticsCostForPOReturn ====================

    @Test
    public void getTotalLogisticsCostForPOReturn_shouldSumAllocatedCosts() {
        UUID porId = UUID.randomUUID();

        LogisticsPurchaseOrderReturn lpor = createLogisticsPurchaseOrderReturn(porId);
        lpor.setAllocatedCost(BigDecimal.valueOf(200));

        when(logisticsPurchaseOrderReturnRepository.findByPurchaseOrderReturnId(porId))
                .thenReturn(List.of(lpor));

        BigDecimal result = logisticsService.getTotalLogisticsCostForPOReturn(porId);

        assertEquals(BigDecimal.valueOf(200), result);
    }

    // ==================== deleteLogistics ====================

    @Test
    public void deleteLogistics_pendingApproval_shouldDelete() {
        UUID id = UUID.randomUUID();
        Logistics logistics = createLogistics(id);
        logistics.setStatus(LogisticsStatus.PENDING_APPROVAL);

        when(logisticsRepository.findById(id)).thenReturn(Optional.of(logistics));

        logisticsService.deleteLogistics(id);

        verify(logisticsRepository).delete(logistics);
    }

    @Test
    public void deleteLogistics_notPendingApproval_shouldThrow() {
        UUID id = UUID.randomUUID();
        Logistics logistics = createLogistics(id);
        logistics.setStatus(LogisticsStatus.COMPLETED);

        when(logisticsRepository.findById(id)).thenReturn(Optional.of(logistics));

        assertThrows(RuntimeException.class, () -> logisticsService.deleteLogistics(id));
    }

    @Test
    public void deleteLogistics_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(logisticsRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> logisticsService.deleteLogistics(id));
    }

    @Test
    public void deleteLogistics_withPaymentRequest_shouldDeletePaymentRequest() {
        UUID id = UUID.randomUUID();
        Logistics logistics = createLogistics(id);
        logistics.setStatus(LogisticsStatus.PENDING_APPROVAL);

        PaymentRequest pr = new PaymentRequest();
        pr.setId(UUID.randomUUID());
        logistics.setPaymentRequest(pr);

        when(logisticsRepository.findById(id)).thenReturn(Optional.of(logistics));

        logisticsService.deleteLogistics(id);

        verify(paymentRequestRepository).delete(pr);
        verify(logisticsRepository).delete(logistics);
    }

    // ==================== save ====================

    @Test
    public void save_shouldDelegateToRepository() {
        Logistics logistics = createLogistics(UUID.randomUUID());
        when(logisticsRepository.save(logistics)).thenReturn(logistics);

        Logistics result = logisticsService.save(logistics);

        assertNotNull(result);
        verify(logisticsRepository).save(logistics);
    }

    // ==================== Helpers ====================

    private Logistics createLogistics(UUID id) {
        Merchant merchant = new Merchant();
        merchant.setId(UUID.randomUUID());
        merchant.setName("Carrier Co");

        Logistics logistics = new Logistics();
        logistics.setId(id);
        logistics.setLogisticsNumber("LOG-202603-0001");
        logistics.setMerchant(merchant);
        logistics.setMerchantName(merchant.getName());
        logistics.setTotalCost(BigDecimal.valueOf(1000));
        logistics.setCurrency("EGP");
        logistics.setCarrierCompany("Fast Logistics");
        logistics.setDriverName("Ahmed");
        logistics.setDriverPhone("01012345678");
        logistics.setStatus(LogisticsStatus.PENDING_APPROVAL);
        logistics.setCreatedBy("admin");
        logistics.setCreatedAt(LocalDateTime.now());
        logistics.setPurchaseOrders(new ArrayList<>());
        logistics.setPurchaseOrderReturns(new ArrayList<>());
        return logistics;
    }

    private LogisticsPurchaseOrder createLogisticsPurchaseOrder(UUID poId) {
        Merchant merchant = new Merchant();
        merchant.setId(UUID.randomUUID());
        merchant.setName("Supplier A");

        ItemCategory category = new ItemCategory();
        category.setId(UUID.randomUUID());
        category.setName("Building Materials");

        MeasuringUnit unit = new MeasuringUnit();
        unit.setName("Ton");

        ItemType itemType = new ItemType();
        itemType.setId(UUID.randomUUID());
        itemType.setName("Cement");
        itemType.setItemCategory(category);
        itemType.setMeasuringUnit(unit);

        PurchaseOrderItem poItem = new PurchaseOrderItem();
        poItem.setId(UUID.randomUUID());
        poItem.setItemType(itemType);
        poItem.setQuantity(10.0);
        poItem.setUnitPrice(200.0);

        PurchaseOrder po = new PurchaseOrder();
        po.setId(poId);
        po.setPoNumber("PO-001");

        Logistics logistics = createLogistics(UUID.randomUUID());

        LogisticsPurchaseOrderItem logisticsItem = LogisticsPurchaseOrderItem.builder()
                .id(UUID.randomUUID())
                .purchaseOrderItem(poItem)
                .itemTypeName("Cement")
                .quantity(BigDecimal.TEN)
                .unitPrice(BigDecimal.valueOf(200))
                .totalValue(BigDecimal.valueOf(2000))
                .build();

        LogisticsPurchaseOrder lpo = new LogisticsPurchaseOrder();
        lpo.setId(UUID.randomUUID());
        lpo.setLogistics(logistics);
        lpo.setPurchaseOrder(po);
        lpo.setAllocatedCost(BigDecimal.valueOf(500));
        lpo.setCostPercentage(BigDecimal.valueOf(50));
        lpo.setTotalItemsValue(BigDecimal.valueOf(2000));
        lpo.setItems(new ArrayList<>(List.of(logisticsItem)));
        logisticsItem.setLogisticsPurchaseOrder(lpo);

        return lpo;
    }

    private LogisticsPurchaseOrderReturn createLogisticsPurchaseOrderReturn(UUID porId) {
        PurchaseOrderReturn por = new PurchaseOrderReturn();
        por.setId(porId);
        por.setReturnId("POR-001");

        PurchaseOrderReturnItem returnItem = new PurchaseOrderReturnItem();
        returnItem.setId(UUID.randomUUID());
        returnItem.setItemTypeName("Cement");
        returnItem.setReturnQuantity(BigDecimal.valueOf(5));
        returnItem.setUnitPrice(BigDecimal.valueOf(200));
        returnItem.setTotalReturnAmount(BigDecimal.valueOf(1000));

        Logistics logistics = createLogistics(UUID.randomUUID());

        LogisticsPurchaseOrderReturnItem logisticsItem = LogisticsPurchaseOrderReturnItem.builder()
                .id(UUID.randomUUID())
                .purchaseOrderReturnItem(returnItem)
                .itemTypeName("Cement")
                .quantity(BigDecimal.valueOf(5))
                .unitPrice(BigDecimal.valueOf(200))
                .totalValue(BigDecimal.valueOf(1000))
                .build();

        LogisticsPurchaseOrderReturn lpor = new LogisticsPurchaseOrderReturn();
        lpor.setId(UUID.randomUUID());
        lpor.setLogistics(logistics);
        lpor.setPurchaseOrderReturn(por);
        lpor.setAllocatedCost(BigDecimal.valueOf(200));
        lpor.setCostPercentage(BigDecimal.valueOf(100));
        lpor.setTotalItemsValue(BigDecimal.valueOf(1000));
        lpor.setItems(new ArrayList<>(List.of(logisticsItem)));
        logisticsItem.setLogisticsPurchaseOrderReturn(lpor);

        return lpor;
    }
}