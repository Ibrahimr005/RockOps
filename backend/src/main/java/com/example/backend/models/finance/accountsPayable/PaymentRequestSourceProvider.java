package com.example.backend.models.finance.accountsPayable;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Interface for entities that can be sources of payment requests.
 * Any entity implementing this provides all necessary info to create a PaymentRequest.
 */
public interface PaymentRequestSourceProvider {
    PaymentSourceType getPaymentSourceType();
    UUID getPaymentSourceId();
    String getPaymentSourceNumber();
    String getPaymentSourceDescription();

    PaymentTargetType getPaymentTargetType();
    UUID getPaymentTargetId();
    String getPaymentTargetName();
    String getPaymentTargetDetails();

    BigDecimal getPaymentAmount();
    String getPaymentCurrency();
    String getPaymentDepartment();
}
