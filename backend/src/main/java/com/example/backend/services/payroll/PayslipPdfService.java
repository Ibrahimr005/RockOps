package com.example.backend.services.payroll;

import com.example.backend.models.payroll.Payslip;
import com.example.backend.models.payroll.Earning;
import com.example.backend.models.payroll.Deduction;
import com.example.backend.models.payroll.EmployerContribution;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PayslipPdfService {
    
    @Value("${app.payslip.pdf.storage-path:/opt/payroll/payslips}")
    private String pdfStoragePath;
    
    @Value("${app.company.name:Your Company Name}")
    private String companyName;
    
    @Value("${app.company.address:Company Address}")
    private String companyAddress;
    
    @Value("${app.company.phone:+1-555-0123}")
    private String companyPhone;
    
    @Value("${app.company.email:hr@company.com}")
    private String companyEmail;
    
    /**
     * Generate PDF for payslip
     */
    public String generatePayslipPdf(Payslip payslip) {
        log.info("Generating PDF for payslip ID: {}", payslip.getId());
        
        try {
            // Ensure directory exists
            createDirectoryIfNotExists();
            
            // Generate filename
            String filename = generateFilename(payslip);
            String fullPath = Paths.get(pdfStoragePath, filename).toString();
            
            // Generate PDF content
            String htmlContent = generateHtmlContent(payslip);
            
            // Convert HTML to PDF (using a library like iText, Flying Saucer, or wkhtmltopdf)
            // For this example, I'll create a simple HTML file that can be converted to PDF
            generateHtmlFile(htmlContent, fullPath.replace(".pdf", ".html"));
            
            // In a real implementation, you would use a PDF generation library here
            // For now, we'll simulate PDF generation
            generateSimulatedPdf(htmlContent, fullPath);
            
            log.info("PDF generated successfully: {}", fullPath);
            return fullPath;
            
        } catch (Exception e) {
            log.error("Error generating PDF for payslip {}: {}", payslip.getId(), e.getMessage(), e);
            throw new RuntimeException("Failed to generate payslip PDF", e);
        }
    }
    
    private void createDirectoryIfNotExists() throws IOException {
        Path directory = Paths.get(pdfStoragePath);
        if (!Files.exists(directory)) {
            Files.createDirectories(directory);
            log.info("Created payslip storage directory: {}", pdfStoragePath);
        }
    }
    
    private String generateFilename(Payslip payslip) {
        String employeeName = payslip.getEmployee().getFirstName() + "_" + payslip.getEmployee().getLastName();
        String payPeriod = payslip.getPayPeriodStart().format(DateTimeFormatter.ofPattern("yyyy-MM"));
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        
        return String.format("payslip_%s_%s_%s.pdf", 
                employeeName.replaceAll("[^a-zA-Z0-9]", "_"), 
                payPeriod, 
                timestamp);
    }
    
    private String generateHtmlContent(Payslip payslip) {
        StringBuilder html = new StringBuilder();
        
        html.append("<!DOCTYPE html>\n")
            .append("<html>\n")
            .append("<head>\n")
            .append("    <meta charset=\"UTF-8\">\n")
            .append("    <title>Payslip</title>\n")
            .append("    <style>\n")
            .append(getCssStyles())
            .append("    </style>\n")
            .append("</head>\n")
            .append("<body>\n");
        
        // Header
        html.append("    <div class=\"header\">\n")
            .append("        <h1>").append(companyName).append("</h1>\n")
            .append("        <div class=\"company-info\">\n")
            .append("            <p>").append(companyAddress).append("</p>\n")
            .append("            <p>Phone: ").append(companyPhone).append(" | Email: ").append(companyEmail).append("</p>\n")
            .append("        </div>\n")
            .append("    </div>\n");
        
        // Payslip Title
        html.append("    <div class=\"payslip-title\">\n")
            .append("        <h2>PAYSLIP</h2>\n")
            .append("        <p>Pay Period: ").append(formatDate(payslip.getPayPeriodStart()))
            .append(" to ").append(formatDate(payslip.getPayPeriodEnd())).append("</p>\n")
            .append("        <p>Pay Date: ").append(formatDate(payslip.getPayDate())).append("</p>\n")
            .append("    </div>\n");
        
        // Employee Information
        html.append("    <div class=\"employee-info\">\n")
            .append("        <h3>Employee Information</h3>\n")
            .append("        <div class=\"info-grid\">\n")
            .append("            <div class=\"info-item\">\n")
            .append("                <label>Name:</label>\n")
            .append("                <span>").append(payslip.getEmployee().getFirstName())
            .append(" ").append(payslip.getEmployee().getLastName()).append("</span>\n")
            .append("            </div>\n")
            .append("            <div class=\"info-item\">\n")
            .append("                <label>Employee ID:</label>\n")
            .append("                <span>").append(payslip.getEmployee().getId()).append("</span>\n")
            .append("            </div>\n")
            .append("            <div class=\"info-item\">\n")
            .append("                <label>Position:</label>\n")
            .append("                <span>").append(getJobPositionName(payslip)).append("</span>\n")
            .append("            </div>\n")
            .append("            <div class=\"info-item\">\n")
            .append("                <label>Department:</label>\n")
            .append("                <span>").append(getDepartmentName(payslip)).append("</span>\n")
            .append("            </div>\n")
            .append("        </div>\n")
            .append("    </div>\n");
        
        // Attendance Summary
        html.append("    <div class=\"attendance-summary\">\n")
            .append("        <h3>Attendance Summary</h3>\n")
            .append("        <div class=\"info-grid\">\n")
            .append("            <div class=\"info-item\">\n")
            .append("                <label>Days Worked:</label>\n")
            .append("                <span>").append(payslip.getDaysWorked()).append("</span>\n")
            .append("            </div>\n")
            .append("            <div class=\"info-item\">\n")
            .append("                <label>Days Absent:</label>\n")
            .append("                <span>").append(payslip.getDaysAbsent()).append("</span>\n")
            .append("            </div>\n")
            .append("            <div class=\"info-item\">\n")
            .append("                <label>Overtime Hours:</label>\n")
            .append("                <span>").append(payslip.getOvertimeHours()).append("</span>\n")
            .append("            </div>\n")
            .append("        </div>\n")
            .append("    </div>\n");
        
        // Earnings Table
        html.append("    <div class=\"earnings-section\">\n")
            .append("        <h3>Earnings</h3>\n")
            .append("        <table>\n")
            .append("            <thead>\n")
            .append("                <tr>\n")
            .append("                    <th>Description</th>\n")
            .append("                    <th>Amount</th>\n")
            .append("                </tr>\n")
            .append("            </thead>\n")
            .append("            <tbody>\n")
            .append("                <tr>\n")
            .append("                    <td>Base Salary</td>\n")
            .append("                    <td class=\"amount\">").append(formatCurrency(payslip.getGrossSalary())).append("</td>\n")
            .append("                </tr>\n");
        
        // Add other earnings
        if (payslip.getEarnings() != null) {
            for (Earning earning : payslip.getEarnings()) {
                html.append("                <tr>\n")
                    .append("                    <td>").append(earning.getDescription()).append("</td>\n")
                    .append("                    <td class=\"amount\">").append(formatCurrency(earning.getAmount())).append("</td>\n")
                    .append("                </tr>\n");
            }
        }
        
        html.append("                <tr class=\"total-row\">\n")
            .append("                    <td><strong>Total Earnings</strong></td>\n")
            .append("                    <td class=\"amount\"><strong>").append(formatCurrency(payslip.getGrossSalary().add(payslip.getTotalEarnings()))).append("</strong></td>\n")
            .append("                </tr>\n")
            .append("            </tbody>\n")
            .append("        </table>\n")
            .append("    </div>\n");
        
        // Deductions Table
        html.append("    <div class=\"deductions-section\">\n")
            .append("        <h3>Deductions</h3>\n")
            .append("        <table>\n")
            .append("            <thead>\n")
            .append("                <tr>\n")
            .append("                    <th>Description</th>\n")
            .append("                    <th>Amount</th>\n")
            .append("                </tr>\n")
            .append("            </thead>\n")
            .append("            <tbody>\n");
        
        if (payslip.getDeductions() != null) {
            for (Deduction deduction : payslip.getDeductions()) {
                html.append("                <tr>\n")
                    .append("                    <td>").append(deduction.getDescription()).append("</td>\n")
                    .append("                    <td class=\"amount\">").append(formatCurrency(deduction.getAmount())).append("</td>\n")
                    .append("                </tr>\n");
            }
        }
        
        html.append("                <tr class=\"total-row\">\n")
            .append("                    <td><strong>Total Deductions</strong></td>\n")
            .append("                    <td class=\"amount\"><strong>").append(formatCurrency(payslip.getTotalDeductions())).append("</strong></td>\n")
            .append("                </tr>\n")
            .append("            </tbody>\n")
            .append("        </table>\n")
            .append("    </div>\n");
        
        // Net Pay Summary
        html.append("    <div class=\"net-pay-summary\">\n")
            .append("        <h3>Net Pay Summary</h3>\n")
            .append("        <div class=\"net-pay-amount\">\n")
            .append("            <label>Net Pay:</label>\n")
            .append("            <span class=\"net-amount\">").append(formatCurrency(payslip.getNetPay())).append("</span>\n")
            .append("        </div>\n")
            .append("    </div>\n");
        
        // Footer
        html.append("    <div class=\"footer\">\n")
            .append("        <p>This is a computer-generated payslip and does not require a signature.</p>\n")
            .append("        <p>Generated on: ").append(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))).append("</p>\n")
            .append("    </div>\n");
        
        html.append("</body>\n")
            .append("</html>");
        
        return html.toString();
    }
    
    private String getCssStyles() {
        return """
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background-color: #f5f5f5;
                }
                
                .header {
                    text-align: center;
                    background-color: #2c3e50;
                    color: white;
                    padding: 20px;
                    margin-bottom: 20px;
                }
                
                .header h1 {
                    margin: 0;
                    font-size: 28px;
                }
                
                .company-info p {
                    margin: 5px 0;
                    font-size: 14px;
                }
                
                .payslip-title {
                    text-align: center;
                    background-color: white;
                    padding: 15px;
                    border: 1px solid #ddd;
                    margin-bottom: 20px;
                }
                
                .payslip-title h2 {
                    margin: 0 0 10px 0;
                    color: #2c3e50;
                }
                
                .employee-info, .attendance-summary, .earnings-section, .deductions-section, .net-pay-summary {
                    background-color: white;
                    padding: 15px;
                    border: 1px solid #ddd;
                    margin-bottom: 15px;
                }
                
                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                }
                
                .info-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 5px 0;
                }
                
                .info-item label {
                    font-weight: bold;
                    color: #2c3e50;
                }
                
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                }
                
                th, td {
                    padding: 10px;
                    text-align: left;
                    border-bottom: 1px solid #ddd;
                }
                
                th {
                    background-color: #f8f9fa;
                    font-weight: bold;
                    color: #2c3e50;
                }
                
                .amount {
                    text-align: right;
                }
                
                .total-row {
                    background-color: #f8f9fa;
                }
                
                .net-pay-summary {
                    text-align: center;
                    background-color: #e8f5e8;
                    border: 2px solid #27ae60;
                }
                
                .net-pay-amount {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 20px;
                    font-size: 20px;
                    font-weight: bold;
                }
                
                .net-amount {
                    color: #27ae60;
                    font-size: 24px;
                }
                
                .footer {
                    text-align: center;
                    margin-top: 20px;
                    font-size: 12px;
                    color: #666;
                }
                
                h3 {
                    margin: 0 0 15px 0;
                    color: #2c3e50;
                    border-bottom: 2px solid #3498db;
                    padding-bottom: 5px;
                }
                """;
    }
    
    private void generateHtmlFile(String htmlContent, String filePath) throws IOException {
        try (FileOutputStream fos = new FileOutputStream(filePath)) {
            fos.write(htmlContent.getBytes());
        }
        log.info("HTML file generated: {}", filePath);
    }
    
    private void generateSimulatedPdf(String htmlContent, String pdfPath) throws IOException {
        // In a real implementation, you would use a library like:
        // 1. iText (commercial license required for commercial use)
        // 2. Flying Saucer + iText
        // 3. wkhtmltopdf (command line tool)
        // 4. Puppeteer with Chrome headless
        
        // For this example, we'll create a placeholder PDF file
        try (FileOutputStream fos = new FileOutputStream(pdfPath)) {
            // Write minimal PDF header (this won't be a valid PDF, just for demonstration)
            String pdfHeader = "%PDF-1.4\n" +
                    "1 0 obj\n" +
                    "<<\n" +
                    "/Type /Catalog\n" +
                    "/Pages 2 0 R\n" +
                    ">>\n" +
                    "endobj\n" +
                    "2 0 obj\n" +
                    "<<\n" +
                    "/Type /Pages\n" +
                    "/Kids [3 0 R]\n" +
                    "/Count 1\n" +
                    ">>\n" +
                    "endobj\n" +
                    "3 0 obj\n" +
                    "<<\n" +
                    "/Type /Page\n" +
                    "/Parent 2 0 R\n" +
                    "/MediaBox [0 0 612 792]\n" +
                    ">>\n" +
                    "endobj\n" +
                    "xref\n" +
                    "0 4\n" +
                    "0000000000 65535 f \n" +
                    "0000000009 65535 n \n" +
                    "0000000074 65535 n \n" +
                    "0000000131 65535 n \n" +
                    "trailer\n" +
                    "<<\n" +
                    "/Size 4\n" +
                    "/Root 1 0 R\n" +
                    ">>\n" +
                    "startxref\n" +
                    "210\n" +
                    "%%EOF";
            
            fos.write(pdfHeader.getBytes());
        }
        
        log.warn("Generated placeholder PDF file. In production, use a proper PDF generation library.");
    }
    
    private String formatDate(java.time.LocalDate date) {
        return date.format(DateTimeFormatter.ofPattern("MMM dd, yyyy"));
    }
    
    private String formatCurrency(BigDecimal amount) {
        return String.format("$%.2f", amount);
    }
    
    private String getJobPositionName(Payslip payslip) {
        return payslip.getEmployee().getJobPosition() != null ? 
               payslip.getEmployee().getJobPosition().getPositionName() : "N/A";
    }
    
    private String getDepartmentName(Payslip payslip) {
        return payslip.getEmployee().getJobPosition() != null && 
               payslip.getEmployee().getJobPosition().getDepartment() != null ?
               payslip.getEmployee().getJobPosition().getDepartment().getName() : "N/A";
    }
}