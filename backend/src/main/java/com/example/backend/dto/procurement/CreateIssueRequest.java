package com.example.backend.dto.procurement;

import com.example.backend.models.procurement.IssueType;
import lombok.Data;

@Data
public class CreateIssueRequest {
    private IssueType issueType;
    private Double affectedQuantity;
    private String issueDescription;
}