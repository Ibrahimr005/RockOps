package com.example.backend.models.finance.refunds;

import com.example.backend.models.procurement.PurchaseOrderItem;
import com.example.backend.models.procurement.PurchaseOrderIssue;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "refund_request_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RefundRequestItem {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "refund_request_id", nullable = false)
    private RefundRequest refundRequest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_item_id", nullable = false)
    private PurchaseOrderItem purchaseOrderItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "issue_id", nullable = false)
    private PurchaseOrderIssue issue;

    @Column(name = "item_name", nullable = false)
    private String itemName;

    @Column(name = "affected_quantity", nullable = false)
    private Double affectedQuantity;

    @Column(name = "unit_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "total_refund_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalRefundAmount;

    @Column(name = "issue_type")
    private String issueType;

    @Column(name = "issue_description", columnDefinition = "TEXT")
    private String issueDescription;
}