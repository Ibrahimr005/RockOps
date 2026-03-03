package com.example.backend.dto.hr.salary;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SalaryIncreaseReviewDTO {

    private boolean approved;
    private String comments;
    private String rejectionReason;
}
