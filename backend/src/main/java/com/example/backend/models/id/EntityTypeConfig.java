package com.example.backend.models.id;

public enum EntityTypeConfig {
    // Warehouse & Inventory
    WAREHOUSE("WH", 6),
    ITEM_CATEGORY("ICAT", 6),
    ITEM_TYPE("ITYP", 6),
    ITEM("ITM", 6),

    // Procurement
    MERCHANT("MCH", 6),
    REQUEST_ORDER("RO", 6),
    REQUEST_ORDER_ITEM("ROI", 6),
    PURCHASE_ORDER("PO", 6),
    PURCHASE_ORDER_ITEM("POI", 6),
    OFFER("OFF", 6),
    OFFER_ITEM("OFFI", 6),

    // Equipment
    EQUIPMENT("EQ", 6),
    EQUIPMENT_TYPE("EQT", 6),
    EQUIPMENT_BRAND("EQB", 6),

    // HR
    EMPLOYEE("EMP", 6),
    DEPARTMENT("DEPT", 6),
    JOB_POSITION("JP", 6),
    VACANCY("VAC", 6),
    WORK_TYPE("WT", 6),

    // Payroll
    LOAN("LOAN", 6),

    // General
    SITE("SITE", 6),
    TRANSACTION("TXN", 6);

    private final String prefix;
    private final int paddingLength;

    EntityTypeConfig(String prefix, int paddingLength) {
        this.prefix = prefix;
        this.paddingLength = paddingLength;
    }

    public String getPrefix() {
        return prefix;
    }

    public int getPaddingLength() {
        return paddingLength;
    }

    // Entity type is now the enum name itself
    public String getEntityType() {
        return this.name();
    }
}