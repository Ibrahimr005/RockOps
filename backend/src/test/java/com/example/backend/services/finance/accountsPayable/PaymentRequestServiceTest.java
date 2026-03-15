package com.example.backend.services.finance.accountsPayable;

import com.example.backend.dto.finance.accountsPayable.PaymentRequestResponseDTO;
import com.example.backend.models.finance.accountsPayable.PaymentRequest;
import com.example.backend.models.finance.accountsPayable.PaymentSourceType;
import com.example.backend.models.finance.accountsPayable.PaymentTargetType;
import com.example.backend.models.finance.accountsPayable.enums.PaymentRequestStatus;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrder;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderItem;
import com.example.backend.repositories.finance.accountsPayable.OfferFinancialReviewRepository;
import com.example.backend.repositories.finance.accountsPayable.PaymentRequestItemRepository;
import com.example.backend.repositories.finance.accountsPayable.PaymentRequestRepository;
import com.example.backend.repositories.finance.accountsPayable.PaymentRequestStatusHistoryRepository;
import com.example.backend.repositories.payroll.BonusRepository;
import com.example.backend.repositories.payroll.LoanRepository;
import com.example.backend.repositories.procurement.PurchaseOrderRepository;
import com.example.backend.services.finance.loans.LoanPaymentRequestService;
import com.example.backend.services.payroll.PayrollBatchService;
import com.example.backend.services.procurement.LogisticsService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.example.backend.models.finance.accountsPayable.PaymentRequestItem;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class PaymentRequestServiceTest {

    @Mock
    private PaymentRequestRepository paymentRequestRepository;

    @Mock
    private PaymentRequestStatusHistoryRepository statusHistoryRepository;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    @Mock
    private OfferFinancialReviewRepository offerFinancialReviewRepository;

    @Mock
    private PaymentRequestItemRepository paymentRequestItemRepository;

    @Mock
    private PayrollBatchService payrollBatchService;

    @Mock
    private LoanRepository loanRepository;

    @Mock
    private BonusRepository bonusRepository;

    @Mock
    private LogisticsService logisticsService;

    @Mock
    private LoanPaymentRequestService loanPaymentRequestService;

    @InjectMocks
    private PaymentRequestService paymentRequestService;

    // ==================== getAllPaymentRequests ====================

    @Test
    public void getAllPaymentRequests_withExistingRequests_shouldReturnDTOList() {
        PaymentRequest pr1 = createPaymentRequest(PaymentRequestStatus.PENDING);
        PaymentRequest pr2 = createPaymentRequest(PaymentRequestStatus.APPROVED);
        when(paymentRequestRepository.findAll()).thenReturn(List.of(pr1, pr2));

        List<PaymentRequestResponseDTO> result = paymentRequestService.getAllPaymentRequests();

        assertNotNull(result);
        assertEquals(2, result.size());
        verify(paymentRequestRepository, times(1)).findAll();
    }

    @Test
    public void getAllPaymentRequests_withNoRequests_shouldReturnEmptyList() {
        when(paymentRequestRepository.findAll()).thenReturn(Collections.emptyList());

        List<PaymentRequestResponseDTO> result = paymentRequestService.getAllPaymentRequests();

        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(paymentRequestRepository, times(1)).findAll();
    }

    @Test
    public void getAllPaymentRequests_shouldMapStatusFieldCorrectly() {
        PaymentRequest pr = createPaymentRequest(PaymentRequestStatus.PAID);
        when(paymentRequestRepository.findAll()).thenReturn(List.of(pr));

        List<PaymentRequestResponseDTO> result = paymentRequestService.getAllPaymentRequests();

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(PaymentRequestStatus.PAID, result.get(0).getStatus());
    }

    // ==================== createPaymentRequestFromPO ====================

    @Test
    public void createPaymentRequestFromPO_purchaseOrderNotFound_shouldThrowRuntimeException() {
        UUID poId = UUID.randomUUID();
        UUID offerId = UUID.randomUUID();

        when(purchaseOrderRepository.findById(poId)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                paymentRequestService.createPaymentRequestFromPO(poId, offerId, "testUser"));

        assertTrue(ex.getMessage().contains("Purchase Order not found"));
        verify(purchaseOrderRepository, times(1)).findById(poId);
        verify(paymentRequestRepository, never()).save(any());
    }

    @Test
    public void createPaymentRequestFromPO_purchaseOrderHasNoItems_shouldThrowRuntimeException() {
        UUID poId = UUID.randomUUID();
        UUID offerId = UUID.randomUUID();

        PurchaseOrder po = new PurchaseOrder();
        po.setId(poId);
        po.setPoNumber("PO-EMPTY");
        po.setCurrency("USD");
        po.setPurchaseOrderItems(Collections.emptyList());

        when(purchaseOrderRepository.findById(poId)).thenReturn(Optional.of(po));

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                paymentRequestService.createPaymentRequestFromPO(poId, offerId, "testUser"));

        assertTrue(ex.getMessage().contains("Purchase Order has no items"));
        verify(paymentRequestRepository, never()).save(any());
    }

    @Test
    public void createPaymentRequestFromPO_withValidPOAndItems_shouldSavePaymentRequestAndReturnDTO() {
        UUID poId = UUID.randomUUID();
        UUID offerId = UUID.randomUUID();

        PurchaseOrder po = createPO();
        po.setId(poId);

        PaymentRequest savedPR = createPaymentRequest(PaymentRequestStatus.PENDING);
        PaymentRequestItem savedPRItem = new PaymentRequestItem();
        savedPRItem.setId(UUID.randomUUID());

        when(purchaseOrderRepository.findById(poId)).thenReturn(Optional.of(po));
        when(offerFinancialReviewRepository.findByOfferId(offerId)).thenReturn(Optional.empty());
        when(paymentRequestRepository.save(any(PaymentRequest.class))).thenReturn(savedPR);
        when(paymentRequestItemRepository.saveAll(any())).thenReturn(List.of(savedPRItem));
        when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenReturn(po);

        PaymentRequestResponseDTO result =
                paymentRequestService.createPaymentRequestFromPO(poId, offerId, "testUser");

        assertNotNull(result);
        verify(paymentRequestRepository, atLeastOnce()).save(any(PaymentRequest.class));
        verify(paymentRequestItemRepository, atLeastOnce()).saveAll(any());
    }

    @Test
    public void createPaymentRequestFromPO_withNullOfferId_shouldSkipOfferRepoLookup() {
        UUID poId = UUID.randomUUID();

        PurchaseOrder po = createPO();
        po.setId(poId);

        PaymentRequest savedPR = createPaymentRequest(PaymentRequestStatus.PENDING);
        PaymentRequestItem savedPRItem = new PaymentRequestItem();
        savedPRItem.setId(UUID.randomUUID());

        when(purchaseOrderRepository.findById(poId)).thenReturn(Optional.of(po));
        when(paymentRequestRepository.save(any(PaymentRequest.class))).thenReturn(savedPR);
        when(paymentRequestItemRepository.saveAll(any())).thenReturn(List.of(savedPRItem));
        when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenReturn(po);

        PaymentRequestResponseDTO result =
                paymentRequestService.createPaymentRequestFromPO(poId, null, "testUser");

        assertNotNull(result);
        verify(offerFinancialReviewRepository, never()).findByOfferId(any());
    }

    @Test
    public void createPaymentRequestFromPO_allItemsHaveNoMerchant_shouldThrowBecauseNoRequestsCreated() {
        UUID poId = UUID.randomUUID();

        PurchaseOrder po = new PurchaseOrder();
        po.setId(poId);
        po.setPoNumber("PO-NO-MERCHANT");
        po.setCurrency("USD");

        // Item with null merchant is excluded from grouping; no payment requests are created
        PurchaseOrderItem orphanItem = new PurchaseOrderItem();
        orphanItem.setId(UUID.randomUUID());
        orphanItem.setMerchant(null);
        orphanItem.setUnitPrice(100.0);
        orphanItem.setQuantity(3);
        orphanItem.setTotalPrice(300.0);
        po.setPurchaseOrderItems(List.of(orphanItem));

        when(purchaseOrderRepository.findById(poId)).thenReturn(Optional.of(po));

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                paymentRequestService.createPaymentRequestFromPO(poId, null, "testUser"));

        assertTrue(ex.getMessage().contains("Failed to create any payment requests"));
    }

    @Test
    public void createPaymentRequestFromPO_withMultipleMerchants_shouldCreateOnePaymentRequestPerMerchant() {
        UUID poId = UUID.randomUUID();

        Merchant merchant1 = createMerchant("Merchant One");
        Merchant merchant2 = createMerchant("Merchant Two");

        PurchaseOrderItem item1 = buildPOItem(merchant1, 200.0);
        PurchaseOrderItem item2 = buildPOItem(merchant2, 300.0);

        PurchaseOrder po = new PurchaseOrder();
        po.setId(poId);
        po.setPoNumber("PO-MULTI");
        po.setCurrency("USD");
        po.setPurchaseOrderItems(List.of(item1, item2));

        PaymentRequest savedPR1 = createPaymentRequest(PaymentRequestStatus.PENDING);
        PaymentRequest savedPR2 = createPaymentRequest(PaymentRequestStatus.PENDING);
        PaymentRequestItem savedPRItem = new PaymentRequestItem();
        savedPRItem.setId(UUID.randomUUID());

        when(purchaseOrderRepository.findById(poId)).thenReturn(Optional.of(po));
        when(paymentRequestRepository.save(any(PaymentRequest.class)))
                .thenReturn(savedPR1)
                .thenReturn(savedPR2);
        when(paymentRequestItemRepository.saveAll(any())).thenReturn(List.of(savedPRItem));
        when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenReturn(po);

        PaymentRequestResponseDTO result =
                paymentRequestService.createPaymentRequestFromPO(poId, null, "testUser");

        assertNotNull(result);
        // One save call per merchant
        verify(paymentRequestRepository, times(2)).save(any(PaymentRequest.class));
    }

    // ==================== getPendingPaymentRequests ====================

    @Test
    public void getPendingPaymentRequests_withPendingRequests_shouldReturnDTOList() {
        PaymentRequest pr = createPaymentRequest(PaymentRequestStatus.PENDING);
        when(paymentRequestRepository.findPendingRequests()).thenReturn(List.of(pr));

        List<PaymentRequestResponseDTO> result = paymentRequestService.getPendingPaymentRequests();

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(paymentRequestRepository, times(1)).findPendingRequests();
    }

    @Test
    public void getPendingPaymentRequests_withNoPendingRequests_shouldReturnEmptyList() {
        when(paymentRequestRepository.findPendingRequests()).thenReturn(Collections.emptyList());

        List<PaymentRequestResponseDTO> result = paymentRequestService.getPendingPaymentRequests();

        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(paymentRequestRepository, times(1)).findPendingRequests();
    }

    @Test
    public void getPendingPaymentRequests_shouldMapRequestNumberCorrectly() {
        PaymentRequest pr = createPaymentRequest(PaymentRequestStatus.PENDING);
        pr.setRequestNumber("PR-TEST-001");
        when(paymentRequestRepository.findPendingRequests()).thenReturn(List.of(pr));

        List<PaymentRequestResponseDTO> result = paymentRequestService.getPendingPaymentRequests();

        assertNotNull(result);
        assertEquals("PR-TEST-001", result.get(0).getRequestNumber());
    }

    // ==================== getApprovedAndReadyToPay ====================

    @Test
    public void getApprovedAndReadyToPay_withApprovedRequests_shouldReturnDTOList() {
        PaymentRequest pr = createPaymentRequest(PaymentRequestStatus.APPROVED);
        when(paymentRequestRepository.findApprovedAndReadyToPay()).thenReturn(List.of(pr));

        List<PaymentRequestResponseDTO> result = paymentRequestService.getApprovedAndReadyToPay();

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(paymentRequestRepository, times(1)).findApprovedAndReadyToPay();
    }

    @Test
    public void getApprovedAndReadyToPay_withMixedApprovedAndPartiallyPaid_shouldReturnAll() {
        PaymentRequest approved = createPaymentRequest(PaymentRequestStatus.APPROVED);
        PaymentRequest partiallyPaid = createPaymentRequest(PaymentRequestStatus.PARTIALLY_PAID);
        partiallyPaid.setRemainingAmount(BigDecimal.valueOf(400));
        partiallyPaid.setTotalPaidAmount(BigDecimal.valueOf(600));

        when(paymentRequestRepository.findApprovedAndReadyToPay())
                .thenReturn(List.of(approved, partiallyPaid));

        List<PaymentRequestResponseDTO> result = paymentRequestService.getApprovedAndReadyToPay();

        assertNotNull(result);
        assertEquals(2, result.size());
    }

    @Test
    public void getApprovedAndReadyToPay_withNoResults_shouldReturnEmptyList() {
        when(paymentRequestRepository.findApprovedAndReadyToPay()).thenReturn(Collections.emptyList());

        List<PaymentRequestResponseDTO> result = paymentRequestService.getApprovedAndReadyToPay();

        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(paymentRequestRepository, times(1)).findApprovedAndReadyToPay();
    }

    // ==================== Helper Methods ====================

    private PaymentRequest createPaymentRequest(PaymentRequestStatus status) {
        PaymentRequest pr = new PaymentRequest();
        pr.setId(UUID.randomUUID());
        pr.setRequestNumber("PR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        pr.setStatus(status);
        pr.setRequestedAmount(BigDecimal.valueOf(1000));
        pr.setTotalPaidAmount(BigDecimal.ZERO);
        pr.setRemainingAmount(BigDecimal.valueOf(1000));
        pr.setCurrency("USD");
        pr.setDescription("Test payment request");
        pr.setSourceType(PaymentSourceType.PURCHASE_ORDER);
        pr.setTargetType(PaymentTargetType.MERCHANT);
        pr.setPaymentRequestItems(new ArrayList<>());
        pr.setPayments(new ArrayList<>());
        pr.setStatusHistory(new ArrayList<>());
        return pr;
    }

    private PurchaseOrder createPO() {
        PurchaseOrder po = new PurchaseOrder();
        po.setId(UUID.randomUUID());
        po.setPoNumber("PO-001");
        po.setCurrency("USD");

        Merchant merchant = createMerchant("Test Merchant");

        PurchaseOrderItem item = buildPOItem(merchant, 500.0);
        po.setPurchaseOrderItems(List.of(item));
        return po;
    }

    private Merchant createMerchant(String name) {
        Merchant merchant = new Merchant();
        merchant.setId(UUID.randomUUID());
        merchant.setName(name);
        merchant.setContactPersonName("Contact Person");
        merchant.setContactPhone("0501234567");
        merchant.setContactEmail("contact@merchant.com");
        return merchant;
    }

    private PurchaseOrderItem buildPOItem(Merchant merchant, double totalPrice) {
        PurchaseOrderItem item = new PurchaseOrderItem();
        item.setId(UUID.randomUUID());
        item.setMerchant(merchant);
        item.setUnitPrice(totalPrice / 5);
        item.setQuantity(5);
        item.setTotalPrice(totalPrice);
        return item;
    }
}