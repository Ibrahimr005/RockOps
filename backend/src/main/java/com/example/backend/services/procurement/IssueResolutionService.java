package com.example.backend.services.procurement;

import com.example.backend.dto.procurement.ResolveIssueRequest;
import com.example.backend.models.procurement.*;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrder;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderIssue;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderItem;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderResolutionType;
import com.example.backend.repositories.procurement.*;
import com.example.backend.services.finance.incomingPayments.IncomingPaymentRequestService; // ← CHANGED
import com.example.backend.services.warehouse.ItemTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class IssueResolutionService {

    private final PurchaseOrderIssueRepository issueRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderItemRepository purchaseOrderItemRepository;
    private final IncomingPaymentRequestService incomingPaymentRequestService; // ← CHANGED
    private final ItemTypeService itemTypeService;
    private final PurchaseOrderService purchaseOrderService;

    @Transactional
    public void resolveIssues(List<ResolveIssueRequest> requests, String resolvedBy) {

        List<PurchaseOrderIssue> resolvedIssues = new java.util.ArrayList<>();

        for (ResolveIssueRequest request : requests) {
            PurchaseOrderIssue issue = issueRepository.findById(request.getIssueId())
                    .orElseThrow(() -> new RuntimeException("Issue not found"));

            issue.setResolutionType(request.getResolutionType());
            issue.setResolvedBy(resolvedBy);
            issue.setResolvedAt(LocalDateTime.now());
            issue.setResolutionNotes(request.getResolutionNotes());
            issue.setIssueStatus(IssueStatus.RESOLVED);

            PurchaseOrderIssue savedIssue = issueRepository.save(issue);
            resolvedIssues.add(savedIssue);
        }

        // Update statuses
        if (!requests.isEmpty()) {
            PurchaseOrderIssue firstIssue = issueRepository.findById(requests.get(0).getIssueId()).orElseThrow();
            PurchaseOrder po = firstIssue.getPurchaseOrder();
            updateItemStatuses(po);
            updatePOStatus(po);
            purchaseOrderRepository.save(po);

            // Create incoming payment requests for REFUND resolutions
            List<PurchaseOrderIssue> refundIssues = resolvedIssues.stream()
                    .filter(issue -> issue.getResolutionType() == PurchaseOrderResolutionType.REFUND)
                    .collect(Collectors.toList());

            if (!refundIssues.isEmpty()) {
                // ← CHANGED: Use new method name
                incomingPaymentRequestService.createIncomingPaymentRequestsFromRefundIssues(po.getId(), refundIssues);
            }
        }
    }

    private void updateItemStatuses(PurchaseOrder po) {
        for (PurchaseOrderItem item : po.getPurchaseOrderItems()) {
            double totalGood = item.getItemReceipts().stream()
                    .mapToDouble(DeliveryItemReceipt::getGoodQuantity)
                    .sum();

            // Only count issues that are NOT pending redelivery
            double closedIssues = item.getItemReceipts().stream()
                    .flatMap(r -> r.getIssues().stream())
                    .filter(i -> i.getIssueStatus() == IssueStatus.RESOLVED &&
                            i.getResolutionType() != PurchaseOrderResolutionType.REDELIVERY)
                    .mapToDouble(PurchaseOrderIssue::getAffectedQuantity)
                    .sum();

            // Unresolved issues still count as processed (waiting for resolution)
            double unresolvedIssuesQty = item.getItemReceipts().stream()
                    .flatMap(r -> r.getIssues().stream())
                    .filter(i -> i.getIssueStatus() == IssueStatus.REPORTED ||
                            i.getIssueStatus() == IssueStatus.IN_PROGRESS)
                    .mapToDouble(PurchaseOrderIssue::getAffectedQuantity)
                    .sum();

            long unresolvedIssuesCount = item.getItemReceipts().stream()
                    .flatMap(r -> r.getIssues().stream())
                    .filter(i -> i.getIssueStatus() == IssueStatus.REPORTED ||
                            i.getIssueStatus() == IssueStatus.IN_PROGRESS)
                    .count();

            // Check if there are pending redeliveries that haven't been received yet
            double pendingRedeliveryQty = item.getItemReceipts().stream()
                    .flatMap(r -> r.getIssues().stream())
                    .filter(i -> i.getResolutionType() == PurchaseOrderResolutionType.REDELIVERY &&
                            i.getIssueStatus() == IssueStatus.RESOLVED)
                    .mapToDouble(PurchaseOrderIssue::getAffectedQuantity)
                    .sum();

            // Calculate how much was actually redelivered
            double redeliveredQty = item.getItemReceipts().stream()
                    .filter(DeliveryItemReceipt::getIsRedelivery)
                    .mapToDouble(DeliveryItemReceipt::getGoodQuantity)
                    .sum();

            // The actual pending redelivery is what's promised minus what's been received
            double actualPendingRedelivery = pendingRedeliveryQty - redeliveredQty;

            // Determine status
            if (unresolvedIssuesCount > 0) {
                item.setStatus("DISPUTED");
            } else if (actualPendingRedelivery > 0) {  // FIXED: Check if redelivery is still pending
                item.setStatus("PENDING");
            } else if (totalGood + closedIssues >= item.getQuantity()) {
                item.setStatus("COMPLETED");
            } else if (totalGood + closedIssues > 0) {
                item.setStatus("PARTIAL");
            } else {
                item.setStatus("PENDING");
            }
        }
    }

    private void updatePOStatus(PurchaseOrder po) {
        // Delegate to PurchaseOrderService for unified logic
        purchaseOrderService.updatePurchaseOrderStatusComplete(po.getId());
    }
}