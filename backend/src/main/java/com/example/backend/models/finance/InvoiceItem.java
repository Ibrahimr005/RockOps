//// Create InvoiceItem.java entity
//package com.example.backend.models.finance;
//
//import jakarta.persistence.*;
//import lombok.Data;
//import org.hibernate.annotations.GenericGenerator;
//
//import java.math.BigDecimal;
//import java.util.UUID;
//
//@Entity
//@Data
//@Table(name = "invoice_items")
//public class InvoiceItem {
//
//    @Id
//    @GeneratedValue(generator = "UUID")
//    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
//    @Column(name = "item_id", updatable = false, nullable = false)
//    private UUID itemId;
//
//    @Column(name = "description", nullable = false)
//    private String description;
//
//    @Column(name = "quantity", nullable = false)
//    private BigDecimal quantity;
//
//    @Column(name = "unit_price", nullable = false)
//    private BigDecimal unitPrice;
//
//    @Column(name = "amount", nullable = false)
//    private BigDecimal amount;
//
//    @ManyToOne(fetch = FetchType.LAZY)
//    @JoinColumn(name = "invoice_id", nullable = false)
//    private Invoice invoice;
//}