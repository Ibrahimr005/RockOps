package com.example.backend.services;

import com.example.backend.models.equipment.*;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrder;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderItem;
import com.example.backend.models.procurement.RequestOrder.RequestOrder;
import com.example.backend.models.user.Role;
import com.example.backend.repositories.equipment.EquipmentBrandRepository;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.repositories.equipment.EquipmentTypeRepository;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.MaintenanceRecordRepository;
import com.example.backend.repositories.equipment.SarkyLogRepository;
import com.example.backend.repositories.merchant.MerchantRepository;
import com.example.backend.repositories.site.SiteRepository;
import com.example.backend.models.procurement.EquipmentPurchaseSpec;
import com.example.backend.services.equipment.EquipmentService;
import com.example.backend.services.MinioService;
import com.example.backend.services.notification.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.time.Year;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Integration test suite for Equipment Purchasing flow.
 *
 * Tests the end-to-end flow: PO Completion → Equipment Auto-Creation,
 * including idempotency, retry mechanism, error handling, and field mapping.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Equipment Purchase Integration Tests")
public class EquipmentPurchaseIntegrationTest {

    // ── EquipmentService dependencies ──
    @Mock
    private EquipmentRepository equipmentRepository;
    @Mock
    private EquipmentTypeRepository equipmentTypeRepository;
    @Mock
    private SiteRepository siteRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private MinioService minioService;
    @Mock
    private EquipmentBrandRepository equipmentBrandRepository;
    @Mock
    private MerchantRepository merchantRepository;
    @Mock
    private SarkyLogRepository sarkyLogRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private MaintenanceRecordRepository maintenanceRecordRepository;

    @InjectMocks
    private EquipmentService equipmentService;

    // ── Common test data ──
    private PurchaseOrder mockPO;
    private RequestOrder mockRequestOrder;
    private EquipmentPurchaseSpec mockSpec;
    private Merchant mockMerchant;
    private EquipmentType mockEquipmentType;
    private EquipmentBrand mockEquipmentBrand;

    @BeforeEach
    void setUp() {
        mockMerchant = createMockMerchant();
        mockEquipmentType = createMockEquipmentType("Excavator");
        mockEquipmentBrand = createMockEquipmentBrand("Caterpillar");
        mockSpec = createMockEquipmentPurchaseSpec();
        mockRequestOrder = createMockRequestOrder("EQUIPMENT");
        mockPO = createMockPurchaseOrder(mockRequestOrder, mockSpec, mockMerchant);

        // Default: type/brand lookups succeed
        when(equipmentTypeRepository.findByName("Excavator")).thenReturn(Optional.of(mockEquipmentType));
        when(equipmentBrandRepository.findByName("Caterpillar")).thenReturn(Optional.of(mockEquipmentBrand));
    }

    // ==================== NESTED TEST CLASSES ====================

    @Nested
    @DisplayName("Happy Path — Equipment Auto-Creation from PO")
    class HappyPathTests {

        @Test
        @DisplayName("Should create equipment when PO with equipment spec completes")
        void shouldCreateEquipmentFromCompletedPO() {
            // Given
            when(equipmentRepository.existsByPurchaseOrderId(mockPO.getId())).thenReturn(false);
            when(equipmentRepository.save(any(Equipment.class)))
                    .thenAnswer(invocation -> {
                        Equipment eq = invocation.getArgument(0);
                        eq.setId(UUID.randomUUID());
                        return eq;
                    });

            // When
            List<Equipment> result = equipmentService.createFromPurchaseOrder(mockPO);

            // Then
            assertNotNull(result);
            assertEquals(1, result.size());

            Equipment created = result.get(0);
            assertEquals(mockEquipmentType, created.getType());
            assertEquals(mockSpec.getName(), created.getName());
            assertEquals(mockSpec.getModel(), created.getModel());
            assertEquals(mockEquipmentBrand, created.getBrand());
            assertEquals(EquipmentStatus.AVAILABLE, created.getStatus());
            assertEquals(mockPO.getId(), created.getPurchaseOrderId());
            assertNotNull(created.getSerialNumber());
            assertTrue(created.getSerialNumber().startsWith("EQ-PO-"));

            verify(equipmentRepository, times(1)).save(any(Equipment.class));
        }

