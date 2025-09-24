package com.example.backend.mappers.merchant;

import com.example.backend.dto.merchant.MerchantDTO;
import com.example.backend.models.merchant.Merchant;
import org.springframework.stereotype.Component;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class MerchantMapper {

    public MerchantDTO toDTO(Merchant merchant) {
        if (merchant == null) return null;

        return MerchantDTO.builder()
                .id(merchant.getId())
                .name(merchant.getName())
                .contactEmail(merchant.getContactEmail())
                .contactPhone(merchant.getContactPhone())
                .contactSecondPhone(merchant.getContactSecondPhone())
                .contactPersonName(merchant.getContactPersonName())
                .address(merchant.getAddress())
                .preferredPaymentMethod(merchant.getPreferredPaymentMethod())
                .reliabilityScore(merchant.getReliabilityScore())
                .averageDeliveryTime(merchant.getAverageDeliveryTime())
                .taxIdentificationNumber(merchant.getTaxIdentificationNumber())
                .lastOrderDate(merchant.getLastOrderDate())
                .photoUrl(merchant.getPhotoUrl())
                .merchantType(merchant.getMerchantType() != null ? merchant.getMerchantType().toString() : null)
                .notes(merchant.getNotes())
                .siteId(merchant.getSite() != null ? merchant.getSite().getId() : null)
                .build();
    }

    public List<MerchantDTO> toDTOList(List<Merchant> merchants) {
        if (merchants == null) return new ArrayList<>();
        return merchants.stream().map(this::toDTO).collect(Collectors.toList());
    }
}
