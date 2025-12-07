package com.example.backend.services;

import com.example.backend.dtos.*;
import com.example.backend.exceptions.MaintenanceException;
import com.example.backend.models.contact.Contact;
import com.example.backend.models.equipment.Equipment;
import com.example.backend.models.hr.Employee;
import com.example.backend.models.maintenance.*;
import com.example.backend.models.maintenance.DirectPurchaseTicket.DirectPurchaseStatus;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.site.Site;
import com.example.backend.models.user.Role;
import com.example.backend.models.user.User;
import com.example.backend.repositories.*;
import com.example.backend.repositories.equipment.EquipmentRepository;
import com.example.backend.repositories.hr.EmployeeRepository;
import com.example.backend.repositories.merchant.MerchantRepository;
import com.example.backend.repositories.site.SiteRepository;
import com.example.backend.repositories.user.UserRepository;
import com.example.backend.services.notification.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Comprehensive test suite for DirectPurchaseTicketService
 * Tests all workflows: Legacy, New 4-Step, Edge Cases, Validations
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("DirectPurchaseTicket Service Tests")
public class DirectPurchaseTicketServiceTest {

    @Mock
    private DirectPurchaseTicketRepository ticketRepository;
    @Mock
    private DirectPurchaseStepRepository stepRepository;
    @Mock
    private DirectPurchaseItemRepository itemRepository;
    @Mock
    private EquipmentRepository equipmentRepository;
    @Mock
    private MerchantRepository merchantRepository;
    @Mock
    private ContactRepository contactRepository;
    @Mock
    private SiteRepository siteRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private DirectPurchaseTicketService service;

    private Equipment mockEquipment;
    private Merchant mockMerchant;
    private User mockUser;
    private Site mockSite;
    private Contact mockContact;
    private Employee mockEmployee;

    @BeforeEach
    void setUp() {
        // Setup common mock objects
        mockEquipment = createMockEquipment();
        mockMerchant = createMockMerchant();
        mockUser = createMockUser();
        mockSite = createMockSite();
        mockContact = createMockContact();
        mockEmployee = createMockEmployee();

        // Setup authentication context
        setupSecurityContext();
    }

    // ==================== NESTED TEST CLASSES ====================

    @Nested
    @DisplayName("Step 1 - Creation Tests")
    class Step1CreationTests {

