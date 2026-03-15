package com.example.backend.services.finance.incomingPayments;

import com.example.backend.dto.finance.incomingPayments.ConfirmIncomingPaymentRequestDTO;
import com.example.backend.dto.finance.incomingPayments.IncomingPaymentRequestResponseDTO;
import com.example.backend.models.finance.balances.AccountType;
import com.example.backend.models.finance.balances.BankAccount;
import com.example.backend.models.finance.balances.CashSafe;
import com.example.backend.models.finance.balances.CashWithPerson;
import com.example.backend.models.finance.incomingPayments.IncomingPaymentRequest;
import com.example.backend.models.finance.incomingPayments.IncomingPaymentRequestItem;
import com.example.backend.models.finance.incomingPayments.IncomingPaymentSource;
import com.example.backend.models.finance.incomingPayments.IncomingPaymentStatus;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrder;
import com.example.backend.models.procurement.PurchaseOrderReturn.PurchaseOrderReturn;
import com.example.backend.models.procurement.PurchaseOrderReturn.PurchaseOrderReturnStatus;
import com.example.backend.repositories.finance.balances.BankAccountRepository;
import com.example.backend.repositories.finance.balances.CashSafeRepository;
import com.example.backend.repositories.finance.balances.CashWithPersonRepository;
import com.example.backend.repositories.finance.incomingPayments.IncomingPaymentRequestItemRepository;
import com.example.backend.repositories.finance.incomingPayments.IncomingPaymentRequestRepository;
import com.example.backend.repositories.merchant.MerchantRepository;
import com.example.backend.repositories.procurement.PurchaseOrderRepository;
import com.example.backend.repositories.procurement.PurchaseOrderReturnRepository;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Comprehensive unit tests for IncomingPaymentRequestService.
 *
 * All external dependencies are mocked via Mockito; no Spring context is
 * started. Tests are grouped by service method using @Nested classes so that
 * failures are pinpointed without reading test names out of context.
 *
 * Key design notes:
 *  - LENIENT strictness is required because several stubs set up in the
 *    helper factories are not consumed by every test in the nested class.
 *  - Helper objects (IncomingPaymentRequest, BankAccount, etc.) are built
 *    as real in-memory instances so that the private convertToDTO method
 *    can traverse their associations without NullPointerExceptions.
 *  - ArgumentCaptor is used wherever the saved entity itself must be
 *    inspected rather than just verifying that save() was called.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("IncomingPaymentRequestService")
public class IncomingPaymentRequestServiceTest {

    // =========================================================================
    // Mocked dependencies – must exactly match the @RequiredArgsConstructor
    // field order in IncomingPaymentRequestService so that @InjectMocks can
    // inject them via the generated all-args constructor.
    // =========================================================================

    @Mock
    private IncomingPaymentRequestRepository incomingPaymentRequestRepository;

    @Mock
    private IncomingPaymentRequestItemRepository incomingPaymentRequestItemRepository;

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;

    @Mock
    private MerchantRepository merchantRepository;

    @Mock
    private BankAccountRepository bankAccountRepository;

    @Mock
    private CashSafeRepository cashSafeRepository;

    @Mock
    private CashWithPersonRepository cashWithPersonRepository;

    @Mock
    private PurchaseOrderReturnRepository purchaseOrderReturnRepository;

    @InjectMocks
    private IncomingPaymentRequestService service;

    // =========================================================================
    // Helper factory methods
    // =========================================================================

    /**
     * Builds a fully-wired {@link IncomingPaymentRequest} backed by real
     * in-memory {@link PurchaseOrder} and {@link Merchant} objects.
     * <p>
     * The service's private {@code convertToDTO} method dereferences
     * {@code request.getPurchaseOrder().getId()},
     * {@code request.getMerchant().getName()}, etc., so those associations must
     * be non-null for any test that triggers DTO conversion.
     */
    private IncomingPaymentRequest createRequest(IncomingPaymentStatus status) {
        PurchaseOrder po = new PurchaseOrder();
        po.setId(UUID.randomUUID());
        po.setPoNumber("PO-001");

        Merchant merchant = new Merchant();
        merchant.setId(UUID.randomUUID());
        merchant.setName("Test Merchant");
        merchant.setContactPhone("123456789");
        merchant.setContactEmail("test@merchant.com");

        IncomingPaymentRequest request = new IncomingPaymentRequest();
        request.setId(UUID.randomUUID());
        request.setPurchaseOrder(po);
        request.setMerchant(merchant);
        request.setStatus(status);
        request.setSource(IncomingPaymentSource.REFUND);
        request.setTotalRefundAmount(BigDecimal.valueOf(500));
        request.setIncomingPaymentItems(new ArrayList<>());
        return request;
    }

    /**
     * Variant of {@link #createRequest} that also sets the source and the
     * optional {@code sourceReferenceId} (used for PO_RETURN flows).
     */
    private IncomingPaymentRequest createRequestWithSource(
            IncomingPaymentStatus status,
            IncomingPaymentSource source,
            UUID sourceReferenceId) {

        IncomingPaymentRequest request = createRequest(status);
        request.setSource(source);
        request.setSourceReferenceId(sourceReferenceId);
        return request;
    }

    /**
     * Builds a {@link ConfirmIncomingPaymentRequestDTO} wired to the given
     * account type and account ID.
     */
    private ConfirmIncomingPaymentRequestDTO createConfirmDTO(
            AccountType accountType, UUID accountId) {

        ConfirmIncomingPaymentRequestDTO dto = new ConfirmIncomingPaymentRequestDTO();
        dto.setBalanceType(accountType);
        dto.setBalanceAccountId(accountId);
        dto.setDateReceived(LocalDate.now());
        dto.setFinanceNotes("Finance notes for test");
        return dto;
    }

