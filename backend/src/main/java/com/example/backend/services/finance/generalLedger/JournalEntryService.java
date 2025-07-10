package com.example.backend.services.finance.generalLedger;

import com.example.backend.dto.finance.generalLedger.JournalEntryLineDTO;
import com.example.backend.dto.finance.generalLedger.JournalEntryLineResponseDTO;
import com.example.backend.dto.finance.generalLedger.JournalEntryRequestDTO;
import com.example.backend.dto.finance.generalLedger.JournalEntryResponseDTO;
import com.example.backend.models.user.User;
import com.example.backend.models.finance.generalLedger.AuditAction;
import com.example.backend.models.finance.generalLedger.JournalEntry;
import com.example.backend.models.finance.generalLedger.JournalEntryLine;
import com.example.backend.models.finance.generalLedger.JournalEntryStatus;
import com.example.backend.repositories.finance.generalLedger.JournalEntryRepository;
import com.example.backend.repositories.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class JournalEntryService {

    private JournalEntryRepository journalEntryRepository;
    private UserRepository userRepository;
    private AccountingPeriodService accountingPeriodService;
    private AuditService auditService;

    @Autowired
    public JournalEntryService(JournalEntryRepository journalEntryRepository, UserRepository userRepository, AccountingPeriodService accountingPeriodService, AuditService auditService) {
        this.journalEntryRepository = journalEntryRepository;
        this.userRepository = userRepository;
        this.accountingPeriodService = accountingPeriodService;
        this.auditService = auditService;
    }

    @Transactional
    public JournalEntryResponseDTO createJournalEntry(JournalEntryRequestDTO requestDTO, UUID userId) {
        // Validate the request
        validateJournalEntryRequest(requestDTO);

        if (accountingPeriodService.isPeriodClosed(requestDTO.getEntryDate())) {
            throw new RuntimeException("Cannot create journal entry in a closed accounting period");
        }

        // Find the user
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        // Create new journal entry
        JournalEntry journalEntry = new JournalEntry();
        journalEntry.setEntryDate(requestDTO.getEntryDate());
        journalEntry.setReferenceNumber(requestDTO.getReferenceNumber());
        journalEntry.setDescription(requestDTO.getDescription());
        journalEntry.setCreatedBy(user);

        // Handle document path if set directly (from Minio)
        if (requestDTO.getDocumentPath() != null && !requestDTO.getDocumentPath().isEmpty()) {
            journalEntry.setDocumentPath(requestDTO.getDocumentPath());
        }
        // Handle base64 document if provided (legacy support)
        else if (requestDTO.getDocumentBase64() != null && !requestDTO.getDocumentBase64().isEmpty()) {
            // This part would need to be implemented if you want to support base64 uploads
            // However, it's better to use the Minio approach for all file uploads
        }

        // Add entry lines
        for (JournalEntryLineDTO lineDTO : requestDTO.getEntryLines()) {
            JournalEntryLine line = new JournalEntryLine();

            // Account account = accountRepository.findById(lineDTO.getAccountId())
            //        .orElseThrow(() -> new RuntimeException("Account not found with id: " + lineDTO.getAccountId()));

            // line.setAccount(account);
            line.setAmount(lineDTO.getAmount());
            line.setDebit(lineDTO.isDebit());
            line.setDescription(lineDTO.getDescription());

            journalEntry.addLine(line);
        }

        // Check if journal entry is balanced
        if (!journalEntry.isBalanced()) {
            throw new RuntimeException("Journal entry is not balanced. Total debits must equal total credits.");
        }

        JournalEntry savedJournalEntry = journalEntryRepository.save(journalEntry);

        Map<String, Object> changes = new HashMap<>();
        changes.put("action", "create");
        changes.put("referenceNumber", savedJournalEntry.getReferenceNumber());
        changes.put("entryDate", savedJournalEntry.getEntryDate().toString());
        changes.put("amount", calculateTotalAmount(savedJournalEntry));

        auditService.logEvent("JournalEntry", savedJournalEntry.getId(),
                AuditAction.CREATE, changes, journalEntry.getCreatedBy());

        return mapToJournalEntryResponseDTO(savedJournalEntry);
    }

    private BigDecimal calculateTotalAmount(JournalEntry journalEntry) {
        return journalEntry.getEntryLines().stream()
                .map(JournalEntryLine::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private void validateJournalEntryRequest(JournalEntryRequestDTO requestDTO) {
        if (requestDTO.getEntryDate() == null) {
            throw new RuntimeException("Entry date is required");
        }

        if (requestDTO.getReferenceNumber() == null || requestDTO.getReferenceNumber().trim().isEmpty()) {
            throw new RuntimeException("Reference number is required");
        }

        if (requestDTO.getEntryLines() == null || requestDTO.getEntryLines().isEmpty()) {
            throw new RuntimeException("Journal entry must have at least one line");
        }

        // Check if total debits equal total credits
        BigDecimal totalDebits = BigDecimal.ZERO;
        BigDecimal totalCredits = BigDecimal.ZERO;

        for (JournalEntryLineDTO line : requestDTO.getEntryLines()) {
            // if (line.getAccountId() == null) {
            //     throw new RuntimeException("Account is required for each journal entry line");
            // }

            if (line.getAmount() == null || line.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
                throw new RuntimeException("Amount must be greater than zero for each journal entry line");
            }

            if (line.isDebit()) {
                totalDebits = totalDebits.add(line.getAmount());
            } else {
                totalCredits = totalCredits.add(line.getAmount());
            }
        }

        if (totalDebits.compareTo(totalCredits) != 0) {
            throw new RuntimeException("Journal entry is not balanced. Total debits: " +
                    totalDebits + ", Total credits: " + totalCredits);
        }
    }

    public JournalEntryResponseDTO getJournalEntryById(UUID id) {
        JournalEntry journalEntry = journalEntryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Journal entry not found with id: " + id));

        return mapToJournalEntryResponseDTO(journalEntry);
    }

    public List<JournalEntryResponseDTO> getAllJournalEntries() {
        List<JournalEntry> journalEntries = journalEntryRepository.findAll();

        return journalEntries.stream()
                .map(this::mapToJournalEntryResponseDTO)
                .collect(Collectors.toList());
    }

    public List<JournalEntryResponseDTO> getJournalEntriesByStatus(JournalEntryStatus status) {
        List<JournalEntry> journalEntries = journalEntryRepository.findByStatus(status);

        return journalEntries.stream()
                .map(this::mapToJournalEntryResponseDTO)
                .collect(Collectors.toList());
    }

    public List<JournalEntryResponseDTO> getJournalEntriesByDateRange(LocalDate startDate, LocalDate endDate) {
        List<JournalEntry> journalEntries = journalEntryRepository.findByEntryDateBetween(startDate, endDate);

        return journalEntries.stream()
                .map(this::mapToJournalEntryResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public JournalEntryResponseDTO approveJournalEntry(UUID id, UUID approverId, String comments) {
        JournalEntry journalEntry = journalEntryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Journal entry not found with id: " + id));

        // Check if the journal entry is already approved or rejected
        if (journalEntry.getStatus() != JournalEntryStatus.PENDING) {
            throw new RuntimeException("Journal entry is already " + journalEntry.getStatus());
        }

        // Find the approver
        User approver = userRepository.findById(approverId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + approverId));

        // Ensure approver is not the same as creator
        if (journalEntry.getCreatedBy().getId().equals(approverId)) {
            throw new RuntimeException("The approver cannot be the same as the creator");
        }

        journalEntry.setStatus(JournalEntryStatus.APPROVED);
        journalEntry.setApprovalComments(comments);
        journalEntry.setReviewedBy(approver);
        journalEntry.setReviewedAt(LocalDateTime.now());

        JournalEntry savedJournalEntry = journalEntryRepository.save(journalEntry);

        Map<String, Object> changes = new HashMap<>();
        changes.put("action", "approve");
        changes.put("status", journalEntry.getStatus().toString());
        changes.put("comments", comments);

        auditService.logEvent("JournalEntry", savedJournalEntry.getId(),
                AuditAction.UPDATE, changes, approver);


        // Send notification to creator (this would be implemented separately)
        notifyUser(journalEntry.getCreatedBy(), "Journal entry approved",
                "Your journal entry " + journalEntry.getReferenceNumber() + " has been approved.");

        return mapToJournalEntryResponseDTO(savedJournalEntry);
    }

    @Transactional
    public JournalEntryResponseDTO rejectJournalEntry(UUID id, UUID rejecterId, String reason) {
        JournalEntry journalEntry = journalEntryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Journal entry not found with id: " + id));

        // Check if the journal entry is already approved or rejected
        if (journalEntry.getStatus() != JournalEntryStatus.PENDING) {
            throw new RuntimeException("Journal entry is already " + journalEntry.getStatus());
        }

        // Find the rejecter
        User rejecter = userRepository.findById(rejecterId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + rejecterId));

        journalEntry.setStatus(JournalEntryStatus.REJECTED);
        journalEntry.setRejectionReason(reason);
        journalEntry.setReviewedBy(rejecter); // This field stores who took action
        journalEntry.setReviewedAt(LocalDateTime.now());

        JournalEntry savedJournalEntry = journalEntryRepository.save(journalEntry);

        Map<String, Object> changes = new HashMap<>();
        changes.put("action", "reject");
        changes.put("status", journalEntry.getStatus().toString());
        changes.put("reason", reason);

        auditService.logEvent("JournalEntry", savedJournalEntry.getId(),
                AuditAction.UPDATE, changes, rejecter);

        // Send notification to creator
        notifyUser(journalEntry.getCreatedBy(), "Journal entry rejected",
                "Your journal entry " + journalEntry.getReferenceNumber() + " has been rejected.");

        return mapToJournalEntryResponseDTO(savedJournalEntry);
    }

    @Transactional
    public void deleteJournalEntry(UUID id) {
        JournalEntry journalEntry = journalEntryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Journal entry not found with id: " + id));

        if (accountingPeriodService.isPeriodClosed(journalEntry.getEntryDate())) {
            throw new RuntimeException("Cannot delete journal entry in a closed accounting period");
        }

        // Check if the journal entry is locked
        if (journalEntry.isLocked()) {
            throw new RuntimeException("Cannot delete an approved journal entry");
        }

        Map<String, Object> changes = new HashMap<>();
        changes.put("action", "delete");
        changes.put("referenceNumber", journalEntry.getReferenceNumber());
        changes.put("entryDate", journalEntry.getEntryDate().toString());

        User currentUser = null; // In a real app, get the current user from security context
        auditService.logEvent("JournalEntry", journalEntry.getId(),
                AuditAction.DELETE, changes, currentUser);

        journalEntryRepository.delete(journalEntry);
    }

    // Add a method to update journal entries
    @Transactional
    public JournalEntryResponseDTO updateJournalEntry(UUID id, JournalEntryRequestDTO requestDTO) {
        JournalEntry journalEntry = journalEntryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Journal entry not found with id: " + id));

        // Check if the journal entry is locked
        if (journalEntry.isLocked()) {
            throw new RuntimeException("Cannot update an approved journal entry");
        }

        if (accountingPeriodService.isPeriodClosed(requestDTO.getEntryDate())) {
            throw new RuntimeException("Cannot update journal entry in a closed accounting period");
        }

        String originalReferenceNumber = journalEntry.getReferenceNumber();
        LocalDate originalEntryDate = journalEntry.getEntryDate();
        String originalDescription = journalEntry.getDescription();
        BigDecimal originalAmount = calculateTotalAmount(journalEntry);


        // Validate the request
        validateJournalEntryRequest(requestDTO);

        // Update basic properties
        journalEntry.setEntryDate(requestDTO.getEntryDate());
        journalEntry.setReferenceNumber(requestDTO.getReferenceNumber());
        journalEntry.setDescription(requestDTO.getDescription());

        // Handle document path if set directly (from Minio)
        if (requestDTO.getDocumentPath() != null && !requestDTO.getDocumentPath().isEmpty()) {
            journalEntry.setDocumentPath(requestDTO.getDocumentPath());
        }

        // Clear existing lines and add new ones
        journalEntry.getEntryLines().clear();

        for (JournalEntryLineDTO lineDTO : requestDTO.getEntryLines()) {
            JournalEntryLine line = new JournalEntryLine();

            // Account account = accountRepository.findById(lineDTO.getAccountId())
            //    .orElseThrow(() -> new RuntimeException("Account not found with id: " + lineDTO.getAccountId()));

            // line.setAccount(account);
            line.setAmount(lineDTO.getAmount());
            line.setDebit(lineDTO.isDebit());
            line.setDescription(lineDTO.getDescription());

            journalEntry.addLine(line);
        }

        // Check if journal entry is balanced
        if (!journalEntry.isBalanced()) {
            throw new RuntimeException("Journal entry is not balanced. Total debits must equal total credits.");
        }

        JournalEntry savedJournalEntry = journalEntryRepository.save(journalEntry);

        Map<String, Object> changes = new HashMap<>();
        changes.put("action", "update");
        changes.put("referenceNumber", Map.of("from", originalReferenceNumber, "to", savedJournalEntry.getReferenceNumber()));
        changes.put("entryDate", Map.of("from", originalEntryDate.toString(), "to", savedJournalEntry.getEntryDate().toString()));
        changes.put("description", Map.of("from", originalDescription, "to", savedJournalEntry.getDescription()));
        changes.put("amount", Map.of("from", originalAmount, "to", calculateTotalAmount(savedJournalEntry)));

        User currentUser = null; // In a real app, get the current user from security context
        auditService.logEvent("JournalEntry", savedJournalEntry.getId(),
                AuditAction.UPDATE, changes, currentUser);

        return mapToJournalEntryResponseDTO(savedJournalEntry);
    }

    private void notifyUser(User user, String subject, String message) {
        // This would be implemented with your notification system
        // Could be email, in-app notification, etc.
        System.out.println("Notification to " + user.getUsername() + ": " + subject + " - " + message);
    }

    public List<JournalEntryResponseDTO> searchJournalEntries(String keyword) {
        List<JournalEntry> journalEntries = journalEntryRepository.findByReferenceNumberContaining(keyword);

        return journalEntries.stream()
                .map(this::mapToJournalEntryResponseDTO)
                .collect(Collectors.toList());
    }

    private JournalEntryResponseDTO mapToJournalEntryResponseDTO(JournalEntry journalEntry) {
        JournalEntryResponseDTO dto = new JournalEntryResponseDTO();
        dto.setId(journalEntry.getId());
        dto.setEntryDate(journalEntry.getEntryDate());
        dto.setReferenceNumber(journalEntry.getReferenceNumber());
        dto.setDescription(journalEntry.getDescription());
        dto.setStatus(journalEntry.getStatus().toString());

        if (journalEntry.getCreatedBy() != null) {
            dto.setCreatedBy(journalEntry.getCreatedBy().getUsername());
        }

        dto.setDocumentPath(journalEntry.getDocumentPath());
        dto.setBalanced(journalEntry.isBalanced());
        dto.setApprovalComments(journalEntry.getApprovalComments());
        dto.setRejectionReason(journalEntry.getRejectionReason());
        dto.setLocked(journalEntry.isLocked());

        if (journalEntry.getReviewedBy() != null) {
            dto.setReviewedBy(journalEntry.getReviewedBy().getUsername());
        }

        dto.setReviewedAt(journalEntry.getReviewedAt());

        List<JournalEntryLineResponseDTO> entryLines = journalEntry.getEntryLines().stream()
                .map(this::mapToJournalEntryLineResponseDTO)
                .collect(Collectors.toList());

        dto.setEntryLines(entryLines);

        return dto;
    }

    private JournalEntryLineResponseDTO mapToJournalEntryLineResponseDTO(JournalEntryLine line) {
        JournalEntryLineResponseDTO dto = new JournalEntryLineResponseDTO();
        dto.setId(line.getId());

        // if (line.getAccount() != null) {
        //     dto.setAccountName(line.getAccount().getName());
        //     dto.setAccountNumber(line.getAccount().getAccountNumber());
        // }

        dto.setAmount(line.getAmount());
        dto.setDebit(line.isDebit());
        dto.setDescription(line.getDescription());

        return dto;
    }
}
