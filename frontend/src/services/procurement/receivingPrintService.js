import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addAmiriFont } from './amiriFont';

/**
 * Calculate total received quantity for an item
 */
const calculateTotalReceived = (item) => {
    if (!item.itemReceipts || item.itemReceipts.length === 0) return 0;
    return item.itemReceipts.reduce((sum, receipt) => sum + (receipt.goodQuantity || 0), 0);
};

/**
 * Calculate total processed quantity for an item
 */
const calculateTotalProcessed = (item) => {
    if (!item.itemReceipts || item.itemReceipts.length === 0) return 0;
    return item.itemReceipts.reduce((sum, receipt) => {
        const goodQty = receipt.goodQuantity || 0;
        const closedIssuesQty = receipt.issues ? receipt.issues.reduce((issueSum, issue) => {
            if (issue.issueStatus === 'RESOLVED' && issue.resolutionType === 'REDELIVERY') {
                return issueSum;
            }
            return issueSum + (issue.affectedQuantity || 0);
        }, 0) : 0;
        return sum + goodQty + closedIssuesQty;
    }, 0);
};

/**
 * Check if item needs processing
 */
const itemNeedsProcessing = (item) => {
    const totalProcessed = calculateTotalProcessed(item);
    const remaining = item.quantity - totalProcessed;
    return remaining > 0;
};

/**
 * Convert numbers to Arabic-Indic numerals
 */
const toArabicNumerals = (num) => {
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return num.toString().split('').map(char => {
        return /\d/.test(char) ? arabicNumerals[parseInt(char)] : char;
    }).join('');
};

/**
 * Translations
 */
const translations = {
    en: {
        title: 'WAREHOUSE RECEIVING CHECKLIST',
        titleAll: 'WAREHOUSE RECEIVING LIST',
        poNumber: 'Purchase Order',
        date: 'Date',
        merchantDetails: 'Merchant Details',
        merchant: 'Merchant',
        name: 'Name',
        phone: 'Phone',
        email: 'Email',
        itemName: 'Item Name',
        category: 'Category',
        unit: 'Unit',
        ordered: 'Ordered',
        received: 'Received',
        remaining: 'Remaining',
        warehouseStaff: 'Warehouse Staff',
        deliveryDriver: 'Delivery Driver',
        signature: 'Signature',
        notes: 'Notes',
        summary: 'Summary',
        totalOrdered: 'Total Ordered',
        totalReceived: 'Total Received',
        totalRemaining: 'Total Remaining',
        preparedBy: 'Prepared By',
        totalMerchants: 'Total Merchants',
        totalUniqueItems: 'Total Unique Items',
        totalItems: 'Total Items to Receive'
    },
    ar: {
        title: 'قائمة استلام المخزن',
        titleAll: 'قائمة استلام المخزن الكاملة',
        poNumber: 'أمر الشراء',
        date: 'التاريخ',
        merchantDetails: 'تفاصيل المورد',
        merchant: 'المورد',
        name: 'الاسم',
        phone: 'الهاتف',
        email: 'البريد الإلكتروني',
        itemName: 'اسم الصنف',
        category: 'الفئة',
        unit: 'الوحدة',
        ordered: 'المطلوب',
        received: 'المستلم',
        remaining: 'المتبقي',
        warehouseStaff: 'موظف المخزن',
        deliveryDriver: 'سائق التوصيل',
        signature: 'التوقيع',
        notes: 'ملاحظات',
        summary: 'الملخص',
        totalOrdered: 'إجمالي المطلوب',
        totalReceived: 'إجمالي المستلم',
        totalRemaining: 'إجمالي المتبقي',
        preparedBy: 'أعده',
        totalMerchants: 'إجمالي الموردين',
        totalUniqueItems: 'إجمالي الأصناف',
        totalItems: 'إجمالي الأصناف للاستلام'
    }
};

/**
 * Generate PDF for a single merchant
 */
