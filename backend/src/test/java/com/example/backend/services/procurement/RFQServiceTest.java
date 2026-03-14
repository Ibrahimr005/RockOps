package com.example.backend.services.procurement;

import com.example.backend.dto.procurement.RFQExportRequest;
import com.example.backend.models.procurement.Offer.Offer;
import com.example.backend.models.procurement.Offer.OfferRequestItem;
import com.example.backend.models.procurement.RequestOrder.RequestOrder;
import com.example.backend.models.procurement.RequestOrder.RequestOrderItem;
import com.example.backend.models.warehouse.ItemType;
import com.example.backend.models.warehouse.MeasuringUnit;
import com.example.backend.repositories.procurement.OfferRepository;
import com.example.backend.repositories.procurement.OfferRequestItemRepository;
import com.example.backend.repositories.warehouse.ItemTypeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class RFQServiceTest {

    @Mock
    private OfferRepository offerRepository;

    @Mock
    private OfferRequestItemRepository offerRequestItemRepository;

    @Mock
    private ItemTypeRepository itemTypeRepository;

    @InjectMocks
    private RFQService rfqService;

    // ==================== exportRFQ ====================

    @Test
    public void exportRFQ_english_shouldGenerateExcel() throws IOException {
        RFQExportRequest request = new RFQExportRequest();
        request.setLanguage("en");

        RFQExportRequest.RFQItemSelection item = new RFQExportRequest.RFQItemSelection();
        item.setItemTypeName("Cement");
        item.setMeasuringUnit("Ton");
        item.setRequestedQuantity(100.0);

        request.setItems(List.of(item));

        byte[] result = rfqService.exportRFQ(request);

        assertNotNull(result);
        assertTrue(result.length > 0);
    }

    @Test
    public void exportRFQ_arabic_shouldGenerateExcelRTL() throws IOException {
        RFQExportRequest request = new RFQExportRequest();
        request.setLanguage("ar");

        RFQExportRequest.RFQItemSelection item = new RFQExportRequest.RFQItemSelection();
        item.setItemTypeName("اسمنت");
        item.setMeasuringUnit("طن");
        item.setRequestedQuantity(50.0);

        request.setItems(List.of(item));

        byte[] result = rfqService.exportRFQ(request);

        assertNotNull(result);
        assertTrue(result.length > 0);
    }

    @Test
    public void exportRFQ_multipleItems_shouldGenerateExcel() throws IOException {
        RFQExportRequest request = new RFQExportRequest();
        request.setLanguage("en");

        RFQExportRequest.RFQItemSelection item1 = new RFQExportRequest.RFQItemSelection();
        item1.setItemTypeName("Cement");
        item1.setMeasuringUnit("Ton");
        item1.setRequestedQuantity(100.0);

        RFQExportRequest.RFQItemSelection item2 = new RFQExportRequest.RFQItemSelection();
        item2.setItemTypeName("Steel");
        item2.setMeasuringUnit("Kg");
        item2.setRequestedQuantity(500.0);

        request.setItems(List.of(item1, item2));

        byte[] result = rfqService.exportRFQ(request);

        assertNotNull(result);
        assertTrue(result.length > 0);
    }

    @Test
    public void exportRFQ_singleItem_shouldGenerateExcel() throws IOException {
        RFQExportRequest request = new RFQExportRequest();
        request.setLanguage("en");

        RFQExportRequest.RFQItemSelection item = new RFQExportRequest.RFQItemSelection();
        item.setItemTypeName("Steel");
        item.setMeasuringUnit("Kg");
        item.setRequestedQuantity(200.0);

        request.setItems(List.of(item));

        byte[] result = rfqService.exportRFQ(request);

        assertNotNull(result);
        assertTrue(result.length > 0);
    }

    // ==================== importAndPreviewRFQ ====================

    @Test
    public void importAndPreviewRFQ_offerNotFound_shouldThrow() {
        UUID offerId = UUID.randomUUID();
        when(offerRepository.findById(offerId)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> rfqService.importAndPreviewRFQ(offerId, null));
    }
}