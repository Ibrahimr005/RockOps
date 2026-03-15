package com.example.backend.services.finance.refunds;

import com.example.backend.dto.finance.refunds.ConfirmRefundRequestDTO;
import com.example.backend.dto.finance.refunds.RefundRequestResponseDTO;
import com.example.backend.models.finance.balances.AccountType;
import com.example.backend.models.finance.balances.BankAccount;
import com.example.backend.models.finance.balances.CashSafe;
import com.example.backend.models.finance.balances.CashWithPerson;
import com.example.backend.models.finance.refunds.RefundRequest;
import com.example.backend.models.finance.refunds.RefundRequestItem;
import com.example.backend.models.finance.refunds.RefundStatus;
import com.example.backend.models.merchant.Merchant;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrder;
import com.example.backend.repositories.finance.balances.BankAccountRepository;
import com.example.backend.repositories.finance.balances.CashSafeRepository;
import com.example.backend.repositories.finance.balances.CashWithPersonRepository;
import com.example.backend.repositories.finance.refunds.RefundRequestItemRepository;
import com.example.backend.repositories.finance.refunds.RefundRequestRepository;
import com.example.backend.repositories.merchant.MerchantRepository;
import com.example.backend.repositories.procurement.PurchaseOrderRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class RefundRequestServiceTest {

    @Mock
    private RefundRequestRepository refundRequestRepository;

    @Mock
    private RefundRequestItemRepository refundRequestItemRepository;

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

    @InjectMocks
    private RefundRequestService refundRequestService;

    // ==================== getAllRefundRequests ====================

    @Test
    public void getAllRefundRequests_withMultipleRequests_shouldReturnAllAsDTOs() {
        RefundRequest request1 = createRefundRequest(RefundStatus.PENDING);
        RefundRequest request2 = createRefundRequest(RefundStatus.CONFIRMED);
        when(refundRequestRepository.findAllByOrderByCreatedAtDesc())
                .thenReturn(List.of(request1, request2));

        List<RefundRequestResponseDTO> result = refundRequestService.getAllRefundRequests();

        assertNotNull(result);
        assertEquals(2, result.size());
        verify(refundRequestRepository).findAllByOrderByCreatedAtDesc();
    }

    @Test
    public void getAllRefundRequests_emptyRepository_shouldReturnEmptyList() {
        when(refundRequestRepository.findAllByOrderByCreatedAtDesc())
                .thenReturn(new ArrayList<>());

        List<RefundRequestResponseDTO> result = refundRequestService.getAllRefundRequests();

        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(refundRequestRepository).findAllByOrderByCreatedAtDesc();
    }

    @Test
    public void getAllRefundRequests_shouldMapCoreFieldsCorrectly() {
        UUID expectedId = UUID.randomUUID();
        RefundRequest request = createRefundRequest(RefundStatus.PENDING);
        request.setId(expectedId);
        request.setTotalRefundAmount(BigDecimal.valueOf(750));

        when(refundRequestRepository.findAllByOrderByCreatedAtDesc())
                .thenReturn(List.of(request));

        List<RefundRequestResponseDTO> result = refundRequestService.getAllRefundRequests();

        assertEquals(1, result.size());
        RefundRequestResponseDTO dto = result.get(0);
        assertEquals(expectedId, dto.getId());
        assertEquals(BigDecimal.valueOf(750), dto.getTotalRefundAmount());
        assertEquals(RefundStatus.PENDING, dto.getStatus());
        assertEquals("PO-001", dto.getPurchaseOrderNumber());
        assertEquals("Test Merchant", dto.getMerchantName());
        assertEquals("123456", dto.getMerchantContactPhone());
        assertEquals("merchant@test.com", dto.getMerchantContactEmail());
    }

    @Test
    public void getAllRefundRequests_shouldMapMerchantAndPurchaseOrderIds() {
        RefundRequest request = createRefundRequest(RefundStatus.PENDING);
        UUID poId = request.getPurchaseOrder().getId();
        UUID merchantId = request.getMerchant().getId();

        when(refundRequestRepository.findAllByOrderByCreatedAtDesc())
                .thenReturn(List.of(request));

        List<RefundRequestResponseDTO> result = refundRequestService.getAllRefundRequests();

        RefundRequestResponseDTO dto = result.get(0);
        assertEquals(poId, dto.getPurchaseOrderId());
        assertEquals(merchantId, dto.getMerchantId());
    }

    // ==================== getRefundRequestsByStatus ====================

    @Test
    public void getRefundRequestsByStatus_pendingStatus_shouldReturnPendingRequests() {
        RefundRequest request = createRefundRequest(RefundStatus.PENDING);
        when(refundRequestRepository.findByStatusOrderByCreatedAtDesc(RefundStatus.PENDING))
                .thenReturn(List.of(request));

        List<RefundRequestResponseDTO> result =
                refundRequestService.getRefundRequestsByStatus(RefundStatus.PENDING);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(RefundStatus.PENDING, result.get(0).getStatus());
        verify(refundRequestRepository).findByStatusOrderByCreatedAtDesc(RefundStatus.PENDING);
    }

    @Test
    public void getRefundRequestsByStatus_confirmedStatus_shouldReturnConfirmedRequests() {
        RefundRequest request = createRefundRequest(RefundStatus.CONFIRMED);
        when(refundRequestRepository.findByStatusOrderByCreatedAtDesc(RefundStatus.CONFIRMED))
                .thenReturn(List.of(request));

        List<RefundRequestResponseDTO> result =
                refundRequestService.getRefundRequestsByStatus(RefundStatus.CONFIRMED);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(RefundStatus.CONFIRMED, result.get(0).getStatus());
        verify(refundRequestRepository).findByStatusOrderByCreatedAtDesc(RefundStatus.CONFIRMED);
    }

    @Test
    public void getRefundRequestsByStatus_noMatchingRequests_shouldReturnEmptyList() {
        when(refundRequestRepository.findByStatusOrderByCreatedAtDesc(RefundStatus.CONFIRMED))
                .thenReturn(new ArrayList<>());

        List<RefundRequestResponseDTO> result =
                refundRequestService.getRefundRequestsByStatus(RefundStatus.CONFIRMED);

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    // ==================== getRefundRequestById ====================

    @Test
    public void getRefundRequestById_existingId_shouldReturnDTO() {
        UUID id = UUID.randomUUID();
        RefundRequest request = createRefundRequest(RefundStatus.PENDING);
        request.setId(id);

        when(refundRequestRepository.findById(id)).thenReturn(Optional.of(request));

        RefundRequestResponseDTO result = refundRequestService.getRefundRequestById(id);

        assertNotNull(result);
        assertEquals(id, result.getId());
        verify(refundRequestRepository).findById(id);
    }

    @Test
    public void getRefundRequestById_notFound_shouldThrowRuntimeException() {
        UUID id = UUID.randomUUID();
        when(refundRequestRepository.findById(id)).thenReturn(Optional.empty());

        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> refundRequestService.getRefundRequestById(id));

        assertEquals("Refund request not found", exception.getMessage());
        verify(refundRequestRepository).findById(id);
    }

    @Test
    public void getRefundRequestById_shouldMapAllMerchantContactFields() {
        UUID id = UUID.randomUUID();
        RefundRequest request = createRefundRequest(RefundStatus.PENDING);
        request.setId(id);

        when(refundRequestRepository.findById(id)).thenReturn(Optional.of(request));

        RefundRequestResponseDTO result = refundRequestService.getRefundRequestById(id);

        assertEquals("Test Merchant", result.getMerchantName());
        assertEquals("123456", result.getMerchantContactPhone());
        assertEquals("merchant@test.com", result.getMerchantContactEmail());
    }

    @Test
    public void getRefundRequestById_shouldReturnEmptyRefundItemsList_whenNoItems() {
        UUID id = UUID.randomUUID();
        RefundRequest request = createRefundRequest(RefundStatus.PENDING);
        request.setId(id);

        when(refundRequestRepository.findById(id)).thenReturn(Optional.of(request));

        RefundRequestResponseDTO result = refundRequestService.getRefundRequestById(id);

        assertNotNull(result.getRefundItems());
        assertTrue(result.getRefundItems().isEmpty());
    }

    // ==================== confirmRefund ====================

    @Test
    public void confirmRefund_requestNotFound_shouldThrowRuntimeException() {
        UUID requestId = UUID.randomUUID();
        ConfirmRefundRequestDTO confirmDTO =
                createConfirmDTO(AccountType.BANK_ACCOUNT, UUID.randomUUID());

        when(refundRequestRepository.findById(requestId)).thenReturn(Optional.empty());

        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> refundRequestService.confirmRefund(requestId, confirmDTO, "finance_user"));

        assertEquals("Refund request not found", exception.getMessage());
        verifyNoInteractions(bankAccountRepository, cashSafeRepository, cashWithPersonRepository);
    }

    @Test
    public void confirmRefund_alreadyConfirmed_shouldThrowRuntimeException() {
        UUID requestId = UUID.randomUUID();
        RefundRequest request = createRefundRequest(RefundStatus.CONFIRMED);
        request.setId(requestId);

        ConfirmRefundRequestDTO confirmDTO =
                createConfirmDTO(AccountType.BANK_ACCOUNT, UUID.randomUUID());

        when(refundRequestRepository.findById(requestId)).thenReturn(Optional.of(request));

        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> refundRequestService.confirmRefund(requestId, confirmDTO, "finance_user"));

        assertEquals("Refund request is already confirmed", exception.getMessage());
        verifyNoInteractions(bankAccountRepository, cashSafeRepository, cashWithPersonRepository);
    }

    @Test
    public void confirmRefund_bankAccount_shouldUpdateCurrentAndAvailableBalance() {
        UUID requestId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();
        BigDecimal initialBalance = BigDecimal.valueOf(1000);
        BigDecimal refundAmount = BigDecimal.valueOf(500);

        RefundRequest request = createRefundRequest(RefundStatus.PENDING);
        request.setId(requestId);
        request.setTotalRefundAmount(refundAmount);

        BankAccount bankAccount = createBankAccount(accountId, initialBalance);
        ConfirmRefundRequestDTO confirmDTO = createConfirmDTO(AccountType.BANK_ACCOUNT, accountId);

        when(refundRequestRepository.findById(requestId)).thenReturn(Optional.of(request));
        when(bankAccountRepository.findById(accountId)).thenReturn(Optional.of(bankAccount));
        when(refundRequestRepository.save(any(RefundRequest.class))).thenAnswer(i -> i.getArgument(0));

        RefundRequestResponseDTO result =
                refundRequestService.confirmRefund(requestId, confirmDTO, "finance_user");

        assertNotNull(result);
        // currentBalance: 1000 + 500 = 1500
        assertEquals(BigDecimal.valueOf(1500), bankAccount.getCurrentBalance());
        // availableBalance: 1000 + 500 = 1500
        assertEquals(BigDecimal.valueOf(1500), bankAccount.getAvailableBalance());
        // validateAndGetAccountName calls findById once, updateAccountBalance calls it again
        verify(bankAccountRepository, times(2)).findById(accountId);
        verify(bankAccountRepository).save(bankAccount);
    }

    @Test
    public void confirmRefund_bankAccount_shouldSetStatusConfirmedBy_andConfirmedAt() {
        UUID requestId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();

        RefundRequest request = createRefundRequest(RefundStatus.PENDING);
        request.setId(requestId);
        request.setTotalRefundAmount(BigDecimal.valueOf(500));

        BankAccount bankAccount = createBankAccount(accountId, BigDecimal.valueOf(1000));
        ConfirmRefundRequestDTO confirmDTO = createConfirmDTO(AccountType.BANK_ACCOUNT, accountId);

        when(refundRequestRepository.findById(requestId)).thenReturn(Optional.of(request));
        when(bankAccountRepository.findById(accountId)).thenReturn(Optional.of(bankAccount));
        when(refundRequestRepository.save(any(RefundRequest.class))).thenAnswer(i -> i.getArgument(0));

        refundRequestService.confirmRefund(requestId, confirmDTO, "approver_jane");

        assertEquals(RefundStatus.CONFIRMED, request.getStatus());
        assertEquals("approver_jane", request.getConfirmedBy());
        assertNotNull(request.getConfirmedAt());
    }

    @Test
    public void confirmRefund_bankAccount_shouldSetBalanceMetadataWithCorrectAccountNameFormat() {
        UUID requestId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();

        RefundRequest request = createRefundRequest(RefundStatus.PENDING);
        request.setId(requestId);
        request.setTotalRefundAmount(BigDecimal.valueOf(500));

        BankAccount bankAccount = createBankAccount(accountId, BigDecimal.valueOf(1000));
        ConfirmRefundRequestDTO confirmDTO = createConfirmDTO(AccountType.BANK_ACCOUNT, accountId);

        when(refundRequestRepository.findById(requestId)).thenReturn(Optional.of(request));
        when(bankAccountRepository.findById(accountId)).thenReturn(Optional.of(bankAccount));
        when(refundRequestRepository.save(any(RefundRequest.class))).thenAnswer(i -> i.getArgument(0));

        refundRequestService.confirmRefund(requestId, confirmDTO, "finance_user");

        assertEquals(AccountType.BANK_ACCOUNT, request.getBalanceType());
        assertEquals(accountId, request.getBalanceAccountId());
        // format: bankName + " - " + accountNumber
        assertEquals("Test Bank - ACC-001", request.getBalanceAccountName());
    }

    @Test
    public void confirmRefund_bankAccount_shouldSetDateReceivedAndFinanceNotes() {
        UUID requestId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();
        LocalDate dateReceived = LocalDate.of(2026, 3, 14);

        RefundRequest request = createRefundRequest(RefundStatus.PENDING);
        request.setId(requestId);
        request.setTotalRefundAmount(BigDecimal.valueOf(500));

        BankAccount bankAccount = createBankAccount(accountId, BigDecimal.valueOf(1000));
        ConfirmRefundRequestDTO confirmDTO = createConfirmDTO(AccountType.BANK_ACCOUNT, accountId);
        confirmDTO.setDateReceived(dateReceived);
        confirmDTO.setFinanceNotes("Refund verified by finance team");

        when(refundRequestRepository.findById(requestId)).thenReturn(Optional.of(request));
        when(bankAccountRepository.findById(accountId)).thenReturn(Optional.of(bankAccount));
        when(refundRequestRepository.save(any(RefundRequest.class))).thenAnswer(i -> i.getArgument(0));

        refundRequestService.confirmRefund(requestId, confirmDTO, "finance_user");

        assertEquals(dateReceived, request.getDateReceived());
        assertEquals("Refund verified by finance team", request.getFinanceNotes());
    }

    @Test
    public void confirmRefund_bankAccount_nullAvailableBalance_shouldOnlyUpdateCurrentBalance() {
        UUID requestId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();

        RefundRequest request = createRefundRequest(RefundStatus.PENDING);
        request.setId(requestId);
        request.setTotalRefundAmount(BigDecimal.valueOf(200));

        BankAccount bankAccount = createBankAccount(accountId, BigDecimal.valueOf(800));
        bankAccount.setAvailableBalance(null);

        ConfirmRefundRequestDTO confirmDTO = createConfirmDTO(AccountType.BANK_ACCOUNT, accountId);

        when(refundRequestRepository.findById(requestId)).thenReturn(Optional.of(request));
        when(bankAccountRepository.findById(accountId)).thenReturn(Optional.of(bankAccount));
        when(refundRequestRepository.save(any(RefundRequest.class))).thenAnswer(i -> i.getArgument(0));

        refundRequestService.confirmRefund(requestId, confirmDTO, "finance_user");

        // currentBalance: 800 + 200 = 1000
        assertEquals(BigDecimal.valueOf(1000), bankAccount.getCurrentBalance());
        // availableBalance was null and must remain null
        assertNull(bankAccount.getAvailableBalance());
    }

    @Test
    public void confirmRefund_bankAccount_shouldSaveBothBankAccountAndRefundRequest() {
        UUID requestId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();

        RefundRequest request = createRefundRequest(RefundStatus.PENDING);
        request.setId(requestId);
        request.setTotalRefundAmount(BigDecimal.valueOf(500));

        BankAccount bankAccount = createBankAccount(accountId, BigDecimal.valueOf(1000));
        ConfirmRefundRequestDTO confirmDTO = createConfirmDTO(AccountType.BANK_ACCOUNT, accountId);

        when(refundRequestRepository.findById(requestId)).thenReturn(Optional.of(request));
        when(bankAccountRepository.findById(accountId)).thenReturn(Optional.of(bankAccount));
        when(refundRequestRepository.save(any(RefundRequest.class))).thenAnswer(i -> i.getArgument(0));

        refundRequestService.confirmRefund(requestId, confirmDTO, "finance_user");

        verify(bankAccountRepository).save(bankAccount);
        verify(refundRequestRepository).save(request);
        verifyNoInteractions(cashSafeRepository, cashWithPersonRepository);
    }

    @Test
    public void confirmRefund_bankAccountNotFound_shouldThrowRuntimeException() {
        UUID requestId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();

        RefundRequest request = createRefundRequest(RefundStatus.PENDING);
        request.setId(requestId);

        ConfirmRefundRequestDTO confirmDTO = createConfirmDTO(AccountType.BANK_ACCOUNT, accountId);

        when(refundRequestRepository.findById(requestId)).thenReturn(Optional.of(request));
        when(bankAccountRepository.findById(accountId)).thenReturn(Optional.empty());

        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> refundRequestService.confirmRefund(requestId, confirmDTO, "finance_user"));

        assertEquals("Bank Account not found", exception.getMessage());
        verify(bankAccountRepository).findById(accountId);
        verify(refundRequestRepository, never()).save(any());
    }

    @Test
    public void confirmRefund_cashSafe_shouldUpdateCurrentAndAvailableBalance() {
        UUID requestId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();
        BigDecimal initialBalance = BigDecimal.valueOf(2000);
        BigDecimal refundAmount = BigDecimal.valueOf(300);

        RefundRequest request = createRefundRequest(RefundStatus.PENDING);
        request.setId(requestId);
        request.setTotalRefundAmount(refundAmount);

        CashSafe cashSafe = createCashSafe(accountId, initialBalance);
        ConfirmRefundRequestDTO confirmDTO = createConfirmDTO(AccountType.CASH_SAFE, accountId);

        when(refundRequestRepository.findById(requestId)).thenReturn(Optional.of(request));
        when(cashSafeRepository.findById(accountId)).thenReturn(Optional.of(cashSafe));
        when(refundRequestRepository.save(any(RefundRequest.class))).thenAnswer(i -> i.getArgument(0));

        RefundRequestResponseDTO result =
                refundRequestService.confirmRefund(requestId, confirmDTO, "finance_user");

        assertNotNull(result);
        assertEquals(RefundStatus.CONFIRMED, request.getStatus());
        // currentBalance: 2000 + 300 = 2300
        assertEquals(BigDecimal.valueOf(2300), cashSafe.getCurrentBalance());
        assertEquals(BigDecimal.valueOf(2300), cashSafe.getAvailableBalance());
        // validateAndGetAccountName + updateAccountBalance each call findById once
        verify(cashSafeRepository, times(2)).findById(accountId);
        verify(cashSafeRepository).save(cashSafe);
        verifyNoInteractions(bankAccountRepository, cashWithPersonRepository);
    }

    @Test
    public void confirmRefund_cashSafe_shouldSetAccountNameAsSafeNameAndLocation() {
        UUID requestId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();

        RefundRequest request = createRefundRequest(RefundStatus.PENDING);
        request.setId(requestId);
        request.setTotalRefundAmount(BigDecimal.valueOf(300));

        CashSafe cashSafe = createCashSafe(accountId, BigDecimal.valueOf(2000));
        ConfirmRefundRequestDTO confirmDTO = createConfirmDTO(AccountType.CASH_SAFE, accountId);

        when(refundRequestRepository.findById(requestId)).thenReturn(Optional.of(request));
        when(cashSafeRepository.findById(accountId)).thenReturn(Optional.of(cashSafe));
        when(refundRequestRepository.save(any(RefundRequest.class))).thenAnswer(i -> i.getArgument(0));

        refundRequestService.confirmRefund(requestId, confirmDTO, "finance_user");

        assertEquals(AccountType.CASH_SAFE, request.getBalanceType());
        // format: safeName + " (" + location + ")"
        assertEquals("Main Safe (HQ)", request.getBalanceAccountName());
    }

    @Test
    public void confirmRefund_cashSafe_nullAvailableBalance_shouldOnlyUpdateCurrentBalance() {
        UUID requestId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();

        RefundRequest request = createRefundRequest(RefundStatus.PENDING);
        request.setId(requestId);
        request.setTotalRefundAmount(BigDecimal.valueOf(100));

        CashSafe cashSafe = createCashSafe(accountId, BigDecimal.valueOf(500));
        cashSafe.setAvailableBalance(null);

        ConfirmRefundRequestDTO confirmDTO = createConfirmDTO(AccountType.CASH_SAFE, accountId);

        when(refundRequestRepository.findById(requestId)).thenReturn(Optional.of(request));
        when(cashSafeRepository.findById(accountId)).thenReturn(Optional.of(cashSafe));
        when(refundRequestRepository.save(any(RefundRequest.class))).thenAnswer(i -> i.getArgument(0));

        refundRequestService.confirmRefund(requestId, confirmDTO, "finance_user");

        // currentBalance: 500 + 100 = 600
        assertEquals(BigDecimal.valueOf(600), cashSafe.getCurrentBalance());
        assertNull(cashSafe.getAvailableBalance());
    }

    @Test
    public void confirmRefund_cashSafeNotFound_shouldThrowRuntimeException() {
        UUID requestId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();

        RefundRequest request = createRefundRequest(RefundStatus.PENDING);
        request.setId(requestId);

        ConfirmRefundRequestDTO confirmDTO = createConfirmDTO(AccountType.CASH_SAFE, accountId);

        when(refundRequestRepository.findById(requestId)).thenReturn(Optional.of(request));
        when(cashSafeRepository.findById(accountId)).thenReturn(Optional.empty());

        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> refundRequestService.confirmRefund(requestId, confirmDTO, "finance_user"));

        assertEquals("Cash Safe not found", exception.getMessage());
        verify(cashSafeRepository).findById(accountId);
        verify(refundRequestRepository, never()).save(any());
    }

    @Test
    public void confirmRefund_cashWithPerson_shouldUpdateCurrentAndAvailableBalance() {
        UUID requestId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();
        BigDecimal initialBalance = BigDecimal.valueOf(1500);
        BigDecimal refundAmount = BigDecimal.valueOf(400);

        RefundRequest request = createRefundRequest(RefundStatus.PENDING);
        request.setId(requestId);
        request.setTotalRefundAmount(refundAmount);

        CashWithPerson cashWithPerson = createCashWithPerson(accountId, initialBalance);
        ConfirmRefundRequestDTO confirmDTO =
                createConfirmDTO(AccountType.CASH_WITH_PERSON, accountId);

        when(refundRequestRepository.findById(requestId)).thenReturn(Optional.of(request));
        when(cashWithPersonRepository.findById(accountId)).thenReturn(Optional.of(cashWithPerson));
        when(refundRequestRepository.save(any(RefundRequest.class))).thenAnswer(i -> i.getArgument(0));

        RefundRequestResponseDTO result =
                refundRequestService.confirmRefund(requestId, confirmDTO, "finance_user");

        assertNotNull(result);
        assertEquals(RefundStatus.CONFIRMED, request.getStatus());
        // currentBalance: 1500 + 400 = 1900
        assertEquals(BigDecimal.valueOf(1900), cashWithPerson.getCurrentBalance());
        assertEquals(BigDecimal.valueOf(1900), cashWithPerson.getAvailableBalance());
        // validateAndGetAccountName + updateAccountBalance each call findById once
        verify(cashWithPersonRepository, times(2)).findById(accountId);
        verify(cashWithPersonRepository).save(cashWithPerson);
        verifyNoInteractions(bankAccountRepository, cashSafeRepository);
    }

    @Test
    public void confirmRefund_cashWithPerson_shouldSetAccountNameAsPersonName() {
        UUID requestId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();

        RefundRequest request = createRefundRequest(RefundStatus.PENDING);
        request.setId(requestId);
        request.setTotalRefundAmount(BigDecimal.valueOf(400));

        CashWithPerson cashWithPerson = createCashWithPerson(accountId, BigDecimal.valueOf(1500));
        ConfirmRefundRequestDTO confirmDTO =
                createConfirmDTO(AccountType.CASH_WITH_PERSON, accountId);

        when(refundRequestRepository.findById(requestId)).thenReturn(Optional.of(request));
        when(cashWithPersonRepository.findById(accountId)).thenReturn(Optional.of(cashWithPerson));
        when(refundRequestRepository.save(any(RefundRequest.class))).thenAnswer(i -> i.getArgument(0));

        refundRequestService.confirmRefund(requestId, confirmDTO, "finance_user");

        assertEquals(AccountType.CASH_WITH_PERSON, request.getBalanceType());
        // format: just personName
        assertEquals("John Doe", request.getBalanceAccountName());
    }

    @Test
    public void confirmRefund_cashWithPerson_nullAvailableBalance_shouldOnlyUpdateCurrentBalance() {
        UUID requestId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();

        RefundRequest request = createRefundRequest(RefundStatus.PENDING);
        request.setId(requestId);
        request.setTotalRefundAmount(BigDecimal.valueOf(150));

        CashWithPerson cashWithPerson = createCashWithPerson(accountId, BigDecimal.valueOf(700));
        cashWithPerson.setAvailableBalance(null);

        ConfirmRefundRequestDTO confirmDTO =
                createConfirmDTO(AccountType.CASH_WITH_PERSON, accountId);

        when(refundRequestRepository.findById(requestId)).thenReturn(Optional.of(request));
        when(cashWithPersonRepository.findById(accountId)).thenReturn(Optional.of(cashWithPerson));
        when(refundRequestRepository.save(any(RefundRequest.class))).thenAnswer(i -> i.getArgument(0));

        refundRequestService.confirmRefund(requestId, confirmDTO, "finance_user");

        // currentBalance: 700 + 150 = 850
        assertEquals(BigDecimal.valueOf(850), cashWithPerson.getCurrentBalance());
        assertNull(cashWithPerson.getAvailableBalance());
    }

    @Test
    public void confirmRefund_cashWithPersonNotFound_shouldThrowRuntimeException() {
        UUID requestId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();

        RefundRequest request = createRefundRequest(RefundStatus.PENDING);
        request.setId(requestId);

        ConfirmRefundRequestDTO confirmDTO =
                createConfirmDTO(AccountType.CASH_WITH_PERSON, accountId);

        when(refundRequestRepository.findById(requestId)).thenReturn(Optional.of(request));
        when(cashWithPersonRepository.findById(accountId)).thenReturn(Optional.empty());

        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> refundRequestService.confirmRefund(requestId, confirmDTO, "finance_user"));

        assertEquals("Cash With Person not found", exception.getMessage());
        verify(cashWithPersonRepository).findById(accountId);
        verify(refundRequestRepository, never()).save(any());
    }

    @Test
    public void confirmRefund_bankAccount_returnedDTOReflectsConfirmedState() {
        UUID requestId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();

        RefundRequest request = createRefundRequest(RefundStatus.PENDING);
        request.setId(requestId);
        request.setTotalRefundAmount(BigDecimal.valueOf(500));

        BankAccount bankAccount = createBankAccount(accountId, BigDecimal.valueOf(1000));
        ConfirmRefundRequestDTO confirmDTO = createConfirmDTO(AccountType.BANK_ACCOUNT, accountId);

        when(refundRequestRepository.findById(requestId)).thenReturn(Optional.of(request));
        when(bankAccountRepository.findById(accountId)).thenReturn(Optional.of(bankAccount));
        when(refundRequestRepository.save(any(RefundRequest.class))).thenAnswer(i -> i.getArgument(0));

        RefundRequestResponseDTO result =
                refundRequestService.confirmRefund(requestId, confirmDTO, "finance_user");

        assertEquals(requestId, result.getId());
        assertEquals(RefundStatus.CONFIRMED, result.getStatus());
        assertEquals("finance_user", result.getConfirmedBy());
        assertNotNull(result.getConfirmedAt());
    }

    // ==================== Helper methods ====================

    private RefundRequest createRefundRequest(RefundStatus status) {
        PurchaseOrder po = new PurchaseOrder();
        po.setId(UUID.randomUUID());
        po.setPoNumber("PO-001");

        Merchant merchant = new Merchant();
        merchant.setId(UUID.randomUUID());
        merchant.setName("Test Merchant");
        merchant.setContactPhone("123456");
        merchant.setContactEmail("merchant@test.com");

        RefundRequest refundRequest = new RefundRequest();
        refundRequest.setId(UUID.randomUUID());
        refundRequest.setPurchaseOrder(po);
        refundRequest.setMerchant(merchant);
        refundRequest.setStatus(status);
        refundRequest.setTotalRefundAmount(BigDecimal.valueOf(500));
        refundRequest.setRefundItems(new ArrayList<>());
        return refundRequest;
    }

    private ConfirmRefundRequestDTO createConfirmDTO(AccountType accountType, UUID accountId) {
        ConfirmRefundRequestDTO dto = new ConfirmRefundRequestDTO();
        dto.setBalanceType(accountType);
        dto.setBalanceAccountId(accountId);
        dto.setDateReceived(LocalDate.now());
        dto.setFinanceNotes("Test refund confirmation");
        return dto;
    }

    private BankAccount createBankAccount(UUID id, BigDecimal balance) {
        BankAccount acc = new BankAccount();
        acc.setId(id);
        acc.setBankName("Test Bank");
        acc.setAccountNumber("ACC-001");
        acc.setCurrentBalance(balance);
        acc.setAvailableBalance(balance);
        return acc;
    }

    private CashSafe createCashSafe(UUID id, BigDecimal balance) {
        CashSafe safe = new CashSafe();
        safe.setId(id);
        safe.setSafeName("Main Safe");
        safe.setLocation("HQ");
        safe.setCurrentBalance(balance);
        safe.setAvailableBalance(balance);
        return safe;
    }

    private CashWithPerson createCashWithPerson(UUID id, BigDecimal balance) {
        CashWithPerson cwp = new CashWithPerson();
        cwp.setId(id);
        cwp.setPersonName("John Doe");
        cwp.setCurrentBalance(balance);
        cwp.setAvailableBalance(balance);
        return cwp;
    }
}