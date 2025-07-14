package com.example.backend.dto.finance.payables;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceRequestDTO {
    @NotBlank(message = "Invoice number is required")
    @Size(max = 50, message = "Invoice number cannot exceed 50 characters")
    private String invoiceNumber;

    @NotBlank(message = "Vendor name is required")
    @Size(max = 200, message = "Vendor name cannot exceed 200 characters")
    private String vendorName;

    @NotNull(message = "Total amount is required")
    @DecimalMin(value = "0.01", message = "Total amount must be greater than 0")
    private BigDecimal totalAmount;

    @NotNull(message = "Invoice date is required")
    private LocalDate invoiceDate;

    @NotNull(message = "Due date is required")
    private LocalDate dueDate;

    @Size(max = 1000, message = "Description cannot exceed 1000 characters")
    private String description;

    // User tracking fields
    private String createdBy;
    private String updatedBy;
    private String deletedBy;
}
