package com.example.backend.dto.finance.generalLedger;

import lombok.Data;

import java.time.LocalDate;


@Data
public class AccountingPeriodRequestDTO {
    private String name;
    private LocalDate startDate;
    private LocalDate endDate;
}
