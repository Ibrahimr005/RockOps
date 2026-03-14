package com.example.backend.services.procurement;

import com.example.backend.models.procurement.Offer.Offer;
import com.example.backend.models.procurement.Offer.OfferTimelineEvent;
import com.example.backend.models.procurement.Offer.TimelineEventType;
import com.example.backend.repositories.procurement.OfferRepository;
import com.example.backend.repositories.procurement.OfferTimelineEventRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class OfferTimelineServiceTest {

    @Mock
    private OfferRepository offerRepository;

    @Mock
    private OfferTimelineEventRepository timelineEventRepository;

    @InjectMocks
    private OfferTimelineService offerTimelineService;

    // ==================== submitOffer ====================

    @Test
    public void submitOffer_success_shouldSetStatusToSubmitted() {
        UUID offerId = UUID.randomUUID();
        Offer offer = createOffer(offerId, "INPROGRESS");

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(offerRepository.save(any(Offer.class))).thenAnswer(i -> i.getArgument(0));
        when(timelineEventRepository.save(any(OfferTimelineEvent.class))).thenAnswer(i -> {
            OfferTimelineEvent e = i.getArgument(0);
            e.setId(UUID.randomUUID());
            return e;
        });

        Offer result = offerTimelineService.submitOffer(offerId, "admin");

        assertEquals("SUBMITTED", result.getStatus());
        verify(timelineEventRepository).save(any(OfferTimelineEvent.class));
    }

    @Test
    public void submitOffer_offerNotFound_shouldThrow() {
        UUID offerId = UUID.randomUUID();
        when(offerRepository.findById(offerId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> offerTimelineService.submitOffer(offerId, "admin"));
    }

    // ==================== acceptOfferByManager ====================

    @Test
    public void acceptOfferByManager_success_shouldSetStatusToManagerAccepted() {
        UUID offerId = UUID.randomUUID();
        Offer offer = createOffer(offerId, "SUBMITTED");

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(offerRepository.save(any(Offer.class))).thenAnswer(i -> i.getArgument(0));
        when(timelineEventRepository.save(any(OfferTimelineEvent.class))).thenAnswer(i -> {
            OfferTimelineEvent e = i.getArgument(0);
            e.setId(UUID.randomUUID());
            return e;
        });

        Offer result = offerTimelineService.acceptOfferByManager(offerId, "manager");

        assertEquals("MANAGERACCEPTED", result.getStatus());
        verify(timelineEventRepository).save(any(OfferTimelineEvent.class));
    }

    @Test
    public void acceptOfferByManager_offerNotFound_shouldThrow() {
        UUID offerId = UUID.randomUUID();
        when(offerRepository.findById(offerId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> offerTimelineService.acceptOfferByManager(offerId, "manager"));
    }

    // ==================== rejectOfferByManager ====================

    @Test
    public void rejectOfferByManager_success_shouldSetStatusToManagerRejected() {
        UUID offerId = UUID.randomUUID();
        Offer offer = createOffer(offerId, "SUBMITTED");

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(offerRepository.save(any(Offer.class))).thenAnswer(i -> i.getArgument(0));
        when(timelineEventRepository.save(any(OfferTimelineEvent.class))).thenAnswer(i -> {
            OfferTimelineEvent e = i.getArgument(0);
            e.setId(UUID.randomUUID());
            return e;
        });

        Offer result = offerTimelineService.rejectOfferByManager(offerId, "manager", "Too expensive");

        assertEquals("MANAGERREJECTED", result.getStatus());
        verify(timelineEventRepository).save(any(OfferTimelineEvent.class));
    }

    @Test
    public void rejectOfferByManager_offerNotFound_shouldThrow() {
        UUID offerId = UUID.randomUUID();
        when(offerRepository.findById(offerId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> offerTimelineService.rejectOfferByManager(offerId, "manager", "reason"));
    }

    // ==================== retryOffer ====================

    @Test
    public void retryOffer_success_shouldIncrementAttemptAndResetStatus() {
        UUID offerId = UUID.randomUUID();
        Offer offer = createOffer(offerId, "MANAGERREJECTED");

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(offerRepository.save(any(Offer.class))).thenAnswer(i -> i.getArgument(0));
        when(timelineEventRepository.save(any(OfferTimelineEvent.class))).thenAnswer(i -> {
            OfferTimelineEvent e = i.getArgument(0);
            e.setId(UUID.randomUUID());
            return e;
        });

        Offer result = offerTimelineService.retryOffer(offerId, "admin");

        assertNotNull(result);
        verify(timelineEventRepository).save(any(OfferTimelineEvent.class));
        verify(offerRepository).save(any(Offer.class));
    }

    @Test
    public void retryOffer_offerNotFound_shouldThrow() {
        UUID offerId = UUID.randomUUID();
        when(offerRepository.findById(offerId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> offerTimelineService.retryOffer(offerId, "admin"));
    }

    // ==================== processFinanceDecision ====================

    @Test
    public void processFinanceDecision_accepted_shouldSetFinanceAccepted() {
        UUID offerId = UUID.randomUUID();
        Offer offer = createOffer(offerId, "MANAGERACCEPTED");

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(offerRepository.save(any(Offer.class))).thenAnswer(i -> i.getArgument(0));
        when(timelineEventRepository.save(any(OfferTimelineEvent.class))).thenAnswer(i -> {
            OfferTimelineEvent e = i.getArgument(0);
            e.setId(UUID.randomUUID());
            return e;
        });

        Offer result = offerTimelineService.processFinanceDecision(offerId, "FINANCE_ACCEPTED", "finance_user", "Approved");

        assertEquals("FINANCE_ACCEPTED", result.getStatus());
    }

    @Test
    public void processFinanceDecision_rejected_shouldSetFinanceRejected() {
        UUID offerId = UUID.randomUUID();
        Offer offer = createOffer(offerId, "MANAGERACCEPTED");

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(offerRepository.save(any(Offer.class))).thenAnswer(i -> i.getArgument(0));
        when(timelineEventRepository.save(any(OfferTimelineEvent.class))).thenAnswer(i -> {
            OfferTimelineEvent e = i.getArgument(0);
            e.setId(UUID.randomUUID());
            return e;
        });

        Offer result = offerTimelineService.processFinanceDecision(offerId, "FINANCE_REJECTED", "finance_user", "Budget exceeded");

        assertEquals("FINANCE_REJECTED", result.getStatus());
    }

    @Test
    public void processFinanceDecision_partiallyAccepted_shouldSetPartiallyAccepted() {
        UUID offerId = UUID.randomUUID();
        Offer offer = createOffer(offerId, "MANAGERACCEPTED");

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(offerRepository.save(any(Offer.class))).thenAnswer(i -> i.getArgument(0));
        when(timelineEventRepository.save(any(OfferTimelineEvent.class))).thenAnswer(i -> {
            OfferTimelineEvent e = i.getArgument(0);
            e.setId(UUID.randomUUID());
            return e;
        });

        Offer result = offerTimelineService.processFinanceDecision(offerId, "FINANCE_PARTIALLY_ACCEPTED", "finance_user", "Partial");

        assertEquals("FINANCE_PARTIALLY_ACCEPTED", result.getStatus());
    }

    @Test
    public void processFinanceDecision_offerNotFound_shouldThrow() {
        UUID offerId = UUID.randomUUID();
        when(offerRepository.findById(offerId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> offerTimelineService.processFinanceDecision(offerId, "FINANCE_ACCEPTED", "finance", "notes"));
    }

    // ==================== createTimelineEvent ====================

    @Test
    public void createTimelineEvent_success_shouldSaveEvent() {
        UUID offerId = UUID.randomUUID();
        when(timelineEventRepository.save(any(OfferTimelineEvent.class))).thenAnswer(i -> {
            OfferTimelineEvent e = i.getArgument(0);
            e.setId(UUID.randomUUID());
            return e;
        });

        OfferTimelineEvent result = offerTimelineService.createTimelineEvent(
                offerId, TimelineEventType.OFFER_SUBMITTED, "admin", "notes",
                "INPROGRESS", "SUBMITTED", 1);

        assertNotNull(result);
        verify(timelineEventRepository).save(any(OfferTimelineEvent.class));
    }

    @Test
    public void createTimelineEvent_saveFails_shouldThrow() {
        UUID offerId = UUID.randomUUID();
        when(timelineEventRepository.save(any(OfferTimelineEvent.class)))
                .thenThrow(new RuntimeException("DB error"));

        assertThrows(RuntimeException.class,
                () -> offerTimelineService.createTimelineEvent(
                        offerId, TimelineEventType.OFFER_SUBMITTED, "admin", null,
                        "INPROGRESS", "SUBMITTED", 1));
    }

    // ==================== getCompleteTimeline ====================

    @Test
    public void getCompleteTimeline_shouldReturnEvents() {
        UUID offerId = UUID.randomUUID();
        OfferTimelineEvent event = OfferTimelineEvent.builder()
                .id(UUID.randomUUID())
                .eventType(TimelineEventType.OFFER_SUBMITTED)
                .eventTime(LocalDateTime.now())
                .build();

        when(timelineEventRepository.findByOfferIdOrderByEventTimeAscCreatedAtAsc(offerId))
                .thenReturn(List.of(event));

        List<OfferTimelineEvent> result = offerTimelineService.getCompleteTimeline(offerId);

        assertEquals(1, result.size());
    }

    @Test
    public void getCompleteTimeline_empty_shouldReturnEmpty() {
        UUID offerId = UUID.randomUUID();
        when(timelineEventRepository.findByOfferIdOrderByEventTimeAscCreatedAtAsc(offerId))
                .thenReturn(List.of());

        List<OfferTimelineEvent> result = offerTimelineService.getCompleteTimeline(offerId);

        assertTrue(result.isEmpty());
    }

    // ==================== getRetryableEvents ====================

    @Test
    public void getRetryableEvents_shouldFilterRetryableOnly() {
        UUID offerId = UUID.randomUUID();
        OfferTimelineEvent retryable = mock(OfferTimelineEvent.class);
        when(retryable.isCanRetryFromHere()).thenReturn(true);

        OfferTimelineEvent nonRetryable = mock(OfferTimelineEvent.class);
        when(nonRetryable.isCanRetryFromHere()).thenReturn(false);

        when(timelineEventRepository.findByOfferIdOrderByEventTimeAscCreatedAtAsc(offerId))
                .thenReturn(List.of(retryable, nonRetryable));

        List<OfferTimelineEvent> result = offerTimelineService.getRetryableEvents(offerId);

        assertEquals(1, result.size());
    }

    // ==================== recordOfferSplit ====================

    @Test
    public void recordOfferSplit_success_shouldCreateSplitEvent() {
        UUID offerId = UUID.randomUUID();
        Offer offer = createOffer(offerId, "ACCEPTED");

        when(offerRepository.findById(offerId)).thenReturn(Optional.of(offer));
        when(timelineEventRepository.save(any(OfferTimelineEvent.class))).thenAnswer(i -> {
            OfferTimelineEvent e = i.getArgument(0);
            e.setId(UUID.randomUUID());
            return e;
        });

        OfferTimelineEvent result = offerTimelineService.recordOfferSplit(offerId, "admin", 3, 2);

        assertNotNull(result);
        verify(timelineEventRepository).save(any(OfferTimelineEvent.class));
    }

    @Test
    public void recordOfferSplit_offerNotFound_shouldThrow() {
        UUID offerId = UUID.randomUUID();
        when(offerRepository.findById(offerId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> offerTimelineService.recordOfferSplit(offerId, "admin", 3, 2));
    }

    // ==================== saveTimelineEvent ====================

    @Test
    public void saveTimelineEvent_shouldDelegateToRepository() {
        OfferTimelineEvent event = OfferTimelineEvent.builder()
                .id(UUID.randomUUID())
                .eventType(TimelineEventType.OFFER_SUBMITTED)
                .build();

        offerTimelineService.saveTimelineEvent(event);

        verify(timelineEventRepository).save(event);
    }

    // ==================== Helpers ====================

    private Offer createOffer(UUID id, String status) {
        Offer offer = new Offer();
        offer.setId(id);
        offer.setTitle("Test Offer");
        offer.setStatus(status);
        offer.setCurrentAttemptNumber(1);
        offer.setTotalRetries(0);
        offer.setCreatedAt(LocalDateTime.now());
        offer.setOfferItems(new ArrayList<>());
        offer.setTimelineEvents(new ArrayList<>());
        return offer;
    }
}