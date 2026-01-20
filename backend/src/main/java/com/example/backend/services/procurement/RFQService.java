package com.example.backend.services.procurement;

import com.example.backend.dto.procurement.RFQExportRequest;
import com.example.backend.dto.procurement.RFQImportPreviewDTO;
import com.example.backend.models.procurement.Offer.Offer;
import com.example.backend.models.procurement.Offer.OfferRequestItem;
import com.example.backend.models.warehouse.ItemType;
import com.example.backend.repositories.procurement.OfferRepository;
import com.example.backend.repositories.procurement.OfferRequestItemRepository;
import com.example.backend.repositories.warehouse.ItemTypeRepository;
// Use fully qualified names for POI classes to avoid conflict with iText
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddressList;
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

    private void addCurrencyDropdown(XSSFSheet sheet, int firstRow, int lastRow, int col) {
        DataValidationHelper validationHelper = sheet.getDataValidationHelper();
        DataValidationConstraint constraint = validationHelper.createExplicitListConstraint(
                new String[]{"EGP", "USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "INR", "SGD"}
        );

        CellRangeAddressList addressList = new CellRangeAddressList(firstRow, lastRow, col, col);
        DataValidation dataValidation = validationHelper.createValidation(constraint, addressList);
        dataValidation.setSuppressDropDownArrow(true);
        dataValidation.setShowErrorBox(true);
        sheet.addValidationData(dataValidation);
    }
    private CellStyle createNumberStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);

        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 11);
        style.setFont(font);

        style.setAlignment(HorizontalAlignment.CENTER);
        style.setLocked(true);

        return style;
    }

    private CellStyle createSummaryLabelStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();

        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 14);
        style.setFont(font);

        style.setAlignment(HorizontalAlignment.RIGHT);
        style.setVerticalAlignment(VerticalAlignment.CENTER);

        return style;
    }

    private CellStyle createSummaryValueStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();

        style.setBorderTop(BorderStyle.MEDIUM);
        style.setBorderBottom(BorderStyle.MEDIUM);
        style.setBorderLeft(BorderStyle.MEDIUM);
        style.setBorderRight(BorderStyle.MEDIUM);

        style.setFillForegroundColor(IndexedColors.LIGHT_GREEN.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 14);
        style.setFont(font);

        style.setLocked(true);

        return style;
    }

    private CellStyle createDeliveryUnlockedStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();

        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);

        style.setFillForegroundColor(IndexedColors.LIGHT_YELLOW.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        Font font = workbook.createFont();
        font.setBold(false);
        font.setFontHeightInPoints((short) 11);
        style.setFont(font);

        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setLocked(false); // Unlocked

        return style;
    }

    private CellStyle createDeliveryFormulaStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();

        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);

        style.setFillForegroundColor(IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 11);
        style.setFont(font);

        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setLocked(true); // Locked because it's a formula

        return style;
    }

    private void addNumberValidation(XSSFSheet sheet, int firstRow, int lastRow, int col) {
        DataValidationHelper validationHelper = sheet.getDataValidationHelper();

        // Create constraint for whole numbers greater than 0
        DataValidationConstraint constraint = validationHelper.createNumericConstraint(
                DataValidationConstraint.ValidationType.INTEGER,
                DataValidationConstraint.OperatorType.GREATER_THAN,
                "0",
                null
        );

        CellRangeAddressList addressList = new CellRangeAddressList(firstRow, lastRow, col, col);
        DataValidation dataValidation = validationHelper.createValidation(constraint, addressList);

        // Set error message
        dataValidation.setShowErrorBox(true);
        dataValidation.setErrorStyle(DataValidation.ErrorStyle.STOP);
        dataValidation.createErrorBox("Invalid Input", "Please enter a valid number greater than 0");

        sheet.addValidationData(dataValidation);
    }
    /**
     * Export RFQ to Excel
     */
    public byte[] exportRFQ(RFQExportRequest request) throws IOException {
        XSSFWorkbook workbook = new XSSFWorkbook();
        XSSFSheet sheet = workbook.createSheet("RFQ");

        boolean isArabic = "ar".equalsIgnoreCase(request.getLanguage());

        if (isArabic) {
            sheet.setRightToLeft(true);
        }

        // Create styles
        CellStyle headerStyle = createHeaderStyle(workbook);
        CellStyle lockedStyle = createLockedStyle(workbook);
        CellStyle unlockedStyle = createUnlockedStyle(workbook);
        CellStyle formulaStyle = createFormulaStyle(workbook);
        CellStyle numberStyle = createNumberStyle(workbook);
        CellStyle summaryStyle = createSummaryStyle(workbook);
        CellStyle deliveryUnlockedStyle = createDeliveryUnlockedStyle(workbook);
        CellStyle deliveryFormulaStyle = createDeliveryFormulaStyle(workbook);

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

            // # Column (A) - LOCKED
            Cell numberCell = row.createCell(0);
            setCellValueWithArabicSupport(numberCell, rowNum, isArabic);
            numberCell.setCellStyle(numberStyle);

            // Item Name (Column B) - LOCKED
            Cell itemNameCell = row.createCell(1);
            itemNameCell.setCellValue(item.getItemTypeName());
            itemNameCell.setCellStyle(lockedStyle);

            // Measuring Unit (Column C) - LOCKED
            Cell unitCell = row.createCell(2);
            unitCell.setCellValue(item.getMeasuringUnit());
            unitCell.setCellStyle(lockedStyle);

            // Requested Quantity (Column D) - LOCKED
            Cell requestedQtyCell = row.createCell(3);
            if (isArabic) {
                requestedQtyCell.setCellValue(formatNumber(item.getRequestedQuantity(), isArabic));
            } else {
                requestedQtyCell.setCellValue(item.getRequestedQuantity());
            }
            requestedQtyCell.setCellStyle(lockedStyle);

            // Response Quantity (Column E) - UNLOCKED
            Cell responseQtyCell = row.createCell(4);
            responseQtyCell.setCellStyle(unlockedStyle);

            // Currency (Column F) - DROPDOWN - UNLOCKED
            Cell currencyCell = row.createCell(5);
            currencyCell.setCellValue("EGP");
            currencyCell.setCellStyle(unlockedStyle);

            // Unit Price (Column G) - UNLOCKED
            Cell unitPriceCell = row.createCell(6);
            unitPriceCell.setCellStyle(unlockedStyle);

            // Total Price (Column H) - Formula - LOCKED
            Cell totalPriceCell = row.createCell(7);
            String formula = String.format("E%d*G%d", rowNum + 1, rowNum + 1);
            totalPriceCell.setCellFormula(formula);
            totalPriceCell.setCellStyle(formulaStyle);

            // Estimated Delivery Days (Column I)
            Cell deliveryCell = row.createCell(8);
            if (rowNum == 1) {
                // First row is editable
                if (isArabic) {
                    deliveryCell.setCellValue(convertToArabicNumerals("7")); // Default value in Arabic
                } else {
                    deliveryCell.setCellValue(7);
                }
                deliveryCell.setCellStyle(deliveryUnlockedStyle);
            } else {
                // Other rows reference the first row
                deliveryCell.setCellFormula("$I$2");
                deliveryCell.setCellStyle(deliveryFormulaStyle);
            }

            rowNum++;
        }

        // Add currency dropdown validation
        addCurrencyDropdown(sheet, 1, rowNum - 1, 5);

        // Add number validation for delivery days
        addNumberValidation(sheet, 1, rowNum - 1, 8);

        // Add summary row (directly under the data)
        Row summaryRow = sheet.createRow(rowNum);

        // Empty cells before totals
        for (int i = 0; i < 4; i++) {
            summaryRow.createCell(i);
        }

        // Total Response Quantity (Column E)
        Cell totalQtyCell = summaryRow.createCell(4);
        totalQtyCell.setCellFormula(String.format("SUM(E2:E%d)", rowNum));
        totalQtyCell.setCellStyle(summaryStyle);

        // Empty cells for F and G
        summaryRow.createCell(5);
        summaryRow.createCell(6);

        // Total Price (Column H)
        Cell totalPriceCell = summaryRow.createCell(7);
        totalPriceCell.setCellFormula(String.format("SUM(H2:H%d)", rowNum));
        totalPriceCell.setCellStyle(summaryStyle);

        // Auto-size columns
        for (int i = 0; i < headers.length; i++) {
            sheet.autoSizeColumn(i);
            sheet.setColumnWidth(i, sheet.getColumnWidth(i) + 1500);
        }

        // Make first column (numbers) narrower
        sheet.setColumnWidth(0, 2000);

        // PROTECT THE SHEET
        sheet.protectSheet("");

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

        // CHANGED: Skip header row (0), start from row 1, and stop when we hit empty rows or summary
        for (int i = 1; i <= sheet.getLastRowNum(); i++) {
            Row row = sheet.getRow(i);
            if (row == null) continue;

            // ADDED: Check if this is a summary row by checking if column B (item name) is empty
            Cell itemNameCell = row.getCell(1);
            if (itemNameCell == null || itemNameCell.getCellType() == CellType.BLANK) {
                // This is likely the summary row or empty row, stop parsing
                break;
            }

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
            // Column A: # (Row number) - Skip this

            // Column B: Item Name
            Cell itemNameCell = row.getCell(1);
            if (itemNameCell == null || itemNameCell.getCellType() == CellType.BLANK) {
                importRow.setValid(false);
                importRow.setErrorMessage("Item name is required");
                return importRow;
            }
            String itemName = getCellValueAsString(itemNameCell);
            importRow.setItemName(itemName);

            // Column C: Measuring Unit
            Cell unitCell = row.getCell(2);
            String measuringUnit = unitCell != null ? getCellValueAsString(unitCell) : "";
            importRow.setMeasuringUnit(measuringUnit);

            // Column D: Requested Quantity (READ this for display)
            Cell requestedQtyCell = row.getCell(3);
            Double requestedQuantity = null;
            if (requestedQtyCell != null) {
                try {
                    requestedQuantity = getNumericCellValue(requestedQtyCell);
                } catch (Exception e) {
                    // Ignore errors for requested quantity since it's just for display
                }
            }
            importRow.setRequestedQuantity(requestedQuantity);

            // Column E: Response Quantity
            Cell responseQtyCell = row.getCell(4);
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

            // Column F: Currency
            Cell currencyCell = row.getCell(5);
            String currency = "EGP"; // Default
            if (currencyCell != null) {
                currency = getCellValueAsString(currencyCell).toUpperCase();
                // Validate currency
                if (!isValidCurrency(currency)) {
                    importRow.setValid(false);
                    importRow.setErrorMessage("Invalid currency: " + currency);
                    return importRow;
                }
            }
            importRow.setCurrency(currency);

            // Column G: Unit Price
            Cell unitPriceCell = row.getCell(6);
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

            // Column H: Total Price (can be formula or value)
            Cell totalPriceCell = row.getCell(7);
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

            // Column I: Delivery Days
            Cell deliveryDaysCell = row.getCell(8);
            Integer deliveryDays = null;
            if (deliveryDaysCell != null) {
                double deliveryValue = getNumericCellValue(deliveryDaysCell);
                if (deliveryValue > 0) {
                    deliveryDays = (int) deliveryValue;
                }
            }
            importRow.setEstimatedDeliveryDays(deliveryDays);

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

    private boolean isValidCurrency(String currency) {
        String[] validCurrencies = {"EGP", "USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "INR", "SGD"};
        for (String valid : validCurrencies) {
            if (valid.equals(currency)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Helper methods
     */
    private String[] getHeaders(boolean isArabic) {
        if (isArabic) {
            return new String[]{
                    "#",                    // Number
                    "اسم الصنف",           // Item Name
                    "وحدة القياس",         // Measuring Unit
                    "الكمية المطلوبة",     // Requested Quantity
                    "كمية الاستجابة",      // Response Quantity
                    "العملة",              // Currency
                    "سعر الوحدة",         // Unit Price
                    "السعر الإجمالي",     // Total Price
                    "أيام التسليم"        // Delivery Days
            };
        } else {
            return new String[]{
                    "#",                    // Number
                    "Item Name",
                    "Measuring Unit",
                    "Requested Quantity",
                    "Response Quantity",
                    "Currency",
                    "Unit Price",
                    "Total Price",
                    "Delivery Days"
            };
        }
    }

    private String formatNumber(double number, boolean isArabic) {
        if (isArabic) {
            // Convert to Arabic numerals
            String numStr = String.format("%.0f", number); // Handle decimals properly
            return convertToArabicNumerals(numStr);
        }
        return String.format("%.0f", number);
    }

    private void setCellValueWithArabicSupport(Cell cell, double value, boolean isArabic) {
        if (isArabic) {
            String arabicValue = convertToArabicNumerals(String.format("%.0f", value));
            cell.setCellValue(arabicValue);
        } else {
            cell.setCellValue(value);
        }
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

        // Lightest blue background (Pale Blue)
        style.setFillForegroundColor(IndexedColors.PALE_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 12);
        font.setColor(IndexedColors.BLACK.getIndex());
        style.setFont(font);

        style.setBorderBottom(BorderStyle.MEDIUM);
        style.setBorderTop(BorderStyle.MEDIUM);
        style.setBorderLeft(BorderStyle.MEDIUM);
        style.setBorderRight(BorderStyle.MEDIUM);
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

        style.setFillForegroundColor(IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);

        style.setAlignment(HorizontalAlignment.CENTER); // CENTER
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setLocked(true);

        return style;
    }
    private CellStyle createLockedStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();

        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);

        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        Font font = workbook.createFont();
        font.setBold(false);
        font.setFontHeightInPoints((short) 11);
        style.setFont(font);

        style.setLocked(true);
        style.setAlignment(HorizontalAlignment.CENTER); // CENTER
        style.setVerticalAlignment(VerticalAlignment.CENTER);

        return style;
    }

    private CellStyle createUnlockedStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();

        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);

        style.setFillForegroundColor(IndexedColors.LIGHT_YELLOW.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        Font font = workbook.createFont();
        font.setBold(false);
        font.setFontHeightInPoints((short) 11);
        style.setFont(font);

        style.setLocked(false);
        style.setAlignment(HorizontalAlignment.CENTER); // CENTER
        style.setVerticalAlignment(VerticalAlignment.CENTER);

        return style;
    }

    private CellStyle createSummaryStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();

        style.setBorderTop(BorderStyle.MEDIUM);
        style.setBorderBottom(BorderStyle.MEDIUM);
        style.setBorderLeft(BorderStyle.MEDIUM);
        style.setBorderRight(BorderStyle.MEDIUM);

        style.setFillForegroundColor(IndexedColors.LIGHT_GREEN.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 11);
        style.setFont(font);

        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setLocked(true);

        // Add number format for general numbers
        style.setDataFormat(workbook.createDataFormat().getFormat("0"));

        return style;
    }




}