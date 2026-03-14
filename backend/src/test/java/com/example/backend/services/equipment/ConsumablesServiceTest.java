package com.example.backend.services.equipment;

import com.example.backend.dto.equipment.ConsumableResolutionDTO;
import com.example.backend.models.equipment.Consumable;
import com.example.backend.models.equipment.ConsumableResolution;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.PartyType;
import com.example.backend.models.transaction.Transaction;
import com.example.backend.models.transaction.TransactionItem;
import com.example.backend.models.transaction.TransactionStatus;
import com.example.backend.models.warehouse.ItemStatus;
import com.example.backend.models.warehouse.ItemType;
import com.example.backend.models.warehouse.ResolutionType;
import com.example.backend.repositories.equipment.ConsumableRepository;
import com.example.backend.repositories.equipment.ConsumableResolutionRepository;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.repositories.transaction.TransactionRepository;
import com.example.backend.repositories.warehouse.ItemTypeRepository;
import com.example.backend.services.notification.NotificationService;
import com.example.backend.services.transaction.TransactionMapperService;
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
public class ConsumablesServiceTest {

    @Mock
    private ConsumableRepository consumableRepository;

    @Mock
    private ConsumableResolutionRepository consumableResolutionRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private TransactionMapperService transactionMapperService;

    @Mock
    private EquipmentRepository equipmentRepository;

    @Mock
    private ItemTypeRepository itemTypeRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private ConsumablesService consumablesService;

    // ==================== getConsumablesByEquipmentId ====================

    @Test
    public void getConsumablesByEquipmentId_shouldReturnList() {
        UUID equipmentId = UUID.randomUUID();
        Consumable c = createConsumable(equipmentId, ItemStatus.IN_WAREHOUSE, 10);

        when(consumableRepository.findByEquipmentId(equipmentId)).thenReturn(List.of(c));

        List<Consumable> result = consumablesService.getConsumablesByEquipmentId(equipmentId);

        assertEquals(1, result.size());
    }

    @Test
    public void getConsumablesByEquipmentId_empty_shouldReturnEmpty() {
        UUID equipmentId = UUID.randomUUID();
        when(consumableRepository.findByEquipmentId(equipmentId)).thenReturn(List.of());

        List<Consumable> result = consumablesService.getConsumablesByEquipmentId(equipmentId);

        assertTrue(result.isEmpty());
    }

    // ==================== getRegularConsumables ====================

    @Test
    public void getRegularConsumables_shouldFilterOutMissingAndOverreceived() {
        UUID equipmentId = UUID.randomUUID();
        Consumable regular = createConsumable(equipmentId, ItemStatus.IN_WAREHOUSE, 5);
        Consumable missing = createConsumable(equipmentId, ItemStatus.MISSING, 3);
        Consumable overreceived = createConsumable(equipmentId, ItemStatus.OVERRECEIVED, 2);

        when(consumableRepository.findByEquipmentId(equipmentId))
                .thenReturn(List.of(regular, missing, overreceived));

        List<Consumable> result = consumablesService.getRegularConsumables(equipmentId);

        assertEquals(1, result.size());
        assertEquals(ItemStatus.IN_WAREHOUSE, result.get(0).getStatus());
    }

    // ==================== getConsumablesByEquipmentIdAndStatus ====================

    @Test
    public void getConsumablesByEquipmentIdAndStatus_shouldReturnMatching() {
        UUID equipmentId = UUID.randomUUID();
        Consumable c = createConsumable(equipmentId, ItemStatus.MISSING, 5);

        when(consumableRepository.findByEquipmentIdAndStatus(equipmentId, ItemStatus.MISSING)).thenReturn(List.of(c));

        List<Consumable> result = consumablesService.getConsumablesByEquipmentIdAndStatus(equipmentId, ItemStatus.MISSING);

        assertEquals(1, result.size());
        assertEquals(ItemStatus.MISSING, result.get(0).getStatus());
    }

    // ==================== getDiscrepancyConsumables ====================

