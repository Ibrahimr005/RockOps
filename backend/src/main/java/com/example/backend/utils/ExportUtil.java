package com.example.backend.utils;

import com.example.backend.dto.finance.generalLedger.AuditLogResponseDTO;
import com.example.backend.dto.finance.payables.InvoiceResponseDTO;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;


@Component
public class ExportUtil {

    // Creates a minimal but valid XLSX file
    public byte[] exportAuditLogsToExcel(List<AuditLogResponseDTO> auditLogs) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ZipOutputStream zos = new ZipOutputStream(baos);

        // Add required files for XLSX format
        addContentTypes(zos);
        addRels(zos);
        addWorkbook(zos);
        addStyles(zos);
        addSharedStrings(zos, auditLogs);
        addWorksheet(zos, auditLogs);

        zos.close();
        return baos.toByteArray();
    }

    // For backward compatibility
    public byte[] exportAuditLogsToCSV(List<AuditLogResponseDTO> auditLogs) throws IOException {
        return exportAuditLogsToExcel(auditLogs);
    }

    private void addContentTypes(ZipOutputStream zos) throws IOException {
        String contentTypes =
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n" +
                        "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">\n" +
                        "  <Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>\n" +
                        "  <Default Extension=\"xml\" ContentType=\"application/xml\"/>\n" +
                        "  <Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/>\n" +
                        "  <Override PartName=\"/xl/worksheets/sheet1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>\n" +
                        "  <Override PartName=\"/xl/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml\"/>\n" +
                        "  <Override PartName=\"/xl/sharedStrings.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml\"/>\n" +
                        "</Types>";

        addToZip(zos, "[Content_Types].xml", contentTypes);
    }

    private void addRels(ZipOutputStream zos) throws IOException {
        String rels =
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n" +
                        "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">\n" +
                        "  <Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/>\n" +
                        "</Relationships>";

        addToZip(zos, "_rels/.rels", rels);

        String workbookRels =
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n" +
                        "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">\n" +
                        "  <Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet1.xml\"/>\n" +
                        "  <Relationship Id=\"rId2\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles\" Target=\"styles.xml\"/>\n" +
                        "  <Relationship Id=\"rId3\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings\" Target=\"sharedStrings.xml\"/>\n" +
                        "</Relationships>";

        addToZip(zos, "xl/_rels/workbook.xml.rels", workbookRels);
    }

    private void addWorkbook(ZipOutputStream zos) throws IOException {
        String workbook =
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n" +
                        "<workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\">\n" +
                        "  <sheets>\n" +
                        "    <sheet name=\"Audit Logs\" sheetId=\"1\" r:id=\"rId1\"/>\n" +
                        "  </sheets>\n" +
                        "</workbook>";

        addToZip(zos, "xl/workbook.xml", workbook);
    }

    private void addStyles(ZipOutputStream zos) throws IOException {
        String styles =
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n" +
                        "<styleSheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">\n" +
                        "  <fonts count=\"2\">\n" +
                        "    <font>\n" +
                        "      <sz val=\"11\"/>\n" +
                        "      <name val=\"Calibri\"/>\n" +
                        "    </font>\n" +
                        "    <font>\n" +
                        "      <b/>\n" +
                        "      <sz val=\"11\"/>\n" +
                        "      <name val=\"Calibri\"/>\n" +
                        "    </font>\n" +
                        "  </fonts>\n" +
                        "  <fills count=\"1\">\n" +
                        "    <fill>\n" +
                        "      <patternFill patternType=\"none\"/>\n" +
                        "    </fill>\n" +
                        "  </fills>\n" +
                        "  <borders count=\"1\">\n" +
                        "    <border>\n" +
                        "      <left/>\n" +
                        "      <right/>\n" +
                        "      <top/>\n" +
                        "      <bottom/>\n" +
                        "    </border>\n" +
                        "  </borders>\n" +
                        "  <cellStyleXfs count=\"1\">\n" +
                        "    <xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\"/>\n" +
                        "  </cellStyleXfs>\n" +
                        "  <cellXfs count=\"2\">\n" +
                        "    <xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\"/>\n" +
                        "    <xf numFmtId=\"0\" fontId=\"1\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyFont=\"1\"/>\n" +
                        "  </cellXfs>\n" +
                        "</styleSheet>";

        addToZip(zos, "xl/styles.xml", styles);
    }

    private void addSharedStrings(ZipOutputStream zos, List<AuditLogResponseDTO> auditLogs) throws IOException {
        StringBuilder sharedStrings = new StringBuilder();
        sharedStrings.append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n")
                .append("<sst xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" count=\"")
                .append(9 + auditLogs.size() * 9) // 9 headers + 9 values per row
                .append("\" uniqueCount=\"")
                .append(9 + auditLogs.size() * 9)
                .append("\">\n");

        // Add header strings
        addSharedString(sharedStrings, "ID");
        addSharedString(sharedStrings, "Entity Type");
        addSharedString(sharedStrings, "Entity ID");
        addSharedString(sharedStrings, "Action");
        addSharedString(sharedStrings, "Changes");
        addSharedString(sharedStrings, "Username");
        addSharedString(sharedStrings, "Timestamp");
        addSharedString(sharedStrings, "IP Address");
        addSharedString(sharedStrings, "User Agent");

        // Add data strings
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        for (AuditLogResponseDTO log : auditLogs) {
            addSharedString(sharedStrings, log.getId() != null ? log.getId().toString() : "");
            addSharedString(sharedStrings, log.getEntityType() != null ? log.getEntityType() : "");
            addSharedString(sharedStrings, log.getEntityId() != null ? log.getEntityId().toString() : "");
            addSharedString(sharedStrings, log.getAction() != null ? log.getAction() : "");
            addSharedString(sharedStrings, log.getChanges() != null ? log.getChanges() : "");
            addSharedString(sharedStrings, log.getUsername() != null ? log.getUsername() : "");
            addSharedString(sharedStrings, log.getTimestamp() != null ? log.getTimestamp().format(formatter) : "");
            addSharedString(sharedStrings, log.getIpAddress() != null ? log.getIpAddress() : "");
            addSharedString(sharedStrings, log.getUserAgent() != null ? log.getUserAgent() : "");
        }

        sharedStrings.append("</sst>");

        addToZip(zos, "xl/sharedStrings.xml", sharedStrings.toString());
    }

    private void addSharedString(StringBuilder sb, String value) {
        sb.append("  <si>\n")
                .append("    <t>")
                .append(escapeXml(value))
                .append("</t>\n")
                .append("  </si>\n");
    }

    private void addWorksheet(ZipOutputStream zos, List<AuditLogResponseDTO> auditLogs) throws IOException {
        StringBuilder worksheet = new StringBuilder();
        worksheet.append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n")
                .append("<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">\n")
                .append("  <sheetData>\n");

        // Add header row
        worksheet.append("    <row r=\"1\">\n");
        for (int i = 0; i < 9; i++) {
            char colLetter = (char)('A' + i);
            worksheet.append("      <c r=\"")
                    .append(colLetter)
                    .append("1\" s=\"1\" t=\"s\">\n")
                    .append("        <v>")
                    .append(i)
                    .append("</v>\n")
                    .append("      </c>\n");
        }
        worksheet.append("    </row>\n");

        // Add data rows
        int stringIndex = 9; // Start after the header strings
        for (int rowNum = 0; rowNum < auditLogs.size(); rowNum++) {
            worksheet.append("    <row r=\"")
                    .append(rowNum + 2)
                    .append("\">\n");

            for (int colNum = 0; colNum < 9; colNum++) {
                char colLetter = (char)('A' + colNum);
                worksheet.append("      <c r=\"")
                        .append(colLetter)
                        .append(rowNum + 2)
                        .append("\" t=\"s\">\n")
                        .append("        <v>")
                        .append(stringIndex++)
                        .append("</v>\n")
                        .append("      </c>\n");
            }

            worksheet.append("    </row>\n");
        }

        worksheet.append("  </sheetData>\n")
                .append("</worksheet>");

        addToZip(zos, "xl/worksheets/sheet1.xml", worksheet.toString());
    }

    private void addToZip(ZipOutputStream zos, String entryName, String content) throws IOException {
        ZipEntry entry = new ZipEntry(entryName);
        zos.putNextEntry(entry);
        zos.write(content.getBytes("UTF-8"));
        zos.closeEntry();
    }

    private String escapeXml(String s) {
        if (s == null) {
            return "";
        }
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
    }

    // Add these new methods to your ExportUtil class

// ==================== PDF EXPORT METHODS ====================

    // Replace your PDF methods in ExportUtil with these working versions:

    // Replace your PDF methods with this simplified version that doesn't use UnitValue:

    public byte[] exportAgingReportToPDF(List<InvoiceResponseDTO> invoices0To30,
                                         List<InvoiceResponseDTO> invoices31To60,
                                         List<InvoiceResponseDTO> invoices61To90,
                                         List<InvoiceResponseDTO> invoicesOver90) throws IOException {
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document document = new Document(pdf);

            // Title
            Paragraph title = new Paragraph("Invoice Aging Report")
                    .setFontSize(20);
            document.add(title);

            // Date
            Paragraph dateInfo = new Paragraph("Generated on: " +
                    java.time.LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
            document.add(dateInfo);

            // Add some space
            document.add(new Paragraph(" "));

            // Summary section
            Paragraph summaryTitle = new Paragraph("Summary")
                    .setFontSize(16);
            document.add(summaryTitle);

            // Summary table - using simple constructor
            Table summaryTable = new Table(3); // 3 columns

            // Headers
            summaryTable.addHeaderCell("Age Category");
            summaryTable.addHeaderCell("Count");
            summaryTable.addHeaderCell("Total Amount");

            // Data rows
            summaryTable.addCell("0-30 Days (Current)");
            summaryTable.addCell(String.valueOf(invoices0To30.size()));
            summaryTable.addCell("$" + String.format("%.2f", calculateTotal(invoices0To30)));

            summaryTable.addCell("31-60 Days");
            summaryTable.addCell(String.valueOf(invoices31To60.size()));
            summaryTable.addCell("$" + String.format("%.2f", calculateTotal(invoices31To60)));

            summaryTable.addCell("61-90 Days");
            summaryTable.addCell(String.valueOf(invoices61To90.size()));
            summaryTable.addCell("$" + String.format("%.2f", calculateTotal(invoices61To90)));

            summaryTable.addCell("Over 90 Days (Critical)");
            summaryTable.addCell(String.valueOf(invoicesOver90.size()));
            summaryTable.addCell("$" + String.format("%.2f", calculateTotal(invoicesOver90)));

            document.add(summaryTable);
            document.add(new Paragraph(" ")); // Spacer

            // Detail sections
            addInvoiceDetailSection(document, "0-30 Days (Current)", invoices0To30);
            addInvoiceDetailSection(document, "31-60 Days", invoices31To60);
            addInvoiceDetailSection(document, "61-90 Days", invoices61To90);
            addInvoiceDetailSection(document, "Over 90 Days (Critical)", invoicesOver90);

            document.close();
            return baos.toByteArray();

        } catch (Exception e) {
            throw new IOException("Failed to generate PDF: " + e.getMessage(), e);
        }
    }

    private void addInvoiceDetailSection(Document document, String categoryName,
                                         List<InvoiceResponseDTO> invoices) {
        if (invoices.isEmpty()) {
            return;
        }

        // Category header
        Paragraph categoryHeader = new Paragraph(categoryName + " (" + invoices.size() + " invoices)")
                .setFontSize(14);
        document.add(categoryHeader);

        // Invoice table - using simple constructor with 6 columns
        Table invoiceTable = new Table(6);

        // Headers
        invoiceTable.addHeaderCell("Invoice #");
        invoiceTable.addHeaderCell("Vendor");
        invoiceTable.addHeaderCell("Total Amount");
        invoiceTable.addHeaderCell("Remaining");
        invoiceTable.addHeaderCell("Due Date");
        invoiceTable.addHeaderCell("Days Overdue");

        // Data rows
        for (InvoiceResponseDTO invoice : invoices) {
            long daysOverdue = java.time.temporal.ChronoUnit.DAYS.between(
                    invoice.getDueDate(), java.time.LocalDate.now());

            invoiceTable.addCell(invoice.getInvoiceNumber() != null ? invoice.getInvoiceNumber() : "");
            invoiceTable.addCell(invoice.getVendorName() != null ? invoice.getVendorName() : "");
            invoiceTable.addCell("$" + String.format("%.2f", invoice.getTotalAmount()));
            invoiceTable.addCell("$" + String.format("%.2f", invoice.getRemainingBalance()));
            invoiceTable.addCell(invoice.getDueDate() != null ?
                    invoice.getDueDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")) : "");
            invoiceTable.addCell(daysOverdue > 0 ? String.valueOf(daysOverdue) : "Not due");
        }

        document.add(invoiceTable);
        document.add(new Paragraph(" ")); // Add space after each section
    }

    // Helper method to calculate total
    private double calculateTotal(List<InvoiceResponseDTO> invoices) {
        return invoices.stream()
                .mapToDouble(invoice -> invoice.getRemainingBalance().doubleValue())
                .sum();
    }
////
////    // Helper method to add aging category to PDF
////    private void addAgingCategoryToPDF(StringBuilder html, String categoryName, List<InvoiceResponseDTO> invoices) {
////        if (invoices.isEmpty()) {
////            return;
////        }
////
////        html.append("  <div class='category-section'>\n")
////                .append("    <h3>").append(categoryName).append(" (").append(invoices.size()).append(" invoices)</h3>\n")
////                .append("    <table class='invoice-table'>\n")
////                .append("      <thead>\n")
////                .append("        <tr>\n")
////                .append("          <th>Invoice #</th>\n")
////                .append("          <th>Vendor</th>\n")
////                .append("          <th>Total Amount</th>\n")
////                .append("          <th>Remaining</th>\n")
////                .append("          <th>Due Date</th>\n")
////                .append("          <th>Days Overdue</th>\n")
////                .append("        </tr>\n")
////                .append("      </thead>\n")
////                .append("      <tbody>\n");
////
////        for (InvoiceResponseDTO invoice : invoices) {
////            long daysOverdue = java.time.temporal.ChronoUnit.DAYS.between(
////                    invoice.getDueDate(), java.time.LocalDate.now());
////
////            html.append("        <tr>\n")
////                    .append("          <td>").append(escapeHtml(invoice.getInvoiceNumber())).append("</td>\n")
////                    .append("          <td>").append(escapeHtml(invoice.getVendorName())).append("</td>\n")
////                    .append("          <td>$").append(String.format("%.2f", invoice.getTotalAmount())).append("</td>\n")
////                    .append("          <td>$").append(String.format("%.2f", invoice.getRemainingBalance())).append("</td>\n")
////                    .append("          <td>").append(invoice.getDueDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))).append("</td>\n")
////                    .append("          <td>").append(daysOverdue > 0 ? daysOverdue : "Not due").append("</td>\n")
////                    .append("        </tr>\n");
////        }
////
////        html.append("      </tbody>\n")
////                .append("    </table>\n")
////                .append("  </div>\n");
////    }
////
////    // PDF styles
////    private String getPDFStyles() {
////        return """
////        body {
////            font-family: Arial, sans-serif;
////            margin: 20px;
////            color: #333;
////        }
////        .header {
////            text-align: center;
////            border-bottom: 2px solid #4CAF50;
////            padding-bottom: 20px;
////            margin-bottom: 30px;
////        }
////        .header h1 {
////            color: #4CAF50;
////            margin: 0;
////            font-size: 28px;
////        }
////        .report-date {
////            color: #666;
////            margin: 10px 0 0 0;
////        }
////        .summary {
////            margin-bottom: 30px;
////        }
////        .summary h2 {
////            color: #333;
////            border-bottom: 1px solid #ddd;
////            padding-bottom: 5px;
////        }
////        .summary-table {
////            width: 100%;
////            border-collapse: collapse;
////            margin-top: 10px;
////        }
////        .summary-table th,
////        .summary-table td {
////            border: 1px solid #ddd;
////            padding: 8px;
////            text-align: left;
////        }
////        .summary-table th {
////            background-color: #f5f5f5;
////            font-weight: bold;
////        }
////        .category-section {
////            margin-bottom: 40px;
////            page-break-inside: avoid;
////        }
////        .category-section h3 {
////            color: #4CAF50;
////            border-bottom: 1px solid #4CAF50;
////            padding-bottom: 5px;
////        }
////        .invoice-table {
////            width: 100%;
////            border-collapse: collapse;
////            margin-top: 10px;
////            font-size: 12px;
////        }
////        .invoice-table th,
////        .invoice-table td {
////            border: 1px solid #ddd;
////            padding: 6px;
////            text-align: left;
////        }
////        .invoice-table th {
////            background-color: #f9f9f9;
////            font-weight: bold;
////        }
////        .invoice-table tbody tr:nth-child(even) {
////            background-color: #f8f8f8;
////        }
////        .status-pending { color: #ff9800; font-weight: bold; }
////        .status-partially_paid { color: #2196F3; font-weight: bold; }
////        .status-fully_paid { color: #4CAF50; font-weight: bold; }
////        .status-overdue { color: #f44336; font-weight: bold; }
////        .status-cancelled { color: #9E9E9E; font-weight: bold; }
////        @media print {
////            body { margin: 0; }
////            .category-section { page-break-inside: avoid; }
////        }
////        """;
////    }
////
////    // Basic HTML to PDF converter (placeholder)
////    private byte[] convertHtmlToPdf(String html) {
////        try {
////            // Basic PDF structure - for production use OpenPDF or iText
////            ByteArrayOutputStream baos = new ByteArrayOutputStream();
////
////            String pdfContent = "%PDF-1.4\n" +
////                    "1 0 obj\n" +
////                    "<<\n" +
////                    "/Type /Catalog\n" +
////                    "/Pages 2 0 R\n" +
////                    ">>\n" +
////                    "endobj\n" +
////                    "2 0 obj\n" +
////                    "<<\n" +
////                    "/Type /Pages\n" +
////                    "/Kids [3 0 R]\n" +
////                    "/Count 1\n" +
////                    ">>\n" +
////                    "endobj\n" +
////                    "3 0 obj\n" +
////                    "<<\n" +
////                    "/Type /Page\n" +
////                    "/Parent 2 0 R\n" +
////                    "/MediaBox [0 0 612 792]\n" +
////                    "/Contents 4 0 R\n" +
////                    ">>\n" +
////                    "endobj\n" +
////                    "4 0 obj\n" +
////                    "<<\n" +
////                    "/Length 150\n" +
////                    ">>\n" +
////                    "stream\n" +
////                    "BT\n" +
////                    "/F1 12 Tf\n" +
////                    "72 720 Td\n" +
////                    "(Aging Report Generated - PDF Export Available) Tj\n" +
////                    "0 -20 Td\n" +
////                    "(See HTML version for detailed formatting) Tj\n" +
////                    "ET\n" +
////                    "endstream\n" +
////                    "endobj\n" +
////                    "xref\n" +
////                    "0 5\n" +
////                    "0000000000 65535 f \n" +
////                    "0000000010 00000 n \n" +
////                    "0000000079 00000 n \n" +
////                    "0000000173 00000 n \n" +
////                    "0000000301 00000 n \n" +
////                    "trailer\n" +
////                    "<<\n" +
////                    "/Size 5\n" +
////                    "/Root 1 0 R\n" +
////                    ">>\n" +
////                    "startxref\n" +
////                    "500\n" +
////                    "%%EOF";
////
////            baos.write(pdfContent.getBytes("UTF-8"));
////            return baos.toByteArray();
////        } catch (Exception e) {
////            throw new RuntimeException("Failed to generate PDF", e);
////        }
////    }
////
////    // Helper method for HTML escaping
////    private String escapeHtml(String text) {
////        if (text == null) return "";
////        return text.replace("&", "&amp;")
////                .replace("<", "&lt;")
////                .replace(">", "&gt;")
////                .replace("\"", "&quot;")
////                .replace("'", "&#39;");
////    }


}