package com.example.backend.services.finance;

import com.example.backend.dto.finance.AccountingPeriodRequestDTO;
import com.example.backend.dto.finance.AccountingPeriodResponseDTO;
import com.example.backend.models.finance.AccountingPeriod;
import com.example.backend.models.finance.AuditAction;
import com.example.backend.models.finance.PeriodStatus;
import com.example.backend.models.user.User;
import com.example.backend.repositories.finance.AccountingPeriodRepository;
import com.example.backend.repositories.user.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AccountingPeriodService {

    private final AccountingPeriodRepository accountingPeriodRepository;
    private final UserRepository userRepository;
    private AuditService auditService;

    @Autowired
    public AccountingPeriodService(AccountingPeriodRepository accountingPeriodRepository,
                                   UserRepository userRepository, AuditService auditService) {
        this.accountingPeriodRepository = accountingPeriodRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    public List<AccountingPeriodResponseDTO> getAllPeriods() {
        List<AccountingPeriod> periods = accountingPeriodRepository.findAll();
        return periods.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public AccountingPeriodResponseDTO getPeriodById(UUID id) {
        AccountingPeriod period = accountingPeriodRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Accounting period not found with id: " + id));
        return mapToDTO(period);
    }

    @Transactional
    public AccountingPeriodResponseDTO createPeriod(AccountingPeriodRequestDTO requestDTO) {
        // Legacy method for backward compatibility - avoid using this directly
        return createPeriod(requestDTO, null);
    }

    @Transactional
    public AccountingPeriodResponseDTO createPeriod(AccountingPeriodRequestDTO requestDTO, User user) {
        validatePeriodRequest(requestDTO);

        AccountingPeriod period = new AccountingPeriod();
        period.setName(requestDTO.getName());
        period.setStartDate(requestDTO.getStartDate());
        period.setEndDate(requestDTO.getEndDate());
        period.setStatus(PeriodStatus.OPEN);

        AccountingPeriod savedPeriod = accountingPeriodRepository.save(period);

        // Log audit event with the user who created the period
        Map<String, Object> changes = new HashMap<>();
        changes.put("action", "create");
        changes.put("name", savedPeriod.getName());
        changes.put("startDate", savedPeriod.getStartDate().toString());
        changes.put("endDate", savedPeriod.getEndDate().toString());
        changes.put("status", savedPeriod.getStatus().toString());

        auditService.logEvent("AccountingPeriod", savedPeriod.getId(), AuditAction.CREATE, changes, user);

        return mapToDTO(savedPeriod);
    }

    @Transactional
    public AccountingPeriodResponseDTO closePeriod(UUID id, String notes, UUID userId) {
        AccountingPeriod period = accountingPeriodRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Accounting period not found with id: " + id));

        if (period.getStatus() == PeriodStatus.CLOSED) {
            throw new RuntimeException("Period is already closed");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        period.setStatus(PeriodStatus.CLOSED);
        period.setClosedBy(user);
        period.setClosedAt(LocalDateTime.now());
        period.setClosingNotes(notes);

        AccountingPeriod savedPeriod = accountingPeriodRepository.save(period);

        Map<String, Object> changes = new HashMap<>();
        changes.put("action", "close");
        changes.put("status", period.getStatus().toString());
        changes.put("notes", notes);

        auditService.logEvent("AccountingPeriod", period.getId(),
                AuditAction.UPDATE, changes, period.getClosedBy());

        return mapToDTO(savedPeriod);
    }

    public boolean isPeriodClosed(LocalDate date) {
        Optional<AccountingPeriod> periodOpt = accountingPeriodRepository.findPeriodByDate(date);
        return periodOpt.isPresent() && periodOpt.get().getStatus() == PeriodStatus.CLOSED;
    }

    private void validatePeriodRequest(AccountingPeriodRequestDTO requestDTO) {
        if (requestDTO.getStartDate() == null) {
            throw new RuntimeException("Start date is required");
        }

        if (requestDTO.getEndDate() == null) {
            throw new RuntimeException("End date is required");
        }

        if (requestDTO.getEndDate().isBefore(requestDTO.getStartDate())) {
            throw new RuntimeException("End date cannot be before start date");
        }

        if (requestDTO.getName() == null || requestDTO.getName().trim().isEmpty()) {
            throw new RuntimeException("Period name is required");
        }

        // Check for overlapping periods
        List<AccountingPeriod> overlappingPeriods = accountingPeriodRepository
                .findPeriodsOverlappingWith(requestDTO.getStartDate(), requestDTO.getEndDate());

        if (!overlappingPeriods.isEmpty()) {
            throw new RuntimeException("The new period overlaps with existing periods");
        }
    }

    private AccountingPeriodResponseDTO mapToDTO(AccountingPeriod period) {
        AccountingPeriodResponseDTO dto = new AccountingPeriodResponseDTO();
        dto.setId(period.getId());
        dto.setName(period.getName());
        dto.setStartDate(period.getStartDate());
        dto.setEndDate(period.getEndDate());
        dto.setStatus(period.getStatus().toString());

        if (period.getClosedBy() != null) {
            dto.setClosedBy(period.getClosedBy().getUsername());
        }

        dto.setClosedAt(period.getClosedAt());
        dto.setClosingNotes(period.getClosingNotes());

        return dto;
    }
}