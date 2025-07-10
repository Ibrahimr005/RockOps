package com.example.backend.models.finance.generalLedger;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "journal_entry_lines")
@Data
public class JournalEntryLine {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    private BigDecimal amount;

    @Column(name = "is_debit")
    private boolean isDebit;

    private String description;

    @ManyToOne
    @JoinColumn(name = "journal_entry_id", nullable = false)
    private JournalEntry journalEntry;

//    @ManyToOne
//    @JoinColumn(name = "account_id", nullable = false)
//    private Account account;



//    // Optional: If you need to track line items by site
//    @ManyToOne
//    @JoinColumn(name = "site_id")
//    private Site site;
}
