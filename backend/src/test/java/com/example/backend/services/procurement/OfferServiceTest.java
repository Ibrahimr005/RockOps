package com.example.backend.services.procurement;

import com.example.backend.dto.procurement.*;
import com.example.backend.mappers.procurement.*;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.procurement.Offer.Offer;
import com.example.backend.models.procurement.Offer.OfferItem;
import com.example.backend.models.procurement.Offer.OfferTimelineEvent;
import com.example.backend.models.procurement.RequestOrder.RequestOrder;
import com.example.backend.models.procurement.RequestOrder.RequestOrderItem;
import com.example.backend.models.warehouse.ItemType;
import com.example.backend.repositories.procurement.*;
import com.example.backend.repositories.merchant.MerchantRepository;
import com.example.backend.repositories.warehouse.ItemTypeRepository;
import com.example.backend.services.finance.accountsPayable.PaymentRequestService;
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
public class OfferServiceTest {

    @Mock
    private OfferRepository offerRepository;

    @Mock
    private OfferItemRepository offerItemRepository;

    @Mock
    private RequestOrderRepository requestOrderRepository;

    @Mock
    private RequestOrderItemRepository requestOrderItemRepository;

    @Mock
    private MerchantRepository merchantRepository;

    @Mock
    private ItemTypeRepository itemTypeRepository;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    @Mock
    private PurchaseOrderItemRepository purchaseOrderItemRepository;

    @Mock
    private OfferTimelineService timelineService;

    @Mock
    private PaymentRequestService paymentRequestService;

    @Mock
    private OfferRequestItemService offerRequestItemService;

    @Mock
    private EquipmentPurchaseSpecRepository equipmentPurchaseSpecRepository;

    @Mock
    private OfferMapper offerMapper;

    @Mock
    private OfferItemMapper offerItemMapper;

    @Mock
    private PurchaseOrderMapper purchaseOrderMapper;

    @Mock
    private RequestOrderMapper requestOrderMapper;

    @Mock
    private OfferTimelineEventMapper timelineEventMapper;

    @InjectMocks
    private OfferService offerService;

    // ==================== getAllOffers ====================

    @Test
    public void getAllOffers_shouldReturnAll() {
        Offer offer = createOffer(UUID.randomUUID());
        OfferDTO dto = new OfferDTO();

        when(offerRepository.findAll()).thenReturn(List.of(offer));
        when(offerMapper.toDTOList(List.of(offer))).thenReturn(List.of(dto));

        List<OfferDTO> result = offerService.getAllOffers();

        assertEquals(1, result.size());
    }

    @Test
    public void getAllOffers_empty_shouldReturnEmpty() {
        when(offerRepository.findAll()).thenReturn(List.of());
        when(offerMapper.toDTOList(List.of())).thenReturn(List.of());

        List<OfferDTO> result = offerService.getAllOffers();

        assertTrue(result.isEmpty());
    }

    // ==================== getOfferById ====================

    @Test
    public void getOfferById_found_shouldReturn() {
        UUID offerId = UUID.randomUUID();
        Offer offer = createOffer(offerId);
        OfferDTO dto = new OfferDTO();
        dto.setId(offerId);

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(offerMapper.toDTO(offer)).thenReturn(dto);

        OfferDTO result = offerService.getOfferById(offerId);

        assertNotNull(result);
        assertEquals(offerId, result.getId());
    }

