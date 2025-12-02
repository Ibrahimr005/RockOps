package com.example.backend.services.merchant;

import com.example.backend.dto.merchant.MerchantTransactionDTO;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.procurement.DeliveryItemReceipt;
import com.example.backend.models.procurement.PurchaseOrderIssue;
import com.example.backend.models.procurement.PurchaseOrderItem;
import com.example.backend.repositories.merchant.MerchantRepository;
import com.example.backend.repositories.procurement.DeliveryItemReceiptRepository;
import com.example.backend.repositories.procurement.PurchaseOrderItemRepository;
import com.example.backend.repositories.site.SiteRepository;
import com.example.backend.repositories.warehouse.ItemCategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

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
                System.out.println("Merchant Type: " + m.getMerchantType());
                System.out.println("Notes: " + m.getNotes());
                if (m.getSite() != null) {
                    System.out.println("Site: " + m.getSite().getName());
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


}
