package com.example.backend.models.finance.incomingPayments;

import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderItem;
import com.example.backend.models.procurement.PurchaseOrder.PurchaseOrderIssue;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "incoming_payment_request_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class IncomingPaymentRequestItem {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "incoming_payment_request_id", nullable = false)
    private IncomingPaymentRequest incomingPaymentRequest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_item_id", nullable = false)
    private PurchaseOrderItem purchaseOrderItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "issue_id") // Nullable - only for REFUNDs
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