    private BankAccount createBankAccount(BigDecimal balance) {
        BankAccount acc = new BankAccount();
        acc.setId(UUID.randomUUID());
        acc.setBankName("Test Bank");
        acc.setAccountNumber("ACC-123456");
        acc.setCurrentBalance(balance);
        acc.setAvailableBalance(balance);
        return acc;
    }

    private CashSafe createCashSafe(BigDecimal balance) {
        CashSafe safe = new CashSafe();
        safe.setId(UUID.randomUUID());
        safe.setSafeName("Main Safe");
        safe.setLocation("Head Office");
        safe.setCurrentBalance(balance);
        safe.setAvailableBalance(balance);
        return safe;
    }

    private CashWithPerson createCashWithPerson(BigDecimal balance) {
        CashWithPerson cwp = new CashWithPerson();
        cwp.setId(UUID.randomUUID());
        cwp.setPersonName("John Treasurer");
        cwp.setCurrentBalance(balance);
        cwp.setAvailableBalance(balance);
        return cwp;
    }

    // =========================================================================
    // getAllIncomingPaymentRequests()
    // =========================================================================

    @Nested
    @DisplayName("getAllIncomingPaymentRequests()")
    class GetAllIncomingPaymentRequests {

        @Test
        @DisplayName("happyPath_multipleRequests_shouldReturnMappedDTOList")
        void happyPath_multipleRequests_shouldReturnMappedDTOList() {
            IncomingPaymentRequest r1 = createRequest(IncomingPaymentStatus.PENDING);
            IncomingPaymentRequest r2 = createRequest(IncomingPaymentStatus.CONFIRMED);

            when(incomingPaymentRequestRepository.findAllByOrderByCreatedAtDesc())
                    .thenReturn(List.of(r1, r2));

            List<IncomingPaymentRequestResponseDTO> result =
                    service.getAllIncomingPaymentRequests();

            assertEquals(2, result.size());
            assertEquals(r1.getId(), result.get(0).getId());
            assertEquals(r2.getId(), result.get(1).getId());
            verify(incomingPaymentRequestRepository).findAllByOrderByCreatedAtDesc();
        }

        @Test
        @DisplayName("emptyRepository_shouldReturnEmptyList")
        void emptyRepository_shouldReturnEmptyList() {
            when(incomingPaymentRequestRepository.findAllByOrderByCreatedAtDesc())
                    .thenReturn(Collections.emptyList());

            List<IncomingPaymentRequestResponseDTO> result =
                    service.getAllIncomingPaymentRequests();

            assertTrue(result.isEmpty());
        }

        @Test
        @DisplayName("singleRequest_allDtoFieldsMappedCorrectly")
        void singleRequest_allDtoFieldsMappedCorrectly() {
            IncomingPaymentRequest request = createRequest(IncomingPaymentStatus.PENDING);
            request.setTotalRefundAmount(BigDecimal.valueOf(750));

            when(incomingPaymentRequestRepository.findAllByOrderByCreatedAtDesc())
                    .thenReturn(List.of(request));

            IncomingPaymentRequestResponseDTO dto =
                    service.getAllIncomingPaymentRequests().get(0);

            assertEquals(request.getId(), dto.getId());
            assertEquals(request.getPurchaseOrder().getId(), dto.getPurchaseOrderId());
            assertEquals("PO-001", dto.getPurchaseOrderNumber());
            assertEquals(request.getMerchant().getId(), dto.getMerchantId());
            assertEquals("Test Merchant", dto.getMerchantName());
            assertEquals("123456789", dto.getMerchantContactPhone());
            assertEquals("test@merchant.com", dto.getMerchantContactEmail());
            assertEquals(IncomingPaymentStatus.PENDING, dto.getStatus());
            assertEquals(IncomingPaymentSource.REFUND, dto.getSource());
            assertEquals(BigDecimal.valueOf(750), dto.getTotalAmount());
        }

        @Test
        @DisplayName("requestWithPoReturnSource_resolvesReturnIdViaRepository")
        void requestWithPoReturnSource_resolvesReturnIdViaRepository() {
            UUID poReturnId = UUID.randomUUID();
            IncomingPaymentRequest request = createRequestWithSource(
                    IncomingPaymentStatus.PENDING,
                    IncomingPaymentSource.PO_RETURN,
                    poReturnId);

            PurchaseOrderReturn poReturn = new PurchaseOrderReturn();
            poReturn.setId(poReturnId);
            poReturn.setReturnId("RET-000001");

            when(incomingPaymentRequestRepository.findAllByOrderByCreatedAtDesc())
                    .thenReturn(List.of(request));
            when(purchaseOrderReturnRepository.findById(poReturnId))
                    .thenReturn(Optional.of(poReturn));

            IncomingPaymentRequestResponseDTO dto =
                    service.getAllIncomingPaymentRequests().get(0);

            assertEquals("RET-000001", dto.getPurchaseOrderReturnId());
            verify(purchaseOrderReturnRepository).findById(poReturnId);
        }
    }

    // =========================================================================
    // getIncomingPaymentRequestsByStatus()
    // =========================================================================

    @Nested
    @DisplayName("getIncomingPaymentRequestsByStatus()")
    class GetByStatus {

