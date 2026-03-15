package com.example.backend.services.merchant;

import com.example.backend.dto.merchant.MerchantPerformanceDTO;
import com.example.backend.dto.merchant.MerchantTransactionDTO;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.merchant.MerchantType;
import com.example.backend.models.procurement.DeliveryItemReceipt;
import com.example.backend.models.procurement.DeliverySession;
import com.example.backend.models.procurement.IssueStatus;
import com.example.backend.models.procurement.IssueType;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrder;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderIssue;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderItem;
import com.example.backend.models.warehouse.ItemCategory;
import com.example.backend.models.warehouse.ItemType;
import com.example.backend.repositories.merchant.MerchantRepository;
import com.example.backend.repositories.procurement.DeliveryItemReceiptRepository;
import com.example.backend.repositories.procurement.PurchaseOrderItemRepository;
import com.example.backend.repositories.site.SiteRepository;
import com.example.backend.repositories.warehouse.ItemCategoryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class MerchantServiceTest {

    @Mock
    private MerchantRepository merchantRepository;

    @Mock
    private SiteRepository siteRepository;

    @Mock
    private ItemCategoryRepository itemCategoryRepository;

    @Mock
    private PurchaseOrderItemRepository purchaseOrderItemRepository;

    @Mock
    private DeliveryItemReceiptRepository deliveryItemReceiptRepository;

    @InjectMocks
    private MerchantService merchantService;

    // ==================== getAllMerchants ====================

    @Test
    public void getAllMerchants_shouldReturnAllMerchants() {
        List<Merchant> merchants = List.of(
                buildMerchant("Merchant A"),
                buildMerchant("Merchant B")
        );
        when(merchantRepository.findAll()).thenReturn(merchants);

        List<Merchant> result = merchantService.getAllMerchants();

        assertEquals(2, result.size());
        verify(merchantRepository).findAll();
    }

    @Test
    public void getAllMerchants_emptyList_shouldReturnEmpty() {
        when(merchantRepository.findAll()).thenReturn(List.of());

        List<Merchant> result = merchantService.getAllMerchants();

        assertTrue(result.isEmpty());
    }

    @Test
    public void getAllMerchants_repositoryThrows_shouldWrapException() {
        when(merchantRepository.findAll()).thenThrow(new RuntimeException("DB error"));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> merchantService.getAllMerchants());
        assertTrue(ex.getMessage().contains("Failed to fetch merchants"));
    }

    // ==================== getMerchantById ====================

    @Test
    public void getMerchantById_found_shouldReturn() {
        UUID id = UUID.randomUUID();
        Merchant merchant = buildMerchant("Test Merchant");
        merchant.setId(id);

        when(merchantRepository.findById(id)).thenReturn(Optional.of(merchant));

        Merchant result = merchantService.getMerchantById(id);

        assertEquals("Test Merchant", result.getName());
    }

    @Test
    public void getMerchantById_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(merchantRepository.findById(id)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> merchantService.getMerchantById(id));
        assertTrue(ex.getMessage().contains("Merchant not found"));
    }

    // ==================== getMerchantTransactions ====================

    @Test
    public void getMerchantTransactions_noItems_shouldReturnEmpty() {
        UUID merchantId = UUID.randomUUID();
        when(purchaseOrderItemRepository.findByMerchantId(merchantId)).thenReturn(List.of());

        List<DeliveryItemReceipt> result = merchantService.getMerchantTransactions(merchantId);

        assertTrue(result.isEmpty());
    }

    @Test
    public void getMerchantTransactions_withItems_shouldReturnReceiptsSortedByDateDesc() {
        UUID merchantId = UUID.randomUUID();

        PurchaseOrderItem item = buildPurchaseOrderItem(merchantId);

        DeliveryItemReceipt receipt1 = buildReceipt(item, LocalDateTime.now().minusDays(5), false);
        DeliveryItemReceipt receipt2 = buildReceipt(item, LocalDateTime.now().minusDays(1), false);

        when(purchaseOrderItemRepository.findByMerchantId(merchantId)).thenReturn(List.of(item));
        when(deliveryItemReceiptRepository.findByPurchaseOrderItemId(item.getId()))
                .thenReturn(List.of(receipt1, receipt2));

        List<DeliveryItemReceipt> result = merchantService.getMerchantTransactions(merchantId);

        assertEquals(2, result.size());
        // Most recent first (receipt2 is newer)
        assertTrue(result.get(0).getDeliverySession().getProcessedAt()
                .isAfter(result.get(1).getDeliverySession().getProcessedAt()));
    }

    @Test
    public void getMerchantTransactions_multipleItems_shouldAggregateAllReceipts() {
        UUID merchantId = UUID.randomUUID();

        PurchaseOrderItem item1 = buildPurchaseOrderItem(merchantId);
        PurchaseOrderItem item2 = buildPurchaseOrderItem(merchantId);

        DeliveryItemReceipt receipt1 = buildReceipt(item1, LocalDateTime.now().minusDays(3), false);
        DeliveryItemReceipt receipt2 = buildReceipt(item2, LocalDateTime.now().minusDays(1), false);

        when(purchaseOrderItemRepository.findByMerchantId(merchantId))
                .thenReturn(List.of(item1, item2));
        when(deliveryItemReceiptRepository.findByPurchaseOrderItemId(item1.getId()))
                .thenReturn(List.of(receipt1));
        when(deliveryItemReceiptRepository.findByPurchaseOrderItemId(item2.getId()))
                .thenReturn(List.of(receipt2));

        List<DeliveryItemReceipt> result = merchantService.getMerchantTransactions(merchantId);

        assertEquals(2, result.size());
    }

    // ==================== getMerchantTransactionDTOs ====================

    @Test
    public void getMerchantTransactionDTOs_noIssues_shouldReturnGoodStatus() {
        UUID merchantId = UUID.randomUUID();

        PurchaseOrderItem item = buildPurchaseOrderItem(merchantId);
        DeliveryItemReceipt receipt = buildReceipt(item, LocalDateTime.now().minusDays(2), false);
        receipt.setIssues(new ArrayList<>());

        when(purchaseOrderItemRepository.findByMerchantId(merchantId)).thenReturn(List.of(item));
        when(deliveryItemReceiptRepository.findByPurchaseOrderItemId(item.getId()))
                .thenReturn(List.of(receipt));

        List<MerchantTransactionDTO> result = merchantService.getMerchantTransactionDTOs(merchantId);

        assertEquals(1, result.size());
        assertEquals("GOOD", result.get(0).getStatus());
        assertFalse(result.get(0).isRedelivery());
    }

    @Test
    public void getMerchantTransactionDTOs_withIssues_shouldReturnHasIssuesStatus() {
        UUID merchantId = UUID.randomUUID();

        PurchaseOrderItem item = buildPurchaseOrderItem(merchantId);
        DeliveryItemReceipt receipt = buildReceipt(item, LocalDateTime.now().minusDays(2), false);

        PurchaseOrderIssue issue = PurchaseOrderIssue.builder()
                .id(UUID.randomUUID())
                .issueType(IssueType.DAMAGED)
                .issueStatus(IssueStatus.REPORTED)
                .affectedQuantity(5.0)
                .build();
        receipt.setIssues(List.of(issue));

        when(purchaseOrderItemRepository.findByMerchantId(merchantId)).thenReturn(List.of(item));
        when(deliveryItemReceiptRepository.findByPurchaseOrderItemId(item.getId()))
                .thenReturn(List.of(receipt));

        List<MerchantTransactionDTO> result = merchantService.getMerchantTransactionDTOs(merchantId);

        assertEquals(1, result.size());
        assertEquals("HAS_ISSUES", result.get(0).getStatus());
        assertEquals("DAMAGED", result.get(0).getIssueType());
        assertEquals(5.0, result.get(0).getIssueQuantity());
        assertEquals("REPORTED", result.get(0).getResolutionStatus());
    }

    @Test
    public void getMerchantTransactionDTOs_redelivery_shouldFlagIsRedelivery() {
        UUID merchantId = UUID.randomUUID();

        PurchaseOrderItem item = buildPurchaseOrderItem(merchantId);
        DeliveryItemReceipt receipt = buildReceipt(item, LocalDateTime.now().minusDays(1), true);
        receipt.setIssues(new ArrayList<>());

        when(purchaseOrderItemRepository.findByMerchantId(merchantId)).thenReturn(List.of(item));
        when(deliveryItemReceiptRepository.findByPurchaseOrderItemId(item.getId()))
                .thenReturn(List.of(receipt));

        List<MerchantTransactionDTO> result = merchantService.getMerchantTransactionDTOs(merchantId);

        assertTrue(result.get(0).isRedelivery());
    }

    // ==================== getMerchantPerformance ====================

    @Test
    public void getMerchantPerformance_noReceipts_shouldReturnNewMerchant() {
        UUID merchantId = UUID.randomUUID();
        when(purchaseOrderItemRepository.findByMerchantId(merchantId)).thenReturn(List.of());

        MerchantPerformanceDTO result = merchantService.getMerchantPerformance(merchantId);

        assertEquals(0, result.getOverallScore());
        assertEquals("NEW", result.getPerformanceRating());
        assertEquals(0, result.getTotalOrders());
        assertEquals("NEW", result.getMerchantStatus());
    }

    @Test
    public void getMerchantPerformance_allGoodDeliveries_shouldScoreHigh() {
        UUID merchantId = UUID.randomUUID();

        PurchaseOrderItem item = buildPurchaseOrderItem(merchantId);

        // Create 5 perfect deliveries to make merchant ACTIVE
        List<DeliveryItemReceipt> receipts = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            DeliveryItemReceipt receipt = buildReceipt(item, LocalDateTime.now().minusDays(i + 1), false);
            receipt.setIssues(new ArrayList<>());
            receipts.add(receipt);
        }

        when(purchaseOrderItemRepository.findByMerchantId(merchantId)).thenReturn(List.of(item));
        when(deliveryItemReceiptRepository.findByPurchaseOrderItemId(item.getId()))
                .thenReturn(receipts);

        MerchantPerformanceDTO result = merchantService.getMerchantPerformance(merchantId);

        assertEquals(5, result.getTotalOrders());
        assertEquals(5, result.getGoodDeliveries());
        assertEquals(0, result.getDeliveriesWithIssues());
        assertEquals(100.0, result.getSuccessRate());
        assertTrue(result.getOverallScore() >= 75); // at least GOOD rating
        assertEquals("ACTIVE", result.getMerchantStatus());
    }

    @Test
    public void getMerchantPerformance_allIssues_shouldScoreLow() {
        UUID merchantId = UUID.randomUUID();

        PurchaseOrderItem item = buildPurchaseOrderItem(merchantId);

        // 5 deliveries all with issues
        List<DeliveryItemReceipt> receipts = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            DeliveryItemReceipt receipt = buildReceipt(item, LocalDateTime.now().minusDays(i + 1), false);
            PurchaseOrderIssue issue = PurchaseOrderIssue.builder()
                    .issueType(IssueType.DAMAGED)
                    .issueStatus(IssueStatus.REPORTED)
                    .affectedQuantity(10.0)
                    .build();
            receipt.setIssues(List.of(issue));
            receipts.add(receipt);
        }

        when(purchaseOrderItemRepository.findByMerchantId(merchantId)).thenReturn(List.of(item));
        when(deliveryItemReceiptRepository.findByPurchaseOrderItemId(item.getId()))
                .thenReturn(receipts);

        MerchantPerformanceDTO result = merchantService.getMerchantPerformance(merchantId);

        assertEquals(0, result.getGoodDeliveries());
        assertEquals(5, result.getDeliveriesWithIssues());
        assertEquals(0.0, result.getSuccessRate());
        assertTrue(result.getOverallScore() < 60);
    }

    @Test
    public void getMerchantPerformance_inactiveMerchant_shouldMarkInactive() {
        UUID merchantId = UUID.randomUUID();

        PurchaseOrderItem item = buildPurchaseOrderItem(merchantId);

        // 10 deliveries all 120 days ago (inactive)
        List<DeliveryItemReceipt> receipts = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            DeliveryItemReceipt receipt = buildReceipt(item, LocalDateTime.now().minusDays(120 + i), false);
            receipt.setIssues(new ArrayList<>());
            receipts.add(receipt);
        }

        when(purchaseOrderItemRepository.findByMerchantId(merchantId)).thenReturn(List.of(item));
        when(deliveryItemReceiptRepository.findByPurchaseOrderItemId(item.getId()))
                .thenReturn(receipts);

        MerchantPerformanceDTO result = merchantService.getMerchantPerformance(merchantId);

        assertEquals("INACTIVE", result.getMerchantStatus());
    }

    @Test
    public void getMerchantPerformance_resolvedIssues_shouldCountInResolutionRate() {
        UUID merchantId = UUID.randomUUID();

        PurchaseOrderItem item = buildPurchaseOrderItem(merchantId);

        DeliveryItemReceipt receipt = buildReceipt(item, LocalDateTime.now().minusDays(5), false);
        PurchaseOrderIssue resolved = PurchaseOrderIssue.builder()
                .issueType(IssueType.WRONG_QUANTITY)
                .issueStatus(IssueStatus.RESOLVED)
                .affectedQuantity(3.0)
                .build();
        receipt.setIssues(List.of(resolved));

        when(purchaseOrderItemRepository.findByMerchantId(merchantId)).thenReturn(List.of(item));
        when(deliveryItemReceiptRepository.findByPurchaseOrderItemId(item.getId()))
                .thenReturn(List.of(receipt));

        MerchantPerformanceDTO result = merchantService.getMerchantPerformance(merchantId);

        assertEquals(1, result.getIssuesResolved());
        assertEquals(0, result.getIssuesPending());
        assertEquals(100.0, result.getResolutionRate());
    }

    // ==================== getMerchantsByType ====================

    @Test
    public void getMerchantsByType_supplier_shouldReturnOnlySuppliers() {
        Merchant supplier = buildMerchant("Supplier A");
        supplier.setMerchantTypes(List.of(MerchantType.SUPPLIER));

        Merchant service = buildMerchant("Service B");
        service.setMerchantTypes(List.of(MerchantType.SERVICE));

        when(merchantRepository.findAll()).thenReturn(List.of(supplier, service));

        List<Merchant> result = merchantService.getMerchantsByType("SUPPLIER");

        assertEquals(1, result.size());
        assertEquals("Supplier A", result.get(0).getName());
    }

    @Test
    public void getMerchantsByType_service_shouldReturnOnlyServiceType() {
        Merchant supplier = buildMerchant("Supplier A");
        supplier.setMerchantTypes(List.of(MerchantType.SUPPLIER));

        Merchant serviceMerchant = buildMerchant("Service B");
        serviceMerchant.setMerchantTypes(List.of(MerchantType.SERVICE));

        when(merchantRepository.findAll()).thenReturn(List.of(supplier, serviceMerchant));

        List<Merchant> result = merchantService.getMerchantsByType("SERVICE");

        assertEquals(1, result.size());
        assertEquals("Service B", result.get(0).getName());
    }

    @Test
    public void getMerchantsByType_nullOrEmpty_shouldReturnAll() {
        List<Merchant> all = List.of(buildMerchant("A"), buildMerchant("B"));
        when(merchantRepository.findAll()).thenReturn(all);

        List<Merchant> result = merchantService.getMerchantsByType(null);

        assertEquals(2, result.size());
    }

    @Test
    public void getMerchantsByType_emptyString_shouldReturnAll() {
        List<Merchant> all = List.of(buildMerchant("A"), buildMerchant("B"));
        when(merchantRepository.findAll()).thenReturn(all);

        List<Merchant> result = merchantService.getMerchantsByType("  ");

        assertEquals(2, result.size());
    }

    @Test
    public void getMerchantsByType_invalidType_shouldThrow() {
        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> merchantService.getMerchantsByType("INVALID_TYPE"));
        assertTrue(ex.getMessage().contains("Invalid merchant type"));
    }

    @Test
    public void getMerchantsByType_noMatchingMerchants_shouldReturnEmpty() {
        Merchant supplier = buildMerchant("Supplier A");
        supplier.setMerchantTypes(List.of(MerchantType.SUPPLIER));

        when(merchantRepository.findAll()).thenReturn(List.of(supplier));

        List<Merchant> result = merchantService.getMerchantsByType("SERVICE");

        assertTrue(result.isEmpty());
    }

    // ==================== Helpers ====================

    private Merchant buildMerchant(String name) {
        return Merchant.builder()
                .id(UUID.randomUUID())
                .name(name)
                .merchantTypes(new ArrayList<>())
                .itemCategories(new ArrayList<>())
                .sites(new ArrayList<>())
                .contacts(new ArrayList<>())
                .build();
    }

    private PurchaseOrderItem buildPurchaseOrderItem(UUID merchantId) {
        ItemCategory category = new ItemCategory();
        category.setId(UUID.randomUUID());
        category.setName("Test Category");

        ItemType itemType = ItemType.builder()
                .id(UUID.randomUUID())
                .name("Test Item")
                .build();
        itemType.setItemCategory(category);

        Merchant merchant = buildMerchant("Merchant");
        merchant.setId(merchantId);

        PurchaseOrder po = new PurchaseOrder();
        po.setPoNumber("PO-2025-001");

        PurchaseOrderItem item = PurchaseOrderItem.builder()
                .id(UUID.randomUUID())
                .itemType(itemType)
                .merchant(merchant)
                .purchaseOrder(po)
                .itemReceipts(new ArrayList<>())
                .build();

        return item;
    }

    private DeliveryItemReceipt buildReceipt(PurchaseOrderItem item, LocalDateTime processedAt, boolean isRedelivery) {
        DeliverySession session = DeliverySession.builder()
                .id(UUID.randomUUID())
                .processedBy("warehouse.user")
                .processedAt(processedAt)
                .build();

        return DeliveryItemReceipt.builder()
                .id(UUID.randomUUID())
                .purchaseOrderItem(item)
                .deliverySession(session)
                .goodQuantity(10.0)
                .isRedelivery(isRedelivery)
                .issues(new ArrayList<>())
                .build();
    }
}