    @Test
    public void getDiscrepancyConsumables_shouldReturnUnresolvedOnly() {
        UUID equipmentId = UUID.randomUUID();
        Consumable unresolved = createConsumable(equipmentId, ItemStatus.MISSING, 3);
        unresolved.setResolved(false);

        when(consumableRepository.findByEquipmentIdAndStatusInAndResolvedFalse(
                equipmentId, List.of(ItemStatus.MISSING, ItemStatus.OVERRECEIVED)))
                .thenReturn(List.of(unresolved));

        List<Consumable> result = consumablesService.getDiscrepancyConsumables(equipmentId);

        assertEquals(1, result.size());
    }

    // ==================== getResolvedConsumables ====================

    @Test
    public void getResolvedConsumables_shouldReturnResolved() {
        UUID equipmentId = UUID.randomUUID();
        Consumable resolved = createConsumable(equipmentId, ItemStatus.MISSING, 3);
        resolved.setResolved(true);

        when(consumableRepository.findByEquipmentIdAndResolvedTrue(equipmentId)).thenReturn(List.of(resolved));

        List<Consumable> result = consumablesService.getResolvedConsumables(equipmentId);

        assertEquals(1, result.size());
    }

    // ==================== resolveDiscrepancy ====================

    @Test
    public void resolveDiscrepancy_acknowledgeLoss_shouldResolve() {
        UUID consumableId = UUID.randomUUID();
        UUID equipmentId = UUID.randomUUID();

        Equipment equipment = new Equipment();
        equipment.setId(equipmentId);
        equipment.setName("Truck");

        ItemType itemType = new ItemType();
        itemType.setId(UUID.randomUUID());
        itemType.setName("Oil Filter");

        Consumable consumable = new Consumable();
        consumable.setId(consumableId);
        consumable.setStatus(ItemStatus.MISSING);
        consumable.setQuantity(5);
        consumable.setResolved(false);
        consumable.setEquipment(equipment);
        consumable.setItemType(itemType);

        ConsumableResolutionDTO request = new ConsumableResolutionDTO();
        request.setConsumableId(consumableId);
        request.setResolutionType(ResolutionType.ACKNOWLEDGE_LOSS);
        request.setNotes("Acknowledged");
        request.setResolvedBy("admin");

        when(consumableRepository.findById(consumableId)).thenReturn(Optional.of(consumable));
        when(consumableRepository.save(any(Consumable.class))).thenAnswer(i -> i.getArgument(0));
        when(consumableResolutionRepository.save(any(ConsumableResolution.class))).thenAnswer(i -> {
            ConsumableResolution cr = i.getArgument(0);
            cr.setId(UUID.randomUUID());
            return cr;
        });
        when(transactionRepository.findByReceiverIdAndReceiverType(equipmentId, PartyType.EQUIPMENT))
                .thenReturn(List.of());
        when(consumableRepository.findByEquipmentIdAndResolvedTrue(equipmentId)).thenReturn(List.of());

        ConsumableResolution result = consumablesService.resolveDiscrepancy(request);

        assertNotNull(result);
        assertTrue(consumable.isResolved());
        assertEquals(ResolutionType.ACKNOWLEDGE_LOSS, result.getResolutionType());
    }

