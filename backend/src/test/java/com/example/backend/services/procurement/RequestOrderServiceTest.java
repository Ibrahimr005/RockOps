package com.example.backend.services.procurement;

import com.example.backend.models.procurement.RequestOrder.RequestOrder;
import com.example.backend.models.warehouse.ItemType;
import com.example.backend.models.warehouse.Warehouse;
import com.example.backend.repositories.procurement.EquipmentPurchaseSpecRepository;
import com.example.backend.repositories.procurement.RequestOrderRepository;
import com.example.backend.repositories.warehouse.ItemTypeRepository;
import com.example.backend.repositories.warehouse.WarehouseRepository;
import com.example.backend.services.notification.NotificationService;
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
public class RequestOrderServiceTest {

    @Mock
    private ItemTypeRepository itemTypeRepository;

    @Mock
    private RequestOrderRepository requestOrderRepository;

    @Mock
    private WarehouseRepository warehouseRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private EquipmentPurchaseSpecRepository equipmentPurchaseSpecRepository;

    @InjectMocks
    private RequestOrderService requestOrderService;

    // ==================== getAllRequestOrders ====================

    @Test
    public void getAllRequestOrders_shouldReturnAll() {
        RequestOrder ro = createRequestOrder(UUID.randomUUID());
        when(requestOrderRepository.findAll()).thenReturn(List.of(ro));

        List<RequestOrder> result = requestOrderService.getAllRequestOrders();

        assertEquals(1, result.size());
    }

    @Test
    public void getAllRequestOrders_empty_shouldReturnEmpty() {
        when(requestOrderRepository.findAll()).thenReturn(List.of());

        List<RequestOrder> result = requestOrderService.getAllRequestOrders();

        assertTrue(result.isEmpty());
    }

    // ==================== findById ====================

    @Test
    public void findById_found_shouldReturn() {
        UUID id = UUID.randomUUID();
        RequestOrder ro = createRequestOrder(id);

        when(requestOrderRepository.findByIdForDetails(id)).thenReturn(Optional.of(ro));

        Optional<RequestOrder> result = requestOrderService.findById(id);

        assertTrue(result.isPresent());
        assertEquals(id, result.get().getId());
    }

    @Test
    public void findById_notFound_shouldReturnEmpty() {
        UUID id = UUID.randomUUID();
        when(requestOrderRepository.findByIdForDetails(id)).thenReturn(Optional.empty());

        Optional<RequestOrder> result = requestOrderService.findById(id);

        assertTrue(result.isEmpty());
    }

    // ==================== createRequest ====================

    @Test
    public void createRequest_draft_shouldCreateWithMinimalFields() {
        UUID warehouseId = UUID.randomUUID();

        Map<String, Object> data = new HashMap<>();
        data.put("title", "Test Draft");
        data.put("createdBy", "admin");
        data.put("status", "DRAFT");

        when(requestOrderRepository.save(any(RequestOrder.class))).thenAnswer(i -> {
            RequestOrder saved = i.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });

        RequestOrder result = requestOrderService.createRequest(data);

        assertNotNull(result);
        verify(requestOrderRepository).save(any(RequestOrder.class));
    }

    @Test
    public void createRequest_warehouseType_shouldCreateWithItems() {
        UUID warehouseId = UUID.randomUUID();
        UUID itemTypeId = UUID.randomUUID();

        Warehouse warehouse = new Warehouse();
        warehouse.setId(warehouseId);
        warehouse.setName("Main Warehouse");

        ItemType itemType = new ItemType();
        itemType.setId(itemTypeId);
        itemType.setName("Cement");

        Map<String, Object> itemData = new HashMap<>();
        itemData.put("itemTypeId", itemTypeId.toString());
        itemData.put("quantity", "10");
        itemData.put("comment", "Urgent");

        Map<String, Object> data = new HashMap<>();
        data.put("title", "Test Request");
        data.put("description", "Need supplies");
        data.put("createdBy", "admin");
        data.put("status", "PENDING");
        data.put("partyType", "WAREHOUSE");
        data.put("requesterId", warehouseId.toString());
        data.put("items", List.of(itemData));

        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.of(warehouse));
        when(itemTypeRepository.findById(itemTypeId)).thenReturn(Optional.of(itemType));
        when(requestOrderRepository.existsByTitleAndRequesterIdAndStatusPending(any(), any())).thenReturn(false);
        when(requestOrderRepository.save(any(RequestOrder.class))).thenAnswer(i -> {
            RequestOrder saved = i.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });

        RequestOrder result = requestOrderService.createRequest(data);