        @Test
        @DisplayName("Should map all spec fields correctly to equipment entity")
        void shouldMapAllFieldsCorrectly() {
            // Given
            when(equipmentRepository.existsByPurchaseOrderId(mockPO.getId())).thenReturn(false);
            ArgumentCaptor<Equipment> captor = ArgumentCaptor.forClass(Equipment.class);
            when(equipmentRepository.save(captor.capture()))
                    .thenAnswer(invocation -> {
                        Equipment eq = invocation.getArgument(0);
                        eq.setId(UUID.randomUUID());
                        return eq;
                    });

            // When
            equipmentService.createFromPurchaseOrder(mockPO);

            // Then
            Equipment captured = captor.getValue();

            // Fields from EquipmentPurchaseSpec → resolved entities
            assertEquals(mockEquipmentType, captured.getType());
            assertEquals("CAT 320", captured.getName());
            assertEquals("320GC", captured.getModel());
            assertEquals(mockEquipmentBrand, captured.getBrand());
            assertEquals(Year.of(2024), captured.getManufactureYear());
            assertEquals("Japan", captured.getCountryOfOrigin());

            // Fields from PO item data
            assertEquals(250000.0, captured.getEgpPrice(), 0.01);
            assertEquals(0, captured.getDollarPrice());
            assertEquals(LocalDate.now(), captured.getPurchasedDate());
            assertEquals(LocalDate.now(), captured.getDeliveredDate());

            // Default fields
            assertEquals(EquipmentStatus.AVAILABLE, captured.getStatus());
            assertEquals(0, captured.getWorkedHours());
            assertEquals(0, captured.getShipping(), 0.01);
            assertEquals(0, captured.getCustoms(), 0.01);
            assertEquals(0, captured.getTaxes(), 0.01);

            // Traceability
            assertEquals(mockPO.getId(), captured.getPurchaseOrderId());
            assertNotNull(captured.getSerialNumber());

            // Merchant link
            assertEquals(mockMerchant, captured.getPurchasedFrom());
        }

        @Test
        @DisplayName("Should create multiple equipment for PO with multiple spec items")
        void shouldCreateMultipleEquipmentForMultipleSpecItems() {
            // Given — PO with 3 equipment items
            EquipmentType loaderType = createMockEquipmentType("Loader");
            EquipmentType craneType = createMockEquipmentType("Crane");
            EquipmentBrand volvoBrand = createMockEquipmentBrand("Volvo");
            EquipmentBrand liebherrBrand = createMockEquipmentBrand("Liebherr");

            when(equipmentTypeRepository.findByName("Loader")).thenReturn(Optional.of(loaderType));
            when(equipmentTypeRepository.findByName("Crane")).thenReturn(Optional.of(craneType));
            when(equipmentBrandRepository.findByName("Volvo")).thenReturn(Optional.of(volvoBrand));
            when(equipmentBrandRepository.findByName("Liebherr")).thenReturn(Optional.of(liebherrBrand));

            EquipmentPurchaseSpec spec2 = createSpecWithValues("Loader", "Volvo L120H", "L120H", "Volvo", 2023,
                    "Sweden");
            EquipmentPurchaseSpec spec3 = createSpecWithValues("Crane", "Liebherr LTM", "LTM 1100", "Liebherr", 2024,
                    "Germany");

            PurchaseOrderItem item2 = createMockPurchaseOrderItem(spec2, null, 180000.0);
            PurchaseOrderItem item3 = createMockPurchaseOrderItem(spec3, mockMerchant, 500000.0);

            mockPO.getPurchaseOrderItems().add(item2);
            mockPO.getPurchaseOrderItems().add(item3);

            when(equipmentRepository.existsByPurchaseOrderId(mockPO.getId())).thenReturn(false);
            when(equipmentRepository.save(any(Equipment.class)))
                    .thenAnswer(invocation -> {
                        Equipment eq = invocation.getArgument(0);
                        eq.setId(UUID.randomUUID());
                        return eq;
                    });

            // When
            List<Equipment> result = equipmentService.createFromPurchaseOrder(mockPO);

            // Then
            assertEquals(3, result.size());
            verify(equipmentRepository, times(3)).save(any(Equipment.class));
        }

