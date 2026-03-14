package com.example.backend.services.procurement;

import com.example.backend.dto.procurement.OfferRequestItemDTO;
import com.example.backend.dto.procurement.RequestItemModificationDTO;
import com.example.backend.mappers.procurement.OfferRequestItemMapper;
import com.example.backend.mappers.procurement.RequestItemModificationMapper;
import com.example.backend.models.procurement.Offer.Offer;
import com.example.backend.models.procurement.Offer.OfferItem;
import com.example.backend.models.procurement.Offer.OfferRequestItem;
import com.example.backend.models.procurement.Offer.RequestItemModification;
import com.example.backend.models.procurement.RequestOrder.RequestOrder;
import com.example.backend.models.procurement.RequestOrder.RequestOrderItem;
import com.example.backend.models.warehouse.ItemType;
import com.example.backend.models.warehouse.MeasuringUnit;
import com.example.backend.repositories.procurement.*;
import com.example.backend.repositories.warehouse.ItemTypeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class OfferRequestItemServiceTest {

    @Mock
    private OfferRepository offerRepository;

    @Mock
    private OfferRequestItemRepository offerRequestItemRepository;

    @Mock
    private RequestItemModificationRepository modificationRepository;

    @Mock
    private ItemTypeRepository itemTypeRepository;

    @Mock
    private OfferItemRepository offerItemRepository;

    @Mock
    private OfferRequestItemMapper offerRequestItemMapper;

    @Mock
    private RequestItemModificationMapper modificationMapper;

    @InjectMocks
    private OfferRequestItemService service;

    // ==================== getEffectiveRequestItems ====================

    @Test
    public void getEffectiveRequestItems_withModifiedItems_shouldReturnModified() {
        UUID offerId = UUID.randomUUID();
        Offer offer = createOffer(offerId);
        OfferRequestItem modifiedItem = createOfferRequestItem(offer);
        OfferRequestItemDTO dto = OfferRequestItemDTO.builder().id(modifiedItem.getId()).build();

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(offerRequestItemRepository.findByOffer(offer)).thenReturn(List.of(modifiedItem));
        when(offerRequestItemMapper.toDTOList(List.of(modifiedItem))).thenReturn(List.of(dto));

        List<OfferRequestItemDTO> result = service.getEffectiveRequestItems(offerId);

        assertEquals(1, result.size());
    }

    @Test
    public void getEffectiveRequestItems_noModifiedItems_shouldReturnOriginal() {
        UUID offerId = UUID.randomUUID();
        Offer offer = createOffer(offerId);

        ItemType itemType = new ItemType();
        itemType.setId(UUID.randomUUID());
        itemType.setName("Cement");
        MeasuringUnit unit = new MeasuringUnit();
        unit.setName("Ton");
        itemType.setMeasuringUnit(unit);

        RequestOrderItem roItem = new RequestOrderItem();
        roItem.setId(UUID.randomUUID());
        roItem.setItemType(itemType);
        roItem.setQuantity(10.0);
        roItem.setComment("Test");
        offer.getRequestOrder().setRequestItems(List.of(roItem));

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(offerRequestItemRepository.findByOffer(offer)).thenReturn(List.of());

        List<OfferRequestItemDTO> result = service.getEffectiveRequestItems(offerId);

        assertEquals(1, result.size());
    }

    @Test
    public void getEffectiveRequestItems_offerNotFound_shouldThrow() {
        UUID offerId = UUID.randomUUID();
        when(offerRepository.findById(offerId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> service.getEffectiveRequestItems(offerId));
    }

    // ==================== addRequestItem ====================

    @Test
    public void addRequestItem_success_shouldAdd() {
        UUID offerId = UUID.randomUUID();
        UUID itemTypeId = UUID.randomUUID();
        Offer offer = createOffer(offerId);

        ItemType itemType = new ItemType();
        itemType.setId(itemTypeId);
        itemType.setName("Steel");

        OfferRequestItemDTO dto = OfferRequestItemDTO.builder()
                .itemTypeId(itemTypeId)
                .quantity(20.0)
                .comment("New item")
                .build();

        OfferRequestItemDTO resultDto = OfferRequestItemDTO.builder().id(UUID.randomUUID()).build();

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(itemTypeRepository.findById(itemTypeId)).thenReturn(Optional.of(itemType));
        when(offerRequestItemRepository.save(any(OfferRequestItem.class))).thenAnswer(i -> {
            OfferRequestItem saved = i.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });
        when(modificationRepository.save(any(RequestItemModification.class))).thenAnswer(i -> i.getArgument(0));
        when(offerRequestItemMapper.toDTO(any(OfferRequestItem.class))).thenReturn(resultDto);

        OfferRequestItemDTO result = service.addRequestItem(offerId, dto, "admin");

        assertNotNull(result);
        verify(offerRequestItemRepository).save(any(OfferRequestItem.class));
        verify(modificationRepository).save(any(RequestItemModification.class));
    }

    @Test
    public void addRequestItem_offerNotFound_shouldThrow() {
        UUID offerId = UUID.randomUUID();
        OfferRequestItemDTO dto = OfferRequestItemDTO.builder().build();

        when(offerRepository.findById(offerId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> service.addRequestItem(offerId, dto, "admin"));
    }

    // ==================== updateRequestItem ====================

    @Test
    public void updateRequestItem_success_shouldUpdate() {
        UUID itemId = UUID.randomUUID();
        Offer offer = createOffer(UUID.randomUUID());

        ItemType itemType = new ItemType();
        itemType.setId(UUID.randomUUID());
        itemType.setName("Cement");

        OfferRequestItem existing = new OfferRequestItem();
        existing.setId(itemId);
        existing.setOffer(offer);
        existing.setItemType(itemType);
        existing.setQuantity(10.0);
        existing.setComment("Old");

        OfferRequestItemDTO dto = OfferRequestItemDTO.builder()
                .quantity(20.0)
                .comment("Updated")
                .build();

        OfferRequestItemDTO resultDto = OfferRequestItemDTO.builder().id(itemId).build();

        when(offerRequestItemRepository.existsById(itemId)).thenReturn(true);
        when(offerRequestItemRepository.findByIdWithDetails(itemId)).thenReturn(Optional.of(existing));
        when(offerRequestItemRepository.save(any(OfferRequestItem.class))).thenAnswer(i -> i.getArgument(0));
        when(modificationRepository.save(any(RequestItemModification.class))).thenAnswer(i -> i.getArgument(0));
        when(offerRequestItemMapper.toDTO(any(OfferRequestItem.class))).thenReturn(resultDto);

        OfferRequestItemDTO result = service.updateRequestItem(itemId, dto, "admin");

        assertNotNull(result);
        assertEquals(20.0, existing.getQuantity());
    }

    @Test
    public void updateRequestItem_notFound_shouldThrow() {
        UUID itemId = UUID.randomUUID();
        OfferRequestItemDTO dto = OfferRequestItemDTO.builder().build();

        when(offerRequestItemRepository.existsById(itemId)).thenReturn(false);

        assertThrows(RuntimeException.class, () -> service.updateRequestItem(itemId, dto, "admin"));
    }

    // ==================== deleteRequestItem ====================

    @Test
    public void deleteRequestItem_success_shouldDelete() {
        UUID itemId = UUID.randomUUID();
        Offer offer = createOffer(UUID.randomUUID());

        ItemType itemType = new ItemType();
        itemType.setId(UUID.randomUUID());
        itemType.setName("Cement");

        OfferRequestItem item = new OfferRequestItem();
        item.setId(itemId);
        item.setOffer(offer);
        item.setItemType(itemType);
        item.setQuantity(10.0);
        item.setComment("To delete");

        when(offerRequestItemRepository.findById(itemId)).thenReturn(Optional.of(item));
        when(offerItemRepository.findAll()).thenReturn(List.of());
        when(modificationRepository.save(any(RequestItemModification.class))).thenAnswer(i -> i.getArgument(0));

        service.deleteRequestItem(itemId, "admin");

        verify(offerRequestItemRepository).delete(item);
        verify(modificationRepository).save(any(RequestItemModification.class));
    }

    @Test
    public void deleteRequestItem_notFound_shouldThrow() {
        UUID itemId = UUID.randomUUID();
        when(offerRequestItemRepository.findById(itemId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> service.deleteRequestItem(itemId, "admin"));
    }

    @Test
    public void deleteRequestItem_withAssociatedOfferItems_shouldDeleteAll() {
        UUID itemId = UUID.randomUUID();
        UUID offerId = UUID.randomUUID();
        Offer offer = createOffer(offerId);

        ItemType itemType = new ItemType();
        itemType.setId(UUID.randomUUID());
        itemType.setName("Steel");

        OfferRequestItem item = new OfferRequestItem();
        item.setId(itemId);
        item.setOffer(offer);
        item.setItemType(itemType);
        item.setQuantity(5.0);
        item.setOriginalRequestOrderItemId(UUID.randomUUID());

        OfferItem associatedOfferItem = new OfferItem();
        associatedOfferItem.setId(UUID.randomUUID());
        associatedOfferItem.setOffer(offer);
        associatedOfferItem.setItemType(itemType);

        when(offerRequestItemRepository.findById(itemId)).thenReturn(Optional.of(item));
        when(offerItemRepository.findAll()).thenReturn(List.of(associatedOfferItem));
        when(modificationRepository.save(any(RequestItemModification.class))).thenAnswer(i -> i.getArgument(0));

        service.deleteRequestItem(itemId, "admin");

        verify(offerItemRepository).delete(associatedOfferItem);
        verify(offerRequestItemRepository).delete(item);
    }

    // ==================== initializeModifiedItems ====================

    @Test
    public void initializeModifiedItems_alreadyInitialized_shouldReturnExisting() {
        UUID offerId = UUID.randomUUID();
        Offer offer = createOffer(offerId);
        OfferRequestItem existing = createOfferRequestItem(offer);
        OfferRequestItemDTO dto = OfferRequestItemDTO.builder().id(existing.getId()).build();

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(offerRequestItemRepository.findByOffer(offer)).thenReturn(List.of(existing));
        when(offerRequestItemMapper.toDTOList(List.of(existing))).thenReturn(List.of(dto));

        List<OfferRequestItemDTO> result = service.initializeModifiedItems(offerId, "admin");

        assertEquals(1, result.size());
        verify(offerRequestItemRepository, never()).saveAll(any());
    }

    @Test
    public void initializeModifiedItems_notYetInitialized_shouldCopyFromOriginal() {
        UUID offerId = UUID.randomUUID();
        Offer offer = createOffer(offerId);

        ItemType itemType = new ItemType();
        itemType.setId(UUID.randomUUID());
        itemType.setName("Cement");

        RequestOrderItem roItem = new RequestOrderItem();
        roItem.setId(UUID.randomUUID());
        roItem.setItemType(itemType);
        roItem.setQuantity(10.0);
        roItem.setComment("Original");
        offer.getRequestOrder().setRequestItems(List.of(roItem));

        OfferRequestItemDTO dto = OfferRequestItemDTO.builder().id(UUID.randomUUID()).build();

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(offerRequestItemRepository.findByOffer(offer)).thenReturn(List.of());
        when(offerRequestItemRepository.saveAll(any())).thenAnswer(i -> i.getArgument(0));
        when(modificationRepository.save(any(RequestItemModification.class))).thenAnswer(i -> i.getArgument(0));
        when(offerRequestItemMapper.toDTOList(any())).thenReturn(List.of(dto));

        List<OfferRequestItemDTO> result = service.initializeModifiedItems(offerId, "admin");

        assertNotNull(result);
        verify(offerRequestItemRepository).saveAll(any());
    }

    // ==================== getModificationHistory ====================

    @Test
    public void getModificationHistory_shouldReturnHistory() {
        UUID offerId = UUID.randomUUID();
        Offer offer = createOffer(offerId);
        RequestItemModification mod = new RequestItemModification();
        RequestItemModificationDTO modDTO = new RequestItemModificationDTO();

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(modificationRepository.findByOfferOrderByTimestampDesc(offer)).thenReturn(List.of(mod));
        when(modificationMapper.toDTOList(List.of(mod))).thenReturn(List.of(modDTO));

        List<RequestItemModificationDTO> result = service.getModificationHistory(offerId);

        assertEquals(1, result.size());
    }

    @Test
    public void getModificationHistory_offerNotFound_shouldThrow() {
        UUID offerId = UUID.randomUUID();
        when(offerRepository.findById(offerId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> service.getModificationHistory(offerId));
    }

    // ==================== Helpers ====================

    private Offer createOffer(UUID id) {
        RequestOrder requestOrder = new RequestOrder();
        requestOrder.setId(UUID.randomUUID());
        requestOrder.setRequestItems(new ArrayList<>());

        Offer offer = new Offer();
        offer.setId(id);
        offer.setTitle("Test Offer");
        offer.setRequestOrder(requestOrder);
        offer.setOfferItems(new ArrayList<>());
        return offer;
    }

    private OfferRequestItem createOfferRequestItem(Offer offer) {
        ItemType itemType = new ItemType();
        itemType.setId(UUID.randomUUID());
        itemType.setName("Cement");

        OfferRequestItem item = new OfferRequestItem();
        item.setId(UUID.randomUUID());
        item.setOffer(offer);
        item.setItemType(itemType);
        item.setQuantity(10.0);
        item.setComment("Test");
        item.setCreatedAt(LocalDateTime.now());
        item.setCreatedBy("admin");
        return item;
    }
}