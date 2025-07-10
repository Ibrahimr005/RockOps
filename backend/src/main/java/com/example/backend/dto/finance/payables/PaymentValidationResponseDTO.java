package com.example.backend.dto.finance.payables;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentValidationResponseDTO {

    private boolean valid;
    private String message;
    private BigDecimal maxAllowedAmount;
    private BigDecimal remainingBalance;

    // Static factory methods for easier creation
    public static PaymentValidationResponseDTO valid(BigDecimal remainingBalance) {
        return new PaymentValidationResponseDTO(true, "Payment amount is valid",
                remainingBalance, remainingBalance);
    }

    public static PaymentValidationResponseDTO invalid(String message, BigDecimal remainingBalance) {
        return new PaymentValidationResponseDTO(false, message, remainingBalance, remainingBalance);
    }
}