        @Test
        @DisplayName("Should send notification to equipment managers after creation")
        void shouldSendNotificationAfterCreation() {
            // Given
            when(equipmentRepository.existsByPurchaseOrderId(mockPO.getId())).thenReturn(false);
            when(equipmentRepository.save(any(Equipment.class)))
                    .thenAnswer(invocation -> {
                        Equipment eq = invocation.getArgument(0);
                        eq.setId(UUID.randomUUID());
                        return eq;
                    });

            // When
            equipmentService.createFromPurchaseOrder(mockPO);

            // Then
            verify(notificationService, times(1)).sendNotificationToUsersByRoles(
                    argThat(roles -> roles.contains(Role.EQUIPMENT_MANAGER) && roles.contains(Role.ADMIN)),
                    contains("Equipment Auto-Created"),
                    contains("PO-2024-001"),
                    any(),
                    eq("/equipment"),
                    eq(mockPO.getId().toString())
            );
        }

        @Test
        @DisplayName("Should auto-create EquipmentType when it doesn't exist in DB")
        void shouldAutoCreateEquipmentTypeWhenNotFound() {
            // Given — type not found, should be auto-created
            EquipmentType newType = createMockEquipmentType("NewSpecialType");
            mockSpec.setEquipmentType(newType);

            when(equipmentTypeRepository.findByName("NewSpecialType")).thenReturn(Optional.empty());
            when(equipmentTypeRepository.save(any(EquipmentType.class))).thenReturn(newType);
            when(equipmentRepository.existsByPurchaseOrderId(mockPO.getId())).thenReturn(false);
            when(equipmentRepository.save(any(Equipment.class)))
                    .thenAnswer(invocation -> {
                        Equipment eq = invocation.getArgument(0);
                        eq.setId(UUID.randomUUID());
                        return eq;
                    });

            // When
            List<Equipment> result = equipmentService.createFromPurchaseOrder(mockPO);

            // Then
            assertEquals(1, result.size());
            verify(equipmentTypeRepository, times(1)).save(any(EquipmentType.class));
        }

        @Test
        @DisplayName("Should auto-create EquipmentBrand when it doesn't exist in DB")
        void shouldAutoCreateEquipmentBrandWhenNotFound() {
            // Given — brand not found, should be auto-created
            EquipmentBrand newBrand = createMockEquipmentBrand("NewBrand");
            mockSpec.setBrand(newBrand);

            when(equipmentBrandRepository.findByName("NewBrand")).thenReturn(Optional.empty());
            when(equipmentBrandRepository.save(any(EquipmentBrand.class))).thenReturn(newBrand);
            when(equipmentRepository.existsByPurchaseOrderId(mockPO.getId())).thenReturn(false);
            when(equipmentRepository.save(any(Equipment.class)))
                    .thenAnswer(invocation -> {
                        Equipment eq = invocation.getArgument(0);
                        eq.setId(UUID.randomUUID());
                        return eq;
                    });

            // When
            List<Equipment> result = equipmentService.createFromPurchaseOrder(mockPO);

            // Then
            assertEquals(1, result.size());
            verify(equipmentBrandRepository, times(1)).save(any(EquipmentBrand.class));
        }
    }

    @Nested
    @DisplayName("Idempotency Guard")
    class IdempotencyTests {

        @Test
        @DisplayName("Should skip creation if equipment already exists for PO")
        void shouldSkipCreationWhenEquipmentAlreadyExists() {
            // Given — equipment already created for this PO
            when(equipmentRepository.existsByPurchaseOrderId(mockPO.getId())).thenReturn(true);

            // When
            List<Equipment> result = equipmentService.createFromPurchaseOrder(mockPO);

            // Then
            assertTrue(result.isEmpty());
            verify(equipmentRepository, never()).save(any(Equipment.class));
            verify(notificationService, never()).sendNotificationToUsersByRoles(
                    anyList(), anyString(), anyString(), any(), anyString(), anyString());
        }

