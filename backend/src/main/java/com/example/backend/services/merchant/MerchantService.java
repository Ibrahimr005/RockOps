package com.example.backend.services.merchant;

import com.example.backend.dto.merchant.MerchantTransactionDTO;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.merchant.MerchantType;
import com.example.backend.models.procurement.DeliveryItemReceipt;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderIssue;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderItem;
import com.example.backend.repositories.merchant.MerchantRepository;
import com.example.backend.repositories.procurement.DeliveryItemReceiptRepository;
import com.example.backend.repositories.procurement.PurchaseOrderItemRepository;
import com.example.backend.repositories.site.SiteRepository;
import com.example.backend.repositories.warehouse.ItemCategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import com.example.backend.dto.merchant.MerchantPerformanceDTO;
import java.time.LocalDate;
import java.util.Map;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MerchantService {

    private final MerchantRepository merchantRepository;
    private final SiteRepository siteRepository;
    private final ItemCategoryRepository itemCategoryRepository;
    private final PurchaseOrderItemRepository purchaseOrderItemRepository;  // ADD THIS
    private final DeliveryItemReceiptRepository deliveryItemReceiptRepository;  // ADD THIS


    public List<Merchant> getAllMerchants() {
        try {
            List<Merchant> merchants = merchantRepository.findAll();
            merchants.forEach(m -> {
                System.out.println("Merchant ID: " + m.getId());
                System.out.println("Name: " + m.getName());
                System.out.println("Contact Email: " + m.getContactEmail());
                System.out.println("Contact Phone: " + m.getContactPhone());
                System.out.println("Address: " + m.getAddress());
                System.out.println("Merchant Types: " + m.getMerchantTypes());
                System.out.println("Notes: " + m.getNotes());

                // Changed: Handle multiple sites instead of single site
                if (m.getSites() != null && !m.getSites().isEmpty()) {
                    System.out.println("Sites (" + m.getSites().size() + "):");
                    m.getSites().forEach(site -> {
                        System.out.println("\t- " + site.getName());
                    });
                } else {
                    System.out.println("Sites: None");
                }

                System.out.println("Item Categories: " + m.getItemCategories().size());
                m.getItemCategories().forEach(itemCategory -> {
                    System.out.println("\t- " + itemCategory.getName());
                });
                System.out.println("Contacts: " + (m.getContacts() != null ? m.getContacts().size() : 0));
            });
            return merchants;
        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch merchants: " + e.getMessage(), e);
        }
    }



    public Merchant getMerchantById(UUID id) {
        return merchantRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Merchant not found with id: " + id));
    }

    public List<DeliveryItemReceipt> getMerchantTransactions(UUID merchantId) {
        // Get all purchase order items for this merchant
        List<PurchaseOrderItem> merchantItems = purchaseOrderItemRepository.findByMerchantId(merchantId);

        // Get all delivery receipts for those items
        List<DeliveryItemReceipt> allReceipts = new ArrayList<>();
        for (PurchaseOrderItem item : merchantItems) {
            List<DeliveryItemReceipt> receipts = deliveryItemReceiptRepository.findByPurchaseOrderItemId(item.getId());
            allReceipts.addAll(receipts);
        }

        // Sort by date descending (most recent first)
        allReceipts.sort((a, b) -> b.getDeliverySession().getProcessedAt().compareTo(a.getDeliverySession().getProcessedAt()));

        return allReceipts;
    }

    public List<MerchantTransactionDTO> getMerchantTransactionDTOs(UUID merchantId) {
        List<DeliveryItemReceipt> receipts = getMerchantTransactions(merchantId);

        return receipts.stream().map(receipt -> {
            MerchantTransactionDTO dto = MerchantTransactionDTO.builder()
                    .id(receipt.getId())
                    .itemTypeName(receipt.getPurchaseOrderItem().getItemType().getName())
                    .itemCategoryName(receipt.getPurchaseOrderItem().getItemType().getItemCategory() != null
                            ? receipt.getPurchaseOrderItem().getItemType().getItemCategory().getName()
                            : "Uncategorized")
                    .quantityReceived(receipt.getGoodQuantity())
                    .receivedBy(receipt.getDeliverySession().getProcessedBy())
                    .receivedAt(receipt.getDeliverySession().getProcessedAt())
                    .poNumber(receipt.getPurchaseOrderItem().getPurchaseOrder().getPoNumber())
                    .isRedelivery(receipt.getIsRedelivery())
                    .build();

            // Check for issues
            if (receipt.getIssues() != null && !receipt.getIssues().isEmpty()) {
                dto.setStatus("HAS_ISSUES");
                // Get the first/main issue
                PurchaseOrderIssue mainIssue = receipt.getIssues().get(0);
                dto.setIssueType(mainIssue.getIssueType().toString());
                dto.setIssueQuantity(mainIssue.getAffectedQuantity());
                dto.setResolutionType(mainIssue.getResolutionType() != null ? mainIssue.getResolutionType().toString() : null);
                dto.setResolutionStatus(mainIssue.getIssueStatus().toString());
            } else {
                dto.setStatus("GOOD");
            }

            return dto;
        }).collect(Collectors.toList());
    }

    public MerchantPerformanceDTO getMerchantPerformance(UUID merchantId) {
        List<DeliveryItemReceipt> receipts = getMerchantTransactions(merchantId);

        if (receipts.isEmpty()) {
            return MerchantPerformanceDTO.builder()
                    .overallScore(0)
                    .performanceRating("NEW")
                    .totalOrders(0)
                    .totalItemsDelivered(0)
                    .merchantStatus("NEW")
                    .build();
        }

        // Basic counts
        int totalOrders = receipts.size();
        long goodDeliveriesCount = receipts.stream()
                .filter(r -> r.getIssues() == null || r.getIssues().isEmpty())
                .count();
        int goodDeliveries = (int) goodDeliveriesCount;
        int deliveriesWithIssues = totalOrders - goodDeliveries;

        long redeliveriesCount = receipts.stream()
                .filter(r -> Boolean.TRUE.equals(r.getIsRedelivery()))
                .count();
        int redeliveries = (int) redeliveriesCount;

        // Quantity calculations
        int totalItemsDelivered = 0;
        for (DeliveryItemReceipt receipt : receipts) {
            if (receipt.getGoodQuantity() != null) {
                totalItemsDelivered += receipt.getGoodQuantity();
            }
        }

        int totalIssueQuantity = 0;
        for (DeliveryItemReceipt receipt : receipts) {
            if (receipt.getIssues() != null) {
                for (PurchaseOrderIssue issue : receipt.getIssues()) {
                    if (issue.getAffectedQuantity() != null) {
                        totalIssueQuantity += issue.getAffectedQuantity();
                    }
                }
            }
        }

        // Dates - FIXED to use LocalDateTime directly
        List<LocalDate> orderDates = new ArrayList<>();
        for (DeliveryItemReceipt receipt : receipts) {
            if (receipt.getDeliverySession() != null && receipt.getDeliverySession().getProcessedAt() != null) {
                LocalDate date = receipt.getDeliverySession().getProcessedAt().toLocalDate();
                orderDates.add(date);
            }
        }

        LocalDate firstOrderDate = orderDates.isEmpty() ? null : orderDates.stream().min(java.util.Comparator.naturalOrder()).orElse(null);
        LocalDate lastOrderDate = orderDates.isEmpty() ? null : orderDates.stream().max(java.util.Comparator.naturalOrder()).orElse(null);

        int daysSinceLastOrder = lastOrderDate != null
                ? (int) java.time.temporal.ChronoUnit.DAYS.between(lastOrderDate, LocalDate.now())
                : 0;

        // Issue analysis
        List<PurchaseOrderIssue> allIssues = new ArrayList<>();
        for (DeliveryItemReceipt receipt : receipts) {
            if (receipt.getIssues() != null) {
                allIssues.addAll(receipt.getIssues());
            }
        }

        int totalIssuesReported = allIssues.size();
        int issuesResolved = 0;
        for (PurchaseOrderIssue issue : allIssues) {
            if ("RESOLVED".equals(issue.getIssueStatus().toString())) {
                issuesResolved++;
            }
        }
        int issuesPending = totalIssuesReported - issuesResolved;

        // Issue type breakdown
        Map<String, Integer> issueTypeBreakdown = new java.util.HashMap<>();
        for (PurchaseOrderIssue issue : allIssues) {
            String type = issue.getIssueType().toString();
            issueTypeBreakdown.put(type, issueTypeBreakdown.getOrDefault(type, 0) + 1);
        }

        String mostCommonIssueType = "None";
        int maxCount = 0;
        for (Map.Entry<String, Integer> entry : issueTypeBreakdown.entrySet()) {
            if (entry.getValue() > maxCount) {
                maxCount = entry.getValue();
                mostCommonIssueType = entry.getKey();
            }
        }

        // Calculate rates
        double successRate = totalOrders > 0 ? (goodDeliveries * 100.0 / totalOrders) : 0;
        double issueRate = totalOrders > 0 ? (deliveriesWithIssues * 100.0 / totalOrders) : 0;
        double resolutionRate = totalIssuesReported > 0 ? (issuesResolved * 100.0 / totalIssuesReported) : 0;
        double redeliveryRate = totalOrders > 0 ? (redeliveries * 100.0 / totalOrders) : 0;
        double firstTimeSuccessRate = totalOrders > 0 ? ((totalOrders - redeliveries) * 100.0 / totalOrders) : 0;

        // Quantity accuracy
        int totalExpectedQuantity = totalItemsDelivered + totalIssueQuantity;
        double quantityAccuracy = totalExpectedQuantity > 0
                ? (totalItemsDelivered * 100.0 / totalExpectedQuantity)
                : 100;

        // Most ordered item - FIXED
        // Most ordered item - FIXED
        // Most ordered item
        Map<String, Integer> itemCounts = new java.util.HashMap<>();
        for (DeliveryItemReceipt receipt : receipts) {
            String itemName = receipt.getPurchaseOrderItem().getItemType().getName();
            if (receipt.getGoodQuantity() != null) {
                Integer currentCount = itemCounts.getOrDefault(itemName, 0);
                Integer quantity = receipt.getGoodQuantity().intValue();  // Convert Double to Integer
                Integer newCount = currentCount + quantity;
                itemCounts.put(itemName, newCount);
            }
        }

        String mostOrderedItem = null;
        Integer mostOrderedItemQuantity = 0;
        for (Map.Entry<String, Integer> entry : itemCounts.entrySet()) {
            if (entry.getValue() > mostOrderedItemQuantity) {
                mostOrderedItemQuantity = entry.getValue();
                mostOrderedItem = entry.getKey();
            }
        }

        // Recent activity (last 30 days) - FIXED
        LocalDate thirtyDaysAgo = LocalDate.now().minusDays(30);
        int recentActivity30Days = 0;
        for (DeliveryItemReceipt receipt : receipts) {
            if (receipt.getDeliverySession() != null && receipt.getDeliverySession().getProcessedAt() != null) {
                LocalDate receiptDate = receipt.getDeliverySession().getProcessedAt().toLocalDate();
                if (receiptDate.isAfter(thirtyDaysAgo)) {
                    recentActivity30Days++;
                }
            }
        }

        // Average calculations
        double avgItemsPerDelivery = totalOrders > 0 ? ((double) totalItemsDelivered / totalOrders) : 0;
        double avgIssuesPerOrder = totalOrders > 0 ? ((double) totalIssueQuantity / totalOrders) : 0;

        // Monthly order frequency
        long monthsBetween = firstOrderDate != null && lastOrderDate != null
                ? java.time.temporal.ChronoUnit.MONTHS.between(firstOrderDate, lastOrderDate) + 1
                : 1;
        double monthlyOrderFrequency = (double) totalOrders / monthsBetween;

        // Merchant status
        String merchantStatus;
        if (daysSinceLastOrder > 90) {
            merchantStatus = "INACTIVE";
        } else if (totalOrders < 5) {
            merchantStatus = "NEW";
        } else {
            merchantStatus = "ACTIVE";
        }

        // Performance trend - FIXED
        LocalDate sixtyDaysAgo = LocalDate.now().minusDays(60);
        int recentOrders = 0;
        int previousOrders = 0;

        for (DeliveryItemReceipt receipt : receipts) {
            if (receipt.getDeliverySession() != null && receipt.getDeliverySession().getProcessedAt() != null) {
                LocalDate receiptDate = receipt.getDeliverySession().getProcessedAt().toLocalDate();
                if (receiptDate.isAfter(thirtyDaysAgo)) {
                    recentOrders++;
                } else if (receiptDate.isAfter(sixtyDaysAgo)) {
                    previousOrders++;
                }
            }
        }

        String performanceTrend;
        if (recentOrders > previousOrders * 1.1) {
            performanceTrend = "IMPROVING";
        } else if (recentOrders < previousOrders * 0.9) {
            performanceTrend = "DECLINING";
        } else {
            performanceTrend = "STABLE";
        }

        // Consecutive good deliveries
        List<DeliveryItemReceipt> sortedReceipts = new ArrayList<>(receipts);
        sortedReceipts.sort((a, b) -> {
            if (a.getDeliverySession() == null || a.getDeliverySession().getProcessedAt() == null) return 1;
            if (b.getDeliverySession() == null || b.getDeliverySession().getProcessedAt() == null) return -1;
            return b.getDeliverySession().getProcessedAt().compareTo(a.getDeliverySession().getProcessedAt());
        });

        int consecutiveGoodDeliveries = 0;
        for (DeliveryItemReceipt receipt : sortedReceipts) {
            if (receipt.getIssues() == null || receipt.getIssues().isEmpty()) {
                consecutiveGoodDeliveries++;
            } else {
                break;
            }
        }

        // Order consistency
        double orderFulfillmentConsistency = calculateOrderConsistency(receipts);

        // Calculate overall score
        int overallScore = (int) Math.round(
                (successRate * 0.35) +
                        (resolutionRate * 0.25) +
                        (quantityAccuracy * 0.20) +
                        ((100 - redeliveryRate) * 0.10) +
                        (firstTimeSuccessRate * 0.10)
        );

        String performanceRating;
        if (overallScore >= 90) {
            performanceRating = "EXCELLENT";
        } else if (overallScore >= 75) {
            performanceRating = "GOOD";
        } else if (overallScore >= 60) {
            performanceRating = "FAIR";
        } else {
            performanceRating = "POOR";
        }

        return MerchantPerformanceDTO.builder()
                .overallScore(overallScore)
                .performanceRating(performanceRating)
                .totalOrders(totalOrders)
                .totalItemsDelivered(totalItemsDelivered)
                .firstOrderDate(firstOrderDate)
                .lastOrderDate(lastOrderDate)
                .daysSinceLastOrder(daysSinceLastOrder)
                .merchantStatus(merchantStatus)
                .successRate(successRate)
                .issueRate(issueRate)
                .resolutionRate(resolutionRate)
                .firstTimeSuccessRate(firstTimeSuccessRate)
                .quantityAccuracy(quantityAccuracy)
                .totalIssuesReported(totalIssuesReported)
                .issuesResolved(issuesResolved)
                .issuesPending(issuesPending)
                .avgItemsPerDelivery(avgItemsPerDelivery)
                .avgIssuesPerOrder(avgIssuesPerOrder)
                .recentActivity30Days(recentActivity30Days)
                .goodDeliveries(goodDeliveries)
                .deliveriesWithIssues(deliveriesWithIssues)
                .redeliveries(redeliveries)
                .redeliveryRate(redeliveryRate)
                .mostOrderedItem(mostOrderedItem)
                .mostOrderedItemQuantity(mostOrderedItemQuantity)
                .performanceTrend(performanceTrend)
                .monthlyOrderFrequency(monthlyOrderFrequency)
                .issueTypeBreakdown(issueTypeBreakdown)
                .mostCommonIssueType(mostCommonIssueType)
                .consecutiveGoodDeliveries(consecutiveGoodDeliveries)
                .orderFulfillmentConsistency(orderFulfillmentConsistency)
                .build();
    }

    private double calculateOrderConsistency(List<DeliveryItemReceipt> receipts) {
        if (receipts.size() < 2) {
            return 100.0;
        }

        List<LocalDate> dates = new ArrayList<>();
        for (DeliveryItemReceipt receipt : receipts) {
            if (receipt.getDeliverySession() != null && receipt.getDeliverySession().getProcessedAt() != null) {
                LocalDate date = receipt.getDeliverySession().getProcessedAt().toLocalDate();
                dates.add(date);
            }
        }

        if (dates.size() < 2) {
            return 100.0;
        }

        dates.sort(java.util.Comparator.naturalOrder());

        List<Long> daysBetween = new ArrayList<>();
        for (int i = 1; i < dates.size(); i++) {
            long days = java.time.temporal.ChronoUnit.DAYS.between(dates.get(i-1), dates.get(i));
            daysBetween.add(days);
        }

        double sum = 0;
        for (Long days : daysBetween) {
            sum += days;
        }
        double average = sum / daysBetween.size();

        double varianceSum = 0;
        for (Long days : daysBetween) {
            varianceSum += Math.pow(days - average, 2);
        }
        double variance = varianceSum / daysBetween.size();

        double stdDev = Math.sqrt(variance);
        double consistencyScore = Math.max(0, 100 - (stdDev / average * 100));

        return consistencyScore;
    }

    public List<Merchant> getMerchantsByType(String merchantType) {
        try {
            if (merchantType == null || merchantType.trim().isEmpty()) {
                return getAllMerchants();
            }

            MerchantType type = MerchantType.valueOf(merchantType.toUpperCase());
            List<Merchant> allMerchants = merchantRepository.findAll();

            return allMerchants.stream()
                    .filter(m -> m.getMerchantTypes() != null && m.getMerchantTypes().contains(type))
                    .collect(Collectors.toList());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid merchant type: " + merchantType);
        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch merchants by type: " + e.getMessage(), e);
        }
    }


}