    @Test
    public void resolveDiscrepancy_acceptSurplus_shouldResolve() {
        UUID consumableId = UUID.randomUUID();
        UUID equipmentId = UUID.randomUUID();

        Equipment equipment = new Equipment();
        equipment.setId(equipmentId);
        equipment.setName("Truck");

        ItemType itemType = new ItemType();
        itemType.setId(UUID.randomUUID());
        itemType.setName("Brake Pad");

        Consumable consumable = new Consumable();
        consumable.setId(consumableId);
        consumable.setStatus(ItemStatus.OVERRECEIVED);
        consumable.setQuantity(2);
        consumable.setResolved(false);
        consumable.setEquipment(equipment);
        consumable.setItemType(itemType);

        ConsumableResolutionDTO request = new ConsumableResolutionDTO();
        request.setConsumableId(consumableId);
        request.setResolutionType(ResolutionType.ACCEPT_SURPLUS);
        request.setNotes("Accepted surplus");
        request.setResolvedBy("admin");

        when(consumableRepository.findById(consumableId)).thenReturn(Optional.of(consumable));
        when(consumableRepository.save(any(Consumable.class))).thenAnswer(i -> i.getArgument(0));
        when(consumableResolutionRepository.save(any(ConsumableResolution.class))).thenAnswer(i -> {
            ConsumableResolution cr = i.getArgument(0);
            cr.setId(UUID.randomUUID());
            return cr;
        });
        when(transactionRepository.findByReceiverIdAndReceiverType(equipmentId, PartyType.EQUIPMENT))
                .thenReturn(List.of());
        when(consumableRepository.findByEquipmentIdAndResolvedTrue(equipmentId)).thenReturn(List.of());

        ConsumableResolution result = consumablesService.resolveDiscrepancy(request);

        assertTrue(consumable.isResolved());
        assertEquals(ResolutionType.ACCEPT_SURPLUS, result.getResolutionType());
    }

    @Test
    public void resolveDiscrepancy_returnToSender_shouldMarkPending() {
        UUID consumableId = UUID.randomUUID();
        UUID equipmentId = UUID.randomUUID();

        Equipment equipment = new Equipment();
        equipment.setId(equipmentId);
        equipment.setName("Truck");

        ItemType itemType = new ItemType();
        itemType.setId(UUID.randomUUID());
        itemType.setName("Filter");

        Consumable consumable = new Consumable();
        consumable.setId(consumableId);
        consumable.setStatus(ItemStatus.OVERRECEIVED);
        consumable.setQuantity(3);
        consumable.setResolved(false);
        consumable.setEquipment(equipment);
        consumable.setItemType(itemType);

        ConsumableResolutionDTO request = new ConsumableResolutionDTO();
        request.setConsumableId(consumableId);
        request.setResolutionType(ResolutionType.RETURN_TO_SENDER);
        request.setNotes("Return");
        request.setResolvedBy("admin");

        when(consumableRepository.findById(consumableId)).thenReturn(Optional.of(consumable));
        when(consumableRepository.save(any(Consumable.class))).thenAnswer(i -> i.getArgument(0));
        when(consumableResolutionRepository.save(any(ConsumableResolution.class))).thenAnswer(i -> {
            ConsumableResolution cr = i.getArgument(0);
            cr.setId(UUID.randomUUID());
            return cr;
        });
        when(transactionRepository.findByReceiverIdAndReceiverType(equipmentId, PartyType.EQUIPMENT))
                .thenReturn(List.of());
        when(consumableRepository.findByEquipmentIdAndResolvedTrue(equipmentId)).thenReturn(List.of());

        ConsumableResolution result = consumablesService.resolveDiscrepancy(request);

        assertEquals(ItemStatus.PENDING, consumable.getStatus());
        assertTrue(consumable.isResolved());
    }

    @Test
    public void resolveDiscrepancy_noDiscrepancyStatus_shouldThrow() {
        UUID consumableId = UUID.randomUUID();

        Consumable consumable = new Consumable();
        consumable.setId(consumableId);
        consumable.setStatus(ItemStatus.IN_WAREHOUSE);

        ConsumableResolutionDTO request = new ConsumableResolutionDTO();
        request.setConsumableId(consumableId);
        request.setResolutionType(ResolutionType.ACKNOWLEDGE_LOSS);

        when(consumableRepository.findById(consumableId)).thenReturn(Optional.of(consumable));

        assertThrows(IllegalArgumentException.class,
                () -> consumablesService.resolveDiscrepancy(request));
    }