        @Test
        @DisplayName("Should return empty list on duplicate PO call")
        void shouldReturnEmptyListOnDuplicateCall() {
            // Given — first call succeeds
            when(equipmentRepository.existsByPurchaseOrderId(mockPO.getId()))
                    .thenReturn(false)    // first call
                    .thenReturn(true);    // second call

            when(equipmentRepository.save(any(Equipment.class)))
                    .thenAnswer(invocation -> {
                        Equipment eq = invocation.getArgument(0);
                        eq.setId(UUID.randomUUID());
                        return eq;
                    });

            // When — call twice
            List<Equipment> firstResult = equipmentService.createFromPurchaseOrder(mockPO);
            List<Equipment> secondResult = equipmentService.createFromPurchaseOrder(mockPO);

            // Then
            assertEquals(1, firstResult.size());
            assertTrue(secondResult.isEmpty());
            verify(equipmentRepository, times(1)).save(any(Equipment.class));
        }
    }

    @Nested
    @DisplayName("Edge Cases and Defaults")
    class EdgeCaseTests {

        @Test
        @DisplayName("Should skip PO items without equipment spec")
        void shouldSkipItemsWithoutSpec() {
            // Given — PO with one item that has no spec
            PurchaseOrderItem noSpecItem = new PurchaseOrderItem();
            noSpecItem.setId(UUID.randomUUID());
            noSpecItem.setEquipmentSpec(null);
            noSpecItem.setTotalPrice(10000.0);

            mockPO.getPurchaseOrderItems().clear();
            mockPO.getPurchaseOrderItems().add(noSpecItem);

            when(equipmentRepository.existsByPurchaseOrderId(mockPO.getId())).thenReturn(false);

            // When
            List<Equipment> result = equipmentService.createFromPurchaseOrder(mockPO);

            // Then
            assertTrue(result.isEmpty());
            verify(equipmentRepository, never()).save(any(Equipment.class));
        }

        @Test
        @DisplayName("Should use default model 'N/A' when spec model is null")
        void shouldUseDefaultModelWhenNull() {
            // Given
            mockSpec.setModel(null);
            when(equipmentRepository.existsByPurchaseOrderId(mockPO.getId())).thenReturn(false);
            ArgumentCaptor<Equipment> captor = ArgumentCaptor.forClass(Equipment.class);
            when(equipmentRepository.save(captor.capture()))
                    .thenAnswer(invocation -> {
                        Equipment eq = invocation.getArgument(0);
                        eq.setId(UUID.randomUUID());
                        return eq;
                    });

            // When
            equipmentService.createFromPurchaseOrder(mockPO);

            // Then
            assertEquals("N/A", captor.getValue().getModel());
        }

        @Test
        @DisplayName("Should use current year when manufacture year is null")
        void shouldUseCurrentYearWhenManufactureYearNull() {
            // Given
            mockSpec.setManufactureYear(null);
            when(equipmentRepository.existsByPurchaseOrderId(mockPO.getId())).thenReturn(false);
            ArgumentCaptor<Equipment> captor = ArgumentCaptor.forClass(Equipment.class);
            when(equipmentRepository.save(captor.capture()))
                    .thenAnswer(invocation -> {
                        Equipment eq = invocation.getArgument(0);
                        eq.setId(UUID.randomUUID());
                        return eq;
                    });

            // When
            equipmentService.createFromPurchaseOrder(mockPO);

            // Then
            assertEquals(Year.now(), captor.getValue().getManufactureYear());
        }

        @Test
        @DisplayName("Should use 'N/A' when country of origin is null")
        void shouldUseDefaultCountryWhenNull() {
            // Given
            mockSpec.setCountryOfOrigin(null);
            when(equipmentRepository.existsByPurchaseOrderId(mockPO.getId())).thenReturn(false);
            ArgumentCaptor<Equipment> captor = ArgumentCaptor.forClass(Equipment.class);
            when(equipmentRepository.save(captor.capture()))
                    .thenAnswer(invocation -> {
                        Equipment eq = invocation.getArgument(0);
                        eq.setId(UUID.randomUUID());
                        return eq;
                    });

            // When
            equipmentService.createFromPurchaseOrder(mockPO);

            // Then
            assertEquals("N/A", captor.getValue().getCountryOfOrigin());
        }

