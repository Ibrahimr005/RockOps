package com.example.backend.controllers;

import com.example.backend.dtos.*;
import com.example.backend.exceptions.MaintenanceException;
import com.example.backend.models.maintenance.DirectPurchaseTicket.DirectPurchaseStatus;
import com.example.backend.services.DirectPurchaseStepService;
import com.example.backend.services.DirectPurchaseTicketService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/direct-purchase-tickets")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class DirectPurchaseTicketController {

    private final DirectPurchaseTicketService ticketService;
    private final DirectPurchaseStepService stepService;

    // Ticket endpoints

    @PostMapping
    public ResponseEntity<DirectPurchaseTicketDetailsDto> createTicket(@Valid @RequestBody CreateDirectPurchaseTicketDto dto) {
        try {
            DirectPurchaseTicketDetailsDto created = ticketService.createTicket(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (MaintenanceException e) {
            log.error("Error creating direct purchase ticket: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Unexpected error creating direct purchase ticket: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<DirectPurchaseTicketDetailsDto> getTicket(@PathVariable UUID id) {
        try {
            DirectPurchaseTicketDetailsDto ticket = ticketService.getTicketById(id);
            return ResponseEntity.ok(ticket);
        } catch (MaintenanceException e) {
            log.error("Error retrieving direct purchase ticket: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Unexpected error retrieving direct purchase ticket: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping
    public ResponseEntity<List<DirectPurchaseTicketDto>> getAllTickets(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) UUID equipmentId,
            @RequestParam(required = false) UUID merchantId) {
        try {
            List<DirectPurchaseTicketDto> tickets;

            if (status != null) {
                DirectPurchaseStatus statusEnum = DirectPurchaseStatus.valueOf(status.toUpperCase());
                tickets = ticketService.getTicketsByStatus(statusEnum);
            } else if (equipmentId != null) {
                tickets = ticketService.getTicketsByEquipment(equipmentId);
            } else if (merchantId != null) {
                tickets = ticketService.getTicketsByMerchant(merchantId);
            } else {
                tickets = ticketService.getAllTickets();
            }

            return ResponseEntity.ok(tickets);
        } catch (Exception e) {
            log.error("Error retrieving direct purchase tickets: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<DirectPurchaseTicketDetailsDto> updateTicket(
            @PathVariable UUID id,
            @Valid @RequestBody DirectPurchaseTicketDto dto) {
        try {
            DirectPurchaseTicketDetailsDto updated = ticketService.updateTicket(id, dto);
            return ResponseEntity.ok(updated);
        } catch (MaintenanceException e) {
            log.error("Error updating direct purchase ticket: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Unexpected error updating direct purchase ticket: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Object> deleteTicket(@PathVariable UUID id) {
        try {
            ticketService.deleteTicket(id);
            return ResponseEntity.noContent().build();
        } catch (MaintenanceException e) {
            log.error("Error deleting direct purchase ticket: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Unexpected error deleting direct purchase ticket: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "An unexpected error occurred while deleting the ticket"));
        }
    }

    // Step endpoints

    @GetMapping("/{ticketId}/steps")
    public ResponseEntity<List<DirectPurchaseStepDto>> getSteps(@PathVariable UUID ticketId) {
        try {
            List<DirectPurchaseStepDto> steps = stepService.getStepsByTicket(ticketId);
            return ResponseEntity.ok(steps);
        } catch (Exception e) {
            log.error("Error retrieving direct purchase steps: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/{ticketId}/steps/{stepId}")
    public ResponseEntity<DirectPurchaseStepDto> getStep(
            @PathVariable UUID ticketId,
            @PathVariable UUID stepId) {
        try {
            DirectPurchaseStepDto step = stepService.getStepById(stepId);
            return ResponseEntity.ok(step);
        } catch (MaintenanceException e) {
            log.error("Error retrieving direct purchase step: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Unexpected error retrieving direct purchase step: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @PutMapping("/{ticketId}/steps/{stepId}")
    public ResponseEntity<DirectPurchaseStepDto> updateStep(
            @PathVariable UUID ticketId,
            @PathVariable UUID stepId,
            @Valid @RequestBody UpdateDirectPurchaseStepDto dto) {
        try {
            DirectPurchaseStepDto updated = stepService.updateStep(ticketId, stepId, dto);
            return ResponseEntity.ok(updated);
        } catch (MaintenanceException e) {
            log.error("Error updating direct purchase step: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Unexpected error updating direct purchase step: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @PutMapping("/{ticketId}/steps/{stepId}/complete")
    public ResponseEntity<?> completeStep(
            @PathVariable UUID ticketId,
            @PathVariable UUID stepId,
            @Valid @RequestBody CompleteDirectPurchaseStepDto dto) {
        try {
            DirectPurchaseStepDto completed = stepService.completeStep(ticketId, stepId, dto);
            return ResponseEntity.ok(completed);
        } catch (MaintenanceException e) {
            log.error("Error completing direct purchase step: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Unexpected error completing direct purchase step: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("message", "Failed to complete step"));
        }
    }

    @DeleteMapping("/{ticketId}/steps/{stepId}")
    public ResponseEntity<Object> deleteStep(
            @PathVariable UUID ticketId,
            @PathVariable UUID stepId) {
        try {
            stepService.deleteStep(ticketId, stepId);
            return ResponseEntity.noContent().build();
        } catch (MaintenanceException e) {
            log.error("Error deleting direct purchase step: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Unexpected error deleting direct purchase step: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "An unexpected error occurred while deleting the step"));
        }
    }

    // Error handling
    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleGenericException(Exception e) {
        log.error("Unexpected error: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("An unexpected error occurred");
    }
}
