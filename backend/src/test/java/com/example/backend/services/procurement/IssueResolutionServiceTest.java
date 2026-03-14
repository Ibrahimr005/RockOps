package com.example.backend.services.procurement;

import com.example.backend.dto.procurement.ResolveIssueRequest;
import com.example.backend.models.procurement.DeliveryItemReceipt;
import com.example.backend.models.procurement.IssueStatus;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrder;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderIssue;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderItem;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderResolutionType;
import com.example.backend.repositories.procurement.PurchaseOrderIssueRepository;
import com.example.backend.repositories.procurement.PurchaseOrderItemRepository;
import com.example.backend.repositories.procurement.PurchaseOrderRepository;
import com.example.backend.services.finance.incomingPayments.IncomingPaymentRequestService;
import com.example.backend.services.warehouse.ItemTypeService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class IssueResolutionServiceTest {

    @Mock
    private PurchaseOrderIssueRepository issueRepository;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    @Mock
    private PurchaseOrderItemRepository purchaseOrderItemRepository;

    @Mock
    private IncomingPaymentRequestService incomingPaymentRequestService;

    @Mock
    private ItemTypeService itemTypeService;

    @Mock
    private PurchaseOrderService purchaseOrderService;

    @InjectMocks
    private IssueResolutionService issueResolutionService;

    // ==================== resolveIssues ====================

    @Test
    public void resolveIssues_singleIssue_shouldResolve() {
        UUID issueId = UUID.randomUUID();
        UUID poId = UUID.randomUUID();

        PurchaseOrder po = createPurchaseOrder(poId);
        PurchaseOrderIssue issue = createIssue(issueId, po);

        ResolveIssueRequest request = new ResolveIssueRequest();
        request.setIssueId(issueId);
        request.setResolutionType(PurchaseOrderResolutionType.ACCEPT_SHORTAGE);
        request.setResolutionNotes("Accepted as-is");

        when(issueRepository.findById(issueId)).thenReturn(Optional.of(issue));
        when(issueRepository.save(any(PurchaseOrderIssue.class))).thenAnswer(i -> i.getArgument(0));
        when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(i -> i.getArgument(0));

        issueResolutionService.resolveIssues(List.of(request), "admin");

        assertEquals(IssueStatus.RESOLVED, issue.getIssueStatus());
        assertEquals(PurchaseOrderResolutionType.ACCEPT_SHORTAGE, issue.getResolutionType());
        assertEquals("admin", issue.getResolvedBy());
        assertNotNull(issue.getResolvedAt());
        verify(issueRepository).save(any(PurchaseOrderIssue.class));
        verify(purchaseOrderService).updatePurchaseOrderStatusComplete(poId);
    }

    @Test
    public void resolveIssues_refundType_shouldCreatePaymentRequest() {
        UUID issueId = UUID.randomUUID();
        UUID poId = UUID.randomUUID();

        PurchaseOrder po = createPurchaseOrder(poId);
        PurchaseOrderIssue issue = createIssue(issueId, po);

        ResolveIssueRequest request = new ResolveIssueRequest();
        request.setIssueId(issueId);
        request.setResolutionType(PurchaseOrderResolutionType.REFUND);
        request.setResolutionNotes("Refund requested");

        when(issueRepository.findById(issueId)).thenReturn(Optional.of(issue));
        when(issueRepository.save(any(PurchaseOrderIssue.class))).thenAnswer(i -> i.getArgument(0));
        when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(i -> i.getArgument(0));

        issueResolutionService.resolveIssues(List.of(request), "admin");

        verify(incomingPaymentRequestService).createIncomingPaymentRequestsFromRefundIssues(eq(poId), any());
    }

    @Test
    public void resolveIssues_nonRefundType_shouldNotCreatePaymentRequest() {
        UUID issueId = UUID.randomUUID();
        UUID poId = UUID.randomUUID();

        PurchaseOrder po = createPurchaseOrder(poId);
        PurchaseOrderIssue issue = createIssue(issueId, po);

        ResolveIssueRequest request = new ResolveIssueRequest();
        request.setIssueId(issueId);
        request.setResolutionType(PurchaseOrderResolutionType.REDELIVERY);
        request.setResolutionNotes("Redelivery requested");

        when(issueRepository.findById(issueId)).thenReturn(Optional.of(issue));
        when(issueRepository.save(any(PurchaseOrderIssue.class))).thenAnswer(i -> i.getArgument(0));
        when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(i -> i.getArgument(0));

        issueResolutionService.resolveIssues(List.of(request), "admin");

        verify(incomingPaymentRequestService, never()).createIncomingPaymentRequestsFromRefundIssues(any(), any());
    }

    @Test
    public void resolveIssues_multipleIssues_shouldResolveAll() {
        UUID issueId1 = UUID.randomUUID();
        UUID issueId2 = UUID.randomUUID();
        UUID poId = UUID.randomUUID();

        PurchaseOrder po = createPurchaseOrder(poId);
        PurchaseOrderIssue issue1 = createIssue(issueId1, po);
        PurchaseOrderIssue issue2 = createIssue(issueId2, po);

        ResolveIssueRequest request1 = new ResolveIssueRequest();
        request1.setIssueId(issueId1);
        request1.setResolutionType(PurchaseOrderResolutionType.ACCEPT_SHORTAGE);

        ResolveIssueRequest request2 = new ResolveIssueRequest();
        request2.setIssueId(issueId2);
        request2.setResolutionType(PurchaseOrderResolutionType.REPLACEMENT_PO);

        when(issueRepository.findById(issueId1)).thenReturn(Optional.of(issue1));
        when(issueRepository.findById(issueId2)).thenReturn(Optional.of(issue2));
        when(issueRepository.save(any(PurchaseOrderIssue.class))).thenAnswer(i -> i.getArgument(0));
        when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(i -> i.getArgument(0));

        issueResolutionService.resolveIssues(List.of(request1, request2), "admin");

        assertEquals(IssueStatus.RESOLVED, issue1.getIssueStatus());
        assertEquals(IssueStatus.RESOLVED, issue2.getIssueStatus());
        verify(issueRepository, times(2)).save(any(PurchaseOrderIssue.class));
    }

    @Test
    public void resolveIssues_issueNotFound_shouldThrow() {
        UUID issueId = UUID.randomUUID();

        ResolveIssueRequest request = new ResolveIssueRequest();
        request.setIssueId(issueId);
        request.setResolutionType(PurchaseOrderResolutionType.ACCEPT_SHORTAGE);

        when(issueRepository.findById(issueId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> issueResolutionService.resolveIssues(List.of(request), "admin"));
    }

    @Test
    public void resolveIssues_emptyList_shouldNotThrow() {
        issueResolutionService.resolveIssues(List.of(), "admin");

        verify(issueRepository, never()).findById(any());
        verify(purchaseOrderRepository, never()).save(any());
    }

    @Test
    public void resolveIssues_mixedRefundAndNonRefund_shouldOnlyCreatePaymentForRefunds() {
        UUID issueId1 = UUID.randomUUID();
        UUID issueId2 = UUID.randomUUID();
        UUID poId = UUID.randomUUID();

        PurchaseOrder po = createPurchaseOrder(poId);
        PurchaseOrderIssue issue1 = createIssue(issueId1, po);
        PurchaseOrderIssue issue2 = createIssue(issueId2, po);

        ResolveIssueRequest request1 = new ResolveIssueRequest();
        request1.setIssueId(issueId1);
        request1.setResolutionType(PurchaseOrderResolutionType.REFUND);

        ResolveIssueRequest request2 = new ResolveIssueRequest();
        request2.setIssueId(issueId2);
        request2.setResolutionType(PurchaseOrderResolutionType.ACCEPT_SHORTAGE);

        when(issueRepository.findById(issueId1)).thenReturn(Optional.of(issue1));
        when(issueRepository.findById(issueId2)).thenReturn(Optional.of(issue2));
        when(issueRepository.save(any(PurchaseOrderIssue.class))).thenAnswer(i -> i.getArgument(0));
        when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(i -> i.getArgument(0));

        issueResolutionService.resolveIssues(List.of(request1, request2), "admin");

        verify(incomingPaymentRequestService).createIncomingPaymentRequestsFromRefundIssues(eq(poId), any());
    }

    // ==================== Helpers ====================

    private PurchaseOrder createPurchaseOrder(UUID id) {
        PurchaseOrder po = new PurchaseOrder();
        po.setId(id);
        po.setPoNumber("PO-001");
        po.setStatus("IN_DELIVERY");

        PurchaseOrderItem item = new PurchaseOrderItem();
        item.setId(UUID.randomUUID());
        item.setPurchaseOrder(po);
        item.setQuantity(10.0);
        item.setStatus("PENDING");

        DeliveryItemReceipt receipt = DeliveryItemReceipt.builder()
                .id(UUID.randomUUID())
                .purchaseOrderItem(item)
                .goodQuantity(8.0)
                .isRedelivery(false)
                .issues(new ArrayList<>())
                .build();

        item.setItemReceipts(new ArrayList<>(List.of(receipt)));
        po.setPurchaseOrderItems(new ArrayList<>(List.of(item)));
        po.setDeliverySessions(new ArrayList<>());
        return po;
    }

    private PurchaseOrderIssue createIssue(UUID id, PurchaseOrder po) {
        PurchaseOrderIssue issue = new PurchaseOrderIssue();
        issue.setId(id);
        issue.setPurchaseOrder(po);
        issue.setPurchaseOrderItem(po.getPurchaseOrderItems().get(0));
        issue.setIssueStatus(IssueStatus.REPORTED);
        issue.setAffectedQuantity(2.0);
        issue.setIssueDescription("Damaged items");

        // Add issue to the receipt's issues list
        po.getPurchaseOrderItems().get(0).getItemReceipts().get(0).getIssues().add(issue);

        return issue;
    }
}