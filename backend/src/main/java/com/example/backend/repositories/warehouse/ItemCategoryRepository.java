package com.example.backend.repositories.warehouse;

import com.example.backend.models.warehouse.ItemCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface ItemCategoryRepository extends JpaRepository<ItemCategory, UUID> {
    ItemCategory findByNameAndDescription(String categoryName, String categoryDescription);

    List<ItemCategory> findByParentCategoryIsNull();

    // Find child categories of a specific parent
    List<ItemCategory> findByParentCategoryId(UUID parentId);

    // Find leaf categories (categories that have no children)
    @Query("SELECT c FROM ItemCategory c WHERE NOT EXISTS (SELECT 1 FROM ItemCategory child WHERE child.parentCategory = c)")
    List<ItemCategory> findLeafCategories();

    // Find categories that are either leaves or have a parent (useful for item type assignment)
    @Query("SELECT c FROM ItemCategory c WHERE c.parentCategory IS NOT NULL OR NOT EXISTS (SELECT 1 FROM ItemCategory child WHERE child.parentCategory = c)")
    List<ItemCategory> findCategoriesForItemTypeAssignment();


}
