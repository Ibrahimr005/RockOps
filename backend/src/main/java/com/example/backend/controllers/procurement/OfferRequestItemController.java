// OfferRequestItemController.java
package com.example.backend.controllers.procurement;

import com.example.backend.dto.procurement.OfferRequestItemDTO;
import com.example.backend.dto.procurement.RequestItemModificationDTO;
import com.example.backend.services.procurement.OfferRequestItemService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/procurement/offers/{offerId}/request-items")
@CrossOrigin(origins = "*")
public class OfferRequestItemController {

    private final OfferRequestItemService offerRequestItemService;

    @Autowired
    public OfferRequestItemController(OfferRequestItemService offerRequestItemService) {
        this.offerRequestItemService = offerRequestItemService;
    }

    /**
     * Get effective request items for an offer (modified or original)
     */
    @GetMapping
    public ResponseEntity<List<OfferRequestItemDTO>> getEffectiveRequestItems(
            @PathVariable UUID offerId) {
        List<OfferRequestItemDTO> items = offerRequestItemService.getEffectiveRequestItems(offerId);
        return ResponseEntity.ok(items);
    }

    /**
     * Initialize modified items from original request order
     */
    @PostMapping("/initialize")
    public ResponseEntity<List<OfferRequestItemDTO>> initializeModifiedItems(
            @PathVariable UUID offerId,
            Authentication authentication) {
        String username = authentication.getName();
        List<OfferRequestItemDTO> items = offerRequestItemService.initializeModifiedItems(offerId, username);
        return ResponseEntity.ok(items);
    }

    /**
     * Add a new request item to the offer
     */
    @PostMapping
    public ResponseEntity<OfferRequestItemDTO> addRequestItem(
            @PathVariable UUID offerId,
            @RequestBody OfferRequestItemDTO dto,
            Authentication authentication) {
        String username = authentication.getName();
        OfferRequestItemDTO created = offerRequestItemService.addRequestItem(offerId, dto, username);
        return ResponseEntity.ok(created);
    }

    /**
     * Update an existing request item
     */
    @PutMapping("/{itemId}")
    public ResponseEntity<OfferRequestItemDTO> updateRequestItem(
            @PathVariable UUID offerId,
            @PathVariable UUID itemId,
            @RequestBody OfferRequestItemDTO dto,
            Authentication authentication) {
        String username = authentication.getName();
        OfferRequestItemDTO updated = offerRequestItemService.updateRequestItem(itemId, dto, username);
        return ResponseEntity.ok(updated);
    }

    /**
     * Delete a request item and its associated offer items
     */
    @DeleteMapping("/{itemId}")
    public ResponseEntity<Void> deleteRequestItem(
            @PathVariable UUID offerId,
            @PathVariable UUID itemId,
            Authentication authentication) {
        String username = authentication.getName();
        offerRequestItemService.deleteRequestItem(itemId, username);
        return ResponseEntity.noContent().build();
    }

    /**
     * Get modification history for an offer
     */
    @GetMapping("/history")
    public ResponseEntity<List<RequestItemModificationDTO>> getModificationHistory(
            @PathVariable UUID offerId) {
        List<RequestItemModificationDTO> history = offerRequestItemService.getModificationHistory(offerId);
        return ResponseEntity.ok(history);
    }
}