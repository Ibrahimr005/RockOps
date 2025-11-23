package com.example.backend.services.procurement;

import com.example.backend.dto.procurement.ResolveIssueRequest;
import com.example.backend.models.procurement.*;
import com.example.backend.repositories.procurement.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class IssueResolutionService {

    private final PurchaseOrderIssueRepository issueRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderItemRepository purchaseOrderItemRepository;

    @Transactional
    public void resolveIssues(List<ResolveIssueRequest> requests, String resolvedBy) {
        for (ResolveIssueRequest request : requests) {
            PurchaseOrderIssue issue = issueRepository.findById(request.getIssueId())
                    .orElseThrow(() -> new RuntimeException("Issue not found"));

            issue.setResolutionType(request.getResolutionType());
            issue.setResolvedBy(resolvedBy);
            issue.setResolvedAt(LocalDateTime.now());
            issue.setResolutionNotes(request.getResolutionNotes());
            issue.setIssueStatus(IssueStatus.RESOLVED);

            issueRepository.save(issue);
        }

        // Update statuses
        if (!requests.isEmpty()) {
            PurchaseOrderIssue firstIssue = issueRepository.findById(requests.get(0).getIssueId()).orElseThrow();
            PurchaseOrder po = firstIssue.getPurchaseOrder();
            updateItemStatuses(po);
            updatePOStatus(po);
            purchaseOrderRepository.save(po);
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
        boolean anyDisputed = po.getPurchaseOrderItems().stream()
                .anyMatch(item -> "DISPUTED".equals(item.getStatus()));

        if (anyDisputed) {
            po.setStatus("DISPUTED");
            return;
        }

        boolean allCompleted = po.getPurchaseOrderItems().stream()
                .allMatch(item -> "COMPLETED".equals(item.getStatus()));

        if (allCompleted) {
            po.setStatus("COMPLETED");
        } else {
            po.setStatus("PARTIAL");
        }
    }
}