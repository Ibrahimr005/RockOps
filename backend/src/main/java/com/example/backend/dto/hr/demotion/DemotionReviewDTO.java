package com.example.backend.dto.hr.demotion;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DemotionReviewDTO {

    private boolean approved;
    private String comments;
    private String rejectionReason;
}
