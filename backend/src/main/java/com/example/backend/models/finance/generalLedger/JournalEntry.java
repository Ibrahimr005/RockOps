package com.example.backend.models.finance.generalLedger;

import com.example.backend.models.user.User;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "journal_entries")
@Data
public class JournalEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    private String referenceNumber;

    private LocalDate entryDate;

    private String description;

    private String approvalComments;

    private String rejectionReason;

    @Enumerated(EnumType.STRING)
    private JournalEntryStatus status = JournalEntryStatus.PENDING;

    @Column(length = 1024)
    private String documentPath;

    @CreationTimestamp
    private LocalDateTime createdAt;

    private LocalDateTime reviewedAt;


    @OneToMany(mappedBy = "journalEntry", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<JournalEntryLine> entryLines = new ArrayList<>();

    @ManyToOne
    @JoinColumn(name = "created_by")
    private User createdBy;

    @ManyToOne
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;



    // Helper method to check if the journal entry is balanced
    public boolean isBalanced() {
        BigDecimal totalDebits = BigDecimal.ZERO;
        BigDecimal totalCredits = BigDecimal.ZERO;

        for (JournalEntryLine line : entryLines) {
            if (line.isDebit()) {
                totalDebits = totalDebits.add(line.getAmount());
            } else {
                totalCredits = totalCredits.add(line.getAmount());
            }
        }

        return totalDebits.compareTo(totalCredits) == 0;
    }

    // Helper method to add a line to the journal entry
    public void addLine(JournalEntryLine line) {
        entryLines.add(line);
        line.setJournalEntry(this);
    }

    // Helper method to remove a line from the journal entry
    public void removeLine(JournalEntryLine line) {
        entryLines.remove(line);
        line.setJournalEntry(null);
    }

    public boolean isLocked() {
        return status == JournalEntryStatus.APPROVED;
    }
}
