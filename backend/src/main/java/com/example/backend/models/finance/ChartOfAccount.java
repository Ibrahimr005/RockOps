//package com.example.backend.models.finance;
//
//import com.example.backend.models.user.User;
//import jakarta.persistence.*;
//import lombok.Data;
//import org.hibernate.annotations.GenericGenerator;
//
//import java.time.LocalDateTime;
//import java.util.UUID;
//
//@Entity
//@Data
//@Table(name = "chart_of_accounts")
//public class ChartOfAccount {
//
//    @Id
//    @GeneratedValue(generator = "UUID")
//    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
//    @Column(name = "account_id", updatable = false, nullable = false)
//    private UUID accountId;
//
//    @Column(name = "account_number", unique = true, nullable = false)
//    private String accountNumber;
//
//    @Column(name = "account_name", nullable = false)
//    private String accountName;
//
//    @Enumerated(EnumType.STRING)
//    @Column(name = "account_type", nullable = false)
//    private AccountType accountType;
//
//    @Column(name = "description")
//    private String description;
//
//    @Column(name = "is_active", nullable = false)
//    private Boolean isActive = true;
//
//    @Column(name = "parent_account_id")
//    private UUID parentAccountId;
//
//    @ManyToOne(fetch = FetchType.LAZY)
//    @JoinColumn(name = "created_by", nullable = false)
//    private User createdBy;
//
//    @Column(name = "created_date", nullable = false)
//    private LocalDateTime createdDate;
//
//    @ManyToOne(fetch = FetchType.LAZY)
//    @JoinColumn(name = "modified_by")
//    private User modifiedBy;
//
//    @Column(name = "modified_date")
//    private LocalDateTime modifiedDate;
//
//    // Pre-persist hook to set created date
//    @PrePersist
//    public void prePersist() {
//        createdDate = LocalDateTime.now();
//    }
//
//    // Pre-update hook to set modified date
//    @PreUpdate
//    public void preUpdate() {
//        modifiedDate = LocalDateTime.now();
//    }
//
//
//}