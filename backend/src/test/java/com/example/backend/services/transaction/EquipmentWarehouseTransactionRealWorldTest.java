package com.example.backend.services.transaction;

import com.example.backend.models.*;
import com.example.backend.models.equipment.*;
import com.example.backend.models.equipment.EquipmentStatus;
import com.example.backend.models.site.Site;
import com.example.backend.models.transaction.*;
import com.example.backend.models.warehouse.*;
import com.example.backend.repositories.equipment.*;
import com.example.backend.repositories.site.SiteRepository;
import com.example.backend.repositories.transaction.TransactionRepository;
import com.example.backend.repositories.transaction.TransactionItemRepository;
import com.example.backend.repositories.warehouse.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.annotation.DirtiesContext;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Real-world comprehensive testing of ALL Equipment-Warehouse transaction scenarios
 * 
 * Tests every possible combination of:
 * - Warehouse-initiated vs Equipment-initiated
 * - CONSUMABLE vs MAINTENANCE purpose
 * - Perfect match vs Quantity mismatch vs Never received vs Mixed results
 * - Single item vs Multi-item transactions
 * - Batch number conflicts and edge cases
 * - Maintenance workflow integration
 * 
 * Simulates real warehouse team and equipment team interactions
 */
@SpringBootTest
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class EquipmentWarehouseTransactionRealWorldTest {

    @Autowired private TransactionService transactionService;
    @Autowired private BatchValidationService batchValidationService;
    
    // Repositories
    @Autowired private TransactionRepository transactionRepository;
    @Autowired private TransactionItemRepository transactionItemRepository;
    @Autowired private SiteRepository siteRepository;
    @Autowired private WarehouseRepository warehouseRepository;
    @Autowired private ItemRepository itemRepository;
    @Autowired private ItemTypeRepository itemTypeRepository;
    @Autowired private ItemCategoryRepository itemCategoryRepository;
    @Autowired private EquipmentRepository equipmentRepository;
    @Autowired private EquipmentBrandRepository equipmentBrandRepository;
    @Autowired private EquipmentTypeRepository equipmentTypeRepository;
    @Autowired private ConsumableRepository consumableRepository;
    @Autowired private InSiteMaintenanceRepository inSiteMaintenanceRepository;
    @Autowired private MaintenanceTypeRepository maintenanceTypeRepository;

    // Test entities
    private Site miningSite;
    private Warehouse mainWarehouse;
    private Equipment excavator;
    private ItemCategory hardwareCategory;
    private ItemType boltsType, oilType, filtersType;
    private Item boltsInventory, oilInventory, filtersInventory;
    private MaintenanceType routineMaintenance;

    @BeforeEach
    void setupRealWorldScenario() {
        
        // Create mining site
        miningSite = new Site();
        miningSite.setName("Main Mining Site");
        miningSite.setPhysicalAddress("Desert Mining Location");
        miningSite.setCompanyAddress("Mining Corp HQ");
        miningSite.setCreationDate(LocalDate.now());
        miningSite = siteRepository.save(miningSite);
        
        // Create main warehouse
        mainWarehouse = new Warehouse();
        mainWarehouse.setName("Main Parts Warehouse");
        mainWarehouse.setSite(miningSite);
        mainWarehouse = warehouseRepository.save(mainWarehouse);
        
        // Create excavator equipment
        EquipmentBrand caterpillar = new EquipmentBrand();
        caterpillar.setName("Caterpillar");
        caterpillar.setDescription("Heavy machinery manufacturer");
        caterpillar = equipmentBrandRepository.save(caterpillar);
        
        EquipmentType excavatorType = new EquipmentType();
        excavatorType.setName("Hydraulic Excavator");
        excavatorType.setDescription("Heavy duty excavator");
        excavatorType.setDrivable(true);
        excavatorType = equipmentTypeRepository.save(excavatorType);
        
        excavator = new Equipment();
        excavator.setName("Excavator-001");
        excavator.setSerialNumber("CAT-EXC-001");
        excavator.setModel("CAT 320");
        excavator.setBrand(caterpillar);
        excavator.setType(excavatorType);
        excavator.setManufactureYear(Year.of(2020));
        excavator.setPurchasedDate(LocalDate.of(2020, 6, 15));
        excavator.setDeliveredDate(LocalDate.of(2020, 7, 1));
        excavator.setEgpPrice(2500000.0);
        excavator.setDollarPrice(50000.0);
        excavator.setCountryOfOrigin("USA"); // Set required country of origin
        excavator.setSite(miningSite);
        excavator.setStatus(EquipmentStatus.AVAILABLE);
        excavator = equipmentRepository.save(excavator);
        
        // Create item category and types
        hardwareCategory = new ItemCategory();
        hardwareCategory.setName("Maintenance Parts");
        hardwareCategory.setDescription("Parts and consumables for equipment");
        hardwareCategory = itemCategoryRepository.save(hardwareCategory);
        
        boltsType = new ItemType();
        boltsType.setName("Heavy Duty Bolts");
        boltsType.setMeasuringUnit("pieces");
        boltsType.setItemCategory(hardwareCategory);
        boltsType.setMinQuantity(20);
        boltsType.setStatus("ACTIVE");
        boltsType = itemTypeRepository.save(boltsType);
        
        oilType = new ItemType();
        oilType.setName("Hydraulic Oil");
        oilType.setMeasuringUnit("liters");
        oilType.setItemCategory(hardwareCategory);
        oilType.setMinQuantity(50);
        oilType.setStatus("ACTIVE");
        oilType = itemTypeRepository.save(oilType);
        
        filtersType = new ItemType();
        filtersType.setName("Oil Filters");
        filtersType.setMeasuringUnit("pieces");
        filtersType.setItemCategory(hardwareCategory);
        filtersType.setMinQuantity(10);
        filtersType.setStatus("ACTIVE");
        filtersType = itemTypeRepository.save(filtersType);
        
        // Create warehouse inventory
        boltsInventory = new Item();
        boltsInventory.setItemType(boltsType);
        boltsInventory.setWarehouse(mainWarehouse);
        boltsInventory.setQuantity(500);
        boltsInventory.setItemStatus(ItemStatus.IN_WAREHOUSE);
        boltsInventory.setResolved(false);
        boltsInventory.setCreatedBy("warehouse-manager");
        boltsInventory.setCreatedAt(LocalDateTime.now());
        boltsInventory = itemRepository.save(boltsInventory);
        
        oilInventory = new Item();
        oilInventory.setItemType(oilType);
        oilInventory.setWarehouse(mainWarehouse);
        oilInventory.setQuantity(1000);
        oilInventory.setItemStatus(ItemStatus.IN_WAREHOUSE);
        oilInventory.setResolved(false);
        oilInventory.setCreatedBy("warehouse-manager");
        oilInventory.setCreatedAt(LocalDateTime.now());
        oilInventory = itemRepository.save(oilInventory);
        
        filtersInventory = new Item();
        filtersInventory.setItemType(filtersType);
        filtersInventory.setWarehouse(mainWarehouse);
        filtersInventory.setQuantity(200);
        filtersInventory.setItemStatus(ItemStatus.IN_WAREHOUSE);
        filtersInventory.setResolved(false);
        filtersInventory.setCreatedBy("warehouse-manager");
        filtersInventory.setCreatedAt(LocalDateTime.now());
        filtersInventory = itemRepository.save(filtersInventory);
        
        // Create maintenance type
        routineMaintenance = new MaintenanceType();
        routineMaintenance.setName("Routine Service");
        routineMaintenance.setDescription("Regular maintenance service");
        routineMaintenance.setActive(true);
        routineMaintenance = maintenanceTypeRepository.save(routineMaintenance);
    }

    // Cleanup is handled automatically by @DirtiesContext annotation

    // ========================================
    // SCENARIO 1: WAREHOUSE-INITIATED CONSUMABLE TRANSACTIONS
    // ========================================

    @Test
    @Order(1)
    @DisplayName("Scenario 1.1: Warehouse sends consumables - Perfect Match")
    @Transactional
    void testWarehouseInitiatedConsumablePerfectMatch() {
        System.out.println("\n🏭 SCENARIO 1.1: Warehouse team says 'Sending 50 bolts to excavator for consumption'");
        
        // Warehouse team creates transaction
        List<TransactionItem> items = Collections.singletonList(
                TransactionItem.builder()
                        .itemType(boltsType)
                        .quantity(50)  // Warehouse is sending 50 bolts
                        .status(TransactionStatus.PENDING)
                        .build()
        );

        int batchNumber = generateUniqueBatchNumber();
        Transaction transaction = transactionService.createEquipmentTransaction(
            PartyType.WAREHOUSE, mainWarehouse.getId(),  // Warehouse is sender
            PartyType.EQUIPMENT, excavator.getId(),      // Equipment is receiver
            items,
            LocalDateTime.now(),
            "warehouse-manager",
            batchNumber,
            mainWarehouse.getId(),  // Warehouse initiated
            TransactionPurpose.GENERAL  // Warehouse doesn't know purpose yet
        );

        // Equipment team confirms: "Yes, we received exactly 50 bolts for consumption"
        Map<UUID, Integer> receivedQuantities = new HashMap<>();
        receivedQuantities.put(transaction.getItems().get(0).getId(), 50);  // Perfect match

        Transaction result = transactionService.acceptEquipmentTransaction(
            transaction.getId(),
            receivedQuantities,
            new HashMap<>(),
            "equipment-operator",
            "Perfect delivery, exactly 50 bolts received for consumption",
            TransactionPurpose.CONSUMABLE  // Equipment sets purpose when validating
        );

        // Verify results
        assertEquals(TransactionStatus.ACCEPTED, result.getStatus());
        assertEquals("Perfect delivery, exactly 50 bolts received for consumption", result.getAcceptanceComment());
        
        // Verify consumables created for equipment
        List<Consumable> consumables = consumableRepository.findByEquipmentId(excavator.getId());
        assertEquals(1, consumables.size());
        assertEquals(50, consumables.get(0).getQuantity());
        assertEquals("Heavy Duty Bolts", consumables.get(0).getItemType().getName());
        
        System.out.println("✅ Result: Transaction ACCEPTED, 50 bolts consumed by equipment");
    }

    @Test
    @Order(2)
    @DisplayName("Scenario 1.2: Warehouse sends consumables - Quantity Mismatch")
    @Transactional
    void testWarehouseInitiatedConsumableQuantityMismatch() {
        System.out.println("\n🏭 SCENARIO 1.2: Warehouse team says 'Sending 75 oil liters' but equipment receives only 60");
        
        List<TransactionItem> items = Collections.singletonList(
                TransactionItem.builder()
                        .itemType(oilType)
                        .quantity(75)  // Warehouse claims to send 75 liters
                        .status(TransactionStatus.PENDING)
                        .build()
        );

        int batchNumber = generateUniqueBatchNumber();
        Transaction transaction = transactionService.createEquipmentTransaction(
            PartyType.WAREHOUSE, mainWarehouse.getId(),
            PartyType.EQUIPMENT, excavator.getId(),
            items,
            LocalDateTime.now(),
            "warehouse-manager",
            batchNumber,
            mainWarehouse.getId(),
            TransactionPurpose.CONSUMABLE
        );

        // Equipment team reports: "We only received 60 liters, not 75"
        Map<UUID, Integer> receivedQuantities = new HashMap<>();
        receivedQuantities.put(transaction.getItems().get(0).getId(), 60);  // Mismatch!

        Transaction result = transactionService.acceptEquipmentTransaction(
            transaction.getId(),
            receivedQuantities,
            new HashMap<>(),
            "equipment-operator",
            "Quantity mismatch: received 60L but warehouse claimed 75L",
            TransactionPurpose.CONSUMABLE
        );

        // Verify results
        assertEquals(TransactionStatus.REJECTED, result.getStatus());
        assertTrue(result.getItems().get(0).getRejectionReason().contains("mismatch"));
        
        // IMPORTANT: Even though rejected, consumables created based on equipment's reported quantity
        // Equipment said they received 60L, so that's what gets recorded regardless of warehouse claim
        List<Consumable> consumables = consumableRepository.findByEquipmentId(excavator.getId());
        assertEquals(1, consumables.size());
        assertEquals(60, consumables.get(0).getQuantity());  // Based on equipment report, not warehouse claim
        assertEquals("Hydraulic Oil", consumables.get(0).getItemType().getName());
        
        System.out.println("❌ Result: Transaction REJECTED due to quantity mismatch");
    }

    @Test
    @Order(3)
    @DisplayName("Scenario 1.3: Warehouse sends consumables - Never Received")
    @Transactional
    void testWarehouseInitiatedConsumableNeverReceived() {
        System.out.println("\n🏭 SCENARIO 1.3: Warehouse team says 'Sent 25 filters' but equipment never received them");
        
        List<TransactionItem> items = Collections.singletonList(
                TransactionItem.builder()
                        .itemType(filtersType)
                        .quantity(25)
                        .status(TransactionStatus.PENDING)
                        .build()
        );

        int batchNumber = generateUniqueBatchNumber();
        Transaction transaction = transactionService.createEquipmentTransaction(
            PartyType.WAREHOUSE, mainWarehouse.getId(),
            PartyType.EQUIPMENT, excavator.getId(),
            items,
            LocalDateTime.now(),
            "warehouse-manager",
            batchNumber,
            mainWarehouse.getId(),
            TransactionPurpose.CONSUMABLE
        );

        // Equipment team reports: "We never received any filters"
        Map<UUID, Integer> receivedQuantities = new HashMap<>();
        receivedQuantities.put(transaction.getItems().get(0).getId(), 0);  // Nothing received
        
        Map<UUID, Boolean> itemsNotReceived = new HashMap<>();
        itemsNotReceived.put(transaction.getItems().get(0).getId(), true);  // Mark as not received

        Transaction result = transactionService.acceptEquipmentTransaction(
            transaction.getId(),
            receivedQuantities,
            itemsNotReceived,
            "equipment-operator",
            "Filters never arrived at equipment location",
            TransactionPurpose.CONSUMABLE
        );

        // Verify results
        assertEquals(TransactionStatus.REJECTED, result.getStatus());
        assertEquals("Item was not sent/received", result.getItems().get(0).getRejectionReason());
        
        System.out.println("❌ Result: Transaction REJECTED - items never received");
    }

    @Test
    @Order(4)
    @DisplayName("Scenario 1.4: Warehouse sends multiple consumables - Mixed Results")
    @Transactional
    void testWarehouseInitiatedConsumableMixedResults() {
        System.out.println("\n🏭 SCENARIO 1.4: Warehouse sends multiple items - some perfect, some wrong, some missing");
        
        List<TransactionItem> items = Arrays.asList(
            TransactionItem.builder()
                .itemType(boltsType)
                .quantity(30)  // This will be perfect
                .status(TransactionStatus.PENDING)
                .build(),
            TransactionItem.builder()
                .itemType(oilType)
                .quantity(100)  // This will have quantity mismatch
                .status(TransactionStatus.PENDING)
                .build(),
            TransactionItem.builder()
                .itemType(filtersType)
                .quantity(15)  // This will never be received
                .status(TransactionStatus.PENDING)
                .build()
        );

        int batchNumber = generateUniqueBatchNumber();
        Transaction transaction = transactionService.createEquipmentTransaction(
            PartyType.WAREHOUSE, mainWarehouse.getId(),
            PartyType.EQUIPMENT, excavator.getId(),
            items,
            LocalDateTime.now(),
            "warehouse-manager",
            batchNumber,
            mainWarehouse.getId(),
            TransactionPurpose.CONSUMABLE
        );

        // Equipment team reports mixed results
        Map<UUID, Integer> receivedQuantities = new HashMap<>();
        receivedQuantities.put(transaction.getItems().get(0).getId(), 30);  // Bolts: Perfect
        receivedQuantities.put(transaction.getItems().get(1).getId(), 85);  // Oil: Mismatch (100 vs 85)
        receivedQuantities.put(transaction.getItems().get(2).getId(), 0);   // Filters: Not received
        
        Map<UUID, Boolean> itemsNotReceived = new HashMap<>();
        itemsNotReceived.put(transaction.getItems().get(2).getId(), true);  // Filters not received

        Transaction result = transactionService.acceptEquipmentTransaction(
            transaction.getId(),
            receivedQuantities,
            itemsNotReceived,
            "equipment-operator",
            "Mixed delivery: bolts OK, oil quantity wrong, filters missing",
            TransactionPurpose.CONSUMABLE
        );

        // Verify overall transaction rejected due to issues
        assertEquals(TransactionStatus.REJECTED, result.getStatus());
        
        // Verify individual item statuses
        TransactionItem boltsItem = result.getItems().stream()
            .filter(item -> item.getItemType().getName().equals("Heavy Duty Bolts"))
            .findFirst().orElseThrow();
        assertEquals(TransactionStatus.ACCEPTED, boltsItem.getStatus());
        
        TransactionItem oilItem = result.getItems().stream()
            .filter(item -> item.getItemType().getName().equals("Hydraulic Oil"))
            .findFirst().orElseThrow();
        assertEquals(TransactionStatus.REJECTED, oilItem.getStatus());
        
        TransactionItem filtersItem = result.getItems().stream()
            .filter(item -> item.getItemType().getName().equals("Oil Filters"))
            .findFirst().orElseThrow();
        assertEquals(TransactionStatus.REJECTED, filtersItem.getStatus());
        
        // Verify consumables created for both accepted and rejected items (based on what equipment actually received)
        List<Consumable> consumables = consumableRepository.findByEquipmentId(excavator.getId());
        assertEquals(2, consumables.size());  // Bolts (accepted) + Oil (rejected, but equipment still received 85)
        
        // Find and verify bolts consumable (should be accepted)
        Consumable boltsConsumable = consumables.stream()
            .filter(c -> c.getItemType().getName().equals("Heavy Duty Bolts"))
            .findFirst().orElseThrow();
        assertEquals(30, boltsConsumable.getQuantity());
        assertEquals(ItemStatus.IN_WAREHOUSE, boltsConsumable.getStatus()); // Accepted items are available
        
        // Find and verify oil consumable (should be rejected but quantity reflects what equipment received)
        Consumable oilConsumable = consumables.stream()
            .filter(c -> c.getItemType().getName().equals("Hydraulic Oil"))
            .findFirst().orElseThrow();
        assertEquals(85, oilConsumable.getQuantity()); // What equipment actually received
        // Note: Status may vary based on business logic for rejected items
        
        System.out.println("⚠️ Result: Transaction REJECTED overall, but accepted items still consumed");
    }

    // ========================================
    // SCENARIO 2: EQUIPMENT-INITIATED CONSUMABLE TRANSACTIONS
    // ========================================

    @Test
    @Order(5)
    @DisplayName("Scenario 2.1: Equipment requests consumables - Perfect Delivery")
    @Transactional
    void testEquipmentInitiatedConsumablePerfectDelivery() {
        System.out.println("\n🚜 SCENARIO 2.1: Equipment team says 'We need 40 bolts for operations'");
        
        // Equipment team creates transaction (requesting items)
        List<TransactionItem> items = Collections.singletonList(
                TransactionItem.builder()
                        .itemType(boltsType)
                        .quantity(40)  // Equipment is requesting 40 bolts
                        .status(TransactionStatus.PENDING)
                        .build()
        );

        int batchNumber = generateUniqueBatchNumber();
        Transaction transaction = transactionService.createEquipmentTransaction(
            PartyType.WAREHOUSE, mainWarehouse.getId(),  // Items still flow FROM warehouse
            PartyType.EQUIPMENT, excavator.getId(),      // TO equipment
            items,
            LocalDateTime.now(),
            "equipment-manager",
            batchNumber,
            excavator.getId(),  // Equipment initiated the request
            TransactionPurpose.CONSUMABLE
        );

        // Warehouse team delivers exactly what was requested
        // Equipment confirms: "Perfect, received exactly 40 bolts as requested"
        Map<UUID, Integer> receivedQuantities = new HashMap<>();
        receivedQuantities.put(transaction.getItems().get(0).getId(), 40);

        Transaction result = transactionService.acceptEquipmentTransaction(
            transaction.getId(),
            receivedQuantities,
            new HashMap<>(),
            "equipment-operator",
            "Perfect delivery of requested bolts",
            TransactionPurpose.CONSUMABLE
        );

        assertEquals(TransactionStatus.ACCEPTED, result.getStatus());
        
        // Verify consumables created
        List<Consumable> consumables = consumableRepository.findByEquipmentId(excavator.getId());
        assertEquals(1, consumables.size());
        assertEquals(40, consumables.get(0).getQuantity());
        
        System.out.println("✅ Result: Equipment request fulfilled perfectly");
    }

    @Test
    @Order(6)
    @DisplayName("Scenario 2.2: Equipment requests consumables - Warehouse delivers wrong quantity")
    @Transactional
    void testEquipmentInitiatedConsumableWrongQuantityDelivered() {
        System.out.println("\n🚜 SCENARIO 2.2: Equipment needs 60L oil, warehouse delivers only 45L");
        
        List<TransactionItem> items = Collections.singletonList(
                TransactionItem.builder()
                        .itemType(oilType)
                        .quantity(60)  // Equipment requesting 60 liters
                        .status(TransactionStatus.PENDING)
                        .build()
        );

        int batchNumber = generateUniqueBatchNumber();
        Transaction transaction = transactionService.createEquipmentTransaction(
            PartyType.WAREHOUSE, mainWarehouse.getId(),
            PartyType.EQUIPMENT, excavator.getId(),
            items,
            LocalDateTime.now(),
            "equipment-manager",
            batchNumber,
            excavator.getId(),  // Equipment initiated
            TransactionPurpose.CONSUMABLE
        );

        // Equipment reports: "We only received 45L, not the 60L we requested"
        Map<UUID, Integer> receivedQuantities = new HashMap<>();
        receivedQuantities.put(transaction.getItems().get(0).getId(), 45);  // Less than requested

        Transaction result = transactionService.acceptEquipmentTransaction(
            transaction.getId(),
            receivedQuantities,
            new HashMap<>(),
            "equipment-operator",
            "Warehouse delivered 45L but we requested 60L",
            TransactionPurpose.CONSUMABLE
        );

        assertEquals(TransactionStatus.REJECTED, result.getStatus());
        assertTrue(result.getItems().get(0).getRejectionReason().contains("mismatch"));
        
        System.out.println("❌ Result: Equipment request not fulfilled - quantity shortage");
    }

    // ========================================
    // SCENARIO 3: WAREHOUSE-INITIATED MAINTENANCE TRANSACTIONS
    // ========================================

    @Test
    @Order(7)
    @DisplayName("Scenario 3.1: Correct InSiteMaintenance Workflow - Equipment creates maintenance first")
    @Transactional
    void testCorrectInSiteMaintenanceWorkflow() {
        System.out.println("\n🔧 SCENARIO 3.1: Equipment creates InSiteMaintenance, then links warehouse transaction");
        
        // Step 1: Equipment team creates InSiteMaintenance record first
        InSiteMaintenance maintenance = InSiteMaintenance.builder()
            .equipment(excavator)
            .maintenanceType(routineMaintenance)
            .description("Scheduled hydraulic system service")
            .maintenanceDate(LocalDateTime.now())
            .status("PLANNED")
            .build();
        maintenance = inSiteMaintenanceRepository.save(maintenance);
        System.out.println("📋 Equipment team created maintenance record: " + maintenance.getDescription());

        // Step 2: Warehouse had already sent some supplies (they don't know purpose)
        List<TransactionItem> items = Arrays.asList(
            TransactionItem.builder()
                .itemType(oilType)
                .quantity(80)  // Warehouse sent oil
                .status(TransactionStatus.PENDING)
                .build(),
            TransactionItem.builder()
                .itemType(filtersType)
                .quantity(5)   // Warehouse sent filters
                .status(TransactionStatus.PENDING)
                .build()
        );

        int batchNumber = generateUniqueBatchNumber();
        Transaction transaction = transactionService.createEquipmentTransaction(
            PartyType.WAREHOUSE, mainWarehouse.getId(),
            PartyType.EQUIPMENT, excavator.getId(),
            items,
            LocalDateTime.now(),
            "warehouse-manager",
            batchNumber,
            mainWarehouse.getId(),
            TransactionPurpose.GENERAL  // Warehouse doesn't know it's for maintenance
        );
        System.out.println("📦 Warehouse created transaction with GENERAL purpose");

        // Step 3: Equipment validates and links to maintenance
        // Equipment team says: "These supplies are for our maintenance work"
        Map<UUID, Integer> receivedQuantities = new HashMap<>();
        receivedQuantities.put(transaction.getItems().get(0).getId(), 80);  // Oil received
        receivedQuantities.put(transaction.getItems().get(1).getId(), 5);   // Filters received

        // Link to maintenance record during validation
        transaction.setMaintenance(maintenance);
        transaction = transactionRepository.save(transaction);

        Transaction result = transactionService.acceptEquipmentTransaction(
            transaction.getId(),
            receivedQuantities,
            new HashMap<>(),
            "maintenance-technician",
            "Supplies received and linked to scheduled maintenance",
            TransactionPurpose.MAINTENANCE  // Equipment sets purpose during validation
        );

        // Verify correct workflow
        assertEquals(TransactionStatus.ACCEPTED, result.getStatus());
        assertEquals(TransactionPurpose.MAINTENANCE, result.getPurpose());  // Purpose set by equipment
        assertNotNull(result.getMaintenance());
        assertEquals(maintenance.getId(), result.getMaintenance().getId());
        
        // Verify consumables created for maintenance work
        List<Consumable> consumables = consumableRepository.findByEquipmentId(excavator.getId());
        assertEquals(2, consumables.size());  // Oil and filters for maintenance
        
        System.out.println("✅ Result: InSiteMaintenance workflow completed correctly");
        System.out.println("   1. Equipment created maintenance record");
        System.out.println("   2. Warehouse sent supplies (GENERAL purpose)");
        System.out.println("   3. Equipment linked transaction to maintenance (MAINTENANCE purpose)");
    }

    // ========================================
    // SCENARIO 4: EQUIPMENT-INITIATED MAINTENANCE TRANSACTIONS
    // ========================================

    @Test
    @Order(8)
    @DisplayName("Scenario 4.1: Equipment requests emergency maintenance supplies")
    @Transactional
    void testEquipmentInitiatedEmergencyMaintenance() {
        System.out.println("\n🚨 SCENARIO 4.1: Equipment breakdown - urgent maintenance supplies needed!");
        
        // Create emergency maintenance record
        InSiteMaintenance emergencyMaintenance = InSiteMaintenance.builder()
            .equipment(excavator)
            .maintenanceType(routineMaintenance)
            .description("EMERGENCY: Hydraulic leak requires immediate repair")
            .maintenanceDate(LocalDateTime.now())
            .status("EMERGENCY")
            .build();
        emergencyMaintenance = inSiteMaintenanceRepository.save(emergencyMaintenance);

        // Equipment urgently requests maintenance supplies
        List<TransactionItem> items = Arrays.asList(
            TransactionItem.builder()
                .itemType(oilType)
                .quantity(120)  // Extra oil for leak repair
                .status(TransactionStatus.PENDING)
                .build(),
            TransactionItem.builder()
                .itemType(boltsType)
                .quantity(20)   // Bolts for fixing hydraulic connections
                .status(TransactionStatus.PENDING)
                .build()
        );

        int batchNumber = generateUniqueBatchNumber();
        Transaction transaction = transactionService.createEquipmentTransaction(
            PartyType.WAREHOUSE, mainWarehouse.getId(),
            PartyType.EQUIPMENT, excavator.getId(),
            items,
            LocalDateTime.now(),
            "maintenance-supervisor",
            batchNumber,
            excavator.getId(),  // Equipment initiated emergency request
            TransactionPurpose.MAINTENANCE
        );

        // Link to emergency maintenance
        transaction.setMaintenance(emergencyMaintenance);
        transaction = transactionRepository.save(transaction);

        // Warehouse responds quickly to emergency
        Map<UUID, Integer> receivedQuantities = new HashMap<>();
        receivedQuantities.put(transaction.getItems().get(0).getId(), 120);  // Oil delivered
        receivedQuantities.put(transaction.getItems().get(1).getId(), 20);   // Bolts delivered

        Transaction result = transactionService.acceptEquipmentTransaction(
            transaction.getId(),
            receivedQuantities,
            new HashMap<>(),
            "maintenance-technician",
            "Emergency supplies received - starting immediate repair",
            TransactionPurpose.MAINTENANCE
        );

        assertEquals(TransactionStatus.ACCEPTED, result.getStatus());
        assertEquals(TransactionPurpose.MAINTENANCE, result.getPurpose());
        assertEquals("EMERGENCY: Hydraulic leak requires immediate repair", 
                    result.getMaintenance().getDescription());
        
        System.out.println("✅ Result: Emergency maintenance supplies delivered successfully");
    }

    // ========================================
    // EDGE CASES & COMPLEX SCENARIOS
    // ========================================

    @Test
    @Order(9)
    @DisplayName("Edge Case 1: Batch Number Collision Detection")
    @Transactional
    void testBatchNumberCollisionDetection() {
        System.out.println("\n⚠️ EDGE CASE 1: Two teams try to use the same batch number");
        
        int conflictingBatchNumber = generateUniqueBatchNumber();
        
        // First team creates transaction with batch number
        List<TransactionItem> items1 = Collections.singletonList(
                TransactionItem.builder()
                        .itemType(boltsType)
                        .quantity(10)
                        .status(TransactionStatus.PENDING)
                        .build()
        );

        Transaction transaction1 = transactionService.createEquipmentTransaction(
            PartyType.WAREHOUSE, mainWarehouse.getId(),
            PartyType.EQUIPMENT, excavator.getId(),
            items1,
            LocalDateTime.now(),
            "warehouse-manager",
            conflictingBatchNumber,
            mainWarehouse.getId(),
            TransactionPurpose.CONSUMABLE
        );

        // Second team tries to use same batch number
        assertThrows(IllegalArgumentException.class, () -> {
            batchValidationService.validateBatchNumberUniqueness(conflictingBatchNumber);
        });
        
        System.out.println("✅ Result: Batch number collision properly detected and prevented");
    }

    @Test
    @Order(10)
    @DisplayName("Edge Case 2: Cross-Purpose Batch Validation")
    @Transactional
    void testCrossPurposeBatchValidation() {
        System.out.println("\n⚠️ EDGE CASE 2: Batch number validation across different purposes");
        
        // Create CONSUMABLE transaction
        List<TransactionItem> consumableItems = Collections.singletonList(
                TransactionItem.builder()
                        .itemType(boltsType)
                        .quantity(25)
                        .status(TransactionStatus.PENDING)
                        .build()
        );

        int batchNumber = generateUniqueBatchNumber();
        Transaction consumableTransaction = transactionService.createEquipmentTransaction(
            PartyType.WAREHOUSE, mainWarehouse.getId(),
            PartyType.EQUIPMENT, excavator.getId(),
            consumableItems,
            LocalDateTime.now(),
            "warehouse-manager",
            batchNumber,
            mainWarehouse.getId(),
            TransactionPurpose.CONSUMABLE
        );

        // Try to validate same batch for different equipment
        Equipment anotherEquipment = new Equipment();
        anotherEquipment.setId(UUID.randomUUID());  // Different equipment

        var validationResult = batchValidationService.validateBatchForEquipment(batchNumber, anotherEquipment.getId());
        
        assertEquals("used_by_other_entity", validationResult.getScenario());
        assertFalse(validationResult.isCanValidate());
        assertFalse(validationResult.isCanCreateNew());
        
        System.out.println("✅ Result: Cross-entity batch validation working correctly");
    }

    // ========================================
    // HELPER METHODS
    // ========================================

    private int generateUniqueBatchNumber() {
        return (int) (System.currentTimeMillis() % 1000000);
    }

    /**
     * Comprehensive test scenario validator
     */
    private void validateTransactionScenario(Transaction transaction, 
                                           TransactionStatus expectedStatus,
                                           TransactionPurpose expectedPurpose,
                                           String scenarioDescription) {
        assertNotNull(transaction, "Transaction should not be null");
        assertEquals(expectedStatus, transaction.getStatus(), 
                    "Transaction status mismatch in: " + scenarioDescription);
        assertEquals(expectedPurpose, transaction.getPurpose(), 
                    "Transaction purpose mismatch in: " + scenarioDescription);
        
        if (expectedStatus == TransactionStatus.ACCEPTED || expectedStatus == TransactionStatus.REJECTED) {
            assertNotNull(transaction.getCompletedAt(), 
                         "Completed transactions should have completion time: " + scenarioDescription);
            assertNotNull(transaction.getApprovedBy(), 
                         "Completed transactions should have approver: " + scenarioDescription);
        }
    }
}