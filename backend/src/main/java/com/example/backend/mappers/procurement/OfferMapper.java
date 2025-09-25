package com.example.backend.mappers.procurement;

import com.example.backend.dto.procurement.*;
import com.example.backend.models.procurement.*;
import org.springframework.stereotype.Component;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class OfferMapper {

    private final OfferItemMapper offerItemMapper;
    private final RequestOrderMapper requestOrderMapper;
    private final OfferTimelineEventMapper timelineEventMapper;

    public OfferMapper(OfferItemMapper offerItemMapper,
                       RequestOrderMapper requestOrderMapper,
                       OfferTimelineEventMapper timelineEventMapper) {
        this.offerItemMapper = offerItemMapper;
        this.requestOrderMapper = requestOrderMapper;
        this.timelineEventMapper = timelineEventMapper;
    }

    public OfferDTO toDTO(Offer offer) {
        if (offer == null) return null;

        OfferDTO.OfferDTOBuilder builder = OfferDTO.builder()
                .id(offer.getId())
                .title(offer.getTitle())
                .description(offer.getDescription())
                .createdAt(offer.getCreatedAt())
                .createdBy(offer.getCreatedBy())
                .status(offer.getStatus())
                .financeStatus(offer.getFinanceStatus())
                .validUntil(offer.getValidUntil())
                .notes(offer.getNotes())
                .currentAttemptNumber(offer.getCurrentAttemptNumber())
                .totalRetries(offer.getTotalRetries())
                .retryCount(offer.getRetryCount());

        // Request Order
        if (offer.getRequestOrder() != null) {
            builder.requestOrderId(offer.getRequestOrder().getId())
                    .requestOrder(requestOrderMapper.toDTO(offer.getRequestOrder()));
        }

        // Offer Items
        if (offer.getOfferItems() != null) {
            List<OfferItemDTO> offerItemDTOs = offer.getOfferItems().stream()
                    .map(offerItemMapper::toDTO)
                    .collect(Collectors.toList());
            builder.offerItems(offerItemDTOs);
        }

        // Timeline Events
        if (offer.getTimelineEvents() != null) {
            List<OfferTimelineEventDTO> timelineEventDTOs = offer.getTimelineEvents().stream()
                    .map(timelineEventMapper::toDTO)
                    .collect(Collectors.toList());
            builder.timelineEvents(timelineEventDTOs);
        }

        // Derived fields from timeline
        builder.submittedToManagerAt(offer.getSubmittedToManagerAt())
                .submittedToManagerBy(offer.getSubmittedToManagerBy())
                .managerApprovedAt(offer.getManagerApprovedAt())
                .managerApprovedBy(offer.getManagerApprovedBy())
                .financeApprovedAt(offer.getFinanceApprovedAt())
                .financeApprovedBy(offer.getFinanceApprovedBy())
                .rejectionReason(offer.getRejectionReason());

        return builder.build();
    }

    public List<OfferDTO> toDTOList(List<Offer> offers) {
        if (offers == null) return new ArrayList<>();
        return offers.stream().map(this::toDTO).collect(Collectors.toList());
    }
}