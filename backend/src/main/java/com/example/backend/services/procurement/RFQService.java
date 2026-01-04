package com.example.backend.services.procurement;

import com.example.backend.dto.procurement.RFQExportRequest;
import com.example.backend.dto.procurement.RFQImportPreviewDTO;
import com.example.backend.models.procurement.Offer;
import com.example.backend.models.procurement.OfferRequestItem;
import com.example.backend.models.warehouse.ItemType;
import com.example.backend.repositories.procurement.OfferRepository;
import com.example.backend.repositories.procurement.OfferRequestItemRepository;
import com.example.backend.repositories.warehouse.ItemTypeRepository;
// Use fully qualified names for POI classes to avoid conflict with iText
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.*;

@Service
public class RFQService {

    private final OfferRepository offerRepository;
    private final OfferRequestItemRepository offerRequestItemRepository;
    private final ItemTypeRepository itemTypeRepository;

    @Autowired
    public RFQService(OfferRepository offerRepository,
                      OfferRequestItemRepository offerRequestItemRepository,
                      ItemTypeRepository itemTypeRepository) {
        this.offerRepository = offerRepository;
        this.offerRequestItemRepository = offerRequestItemRepository;
        this.itemTypeRepository = itemTypeRepository;
    }

    /**
     * Export RFQ to Excel
     */
    public byte[] exportRFQ(RFQExportRequest request) throws IOException {
        XSSFWorkbook workbook = new XSSFWorkbook();
        XSSFSheet sheet = workbook.createSheet("RFQ");

        boolean isArabic = "ar".equalsIgnoreCase(request.getLanguage());

        // Set RTL if language is Arabic
        if (isArabic) {
            sheet.setRightToLeft(true);
        }

        // Create styles
        CellStyle headerStyle = createHeaderStyle(workbook);
        CellStyle lockedStyle = createLockedStyle(workbook);      // Read-only cells
        CellStyle unlockedStyle = createUnlockedStyle(workbook);  // Editable cells
        CellStyle formulaStyle = createFormulaStyle(workbook);

        // Create header row
        Row headerRow = sheet.createRow(0);
        String[] headers = getHeaders(isArabic);

        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }

        // Add data rows
        int rowNum = 1;
        for (RFQExportRequest.RFQItemSelection item : request.getItems()) {
            Row row = sheet.createRow(rowNum);

            // Item Name (Column A) - LOCKED
            Cell itemNameCell = row.createCell(0);
            itemNameCell.setCellValue(item.getItemTypeName());
            itemNameCell.setCellStyle(lockedStyle);

            // Measuring Unit (Column B) - LOCKED
            Cell unitCell = row.createCell(1);
            unitCell.setCellValue(item.getMeasuringUnit());
            unitCell.setCellStyle(lockedStyle);

            // Requested Quantity (Column C) - LOCKED
            Cell requestedQtyCell = row.createCell(2);
            requestedQtyCell.setCellValue(formatNumber(item.getRequestedQuantity(), isArabic));
            requestedQtyCell.setCellStyle(lockedStyle);

            // Response Quantity (Column D) - UNLOCKED (merchant can edit)
            Cell responseQtyCell = row.createCell(3);
            responseQtyCell.setCellStyle(unlockedStyle);

            // Unit Price (Column E) - UNLOCKED (merchant can edit)
            Cell unitPriceCell = row.createCell(4);
            unitPriceCell.setCellStyle(unlockedStyle);

            // Total Price (Column F) - Formula - LOCKED
            Cell totalPriceCell = row.createCell(5);
            String formula = String.format("D%d*E%d", rowNum + 1, rowNum + 1);
            totalPriceCell.setCellFormula(formula);
            totalPriceCell.setCellStyle(formulaStyle);

            rowNum++;
        }

        // Auto-size columns
        for (int i = 0; i < headers.length; i++) {
            sheet.autoSizeColumn(i);
            sheet.setColumnWidth(i, sheet.getColumnWidth(i) + 1000);
        }

        // PROTECT THE SHEET - This is the key part!
        // Only unlocked cells can be edited
        sheet.protectSheet(""); // Empty password, or add a password if you want

        // Write to byte array
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        workbook.write(outputStream);
        workbook.close();