        @Test
        @DisplayName("pendingStatus_shouldReturnOnlyPendingRequests")
        void pendingStatus_shouldReturnOnlyPendingRequests() {
            IncomingPaymentRequest r1 = createRequest(IncomingPaymentStatus.PENDING);
            IncomingPaymentRequest r2 = createRequest(IncomingPaymentStatus.PENDING);

            when(incomingPaymentRequestRepository
                    .findByStatusOrderByCreatedAtDesc(IncomingPaymentStatus.PENDING))
                    .thenReturn(List.of(r1, r2));

            List<IncomingPaymentRequestResponseDTO> result =
                    service.getIncomingPaymentRequestsByStatus(IncomingPaymentStatus.PENDING);

            assertEquals(2, result.size());
            result.forEach(dto ->
                    assertEquals(IncomingPaymentStatus.PENDING, dto.getStatus()));
        }

        @Test
        @DisplayName("confirmedStatus_shouldReturnOnlyConfirmedRequests")
        void confirmedStatus_shouldReturnOnlyConfirmedRequests() {
            IncomingPaymentRequest r = createRequest(IncomingPaymentStatus.CONFIRMED);

            when(incomingPaymentRequestRepository
                    .findByStatusOrderByCreatedAtDesc(IncomingPaymentStatus.CONFIRMED))
                    .thenReturn(List.of(r));

            List<IncomingPaymentRequestResponseDTO> result =
                    service.getIncomingPaymentRequestsByStatus(IncomingPaymentStatus.CONFIRMED);

            assertEquals(1, result.size());
            assertEquals(IncomingPaymentStatus.CONFIRMED, result.get(0).getStatus());
        }

        @Test
        @DisplayName("noMatchForStatus_shouldReturnEmptyList")
        void noMatchForStatus_shouldReturnEmptyList() {
            when(incomingPaymentRequestRepository
                    .findByStatusOrderByCreatedAtDesc(IncomingPaymentStatus.CONFIRMED))
                    .thenReturn(Collections.emptyList());

            List<IncomingPaymentRequestResponseDTO> result =
                    service.getIncomingPaymentRequestsByStatus(IncomingPaymentStatus.CONFIRMED);

            assertTrue(result.isEmpty());
        }
    }

    // =========================================================================
    // getIncomingPaymentRequestsBySource()
    // =========================================================================

    @Nested
    @DisplayName("getIncomingPaymentRequestsBySource()")
    class GetBySource {

        @Test
        @DisplayName("refundSource_shouldReturnRefundRequests")
        void refundSource_shouldReturnRefundRequests() {
            IncomingPaymentRequest r = createRequest(IncomingPaymentStatus.PENDING);

            when(incomingPaymentRequestRepository
                    .findBySourceOrderByCreatedAtDesc(IncomingPaymentSource.REFUND))
                    .thenReturn(List.of(r));

            List<IncomingPaymentRequestResponseDTO> result =
                    service.getIncomingPaymentRequestsBySource(IncomingPaymentSource.REFUND);

            assertEquals(1, result.size());
            assertEquals(IncomingPaymentSource.REFUND, result.get(0).getSource());
        }

        @Test
        @DisplayName("poReturnSource_shouldReturnPoReturnRequests")
        void poReturnSource_shouldReturnPoReturnRequests() {
            UUID poReturnId = UUID.randomUUID();
            IncomingPaymentRequest r = createRequestWithSource(
                    IncomingPaymentStatus.PENDING,
                    IncomingPaymentSource.PO_RETURN,
                    poReturnId);

            when(incomingPaymentRequestRepository
                    .findBySourceOrderByCreatedAtDesc(IncomingPaymentSource.PO_RETURN))
                    .thenReturn(List.of(r));
            // convertToDTO will call findById for the PO_RETURN source
            when(purchaseOrderReturnRepository.findById(poReturnId))
                    .thenReturn(Optional.empty());

            List<IncomingPaymentRequestResponseDTO> result =
                    service.getIncomingPaymentRequestsBySource(IncomingPaymentSource.PO_RETURN);

            assertEquals(1, result.size());
            assertEquals(IncomingPaymentSource.PO_RETURN, result.get(0).getSource());
        }

        @Test
        @DisplayName("noMatchForSource_shouldReturnEmptyList")
        void noMatchForSource_shouldReturnEmptyList() {
            when(incomingPaymentRequestRepository
                    .findBySourceOrderByCreatedAtDesc(IncomingPaymentSource.REFUND))
                    .thenReturn(Collections.emptyList());

            assertTrue(service.getIncomingPaymentRequestsBySource(IncomingPaymentSource.REFUND)
                    .isEmpty());
        }
    }

    // =========================================================================
    // getIncomingPaymentRequestById()
    // =========================================================================

    @Nested
    @DisplayName("getIncomingPaymentRequestById()")
    class GetById {

        @Test
        @DisplayName("existingId_shouldReturnPopulatedDTO")
        void existingId_shouldReturnPopulatedDTO() {
            IncomingPaymentRequest request = createRequest(IncomingPaymentStatus.PENDING);
            UUID id = request.getId();

            when(incomingPaymentRequestRepository.findById(id))
                    .thenReturn(Optional.of(request));

            IncomingPaymentRequestResponseDTO result =
                    service.getIncomingPaymentRequestById(id);

            assertNotNull(result);
            assertEquals(id, result.getId());
            assertEquals(IncomingPaymentStatus.PENDING, result.getStatus());
        }

