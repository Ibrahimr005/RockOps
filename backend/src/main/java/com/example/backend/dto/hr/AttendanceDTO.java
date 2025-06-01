package com.example.backend.dto.hr;

import com.example.backend.models.hr.Attendance;
import com.example.backend.models.hr.AttendanceStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceDTO {

    private UUID id;
    private UUID employeeId;
    private String employeeName;
    private LocalDate date;
    private Attendance.ContractType contractType;

    // HOURLY contract fields
    private LocalTime checkInTime;
    private LocalTime checkOutTime;
    private Integer breakDurationMinutes;
    private Double hoursWorked;
    private Double overtimeHours;
    private Double regularHours;
    private Boolean isLate;
    private Integer lateMinutes;

    // DAILY contract fields
    private Attendance.DailyAttendanceStatus dailyStatus;

    // MONTHLY contract fields
    private AttendanceStatus status;

    // Common fields
    private String notes;
    private Boolean isHoliday;
    private Boolean isLeave;
    private String location;
    private Double latitude;
    private Double longitude;
    private Double dailyEarnings;

    // Display fields
    private String displayStatus;
    private String workingHoursFormatted;
    private String earningsFormatted;

    // Validation flags
    private Boolean isValidRecord;
    private String validationMessage;

    // Helper methods
    public void formatDisplayFields() {
        // Format working hours
        if (hoursWorked != null) {
            int hours = hoursWorked.intValue();
            int minutes = (int) ((hoursWorked - hours) * 60);
            this.workingHoursFormatted = String.format("%dh %dm", hours, minutes);
        }

        // Format earnings
        if (dailyEarnings != null) {
            this.earningsFormatted = String.format("$%.2f", dailyEarnings);
        }

        // Set display status
        this.displayStatus = getDisplayStatus();
    }

    public String getDisplayStatus() {
        if (contractType == null) return "UNKNOWN";

        switch (contractType) {
            case HOURLY:
                if (checkInTime != null && checkOutTime == null) {
                    return "CHECKED_IN";
                } else if (checkInTime != null && checkOutTime != null) {
                    return (isLate != null && isLate) ? "PRESENT_LATE" : "PRESENT";
                } else {
                    return "ABSENT";
                }
            case DAILY:
                return dailyStatus != null ? dailyStatus.name() : "ABSENT";
            case MONTHLY:
                return status != null ? status.name() : "ABSENT";
            default:
                return "UNKNOWN";
        }
    }

    public void validateRecord() {
        this.isValidRecord = true;
        this.validationMessage = null;

        if (contractType == null) {
            this.isValidRecord = false;
            this.validationMessage = "Contract type is required";
            return;
        }

        switch (contractType) {
            case HOURLY:
                if (checkInTime == null) {
                    this.isValidRecord = false;
                    this.validationMessage = "Check-in time is required for hourly employees";
                }
                break;
            case DAILY:
                if (dailyStatus == null) {
                    this.isValidRecord = false;
                    this.validationMessage = "Daily status is required for daily employees";
                }
                break;
            case MONTHLY:
                if (status == null) {
                    this.isValidRecord = false;
                    this.validationMessage = "Status is required for monthly employees";
                }
                break;
        }
    }

    // Check if this is a check-out operation
    public boolean isCheckOut() {
        return contractType == Attendance.ContractType.HOURLY
                && checkInTime != null
                && checkOutTime != null;
    }

    // Check if this is a check-in operation
    public boolean isCheckIn() {
        return contractType == Attendance.ContractType.HOURLY
                && checkInTime != null
                && checkOutTime == null;
    }

    // Get formatted late information
    public String getLateInformation() {
        if (isLate != null && isLate && lateMinutes != null) {
            int hours = lateMinutes / 60;
            int minutes = lateMinutes % 60;
            if (hours > 0) {
                return String.format("Late by %dh %dm", hours, minutes);
            } else {
                return String.format("Late by %dm", minutes);
            }
        }
        return null;
    }
}