export const generateMerchantReceivingPDF = async (purchaseOrder, merchant, language = 'en') => {
    const doc = new jsPDF();
    const isRTL = language === 'ar';
    const t = translations[language];
    const formatNum = isRTL ? toArabicNumerals : (n) => n;

    // Add Arabic font if needed
    if (isRTL) {
        await addAmiriFont(doc);
        doc.setFont('Amiri');
    }

    const itemsToReceive = merchant.items.filter(item => itemNeedsProcessing(item));

    if (itemsToReceive.length === 0) {
        alert(isRTL ? 'لا توجد أصناف للاستلام من هذا المورد' : 'No items to receive from this merchant');
        return;
    }

    const dateStr = new Date().toLocaleDateString(isRTL ? 'ar-EG' : 'en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    let currentY = 20;

    // Header
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 45, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont(isRTL ? 'Amiri' : 'helvetica', 'bold');
    doc.text(t.title, 105, 20, { align: 'center' });

    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.5);
    doc.line(20, 28, 190, 28);

    doc.setFontSize(10);
    doc.setFont(isRTL ? 'Amiri' : 'helvetica', 'normal');

    // Only show date, centered
    doc.text(`${t.date}: ${dateStr}`, 105, 36, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    currentY = 55;

    // Merchant Info
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.rect(20, currentY, 170, 28, 'FD');

    doc.setFontSize(11);
    doc.setFont(isRTL ? 'Amiri' : 'helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(t.merchantDetails, isRTL ? 185 : 25, currentY + 8, { align: isRTL ? 'right' : 'left' });

    doc.setFontSize(10);
    doc.setFont(isRTL ? 'Amiri' : 'helvetica', 'normal');
    doc.setTextColor(51, 65, 85);

    if (isRTL) {
        // Name line: label on right, value on left
        doc.text(merchant.merchantName, 130, currentY + 15, { align: 'left' });
        doc.text(`: ${t.name}`, 185, currentY + 15, { align: 'right' });

        // Phone and Email on same line
        if (merchant.contactPhone) {
            doc.text(formatNum(merchant.contactPhone), 130, currentY + 21, { align: 'left' });
            doc.text(`: ${t.phone}`, 185, currentY + 21, { align: 'right' });
        }
        if (merchant.contactEmail) {
            doc.text(merchant.contactEmail, 40, currentY + 21, { align: 'left' });
            doc.text(`: ${t.email}`, 95, currentY + 21, { align: 'right' });
        }
    } else {
        doc.text(`${t.name}: ${merchant.merchantName}`, 25, currentY + 15);
        if (merchant.contactPhone) {
            doc.text(`${t.phone}: ${merchant.contactPhone}`, 25, currentY + 21);
        }
        if (merchant.contactEmail) {
            doc.text(`${t.email}: ${merchant.contactEmail}`, 120, currentY + 21);
        }
    }

    doc.setTextColor(0, 0, 0);

    // Items Table
    const tableData = itemsToReceive.map((item, index) => {
        const totalReceived = calculateTotalReceived(item);
        const totalProcessed = calculateTotalProcessed(item);
        const remaining = item.quantity - totalProcessed;

        if (isRTL) {
            return [
                formatNum(remaining),
                formatNum(totalReceived),
                formatNum(item.quantity),
                item.itemType?.measuringUnit || 'units',
                item.itemType?.itemCategoryName || '-',
                item.itemType?.name || 'Unknown',
                formatNum(index + 1)
            ];
        } else {
            return [
                (index + 1).toString(),
                item.itemType?.name || 'Unknown',
                item.itemType?.itemCategoryName || '-',
                item.itemType?.measuringUnit || 'units',
                item.quantity.toString(),
                totalReceived.toString(),
                remaining.toString()
            ];
        }
    });

    const headers = isRTL
        ? [[t.remaining, t.received, t.ordered, t.unit, t.category, t.itemName, '#']]
        : [['#', t.itemName, t.category, t.unit, t.ordered, t.received, t.remaining]];

    autoTable(doc, {
        startY: currentY + 35,
        head: headers,
        body: tableData,
        theme: 'grid',
        styles: {
            font: isRTL ? 'Amiri' : 'helvetica',
            halign: isRTL ? 'right' : 'left',
            fontStyle: 'normal'
        },
        headStyles: {
            fillColor: [200, 200, 200],
            textColor: [0, 0, 0],
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'center',
            cellPadding: 3,
            minCellHeight: 8
        },
        bodyStyles: {
            fontSize: 9,
            cellPadding: 3,
            textColor: [30, 41, 59],
            lineColor: [203, 213, 225],
            lineWidth: 0.1,
            minCellHeight: 8
        },
        columnStyles: isRTL ? {
            0: { cellWidth: 24, halign: 'center', fontStyle: 'bold', textColor: [220, 38, 38] },
            1: { cellWidth: 22, halign: 'center' },
            2: { cellWidth: 22, halign: 'center' },
            3: { cellWidth: 20, halign: 'center' },
            4: { cellWidth: 35 },
            5: { cellWidth: 55 },
            6: { cellWidth: 10, halign: 'center', fontStyle: 'bold', fillColor: [248, 250, 252] }
        } : {
            0: { cellWidth: 10, halign: 'center', fontStyle: 'bold', fillColor: [248, 250, 252] },
            1: { cellWidth: 55 },
            2: { cellWidth: 35 },
            3: { cellWidth: 20, halign: 'center' },
            4: { cellWidth: 22, halign: 'center' },
            5: { cellWidth: 22, halign: 'center' },
            6: { cellWidth: 24, halign: 'center', fontStyle: 'bold', textColor: [220, 38, 38] }
        },
        margin: { left: 20, right: 20 },
        didParseCell: (data) => {
            if (data.row.index >= 0 && data.row.index % 2 === 0) {
                data.cell.styles.fillColor = [248, 250, 252];
            }
        }
    });

    const finalY = doc.lastAutoTable.finalY + 15;
// Summary
    doc.setFillColor(241, 245, 249);
// For RTL, position the box on the right side
    if (isRTL) {
        doc.rect(110, finalY, 80, 12, 'F');
    } else {
        doc.rect(20, finalY, 80, 12, 'F');
    }

    doc.setFontSize(10);
    doc.setFont(isRTL ? 'Amiri' : 'helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`${t.totalItems}: ${formatNum(itemsToReceive.length)}`, isRTL ? 185 : 25, finalY + 8, { align: isRTL ? 'right' : 'left' });
    // Signatures
    const sigY = finalY + 25;

    doc.setFontSize(9);
    doc.setFont(isRTL ? 'Amiri' : 'helvetica', 'bold');
    doc.setTextColor(71, 85, 105);

    if (isRTL) {
        doc.text(t.deliveryDriver, 190, sigY, { align: 'right' });
        doc.text(t.warehouseStaff, 95, sigY, { align: 'right' });
    } else {
        doc.text(t.warehouseStaff, 20, sigY);
        doc.text(t.deliveryDriver, 115, sigY);
    }

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);

    if (isRTL) {
        doc.line(115, sigY + 12, 190, sigY + 12);
        doc.line(20, sigY + 12, 95, sigY + 12);
    } else {
        doc.line(20, sigY + 12, 95, sigY + 12);
        doc.line(115, sigY + 12, 190, sigY + 12);
    }

    doc.setFont(isRTL ? 'Amiri' : 'helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);

    if (isRTL) {
        doc.text(t.signature, 190, sigY + 16, { align: 'right' });
        doc.text(`${t.date}: _______________`, 190, sigY + 21, { align: 'right' });
        doc.text(t.signature, 95, sigY + 16, { align: 'right' });
        doc.text(`${t.date}: _______________`, 95, sigY + 21, { align: 'right' });
    } else {
        doc.text(t.signature, 20, sigY + 16);
        doc.text(`${t.date}: _______________`, 20, sigY + 21);
        doc.text(t.signature, 115, sigY + 16);
        doc.text(`${t.date}: _______________`, 115, sigY + 21);
    }

    // Notes
    doc.setFontSize(9);
    doc.setFont(isRTL ? 'Amiri' : 'helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(`${t.notes}:`, isRTL ? 190 : 20, sigY + 32, { align: isRTL ? 'right' : 'left' });

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    for (let i = 0; i < 3; i++) {
        doc.line(20, sigY + 37 + (i * 6), 190, sigY + 37 + (i * 6));
    }

    doc.setTextColor(0, 0, 0);

    // Save
    const filename = `Receiving_${merchant.merchantName.replace(/\s+/g, '_')}_${language}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
};

/**
 * Generate PDF for all merchants
 */
export const generateAllMerchantsReceivingPDF = async (purchaseOrder, itemsByMerchant, language = 'en') => {
    const doc = new jsPDF();
    const isRTL = language === 'ar';
    const t = translations[language];
    const formatNum = isRTL ? toArabicNumerals : (n) => n;

    // Add Arabic font if needed
    if (isRTL) {
        await addAmiriFont(doc);
        doc.setFont('Amiri');
    }

    const merchantsWithPendingItems = Object.values(itemsByMerchant).filter(merchant =>
        merchant.items.some(item => itemNeedsProcessing(item))
    );

    if (merchantsWithPendingItems.length === 0) {
        alert(isRTL ? 'لا توجد أصناف للاستلام من أي مورد' : 'No items to receive from any merchant');
        return;
    }

    const dateStr = new Date().toLocaleDateString(isRTL ? 'ar-EG' : 'en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Header
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 45, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont(isRTL ? 'Amiri' : 'helvetica', 'bold');
    doc.text(t.titleAll, 105, 20, { align: 'center' });

    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.5);
    doc.line(20, 28, 190, 28);

    doc.setFontSize(10);
    doc.setFont(isRTL ? 'Amiri' : 'helvetica', 'normal');

    // Only show date, centered
    doc.text(`${t.date}: ${dateStr}`, 105, 36, { align: 'center' });

    doc.setTextColor(0, 0, 0);

    let currentY = 55;

    // Aggregate items
    const aggregatedItems = {};

    merchantsWithPendingItems.forEach((merchant) => {
        const itemsToReceive = merchant.items.filter(item => itemNeedsProcessing(item));

        itemsToReceive.forEach(item => {
            const itemTypeId = item.itemType?.id;
            const itemTypeName = item.itemType?.name || 'Unknown';
            const measuringUnit = item.itemType?.measuringUnit || 'units';

            const totalReceived = calculateTotalReceived(item);
            const totalProcessed = calculateTotalProcessed(item);
            const remaining = item.quantity - totalProcessed;

            if (!aggregatedItems[itemTypeId]) {
                aggregatedItems[itemTypeId] = {
                    name: itemTypeName,
                    unit: measuringUnit,
                    totalOrdered: 0,
                    totalReceived: 0,
                    totalRemaining: 0
                };
            }

            aggregatedItems[itemTypeId].totalOrdered += item.quantity;
            aggregatedItems[itemTypeId].totalReceived += totalReceived;
            aggregatedItems[itemTypeId].totalRemaining += remaining;
        });
    });

    merchantsWithPendingItems.forEach((merchant) => {
        const itemsToReceive = merchant.items.filter(item => itemNeedsProcessing(item));

        if (itemsToReceive.length === 0) return;

        if (currentY > 200) {
            doc.addPage();
            currentY = 20;
        }

        // Merchant Header
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.3);
        doc.rect(20, currentY, 170, 18, 'FD');

        doc.setFontSize(11);
        doc.setFont(isRTL ? 'Amiri' : 'helvetica', 'bold');
        doc.setTextColor(30, 41, 59);

        if (isRTL) {
            doc.text(merchant.merchantName, 130, currentY + 8, { align: 'left' });
            doc.text(`: ${t.merchant}`, 185, currentY + 8, { align: 'right' });
        } else {
            doc.text(`${t.merchant}: ${merchant.merchantName}`, 25, currentY + 8);
        }

        doc.setFontSize(8);
        doc.setFont(isRTL ? 'Amiri' : 'helvetica', 'normal');
        doc.setTextColor(100, 116, 139);

        if (isRTL) {
            let contactX = 130;
            if (merchant.contactPhone) {
                doc.text(formatNum(merchant.contactPhone), contactX, currentY + 14, { align: 'left' });
                doc.text(`: ${t.phone}`, 185, currentY + 14, { align: 'right' });
                contactX = 40;
            }
            if (merchant.contactEmail) {
                doc.text(merchant.contactEmail, contactX, currentY + 14, { align: 'left' });
                const emailLabelX = merchant.contactPhone ? 95 : 185;
                doc.text(`: ${t.email}`, emailLabelX, currentY + 14, { align: 'right' });
            }
        } else {
            let contact = '';
            if (merchant.contactPhone) contact += `${t.phone}: ${formatNum(merchant.contactPhone)}`;
            if (merchant.contactEmail) contact += `  |  ${t.email}: ${merchant.contactEmail}`;

            if (contact) {
                doc.text(contact, 25, currentY + 14);
            }
        }

        doc.setTextColor(0, 0, 0);
        currentY += 22;

        // Merchant Items Table
        const merchantTableData = itemsToReceive.map((item, index) => {
            const totalReceived = calculateTotalReceived(item);
            const totalProcessed = calculateTotalProcessed(item);
            const remaining = item.quantity - totalProcessed;

            if (isRTL) {
                return [
                    formatNum(remaining),
                    formatNum(totalReceived),
                    formatNum(item.quantity),
                    item.itemType?.measuringUnit || 'units',
                    item.itemType?.itemCategoryName || '-',
                    item.itemType?.name || 'Unknown',
                    formatNum(index + 1)
                ];
            } else {
                return [
                    (index + 1).toString(),
                    item.itemType?.name || 'Unknown',
                    item.itemType?.itemCategoryName || '-',
                    item.itemType?.measuringUnit || 'units',
                    item.quantity.toString(),
                    totalReceived.toString(),
                    remaining.toString()
                ];
            }
        });

        const headers = isRTL
            ? [[t.remaining, t.received, t.ordered, t.unit, t.category, t.itemName, '#']]
            : [['#', t.itemName, t.category, t.unit, t.ordered, t.received, t.remaining]];

        autoTable(doc, {
            startY: currentY,
            head: headers,
            body: merchantTableData,
            theme: 'grid',
            styles: {
                font: isRTL ? 'Amiri' : 'helvetica',
                halign: isRTL ? 'right' : 'left',
                fontStyle: 'normal'
            },
            headStyles: {
                fillColor: [200, 200, 200],
                textColor: [0, 0, 0],
                fontSize: 8,
                fontStyle: 'bold',
                halign: 'center',
                cellPadding: 2,
                minCellHeight: 7
            },
            bodyStyles: {
                fontSize: 8,
                cellPadding: 2,
                textColor: [30, 41, 59],
                lineColor: [203, 213, 225],
                lineWidth: 0.1,
                minCellHeight: 7
            },
            columnStyles: isRTL ? {
                0: { cellWidth: 24, halign: 'center', fontStyle: 'bold', textColor: [220, 38, 38] },
                1: { cellWidth: 22, halign: 'center' },
                2: { cellWidth: 22, halign: 'center' },
                3: { cellWidth: 18, halign: 'center' },
                4: { cellWidth: 33 },
                5: { cellWidth: 55 },
                6: { cellWidth: 8, halign: 'center', fontStyle: 'bold', fillColor: [248, 250, 252] }
            } : {
                0: { cellWidth: 8, halign: 'center', fontStyle: 'bold', fillColor: [248, 250, 252] },
                1: { cellWidth: 55 },
                2: { cellWidth: 33 },
                3: { cellWidth: 18, halign: 'center' },
                4: { cellWidth: 22, halign: 'center' },
                5: { cellWidth: 22, halign: 'center' },
                6: { cellWidth: 24, halign: 'center', fontStyle: 'bold', textColor: [220, 38, 38] }
            },
            margin: { left: 20, right: 20 },
            didParseCell: (data) => {
                if (data.row.index >= 0 && data.row.index % 2 === 0) {
                    data.cell.styles.fillColor = [248, 250, 252];
                }
            }
        });

        currentY = doc.lastAutoTable.finalY + 12;
    });

    // Summary Section
    if (currentY > 180) {
        doc.addPage();
        currentY = 20;
    }

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(20, currentY, 190, currentY);
    currentY += 10;

    doc.setFillColor(241, 245, 249);
    doc.rect(20, currentY, 170, 12, 'F');

    doc.setFontSize(12);
    doc.setFont(isRTL ? 'Amiri' : 'helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(t.summary, isRTL ? 185 : 25, currentY + 8, { align: isRTL ? 'right' : 'left' });

    currentY += 15;

    // Summary Table
    const summaryTableData = Object.values(aggregatedItems).map((item, index) => {
        if (isRTL) {
            return [
                formatNum(item.totalRemaining),
                formatNum(item.totalReceived),
                formatNum(item.totalOrdered),
                item.unit,
                item.name,
                formatNum(index + 1)
            ];
        } else {
            return [
                (index + 1).toString(),
                item.name,
                item.unit,
                item.totalOrdered.toString(),
                item.totalReceived.toString(),
                item.totalRemaining.toString()
            ];
        }
    });

    const summaryHeaders = isRTL
        ? [[t.totalRemaining, t.totalReceived, t.totalOrdered, t.unit, t.itemName, '#']]
        : [['#', t.itemName, t.unit, t.totalOrdered, t.totalReceived, t.totalRemaining]];

    autoTable(doc, {
        startY: currentY,
        head: summaryHeaders,
        body: summaryTableData,
        theme: 'grid',
        styles: {
            font: isRTL ? 'Amiri' : 'helvetica',
            halign: isRTL ? 'right' : 'left',
            fontStyle: 'normal'
        },
        headStyles: {
            fillColor: [200, 200, 200],
            textColor: [0, 0, 0],
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'center',
            cellPadding: 3,
            minCellHeight: 8
        },
        bodyStyles: {
            fontSize: 9,
            cellPadding: 3,
            textColor: [30, 41, 59],
            lineColor: [203, 213, 225],
            lineWidth: 0.1,
            minCellHeight: 8
        },
        columnStyles: isRTL ? {
            0: { cellWidth: 30, halign: 'center', fontStyle: 'bold', textColor: [220, 38, 38] },
            1: { cellWidth: 28, halign: 'center' },
            2: { cellWidth: 28, halign: 'center' },
            3: { cellWidth: 20, halign: 'center' },
            4: { cellWidth: 65 },
            5: { cellWidth: 10, halign: 'center', fontStyle: 'bold', fillColor: [248, 250, 252] }
        } : {
            0: { cellWidth: 10, halign: 'center', fontStyle: 'bold', fillColor: [248, 250, 252] },
            1: { cellWidth: 65 },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 28, halign: 'center' },
            4: { cellWidth: 28, halign: 'center' },
            5: { cellWidth: 30, halign: 'center', fontStyle: 'bold', textColor: [220, 38, 38] }
        },
        margin: { left: 20, right: 20 },
        didParseCell: (data) => {
            if (data.row.index >= 0 && data.row.index % 2 === 0) {
                data.cell.styles.fillColor = [248, 250, 252];
            }
        }
    });

    currentY = doc.lastAutoTable.finalY + 10;

    // Totals
    doc.setFillColor(241, 245, 249);
    doc.rect(20, currentY, 170, 12, 'F');

    doc.setFontSize(10);
    doc.setFont(isRTL ? 'Amiri' : 'helvetica', 'bold');
    doc.setTextColor(30, 41, 59);

    if (isRTL) {
        doc.text(`${t.totalUniqueItems}: ${formatNum(Object.keys(aggregatedItems).length)}`, 185, currentY + 8, { align: 'right' });
        doc.text(`${t.totalMerchants}: ${formatNum(merchantsWithPendingItems.length)}`, 90, currentY + 8, { align: 'right' });
    } else {
        doc.text(`${t.totalMerchants}: ${merchantsWithPendingItems.length}`, 25, currentY + 8);
        doc.text(`${t.totalUniqueItems}: ${Object.keys(aggregatedItems).length}`, 100, currentY + 8);
    }

    currentY += 20;

    // Signature
    doc.setFontSize(9);
    doc.setFont(isRTL ? 'Amiri' : 'helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(t.preparedBy, isRTL ? 190 : 20, currentY, { align: isRTL ? 'right' : 'left' });

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);

    if (isRTL) {
        doc.line(110, currentY + 10, 190, currentY + 10);
    } else {
        doc.line(20, currentY + 10, 100, currentY + 10);
    }

    doc.setFont(isRTL ? 'Amiri' : 'helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(t.signature, isRTL ? 190 : 20, currentY + 14, { align: isRTL ? 'right' : 'left' });
    doc.text(`${t.date}: _______________`, isRTL ? 190 : 20, currentY + 19, { align: isRTL ? 'right' : 'left' });

    doc.setTextColor(0, 0, 0);

    // Save
    const filename = `Receiving_All_Merchants_${language}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
};