        return outputStream.toByteArray();
    }

    /**
     * Import and preview RFQ response
     */
    public RFQImportPreviewDTO importAndPreviewRFQ(UUID offerId, MultipartFile file) throws IOException {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));

        // Get effective request items (modified or original)
        List<OfferRequestItem> offerRequestItems = offerRequestItemRepository.findByOffer(offer);
        Map<String, ItemType> itemTypeMap = new HashMap<>();
        Map<String, UUID> requestItemIdMap = new HashMap<>();

        // Build lookup maps
        if (!offerRequestItems.isEmpty()) {
            // Use modified items
            for (OfferRequestItem item : offerRequestItems) {
                String key = item.getItemType().getName().toLowerCase().trim();
                itemTypeMap.put(key, item.getItemType());
                requestItemIdMap.put(key, item.getId());
            }
        } else {
            // Use original request order items
            for (var item : offer.getRequestOrder().getRequestItems()) {
                String key = item.getItemType().getName().toLowerCase().trim();
                itemTypeMap.put(key, item.getItemType());
                requestItemIdMap.put(key, item.getId());
            }
        }

        Workbook workbook = WorkbookFactory.create(file.getInputStream());
        Sheet sheet = workbook.getSheetAt(0);

        List<RFQImportPreviewDTO.RFQImportRow> rows = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        int validRows = 0;
        int invalidRows = 0;

        // Skip header row, start from row 1
        for (int i = 1; i <= sheet.getLastRowNum(); i++) {
            Row row = sheet.getRow(i);
            if (row == null) continue;

            RFQImportPreviewDTO.RFQImportRow importRow = parseRow(row, i + 1, itemTypeMap, requestItemIdMap);
            rows.add(importRow);

            if (importRow.isValid()) {
                validRows++;
            } else {
                invalidRows++;
                errors.add("Row " + importRow.getRowNumber() + ": " + importRow.getErrorMessage());
            }
        }

        workbook.close();

        return RFQImportPreviewDTO.builder()
                .rows(rows)
                .totalRows(rows.size())
                .validRows(validRows)
                .invalidRows(invalidRows)
                .errors(errors)
                .build();
    }

    /**
     * Parse a single row from Excel
     */
    private RFQImportPreviewDTO.RFQImportRow parseRow(Row row, int rowNumber,
                                                      Map<String, ItemType> itemTypeMap,
                                                      Map<String, UUID> requestItemIdMap) {
        RFQImportPreviewDTO.RFQImportRow importRow = new RFQImportPreviewDTO.RFQImportRow();
        importRow.setRowNumber(rowNumber);
        importRow.setValid(true);

        try {
            // Column A: Item Name
            Cell itemNameCell = row.getCell(0);
            if (itemNameCell == null || itemNameCell.getCellType() == CellType.BLANK) {
                importRow.setValid(false);
                importRow.setErrorMessage("Item name is required");
                return importRow;
            }
            String itemName = getCellValueAsString(itemNameCell);
            importRow.setItemName(itemName);

            // Column B: Measuring Unit
            Cell unitCell = row.getCell(1);
            String measuringUnit = unitCell != null ? getCellValueAsString(unitCell) : "";
            importRow.setMeasuringUnit(measuringUnit);

            // Column D: Response Quantity (Column C is requested quantity, we skip it)
            Cell responseQtyCell = row.getCell(3);
            if (responseQtyCell == null || responseQtyCell.getCellType() == CellType.BLANK) {
                importRow.setValid(false);
                importRow.setErrorMessage("Response quantity is required");
                return importRow;
            }

            double responseQuantity = getNumericCellValue(responseQtyCell);
            if (responseQuantity <= 0) {
                importRow.setValid(false);
                importRow.setErrorMessage("Response quantity must be greater than 0");
                return importRow;
            }
            importRow.setResponseQuantity(responseQuantity);

            // Column E: Unit Price
            Cell unitPriceCell = row.getCell(4);
            if (unitPriceCell == null || unitPriceCell.getCellType() == CellType.BLANK) {
                importRow.setValid(false);
                importRow.setErrorMessage("Unit price is required");
                return importRow;
            }

            double unitPrice = getNumericCellValue(unitPriceCell);
            if (unitPrice <= 0) {
                importRow.setValid(false);
                importRow.setErrorMessage("Unit price must be greater than 0");
                return importRow;
            }
            importRow.setUnitPrice(BigDecimal.valueOf(unitPrice));

            // Column F: Total Price (can be formula or value)
            Cell totalPriceCell = row.getCell(5);
            double totalPrice;
            if (totalPriceCell != null && totalPriceCell.getCellType() == CellType.FORMULA) {
                totalPrice = totalPriceCell.getNumericCellValue();
            } else if (totalPriceCell != null && totalPriceCell.getCellType() == CellType.NUMERIC) {
                totalPrice = totalPriceCell.getNumericCellValue();
            } else {
                // Calculate if not provided
                totalPrice = responseQuantity * unitPrice;
            }
            importRow.setTotalPrice(BigDecimal.valueOf(totalPrice));

            // Match item to ItemType
            String itemKey = itemName.toLowerCase().trim();
            ItemType itemType = itemTypeMap.get(itemKey);

            if (itemType == null) {
                importRow.setValid(false);
                importRow.setErrorMessage("Item '" + itemName + "' not found in request order");
                return importRow;
            }

            importRow.setItemTypeId(itemType.getId());
            importRow.setRequestOrderItemId(requestItemIdMap.get(itemKey));

        } catch (Exception e) {
            importRow.setValid(false);
            importRow.setErrorMessage("Error parsing row: " + e.getMessage());
        }

        return importRow;
    }

    /**
     * Helper methods
     */
    private String[] getHeaders(boolean isArabic) {
        if (isArabic) {
            return new String[]{
                    "اسم الصنف",           // Item Name
                    "وحدة القياس",         // Measuring Unit
                    "الكمية المطلوبة",     // Requested Quantity
                    "كمية الاستجابة",      // Response Quantity
                    "سعر الوحدة",         // Unit Price
                    "السعر الإجمالي"      // Total Price
            };
        } else {
            return new String[]{
                    "Item Name",
                    "Measuring Unit",
                    "Requested Quantity",
                    "Response Quantity",
                    "Unit Price",
                    "Total Price"
            };
        }
    }

    private String formatNumber(double number, boolean isArabic) {
        if (isArabic) {
            // Convert to Arabic numerals
            String numStr = String.valueOf((int) number);
            return convertToArabicNumerals(numStr);
        }
        return String.valueOf((int) number);
    }

    private String convertToArabicNumerals(String number) {
        char[] arabicNumerals = {'٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'};
        StringBuilder result = new StringBuilder();
        for (char c : number.toCharArray()) {
            if (Character.isDigit(c)) {
                result.append(arabicNumerals[c - '0']);
            } else {
                result.append(c);
            }
        }
        return result.toString();
    }

    private double convertFromArabicNumerals(String arabicNumber) {
        String[] arabicNumerals = {"٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"};
        String result = arabicNumber;

        for (int i = 0; i < arabicNumerals.length; i++) {
            result = result.replace(arabicNumerals[i], String.valueOf(i));
        }

        try {
            return Double.parseDouble(result);
        } catch (NumberFormatException e) {
            throw new RuntimeException("Invalid number format: " + arabicNumber);
        }
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null) return "";

        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue().trim();
            case NUMERIC:
                return String.valueOf((int) cell.getNumericCellValue());
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                return cell.getCellFormula();
            default:
                return "";
        }
    }

    private double getNumericCellValue(Cell cell) {
        if (cell == null) return 0;

        switch (cell.getCellType()) {
            case NUMERIC:
                return cell.getNumericCellValue();
            case STRING:
                String value = cell.getStringCellValue().trim();
                // Try to parse Arabic numerals
                try {
                    return convertFromArabicNumerals(value);
                } catch (Exception e) {
                    // Try regular parsing
                    return Double.parseDouble(value);
                }
            case FORMULA:
                return cell.getNumericCellValue();
            default:
                return 0;
        }
    }

    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 12);
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    private CellStyle createDataStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setAlignment(HorizontalAlignment.LEFT);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    private CellStyle createFormulaStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();

        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);

        // Light blue background for formulas
        style.setFillForegroundColor(IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);

        // Lock formula cells
        style.setLocked(true);

        return style;
    }

    private CellStyle createLockedStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();

        // Set borders
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);

        // Set background color (light gray to indicate read-only)
        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        // Set font
        Font font = workbook.createFont();
        font.setBold(false);
        font.setFontHeightInPoints((short) 11);
        style.setFont(font);

        // Lock the cell
        style.setLocked(true);

        return style;
    }

    private CellStyle createUnlockedStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();

        // Set borders
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);

        // Set background color (white or light yellow to indicate editable)
        style.setFillForegroundColor(IndexedColors.LIGHT_YELLOW.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        // Set font
        Font font = workbook.createFont();
        font.setBold(false);
        font.setFontHeightInPoints((short) 11);
        style.setFont(font);

        // UNLOCK the cell (this is editable)
        style.setLocked(false);

        return style;
    }


}