        @Test
        @DisplayName("Should handle PO item without merchant gracefully")
        void shouldHandleItemWithoutMerchant() {
            // Given — PO item has no merchant
            mockPO.getPurchaseOrderItems().get(0).setMerchant(null);
            when(equipmentRepository.existsByPurchaseOrderId(mockPO.getId())).thenReturn(false);
            ArgumentCaptor<Equipment> captor = ArgumentCaptor.forClass(Equipment.class);
            when(equipmentRepository.save(captor.capture()))
                    .thenAnswer(invocation -> {
                        Equipment eq = invocation.getArgument(0);
                        eq.setId(UUID.randomUUID());
                        return eq;
                    });

            // When
            List<Equipment> result = equipmentService.createFromPurchaseOrder(mockPO);

            // Then
            assertEquals(1, result.size());
            assertNull(captor.getValue().getPurchasedFrom());
        }

        @Test
        @DisplayName("Should store spec description as equipment complaints/notes")
        void shouldStoreSpecDescriptionAsNotes() {
            // Given
            mockSpec.setSpecifications("Heavy duty, 20-ton capacity, with GPS tracking");
            when(equipmentRepository.existsByPurchaseOrderId(mockPO.getId())).thenReturn(false);
            ArgumentCaptor<Equipment> captor = ArgumentCaptor.forClass(Equipment.class);
            when(equipmentRepository.save(captor.capture()))
                    .thenAnswer(invocation -> {
                        Equipment eq = invocation.getArgument(0);
                        eq.setId(UUID.randomUUID());
                        return eq;
                    });

            // When
            equipmentService.createFromPurchaseOrder(mockPO);

            // Then
            assertTrue(captor.getValue().getEquipmentComplaints()
                    .contains("Heavy duty, 20-ton capacity, with GPS tracking"));
        }

        @Test
        @DisplayName("Should handle empty PO items list")
        void shouldHandleEmptyPOItems() {
            // Given
            mockPO.getPurchaseOrderItems().clear();
            when(equipmentRepository.existsByPurchaseOrderId(mockPO.getId())).thenReturn(false);

            // When
            List<Equipment> result = equipmentService.createFromPurchaseOrder(mockPO);

            // Then
            assertTrue(result.isEmpty());
            verify(equipmentRepository, never()).save(any(Equipment.class));
            verify(notificationService, never()).sendNotificationToUsersByRoles(
                    anyList(), anyString(), anyString(), any(), anyString(), anyString());
        }
    }

    @Nested
    @DisplayName("Error Handling and Resilience")
    class ErrorHandlingTests {

        @Test
        @DisplayName("Should continue processing other items when one item fails to save")
        void shouldContinueWhenOneItemFails() {
            // Given — PO with 2 items, first save fails, second succeeds
            EquipmentType loaderType = createMockEquipmentType("Loader");
            EquipmentBrand volvoBrand = createMockEquipmentBrand("Volvo");
            when(equipmentTypeRepository.findByName("Loader")).thenReturn(Optional.of(loaderType));
            when(equipmentBrandRepository.findByName("Volvo")).thenReturn(Optional.of(volvoBrand));

            EquipmentPurchaseSpec spec2 = createSpecWithValues("Loader", "Volvo L120H", "L120H", "Volvo", 2023,
                    "Sweden");
            PurchaseOrderItem item2 = createMockPurchaseOrderItem(spec2, mockMerchant, 180000.0);
            mockPO.getPurchaseOrderItems().add(item2);

            when(equipmentRepository.existsByPurchaseOrderId(mockPO.getId())).thenReturn(false);
            when(equipmentRepository.save(any(Equipment.class)))
                    .thenThrow(new RuntimeException("DB constraint violation")) // first item fails
                    .thenAnswer(invocation -> { // second item succeeds
                        Equipment eq = invocation.getArgument(0);
                        eq.setId(UUID.randomUUID());
                        return eq;
                    });

            // When
            List<Equipment> result = equipmentService.createFromPurchaseOrder(mockPO);

            // Then — only second item succeeded
            assertEquals(1, result.size());
            verify(equipmentRepository, times(2)).save(any(Equipment.class));
        }

