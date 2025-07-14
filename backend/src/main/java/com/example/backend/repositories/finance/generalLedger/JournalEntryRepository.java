package com.example.backend.repositories.finance.generalLedger;

import com.example.backend.models.finance.generalLedger.JournalEntry;
import com.example.backend.models.finance.generalLedger.JournalEntryStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface JournalEntryRepository extends JpaRepository<JournalEntry, UUID> {
    List<JournalEntry> findByStatus(JournalEntryStatus status);

    List<JournalEntry> findByEntryDateBetween(LocalDate startDate, LocalDate endDate);

    List<JournalEntry> findByCreatedById(UUID userId);

    List<JournalEntry> findByReferenceNumberContaining(String referenceNumber);
}
