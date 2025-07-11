package com.example.backend.services.warehouse;

import com.example.backend.models.notification.NotificationType;
import com.example.backend.models.warehouse.ItemCategory;
import com.example.backend.repositories.warehouse.ItemCategoryRepository;
import com.example.backend.services.notification.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ItemCategoryService {

    @Autowired
    private ItemCategoryRepository itemCategoryRepository;

    // Make NotificationService optional to avoid startup errors
    @Autowired(required = false)
    private NotificationService notificationService;

    public ItemCategory addItemCategory(Map<String, Object> requestBody) {
        String categoryName = (String) requestBody.get("name");
        String categoryDescription = (String) requestBody.get("description");

        // Make parentCategoryId final (effectively final)
        final UUID parentCategoryId = requestBody.containsKey("parentCategoryId") && requestBody.get("parentCategoryId") != null
                ? UUID.fromString((String) requestBody.get("parentCategoryId"))
                : null;

        // Check if the category already exists in the database
        ItemCategory existingCategory = itemCategoryRepository.findByNameAndDescription(categoryName, categoryDescription);
        if (existingCategory != null) {
            return existingCategory;
        }

        // Create a new ItemCategory
        ItemCategory itemCategory = new ItemCategory();
        itemCategory.setName(categoryName);
        itemCategory.setDescription(categoryDescription);

        // Set parent category if provided
        if (parentCategoryId != null) {
            ItemCategory parentCategory = itemCategoryRepository.findById(parentCategoryId)
                    .orElseThrow(() -> new RuntimeException("Parent category not found with ID: " + parentCategoryId));
            itemCategory.setParentCategory(parentCategory);
        } else {
            itemCategory.setParentCategory(null);
        }

        // Save the category
        ItemCategory savedCategory = itemCategoryRepository.save(itemCategory);

        // Send notification to warehouse users (AUTO USER DETECTION)
        try {
            if (notificationService != null) {
                String broadcastTitle = "New Category Available";
                String broadcastMessage = String.format(
                        "A new category '%s' has been added to the system%s",
                        categoryName,
                        parentCategoryId != null ? " as a subcategory" : ""
                );

                notificationService.sendNotificationToWarehouseUsers(
                        broadcastTitle,
                        broadcastMessage,
                        NotificationType.INFO,
                        "/warehouses/item-categories",
                        "ItemCategory"
                );
            }
        } catch (Exception e) {
            System.err.println("❌ Failed to send category creation notification: " + e.getMessage());
            // Don't fail the operation if notification fails
        }

        return savedCategory;
    }

    // Get all categories
    public List<ItemCategory> getAllCategories() {
        System.out.println("***************");
        return itemCategoryRepository.findAll();
    }

    // Get only parent categories (categories that have at least one child)
    public List<ItemCategory> getParentCategories() {
        try {
            List<ItemCategory> allCategories = itemCategoryRepository.findAll();

            // Return only categories that have no parent (i.e., top-level categories)
            return allCategories.stream()
                    .filter(category -> category.getParentCategory() == null)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            System.err.println("Error in getParentCategories: " + e.getMessage());
            e.printStackTrace();
            return new ArrayList<>();
        }
    }

    // Get only child categories (categories that have a parent or don't have any parent or child)
    public List<ItemCategory> getChildCategories() {
        try {
            List<ItemCategory> allCategories = itemCategoryRepository.findAll();

            // Keep only categories that either have a parent or don't have children
            return allCategories.stream()
                    .filter(category ->
                            (category.getParentCategory() != null)
                    )
                    .collect(Collectors.toList());
        } catch (Exception e) {
            // Log the full exception
            System.err.println("Error in getChildCategories: " + e.getMessage());
            e.printStackTrace();
            // Return empty list instead of failing
            return new ArrayList<>();
        }
    }

    // Get true leaf categories (categories that have a parent but have no children of their own)
    public List<ItemCategory> getLeafCategories() {
        List<ItemCategory> allCategories = itemCategoryRepository.findAll();

        // Keep only categories that have a parent and don't have children of their own
        return allCategories.stream()
                .filter(category -> category.getParentCategory() != null && category.getChildCategories().isEmpty())
                .collect(Collectors.toList());
    }

    // Get a category by its ID
    public ItemCategory getCategoryById(UUID id) {
        return itemCategoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("ItemCategory not found"));
    }

    // Delete an existing ItemCategory
    public void deleteItemCategory(UUID itemCategoryId) {
        // Fetch the item category to be deleted
        ItemCategory itemCategory = itemCategoryRepository.findById(itemCategoryId)
                .orElseThrow(() -> new RuntimeException("ItemCategory not found with ID: " + itemCategoryId));

        // Store category name for notification
        String categoryName = itemCategory.getName();

        // Check for child categories
        if (!itemCategory.getChildCategories().isEmpty()) {
            throw new RuntimeException("CHILD_CATEGORIES_EXIST");
        }

        // Check for item types
        if (!itemCategory.getItemTypes().isEmpty()) {
            throw new RuntimeException("ITEM_TYPES_EXIST");
        }

        // If no dependencies, proceed with deletion
        itemCategoryRepository.delete(itemCategory);
        System.out.println("Item category deleted successfully");

        // Send notification to warehouse users (AUTO USER DETECTION)
        try {
            if (notificationService != null) {
                String broadcastTitle = "Category Removed";
                String broadcastMessage = String.format(
                        "Category '%s' has been removed from the system",
                        categoryName
                );

                notificationService.sendNotificationToWarehouseUsers(
                        broadcastTitle,
                        broadcastMessage,
                        NotificationType.WARNING,
                        "/warehouses/item-categories",
                        "ItemCategory"
                );
            }
        } catch (Exception e) {
            System.err.println("❌ Failed to send category deletion notification: " + e.getMessage());
            // Don't fail the operation if notification fails
        }
    }

    // Update an existing ItemCategory
    public ItemCategory updateItemCategory(UUID itemCategoryId, Map<String, Object> requestBody) {
        // Fetch the item category to be updated
        ItemCategory itemCategory = itemCategoryRepository.findById(itemCategoryId)
                .orElseThrow(() -> new RuntimeException("ItemCategory not found with ID: " + itemCategoryId));

        // Store old values for notification
        String oldCategoryName = itemCategory.getName();
        String oldCategoryDescription = itemCategory.getDescription();

        // Get the new values for the category
        String newCategoryName = (String) requestBody.get("name");
        String newCategoryDescription = (String) requestBody.get("description");

        // Update the category's name and description
        itemCategory.setName(newCategoryName);
        itemCategory.setDescription(newCategoryDescription);

        // Check if parent category ID is provided for update
        if (requestBody.containsKey("parentCategoryId")) {
            if (requestBody.get("parentCategoryId") != null) {
                UUID parentCategoryId = UUID.fromString((String) requestBody.get("parentCategoryId"));

                // Prevent circular reference - make sure the parent is not the category itself or one of its children
                if (parentCategoryId.equals(itemCategoryId)) {
                    throw new RuntimeException("A category cannot be its own parent");
                }

                // Check if the new parent would create a circular reference
                ItemCategory newParent = itemCategoryRepository.findById(parentCategoryId)
                        .orElseThrow(() -> new RuntimeException("Parent category not found with ID: " + parentCategoryId));

                if (isChildOf(newParent, itemCategory)) {
                    throw new RuntimeException("Cannot set a child category as a parent (circular reference)");
                }

                itemCategory.setParentCategory(newParent);
            } else {
                // If null is explicitly provided, remove the parent reference
                itemCategory.setParentCategory(null);
            }
        }

        // Save the updated category
        ItemCategory updatedCategory = itemCategoryRepository.save(itemCategory);

        // Send notification to warehouse users (AUTO USER DETECTION)
        try {
            if (notificationService != null) {
                String broadcastTitle = "Category Updated";
                String broadcastMessage;

                // Check if name changed
                if (!oldCategoryName.equals(newCategoryName)) {
                    broadcastMessage = String.format(
                            "Category '%s' has been renamed to '%s'",
                            oldCategoryName,
                            newCategoryName
                    );
                } else {
                    broadcastMessage = String.format(
                            "Category '%s' has been updated",
                            newCategoryName
                    );
                }

                notificationService.sendNotificationToWarehouseUsers(
                        broadcastTitle,
                        broadcastMessage,
                        NotificationType.INFO,
                        "/warehouses/item-categories",
                        "ItemCategory"
                );
            }
        } catch (Exception e) {
            System.err.println("❌ Failed to send category update notification: " + e.getMessage());
            // Don't fail the operation if notification fails
        }

        return updatedCategory;
    }

    // Helper method to check if potentialChild is in the hierarchy of parent
    private boolean isChildOf(ItemCategory potentialChild, ItemCategory parent) {
        if (potentialChild == null) {
            return false;
        }

        if (potentialChild.getId().equals(parent.getId())) {
            return true;
        }

        for (ItemCategory child : parent.getChildCategories()) {
            if (isChildOf(potentialChild, child)) {
                return true;
            }
        }

        return false;
    }

    // Add this method to your service class
    public List<ItemCategory> getChildrenByParent(UUID parentId) {
        return itemCategoryRepository.findByParentCategoryId(parentId);
    }
}