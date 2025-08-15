// PayrollJournalEntryRepository.java
package com.example.backend.repositories.payroll;

import com.example.backend.models.payroll.PayrollJournalEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface PayrollJournalEntryRepository extends JpaRepository<PayrollJournalEntry, UUID> {
}