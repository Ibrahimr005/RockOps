package com.example.backend.services.finance.bankReconciliation;

import com.example.backend.dto.finance.bankReconciliation.DiscrepancyRequestDTO;
import com.example.backend.dto.finance.bankReconciliation.DiscrepancyResponseDTO;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.example.backend.models.finance.bankReconciliation.*;
import com.example.backend.repositories.finance.bankReconciliation.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class DiscrepancyService {

    private final DiscrepancyRepository discrepancyRepository;
    private final BankAccountRepository bankAccountRepository;
    private final InternalTransactionRepository internalTransactionRepository;
    private final BankStatementEntryRepository bankStatementEntryRepository;
    private final InternalTransactionService internalTransactionService;
    private final BankStatementEntryService bankStatementEntryService;

    // Create new discrepancy
    public DiscrepancyResponseDTO createDiscrepancy(DiscrepancyRequestDTO requestDTO) {
        BankAccount bankAccount = bankAccountRepository.findById(requestDTO.getBankAccountId())
                .orElseThrow(() -> new ResourceNotFoundException("Bank account not found with ID: " + requestDTO.getBankAccountId()));

        Discrepancy discrepancy = new Discrepancy();
        discrepancy.setBankAccount(bankAccount);

        if (requestDTO.getInternalTransactionId() != null) {
            InternalTransaction internalTransaction = internalTransactionRepository.findById(requestDTO.getInternalTransactionId())
                    .orElseThrow(() -> new ResourceNotFoundException("Internal transaction not found with ID: " + requestDTO.getInternalTransactionId()));
            discrepancy.setInternalTransaction(internalTransaction);
        }

        if (requestDTO.getBankStatementEntryId() != null) {
            BankStatementEntry bankStatementEntry = bankStatementEntryRepository.findById(requestDTO.getBankStatementEntryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Bank statement entry not found with ID: " + requestDTO.getBankStatementEntryId()));
            discrepancy.setBankStatementEntry(bankStatementEntry);
        }

        discrepancy.setDiscrepancyType(requestDTO.getDiscrepancyType());
        discrepancy.setAmount(requestDTO.getAmount());
        discrepancy.setDescription(requestDTO.getDescription());
        discrepancy.setReason(requestDTO.getReason());
        discrepancy.setPriority(requestDTO.getPriority());
        discrepancy.setAssignedTo(requestDTO.getAssignedTo());
        discrepancy.setInvestigationNotes(requestDTO.getInvestigationNotes());
        discrepancy.setIdentifiedBy(requestDTO.getIdentifiedBy());

        if (requestDTO.getAssignedTo() != null) {
            discrepancy.setAssignedAt(LocalDateTime.now());
            discrepancy.setStatus(DiscrepancyStatus.IN_PROGRESS);
        }

        Discrepancy savedDiscrepancy = discrepancyRepository.save(discrepancy);
        return mapToResponseDTO(savedDiscrepancy);
    }

    // Get all discrepancies
    @Transactional(readOnly = true)
    public List<DiscrepancyResponseDTO> getAllDiscrepancies() {
        return discrepancyRepository.findAll()
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // Get discrepancy by ID
    @Transactional(readOnly = true)
    public DiscrepancyResponseDTO getDiscrepancyById(UUID id) {
        Discrepancy discrepancy = discrepancyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Discrepancy not found with ID: " + id));
        return mapToResponseDTO(discrepancy);
    }

    // Get discrepancies by status
    @Transactional(readOnly = true)
    public List<DiscrepancyResponseDTO> getDiscrepanciesByStatus(DiscrepancyStatus status) {
        return discrepancyRepository.findByStatus(status)
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // Get open discrepancies
    @Transactional(readOnly = true)
    public List<DiscrepancyResponseDTO> getOpenDiscrepancies() {
        return discrepancyRepository.findByStatus(DiscrepancyStatus.OPEN)
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // Get high priority discrepancies
    @Transactional(readOnly = true)
    public List<DiscrepancyResponseDTO> getHighPriorityDiscrepancies() {
        return discrepancyRepository.findHighPriorityOpenDiscrepancies()
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // Get discrepancies assigned to user
    @Transactional(readOnly = true)
    public List<DiscrepancyResponseDTO> getDiscrepanciesAssignedTo(String assignee) {
        return discrepancyRepository.findActiveDiscrepanciesForAssignee(assignee)
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // Get unassigned discrepancies
    @Transactional(readOnly = true)
    public List<DiscrepancyResponseDTO> getUnassignedDiscrepancies() {
        return discrepancyRepository.findByAssignedToIsNull()
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // Get overdue discrepancies
    @Transactional(readOnly = true)
    public List<DiscrepancyResponseDTO> getOverdueDiscrepancies(int daysOld) {
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(daysOld);
        return discrepancyRepository.findOverdueDiscrepancies(cutoffDate)
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // Assign discrepancy to user
    public DiscrepancyResponseDTO assignDiscrepancy(UUID id, String assignee) {
        Discrepancy discrepancy = discrepancyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Discrepancy not found with ID: " + id));

        if (discrepancy.getStatus() == DiscrepancyStatus.RESOLVED ||
                discrepancy.getStatus() == DiscrepancyStatus.CLOSED) {
            throw new IllegalStateException("Cannot assign resolved or closed discrepancy");
        }

        discrepancy.assignTo(assignee);
        Discrepancy updatedDiscrepancy = discrepancyRepository.save(discrepancy);
        return mapToResponseDTO(updatedDiscrepancy);
    }

    // Update discrepancy investigation notes
    public DiscrepancyResponseDTO updateInvestigationNotes(UUID id, String notes) {
        Discrepancy discrepancy = discrepancyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Discrepancy not found with ID: " + id));

        discrepancy.setInvestigationNotes(notes);
        Discrepancy updatedDiscrepancy = discrepancyRepository.save(discrepancy);
        return mapToResponseDTO(updatedDiscrepancy);
    }

    // Resolve discrepancy
    public DiscrepancyResponseDTO resolveDiscrepancy(UUID id, String resolution, String resolvedBy) {
        Discrepancy discrepancy = discrepancyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Discrepancy not found with ID: " + id));

        if (discrepancy.getStatus() == DiscrepancyStatus.RESOLVED ||
                discrepancy.getStatus() == DiscrepancyStatus.CLOSED) {
            throw new IllegalStateException("Discrepancy is already resolved or closed");
        }

        discrepancy.resolve(resolution, resolvedBy);
        Discrepancy resolvedDiscrepancy = discrepancyRepository.save(discrepancy);
        return mapToResponseDTO(resolvedDiscrepancy);
    }

    // Close discrepancy
    public DiscrepancyResponseDTO closeDiscrepancy(UUID id) {
        Discrepancy discrepancy = discrepancyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Discrepancy not found with ID: " + id));

        if (discrepancy.getStatus() != DiscrepancyStatus.RESOLVED) {
            throw new IllegalStateException("Can only close resolved discrepancies");
        }

        discrepancy.close();
        Discrepancy closedDiscrepancy = discrepancyRepository.save(discrepancy);
        return mapToResponseDTO(closedDiscrepancy);
    }

    // Update discrepancy priority
    public DiscrepancyResponseDTO updatePriority(UUID id, DiscrepancyPriority priority) {
        Discrepancy discrepancy = discrepancyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Discrepancy not found with ID: " + id));

        discrepancy.setPriority(priority);
        Discrepancy updatedDiscrepancy = discrepancyRepository.save(discrepancy);
        return mapToResponseDTO(updatedDiscrepancy);
    }

    // Helper method to convert entity to DTO
    private DiscrepancyResponseDTO mapToResponseDTO(Discrepancy discrepancy) {
        DiscrepancyResponseDTO responseDTO = new DiscrepancyResponseDTO();
        responseDTO.setId(discrepancy.getId());
        responseDTO.setBankAccountId(discrepancy.getBankAccount().getId());
        responseDTO.setBankAccountName(discrepancy.getBankAccount().getAccountName());

        if (discrepancy.getInternalTransaction() != null) {
            responseDTO.setInternalTransaction(
                    internalTransactionService.mapToResponseDTO(discrepancy.getInternalTransaction())
            );
        }

        if (discrepancy.getBankStatementEntry() != null) {
            responseDTO.setBankStatementEntry(
                    bankStatementEntryService.mapToResponseDTO(discrepancy.getBankStatementEntry())
            );
        }

        responseDTO.setDiscrepancyType(discrepancy.getDiscrepancyType());
        responseDTO.setAmount(discrepancy.getAmount());
        responseDTO.setDescription(discrepancy.getDescription());
        responseDTO.setReason(discrepancy.getReason());
        responseDTO.setStatus(discrepancy.getStatus());
        responseDTO.setPriority(discrepancy.getPriority());
        responseDTO.setAssignedTo(discrepancy.getAssignedTo());
        responseDTO.setInvestigationNotes(discrepancy.getInvestigationNotes());
        responseDTO.setResolution(discrepancy.getResolution());
        responseDTO.setIdentifiedAt(discrepancy.getIdentifiedAt());
        responseDTO.setIdentifiedBy(discrepancy.getIdentifiedBy());
        responseDTO.setAssignedAt(discrepancy.getAssignedAt());
        responseDTO.setResolvedAt(discrepancy.getResolvedAt());
        responseDTO.setResolvedBy(discrepancy.getResolvedBy());
        responseDTO.setCreatedAt(discrepancy.getCreatedAt());
        responseDTO.setUpdatedAt(discrepancy.getUpdatedAt());

        // Helper fields
        if (discrepancy.getAmount() != null) {
            NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(Locale.US);
            responseDTO.setFormattedAmount(currencyFormatter.format(discrepancy.getAmount()));
        }

        // Priority colors for UI
        switch (discrepancy.getPriority()) {
            case CRITICAL -> responseDTO.setPriorityColor("red");
            case HIGH -> responseDTO.setPriorityColor("orange");
            case MEDIUM -> responseDTO.setPriorityColor("yellow");
            case LOW -> responseDTO.setPriorityColor("green");
        }

        // Status colors for UI
        switch (discrepancy.getStatus()) {
            case OPEN -> responseDTO.setStatusColor("red");
            case IN_PROGRESS -> responseDTO.setStatusColor("yellow");
            case RESOLVED -> responseDTO.setStatusColor("green");
            case CLOSED -> responseDTO.setStatusColor("gray");
        }

        responseDTO.setDaysSinceIdentified(
                Period.between(discrepancy.getIdentifiedAt().toLocalDate(), LocalDate.now()).getDays()
        );

        if (discrepancy.getAssignedAt() != null) {
            responseDTO.setDaysSinceAssigned(
                    Period.between(discrepancy.getAssignedAt().toLocalDate(), LocalDate.now()).getDays()
            );
        }

        // Determine if overdue based on priority and days open
        int daysOpen = responseDTO.getDaysSinceIdentified();
        boolean isOverdue = switch (discrepancy.getPriority()) {
            case CRITICAL -> daysOpen > 1;
            case HIGH -> daysOpen > 3;
            case MEDIUM -> daysOpen > 7;
            case LOW -> daysOpen > 14;
        };
        responseDTO.setIsOverdue(isOverdue &&
                (discrepancy.getStatus() == DiscrepancyStatus.OPEN ||
                        discrepancy.getStatus() == DiscrepancyStatus.IN_PROGRESS));

        return responseDTO;
    }
}