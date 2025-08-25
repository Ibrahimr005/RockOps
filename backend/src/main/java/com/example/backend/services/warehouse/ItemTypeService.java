package com.example.backend.services.warehouse;


import com.example.backend.models.warehouse.ItemCategory;
import com.example.backend.models.warehouse.ItemType;
import com.example.backend.repositories.warehouse.ItemCategoryRepository;
import com.example.backend.repositories.warehouse.ItemTypeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ItemTypeService {

    @Autowired
    private ItemTypeRepository itemTypeRepository;

    @Autowired
    private ItemCategoryRepository itemCategoryRepository;

    public ItemType addItemType(Map<String, Object> requestBody) {
        ItemType itemType = new ItemType();

        if (requestBody.containsKey("name")) {
            itemType.setName((String) requestBody.get("name"));
        }
        if (requestBody.containsKey("comment")) {
            itemType.setComment((String) requestBody.get("comment"));
        }
        if (requestBody.containsKey("measuringUnit")) {
            itemType.setMeasuringUnit((String) requestBody.get("measuringUnit"));
        }
        if (requestBody.containsKey("status")) {
            itemType.setStatus((String) requestBody.get("status"));
        }
        if (requestBody.containsKey("minQuantity")) {
            itemType.setMinQuantity((int) requestBody.get("minQuantity"));
        }
        if (requestBody.containsKey("serialNumber")) {
            itemType.setSerialNumber((String) requestBody.get("serialNumber"));
        }

        if (requestBody.containsKey("itemCategory")) {
            UUID categoryId = UUID.fromString((String) requestBody.get("itemCategory"));
            ItemCategory category = itemCategoryRepository.findById(categoryId)
                    .orElseThrow(() -> new IllegalArgumentException("ItemCategory not found with id: " + categoryId));
            itemType.setItemCategory(category);
        }

        return itemTypeRepository.save(itemType);
    }

    public ItemType getItemTypeById(UUID id) {
        return itemTypeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("ItemType not found"));
    }

    public List<ItemType> getAllItemTypes() {
        return itemTypeRepository.findAll();
    }

    public ItemType updateItemType(UUID id, Map<String, Object> requestBody) {
        ItemType existingItemType = getItemTypeById(id);

        if (requestBody.containsKey("name")) {
            existingItemType.setName((String) requestBody.get("name"));
        }
        if (requestBody.containsKey("measuringUnit")) {
            existingItemType.setMeasuringUnit((String) requestBody.get("measuringUnit"));
        }
        if (requestBody.containsKey("status")) {
            existingItemType.setStatus((String) requestBody.get("status"));
        }
        if (requestBody.containsKey("minQuantity")) {
            Integer minQuantity = (Integer) requestBody.get("minQuantity");
            if (minQuantity >= 0) {
                existingItemType.setMinQuantity(minQuantity);
            }
        }
        if (requestBody.containsKey("serialNumber")) {
            existingItemType.setSerialNumber((String) requestBody.get("serialNumber"));
        }
        if (requestBody.containsKey("itemCategory")) {
            UUID categoryId = UUID.fromString((String) requestBody.get("itemCategory"));
            ItemCategory category = itemCategoryRepository.findById(categoryId)
                    .orElseThrow(() -> new IllegalArgumentException("ItemCategory not found with id: " + categoryId));
            existingItemType.setItemCategory(category);
        }
        if (requestBody.containsKey("comment")) {
            String comment = (String) requestBody.get("comment");
            existingItemType.setComment((comment == null || comment.trim().isEmpty()) ? "No comment" : comment);
        }

        return itemTypeRepository.save(existingItemType);
    }

    public void deleteItemType(UUID id) {
        ItemType itemType = itemTypeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("ItemType not found with id: " + id));

        // Check for warehouse items
        if (!itemType.getItems().isEmpty()) {
            throw new RuntimeException("ITEMS_EXIST");
        }

        // Check for transaction items
        if (!itemType.getTransactionItems().isEmpty()) {
            throw new RuntimeException("TRANSACTION_ITEMS_EXIST");
        }

        // Check for request order items
        if (!itemType.getRequestOrderItems().isEmpty()) {
            throw new RuntimeException("REQUEST_ORDER_ITEMS_EXIST");
        }

        // Check for offer items
        if (!itemType.getOfferItems().isEmpty()) {
            throw new RuntimeException("OFFER_ITEMS_EXIST");
        }

        // If no dependencies, proceed with deletion
        itemType.setItemCategory(null);
        itemTypeRepository.delete(itemType);
    }
}
