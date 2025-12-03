package com.example.backend.dto.merchant;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MerchantDTO {
    private UUID id;
    private String name;
    private String contactEmail;
    private String contactPhone;
    private String contactSecondPhone;
    private String contactPersonName;
    private String address;
    private String preferredPaymentMethod;
    private Double reliabilityScore;
    private Double averageDeliveryTime;
    private String taxIdentificationNumber;
    private Date lastOrderDate;
    private String photoUrl;
    private List<String> merchantTypes; // Will be converted from enum to string
    private String notes;
    private UUID siteId;  // Just the site ID to avoid circular references
}