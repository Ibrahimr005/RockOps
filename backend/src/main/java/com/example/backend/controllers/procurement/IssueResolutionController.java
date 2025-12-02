package com.example.backend.controllers.procurement;

import com.example.backend.dto.procurement.ResolveIssueRequest;
import com.example.backend.services.procurement.IssueResolutionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/procurement/issues")
@RequiredArgsConstructor
public class IssueResolutionController {

    private final IssueResolutionService issueResolutionService;

    @PostMapping("/resolve")
    public ResponseEntity<Void> resolveIssues(
            @RequestBody List<ResolveIssueRequest> requests,
            @AuthenticationPrincipal UserDetails userDetails) {
        issueResolutionService.resolveIssues(requests, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }
}