        @Test
        @DisplayName("Should create new workflow ticket successfully")
        void shouldCreateNewWorkflowTicketSuccessfully() {
            // Given
            CreateDirectPurchaseStep1Dto dto = createStep1Dto();
            DirectPurchaseTicket savedTicket = createMockNewWorkflowTicket();

            when(equipmentRepository.findById(any(UUID.class))).thenReturn(Optional.of(mockEquipment));
            when(userRepository.findById(any(UUID.class))).thenReturn(Optional.of(mockUser));
            when(userRepository.findByUsername(anyString())).thenReturn(Optional.of(mockUser));
            when(ticketRepository.save(any(DirectPurchaseTicket.class))).thenReturn(savedTicket);
            when(itemRepository.save(any(DirectPurchaseItem.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(itemRepository.findByDirectPurchaseTicketId(any(UUID.class))).thenReturn(new ArrayList<>());

            // When
            DirectPurchaseTicketDetailsDto result = service.createTicketStep1(dto);

            // Then
            assertNotNull(result);
            assertEquals(savedTicket.getId(), result.getId());
            assertEquals(dto.getTitle(), result.getTitle());
            assertFalse(result.getIsLegacyTicket());
            assertEquals(DirectPurchaseWorkflowStep.CREATION, result.getCurrentStep());
            assertFalse(result.getStep1Completed());

            verify(ticketRepository, times(1)).save(any(DirectPurchaseTicket.class));
            verify(itemRepository, times(dto.getItems().size())).save(any(DirectPurchaseItem.class));
        }

        @Test
        @DisplayName("Should fail when equipment not found")
        void shouldFailWhenEquipmentNotFound() {
            // Given
            CreateDirectPurchaseStep1Dto dto = createStep1Dto();
            when(equipmentRepository.findById(any(UUID.class))).thenReturn(Optional.empty());

            // When & Then
            assertThrows(MaintenanceException.class, () -> service.createTicketStep1(dto));
            verify(ticketRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should fail when no items provided")
        void shouldFailWhenNoItemsProvided() {
            // Given
            CreateDirectPurchaseStep1Dto dto = createStep1Dto();
            dto.setItems(new ArrayList<>());

            when(equipmentRepository.findById(any(UUID.class))).thenReturn(Optional.of(mockEquipment));
            when(userRepository.findById(any(UUID.class))).thenReturn(Optional.of(mockUser));

            // When & Then
            assertThrows(MaintenanceException.class, () -> service.createTicketStep1(dto));
        }

        @Test
        @DisplayName("Should use current authenticated user when responsible user not provided")
        void shouldUseCurrentAuthenticatedUser() {
            // Given
            CreateDirectPurchaseStep1Dto dto = createStep1Dto();
            dto.setResponsibleUserId(null);
            DirectPurchaseTicket savedTicket = createMockNewWorkflowTicket();

            when(equipmentRepository.findById(any(UUID.class))).thenReturn(Optional.of(mockEquipment));
            when(userRepository.findByUsername(anyString())).thenReturn(Optional.of(mockUser));
            when(userRepository.findById(any(UUID.class))).thenReturn(Optional.of(mockUser));
            when(ticketRepository.save(any(DirectPurchaseTicket.class))).thenReturn(savedTicket);
            when(itemRepository.save(any(DirectPurchaseItem.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(itemRepository.findByDirectPurchaseTicketId(any(UUID.class))).thenReturn(new ArrayList<>());

            // When
            DirectPurchaseTicketDetailsDto result = service.createTicketStep1(dto);

            // Then
            assertNotNull(result);
            verify(userRepository, times(1)).findByUsername(anyString());
        }

        @Test
        @DisplayName("Should complete Step 1 successfully")
        void shouldCompleteStep1Successfully() {
            // Given
            UUID ticketId = UUID.randomUUID();
            DirectPurchaseTicket ticket = createMockNewWorkflowTicket();
            ticket.setStep1Completed(false);
            DirectPurchaseItem item = createMockItem(ticket);
            ticket.getItems().add(item);
            List<DirectPurchaseItem> items = Arrays.asList(item);

            when(ticketRepository.findById(ticketId)).thenReturn(Optional.of(ticket));
            when(itemRepository.findByDirectPurchaseTicketId(ticketId)).thenReturn(items);
            when(ticketRepository.save(any(DirectPurchaseTicket.class))).thenAnswer(invocation -> {
                DirectPurchaseTicket t = invocation.getArgument(0);
                t.setStep1Completed(true);
                t.setCurrentStep(DirectPurchaseWorkflowStep.PURCHASING);
                return t;
            });
            when(stepRepository.findByDirectPurchaseTicketIdOrderByStepNumberAsc(any(UUID.class))).thenReturn(new ArrayList<>());

            // When
            DirectPurchaseTicketDetailsDto result = service.completeStep1(ticketId);

            // Then
            assertNotNull(result);
            assertTrue(result.getStep1Completed());
            assertEquals(DirectPurchaseWorkflowStep.PURCHASING, result.getCurrentStep());
            verify(ticketRepository, times(1)).save(any(DirectPurchaseTicket.class));
        }

        @Test
        @DisplayName("Should fail to complete Step 1 when no items")
        void shouldFailToCompleteStep1WhenNoItems() {
            // Given
            UUID ticketId = UUID.randomUUID();
            DirectPurchaseTicket ticket = createMockNewWorkflowTicket();

            when(ticketRepository.findById(ticketId)).thenReturn(Optional.of(ticket));
            when(itemRepository.findByDirectPurchaseTicketId(ticketId)).thenReturn(new ArrayList<>());

            // When & Then
            assertThrows(MaintenanceException.class, () -> service.completeStep1(ticketId));
        }
    }

    @Nested
    @DisplayName("Step 2 - Purchasing Tests")
    class Step2PurchasingTests {

        @Test
        @DisplayName("Should update Step 2 successfully")
        void shouldUpdateStep2Successfully() {
            // Given
            UUID ticketId = UUID.randomUUID();
            DirectPurchaseTicket ticket = createMockNewWorkflowTicket();
            ticket.setStep1Completed(true);
            ticket.setCurrentStep(DirectPurchaseWorkflowStep.PURCHASING);

            UpdateDirectPurchaseStep2Dto dto = createStep2Dto();
            DirectPurchaseItem item = createMockItem(ticket);
            ticket.getItems().add(item);

            when(ticketRepository.findById(ticketId)).thenReturn(Optional.of(ticket));
            when(merchantRepository.findById(any(UUID.class))).thenReturn(Optional.of(mockMerchant));
            when(itemRepository.findById(any(UUID.class))).thenReturn(Optional.of(item));
            when(ticketRepository.save(any(DirectPurchaseTicket.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(itemRepository.save(any(DirectPurchaseItem.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(stepRepository.findByDirectPurchaseTicketIdOrderByStepNumberAsc(any(UUID.class))).thenReturn(new ArrayList<>());
            when(itemRepository.findByDirectPurchaseTicketId(any(UUID.class))).thenReturn(Arrays.asList(item));

            // When
            DirectPurchaseTicketDetailsDto result = service.updateStep2(ticketId, dto);

            // Then
            assertNotNull(result);
            verify(ticketRepository, times(1)).save(any(DirectPurchaseTicket.class));
        }

        @Test
        @DisplayName("Should fail to update Step 2 when merchant not found")
        void shouldFailWhenMerchantNotFound() {
            // Given
            UUID ticketId = UUID.randomUUID();
            DirectPurchaseTicket ticket = createMockNewWorkflowTicket();
            ticket.setCurrentStep(DirectPurchaseWorkflowStep.PURCHASING);
            UpdateDirectPurchaseStep2Dto dto = createStep2Dto();

            when(ticketRepository.findById(ticketId)).thenReturn(Optional.of(ticket));
            when(merchantRepository.findById(any(UUID.class))).thenReturn(Optional.empty());

            // When & Then
            assertThrows(MaintenanceException.class, () -> service.updateStep2(ticketId, dto));
        }

        @Test
        @DisplayName("Should complete Step 2 successfully")
        void shouldCompleteStep2Successfully() {
            // Given
            UUID ticketId = UUID.randomUUID();
            DirectPurchaseTicket ticket = createMockNewWorkflowTicket();
            ticket.setStep1Completed(true);
            ticket.setCurrentStep(DirectPurchaseWorkflowStep.PURCHASING);
            ticket.setMerchant(mockMerchant);

            DirectPurchaseItem item = createMockItem(ticket);
            item.setExpectedCostPerUnit(BigDecimal.TEN);
            ticket.getItems().add(item);

            when(ticketRepository.findById(ticketId)).thenReturn(Optional.of(ticket));
            when(itemRepository.findByDirectPurchaseTicketId(ticketId)).thenReturn(Arrays.asList(item));
            when(ticketRepository.save(any(DirectPurchaseTicket.class))).thenAnswer(invocation -> {
                DirectPurchaseTicket t = invocation.getArgument(0);
                t.setStep2Completed(true);
                t.setCurrentStep(DirectPurchaseWorkflowStep.FINALIZE_PURCHASING);
                return t;
            });
            when(stepRepository.findByDirectPurchaseTicketIdOrderByStepNumberAsc(any(UUID.class))).thenReturn(new ArrayList<>());

            // When
            DirectPurchaseTicketDetailsDto result = service.completeStep2(ticketId);

            // Then
            assertNotNull(result);
            assertTrue(result.getStep2Completed());
            assertEquals(DirectPurchaseWorkflowStep.FINALIZE_PURCHASING, result.getCurrentStep());
        }

        @Test
        @DisplayName("Should fail to complete Step 2 when merchant not set")
        void shouldFailToCompleteStep2WhenMerchantNotSet() {
            // Given
            UUID ticketId = UUID.randomUUID();
            DirectPurchaseTicket ticket = createMockNewWorkflowTicket();
            ticket.setCurrentStep(DirectPurchaseWorkflowStep.PURCHASING);
            ticket.setMerchant(null);

            when(ticketRepository.findById(ticketId)).thenReturn(Optional.of(ticket));

            // When & Then
            assertThrows(MaintenanceException.class, () -> service.completeStep2(ticketId));
        }

        @Test
        @DisplayName("Should fail to complete Step 2 when items missing expected costs")
        void shouldFailToCompleteStep2WhenItemsMissingCosts() {
            // Given
            UUID ticketId = UUID.randomUUID();
            DirectPurchaseTicket ticket = createMockNewWorkflowTicket();
            ticket.setCurrentStep(DirectPurchaseWorkflowStep.PURCHASING);
            ticket.setMerchant(mockMerchant);

            DirectPurchaseItem item = createMockItem(ticket);
            item.setExpectedCostPerUnit(null); // Missing cost
            ticket.getItems().add(item);

            when(ticketRepository.findById(ticketId)).thenReturn(Optional.of(ticket));
            when(itemRepository.findByDirectPurchaseTicketId(ticketId)).thenReturn(Arrays.asList(item));

            // When & Then
            assertThrows(MaintenanceException.class, () -> service.completeStep2(ticketId));
        }
    }

    @Nested
    @DisplayName("Step 3 - Finalize Purchasing Tests")
    class Step3FinalizePurchasingTests {

        @Test
        @DisplayName("Should update Step 3 successfully")
        void shouldUpdateStep3Successfully() {
            // Given
            UUID ticketId = UUID.randomUUID();
            DirectPurchaseTicket ticket = createMockNewWorkflowTicket();
            ticket.setStep2Completed(true);
            ticket.setCurrentStep(DirectPurchaseWorkflowStep.FINALIZE_PURCHASING);

            UpdateDirectPurchaseStep3Dto dto = createStep3Dto();
            DirectPurchaseItem item = createMockItem(ticket);
            item.setExpectedCostPerUnit(BigDecimal.TEN);
            ticket.getItems().add(item);

            when(ticketRepository.findById(ticketId)).thenReturn(Optional.of(ticket));
            when(itemRepository.findById(any(UUID.class))).thenReturn(Optional.of(item));
            when(itemRepository.save(any(DirectPurchaseItem.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(ticketRepository.save(any(DirectPurchaseTicket.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(stepRepository.findByDirectPurchaseTicketIdOrderByStepNumberAsc(any(UUID.class))).thenReturn(new ArrayList<>());
            when(itemRepository.findByDirectPurchaseTicketId(any(UUID.class))).thenReturn(Arrays.asList(item));

            // When
            DirectPurchaseTicketDetailsDto result = service.updateStep3(ticketId, dto);

            // Then
            assertNotNull(result);
            verify(itemRepository, times(dto.getItems().size())).save(any(DirectPurchaseItem.class));
        }

        @Test
        @DisplayName("Should complete Step 3 successfully")
        void shouldCompleteStep3Successfully() {
            // Given
            UUID ticketId = UUID.randomUUID();
            DirectPurchaseTicket ticket = createMockNewWorkflowTicket();
            ticket.setStep2Completed(true);
            ticket.setCurrentStep(DirectPurchaseWorkflowStep.FINALIZE_PURCHASING);

            DirectPurchaseItem item = createMockItem(ticket);
            item.setExpectedCostPerUnit(BigDecimal.TEN);
            item.setActualCostPerUnit(new BigDecimal("12.00"));
            ticket.getItems().add(item);

            when(ticketRepository.findById(ticketId)).thenReturn(Optional.of(ticket));
            when(itemRepository.findByDirectPurchaseTicketId(ticketId)).thenReturn(Arrays.asList(item));
            when(ticketRepository.save(any(DirectPurchaseTicket.class))).thenAnswer(invocation -> {
                DirectPurchaseTicket t = invocation.getArgument(0);
                t.setStep3Completed(true);
                t.setCurrentStep(DirectPurchaseWorkflowStep.TRANSPORTING);
                return t;
            });
            when(stepRepository.findByDirectPurchaseTicketIdOrderByStepNumberAsc(any(UUID.class))).thenReturn(new ArrayList<>());

            // When
            DirectPurchaseTicketDetailsDto result = service.completeStep3(ticketId);

            // Then
            assertNotNull(result);
            assertTrue(result.getStep3Completed());
            assertEquals(DirectPurchaseWorkflowStep.TRANSPORTING, result.getCurrentStep());
        }

        @Test
        @DisplayName("Should fail to complete Step 3 when items missing actual costs")
        void shouldFailToCompleteStep3WhenItemsMissingActualCosts() {
            // Given
            UUID ticketId = UUID.randomUUID();
            DirectPurchaseTicket ticket = createMockNewWorkflowTicket();
            ticket.setCurrentStep(DirectPurchaseWorkflowStep.FINALIZE_PURCHASING);

            DirectPurchaseItem item = createMockItem(ticket);
            item.setActualCostPerUnit(null); // Missing actual cost
            ticket.getItems().add(item);

            when(ticketRepository.findById(ticketId)).thenReturn(Optional.of(ticket));
            when(itemRepository.findByDirectPurchaseTicketId(ticketId)).thenReturn(Arrays.asList(item));

            // When & Then
            assertThrows(MaintenanceException.class, () -> service.completeStep3(ticketId));
        }
    }

    @Nested
    @DisplayName("Step 4 - Transporting Tests")
    class Step4TransportingTests {

        @Test
        @DisplayName("Should update Step 4 successfully")
        void shouldUpdateStep4Successfully() {
            // Given
            UUID ticketId = UUID.randomUUID();
            DirectPurchaseTicket ticket = createMockNewWorkflowTicket();
            ticket.setStep3Completed(true);
            ticket.setCurrentStep(DirectPurchaseWorkflowStep.TRANSPORTING);

            UpdateDirectPurchaseStep4Dto dto = createStep4Dto();

            when(ticketRepository.findById(ticketId)).thenReturn(Optional.of(ticket));
            when(siteRepository.findById(any(UUID.class))).thenReturn(Optional.of(mockSite));
            when(contactRepository.findById(any(UUID.class))).thenReturn(Optional.of(mockContact));
            when(ticketRepository.save(any(DirectPurchaseTicket.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(stepRepository.findByDirectPurchaseTicketIdOrderByStepNumberAsc(any(UUID.class))).thenReturn(new ArrayList<>());
            when(itemRepository.findByDirectPurchaseTicketId(any(UUID.class))).thenReturn(new ArrayList<>());

            // When
            DirectPurchaseTicketDetailsDto result = service.updateStep4(ticketId, dto);

            // Then
            assertNotNull(result);
            verify(ticketRepository, times(1)).save(any(DirectPurchaseTicket.class));
        }

        @Test
        @DisplayName("Should fail when both contact and employee set as responsible")
        void shouldFailWhenBothContactAndEmployeeSet() {
            // Given
            UUID ticketId = UUID.randomUUID();
            DirectPurchaseTicket ticket = createMockNewWorkflowTicket();
            ticket.setCurrentStep(DirectPurchaseWorkflowStep.TRANSPORTING);

            UpdateDirectPurchaseStep4Dto dto = createStep4Dto();
            dto.setTransportResponsibleEmployeeId(UUID.randomUUID()); // Set both

            when(ticketRepository.findById(ticketId)).thenReturn(Optional.of(ticket));

            // When & Then
            assertThrows(MaintenanceException.class, () -> service.updateStep4(ticketId, dto));
        }

        @Test
        @DisplayName("Should complete Step 4 and mark ticket as COMPLETED")
        void shouldCompleteStep4AndMarkTicketCompleted() {
            // Given
            UUID ticketId = UUID.randomUUID();
            DirectPurchaseTicket ticket = createMockNewWorkflowTicket();
            ticket.setStep3Completed(true);
            ticket.setCurrentStep(DirectPurchaseWorkflowStep.TRANSPORTING);
            ticket.setTransportFromLocation("Warehouse A");
            ticket.setTransportToSite(mockSite);
            ticket.setActualTransportationCost(new BigDecimal("500.00"));
            ticket.setTransportResponsibleContact(mockContact);

            when(ticketRepository.findById(ticketId)).thenReturn(Optional.of(ticket));
            when(ticketRepository.save(any(DirectPurchaseTicket.class))).thenAnswer(invocation -> {
                DirectPurchaseTicket t = invocation.getArgument(0);
                t.setStep4Completed(true);
                t.setCurrentStep(DirectPurchaseWorkflowStep.COMPLETED);
                t.setStatus(DirectPurchaseStatus.COMPLETED);
                return t;
            });
            when(stepRepository.findByDirectPurchaseTicketIdOrderByStepNumberAsc(any(UUID.class))).thenReturn(new ArrayList<>());
            when(itemRepository.findByDirectPurchaseTicketId(any(UUID.class))).thenReturn(new ArrayList<>());

            // When
            DirectPurchaseTicketDetailsDto result = service.completeStep4(ticketId);

            // Then
            assertNotNull(result);
            assertTrue(result.getStep4Completed());
            assertEquals(DirectPurchaseWorkflowStep.COMPLETED, result.getCurrentStep());
            assertEquals(DirectPurchaseStatus.COMPLETED, result.getStatus());
        }

        @Test
        @DisplayName("Should fail to complete Step 4 when transport location missing")
        void shouldFailToCompleteStep4WhenLocationMissing() {
            // Given
            UUID ticketId = UUID.randomUUID();
            DirectPurchaseTicket ticket = createMockNewWorkflowTicket();
            ticket.setCurrentStep(DirectPurchaseWorkflowStep.TRANSPORTING);
            ticket.setTransportFromLocation(null); // Missing

            when(ticketRepository.findById(ticketId)).thenReturn(Optional.of(ticket));

            // When & Then
            assertThrows(MaintenanceException.class, () -> service.completeStep4(ticketId));
        }

        @Test
        @DisplayName("Should fail to complete Step 4 when transport cost missing")
        void shouldFailToCompleteStep4WhenCostMissing() {
            // Given
            UUID ticketId = UUID.randomUUID();
            DirectPurchaseTicket ticket = createMockNewWorkflowTicket();
            ticket.setCurrentStep(DirectPurchaseWorkflowStep.TRANSPORTING);
            ticket.setTransportFromLocation("Location A");
            ticket.setTransportToSite(mockSite);
            ticket.setActualTransportationCost(null); // Missing

            when(ticketRepository.findById(ticketId)).thenReturn(Optional.of(ticket));

            // When & Then
            assertThrows(MaintenanceException.class, () -> service.completeStep4(ticketId));
        }
    }

    @Nested
    @DisplayName("Legacy Ticket Tests")
    class LegacyTicketTests {

        @Test
        @DisplayName("Should create legacy ticket successfully")
        void shouldCreateLegacyTicketSuccessfully() {
            // Given
            CreateDirectPurchaseTicketDto dto = createLegacyTicketDto();
            DirectPurchaseTicket savedTicket = createMockLegacyTicket();

            when(equipmentRepository.findById(any(UUID.class))).thenReturn(Optional.of(mockEquipment));
            when(merchantRepository.findById(any(UUID.class))).thenReturn(Optional.of(mockMerchant));
            when(userRepository.findById(any(UUID.class))).thenReturn(Optional.of(mockUser));
            when(userRepository.findByUsername(anyString())).thenReturn(Optional.of(mockUser));
            when(ticketRepository.save(any(DirectPurchaseTicket.class))).thenReturn(savedTicket);
            when(stepRepository.save(any(DirectPurchaseStep.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(stepRepository.findByDirectPurchaseTicketIdOrderByStepNumberAsc(any(UUID.class))).thenReturn(new ArrayList<>());

            // When
            DirectPurchaseTicketDetailsDto result = service.createTicket(dto);

            // Then
            assertNotNull(result);
            assertEquals(savedTicket.getId(), result.getId());
            verify(ticketRepository, times(1)).save(any(DirectPurchaseTicket.class));
            verify(stepRepository, times(2)).save(any(DirectPurchaseStep.class)); // 2 auto-generated steps
        }

        @Test
        @DisplayName("Should fail to use new workflow methods on legacy tickets")
        void shouldFailToUseNewWorkflowMethodsOnLegacyTickets() {
            // Given
            UUID ticketId = UUID.randomUUID();
            DirectPurchaseTicket ticket = createMockLegacyTicket();

            when(ticketRepository.findById(ticketId)).thenReturn(Optional.of(ticket));

            // When & Then
            assertThrows(MaintenanceException.class, () -> service.completeStep1(ticketId));
            assertThrows(MaintenanceException.class, () -> service.updateStep2(ticketId, new UpdateDirectPurchaseStep2Dto()));
        }
    }

    @Nested
    @DisplayName("CRUD Operation Tests")
    class CrudOperationTests {

        @Test
        @DisplayName("Should get ticket by ID successfully")
        void shouldGetTicketByIdSuccessfully() {
            // Given
            UUID ticketId = UUID.randomUUID();
            DirectPurchaseTicket ticket = createMockNewWorkflowTicket();

            when(ticketRepository.findById(ticketId)).thenReturn(Optional.of(ticket));
            when(stepRepository.findByDirectPurchaseTicketIdOrderByStepNumberAsc(ticketId)).thenReturn(new ArrayList<>());
            when(itemRepository.findByDirectPurchaseTicketId(ticketId)).thenReturn(new ArrayList<>());


            DirectPurchaseTicketDetailsDto result = service.getTicketById(ticketId);

            // Then
            assertNotNull(result);
            assertEquals(ticket.getId(), result.getId());
        }

        @Test
        @DisplayName("Should fail to get ticket when ID not found")
        void shouldFailToGetTicketWhenIdNotFound() {
            // Given
            UUID ticketId = UUID.randomUUID();
            when(ticketRepository.findById(ticketId)).thenReturn(Optional.empty());

            // When & Then
            assertThrows(MaintenanceException.class, () -> service.getTicketById(ticketId));
        }

        @Test
        @DisplayName("Should get all tickets successfully")
        void shouldGetAllTicketsSuccessfully() {
            // Given
            List<DirectPurchaseTicket> tickets = Arrays.asList(
                createMockNewWorkflowTicket(),
                createMockLegacyTicket()
            );

            when(ticketRepository.findAllByOrderByCreatedAtDesc()).thenReturn(tickets);
            when(stepRepository.findByDirectPurchaseTicketIdOrderByStepNumberAsc(any(UUID.class))).thenReturn(new ArrayList<>());

            // When
            List<DirectPurchaseTicketDto> result = service.getAllTickets();

            // Then
            assertNotNull(result);
            assertEquals(2, result.size());
        }

        @Test
        @DisplayName("Should get tickets by equipment")
        void shouldGetTicketsByEquipment() {
            // Given
            UUID equipmentId = UUID.randomUUID();
            List<DirectPurchaseTicket> tickets = Arrays.asList(createMockNewWorkflowTicket());

            when(ticketRepository.findByEquipmentIdOrderByCreatedAtDesc(equipmentId)).thenReturn(tickets);
            when(stepRepository.findByDirectPurchaseTicketIdOrderByStepNumberAsc(any(UUID.class))).thenReturn(new ArrayList<>());

            // When
            List<DirectPurchaseTicketDto> result = service.getTicketsByEquipment(equipmentId);

            // Then
            assertNotNull(result);
            assertEquals(1, result.size());
        }

        @Test
        @DisplayName("Should delete ticket successfully")
        void shouldDeleteTicketSuccessfully() {
            // Given
            UUID ticketId = UUID.randomUUID();
            DirectPurchaseTicket ticket = createMockNewWorkflowTicket();

            when(ticketRepository.findById(ticketId)).thenReturn(Optional.of(ticket));
            doNothing().when(ticketRepository).delete(any(DirectPurchaseTicket.class));

            // When
            service.deleteTicket(ticketId);

            // Then
            verify(ticketRepository, times(1)).delete(ticket);
        }
    }

    @Nested
    @DisplayName("Edge Cases and Validation Tests")
    class EdgeCaseTests {

        @Test
        @DisplayName("Should handle null expected cost in Step 1")
        void shouldHandleNullExpectedCost() {
            // Given
            CreateDirectPurchaseStep1Dto dto = createStep1Dto();
            dto.setExpectedCost(null);
            DirectPurchaseTicket savedTicket = createMockNewWorkflowTicket();

            when(equipmentRepository.findById(any(UUID.class))).thenReturn(Optional.of(mockEquipment));
            when(userRepository.findById(any(UUID.class))).thenReturn(Optional.of(mockUser));
            when(ticketRepository.save(any(DirectPurchaseTicket.class))).thenReturn(savedTicket);
            when(itemRepository.save(any(DirectPurchaseItem.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(itemRepository.findByDirectPurchaseTicketId(any(UUID.class))).thenReturn(new ArrayList<>());

            // When
            DirectPurchaseTicketDetailsDto result = service.createTicketStep1(dto);

            // Then
            assertNotNull(result);
        }

        @Test
        @DisplayName("Should handle negative down payment validation")
        void shouldHandleNegativeDownPayment() {
            // Given
            UUID ticketId = UUID.randomUUID();
            DirectPurchaseTicket ticket = createMockNewWorkflowTicket();
            ticket.setCurrentStep(DirectPurchaseWorkflowStep.PURCHASING);

            UpdateDirectPurchaseStep2Dto dto = createStep2Dto();
            dto.setDownPayment(new BigDecimal("-100.00")); // Negative

            when(ticketRepository.findById(ticketId)).thenReturn(Optional.of(ticket));

            // When & Then
            assertThrows(MaintenanceException.class, () -> service.updateStep2(ticketId, dto));
        }

        @Test
        @DisplayName("Should handle negative transportation cost validation")
        void shouldHandleNegativeTransportationCost() {
            // Given
            UUID ticketId = UUID.randomUUID();
            DirectPurchaseTicket ticket = createMockNewWorkflowTicket();
            ticket.setCurrentStep(DirectPurchaseWorkflowStep.TRANSPORTING);

            UpdateDirectPurchaseStep4Dto dto = createStep4Dto();
            dto.setActualTransportationCost(new BigDecimal("-50.00")); // Negative

            when(ticketRepository.findById(ticketId)).thenReturn(Optional.of(ticket));

            // When & Then
            assertThrows(MaintenanceException.class, () -> service.updateStep4(ticketId, dto));
        }

        @Test
        @DisplayName("Should calculate total costs correctly")
        void shouldCalculateTotalCostsCorrectly() {
            // Given
            DirectPurchaseTicket ticket = createMockNewWorkflowTicket();
            ticket.setActualTotalPurchasingCost(new BigDecimal("1000.00"));
            ticket.setActualTransportationCost(new BigDecimal("200.00"));

            // When
            BigDecimal total = ticket.getTotalActualCost();

            // Then
            assertEquals(new BigDecimal("1200.00"), total);
        }

        @Test
        @DisplayName("Should calculate remaining payment correctly")
        void shouldCalculateRemainingPaymentCorrectly() {
            // Given
            DirectPurchaseTicket ticket = createMockNewWorkflowTicket();
            ticket.setActualTotalPurchasingCost(new BigDecimal("1000.00"));
            ticket.setDownPayment(new BigDecimal("300.00"));

            // When
            BigDecimal remaining = ticket.calculateRemainingPayment();

            // Then
            assertEquals(new BigDecimal("700.00"), remaining);
        }

        @Test
        @DisplayName("Should validate user role for responsible user")
        void shouldValidateUserRoleForResponsibleUser() {
            // Given
            CreateDirectPurchaseStep1Dto dto = createStep1Dto();
            User invalidUser = createMockUser();
            invalidUser.setRole(Role.USER); // Invalid role (not maintenance/admin)

            when(equipmentRepository.findById(any(UUID.class))).thenReturn(Optional.of(mockEquipment));
            when(userRepository.findById(any(UUID.class))).thenReturn(Optional.of(invalidUser));

            // When & Then
            assertThrows(MaintenanceException.class, () -> service.createTicketStep1(dto));
        }
    }

    // ==================== HELPER METHODS ====================

    private void setupSecurityContext() {
        // Use the 3-argument constructor to create an authenticated token
        Authentication auth = new UsernamePasswordAuthenticationToken("testuser", "password", new ArrayList<>());
        SecurityContext securityContext = mock(SecurityContext.class);
        when(securityContext.getAuthentication()).thenReturn(auth);
        SecurityContextHolder.setContext(securityContext);
    }

    private Equipment createMockEquipment() {
        Equipment equipment = new Equipment();
        equipment.setId(UUID.randomUUID());
        equipment.setName("Excavator");
        equipment.setModel("CAT 320");
        equipment.setSerialNumber("SN12345");
        return equipment;
    }

    private Merchant createMockMerchant() {
        Merchant merchant = new Merchant();
        merchant.setId(UUID.randomUUID());
        merchant.setName("Parts Supplier Co.");
        return merchant;
    }

    private User createMockUser() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setUsername("testuser");
        user.setFirstName("John");
        user.setLastName("Doe");
        user.setRole(Role.MAINTENANCE_MANAGER);
        return user;
    }

    private Site createMockSite() {
        Site site = new Site();
        site.setId(UUID.randomUUID());
        site.setName("Main Site");
        return site;
    }

    private Contact createMockContact() {
        Contact contact = new Contact();
        contact.setId(UUID.randomUUID());
        contact.setFirstName("Jane");
        contact.setLastName("Smith");
        contact.setPhoneNumber("555-1234");
        contact.setEmail("jane@example.com");
        return contact;
    }

    private Employee createMockEmployee() {
        Employee employee = new Employee();
        employee.setId(UUID.randomUUID());
        employee.setFirstName("Bob");
        employee.setLastName("Wilson");
        employee.setPhoneNumber("555-5678");
        employee.setEmail("bob@example.com");
        return employee;
    }

    private DirectPurchaseTicket createMockNewWorkflowTicket() {
        DirectPurchaseTicket ticket = new DirectPurchaseTicket();
        ticket.setId(UUID.randomUUID());
        ticket.setEquipment(mockEquipment);
        ticket.setResponsibleUser(mockUser);
        ticket.setTitle("Test Purchase");
        ticket.setDescription("Test Description");
        ticket.setIsLegacyTicket(false);
        ticket.setCurrentStep(DirectPurchaseWorkflowStep.CREATION);
        ticket.setStep1Completed(false);
        ticket.setStep2Completed(false);
        ticket.setStep3Completed(false);
        ticket.setStep4Completed(false);
        ticket.setStatus(DirectPurchaseStatus.IN_PROGRESS);
        ticket.setCreatedAt(LocalDateTime.now());
        ticket.setItems(new ArrayList<>());
        return ticket;
    }

    private DirectPurchaseTicket createMockLegacyTicket() {
        DirectPurchaseTicket ticket = new DirectPurchaseTicket();
        ticket.setId(UUID.randomUUID());
        ticket.setEquipment(mockEquipment);
        ticket.setMerchant(mockMerchant);
        ticket.setResponsibleUser(mockUser);
        ticket.setIsLegacyTicket(true);
        ticket.setSparePart("Engine Part");
        ticket.setExpectedPartsCost(new BigDecimal("500.00"));
        ticket.setExpectedTransportationCost(new BigDecimal("100.00"));
        ticket.setStatus(DirectPurchaseStatus.IN_PROGRESS);
        ticket.setCreatedAt(LocalDateTime.now());
        return ticket;
    }

    private DirectPurchaseItem createMockItem(DirectPurchaseTicket ticket) {
        DirectPurchaseItem item = new DirectPurchaseItem();
        item.setId(UUID.randomUUID());
        item.setItemName("Test Item");
        item.setQuantity(2);
        item.setDirectPurchaseTicket(ticket);
        return item;
    }

    private CreateDirectPurchaseStep1Dto createStep1Dto() {
        DirectPurchaseItemDto itemDto = DirectPurchaseItemDto.builder()
            .itemName("Item 1")
            .quantity(2)
            .build();

        return CreateDirectPurchaseStep1Dto.builder()
            .title("Test Purchase")
            .description("Test Description")
            .equipmentId(UUID.randomUUID())
            .responsibleUserId(UUID.randomUUID())
            .expectedCost(new BigDecimal("1000.00"))
            .expectedEndDate(LocalDate.now().plusDays(30))
            .items(Arrays.asList(itemDto))
            .build();
    }

    private UpdateDirectPurchaseStep2Dto createStep2Dto() {
        DirectPurchaseItemDto itemDto = DirectPurchaseItemDto.builder()
            .id(UUID.randomUUID())
            .expectedCostPerUnit(new BigDecimal("50.00"))
            .build();

        return UpdateDirectPurchaseStep2Dto.builder()
            .merchantId(UUID.randomUUID())
            .downPayment(new BigDecimal("200.00"))
            .items(Arrays.asList(itemDto))
            .build();
    }

    private UpdateDirectPurchaseStep3Dto createStep3Dto() {
        DirectPurchaseItemDto itemDto = DirectPurchaseItemDto.builder()
            .id(UUID.randomUUID())
            .actualCostPerUnit(new BigDecimal("55.00"))
            .build();

        return UpdateDirectPurchaseStep3Dto.builder()
            .items(Arrays.asList(itemDto))
            .build();
    }

    private UpdateDirectPurchaseStep4Dto createStep4Dto() {
        return UpdateDirectPurchaseStep4Dto.builder()
            .transportFromLocation("Warehouse A")
            .transportToSiteId(UUID.randomUUID())
            .actualTransportationCost(new BigDecimal("150.00"))
            .transportResponsibleContactId(UUID.randomUUID())
            .build();
    }

    private CreateDirectPurchaseTicketDto createLegacyTicketDto() {
        return CreateDirectPurchaseTicketDto.builder()
            .equipmentId(UUID.randomUUID())
            .merchantId(UUID.randomUUID())
            .responsibleUserId(UUID.randomUUID())
            .sparePart("Engine Part")
            .expectedPartsCost(new BigDecimal("500.00"))
            .expectedTransportationCost(new BigDecimal("100.00"))
            .description("Legacy ticket test")
            .build();
    }
}