        assertNotNull(result);
        verify(warehouseRepository).findById(warehouseId);
        verify(itemTypeRepository).findById(itemTypeId);
    }

    @Test
    public void createRequest_missingStatus_shouldThrow() {
        Map<String, Object> data = new HashMap<>();
        data.put("title", "Test");

        assertThrows(RuntimeException.class, () -> requestOrderService.createRequest(data));
    }

    @Test
    public void createRequest_missingTitle_forDraft_shouldThrow() {
        Map<String, Object> data = new HashMap<>();
        data.put("status", "DRAFT");
        data.put("createdBy", "admin");

        assertThrows(RuntimeException.class, () -> requestOrderService.createRequest(data));
    }

    @Test
    public void createRequest_missingRequiredFields_forNonDraft_shouldThrow() {
        Map<String, Object> data = new HashMap<>();
        data.put("title", "Test");
        data.put("status", "PENDING");
        // Missing description, createdBy, partyType, requesterId

        assertThrows(RuntimeException.class, () -> requestOrderService.createRequest(data));
    }

    @Test
    public void createRequest_duplicateTitle_shouldThrow() {
        UUID warehouseId = UUID.randomUUID();

        Warehouse warehouse = new Warehouse();
        warehouse.setId(warehouseId);
        warehouse.setName("Main Warehouse");

        Map<String, Object> data = new HashMap<>();
        data.put("title", "Duplicate Title");
        data.put("description", "Test");
        data.put("createdBy", "admin");
        data.put("status", "PENDING");
        data.put("partyType", "WAREHOUSE");
        data.put("requesterId", warehouseId.toString());
        data.put("items", List.of(Map.of("itemTypeId", UUID.randomUUID().toString(), "quantity", "5")));

        when(requestOrderRepository.existsByTitleAndRequesterIdAndStatusPending("Duplicate Title", warehouseId))
                .thenReturn(true);

        assertThrows(RuntimeException.class, () -> requestOrderService.createRequest(data));
    }

    @Test
    public void createRequest_invalidRequesterId_shouldThrow() {
        Map<String, Object> data = new HashMap<>();
        data.put("title", "Test");
        data.put("description", "Test");
        data.put("createdBy", "admin");
        data.put("status", "PENDING");
        data.put("partyType", "WAREHOUSE");
        data.put("requesterId", "not-a-uuid");

        assertThrows(RuntimeException.class, () -> requestOrderService.createRequest(data));
    }

    @Test
    public void createRequest_invalidPartyType_shouldThrow() {
        Map<String, Object> data = new HashMap<>();
        data.put("title", "Test");
        data.put("description", "Test");
        data.put("createdBy", "admin");
        data.put("status", "PENDING");
        data.put("partyType", "INVALID_TYPE");
        data.put("requesterId", UUID.randomUUID().toString());

        assertThrows(RuntimeException.class, () -> requestOrderService.createRequest(data));
    }

    @Test
    public void createRequest_zeroQuantity_shouldThrow() {
        UUID warehouseId = UUID.randomUUID();

        Warehouse warehouse = new Warehouse();
        warehouse.setId(warehouseId);
        warehouse.setName("Main Warehouse");

        Map<String, Object> itemData = new HashMap<>();
        itemData.put("itemTypeId", UUID.randomUUID().toString());
        itemData.put("quantity", "0");

        Map<String, Object> data = new HashMap<>();
        data.put("title", "Test");
        data.put("description", "Test");
        data.put("createdBy", "admin");
        data.put("status", "PENDING");
        data.put("partyType", "WAREHOUSE");
        data.put("requesterId", warehouseId.toString());
        data.put("items", List.of(itemData));

        when(requestOrderRepository.existsByTitleAndRequesterIdAndStatusPending(any(), any())).thenReturn(false);
        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.of(warehouse));

        assertThrows(RuntimeException.class, () -> requestOrderService.createRequest(data));
    }

    // ==================== updateRequest ====================

    @Test
    public void updateRequest_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        Map<String, Object> data = new HashMap<>();
        data.put("status", "PENDING");

        when(requestOrderRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> requestOrderService.updateRequest(id, data));
    }

    @Test
    public void updateRequest_success_shouldUpdate() {
        UUID id = UUID.randomUUID();
        RequestOrder existing = createRequestOrder(id);

        Map<String, Object> data = new HashMap<>();
        data.put("title", "Updated Title");
        data.put("status", "DRAFT");

        when(requestOrderRepository.findById(id)).thenReturn(Optional.of(existing));
        when(requestOrderRepository.save(any(RequestOrder.class))).thenAnswer(i -> i.getArgument(0));

        RequestOrder result = requestOrderService.updateRequest(id, data);

        assertEquals("Updated Title", result.getTitle());
    }

    // ==================== updateStatus ====================

    @Test
    public void updateStatus_success_shouldUpdateStatus() {
        UUID id = UUID.randomUUID();
        RequestOrder ro = createRequestOrder(id);
        ro.setPartyType(null); // Avoid notification logic

        when(requestOrderRepository.findById(id)).thenReturn(Optional.of(ro));
        when(requestOrderRepository.save(any(RequestOrder.class))).thenAnswer(i -> i.getArgument(0));

        RequestOrder result = requestOrderService.updateStatus(id, "APPROVED");

        assertEquals("APPROVED", result.getStatus());
        assertNotNull(result.getApprovedAt());
    }

    @Test
    public void updateStatus_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(requestOrderRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> requestOrderService.updateStatus(id, "APPROVED"));
    }

    // ==================== getRequestsByWarehouseAndStatus ====================

    @Test
    public void getRequestsByWarehouseAndStatus_shouldReturnFiltered() {
        UUID warehouseId = UUID.randomUUID();
        RequestOrder ro = createRequestOrder(UUID.randomUUID());

        when(requestOrderRepository.findByRequesterIdAndStatusAndPartyType(
                warehouseId, "PENDING", "WAREHOUSE"))
                .thenReturn(List.of(ro));

        List<RequestOrder> result = requestOrderService.getRequestsByWarehouseAndStatus(warehouseId, "PENDING");

        assertEquals(1, result.size());
    }

    @Test
    public void getRequestsByWarehouseAndStatus_invalidStatus_shouldThrow() {
        UUID warehouseId = UUID.randomUUID();

        assertThrows(RuntimeException.class,
                () -> requestOrderService.getRequestsByWarehouseAndStatus(warehouseId, "INVALID_STATUS"));
    }

    // ==================== deleteRequest ====================

    @Test
    public void deleteRequest_draftOrder_shouldDelete() {
        UUID id = UUID.randomUUID();
        RequestOrder ro = createRequestOrder(id);
        ro.setStatus("DRAFT");

        when(requestOrderRepository.findById(id)).thenReturn(Optional.of(ro));

        requestOrderService.deleteRequest(id);

        verify(requestOrderRepository).delete(ro);
    }

    @Test
    public void deleteRequest_nonDraftOrder_shouldThrow() {
        UUID id = UUID.randomUUID();
        RequestOrder ro = createRequestOrder(id);
        ro.setStatus("PENDING");

        when(requestOrderRepository.findById(id)).thenReturn(Optional.of(ro));

        assertThrows(RuntimeException.class, () -> requestOrderService.deleteRequest(id));
    }

    @Test
    public void deleteRequest_notFound_shouldThrow() {
        UUID id = UUID.randomUUID();
        when(requestOrderRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> requestOrderService.deleteRequest(id));
    }

    // ==================== getRestockValidationInfo ====================

    @Test
    public void getRestockValidationInfo_noRecentRequests_shouldReturnNoWarnings() {
        UUID warehouseId = UUID.randomUUID();
        UUID itemTypeId = UUID.randomUUID();

        when(requestOrderRepository.findByWarehouseAndItemTypeAndStatusInAndCreatedAtAfter(
                eq(warehouseId), eq(itemTypeId), any(), any()))
                .thenReturn(List.of());

        Map<String, Object> result = requestOrderService.getRestockValidationInfo(
                warehouseId, List.of(itemTypeId));

        assertNotNull(result);
        Map<String, Object> validations = (Map<String, Object>) result.get("validations");
        Map<String, Object> itemInfo = (Map<String, Object>) validations.get(itemTypeId.toString());
        assertFalse((Boolean) itemInfo.get("hasRecentRequest"));
    }

    @Test
    public void getRestockValidationInfo_withRecentRequest_shouldReturnWarning() {
        UUID warehouseId = UUID.randomUUID();
        UUID itemTypeId = UUID.randomUUID();

        RequestOrder recentRo = createRequestOrder(UUID.randomUUID());
        recentRo.setCreatedAt(LocalDateTime.now().minusHours(1));

        when(requestOrderRepository.findByWarehouseAndItemTypeAndStatusInAndCreatedAtAfter(
                eq(warehouseId), eq(itemTypeId), any(), any()))
                .thenReturn(List.of(recentRo));

        Map<String, Object> result = requestOrderService.getRestockValidationInfo(
                warehouseId, List.of(itemTypeId));

        assertNotNull(result);
        Map<String, Object> validations = (Map<String, Object>) result.get("validations");
        Map<String, Object> itemInfo = (Map<String, Object>) validations.get(itemTypeId.toString());
        assertTrue((Boolean) itemInfo.get("hasRecentRequest"));
    }

    // ==================== Helpers ====================

    private RequestOrder createRequestOrder(UUID id) {
        RequestOrder ro = new RequestOrder();
        ro.setId(id);
        ro.setTitle("Test Request Order");
        ro.setDescription("Test description");
        ro.setStatus("PENDING");
        ro.setCreatedAt(LocalDateTime.now());
        ro.setCreatedBy("admin");
        ro.setRequestItems(new ArrayList<>());
        return ro;
    }
}