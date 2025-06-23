package com.example.backend;

import com.example.backend.dtos.*;
import com.example.backend.models.*;
import com.example.backend.services.MaintenanceService;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.equipment.EquipmentStatus;
import com.example.backend.models.equipment.EquipmentType;
import com.example.backend.models.equipment.EquipmentBrand;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.repositories.equipment.EquipmentTypeRepository;
import com.example.backend.repositories.equipment.EquipmentBrandRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class MaintenanceSystemTest {

    @Autowired
    private MaintenanceService maintenanceService;
    
    @Autowired
    private EquipmentRepository equipmentRepository;
    
    @Autowired
    private EquipmentTypeRepository equipmentTypeRepository;
    
    @Autowired
    private EquipmentBrandRepository equipmentBrandRepository;

    @Test
    public void testCompleteMaintenanceWorkflowWithEquipment() {
        // Step 1: Create test equipment
        EquipmentType generatorType = EquipmentType.builder()
                .name("Generator")
                .description("Power generation equipment")
                .drivable(false)
                .build();
        generatorType = equipmentTypeRepository.save(generatorType);
        
        EquipmentBrand caterpillarBrand = EquipmentBrand.builder()
                .name("Caterpillar")
                .description("Heavy equipment manufacturer")
                .build();
        caterpillarBrand = equipmentBrandRepository.save(caterpillarBrand);
        
        Equipment testEquipment = Equipment.builder()
                .type(generatorType)
                .model("G3500")
                .name("Generator Unit #G001")
                .brand(caterpillarBrand)
                .manufactureYear(Year.of(2020))
                .purchasedDate(LocalDate.of(2020, 1, 15))
                .deliveredDate(LocalDate.of(2020, 2, 1))
                .egpPrice(500000.0)
                .dollarPrice(32000.0)
                .countryOfOrigin("USA")
                .serialNumber("CAT-G001-2020-001")
                .modelNumber("G3500-001")
                .status(EquipmentStatus.AVAILABLE)
                .workedHours(1200)
                .build();
        
        testEquipment = equipmentRepository.save(testEquipment);
        UUID equipmentId = testEquipment.getId();
        
        // Verify equipment is initially available
        assertEquals(EquipmentStatus.AVAILABLE, testEquipment.getStatus());
        
        // Step 2: Create initial maintenance record for engine failure
        MaintenanceRecordDto initialRecord = MaintenanceRecordDto.builder()
                .equipmentId(equipmentId)
                .initialIssueDescription("Engine failure - suspected air intake problem")
                .expectedCompletionDate(LocalDateTime.now().plusDays(7))
                .currentResponsiblePerson("John Smith")
                .currentResponsiblePhone("+1-555-0123")
                .build();

        MaintenanceRecordDto createdRecord = maintenanceService.createMaintenanceRecord(initialRecord);
        assertNotNull(createdRecord.getId());
        assertEquals(equipmentId, createdRecord.getEquipmentId());
        assertEquals(MaintenanceRecord.MaintenanceStatus.ACTIVE, createdRecord.getStatus());
        
        // Verify equipment status changed to IN_MAINTENANCE
        Equipment updatedEquipment = equipmentRepository.findById(equipmentId).orElse(null);
        assertNotNull(updatedEquipment);
        assertEquals(EquipmentStatus.IN_MAINTENANCE, updatedEquipment.getStatus());

        // Step 3: Create initial transport step
        MaintenanceStepDto transportStep = MaintenanceStepDto.builder()
                .stepType(MaintenanceStep.StepType.TRANSPORT)
                .description("Transport engine from Site A to Main Workshop")
                .responsiblePerson("John Smith")
                .personPhoneNumber("+1-555-0123")
                .startDate(LocalDateTime.now())
                .expectedEndDate(LocalDateTime.now().plusDays(1))
                .fromLocation("Site A")
                .toLocation("Main Workshop")
                .stepCost(new BigDecimal("150.00"))
                .build();

        MaintenanceStepDto createdTransportStep = maintenanceService.createMaintenanceStep(
                createdRecord.getId(), transportStep);
        assertNotNull(createdTransportStep.getId());
        assertEquals(MaintenanceStep.StepType.TRANSPORT, createdTransportStep.getStepType());

        // Step 4: Create contact log for transport
        ContactLogDto transportContact = ContactLogDto.builder()
                .contactMethod("Phone")
                .contactPerson("John Smith")
                .contactDetails("Called to confirm pickup time")
                .contactStatus(ContactLog.ContactStatus.SUCCESSFUL)
                .responseReceived(true)
                .responseDetails("Confirmed pickup at 9 AM tomorrow")
                .build();

        ContactLogDto createdTransportContact = maintenanceService.createContactLog(
                createdTransportStep.getId(), transportContact);
        assertNotNull(createdTransportContact.getId());

        // Step 5: Complete transport and create workshop receipt step
        maintenanceService.completeMaintenanceStep(createdTransportStep.getId());

        MaintenanceStepDto workshopStep = MaintenanceStepDto.builder()
                .stepType(MaintenanceStep.StepType.INSPECTION)
                .description("Engine received for diagnosis and initial inspection")
                .responsiblePerson("Mike Wilson")
                .personPhoneNumber("+1-555-0456")
                .startDate(LocalDateTime.now().plusDays(1))
                .expectedEndDate(LocalDateTime.now().plusDays(2))
                .fromLocation("Main Workshop")
                .toLocation("Main Workshop")
                .stepCost(new BigDecimal("45.00"))
                .build();

        MaintenanceStepDto createdWorkshopStep = maintenanceService.createMaintenanceStep(
                createdRecord.getId(), workshopStep);
        assertNotNull(createdWorkshopStep.getId());

        // Step 6: Complete workshop step and escalate to specialist
        maintenanceService.completeMaintenanceStep(createdWorkshopStep.getId());

        MaintenanceStepDto escalationStep = MaintenanceStepDto.builder()
                .stepType(MaintenanceStep.StepType.ESCALATION)
                .description("Issue beyond workshop capabilities - transferring to engine specialist")
                .responsiblePerson("Sarah Johnson")
                .personPhoneNumber("+1-555-0789")
                .startDate(LocalDateTime.now().plusDays(2))
                .expectedEndDate(LocalDateTime.now().plusDays(3))
                .fromLocation("Main Workshop")
                .toLocation("Specialist Repair Facility")
                .stepCost(new BigDecimal("75.00"))
                .notes("Engine requires specialized diagnostic equipment")
                .build();

        MaintenanceStepDto createdEscalationStep = maintenanceService.createMaintenanceStep(
                createdRecord.getId(), escalationStep);
        assertNotNull(createdEscalationStep.getId());

        // Step 7: Complete escalation and create repair step
        maintenanceService.completeMaintenanceStep(createdEscalationStep.getId());

        MaintenanceStepDto repairStep = MaintenanceStepDto.builder()
                .stepType(MaintenanceStep.StepType.REPAIR)
                .description("Complete engine repair - replaced air intake system and fuel injectors")
                .responsiblePerson("Sarah Johnson")
                .personPhoneNumber("+1-555-0789")
                .startDate(LocalDateTime.now().plusDays(3))
                .expectedEndDate(LocalDateTime.now().plusDays(5))
                .fromLocation("Specialist Repair Facility")
                .toLocation("Specialist Repair Facility")
                .stepCost(new BigDecimal("850.00"))
                .notes("Major components replaced, engine tested successfully")
                .build();

        MaintenanceStepDto createdRepairStep = maintenanceService.createMaintenanceStep(
                createdRecord.getId(), repairStep);
        assertNotNull(createdRepairStep.getId());

        // Step 8: Complete repair and create testing step
        maintenanceService.completeMaintenanceStep(createdRepairStep.getId());

        MaintenanceStepDto testingStep = MaintenanceStepDto.builder()
                .stepType(MaintenanceStep.StepType.TESTING)
                .description("Comprehensive engine testing and performance validation")
                .responsiblePerson("Sarah Johnson")
                .personPhoneNumber("+1-555-0789")
                .startDate(LocalDateTime.now().plusDays(5))
                .expectedEndDate(LocalDateTime.now().plusDays(6))
                .fromLocation("Specialist Repair Facility")
                .toLocation("Specialist Repair Facility")
                .stepCost(new BigDecimal("120.00"))
                .build();

        MaintenanceStepDto createdTestingStep = maintenanceService.createMaintenanceStep(
                createdRecord.getId(), testingStep);
        assertNotNull(createdTestingStep.getId());

        // Step 9: Complete testing and create return to service step
        maintenanceService.completeMaintenanceStep(createdTestingStep.getId());

        MaintenanceStepDto returnStep = MaintenanceStepDto.builder()
                .stepType(MaintenanceStep.StepType.RETURN_TO_SERVICE)
                .description("Return repaired engine to original site")
                .responsiblePerson("John Smith")
                .personPhoneNumber("+1-555-0123")
                .startDate(LocalDateTime.now().plusDays(6))
                .expectedEndDate(LocalDateTime.now().plusDays(7))
                .fromLocation("Specialist Repair Facility")
                .toLocation("Site A")
                .stepCost(new BigDecimal("150.00"))
                .build();

        MaintenanceStepDto createdReturnStep = maintenanceService.createMaintenanceStep(
                createdRecord.getId(), returnStep);
        assertNotNull(createdReturnStep.getId());

        // Step 10: Complete return to service and finalize maintenance record
        maintenanceService.completeMaintenanceStep(createdReturnStep.getId());

        // Update maintenance record to completed status
        MaintenanceRecordDto finalRecord = MaintenanceRecordDto.builder()
                .finalDescription("Engine successfully repaired and returned to service. " +
                        "Replaced air intake system and fuel injectors. All tests passed.")
                .status(MaintenanceRecord.MaintenanceStatus.COMPLETED)
                .build();

        MaintenanceRecordDto completedRecord = maintenanceService.updateMaintenanceRecord(
                createdRecord.getId(), finalRecord);
        
        assertEquals(MaintenanceRecord.MaintenanceStatus.COMPLETED, completedRecord.getStatus());
        assertNotNull(completedRecord.getActualCompletionDate());
        assertTrue(completedRecord.getTotalCost().compareTo(BigDecimal.ZERO) > 0);
        
        // Verify equipment status changed back to AVAILABLE
        Equipment finalEquipment = equipmentRepository.findById(equipmentId).orElse(null);
        assertNotNull(finalEquipment);
        assertEquals(EquipmentStatus.AVAILABLE, finalEquipment.getStatus());

        // Verify the complete workflow
        MaintenanceRecordDto retrievedRecord = maintenanceService.getMaintenanceRecord(createdRecord.getId());
        List<MaintenanceStepDto> steps = maintenanceService.getMaintenanceSteps(createdRecord.getId());
        
        assertEquals(6, steps.size()); // Transport, Inspection, Escalation, Repair, Testing, Return
        assertEquals(6, retrievedRecord.getCompletedSteps());
        assertEquals(0, retrievedRecord.getActiveSteps());
        assertFalse(retrievedRecord.getIsOverdue());
        
        // Verify total cost calculation
        BigDecimal expectedTotalCost = new BigDecimal("1390.00"); // Sum of all step costs
        assertEquals(0, retrievedRecord.getTotalCost().compareTo(expectedTotalCost));
        
        // Verify equipment information is included
        assertEquals("Generator Unit #G001", retrievedRecord.getEquipmentName());
        assertEquals("G3500", retrievedRecord.getEquipmentModel());
        assertEquals("Generator", retrievedRecord.getEquipmentType());
        assertEquals("CAT-G001-2020-001", retrievedRecord.getEquipmentSerialNumber());
        
        System.out.println("=== Maintenance Workflow Test Results ===");
        System.out.println("Equipment ID: " + retrievedRecord.getEquipmentId());
        System.out.println("Equipment Name: " + retrievedRecord.getEquipmentName());
        System.out.println("Equipment Type: " + retrievedRecord.getEquipmentType());
        System.out.println("Equipment Serial: " + retrievedRecord.getEquipmentSerialNumber());
        System.out.println("Status: " + retrievedRecord.getStatus());
        System.out.println("Total Steps: " + retrievedRecord.getTotalSteps());
        System.out.println("Completed Steps: " + retrievedRecord.getCompletedSteps());
        System.out.println("Total Cost: $" + retrievedRecord.getTotalCost());
        System.out.println("Duration: " + retrievedRecord.getDurationInDays() + " days");
        System.out.println("Final Description: " + retrievedRecord.getFinalDescription());
        System.out.println("Equipment Status: " + finalEquipment.getStatus());
        
        // Print step details
        System.out.println("\n=== Step Details ===");
        for (int i = 0; i < steps.size(); i++) {
            MaintenanceStepDto step = steps.get(i);
            System.out.println((i + 1) + ". " + step.getStepType() + " - " + step.getDescription());
            System.out.println("   Responsible: " + step.getResponsiblePerson());
            System.out.println("   Cost: $" + step.getStepCost());
            System.out.println("   Completed: " + step.getIsCompleted());
        }
    }

    @Test
    public void testEquipmentStatusManagement() {
        // Create test equipment
        EquipmentType craneType = EquipmentType.builder()
                .name("Crane")
                .description("Heavy lifting equipment")
                .drivable(true)
                .build();
        craneType = equipmentTypeRepository.save(craneType);
        
        EquipmentBrand liebherrBrand = EquipmentBrand.builder()
                .name("Liebherr")
                .description("German crane manufacturer")
                .build();
        liebherrBrand = equipmentBrandRepository.save(liebherrBrand);
        
        Equipment craneEquipment = Equipment.builder()
                .type(craneType)
                .model("LTM 1100")
                .name("Mobile Crane #C001")
                .brand(liebherrBrand)
                .manufactureYear(Year.of(2019))
                .purchasedDate(LocalDate.of(2019, 3, 10))
                .deliveredDate(LocalDate.of(2019, 4, 1))
                .egpPrice(800000.0)
                .dollarPrice(50000.0)
                .countryOfOrigin("Germany")
                .serialNumber("LIE-C001-2019-001")
                .modelNumber("LTM1100-001")
                .status(EquipmentStatus.AVAILABLE)
                .workedHours(800)
                .build();
        
        craneEquipment = equipmentRepository.save(craneEquipment);
        UUID craneId = craneEquipment.getId();
        
        // Test 1: Create maintenance record - should change status to IN_MAINTENANCE
        MaintenanceRecordDto maintenanceRecord = MaintenanceRecordDto.builder()
                .equipmentId(craneId)
                .initialIssueDescription("Hydraulic system malfunction")
                .expectedCompletionDate(LocalDateTime.now().plusDays(5))
                .currentResponsiblePerson("Bob Johnson")
                .currentResponsiblePhone("+1-555-0999")
                .build();

        MaintenanceRecordDto createdRecord = maintenanceService.createMaintenanceRecord(maintenanceRecord);
        
        // Verify equipment status changed
        Equipment equipmentInMaintenance = equipmentRepository.findById(craneId).orElse(null);
        assertNotNull(equipmentInMaintenance);
        assertEquals(EquipmentStatus.IN_MAINTENANCE, equipmentInMaintenance.getStatus());
        
        // Test 2: Complete maintenance - should change status back to AVAILABLE
        MaintenanceRecordDto completedRecord = MaintenanceRecordDto.builder()
                .status(MaintenanceRecord.MaintenanceStatus.COMPLETED)
                .finalDescription("Hydraulic system repaired and tested")
                .build();
        
        maintenanceService.updateMaintenanceRecord(createdRecord.getId(), completedRecord);
        
        // Verify equipment status changed back
        Equipment equipmentAvailable = equipmentRepository.findById(craneId).orElse(null);
        assertNotNull(equipmentAvailable);
        assertEquals(EquipmentStatus.AVAILABLE, equipmentAvailable.getStatus());
        
        System.out.println("=== Equipment Status Management Test ===");
        System.out.println("Equipment: " + equipmentAvailable.getName());
        System.out.println("Initial Status: AVAILABLE");
        System.out.println("During Maintenance: IN_MAINTENANCE");
        System.out.println("After Completion: " + equipmentAvailable.getStatus());
    }

    @Test
    public void testGetMaintenanceRecordsByEquipment() {
        // Create test equipment
        EquipmentType excavatorType = EquipmentType.builder()
                .name("Excavator")
                .description("Earth moving equipment")
                .drivable(true)
                .build();
        excavatorType = equipmentTypeRepository.save(excavatorType);
        
        EquipmentBrand komatsuBrand = EquipmentBrand.builder()
                .name("Komatsu")
                .description("Japanese heavy equipment manufacturer")
                .build();
        komatsuBrand = equipmentBrandRepository.save(komatsuBrand);
        
        Equipment excavator = Equipment.builder()
                .type(excavatorType)
                .model("PC200")
                .name("Excavator #E001")
                .brand(komatsuBrand)
                .manufactureYear(Year.of(2021))
                .purchasedDate(LocalDate.of(2021, 6, 15))
                .deliveredDate(LocalDate.of(2021, 7, 1))
                .egpPrice(600000.0)
                .dollarPrice(38000.0)
                .countryOfOrigin("Japan")
                .serialNumber("KOM-E001-2021-001")
                .modelNumber("PC200-001")
                .status(EquipmentStatus.AVAILABLE)
                .workedHours(500)
                .build();
        
        excavator = equipmentRepository.save(excavator);
        UUID excavatorId = excavator.getId();
        
        // Create multiple maintenance records for the same equipment
        MaintenanceRecordDto record1 = MaintenanceRecordDto.builder()
                .equipmentId(excavatorId)
                .initialIssueDescription("Track replacement needed")
                .expectedCompletionDate(LocalDateTime.now().plusDays(3))
                .currentResponsiblePerson("Mike Wilson")
                .currentResponsiblePhone("+1-555-0456")
                .build();
        
        MaintenanceRecordDto record2 = MaintenanceRecordDto.builder()
                .equipmentId(excavatorId)
                .initialIssueDescription("Engine oil leak")
                .expectedCompletionDate(LocalDateTime.now().plusDays(2))
                .currentResponsiblePerson("Sarah Johnson")
                .currentResponsiblePhone("+1-555-0789")
                .build();
        
        // Complete the first record
        MaintenanceRecordDto created1 = maintenanceService.createMaintenanceRecord(record1);
        MaintenanceRecordDto completed1 = MaintenanceRecordDto.builder()
                .status(MaintenanceRecord.MaintenanceStatus.COMPLETED)
                .finalDescription("Tracks replaced successfully")
                .build();
        maintenanceService.updateMaintenanceRecord(created1.getId(), completed1);
        
        // Keep the second record active
        MaintenanceRecordDto created2 = maintenanceService.createMaintenanceRecord(record2);
        
        // Get all maintenance records for this equipment
        List<MaintenanceRecordDto> equipmentRecords = maintenanceService.getMaintenanceRecordsByEquipment(excavatorId);
        
        assertEquals(2, equipmentRecords.size());
        
        // Verify records are ordered by creation date (newest first)
        assertTrue(equipmentRecords.get(0).getCreationDate().isAfter(equipmentRecords.get(1).getCreationDate()));
        
        System.out.println("=== Equipment Maintenance History Test ===");
        System.out.println("Equipment: " + excavator.getName());
        System.out.println("Total Maintenance Records: " + equipmentRecords.size());
        
        for (int i = 0; i < equipmentRecords.size(); i++) {
            MaintenanceRecordDto record = equipmentRecords.get(i);
            System.out.println((i + 1) + ". " + record.getInitialIssueDescription());
            System.out.println("   Status: " + record.getStatus());
            System.out.println("   Created: " + record.getCreationDate());
            System.out.println("   Cost: $" + record.getTotalCost());
        }
    }

    @Test
    public void testDashboardData() {
        DashboardDto dashboard = maintenanceService.getDashboardData();
        assertNotNull(dashboard);
        assertNotNull(dashboard.getActiveRecords());
        assertNotNull(dashboard.getOverdueRecords());
        assertNotNull(dashboard.getTotalCost());
        
        System.out.println("=== Dashboard Data ===");
        System.out.println("Active Records: " + dashboard.getActiveRecords());
        System.out.println("Overdue Records: " + dashboard.getOverdueRecords());
        System.out.println("Records Needing Follow-up: " + dashboard.getRecordsNeedingFollowUp());
        System.out.println("Total Cost: $" + dashboard.getTotalCost());
        System.out.println("Average Completion Time: " + dashboard.getAverageCompletionTime() + " days");
    }

    @Test
    public void testHandoffWorkflow() {
        // Create test equipment
        EquipmentType bulldozerType = EquipmentType.builder()
                .name("Bulldozer")
                .description("Earth moving equipment")
                .drivable(true)
                .build();
        bulldozerType = equipmentTypeRepository.save(bulldozerType);
        
        EquipmentBrand catBrand = EquipmentBrand.builder()
                .name("Caterpillar")
                .description("Heavy equipment manufacturer")
                .build();
        catBrand = equipmentBrandRepository.save(catBrand);
        
        Equipment bulldozer = Equipment.builder()
                .type(bulldozerType)
                .model("D6")
                .name("Bulldozer #B001")
                .brand(catBrand)
                .manufactureYear(Year.of(2018))
                .purchasedDate(LocalDate.of(2018, 9, 20))
                .deliveredDate(LocalDate.of(2018, 10, 1))
                .egpPrice(400000.0)
                .dollarPrice(25000.0)
                .countryOfOrigin("USA")
                .serialNumber("CAT-B001-2018-001")
                .modelNumber("D6-001")
                .status(EquipmentStatus.AVAILABLE)
                .workedHours(1500)
                .build();
        
        bulldozer = equipmentRepository.save(bulldozer);
        UUID bulldozerId = bulldozer.getId();
        
        // Test the handoff functionality
        MaintenanceRecordDto record = MaintenanceRecordDto.builder()
                .equipmentId(bulldozerId)
                .initialIssueDescription("Blade adjustment needed")
                .expectedCompletionDate(LocalDateTime.now().plusDays(5))
                .currentResponsiblePerson("Person A")
                .currentResponsiblePhone("+1-555-0001")
                .build();

        MaintenanceRecordDto createdRecord = maintenanceService.createMaintenanceRecord(record);
        
        // Create first step
        MaintenanceStepDto step1 = MaintenanceStepDto.builder()
                .stepType(MaintenanceStep.StepType.INSPECTION)
                .description("Initial inspection of blade mechanism")
                .responsiblePerson("Person A")
                .personPhoneNumber("+1-555-0001")
                .startDate(LocalDateTime.now())
                .expectedEndDate(LocalDateTime.now().plusDays(1))
                .fromLocation("Site A")
                .toLocation("Site A")
                .stepCost(new BigDecimal("50.00"))
                .build();

        MaintenanceStepDto createdStep1 = maintenanceService.createMaintenanceStep(
                createdRecord.getId(), step1);

        // Test handoff to next step
        MaintenanceStepDto step2 = MaintenanceStepDto.builder()
                .stepType(MaintenanceStep.StepType.REPAIR)
                .description("Blade adjustment and calibration")
                .responsiblePerson("Person B")
                .personPhoneNumber("+1-555-0002")
                .startDate(LocalDateTime.now().plusDays(1))
                .expectedEndDate(LocalDateTime.now().plusDays(3))
                .fromLocation("Site A")
                .toLocation("Workshop B")
                .stepCost(new BigDecimal("200.00"))
                .build();

        maintenanceService.handoffToNextStep(createdStep1.getId(), step2);

        // Verify handoff
        MaintenanceRecordDto updatedRecord = maintenanceService.getMaintenanceRecord(createdRecord.getId());
        assertEquals("Person B", updatedRecord.getCurrentResponsiblePerson());
        assertEquals("+1-555-0002", updatedRecord.getCurrentResponsiblePhone());
        
        List<MaintenanceStepDto> steps = maintenanceService.getMaintenanceSteps(createdRecord.getId());
        assertEquals(2, steps.size());
        assertTrue(steps.get(0).getIsCompleted()); // First step should be completed
        assertFalse(steps.get(1).getIsCompleted()); // Second step should be active
        
        System.out.println("=== Handoff Test Results ===");
        System.out.println("Equipment: " + updatedRecord.getEquipmentName());
        System.out.println("Current Responsible Person: " + updatedRecord.getCurrentResponsiblePerson());
        System.out.println("Current Responsible Phone: " + updatedRecord.getCurrentResponsiblePhone());
        System.out.println("Total Steps: " + steps.size());
        System.out.println("Completed Steps: " + updatedRecord.getCompletedSteps());
        System.out.println("Active Steps: " + updatedRecord.getActiveSteps());
    }
} 