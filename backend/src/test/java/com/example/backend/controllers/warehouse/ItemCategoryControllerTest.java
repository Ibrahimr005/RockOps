package com.example.backend.controllers.warehouse;

import com.example.backend.config.JwtService;
import com.example.backend.models.warehouse.ItemCategory;
import com.example.backend.services.warehouse.ItemCategoryService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.SecurityFilterAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = ItemCategoryController.class,
        excludeAutoConfiguration = {SecurityAutoConfiguration.class, SecurityFilterAutoConfiguration.class}
)
@AutoConfigureMockMvc(addFilters = false)
public class ItemCategoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ItemCategoryService itemCategoryService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserDetailsService userDetailsService;

    @Autowired
    private ObjectMapper objectMapper;

    // --- Helpers ---

    private ItemCategory buildCategory(UUID id, String name) {
        ItemCategory category = new ItemCategory();
        category.setId(id);
        category.setName(name);
        category.setDescription("Description for " + name);
        return category;
    }

    private Map<String, Object> buildRequestBody(String name) {
        Map<String, Object> body = new HashMap<>();
        body.put("name", name);
        body.put("description", "Description for " + name);
        return body;
    }

    // --- POST /api/v1/itemCategories ---

    @Test
    @WithMockUser
    void createItemCategory_returns201WithCreatedCategory() throws Exception {
        UUID id = UUID.randomUUID();
        ItemCategory created = buildCategory(id, "Spare Parts");
        Map<String, Object> requestBody = buildRequestBody("Spare Parts");

        given(itemCategoryService.addItemCategory(org.mockito.ArgumentMatchers.anyMap()))
                .willReturn(created);

        mockMvc.perform(MockMvcRequestBuilders.post("/api/v1/itemCategories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.name").value("Spare Parts"));
    }

    // --- GET /api/v1/itemCategories ---

    @Test
    @WithMockUser
    void getAllCategories_returns200WithList() throws Exception {
        List<ItemCategory> categories = Arrays.asList(
                buildCategory(UUID.randomUUID(), "Spare Parts"),
                buildCategory(UUID.randomUUID(), "Consumables")
        );
        given(itemCategoryService.getAllCategories()).willReturn(categories);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/v1/itemCategories")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("Spare Parts"))
                .andExpect(jsonPath("$[1].name").value("Consumables"));
    }

    @Test
    @WithMockUser
    void getAllCategories_returns200WithEmptyList_whenNoneExist() throws Exception {
        given(itemCategoryService.getAllCategories()).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders.get("/api/v1/itemCategories")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // --- GET /api/v1/itemCategories/parents ---

    @Test
    @WithMockUser
    void getParentCategories_returns200WithParentList() throws Exception {
        List<ItemCategory> parents = Arrays.asList(
                buildCategory(UUID.randomUUID(), "Equipment Parts"),
                buildCategory(UUID.randomUUID(), "Chemicals")
        );
        given(itemCategoryService.getParentCategories()).willReturn(parents);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/v1/itemCategories/parents")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("Equipment Parts"));
    }

    @Test
    @WithMockUser
    void getParentCategories_returns200WithEmptyList_whenNoneExist() throws Exception {
        given(itemCategoryService.getParentCategories()).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders.get("/api/v1/itemCategories/parents")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // --- GET /api/v1/itemCategories/children ---

    @Test
    @WithMockUser
    void getChildCategories_returns200WithChildList() throws Exception {
        List<ItemCategory> children = Arrays.asList(
                buildCategory(UUID.randomUUID(), "Filters"),
                buildCategory(UUID.randomUUID(), "Oils")
        );
        given(itemCategoryService.getChildCategories()).willReturn(children);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/v1/itemCategories/children")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("Filters"));
    }

    @Test
    @WithMockUser
    void getChildCategories_returns200WithEmptyList_whenNoneExist() throws Exception {
        given(itemCategoryService.getChildCategories()).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders.get("/api/v1/itemCategories/children")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // --- GET /api/v1/itemCategories/leaves ---

    @Test
    @WithMockUser
    void getLeafCategories_returns200WithLeafList() throws Exception {
        List<ItemCategory> leaves = Arrays.asList(
                buildCategory(UUID.randomUUID(), "Oil Filters"),
                buildCategory(UUID.randomUUID(), "Air Filters")
        );
        given(itemCategoryService.getLeafCategories()).willReturn(leaves);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/v1/itemCategories/leaves")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("Oil Filters"));
    }

    @Test
    @WithMockUser
    void getLeafCategories_returns200WithEmptyList_whenNoneExist() throws Exception {
        given(itemCategoryService.getLeafCategories()).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders.get("/api/v1/itemCategories/leaves")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // --- GET /api/v1/itemCategories/{id} ---

    @Test
    @WithMockUser
    void getCategoryById_returns200WithCategory() throws Exception {
        UUID id = UUID.randomUUID();
        ItemCategory category = buildCategory(id, "Spare Parts");
        given(itemCategoryService.getCategoryById(id)).willReturn(category);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/v1/itemCategories/{id}", id)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.name").value("Spare Parts"));
    }

    // --- PUT /api/v1/itemCategories/{id} ---

    @Test
    @WithMockUser
    void updateCategory_returns200WithUpdatedCategory() throws Exception {
        UUID id = UUID.randomUUID();
        ItemCategory updated = buildCategory(id, "Updated Spare Parts");
        Map<String, Object> requestBody = buildRequestBody("Updated Spare Parts");

        given(itemCategoryService.updateItemCategory(
                org.mockito.ArgumentMatchers.eq(id),
                org.mockito.ArgumentMatchers.anyMap()))
                .willReturn(updated);

        mockMvc.perform(MockMvcRequestBuilders.put("/api/v1/itemCategories/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestBody))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.name").value("Updated Spare Parts"));
    }

    // --- DELETE /api/v1/itemCategories/{id} ---

    @Test
    @WithMockUser
    void deleteItemCategory_returns200_whenSuccessful() throws Exception {
        UUID id = UUID.randomUUID();
        willDoNothing().given(itemCategoryService).deleteItemCategory(id);

        mockMvc.perform(MockMvcRequestBuilders.delete("/api/v1/itemCategories/{id}", id))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser
    void deleteItemCategory_returns409_whenChildCategoriesExist() throws Exception {
        UUID id = UUID.randomUUID();
        willThrow(new RuntimeException("CHILD_CATEGORIES_EXIST"))
                .given(itemCategoryService).deleteItemCategory(id);

        mockMvc.perform(MockMvcRequestBuilders.delete("/api/v1/itemCategories/{id}", id))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser
    void deleteItemCategory_returns409_whenItemTypesExist() throws Exception {
        UUID id = UUID.randomUUID();
        willThrow(new RuntimeException("ITEM_TYPES_EXIST"))
                .given(itemCategoryService).deleteItemCategory(id);

        mockMvc.perform(MockMvcRequestBuilders.delete("/api/v1/itemCategories/{id}", id))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser
    void deleteItemCategory_returns404_whenCategoryNotFound() throws Exception {
        UUID id = UUID.randomUUID();
        willThrow(new RuntimeException("ItemCategory not found with id: " + id))
                .given(itemCategoryService).deleteItemCategory(id);

        mockMvc.perform(MockMvcRequestBuilders.delete("/api/v1/itemCategories/{id}", id))
                .andExpect(status().isNotFound());
    }

    // --- GET /api/v1/itemCategories/test ---

    @Test
    @WithMockUser
    void testEndpoint_returns200() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.get("/api/v1/itemCategories/test")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    // --- GET /api/v1/itemCategories/children/{parentId} ---

    @Test
    @WithMockUser
    void getChildrenByParent_returns200WithChildList() throws Exception {
        UUID parentId = UUID.randomUUID();
        List<ItemCategory> children = Arrays.asList(
                buildCategory(UUID.randomUUID(), "Oil Filters"),
                buildCategory(UUID.randomUUID(), "Air Filters")
        );
        given(itemCategoryService.getChildrenByParent(parentId)).willReturn(children);

        mockMvc.perform(MockMvcRequestBuilders.get("/api/v1/itemCategories/children/{parentId}", parentId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("Oil Filters"))
                .andExpect(jsonPath("$[1].name").value("Air Filters"));
    }

    @Test
    @WithMockUser
    void getChildrenByParent_returns200WithEmptyList_whenNoChildren() throws Exception {
        UUID parentId = UUID.randomUUID();
        given(itemCategoryService.getChildrenByParent(parentId)).willReturn(Collections.emptyList());

        mockMvc.perform(MockMvcRequestBuilders.get("/api/v1/itemCategories/children/{parentId}", parentId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }
}