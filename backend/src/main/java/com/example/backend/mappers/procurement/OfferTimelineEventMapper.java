package com.example.backend.mappers.procurement;

import com.example.backend.dto.procurement.OfferTimelineEventDTO;
import com.example.backend.models.procurement.OfferTimelineEvent;
import org.springframework.stereotype.Component;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class OfferTimelineEventMapper {

    public OfferTimelineEventDTO toDTO(OfferTimelineEvent event) {
        if (event == null) return null;

        OfferTimelineEventDTO.OfferTimelineEventDTOBuilder builder = OfferTimelineEventDTO.builder()
                .id(event.getId())
                .eventType(event.getEventType())
                .attemptNumber(event.getAttemptNumber())
                .eventTime(event.getEventTime())
                .actionBy(event.getActionBy())
                .notes(event.getNotes())
                .additionalData(event.getAdditionalData())
                .previousStatus(event.getPreviousStatus())
                .newStatus(event.getNewStatus())
                .displayTitle(event.getDisplayTitle())
                .displayDescription(event.getDisplayDescription())
                .canRetryFromHere(event.isCanRetryFromHere())
                .retryToStatus(event.getRetryToStatus())
                .createdAt(event.getCreatedAt());

        // Parent offer ID
        if (event.getOffer() != null) {
            builder.offerId(event.getOffer().getId());
        }

        return builder.build();
    }

    public List<OfferTimelineEventDTO> toDTOList(List<OfferTimelineEvent> events) {
        if (events == null) return new ArrayList<>();
        return events.stream().map(this::toDTO).collect(Collectors.toList());
    }
}