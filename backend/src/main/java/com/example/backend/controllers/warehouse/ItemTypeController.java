package com.example.backend.controllers.warehouse;


import com.example.backend.dto.warehouse.ItemTypeDetailsDTO;
import com.example.backend.models.warehouse.ItemType;
import com.example.backend.services.warehouse.ItemTypeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/v1/itemTypes")
public class ItemTypeController {

    @Autowired
    private ItemTypeService itemTypeService;

    // Add a new ItemType (no need for warehouse ID anymore)
    @PostMapping
    public ResponseEntity<ItemType> addItemType(@RequestBody Map<String, Object> requestBody) {
        ItemType createdItemType = itemTypeService.addItemType(requestBody);
        return ResponseEntity.ok(createdItemType);
    }

    // Get all ItemTypes (no need for warehouse-specific logic)
    @GetMapping
    public ResponseEntity<List<ItemType>> getAllItemTypes() {
        List<ItemType> itemTypes = itemTypeService.getAllItemTypes();
        return ResponseEntity.ok(itemTypes);
    }

    // Update an existing ItemType
    @PutMapping("/{id}")
    public ResponseEntity<ItemType> updateItemType(@PathVariable UUID id, @RequestBody Map<String, Object> requestBody) {
        ItemType updatedItemType = itemTypeService.updateItemType(id, requestBody);
        return ResponseEntity.ok(updatedItemType);
    }

    // Delete an existing ItemType
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteItemType(@PathVariable UUID id) {
        try {
            itemTypeService.deleteItemType(id);
            return ResponseEntity.ok("ItemType with ID " + id + " deleted successfully");
        } catch (RuntimeException e) {
            if (e.getMessage().equals("ITEMS_EXIST")) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body("ITEMS_EXIST");
            } else if (e.getMessage().equals("TRANSACTION_ITEMS_EXIST")) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body("TRANSACTION_ITEMS_EXIST");
            } else if (e.getMessage().equals("REQUEST_ORDER_ITEMS_EXIST")) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body("REQUEST_ORDER_ITEMS_EXIST");
            } else if (e.getMessage().equals("OFFER_ITEMS_EXIST")) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body("OFFER_ITEMS_EXIST");
            } else if (e.getMessage().contains("ItemType not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("ITEM_TYPE_NOT_FOUND");
            }
            // Let other exceptions go to global handler
            throw e;
        }
    }

    /**
     * GET item type details with warehouse distribution
     * Endpoint: GET /api/item-types/{itemTypeId}/details
     */
    @GetMapping("/{itemTypeId}/details")
    public ResponseEntity<ItemTypeDetailsDTO> getItemTypeDetails(@PathVariable UUID itemTypeId) {
        try {
            System.out.println("📦 Fetching details for item type: " + itemTypeId);
            ItemTypeDetailsDTO details = itemTypeService.getItemTypeDetails(itemTypeId);
            return ResponseEntity.ok(details);
        } catch (IllegalArgumentException e) {
            System.err.println("❌ Item type not found: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            System.err.println("❌ Error fetching item type details: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
