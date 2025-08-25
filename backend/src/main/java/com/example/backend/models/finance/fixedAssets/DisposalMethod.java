package com.example.backend.models.finance.fixedAssets;

public enum DisposalMethod {
    SALE,           // Sold to someone
    TRADE_IN,       // Traded for new equipment
    DONATION,       // Donated/given away
    SCRAP,          // Scrapped/thrown away
    THEFT,          // Stolen
    ACCIDENT        // Destroyed in accident
}