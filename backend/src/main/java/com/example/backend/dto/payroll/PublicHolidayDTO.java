package com.example.backend.dto.payroll;

import com.fasterxml.jackson.annotation.JsonFormat; //
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicHolidayDTO {
    private UUID id;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate startDate;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate endDate;

    private String name;
    private Boolean isPaid;
    private UUID payrollId;

    public boolean isSingleDay() {
        return endDate == null || startDate.equals(endDate);
    }
}