        @Test
        @DisplayName("Should not fail entire process when notification fails")
        void shouldNotFailWhenNotificationFails() {
            // Given
            when(equipmentRepository.existsByPurchaseOrderId(mockPO.getId())).thenReturn(false);
            when(equipmentRepository.save(any(Equipment.class)))
                    .thenAnswer(invocation -> {
                        Equipment eq = invocation.getArgument(0);
                        eq.setId(UUID.randomUUID());
                        return eq;
                    });
            doThrow(new RuntimeException("Notification service unavailable"))
                    .when(notificationService).sendNotificationToUsersByRoles(
                            anyList(), anyString(), anyString(), any(), anyString(), anyString());

            // When — should not throw
            List<Equipment> result = equipmentService.createFromPurchaseOrder(mockPO);

            // Then — equipment was still created despite notification failure
            assertEquals(1, result.size());
        }

        @Test
        @DisplayName("Should return empty list when all items fail")
        void shouldReturnEmptyListWhenAllItemsFail() {
            // Given
            when(equipmentRepository.existsByPurchaseOrderId(mockPO.getId())).thenReturn(false);
            when(equipmentRepository.save(any(Equipment.class)))
                    .thenThrow(new RuntimeException("DB connection lost"));

            // When
            List<Equipment> result = equipmentService.createFromPurchaseOrder(mockPO);

            // Then
            assertTrue(result.isEmpty());
            verify(notificationService, never()).sendNotificationToUsersByRoles(
                    anyList(), anyString(), anyString(), any(), anyString(), anyString());
        }
    }

    @Nested
    @DisplayName("Retry Mechanism")
    class RetryMechanismTests {

        @Test
        @DisplayName("Should allow retry after initial failure (idempotency guard off when no equipment exists)")
        void shouldAllowRetryAfterFailure() {
            // Given — first call: all saves fail; second call: saves succeed
            when(equipmentRepository.existsByPurchaseOrderId(mockPO.getId()))
                    .thenReturn(false)   // first call — no existing equipment
                    .thenReturn(false);  // second call (retry) — still no equipment since first failed

            when(equipmentRepository.save(any(Equipment.class)))
                    .thenThrow(new RuntimeException("Transient DB error"))   // first attempt
                    .thenAnswer(invocation -> {                                // retry attempt
                        Equipment eq = invocation.getArgument(0);
                        eq.setId(UUID.randomUUID());
                        return eq;
                    });

            // When — first attempt fails
            List<Equipment> firstResult = equipmentService.createFromPurchaseOrder(mockPO);
            // Retry — second attempt succeeds
            List<Equipment> retryResult = equipmentService.createFromPurchaseOrder(mockPO);

            // Then
            assertTrue(firstResult.isEmpty());
            assertEquals(1, retryResult.size());
        }
    }

    @Nested
    @DisplayName("Serial Number Generation")
    class SerialNumberTests {

        @Test
        @DisplayName("Should generate unique serial numbers for each equipment")
        void shouldGenerateUniqueSerialNumbers() {
            // Given — PO with 2 items
            EquipmentType loaderType = createMockEquipmentType("Loader");
            EquipmentBrand volvoBrand = createMockEquipmentBrand("Volvo");
            when(equipmentTypeRepository.findByName("Loader")).thenReturn(Optional.of(loaderType));
            when(equipmentBrandRepository.findByName("Volvo")).thenReturn(Optional.of(volvoBrand));

            EquipmentPurchaseSpec spec2 = createSpecWithValues("Loader", "Volvo L120H", "L120H", "Volvo", 2023,
                    "Sweden");
            PurchaseOrderItem item2 = createMockPurchaseOrderItem(spec2, mockMerchant, 180000.0);
            mockPO.getPurchaseOrderItems().add(item2);

            Set<String> capturedSerials = new HashSet<>();
            when(equipmentRepository.existsByPurchaseOrderId(mockPO.getId())).thenReturn(false);
            when(equipmentRepository.save(any(Equipment.class)))
                    .thenAnswer(invocation -> {
                        Equipment eq = invocation.getArgument(0);
                        eq.setId(UUID.randomUUID());
                        capturedSerials.add(eq.getSerialNumber());
                        return eq;
                    });

            // When
            equipmentService.createFromPurchaseOrder(mockPO);

            // Then
            assertEquals(2, capturedSerials.size(), "Each equipment should have a unique serial number");
        }