    @Test
    public void getOfferById_notFound_shouldThrow() {
        UUID offerId = UUID.randomUUID();
        when(offerRepository.findById(offerId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> offerService.getOfferById(offerId));
    }

    // ==================== getOffersByRequestOrder ====================

    @Test
    public void getOffersByRequestOrder_found_shouldReturn() {
        UUID roId = UUID.randomUUID();
        RequestOrder ro = new RequestOrder();
        ro.setId(roId);
        Offer offer = createOffer(UUID.randomUUID());
        OfferDTO dto = new OfferDTO();

        when(requestOrderRepository.findById(roId)).thenReturn(Optional.of(ro));
        when(offerRepository.findByRequestOrder(ro)).thenReturn(List.of(offer));
        when(offerMapper.toDTOList(List.of(offer))).thenReturn(List.of(dto));

        List<OfferDTO> result = offerService.getOffersByRequestOrder(roId);

        assertEquals(1, result.size());
    }

    @Test
    public void getOffersByRequestOrder_roNotFound_shouldThrow() {
        UUID roId = UUID.randomUUID();
        when(requestOrderRepository.findById(roId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> offerService.getOffersByRequestOrder(roId));
    }

    // ==================== getOfferItemsByOffer ====================

    @Test
    public void getOfferItemsByOffer_found_shouldReturn() {
        UUID offerId = UUID.randomUUID();
        Offer offer = createOffer(offerId);
        OfferItem item = createOfferItem(offer);
        offer.setOfferItems(List.of(item));
        OfferItemDTO dto = new OfferItemDTO();

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(offerItemMapper.toDTOList(List.of(item))).thenReturn(List.of(dto));

        List<OfferItemDTO> result = offerService.getOfferItemsByOffer(offerId);

        assertEquals(1, result.size());
    }

    @Test
    public void getOfferItemsByOffer_notFound_shouldThrow() {
        UUID offerId = UUID.randomUUID();
        when(offerRepository.findById(offerId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> offerService.getOfferItemsByOffer(offerId));
    }

    // ==================== getOfferItemsByRequestOrderItem ====================

    @Test
    public void getOfferItemsByRequestOrderItem_found_shouldReturn() {
        UUID roItemId = UUID.randomUUID();
        RequestOrderItem roItem = new RequestOrderItem();
        roItem.setId(roItemId);
        OfferItem item = new OfferItem();
        OfferItemDTO dto = new OfferItemDTO();

        when(requestOrderItemRepository.findById(roItemId)).thenReturn(Optional.of(roItem));
        when(offerItemRepository.findByRequestOrderItem(roItem)).thenReturn(List.of(item));
        when(offerItemMapper.toDTOList(List.of(item))).thenReturn(List.of(dto));

        List<OfferItemDTO> result = offerService.getOfferItemsByRequestOrderItem(roItemId);

        assertEquals(1, result.size());
    }

    @Test
    public void getOfferItemsByRequestOrderItem_notFound_shouldThrow() {
        UUID roItemId = UUID.randomUUID();
        when(requestOrderItemRepository.findById(roItemId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> offerService.getOfferItemsByRequestOrderItem(roItemId));
    }

    // ==================== getOffersByStatus ====================

    @Test
    public void getOffersByStatus_shouldReturnFiltered() {
        Offer offer = createOffer(UUID.randomUUID());
        offer.setStatus("SUBMITTED");
        OfferDTO dto = new OfferDTO();

        when(offerRepository.findByStatus("SUBMITTED")).thenReturn(List.of(offer));
        when(offerMapper.toDTOList(List.of(offer))).thenReturn(List.of(dto));

        List<OfferDTO> result = offerService.getOffersByStatus("SUBMITTED");

        assertEquals(1, result.size());
    }

    // ==================== getRequestOrderByOfferId ====================

    @Test
    public void getRequestOrderByOfferId_found_shouldReturn() {
        UUID offerId = UUID.randomUUID();
        Offer offer = createOffer(offerId);
        RequestOrderDTO roDTO = new RequestOrderDTO();

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(requestOrderMapper.toDTO(offer.getRequestOrder())).thenReturn(roDTO);

        RequestOrderDTO result = offerService.getRequestOrderByOfferId(offerId);

        assertNotNull(result);
    }

    @Test
    public void getRequestOrderByOfferId_noRequestOrder_shouldThrow() {
        UUID offerId = UUID.randomUUID();
        Offer offer = createOffer(offerId);
        offer.setRequestOrder(null);

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));

        assertThrows(RuntimeException.class, () -> offerService.getRequestOrderByOfferId(offerId));
    }

    @Test
    public void getRequestOrderByOfferId_offerNotFound_shouldThrow() {
        UUID offerId = UUID.randomUUID();
        when(offerRepository.findById(offerId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> offerService.getRequestOrderByOfferId(offerId));
    }

    // ==================== deleteOffer ====================

    @Test
    public void deleteOffer_found_shouldDelete() {
        UUID offerId = UUID.randomUUID();
        Offer offer = createOffer(offerId);

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));

        offerService.deleteOffer(offerId);

        verify(offerRepository).delete(offer);
    }

    @Test
    public void deleteOffer_notFound_shouldThrow() {
        UUID offerId = UUID.randomUUID();
        when(offerRepository.findById(offerId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> offerService.deleteOffer(offerId));
    }

    // ==================== deleteOfferItem ====================

    @Test
    public void deleteOfferItem_found_shouldDelete() {
        UUID itemId = UUID.randomUUID();
        OfferItem item = new OfferItem();
        item.setId(itemId);

        when(offerItemRepository.findById(itemId)).thenReturn(Optional.of(item));

        offerService.deleteOfferItem(itemId);

        verify(offerItemRepository).delete(item);
    }

    @Test
    public void deleteOfferItem_notFound_shouldThrow() {
        UUID itemId = UUID.randomUUID();
        when(offerItemRepository.findById(itemId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> offerService.deleteOfferItem(itemId));
    }

    // ==================== updateFinanceStatus ====================

    @Test
    public void updateFinanceStatus_success_shouldUpdate() {
        UUID offerId = UUID.randomUUID();
        Offer offer = createOffer(offerId);
        OfferDTO dto = new OfferDTO();

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(offerRepository.save(any(Offer.class))).thenAnswer(i -> i.getArgument(0));
        when(offerMapper.toDTO(any(Offer.class))).thenReturn(dto);

        OfferDTO result = offerService.updateFinanceStatus(offerId, "FINANCE_ACCEPTED");

        assertNotNull(result);
        assertEquals("FINANCE_ACCEPTED", offer.getFinanceStatus());
    }

    @Test
    public void updateFinanceStatus_notFound_shouldThrow() {
        UUID offerId = UUID.randomUUID();
        when(offerRepository.findById(offerId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> offerService.updateFinanceStatus(offerId, "FINANCE_ACCEPTED"));
    }

    // ==================== getOffersByFinanceStatus ====================

    @Test
    public void getOffersByFinanceStatus_shouldReturn() {
        Offer offer = createOffer(UUID.randomUUID());
        OfferDTO dto = new OfferDTO();

        when(offerRepository.findByFinanceStatus("FINANCE_ACCEPTED")).thenReturn(List.of(offer));
        when(offerMapper.toDTOList(List.of(offer))).thenReturn(List.of(dto));

        List<OfferDTO> result = offerService.getOffersByFinanceStatus("FINANCE_ACCEPTED");

        assertEquals(1, result.size());
    }

    // ==================== updateOfferItemFinanceStatus ====================

    @Test
    public void updateOfferItemFinanceStatus_accepted_shouldUpdate() {
        UUID itemId = UUID.randomUUID();
        Offer offer = createOffer(UUID.randomUUID());
        offer.setFinanceStatus(null);

        OfferItem item = createOfferItem(offer);
        item.setId(itemId);
        OfferItemDTO dto = new OfferItemDTO();

        when(offerItemRepository.findById(itemId)).thenReturn(Optional.of(item));
        when(offerItemRepository.save(any(OfferItem.class))).thenAnswer(i -> i.getArgument(0));
        when(offerRepository.save(any(Offer.class))).thenAnswer(i -> i.getArgument(0));
        when(offerItemMapper.toDTO(any(OfferItem.class))).thenReturn(dto);

        OfferItemDTO result = offerService.updateOfferItemFinanceStatus(itemId, "FINANCE_ACCEPTED", null);

        assertNotNull(result);
        assertEquals("FINANCE_ACCEPTED", item.getFinanceStatus());
        assertEquals("FINANCE_IN_PROGRESS", offer.getFinanceStatus());
    }

    @Test
    public void updateOfferItemFinanceStatus_rejected_shouldSetReason() {
        UUID itemId = UUID.randomUUID();
        Offer offer = createOffer(UUID.randomUUID());
        offer.setFinanceStatus(null);

        OfferItem item = createOfferItem(offer);
        item.setId(itemId);
        OfferItemDTO dto = new OfferItemDTO();

        when(offerItemRepository.findById(itemId)).thenReturn(Optional.of(item));
        when(offerItemRepository.save(any(OfferItem.class))).thenAnswer(i -> i.getArgument(0));
        when(offerRepository.save(any(Offer.class))).thenAnswer(i -> i.getArgument(0));
        when(offerItemMapper.toDTO(any(OfferItem.class))).thenReturn(dto);

        offerService.updateOfferItemFinanceStatus(itemId, "FINANCE_REJECTED", "Too expensive");

        assertEquals("FINANCE_REJECTED", item.getFinanceStatus());
        assertEquals("Too expensive", item.getRejectionReason());
    }

    @Test
    public void updateOfferItemFinanceStatus_notFound_shouldThrow() {
        UUID itemId = UUID.randomUUID();
        when(offerItemRepository.findById(itemId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> offerService.updateOfferItemFinanceStatus(itemId, "FINANCE_ACCEPTED", null));
    }

    // ==================== getFinanceCompletedOffers ====================

    @Test
    public void getFinanceCompletedOffers_shouldFilterCorrectly() {
        Offer accepted = createOffer(UUID.randomUUID());
        accepted.setStatus("MANAGERACCEPTED");
        accepted.setFinanceStatus("FINANCE_ACCEPTED");

        Offer rejected = createOffer(UUID.randomUUID());
        rejected.setStatus("MANAGERACCEPTED");
        rejected.setFinanceStatus("FINANCE_REJECTED");

        Offer nonManager = createOffer(UUID.randomUUID());
        nonManager.setStatus("SUBMITTED");
        nonManager.setFinanceStatus("FINANCE_ACCEPTED");

        Offer noFinance = createOffer(UUID.randomUUID());
        noFinance.setStatus("MANAGERACCEPTED");
        noFinance.setFinanceStatus(null);

        when(offerRepository.findAll()).thenReturn(List.of(accepted, rejected, nonManager, noFinance));
        when(offerMapper.toDTOList(anyList())).thenAnswer(i -> {
            List<Offer> offers = i.getArgument(0);
            return offers.stream().map(o -> {
                OfferDTO dto = new OfferDTO();
                dto.setId(o.getId());
                return dto;
            }).toList();
        });

        List<OfferDTO> result = offerService.getFinanceCompletedOffers();

        assertEquals(2, result.size());
    }

    // ==================== completeFinanceReview ====================

    @Test
    public void completeFinanceReview_allAccepted_shouldSetAccepted() {
        UUID offerId = UUID.randomUUID();
        Offer offer = createOffer(offerId);

        OfferItem item1 = createOfferItem(offer);
        item1.setFinanceStatus("FINANCE_ACCEPTED");
        OfferItem item2 = createOfferItem(offer);
        item2.setFinanceStatus("FINANCE_ACCEPTED");
        offer.setOfferItems(List.of(item1, item2));

        OfferDTO dto = new OfferDTO();

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(offerRepository.save(any(Offer.class))).thenAnswer(i -> i.getArgument(0));
        when(offerMapper.toDTO(any(Offer.class))).thenReturn(dto);

        offerService.completeFinanceReview(offerId, "finance_user");

        assertEquals("FINANCE_ACCEPTED", offer.getStatus());
    }

    @Test
    public void completeFinanceReview_allRejected_shouldSetRejected() {
        UUID offerId = UUID.randomUUID();
        Offer offer = createOffer(offerId);

        OfferItem item = createOfferItem(offer);
        item.setFinanceStatus("FINANCE_REJECTED");
        offer.setOfferItems(List.of(item));

        OfferDTO dto = new OfferDTO();

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(offerRepository.save(any(Offer.class))).thenAnswer(i -> i.getArgument(0));
        when(offerMapper.toDTO(any(Offer.class))).thenReturn(dto);

        offerService.completeFinanceReview(offerId, "finance_user");

        assertEquals("FINANCE_REJECTED", offer.getStatus());
    }

    @Test
    public void completeFinanceReview_mixed_shouldSetPartiallyAccepted() {
        UUID offerId = UUID.randomUUID();
        Offer offer = createOffer(offerId);

        OfferItem accepted = createOfferItem(offer);
        accepted.setFinanceStatus("FINANCE_ACCEPTED");
        OfferItem rejected = createOfferItem(offer);
        rejected.setFinanceStatus("FINANCE_REJECTED");
        offer.setOfferItems(List.of(accepted, rejected));

        OfferDTO dto = new OfferDTO();

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(offerRepository.save(any(Offer.class))).thenAnswer(i -> i.getArgument(0));
        when(offerMapper.toDTO(any(Offer.class))).thenReturn(dto);

        offerService.completeFinanceReview(offerId, "finance_user");

        assertEquals("FINANCE_PARTIALLY_ACCEPTED", offer.getStatus());
    }

    @Test
    public void completeFinanceReview_unprocessedItems_shouldThrow() {
        UUID offerId = UUID.randomUUID();
        Offer offer = createOffer(offerId);

        OfferItem item = createOfferItem(offer);
        item.setFinanceStatus(null); // Not processed
        offer.setOfferItems(List.of(item));

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));

        assertThrows(RuntimeException.class,
                () -> offerService.completeFinanceReview(offerId, "finance_user"));
    }

    @Test
    public void completeFinanceReview_notFound_shouldThrow() {
        UUID offerId = UUID.randomUUID();
        when(offerRepository.findById(offerId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> offerService.completeFinanceReview(offerId, "finance_user"));
    }

    // ==================== retryOffer ====================

    @Test
    public void retryOffer_notFound_shouldThrow() {
        UUID offerId = UUID.randomUUID();
        when(offerRepository.findById(offerId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> offerService.retryOffer(offerId, "admin"));
    }

    // ==================== createOffer ====================

    @Test
    public void createOffer_success_shouldCreate() {
        UUID roId = UUID.randomUUID();
        RequestOrder ro = new RequestOrder();
        ro.setId(roId);

        OfferDTO createDTO = new OfferDTO();
        createDTO.setTitle("New Offer");
        createDTO.setDescription("Description");
        createDTO.setRequestOrderId(roId);

        OfferDTO resultDTO = new OfferDTO();
        resultDTO.setId(UUID.randomUUID());

        when(requestOrderRepository.findById(roId)).thenReturn(Optional.of(ro));
        when(offerRepository.save(any(Offer.class))).thenAnswer(i -> {
            Offer saved = i.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });
        when(offerMapper.toDTO(any(Offer.class))).thenReturn(resultDTO);

        OfferDTO result = offerService.createOffer(createDTO, "admin");

        assertNotNull(result);
        verify(offerRepository).save(any(Offer.class));
    }

    @Test
    public void createOffer_roNotFound_shouldThrow() {
        UUID roId = UUID.randomUUID();
        OfferDTO dto = new OfferDTO();
        dto.setRequestOrderId(roId);

        when(requestOrderRepository.findById(roId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> offerService.createOffer(dto, "admin"));
    }

    // ==================== addOfferItems ====================

    @Test
    public void addOfferItems_emptyList_shouldThrow() {
        UUID offerId = UUID.randomUUID();

        assertThrows(IllegalArgumentException.class,
                () -> offerService.addOfferItems(offerId, List.of()));
    }

    @Test
    public void addOfferItems_nullList_shouldThrow() {
        UUID offerId = UUID.randomUUID();

        assertThrows(IllegalArgumentException.class,
                () -> offerService.addOfferItems(offerId, null));
    }

    @Test
    public void addOfferItems_offerNotFound_shouldThrow() {
        UUID offerId = UUID.randomUUID();
        OfferItemDTO itemDTO = new OfferItemDTO();
        itemDTO.setMerchantId(UUID.randomUUID());

        when(offerRepository.findById(offerId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> offerService.addOfferItems(offerId, List.of(itemDTO)));
    }

    // ==================== getOfferTimeline ====================

    @Test
    public void getOfferTimeline_shouldReturnEvents() {
        UUID offerId = UUID.randomUUID();
        OfferTimelineEvent event = new OfferTimelineEvent();
        OfferTimelineEventDTO dto = new OfferTimelineEventDTO();

        when(timelineService.getCompleteTimeline(offerId)).thenReturn(List.of(event));
        when(timelineEventMapper.toDTOList(List.of(event))).thenReturn(List.of(dto));

        List<OfferTimelineEventDTO> result = offerService.getOfferTimeline(offerId);

        assertEquals(1, result.size());
    }

    // ==================== getRetryableEvents ====================

    @Test
    public void getRetryableEvents_shouldReturnRetryable() {
        UUID offerId = UUID.randomUUID();
        OfferTimelineEvent event = new OfferTimelineEvent();
        OfferTimelineEventDTO dto = new OfferTimelineEventDTO();

        when(timelineService.getRetryableEvents(offerId)).thenReturn(List.of(event));
        when(timelineEventMapper.toDTOList(List.of(event))).thenReturn(List.of(dto));

        List<OfferTimelineEventDTO> result = offerService.getRetryableEvents(offerId);

        assertEquals(1, result.size());
    }

    // ==================== Helpers ====================

    private Offer createOffer(UUID id) {
        RequestOrder requestOrder = new RequestOrder();
        requestOrder.setId(UUID.randomUUID());
        requestOrder.setRequestItems(new ArrayList<>());

        Offer offer = new Offer();
        offer.setId(id);
        offer.setTitle("Test Offer");
        offer.setStatus("UNSTARTED");
        offer.setCreatedAt(LocalDateTime.now());
        offer.setCreatedBy("admin");
        offer.setRequestOrder(requestOrder);
        offer.setOfferItems(new ArrayList<>());
        offer.setTimelineEvents(new ArrayList<>());
        offer.setCurrentAttemptNumber(1);
        offer.setTotalRetries(0);
        return offer;
    }

    private OfferItem createOfferItem(Offer offer) {
        ItemType itemType = new ItemType();
        itemType.setId(UUID.randomUUID());
        itemType.setName("Cement");

        Merchant merchant = new Merchant();
        merchant.setId(UUID.randomUUID());
        merchant.setName("Supplier A");

        OfferItem item = new OfferItem();
        item.setId(UUID.randomUUID());
        item.setOffer(offer);
        item.setItemType(itemType);
        item.setMerchant(merchant);
        item.setQuantity(10.0);
        item.setUnitPrice(BigDecimal.valueOf(100));
        item.setTotalPrice(BigDecimal.valueOf(1000));
        item.setCurrency("EGP");
        return item;
    }
}