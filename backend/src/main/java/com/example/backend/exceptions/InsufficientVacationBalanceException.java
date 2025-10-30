package com.example.backend.exceptions;

public class InsufficientVacationBalanceException extends RuntimeException {
  private final int availableDays;
  private final int requestedDays;

  public InsufficientVacationBalanceException(int availableDays, int requestedDays) {
    super(String.format("You cannot request more leave days than your available annual balance. Available: %d days, Requested: %d days.",
            availableDays, requestedDays));
    this.availableDays = availableDays;
    this.requestedDays = requestedDays;
  }

  public int getAvailableDays() {
    return availableDays;
  }

  public int getRequestedDays() {
    return requestedDays;
  }
}