        @Test
        @DisplayName("Should generate serial number with correct format")
        void shouldGenerateSerialNumberWithCorrectFormat() {
            // Given
            when(equipmentRepository.existsByPurchaseOrderId(mockPO.getId())).thenReturn(false);
            ArgumentCaptor<Equipment> captor = ArgumentCaptor.forClass(Equipment.class);
            when(equipmentRepository.save(captor.capture()))
                    .thenAnswer(invocation -> {
                        Equipment eq = invocation.getArgument(0);
                        eq.setId(UUID.randomUUID());
                        return eq;
                    });

            // When
            equipmentService.createFromPurchaseOrder(mockPO);

            // Then
            String sn = captor.getValue().getSerialNumber();
            assertNotNull(sn);
            assertTrue(sn.startsWith("EQ-PO-"), "Serial should start with 'EQ-PO-'");
            assertEquals(14, sn.length(), "EQ-PO- (6 chars) + 8 hex chars = 14");
            // Verify the hex suffix is uppercase
            String hexPart = sn.substring(6);
            assertEquals(hexPart.toUpperCase(), hexPart, "Hex suffix should be uppercase");
        }
    }

    // ==================== HELPER METHODS ====================

    private PurchaseOrder createMockPurchaseOrder(RequestOrder ro, EquipmentPurchaseSpec spec, Merchant merchant) {
        PurchaseOrder po = new PurchaseOrder();
        po.setId(UUID.randomUUID());
        po.setPoNumber("PO-2024-001");
        po.setStatus("COMPLETED");
        po.setRequestOrder(ro);

        PurchaseOrderItem item = createMockPurchaseOrderItem(spec, merchant, 250000.0);
        item.setPurchaseOrder(po);
        po.setPurchaseOrderItems(new ArrayList<>(List.of(item)));

        return po;
    }

    private PurchaseOrderItem createMockPurchaseOrderItem(EquipmentPurchaseSpec spec, Merchant merchant,
            double totalPrice) {
        PurchaseOrderItem item = new PurchaseOrderItem();
        item.setId(UUID.randomUUID());
        item.setEquipmentSpec(spec);
        item.setMerchant(merchant);
        item.setTotalPrice(totalPrice);
        item.setQuantity(1);
        item.setUnitPrice(totalPrice);
        return item;
    }

    private RequestOrder createMockRequestOrder(String partyType) {
        RequestOrder ro = new RequestOrder();
        ro.setId(UUID.randomUUID());
        ro.setPartyType(partyType);
        return ro;
    }

    private EquipmentPurchaseSpec createMockEquipmentPurchaseSpec() {
        return createSpecWithValues("Excavator", "CAT 320", "320GC", "Caterpillar", 2024, "Japan");
    }

    private EquipmentPurchaseSpec createSpecWithValues(String type, String name, String model, String brand,
            Integer year, String country) {
        EquipmentPurchaseSpec spec = new EquipmentPurchaseSpec();
        spec.setId(UUID.randomUUID());
        spec.setEquipmentType(createMockEquipmentType(type));
        spec.setName(name);
        spec.setModel(model);
        spec.setBrand(createMockEquipmentBrand(brand));
        spec.setManufactureYear(year);
        spec.setCountryOfOrigin(country);
        spec.setSpecifications("Standard specifications");
        return spec;
    }

    private Merchant createMockMerchant() {
        Merchant merchant = new Merchant();
        merchant.setId(UUID.randomUUID());
        merchant.setName("Cairo Equipment Co.");
        return merchant;
    }

    private EquipmentType createMockEquipmentType(String name) {
        EquipmentType type = new EquipmentType();
        type.setId(UUID.randomUUID());
        type.setName(name);
        return type;
    }

    private EquipmentBrand createMockEquipmentBrand(String name) {
        EquipmentBrand brand = new EquipmentBrand();
        brand.setId(UUID.randomUUID());
        brand.setName(name);
        return brand;
    }
}