    @Test
    public void resolveDiscrepancy_consumableNotFound_shouldThrow() {
        UUID consumableId = UUID.randomUUID();

        ConsumableResolutionDTO request = new ConsumableResolutionDTO();
        request.setConsumableId(consumableId);

        when(consumableRepository.findById(consumableId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> consumablesService.resolveDiscrepancy(request));
    }

    // ==================== getConsumableResolutionHistory ====================

    @Test
    public void getConsumableResolutionHistory_shouldReturnList() {
        UUID consumableId = UUID.randomUUID();
        ConsumableResolution cr = ConsumableResolution.builder()
                .resolutionType(ResolutionType.ACKNOWLEDGE_LOSS)
                .build();
        cr.setId(UUID.randomUUID());

        when(consumableResolutionRepository.findByConsumableId(consumableId)).thenReturn(List.of(cr));

        List<ConsumableResolution> result = consumablesService.getConsumableResolutionHistory(consumableId);

        assertEquals(1, result.size());
    }

    // ==================== getEquipmentResolutionHistory ====================

    @Test
    public void getEquipmentResolutionHistory_shouldReturnList() {
        UUID equipmentId = UUID.randomUUID();
        ConsumableResolution cr = ConsumableResolution.builder()
                .resolutionType(ResolutionType.ACCEPT_SURPLUS)
                .build();

        when(consumableResolutionRepository.findByConsumableEquipmentIdOrderByResolvedAtDesc(equipmentId))
                .thenReturn(List.of(cr));

        List<ConsumableResolution> result = consumablesService.getEquipmentResolutionHistory(equipmentId);

        assertEquals(1, result.size());
    }

    // ==================== addTransactionToConsumable ====================

    @Test
    public void addTransactionToConsumable_success_shouldAdd() {
        UUID consumableId = UUID.randomUUID();
        UUID transactionId = UUID.randomUUID();

        Consumable consumable = new Consumable();
        consumable.setId(consumableId);
        consumable.setTransactions(new ArrayList<>());

        Transaction transaction = new Transaction();
        transaction.setId(transactionId);

        when(consumableRepository.findById(consumableId)).thenReturn(Optional.of(consumable));
        when(transactionRepository.findById(transactionId)).thenReturn(Optional.of(transaction));
        when(consumableRepository.save(any(Consumable.class))).thenAnswer(i -> i.getArgument(0));

        consumablesService.addTransactionToConsumable(consumableId, transactionId);

        assertTrue(consumable.getTransactions().contains(transaction));
        verify(consumableRepository).save(consumable);
    }

    @Test
    public void addTransactionToConsumable_consumableNotFound_shouldThrow() {
        UUID consumableId = UUID.randomUUID();
        when(consumableRepository.findById(consumableId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> consumablesService.addTransactionToConsumable(consumableId, UUID.randomUUID()));
    }

    @Test
    public void addTransactionToConsumable_transactionNotFound_shouldThrow() {
        UUID consumableId = UUID.randomUUID();
        UUID transactionId = UUID.randomUUID();

        Consumable consumable = new Consumable();
        consumable.setId(consumableId);

        when(consumableRepository.findById(consumableId)).thenReturn(Optional.of(consumable));
        when(transactionRepository.findById(transactionId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> consumablesService.addTransactionToConsumable(consumableId, transactionId));
    }

    // ==================== findOrCreateConsumable ====================

    @Test
    public void findOrCreateConsumable_existing_shouldReturn() {
        UUID equipmentId = UUID.randomUUID();
        UUID itemTypeId = UUID.randomUUID();

        Consumable existing = new Consumable();
        existing.setId(UUID.randomUUID());

        when(consumableRepository.findByEquipmentIdAndItemTypeId(equipmentId, itemTypeId)).thenReturn(existing);

        Consumable result = consumablesService.findOrCreateConsumable(equipmentId, itemTypeId);

        assertEquals(existing.getId(), result.getId());
        verify(consumableRepository, never()).save(any());
    }

    @Test
    public void findOrCreateConsumable_notExisting_shouldCreate() {
        UUID equipmentId = UUID.randomUUID();
        UUID itemTypeId = UUID.randomUUID();

        Equipment equipment = new Equipment();
        equipment.setId(equipmentId);

        ItemType itemType = new ItemType();
        itemType.setId(itemTypeId);

        when(consumableRepository.findByEquipmentIdAndItemTypeId(equipmentId, itemTypeId)).thenReturn(null);
        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.of(equipment));
        when(itemTypeRepository.findById(itemTypeId)).thenReturn(Optional.of(itemType));
        when(consumableRepository.save(any(Consumable.class))).thenAnswer(i -> {
            Consumable c = i.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        Consumable result = consumablesService.findOrCreateConsumable(equipmentId, itemTypeId);

        assertNotNull(result.getId());
        assertEquals(0, result.getQuantity());
        assertEquals(ItemStatus.IN_WAREHOUSE, result.getStatus());
    }

    @Test
    public void findOrCreateConsumable_equipmentNotFound_shouldThrow() {
        UUID equipmentId = UUID.randomUUID();
        UUID itemTypeId = UUID.randomUUID();

        when(consumableRepository.findByEquipmentIdAndItemTypeId(equipmentId, itemTypeId)).thenReturn(null);
        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> consumablesService.findOrCreateConsumable(equipmentId, itemTypeId));
    }

    // ==================== updateConsumableWithTransaction ====================

    @Test
    public void updateConsumableWithTransaction_existing_shouldUpdateQuantity() {
        UUID equipmentId = UUID.randomUUID();
        UUID itemTypeId = UUID.randomUUID();

        ItemType itemType = new ItemType();
        itemType.setId(itemTypeId);
        itemType.setName("Filter");

        Consumable existing = new Consumable();
        existing.setId(UUID.randomUUID());
        existing.setQuantity(10);
        existing.setItemType(itemType);
        existing.setTransactions(new ArrayList<>());

        Transaction transaction = new Transaction();
        transaction.setId(UUID.randomUUID());

        when(consumableRepository.findByEquipmentIdAndItemTypeId(equipmentId, itemTypeId)).thenReturn(existing);
        when(consumableRepository.save(any(Consumable.class))).thenAnswer(i -> i.getArgument(0));

        consumablesService.updateConsumableWithTransaction(equipmentId, itemTypeId, 5, transaction, ItemStatus.IN_WAREHOUSE);

        assertEquals(15, existing.getQuantity());
        assertTrue(existing.getTransactions().contains(transaction));
    }

    @Test
    public void updateConsumableWithTransaction_notExisting_shouldCreate() {
        UUID equipmentId = UUID.randomUUID();
        UUID itemTypeId = UUID.randomUUID();

        Equipment equipment = new Equipment();
        equipment.setId(equipmentId);

        ItemType itemType = new ItemType();
        itemType.setId(itemTypeId);
        itemType.setName("Filter");

        Transaction transaction = new Transaction();
        transaction.setId(UUID.randomUUID());

        when(consumableRepository.findByEquipmentIdAndItemTypeId(equipmentId, itemTypeId)).thenReturn(null);
        when(equipmentRepository.findById(equipmentId)).thenReturn(Optional.of(equipment));
        when(itemTypeRepository.findById(itemTypeId)).thenReturn(Optional.of(itemType));
        when(consumableRepository.save(any(Consumable.class))).thenAnswer(i -> i.getArgument(0));

        consumablesService.updateConsumableWithTransaction(equipmentId, itemTypeId, 5, transaction, ItemStatus.IN_WAREHOUSE);

        verify(consumableRepository).save(any(Consumable.class));
    }

    // ==================== Helper ====================

    private Consumable createConsumable(UUID equipmentId, ItemStatus status, int quantity) {
        Equipment equipment = new Equipment();
        equipment.setId(equipmentId);
        equipment.setName("Test Equipment");

        ItemType itemType = new ItemType();
        itemType.setId(UUID.randomUUID());
        itemType.setName("Test Item");

        Consumable consumable = new Consumable();
        consumable.setId(UUID.randomUUID());
        consumable.setEquipment(equipment);
        consumable.setItemType(itemType);
        consumable.setStatus(status);
        consumable.setQuantity(quantity);
        consumable.setResolved(false);
        return consumable;
    }
}