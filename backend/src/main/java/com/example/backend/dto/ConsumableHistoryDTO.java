package com.example.backend.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ConsumableHistoryDTO {
    private Long id;
    private String type; // RECEIVED, SENT, ADJUSTED
    private Integer quantity;
    private String unit;
    private String senderName;
    private String receiverName;
    private String batchNumber;
    private String comment;
    private LocalDateTime date;
} 