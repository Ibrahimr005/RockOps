package com.example.backend.controllers.hr;

import com.example.backend.dto.hr.employee.EmployeeDistributionDTO;
import com.example.backend.dto.hr.employee.EmployeeRequestDTO;
import com.example.backend.dto.hr.SalaryStatisticsDTO;
import com.example.backend.services.FileStorageService;
import com.example.backend.services.hr.HREmployeeService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/hr")
@RequiredArgsConstructor
public class HREmployeeController {

    private final HREmployeeService hrEmployeeService;

    @Autowired
    private FileStorageService fileStorageService;
    /**
     * Get salary statistics
     * @return Salary statistics data
     */
    @GetMapping("/dashboard/salary-statistics")
    public ResponseEntity<SalaryStatisticsDTO> getSalaryStatistics() {
        return ResponseEntity.ok(hrEmployeeService.getSalaryStatistics());
    }

    /**
     * Get employee distribution by site and office
     * @return List of employee distribution data
     */
    @GetMapping("/dashboard/employee-distribution")
    public ResponseEntity<List<EmployeeDistributionDTO>> getEmployeeDistribution() {
        return ResponseEntity.ok(hrEmployeeService.getEmployeeDistribution());
    }

    /**
     * Add a new employee with photos
     * @param employeeData JSON data containing employee information
     * @param photo Employee photo (optional)
     * @param idFrontImage Front of ID card image (optional)
     * @param idBackImage Back of ID card image (optional)
     * @return The created employee data
     */
    @PostMapping(value = "/employee", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> addEmployee(
            @RequestPart(value = "employeeData", required = true) EmployeeRequestDTO employeeData,
            @RequestParam(value = "photo", required = false) MultipartFile photo,
            @RequestPart(value = "idFrontImage", required = false) MultipartFile idFrontImage,
            @RequestPart(value = "idBackImage", required = false) MultipartFile idBackImage) {
        try {
            // Process the photo file before passing to service - just like the site controller
            if (photo != null && !photo.isEmpty()) {
                String fileName = fileStorageService.uploadFile(photo);
                String fileUrl = fileStorageService.getFileUrl(fileName);
                employeeData.setPhotoUrl(fileUrl); // ✅ sets full URL
            }
            // Process ID front image
            if (idFrontImage != null && !idFrontImage.isEmpty()) {
                String fileName = fileStorageService.uploadFile(idFrontImage);
                String fileUrl = fileStorageService.getFileUrl(fileName);
                employeeData.setIdFrontImage(fileUrl); // Assuming you add this setter
            }
            // Process ID back image
            if (idBackImage != null && !idBackImage.isEmpty()) {
                String fileName = fileStorageService.uploadFile(idBackImage);
                String fileUrl = fileStorageService.getFileUrl(fileName);
                employeeData.setIdBackImage(fileUrl); // Assuming you add this setter
            }
            // Now pass the DTO with URLs to the service (and null MultipartFiles since we already processed them)
            Map<String, Object> addedEmployee = hrEmployeeService.addEmployee(employeeData, null, null, null);
            return ResponseEntity.ok(addedEmployee);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }
    }

    /**
     * Update an existing employee
     * @param id Employee ID
     * @param employeeData JSON data containing updated employee information
     * @param photo Updated employee photo (optional)
     * @param idFrontImage Updated front of ID card image (optional)
     * @param idBackImage Updated back of ID card image (optional)
     * @return The updated employee data
     */
    @PutMapping(value = "/employee/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> updateEmployee(
            @PathVariable UUID id,
            @RequestPart("employeeData") EmployeeRequestDTO employeeData,
            @RequestPart(value = "photo", required = false) MultipartFile photo,
            @RequestPart(value = "idFrontImage", required = false) MultipartFile idFrontImage,
            @RequestPart(value = "idBackImage", required = false) MultipartFile idBackImage) {
        try {
            // Process the photo file before passing to service - just like the addEmployee method
            if (photo != null && !photo.isEmpty()) {
                String fileName = fileStorageService.uploadFile(photo);
                String fileUrl = fileStorageService.getFileUrl(fileName);
                employeeData.setPhotoUrl(fileUrl); // ✅ sets full URL
            }

            // Process ID front image
            if (idFrontImage != null && !idFrontImage.isEmpty()) {
                String fileName = fileStorageService.uploadFile(idFrontImage);
                String fileUrl = fileStorageService.getFileUrl(fileName);
                employeeData.setIdFrontImage(fileUrl); // ✅ sets full URL
            }

            // Process ID back image
            if (idBackImage != null && !idBackImage.isEmpty()) {
                String fileName = fileStorageService.uploadFile(idBackImage);
                String fileUrl = fileStorageService.getFileUrl(fileName);
                employeeData.setIdBackImage(fileUrl); // ✅ sets full URL
            }

            // Now pass the DTO with URLs to the service (and null MultipartFiles since we already processed them)
            Map<String, Object> updatedEmployee = hrEmployeeService.updateEmployee(id, employeeData, null, null, null);
            return ResponseEntity.ok(updatedEmployee);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }
    }

    /**
     * Get employee by ID
     * @param id Employee ID
     * @return Employee data
     */
    @GetMapping("/employee/{id}")
    public ResponseEntity<Map<String, Object>> getEmployeeById(@PathVariable UUID id) {
        Map<String, Object> employee = hrEmployeeService.getEmployeeById(id);
        return ResponseEntity.ok(employee);
    }

    /**
     * Delete employee by ID
     * @param id Employee ID
     * @return Success message
     */
    @DeleteMapping("/employee/{id}")
    public ResponseEntity<String> deleteEmployee(@PathVariable UUID id) {
        hrEmployeeService.deleteEmployee(id);
        return ResponseEntity.ok("Employee deleted successfully");
    }
}