        @Test
        @DisplayName("nonExistentId_shouldThrowRuntimeException")
        void nonExistentId_shouldThrowRuntimeException() {
            UUID id = UUID.randomUUID();
            when(incomingPaymentRequestRepository.findById(id))
                    .thenReturn(Optional.empty());

            RuntimeException ex = assertThrows(RuntimeException.class,
                    () -> service.getIncomingPaymentRequestById(id));

            assertTrue(ex.getMessage().contains("not found"),
                    "Message should say 'not found' but was: " + ex.getMessage());
        }
    }

    // =========================================================================
    // confirmIncomingPayment()
    // =========================================================================

    @Nested
    @DisplayName("confirmIncomingPayment()")
    class ConfirmIncomingPayment {

        // ------------------------------------------------------------------
        // Guard clauses
        // ------------------------------------------------------------------

        @Test
        @DisplayName("requestNotFound_shouldThrowRuntimeException")
        void requestNotFound_shouldThrowRuntimeException() {
            UUID requestId = UUID.randomUUID();
            when(incomingPaymentRequestRepository.findById(requestId))
                    .thenReturn(Optional.empty());

            RuntimeException ex = assertThrows(RuntimeException.class,
                    () -> service.confirmIncomingPayment(
                            requestId,
                            createConfirmDTO(AccountType.BANK_ACCOUNT, UUID.randomUUID()),
                            "financeUser"));

            assertTrue(ex.getMessage().contains("not found"));
        }

        @Test
        @DisplayName("alreadyConfirmed_shouldThrowRuntimeException")
        void alreadyConfirmed_shouldThrowRuntimeException() {
            IncomingPaymentRequest request = createRequest(IncomingPaymentStatus.CONFIRMED);
            UUID requestId = request.getId();

            when(incomingPaymentRequestRepository.findById(requestId))
                    .thenReturn(Optional.of(request));

            RuntimeException ex = assertThrows(RuntimeException.class,
                    () -> service.confirmIncomingPayment(
                            requestId,
                            createConfirmDTO(AccountType.BANK_ACCOUNT, UUID.randomUUID()),
                            "financeUser"));

            assertTrue(ex.getMessage().toLowerCase().contains("confirmed"),
                    "Message should communicate already-confirmed state but was: "
                            + ex.getMessage());
        }

        // ------------------------------------------------------------------
        // Happy paths – one for each AccountType
        // ------------------------------------------------------------------

