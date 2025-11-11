package com.example.backend.models.procurement;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "purchase_order_issues")
public class PurchaseOrderIssue {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_id", nullable = false)
    @JsonBackReference
    private PurchaseOrder purchaseOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_item_id", nullable = false)
    @JsonBackReference
    private PurchaseOrderItem purchaseOrderItem;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private IssueType issueType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private IssueStatus issueStatus;

    // Who reported the issue
    @Column(nullable = false)
    private String reportedBy;

    @Column(nullable = false)
    private LocalDateTime reportedAt;

    @Column(columnDefinition = "TEXT")
    private String issueDescription;

    // NEW: Track quantity affected by this issue
    @Column(name = "affected_quantity")
    private Double affectedQuantity;

    // Resolution details
    @Enumerated(EnumType.STRING)
    private PurchaseOrderResolutionType resolutionType;

    private String resolvedBy;
    private LocalDateTime resolvedAt;

    @Column(columnDefinition = "TEXT")
    private String resolutionNotes;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "delivery_id", nullable = false)
    @JsonBackReference
    private PurchaseOrderDelivery delivery;

    @PrePersist
    protected void onCreate() {
        if (reportedAt == null) {
            reportedAt = LocalDateTime.now();
        }
        if (issueStatus == null) {
            issueStatus = IssueStatus.REPORTED;
        }
    }
}