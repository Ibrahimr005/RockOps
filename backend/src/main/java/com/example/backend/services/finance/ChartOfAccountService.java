//package com.example.backend.services.finance;
//
//import com.example.backend.dto.finance.ChartOfAccountCreateDTO;
//import com.example.backend.dto.finance.ChartOfAccountDTO;
//import com.example.backend.exceptions.DuplicateResourceException;
//import com.example.backend.exceptions.ResourceNotFoundException;
//import com.example.backend.models.finance.AccountType;
//import com.example.backend.models.finance.ChartOfAccount;
//import com.example.backend.models.user.User;
//import com.example.backend.repositories.finance.ChartOfAccountRepository;
//import com.example.backend.repositories.UserRepository;
//import jakarta.transaction.Transactional;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.stereotype.Service;
//
//import java.time.LocalDateTime;
//import java.util.HashMap;
//import java.util.List;
//import java.util.Map;
//import java.util.UUID;
//import java.util.stream.Collectors;
//
//@Service
//public class ChartOfAccountService {
//
//    @Autowired
//    private ChartOfAccountRepository accountRepository;
//
//    @Autowired
//    private UserRepository userRepository;
//
//    /**
//     * Create a new account in the chart of accounts
//     */
//    @Transactional
//    public ChartOfAccountDTO createAccount(ChartOfAccountCreateDTO dto, UUID currentUserId) {
//        // Check if account number already exists
//        if (accountRepository.existsByAccountNumber(dto.getAccountNumber())) {
//            throw new DuplicateResourceException("Account number already exists: " + dto.getAccountNumber());
//        }
//
//        // Validate parent account if provided
//        if (dto.getParentAccountId() != null) {
//            accountRepository.findById(dto.getParentAccountId())
//                    .orElseThrow(() -> new ResourceNotFoundException("Parent account not found"));
//        }
//
//        // Get current user
//        User currentUser = userRepository.findById(currentUserId)
//                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
//
//        // Create new account
//        ChartOfAccount account = new ChartOfAccount();
//        account.setAccountNumber(dto.getAccountNumber());
//        account.setAccountName(dto.getAccountName());
//        account.setAccountType(dto.getAccountType());
//        account.setDescription(dto.getDescription());
//        account.setIsActive(true);
//        account.setParentAccountId(dto.getParentAccountId());
//        account.setCreatedBy(currentUser);
//        account.setCreatedDate(LocalDateTime.now());
//
//        // Save and return
//        ChartOfAccount savedAccount = accountRepository.save(account);
//        return convertToDTO(savedAccount);
//    }
//
//    /**
//     * Update an existing account
//     */
//    @Transactional
//    public ChartOfAccountDTO updateAccount(UUID accountId, ChartOfAccountCreateDTO dto, UUID currentUserId) {
//        // Find the account to update
//        ChartOfAccount account = accountRepository.findById(accountId)
//                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
//
//        // Check if the new account number already exists (if changed)
//        if (!account.getAccountNumber().equals(dto.getAccountNumber()) &&
//                accountRepository.existsByAccountNumber(dto.getAccountNumber())) {
//            throw new DuplicateResourceException("Account number already exists: " + dto.getAccountNumber());
//        }
//
//        // Validate parent account if provided
//        if (dto.getParentAccountId() != null) {
//            // Prevent circular reference
//            if (dto.getParentAccountId().equals(accountId)) {
//                throw new IllegalArgumentException("Account cannot be its own parent");
//            }
//
//            accountRepository.findById(dto.getParentAccountId())
//                    .orElseThrow(() -> new ResourceNotFoundException("Parent account not found"));
//        }
//
//        // Get current user
//        User currentUser = userRepository.findById(currentUserId)
//                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
//
//        // Update account
//        account.setAccountNumber(dto.getAccountNumber());
//        account.setAccountName(dto.getAccountName());
//        account.setAccountType(dto.getAccountType());
//        account.setDescription(dto.getDescription());
//        account.setParentAccountId(dto.getParentAccountId());
//        account.setModifiedBy(currentUser);
//        account.setModifiedDate(LocalDateTime.now());
//
//        // Save and return
//        ChartOfAccount updatedAccount = accountRepository.save(account);
//        return convertToDTO(updatedAccount);
//    }
//
//    /**
//     * Deactivate an account
//     */
//    @Transactional
//    public ChartOfAccountDTO deactivateAccount(UUID accountId, UUID currentUserId) {
//        // Find the account
//        ChartOfAccount account = accountRepository.findById(accountId)
//                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
//
//        // Check if account has child accounts
//        List<ChartOfAccount> childAccounts = accountRepository.findByParentAccountId(accountId);
//        if (!childAccounts.isEmpty()) {
//            throw new IllegalStateException("Cannot deactivate account with child accounts");
//        }
//
//        // Get current user
//        User currentUser = userRepository.findById(currentUserId)
//                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
//
//        // Deactivate the account
//        account.setIsActive(false);
//        account.setModifiedBy(currentUser);
//        account.setModifiedDate(LocalDateTime.now());
//
//        // Save and return
//        ChartOfAccount updatedAccount = accountRepository.save(account);
//        return convertToDTO(updatedAccount);
//    }
//
//    /**
//     * Get all accounts
//     */
//    public List<ChartOfAccountDTO> getAllAccounts() {
//        return accountRepository.findAll().stream()
//                .map(this::convertToDTO)
//                .collect(Collectors.toList());
//    }
//
//    /**
//     * Get active accounts
//     */
//    public List<ChartOfAccountDTO> getActiveAccounts() {
//        return accountRepository.findByIsActiveTrue().stream()
//                .map(this::convertToDTO)
//                .collect(Collectors.toList());
//    }
//
//    /**
//     * Get account by ID
//     */
//    public ChartOfAccountDTO getAccountById(UUID accountId) {
//        ChartOfAccount account = accountRepository.findById(accountId)
//                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
//        return convertToDTO(account);
//    }
//
//    /**
//     * Get accounts by type
//     */
//    public List<ChartOfAccountDTO> getAccountsByType(AccountType accountType) {
//        return accountRepository.findByAccountType(accountType).stream()
//                .map(this::convertToDTO)
//                .collect(Collectors.toList());
//    }
//
//    /**
//     * Get account hierarchy
//     */
//    public List<Map<String, Object>> getAccountHierarchy() {
//        // Get all parent accounts (accounts with no parent)
//        List<ChartOfAccount> parentAccounts = accountRepository.findAllParentAccounts();
//
//        // Build hierarchy
//        return parentAccounts.stream()
//                .map(this::buildHierarchyNode)
//                .collect(Collectors.toList());
//    }
//
//    /**
//     * Recursively build hierarchy node
//     */
//    private Map<String, Object> buildHierarchyNode(ChartOfAccount account) {
//        Map<String, Object> node = new HashMap<>();
//        node.put("id", account.getAccountId());
//        node.put("accountNumber", account.getAccountNumber());
//        node.put("accountName", account.getAccountName());
//        node.put("accountType", account.getAccountType());
//        node.put("isActive", account.getIsActive());
//
//        // Get children
//        List<ChartOfAccount> children = accountRepository.findByParentAccountId(account.getAccountId());
//        if (!children.isEmpty()) {
//            node.put("children", children.stream()
//                    .map(this::buildHierarchyNode)
//                    .collect(Collectors.toList()));
//        }
//
//        return node;
//    }
//
//    /**
//     * Convert entity to DTO manually instead of using ModelMapper
//     */
//    private ChartOfAccountDTO convertToDTO(ChartOfAccount account) {
//        ChartOfAccountDTO dto = new ChartOfAccountDTO();
//        dto.setAccountId(account.getAccountId());
//        dto.setAccountNumber(account.getAccountNumber());
//        dto.setAccountName(account.getAccountName());
//        dto.setAccountType(account.getAccountType());
//        dto.setDescription(account.getDescription());
//        dto.setIsActive(account.getIsActive());
//        dto.setParentAccountId(account.getParentAccountId());
//        dto.setCreatedDate(account.getCreatedDate());
//        dto.setModifiedDate(account.getModifiedDate());
//
//        // Set creator and modifier information
//        if (account.getCreatedBy() != null) {
//            dto.setCreatedById(account.getCreatedBy().getId());
//            dto.setCreatedByName(account.getCreatedBy().getFirstName()+" " +account.getCreatedBy().getLastName());
//        }
//
//        if (account.getModifiedBy() != null) {
//            dto.setModifiedById(account.getModifiedBy().getId());
//            dto.setModifiedByName(account.getCreatedBy().getFirstName()+" " +account.getCreatedBy().getLastName());
//        }
//
//        // Set parent account name if exists
//        if (account.getParentAccountId() != null) {
//            accountRepository.findById(account.getParentAccountId())
//                    .ifPresent(parent -> dto.setParentAccountName(parent.getAccountName()));
//        }
//
//        return dto;
//    }
//}