        @Test
        @DisplayName("happyPath_bankAccount_updatesBalanceAndSetsConfirmedStatus")
        void happyPath_bankAccount_updatesBalanceAndSetsConfirmedStatus() {
            IncomingPaymentRequest request = createRequest(IncomingPaymentStatus.PENDING);
            UUID requestId = request.getId();
            BigDecimal initialBalance = BigDecimal.valueOf(1000);
            BigDecimal refundAmount = request.getTotalRefundAmount(); // 500

            BankAccount bankAccount = createBankAccount(initialBalance);
            UUID bankAccountId = bankAccount.getId();

            when(incomingPaymentRequestRepository.findById(requestId))
                    .thenReturn(Optional.of(request));
            // The service calls bankAccountRepository.findById twice:
            // once in validateAndGetAccountName, once in updateAccountBalance.
            when(bankAccountRepository.findById(bankAccountId))
                    .thenReturn(Optional.of(bankAccount));
            when(incomingPaymentRequestRepository.save(any(IncomingPaymentRequest.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            IncomingPaymentRequestResponseDTO result =
                    service.confirmIncomingPayment(
                            requestId,
                            createConfirmDTO(AccountType.BANK_ACCOUNT, bankAccountId),
                            "financeUser");

            assertNotNull(result);
            // Status + audit fields on the request entity
            assertEquals(IncomingPaymentStatus.CONFIRMED, request.getStatus());
            assertEquals("financeUser", request.getConfirmedBy());
            assertNotNull(request.getConfirmedAt());
            assertEquals(AccountType.BANK_ACCOUNT, request.getBalanceType());
            assertEquals(bankAccountId, request.getBalanceAccountId());
            // Balance was increased by the refund amount
            assertEquals(initialBalance.add(refundAmount), bankAccount.getCurrentBalance());
            assertEquals(initialBalance.add(refundAmount), bankAccount.getAvailableBalance());

            verify(bankAccountRepository).save(bankAccount);
            verify(incomingPaymentRequestRepository).save(request);
        }

        @Test
        @DisplayName("happyPath_cashSafe_updatesBalanceAndSetsConfirmedStatus")
        void happyPath_cashSafe_updatesBalanceAndSetsConfirmedStatus() {
            IncomingPaymentRequest request = createRequest(IncomingPaymentStatus.PENDING);
            UUID requestId = request.getId();
            BigDecimal initialBalance = BigDecimal.valueOf(2000);
            BigDecimal refundAmount = request.getTotalRefundAmount();

            CashSafe cashSafe = createCashSafe(initialBalance);
            UUID cashSafeId = cashSafe.getId();

            when(incomingPaymentRequestRepository.findById(requestId))
                    .thenReturn(Optional.of(request));
            when(cashSafeRepository.findById(cashSafeId))
                    .thenReturn(Optional.of(cashSafe));
            when(incomingPaymentRequestRepository.save(any(IncomingPaymentRequest.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            IncomingPaymentRequestResponseDTO result =
                    service.confirmIncomingPayment(
                            requestId,
                            createConfirmDTO(AccountType.CASH_SAFE, cashSafeId),
                            "financeUser");

            assertNotNull(result);
            assertEquals(IncomingPaymentStatus.CONFIRMED, request.getStatus());
            assertEquals(initialBalance.add(refundAmount), cashSafe.getCurrentBalance());
            assertEquals(initialBalance.add(refundAmount), cashSafe.getAvailableBalance());
            verify(cashSafeRepository).save(cashSafe);
        }

        @Test
        @DisplayName("happyPath_cashWithPerson_updatesBalanceAndSetsConfirmedStatus")
        void happyPath_cashWithPerson_updatesBalanceAndSetsConfirmedStatus() {
            IncomingPaymentRequest request = createRequest(IncomingPaymentStatus.PENDING);
            UUID requestId = request.getId();
            BigDecimal initialBalance = BigDecimal.valueOf(3000);
            BigDecimal refundAmount = request.getTotalRefundAmount();

            CashWithPerson cwp = createCashWithPerson(initialBalance);
            UUID cwpId = cwp.getId();

            when(incomingPaymentRequestRepository.findById(requestId))
                    .thenReturn(Optional.of(request));
            when(cashWithPersonRepository.findById(cwpId))
                    .thenReturn(Optional.of(cwp));
            when(incomingPaymentRequestRepository.save(any(IncomingPaymentRequest.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            IncomingPaymentRequestResponseDTO result =
                    service.confirmIncomingPayment(
                            requestId,
                            createConfirmDTO(AccountType.CASH_WITH_PERSON, cwpId),
                            "financeUser");

            assertNotNull(result);
            assertEquals(IncomingPaymentStatus.CONFIRMED, request.getStatus());
            assertEquals(initialBalance.add(refundAmount), cwp.getCurrentBalance());
            assertEquals(initialBalance.add(refundAmount), cwp.getAvailableBalance());
            verify(cashWithPersonRepository).save(cwp);
        }

        // ------------------------------------------------------------------
        // Account-not-found errors during confirmation
        // ------------------------------------------------------------------

        @Test
        @DisplayName("bankAccountNotFound_shouldThrowRuntimeException")
        void bankAccountNotFound_shouldThrowRuntimeException() {
            IncomingPaymentRequest request = createRequest(IncomingPaymentStatus.PENDING);
            UUID requestId = request.getId();
            UUID missingId = UUID.randomUUID();

            when(incomingPaymentRequestRepository.findById(requestId))
                    .thenReturn(Optional.of(request));
            when(bankAccountRepository.findById(missingId))
                    .thenReturn(Optional.empty());

            RuntimeException ex = assertThrows(RuntimeException.class,
                    () -> service.confirmIncomingPayment(
                            requestId,
                            createConfirmDTO(AccountType.BANK_ACCOUNT, missingId),
                            "financeUser"));

            assertTrue(ex.getMessage().contains("not found")
                            || ex.getMessage().contains("Bank Account"),
                    "Message was: " + ex.getMessage());
        }

        @Test
        @DisplayName("cashSafeNotFound_shouldThrowRuntimeException")
        void cashSafeNotFound_shouldThrowRuntimeException() {
            IncomingPaymentRequest request = createRequest(IncomingPaymentStatus.PENDING);
            UUID requestId = request.getId();
            UUID missingId = UUID.randomUUID();

            when(incomingPaymentRequestRepository.findById(requestId))
                    .thenReturn(Optional.of(request));
            when(cashSafeRepository.findById(missingId))
                    .thenReturn(Optional.empty());

            RuntimeException ex = assertThrows(RuntimeException.class,
                    () -> service.confirmIncomingPayment(
                            requestId,
                            createConfirmDTO(AccountType.CASH_SAFE, missingId),
                            "financeUser"));

            assertTrue(ex.getMessage().contains("not found")
                            || ex.getMessage().contains("Cash Safe"),
                    "Message was: " + ex.getMessage());
        }

        @Test
        @DisplayName("cashWithPersonNotFound_shouldThrowRuntimeException")
        void cashWithPersonNotFound_shouldThrowRuntimeException() {
            IncomingPaymentRequest request = createRequest(IncomingPaymentStatus.PENDING);
            UUID requestId = request.getId();
            UUID missingId = UUID.randomUUID();

            when(incomingPaymentRequestRepository.findById(requestId))
                    .thenReturn(Optional.of(request));
            when(cashWithPersonRepository.findById(missingId))
                    .thenReturn(Optional.empty());

            RuntimeException ex = assertThrows(RuntimeException.class,
                    () -> service.confirmIncomingPayment(
                            requestId,
                            createConfirmDTO(AccountType.CASH_WITH_PERSON, missingId),
                            "financeUser"));

            assertTrue(ex.getMessage().contains("not found")
                            || ex.getMessage().contains("Cash With Person"),
                    "Message was: " + ex.getMessage());
        }

        // ------------------------------------------------------------------
        // PO_RETURN side-effect: PurchaseOrderReturn status update
        // ------------------------------------------------------------------

        @Test
        @DisplayName("poReturnSource_withReferenceId_updatesPoReturnToConfirmed")
        void poReturnSource_withReferenceId_updatesPoReturnToConfirmed() {
            UUID poReturnId = UUID.randomUUID();
            IncomingPaymentRequest request = createRequestWithSource(
                    IncomingPaymentStatus.PENDING,
                    IncomingPaymentSource.PO_RETURN,
                    poReturnId);
            UUID requestId = request.getId();

            BankAccount bankAccount = createBankAccount(BigDecimal.valueOf(5000));
            UUID bankAccountId = bankAccount.getId();

            PurchaseOrderReturn poReturn = new PurchaseOrderReturn();
            poReturn.setId(poReturnId);
            poReturn.setReturnId("RET-000001");
            poReturn.setStatus(PurchaseOrderReturnStatus.PENDING);

            when(incomingPaymentRequestRepository.findById(requestId))
                    .thenReturn(Optional.of(request));
            when(bankAccountRepository.findById(bankAccountId))
                    .thenReturn(Optional.of(bankAccount));
            when(purchaseOrderReturnRepository.findById(poReturnId))
                    .thenReturn(Optional.of(poReturn));
            when(incomingPaymentRequestRepository.save(any(IncomingPaymentRequest.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            service.confirmIncomingPayment(
                    requestId,
                    createConfirmDTO(AccountType.BANK_ACCOUNT, bankAccountId),
                    "financeManager");

            // The PO Return should be updated to CONFIRMED with audit info
            assertEquals(PurchaseOrderReturnStatus.CONFIRMED, poReturn.getStatus());
            assertEquals("financeManager", poReturn.getApprovedBy());
            assertNotNull(poReturn.getApprovedAt());
            verify(purchaseOrderReturnRepository).save(poReturn);
        }

        @Test
        @DisplayName("poReturnSource_withNullReferenceId_doesNotTouchPoReturnRepository")
        void poReturnSource_withNullReferenceId_doesNotTouchPoReturnRepository() {
            // sourceReferenceId == null → the if-guard in the service should skip the lookup
            IncomingPaymentRequest request = createRequestWithSource(
                    IncomingPaymentStatus.PENDING,
                    IncomingPaymentSource.PO_RETURN,
                    null);
            UUID requestId = request.getId();

            BankAccount bankAccount = createBankAccount(BigDecimal.valueOf(1000));
            UUID bankAccountId = bankAccount.getId();

            when(incomingPaymentRequestRepository.findById(requestId))
                    .thenReturn(Optional.of(request));
            when(bankAccountRepository.findById(bankAccountId))
                    .thenReturn(Optional.of(bankAccount));
            when(incomingPaymentRequestRepository.save(any(IncomingPaymentRequest.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            service.confirmIncomingPayment(
                    requestId,
                    createConfirmDTO(AccountType.BANK_ACCOUNT, bankAccountId),
                    "financeUser");

            verify(purchaseOrderReturnRepository, never()).findById(any());
            verify(purchaseOrderReturnRepository, never()).save(any());
        }

        @Test
        @DisplayName("refundSource_neverTouchesPoReturnRepository")
        void refundSource_neverTouchesPoReturnRepository() {
            // source = REFUND → PO_RETURN branch must not be entered
            IncomingPaymentRequest request = createRequest(IncomingPaymentStatus.PENDING);
            UUID requestId = request.getId();

            BankAccount bankAccount = createBankAccount(BigDecimal.valueOf(1000));
            UUID bankAccountId = bankAccount.getId();

            when(incomingPaymentRequestRepository.findById(requestId))
                    .thenReturn(Optional.of(request));
            when(bankAccountRepository.findById(bankAccountId))
                    .thenReturn(Optional.of(bankAccount));
            when(incomingPaymentRequestRepository.save(any(IncomingPaymentRequest.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            service.confirmIncomingPayment(
                    requestId,
                    createConfirmDTO(AccountType.BANK_ACCOUNT, bankAccountId),
                    "financeUser");

            verify(purchaseOrderReturnRepository, never()).findById(any());
            verify(purchaseOrderReturnRepository, never()).save(any());
        }

        // ------------------------------------------------------------------
        // Account-name format assertions (verifies validateAndGetAccountName)
        // ------------------------------------------------------------------

        @Test
        @DisplayName("bankAccount_accountNameFormat_isBankNameDashAccountNumber")
        void bankAccount_accountNameFormat_isBankNameDashAccountNumber() {
            IncomingPaymentRequest request = createRequest(IncomingPaymentStatus.PENDING);
            UUID requestId = request.getId();

            BankAccount bankAccount = createBankAccount(BigDecimal.valueOf(1000));
            bankAccount.setBankName("National Bank");
            bankAccount.setAccountNumber("NB-9999");
            UUID bankAccountId = bankAccount.getId();

            when(incomingPaymentRequestRepository.findById(requestId))
                    .thenReturn(Optional.of(request));
            when(bankAccountRepository.findById(bankAccountId))
                    .thenReturn(Optional.of(bankAccount));
            when(incomingPaymentRequestRepository.save(any(IncomingPaymentRequest.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            service.confirmIncomingPayment(
                    requestId,
                    createConfirmDTO(AccountType.BANK_ACCOUNT, bankAccountId),
                    "financeUser");

            // Service builds: bankName + " - " + accountNumber
            assertEquals("National Bank - NB-9999", request.getBalanceAccountName());
        }

        @Test
        @DisplayName("cashSafe_accountNameFormat_isSafeNameParenLocation")
        void cashSafe_accountNameFormat_isSafeNameParenLocation() {
            IncomingPaymentRequest request = createRequest(IncomingPaymentStatus.PENDING);
            UUID requestId = request.getId();

            CashSafe cashSafe = createCashSafe(BigDecimal.valueOf(800));
            cashSafe.setSafeName("Petty Cash");
            cashSafe.setLocation("Site B");
            UUID cashSafeId = cashSafe.getId();

            when(incomingPaymentRequestRepository.findById(requestId))
                    .thenReturn(Optional.of(request));
            when(cashSafeRepository.findById(cashSafeId))
                    .thenReturn(Optional.of(cashSafe));
            when(incomingPaymentRequestRepository.save(any(IncomingPaymentRequest.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            service.confirmIncomingPayment(
                    requestId,
                    createConfirmDTO(AccountType.CASH_SAFE, cashSafeId),
                    "financeUser");

            // Service builds: safeName + " (" + location + ")"
            assertEquals("Petty Cash (Site B)", request.getBalanceAccountName());
        }

        @Test
        @DisplayName("cashWithPerson_accountNameFormat_isPersonName")
        void cashWithPerson_accountNameFormat_isPersonName() {
            IncomingPaymentRequest request = createRequest(IncomingPaymentStatus.PENDING);
            UUID requestId = request.getId();

            CashWithPerson cwp = createCashWithPerson(BigDecimal.valueOf(600));
            cwp.setPersonName("Alice Financer");
            UUID cwpId = cwp.getId();

            when(incomingPaymentRequestRepository.findById(requestId))
                    .thenReturn(Optional.of(request));
            when(cashWithPersonRepository.findById(cwpId))
                    .thenReturn(Optional.of(cwp));
            when(incomingPaymentRequestRepository.save(any(IncomingPaymentRequest.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            service.confirmIncomingPayment(
                    requestId,
                    createConfirmDTO(AccountType.CASH_WITH_PERSON, cwpId),
                    "financeUser");

            // Service sets: personName only
            assertEquals("Alice Financer", request.getBalanceAccountName());
        }

        // ------------------------------------------------------------------
        // DTO-field pass-through assertions
        // ------------------------------------------------------------------

        @Test
        @DisplayName("confirmation_setsDateReceivedAndFinanceNotesFromDTO")
        void confirmation_setsDateReceivedAndFinanceNotesFromDTO() {
            IncomingPaymentRequest request = createRequest(IncomingPaymentStatus.PENDING);
            UUID requestId = request.getId();

            BankAccount bankAccount = createBankAccount(BigDecimal.valueOf(1000));
            UUID bankAccountId = bankAccount.getId();

            LocalDate dateReceived = LocalDate.of(2026, 3, 10);
            ConfirmIncomingPaymentRequestDTO confirmDTO = new ConfirmIncomingPaymentRequestDTO();
            confirmDTO.setBalanceType(AccountType.BANK_ACCOUNT);
            confirmDTO.setBalanceAccountId(bankAccountId);
            confirmDTO.setDateReceived(dateReceived);
            confirmDTO.setFinanceNotes("Received via wire transfer");

            when(incomingPaymentRequestRepository.findById(requestId))
                    .thenReturn(Optional.of(request));
            when(bankAccountRepository.findById(bankAccountId))
                    .thenReturn(Optional.of(bankAccount));
            when(incomingPaymentRequestRepository.save(any(IncomingPaymentRequest.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            service.confirmIncomingPayment(requestId, confirmDTO, "financeUser");

            assertEquals(dateReceived, request.getDateReceived());
            assertEquals("Received via wire transfer", request.getFinanceNotes());
        }

        @Test
        @DisplayName("confirmation_returnsDTOWithConfirmedStatusAndCorrectId")
        void confirmation_returnsDTOWithConfirmedStatusAndCorrectId() {
            IncomingPaymentRequest request = createRequest(IncomingPaymentStatus.PENDING);
            UUID requestId = request.getId();

            BankAccount bankAccount = createBankAccount(BigDecimal.valueOf(1000));
            UUID bankAccountId = bankAccount.getId();

            when(incomingPaymentRequestRepository.findById(requestId))
                    .thenReturn(Optional.of(request));
            when(bankAccountRepository.findById(bankAccountId))
                    .thenReturn(Optional.of(bankAccount));
            when(incomingPaymentRequestRepository.save(any(IncomingPaymentRequest.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            IncomingPaymentRequestResponseDTO result = service.confirmIncomingPayment(
                    requestId,
                    createConfirmDTO(AccountType.BANK_ACCOUNT, bankAccountId),
                    "financeUser");

            assertNotNull(result);
            assertEquals(requestId, result.getId());
            assertEquals(IncomingPaymentStatus.CONFIRMED, result.getStatus());
        }
    }

    // =========================================================================
    // createIncomingPaymentFromPOReturn()
    // =========================================================================

    @Nested
    @DisplayName("createIncomingPaymentFromPOReturn()")
    class CreateFromPOReturn {

        @Test
        @DisplayName("purchaseOrderNotFound_shouldThrowRuntimeException")
        void purchaseOrderNotFound_shouldThrowRuntimeException() {
            UUID purchaseOrderId = UUID.randomUUID();

            when(purchaseOrderRepository.findById(purchaseOrderId))
                    .thenReturn(Optional.empty());

            RuntimeException ex = assertThrows(RuntimeException.class,
                    () -> service.createIncomingPaymentFromPOReturn(
                            purchaseOrderId,
                            UUID.randomUUID(),
                            UUID.randomUUID(),
                            Collections.emptyList(),
                            BigDecimal.valueOf(200)));

            assertTrue(ex.getMessage().contains("not found"),
                    "Message was: " + ex.getMessage());
            verify(incomingPaymentRequestRepository, never()).save(any());
        }

        @Test
        @DisplayName("merchantNotFound_shouldThrowRuntimeException")
        void merchantNotFound_shouldThrowRuntimeException() {
            UUID purchaseOrderId = UUID.randomUUID();
            UUID merchantId = UUID.randomUUID();

            PurchaseOrder po = new PurchaseOrder();
            po.setId(purchaseOrderId);
            po.setPoNumber("PO-999");

            when(purchaseOrderRepository.findById(purchaseOrderId))
                    .thenReturn(Optional.of(po));
            when(merchantRepository.findById(merchantId))
                    .thenReturn(Optional.empty());

            RuntimeException ex = assertThrows(RuntimeException.class,
                    () -> service.createIncomingPaymentFromPOReturn(
                            purchaseOrderId,
                            merchantId,
                            UUID.randomUUID(),
                            Collections.emptyList(),
                            BigDecimal.valueOf(200)));

            assertTrue(ex.getMessage().contains("not found"),
                    "Message was: " + ex.getMessage());
            verify(incomingPaymentRequestRepository, never()).save(any());
        }

        @Test
        @DisplayName("happyPath_emptyItems_savesRequestWithPoReturnSourceAndCorrectFields")
        void happyPath_emptyItems_savesRequestWithPoReturnSourceAndCorrectFields() {
            UUID purchaseOrderId = UUID.randomUUID();
            UUID merchantId = UUID.randomUUID();
            UUID poReturnId = UUID.randomUUID();
            BigDecimal totalAmount = BigDecimal.valueOf(350);

            PurchaseOrder po = new PurchaseOrder();
            po.setId(purchaseOrderId);
            po.setPoNumber("PO-888");

            Merchant merchant = new Merchant();
            merchant.setId(merchantId);
            merchant.setName("Return Merchant");

            when(purchaseOrderRepository.findById(purchaseOrderId))
                    .thenReturn(Optional.of(po));
            when(merchantRepository.findById(merchantId))
                    .thenReturn(Optional.of(merchant));

            service.createIncomingPaymentFromPOReturn(
                    purchaseOrderId, merchantId, poReturnId,
                    Collections.emptyList(), totalAmount);

            ArgumentCaptor<IncomingPaymentRequest> captor =
                    ArgumentCaptor.forClass(IncomingPaymentRequest.class);
            verify(incomingPaymentRequestRepository).save(captor.capture());

            IncomingPaymentRequest saved = captor.getValue();
            assertEquals(IncomingPaymentSource.PO_RETURN, saved.getSource());
            assertEquals(IncomingPaymentStatus.PENDING, saved.getStatus());
            assertEquals(poReturnId, saved.getSourceReferenceId());
            assertEquals(totalAmount, saved.getTotalRefundAmount());
            assertSame(po, saved.getPurchaseOrder());
            assertSame(merchant, saved.getMerchant());
            assertTrue(saved.getIncomingPaymentItems().isEmpty());
        }

        @Test
        @DisplayName("happyPath_withItems_linksItemsToSavedRequest")
        void happyPath_withItems_linksItemsToSavedRequest() {
            UUID purchaseOrderId = UUID.randomUUID();
            UUID merchantId = UUID.randomUUID();
            UUID poReturnId = UUID.randomUUID();

            PurchaseOrder po = new PurchaseOrder();
            po.setId(purchaseOrderId);
            po.setPoNumber("PO-777");

            Merchant merchant = new Merchant();
            merchant.setId(merchantId);
            merchant.setName("Item Merchant");

            IncomingPaymentRequestItem item1 = new IncomingPaymentRequestItem();
            item1.setItemName("Steel Rod");
            item1.setTotalRefundAmount(BigDecimal.valueOf(100));

            IncomingPaymentRequestItem item2 = new IncomingPaymentRequestItem();
            item2.setItemName("Bolt Pack");
            item2.setTotalRefundAmount(BigDecimal.valueOf(50));

            when(purchaseOrderRepository.findById(purchaseOrderId))
                    .thenReturn(Optional.of(po));
            when(merchantRepository.findById(merchantId))
                    .thenReturn(Optional.of(merchant));

            service.createIncomingPaymentFromPOReturn(
                    purchaseOrderId, merchantId, poReturnId,
                    List.of(item1, item2), BigDecimal.valueOf(150));

            ArgumentCaptor<IncomingPaymentRequest> captor =
                    ArgumentCaptor.forClass(IncomingPaymentRequest.class);
            verify(incomingPaymentRequestRepository).save(captor.capture());

            IncomingPaymentRequest saved = captor.getValue();
            assertEquals(2, saved.getIncomingPaymentItems().size());
            // addIncomingPaymentItem must set the bidirectional back-reference
            saved.getIncomingPaymentItems().forEach(item ->
                    assertSame(saved, item.getIncomingPaymentRequest()));
        }

        @Test
        @DisplayName("happyPath_zeroCostItems_totalAmountStoredAsProvided")
        void happyPath_zeroCostItems_totalAmountStoredAsProvided() {
            UUID purchaseOrderId = UUID.randomUUID();
            UUID merchantId = UUID.randomUUID();

            PurchaseOrder po = new PurchaseOrder();
            po.setId(purchaseOrderId);
            po.setPoNumber("PO-555");

            Merchant merchant = new Merchant();
            merchant.setId(merchantId);
            merchant.setName("Zero-Cost Merchant");

            when(purchaseOrderRepository.findById(purchaseOrderId))
                    .thenReturn(Optional.of(po));
            when(merchantRepository.findById(merchantId))
                    .thenReturn(Optional.of(merchant));

            service.createIncomingPaymentFromPOReturn(
                    purchaseOrderId, merchantId, UUID.randomUUID(),
                    Collections.emptyList(), BigDecimal.ZERO);

            ArgumentCaptor<IncomingPaymentRequest> captor =
                    ArgumentCaptor.forClass(IncomingPaymentRequest.class);
            verify(incomingPaymentRequestRepository).save(captor.capture());

            assertEquals(BigDecimal.ZERO, captor.getValue().getTotalRefundAmount());
        }
    }
}