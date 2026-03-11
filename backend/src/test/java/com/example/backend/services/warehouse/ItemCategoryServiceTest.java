package com.example.backend.services.warehouse;

import com.example.backend.models.warehouse.ItemCategory;
import com.example.backend.models.warehouse.ItemType;
import com.example.backend.repositories.warehouse.ItemCategoryRepository;
import com.example.backend.services.notification.NotificationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ItemCategoryServiceTest {

    @Mock
    private ItemCategoryRepository itemCategoryRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private ItemCategoryService itemCategoryService;

    // ==================== addItemCategory ====================

    @Test
    public void addItemCategory_newCategory_shouldCreate() {
        Map<String, Object> request = new HashMap<>();
        request.put("name", "Electronics");
        request.put("description", "Electronic items");

        when(itemCategoryRepository.findByNameAndDescription("Electronics", "Electronic items"))
                .thenReturn(null);
        when(itemCategoryRepository.save(any(ItemCategory.class))).thenAnswer(invocation -> {
            ItemCategory cat = invocation.getArgument(0);
            cat.setId(UUID.randomUUID());
            return cat;
        });

        ItemCategory result = itemCategoryService.addItemCategory(request);

        assertNotNull(result);
        assertEquals("Electronics", result.getName());
        assertEquals("Electronic items", result.getDescription());
        assertNull(result.getParentCategory());
        verify(itemCategoryRepository).save(any(ItemCategory.class));
    }

    @Test
    public void addItemCategory_existingCategory_shouldReturnExisting() {
        ItemCategory existing = createCategory("Electronics", "Electronic items");

        when(itemCategoryRepository.findByNameAndDescription("Electronics", "Electronic items"))
                .thenReturn(existing);

        Map<String, Object> request = new HashMap<>();
        request.put("name", "Electronics");
        request.put("description", "Electronic items");

        ItemCategory result = itemCategoryService.addItemCategory(request);

        assertEquals(existing.getId(), result.getId());
        verify(itemCategoryRepository, never()).save(any());
    }

    @Test
    public void addItemCategory_withParent_shouldSetParent() {
        UUID parentId = UUID.randomUUID();
        ItemCategory parent = createCategory("Main Category", "Parent");
        parent.setId(parentId);

        when(itemCategoryRepository.findByNameAndDescription("Sub Category", "Child"))
                .thenReturn(null);
        when(itemCategoryRepository.findById(parentId)).thenReturn(Optional.of(parent));
        when(itemCategoryRepository.save(any(ItemCategory.class))).thenAnswer(invocation -> {
            ItemCategory cat = invocation.getArgument(0);
            cat.setId(UUID.randomUUID());
            return cat;
        });

        Map<String, Object> request = new HashMap<>();
        request.put("name", "Sub Category");
        request.put("description", "Child");
        request.put("parentCategoryId", parentId.toString());

        ItemCategory result = itemCategoryService.addItemCategory(request);

        assertNotNull(result.getParentCategory());
        assertEquals(parentId, result.getParentCategory().getId());
    }

    @Test
    public void addItemCategory_withInvalidParent_shouldThrow() {
        UUID fakeParentId = UUID.randomUUID();

        when(itemCategoryRepository.findByNameAndDescription("Sub", "Desc")).thenReturn(null);
        when(itemCategoryRepository.findById(fakeParentId)).thenReturn(Optional.empty());

        Map<String, Object> request = new HashMap<>();
        request.put("name", "Sub");
        request.put("description", "Desc");
        request.put("parentCategoryId", fakeParentId.toString());

        assertThrows(RuntimeException.class,
                () -> itemCategoryService.addItemCategory(request));
    }

    // ==================== getAllCategories ====================

    @Test
    public void getAllCategories_shouldReturnAll() {
        List<ItemCategory> categories = List.of(
                createCategory("Cat1", "Desc1"),
                createCategory("Cat2", "Desc2")
        );
        when(itemCategoryRepository.findAll()).thenReturn(categories);

        List<ItemCategory> result = itemCategoryService.getAllCategories();

        assertEquals(2, result.size());
    }

    // ==================== getParentCategories ====================

    @Test
    public void getParentCategories_shouldReturnOnlyTopLevel() {
        ItemCategory parent = createCategory("Parent", "Top level");
        parent.setParentCategory(null);

        ItemCategory child = createCategory("Child", "Has parent");
        child.setParentCategory(parent);

        when(itemCategoryRepository.findAll()).thenReturn(List.of(parent, child));

        List<ItemCategory> result = itemCategoryService.getParentCategories();

        assertEquals(1, result.size());
        assertEquals("Parent", result.get(0).getName());
    }

    // ==================== getChildCategories ====================

    @Test
    public void getChildCategories_shouldReturnOnlyWithParent() {
        ItemCategory parent = createCategory("Parent", "Top level");
        parent.setParentCategory(null);

        ItemCategory child = createCategory("Child", "Has parent");
        child.setParentCategory(parent);

        when(itemCategoryRepository.findAll()).thenReturn(List.of(parent, child));

        List<ItemCategory> result = itemCategoryService.getChildCategories();

        assertEquals(1, result.size());
        assertEquals("Child", result.get(0).getName());
    }

    // ==================== getLeafCategories ====================

    @Test
    public void getLeafCategories_shouldReturnOnlyLeaves() {
        ItemCategory root = createCategory("Root", "Root");
        root.setParentCategory(null);

        ItemCategory middle = createCategory("Middle", "Middle");
        middle.setParentCategory(root);

        ItemCategory leaf = createCategory("Leaf", "Leaf");
        leaf.setParentCategory(middle);
        leaf.setChildCategories(new ArrayList<>());

        middle.setChildCategories(List.of(leaf));
        root.setChildCategories(List.of(middle));

        when(itemCategoryRepository.findAll()).thenReturn(List.of(root, middle, leaf));

        List<ItemCategory> result = itemCategoryService.getLeafCategories();

        assertEquals(1, result.size());
        assertEquals("Leaf", result.get(0).getName());
    }

    // ==================== getCategoryById ====================

    @Test
    public void getCategoryById_found_shouldReturn() {
        UUID id = UUID.randomUUID();
        ItemCategory cat = createCategory("Test", "Desc");
        cat.setId(id);
        when(itemCategoryRepository.findById(id)).thenReturn(Optional.of(cat));

        ItemCategory result = itemCategoryService.getCategoryById(id);

        assertEquals("Test", result.getName());
    }

    @Test
    public void getCategoryById_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(itemCategoryRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> itemCategoryService.getCategoryById(id));
    }

    // ==================== deleteItemCategory ====================

    @Test
    public void deleteItemCategory_noChildren_noItemTypes_shouldDelete() {
        UUID id = UUID.randomUUID();
        ItemCategory cat = createCategory("ToDelete", "Desc");
        cat.setId(id);
        cat.setChildCategories(new ArrayList<>());
        cat.setItemTypes(new ArrayList<>());

        when(itemCategoryRepository.findById(id)).thenReturn(Optional.of(cat));

        itemCategoryService.deleteItemCategory(id);

        verify(itemCategoryRepository).delete(cat);
    }

    @Test
    public void deleteItemCategory_hasChildren_shouldThrow() {
        UUID id = UUID.randomUUID();
        ItemCategory cat = createCategory("Parent", "Desc");
        cat.setId(id);
        cat.setChildCategories(List.of(createCategory("Child", "Child")));
        cat.setItemTypes(new ArrayList<>());

        when(itemCategoryRepository.findById(id)).thenReturn(Optional.of(cat));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> itemCategoryService.deleteItemCategory(id));
        assertEquals("CHILD_CATEGORIES_EXIST", ex.getMessage());
        verify(itemCategoryRepository, never()).delete(any());
    }

    @Test
    public void deleteItemCategory_hasItemTypes_shouldThrow() {
        UUID id = UUID.randomUUID();
        ItemCategory cat = createCategory("HasItems", "Desc");
        cat.setId(id);
        cat.setChildCategories(new ArrayList<>());
        cat.setItemTypes(List.of(new ItemType()));

        when(itemCategoryRepository.findById(id)).thenReturn(Optional.of(cat));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> itemCategoryService.deleteItemCategory(id));
        assertEquals("ITEM_TYPES_EXIST", ex.getMessage());
        verify(itemCategoryRepository, never()).delete(any());
    }

    // ==================== updateItemCategory ====================

    @Test
    public void updateItemCategory_basicFields_shouldUpdate() {
        UUID id = UUID.randomUUID();
        ItemCategory existing = createCategory("OldName", "OldDesc");
        existing.setId(id);

        when(itemCategoryRepository.findById(id)).thenReturn(Optional.of(existing));
        when(itemCategoryRepository.save(any(ItemCategory.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> request = new HashMap<>();
        request.put("name", "NewName");
        request.put("description", "NewDesc");

        ItemCategory result = itemCategoryService.updateItemCategory(id, request);

        assertEquals("NewName", result.getName());
        assertEquals("NewDesc", result.getDescription());
    }

    @Test
    public void updateItemCategory_circularReference_shouldThrow() {
        UUID parentId = UUID.randomUUID();
        UUID childId = UUID.randomUUID();

        ItemCategory parent = createCategory("Parent", "Parent");
        parent.setId(parentId);
        parent.setChildCategories(new ArrayList<>());

        ItemCategory child = createCategory("Child", "Child");
        child.setId(childId);
        child.setParentCategory(parent);
        child.setChildCategories(new ArrayList<>());

        parent.setChildCategories(List.of(child));

        when(itemCategoryRepository.findById(parentId)).thenReturn(Optional.of(parent));
        when(itemCategoryRepository.findById(childId)).thenReturn(Optional.of(child));

        Map<String, Object> request = new HashMap<>();
        request.put("name", "Parent");
        request.put("description", "Parent");
        request.put("parentCategoryId", childId.toString());

        assertThrows(RuntimeException.class,
                () -> itemCategoryService.updateItemCategory(parentId, request));
    }

    @Test
    public void updateItemCategory_selfParent_shouldThrow() {
        UUID id = UUID.randomUUID();
        ItemCategory cat = createCategory("Self", "Self");
        cat.setId(id);

        when(itemCategoryRepository.findById(id)).thenReturn(Optional.of(cat));

        Map<String, Object> request = new HashMap<>();
        request.put("name", "Self");
        request.put("description", "Self");
        request.put("parentCategoryId", id.toString());

        assertThrows(RuntimeException.class,
                () -> itemCategoryService.updateItemCategory(id, request));
    }

    // ==================== getChildrenByParent ====================

    @Test
    public void getChildrenByParent_shouldReturnChildren() {
        UUID parentId = UUID.randomUUID();
        List<ItemCategory> children = List.of(
                createCategory("Child1", "Desc1"),
                createCategory("Child2", "Desc2")
        );
        when(itemCategoryRepository.findByParentCategoryId(parentId)).thenReturn(children);

        List<ItemCategory> result = itemCategoryService.getChildrenByParent(parentId);

        assertEquals(2, result.size());
    }

    // ==================== Helper ====================

    private ItemCategory createCategory(String name, String description) {
        ItemCategory cat = new ItemCategory();
        cat.setId(UUID.randomUUID());
        cat.setName(name);
        cat.setDescription(description);
        cat.setChildCategories(new ArrayList<>());
        cat.setItemTypes(new ArrayList<>());
        return cat;
    }
}