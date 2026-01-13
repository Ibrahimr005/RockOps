package com.example.backend.services.procurement;

import com.example.backend.dto.procurement.LogisticsDTO;
import com.example.backend.models.procurement.DeliverySession;
import com.example.backend.models.procurement.Logistics;
import com.example.backend.models.procurement.PurchaseOrder;
import com.example.backend.repositories.procurement.DeliverySessionRepository;
import com.example.backend.repositories.procurement.LogisticsRepository;
import com.example.backend.repositories.procurement.PurchaseOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LogisticsService {

    private final LogisticsRepository logisticsRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final DeliverySessionRepository deliverySessionRepository;

    @Transactional(readOnly = true)
    public List<LogisticsDTO> getLogisticsByPurchaseOrder(UUID purchaseOrderId) {
        List<Logistics> logistics = logisticsRepository.findByPurchaseOrderId(purchaseOrderId);
        return logistics.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public LogisticsDTO createLogistics(LogisticsDTO dto, String username) {
        PurchaseOrder purchaseOrder = purchaseOrderRepository.findById(dto.getPurchaseOrderId())
                .orElseThrow(() -> new RuntimeException("Purchase Order not found"));

        Logistics logistics = Logistics.builder()
                .purchaseOrder(purchaseOrder)
                .deliveryFee(dto.getDeliveryFee())
                .currency(dto.getCurrency())
                .carrierCompany(dto.getCarrierCompany())
                .driverName(dto.getDriverName())
                .driverPhone(dto.getDriverPhone())
                .notes(dto.getNotes())
                .createdBy(username)
                .createdAt(LocalDateTime.now())
                .build();

        // Link to delivery session if provided
        if (dto.getDeliverySessionId() != null) {
            DeliverySession deliverySession = deliverySessionRepository.findById(dto.getDeliverySessionId())
                    .orElseThrow(() -> new RuntimeException("Delivery Session not found"));
            logistics.setDeliverySession(deliverySession);
        }

        Logistics saved = logisticsRepository.save(logistics);
        return convertToDTO(saved);
    }

    @Transactional
    public LogisticsDTO updateLogistics(UUID id, LogisticsDTO dto, String username) {
        Logistics logistics = logisticsRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Logistics not found"));

        logistics.setDeliveryFee(dto.getDeliveryFee());
        logistics.setCurrency(dto.getCurrency());
        logistics.setCarrierCompany(dto.getCarrierCompany());
        logistics.setDriverName(dto.getDriverName());
        logistics.setDriverPhone(dto.getDriverPhone());
        logistics.setNotes(dto.getNotes());
        logistics.setUpdatedBy(username);
        logistics.setUpdatedAt(LocalDateTime.now());

        // Update delivery session link if changed
        if (dto.getDeliverySessionId() != null) {
            DeliverySession deliverySession = deliverySessionRepository.findById(dto.getDeliverySessionId())
                    .orElseThrow(() -> new RuntimeException("Delivery Session not found"));
            logistics.setDeliverySession(deliverySession);
        } else {
            logistics.setDeliverySession(null);
        }

        Logistics updated = logisticsRepository.save(logistics);
        return convertToDTO(updated);
    }

    @Transactional
    public void deleteLogistics(UUID id) {
        if (!logisticsRepository.existsById(id)) {
            throw new RuntimeException("Logistics not found");
        }
        logisticsRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public Double getTotalLogisticsCost(UUID purchaseOrderId) {
        List<Logistics> logistics = logisticsRepository.findByPurchaseOrderId(purchaseOrderId);
        return logistics.stream()
                .mapToDouble(Logistics::getDeliveryFee)
                .sum();
    }

    private LogisticsDTO convertToDTO(Logistics logistics) {
        LogisticsDTO dto = LogisticsDTO.builder()
                .id(logistics.getId())
                .purchaseOrderId(logistics.getPurchaseOrder().getId())
                .deliveryFee(logistics.getDeliveryFee())
                .currency(logistics.getCurrency())
                .carrierCompany(logistics.getCarrierCompany())
                .driverName(logistics.getDriverName())
                .driverPhone(logistics.getDriverPhone())
                .notes(logistics.getNotes())
                .createdBy(logistics.getCreatedBy())
                .createdAt(logistics.getCreatedAt())
                .updatedBy(logistics.getUpdatedBy())
                .updatedAt(logistics.getUpdatedAt())
                .build();

        if (logistics.getDeliverySession() != null) {
            dto.setDeliverySessionId(logistics.getDeliverySession().getId());

            // Format delivery session info for display
            LocalDateTime processedAt = logistics.getDeliverySession().getProcessedAt();
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM dd, yyyy");
            String formattedDate = processedAt.format(formatter);
            dto.setDeliverySessionInfo("Delivery on " + formattedDate);
        }

        return dto;
    }
}