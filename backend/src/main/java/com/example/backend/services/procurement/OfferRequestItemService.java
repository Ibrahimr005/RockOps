// OfferRequestItemService.java
package com.example.backend.services.procurement;

import com.example.backend.dto.procurement.OfferRequestItemDTO;
import com.example.backend.dto.procurement.RequestItemModificationDTO;
import com.example.backend.mappers.procurement.OfferRequestItemMapper;
import com.example.backend.mappers.procurement.RequestItemModificationMapper;
import com.example.backend.models.procurement.*;
import com.example.backend.models.warehouse.ItemType;
import com.example.backend.repositories.procurement.*;
import com.example.backend.repositories.warehouse.ItemTypeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class OfferRequestItemService {

    private final OfferRepository offerRepository;
    private final OfferRequestItemRepository offerRequestItemRepository;
    private final RequestItemModificationRepository modificationRepository;
    private final ItemTypeRepository itemTypeRepository;
    private final OfferItemRepository offerItemRepository;
    private final OfferRequestItemMapper offerRequestItemMapper;
    private final RequestItemModificationMapper modificationMapper;

    @Autowired
    public OfferRequestItemService(OfferRepository offerRepository,
                                   OfferRequestItemRepository offerRequestItemRepository,
                                   RequestItemModificationRepository modificationRepository,
                                   ItemTypeRepository itemTypeRepository,
                                   OfferItemRepository offerItemRepository,
                                   OfferRequestItemMapper offerRequestItemMapper,
                                   RequestItemModificationMapper modificationMapper) {
        this.offerRepository = offerRepository;
        this.offerRequestItemRepository = offerRequestItemRepository;
        this.modificationRepository = modificationRepository;
        this.itemTypeRepository = itemTypeRepository;
        this.offerItemRepository = offerItemRepository;
        this.offerRequestItemMapper = offerRequestItemMapper;
        this.modificationMapper = modificationMapper;
    }

    /**
     * Get effective request items (modified or original)
     */
    public List<OfferRequestItemDTO> getEffectiveRequestItems(UUID offerId) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        List<OfferRequestItem> offerRequestItems = offerRequestItemRepository.findByOffer(offer);

        if (!offerRequestItems.isEmpty()) {
            // Return modified items
            return offerRequestItemMapper.toDTOList(offerRequestItems);
        } else {
            // Return original request order items converted to DTO format
            return offer.getRequestOrder().getRequestItems().stream()
                    .map(item -> OfferRequestItemDTO.builder()
                            .id(item.getId())
                            .offerId(offerId)
                            .itemTypeId(item.getItemType().getId())
                            .itemTypeName(item.getItemType().getName())
                            .itemTypeMeasuringUnit(item.getItemType().getMeasuringUnit())
                            .quantity(item.getQuantity())
                            .comment(item.getComment())
                            .originalRequestOrderItemId(item.getId())
                            .build())
                    .toList();
        }
    }

    /**
     * Add a new request item to the offer
     */
    @Transactional
    public OfferRequestItemDTO addRequestItem(UUID offerId, OfferRequestItemDTO dto, String username) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        ItemType itemType = itemTypeRepository.findById(dto.getItemTypeId())
                .orElseThrow(() -> new RuntimeException("Item type not found"));

        // Create the new offer request item
        OfferRequestItem newItem = OfferRequestItem.builder()
                .offer(offer)
                .itemType(itemType)
                .quantity(dto.getQuantity())
                .comment(dto.getComment())
                .originalRequestOrderItemId(dto.getOriginalRequestOrderItemId())
                .createdAt(LocalDateTime.now())
                .createdBy(username)
                .lastModifiedAt(LocalDateTime.now())
                .lastModifiedBy(username)
                .build();

        OfferRequestItem savedItem = offerRequestItemRepository.save(newItem);

        // Record the modification
        recordModification(offer, RequestItemModification.ModificationAction.ADD,
                itemType, null, dto.getQuantity(), null, dto.getComment(), username,
                "Added new item: " + itemType.getName());

        return offerRequestItemMapper.toDTO(savedItem);
    }

    /**
     * Update an existing request item
     */
    @Transactional
    public OfferRequestItemDTO updateRequestItem(UUID itemId, OfferRequestItemDTO dto, String username) {
        System.out.println("=== UPDATE REQUEST ITEM DEBUG START ===");
        System.out.println("Item ID received: " + itemId);
        System.out.println("DTO: " + dto);
        System.out.println("Username: " + username);

        try {
            // Check if item exists
            boolean exists = offerRequestItemRepository.existsById(itemId);
            System.out.println("Item exists in DB: " + exists);

            if (!exists) {
                System.out.println("ERROR: Item not found with ID: " + itemId);
                throw new RuntimeException("Offer request item not found with ID: " + itemId);
            }

            System.out.println("Attempting to fetch item with details...");
            OfferRequestItem item = offerRequestItemRepository.findByIdWithDetails(itemId)
                    .orElseThrow(() -> {
                        System.out.println("ERROR: findByIdWithDetails returned empty!");
                        return new RuntimeException("Offer request item not found");
                    });

            System.out.println("Item fetched successfully: " + item.getId());
            System.out.println("Item type: " + item.getItemType().getName());

            double oldQuantity = item.getQuantity();
            String oldComment = item.getComment();

            System.out.println("Old quantity: " + oldQuantity + ", New quantity: " + dto.getQuantity());

            // Update fields
            item.setQuantity(dto.getQuantity());
            item.setComment(dto.getComment());
            item.setLastModifiedAt(LocalDateTime.now());
            item.setLastModifiedBy(username);

            System.out.println("Saving item...");
            OfferRequestItem updatedItem = offerRequestItemRepository.save(item);
            System.out.println("Item saved successfully");

            // Record modification
            recordModification(item.getOffer(), RequestItemModification.ModificationAction.EDIT,
                    item.getItemType(), oldQuantity, dto.getQuantity(), oldComment, dto.getComment(), username,
                    "Updated item: " + item.getItemType().getName());

            System.out.println("=== UPDATE REQUEST ITEM DEBUG END - SUCCESS ===");
            return offerRequestItemMapper.toDTO(updatedItem);

        } catch (Exception e) {
            System.err.println("!!! EXCEPTION CAUGHT !!!");
            System.err.println("Exception type: " + e.getClass().getName());
            System.err.println("Exception message: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    /**
     * Delete a request item and its associated offer items
     */
    @Transactional
    public void deleteRequestItem(UUID itemId, String username) {
        OfferRequestItem item = offerRequestItemRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Offer request item not found"));

        Offer offer = item.getOffer();
        ItemType itemType = item.getItemType();
        double quantity = item.getQuantity();
        String comment = item.getComment();

        // Delete associated offer items first
        List<OfferItem> associatedOfferItems = offerItemRepository.findAll().stream()
                .filter(oi -> oi.getOffer().getId().equals(offer.getId()) &&
                        oi.getItemType().getId().equals(itemType.getId()))
                .toList();

        for (OfferItem offerItem : associatedOfferItems) {
            offerItemRepository.delete(offerItem);
        }

        // Delete the request item
        offerRequestItemRepository.delete(item);

        // Record the modification
        recordModification(offer, RequestItemModification.ModificationAction.DELETE,
                itemType, quantity, null, comment, null, username,
                "Deleted item: " + itemType.getName() + " (quantity: " + quantity + ")");
    }

    /**
     * Initialize modified items from original request order
     * Call this when user first starts modifying items
     */
    @Transactional
    public List<OfferRequestItemDTO> initializeModifiedItems(UUID offerId, String username) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        // Check if already initialized
        List<OfferRequestItem> existing = offerRequestItemRepository.findByOffer(offer);
        if (!existing.isEmpty()) {
            return offerRequestItemMapper.toDTOList(existing);
        }

        // Copy from original request order
        List<OfferRequestItem> newItems = offer.getRequestOrder().getRequestItems().stream()
                .map(original -> OfferRequestItem.builder()
                        .offer(offer)
                        .itemType(original.getItemType())
                        .quantity(original.getQuantity())
                        .comment(original.getComment())
                        .originalRequestOrderItemId(original.getId())
                        .createdAt(LocalDateTime.now())
                        .createdBy(username)
                        .lastModifiedAt(LocalDateTime.now())
                        .lastModifiedBy(username)
                        .build())
                .toList();

        List<OfferRequestItem> savedItems = offerRequestItemRepository.saveAll(newItems);

        // Record initialization
        RequestItemModification initModification = RequestItemModification.builder()
                .offer(offer)
                .timestamp(LocalDateTime.now())
                .actionBy(username)
                .action(RequestItemModification.ModificationAction.ADD)
                .notes("Initialized modified items from original request order")
                .build();
        modificationRepository.save(initModification);

        return offerRequestItemMapper.toDTOList(savedItems);
    }

    /**
     * Get modification history for an offer
     */
    public List<RequestItemModificationDTO> getModificationHistory(UUID offerId) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        List<RequestItemModification> modifications = modificationRepository.findByOfferOrderByTimestampDesc(offer);
        return modificationMapper.toDTOList(modifications);
    }

    /**
     * Helper method to record modifications
     */
    private void recordModification(Offer offer, RequestItemModification.ModificationAction action,
                                    ItemType itemType, Double oldQuantity, Double newQuantity,
                                    String oldComment, String newComment, String username, String notes) {
        RequestItemModification modification = RequestItemModification.builder()
                .offer(offer)
                .timestamp(LocalDateTime.now())
                .actionBy(username)
                .action(action)
                .itemTypeId(itemType.getId())
                .itemTypeName(itemType.getName())
                .itemTypeMeasuringUnit(itemType.getMeasuringUnit())
                .oldQuantity(oldQuantity)
                .newQuantity(newQuantity)
                .oldComment(oldComment)
                .newComment(newComment)
                .notes(notes)
                .build();

        modificationRepository.save(modification);
    }
}