package com.coffee.domain.ordering.service;

import com.coffee.domain.master.entity.Packaging;
import com.coffee.domain.master.entity.Supplier;
import com.coffee.domain.master.repository.ItemRepository;
import com.coffee.domain.master.repository.PackagingRepository;
import com.coffee.domain.ordering.entity.OrderLine;
import com.coffee.domain.ordering.entity.OrderPlan;
import com.coffee.domain.org.entity.Store;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PdfGeneratorService {

    private final PackagingRepository packagingRepository;
    private final ItemRepository itemRepository;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public byte[] generateOrderPdf(OrderPlan plan, List<OrderLine> lines, Supplier supplier, Store store) {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            PDType1Font fontBold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDType1Font fontRegular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

            float pageWidth = page.getMediaBox().getWidth();
            float margin = 50;
            float yStart = page.getMediaBox().getHeight() - margin;
            float y = yStart;

            try (PDPageContentStream cs = new PDPageContentStream(document, page)) {

                // --- Header ---
                cs.beginText();
                cs.setFont(fontBold, 20);
                cs.newLineAtOffset(margin, y);
                cs.showText("Purchase Order");
                cs.endText();
                y -= 28;

                cs.beginText();
                cs.setFont(fontRegular, 11);
                cs.newLineAtOffset(margin, y);
                cs.showText("Order #" + plan.getId() + "  |  Date: " + plan.getCreatedAt().format(DATE_FMT));
                cs.endText();
                y -= 16;

                cs.beginText();
                cs.setFont(fontRegular, 11);
                cs.newLineAtOffset(margin, y);
                cs.showText("Status: " + plan.getStatus().name());
                cs.endText();
                y -= 30;

                // --- Supplier Info ---
                cs.beginText();
                cs.setFont(fontBold, 13);
                cs.newLineAtOffset(margin, y);
                cs.showText("Supplier");
                cs.endText();
                y -= 18;

                cs.beginText();
                cs.setFont(fontRegular, 11);
                cs.newLineAtOffset(margin, y);
                cs.showText("Name: " + supplier.getName());
                cs.endText();
                y -= 15;

                if (supplier.getEmail() != null) {
                    cs.beginText();
                    cs.setFont(fontRegular, 11);
                    cs.newLineAtOffset(margin, y);
                    cs.showText("Email: " + supplier.getEmail());
                    cs.endText();
                    y -= 15;
                }

                y -= 10;

                // --- Store Info ---
                cs.beginText();
                cs.setFont(fontBold, 13);
                cs.newLineAtOffset(margin, y);
                cs.showText("Store");
                cs.endText();
                y -= 18;

                cs.beginText();
                cs.setFont(fontRegular, 11);
                cs.newLineAtOffset(margin, y);
                cs.showText("Name: " + store.getName());
                cs.endText();
                y -= 30;

                // --- Table Header ---
                float col1 = margin;
                float col2 = margin + 40;
                float col3 = margin + 250;
                float col4 = margin + 400;

                cs.beginText();
                cs.setFont(fontBold, 11);
                cs.newLineAtOffset(col1, y);
                cs.showText("#");
                cs.endText();

                cs.beginText();
                cs.setFont(fontBold, 11);
                cs.newLineAtOffset(col2, y);
                cs.showText("Item Name");
                cs.endText();

                cs.beginText();
                cs.setFont(fontBold, 11);
                cs.newLineAtOffset(col3, y);
                cs.showText("Pack Name");
                cs.endText();

                cs.beginText();
                cs.setFont(fontBold, 11);
                cs.newLineAtOffset(col4, y);
                cs.showText("Qty");
                cs.endText();

                y -= 5;

                // Horizontal line under header
                cs.moveTo(margin, y);
                cs.lineTo(pageWidth - margin, y);
                cs.stroke();
                y -= 15;

                // --- Table Rows ---
                int rowNum = 1;
                for (OrderLine line : lines) {
                    String itemName = "Unknown";
                    String packName = "Unknown";

                    Packaging pkg = packagingRepository.findById(line.getPackagingId()).orElse(null);
                    if (pkg != null) {
                        packName = pkg.getPackName();
                        itemName = itemRepository.findById(pkg.getItemId())
                                .map(item -> item.getName())
                                .orElse("Unknown");
                    }

                    cs.beginText();
                    cs.setFont(fontRegular, 10);
                    cs.newLineAtOffset(col1, y);
                    cs.showText(String.valueOf(rowNum++));
                    cs.endText();

                    cs.beginText();
                    cs.setFont(fontRegular, 10);
                    cs.newLineAtOffset(col2, y);
                    cs.showText(itemName);
                    cs.endText();

                    cs.beginText();
                    cs.setFont(fontRegular, 10);
                    cs.newLineAtOffset(col3, y);
                    cs.showText(packName);
                    cs.endText();

                    cs.beginText();
                    cs.setFont(fontRegular, 10);
                    cs.newLineAtOffset(col4, y);
                    cs.showText(String.valueOf(line.getPackQty()));
                    cs.endText();

                    y -= 18;

                    // Add a new page if needed
                    if (y < margin + 50) {
                        // Simplified: in production you'd add a new page
                        break;
                    }
                }

                // --- Footer ---
                y -= 20;
                cs.moveTo(margin, y);
                cs.lineTo(pageWidth - margin, y);
                cs.stroke();
                y -= 18;

                cs.beginText();
                cs.setFont(fontRegular, 9);
                cs.newLineAtOffset(margin, y);
                cs.showText("Generated by Coffee Inventory System  |  " + plan.getCreatedAt().format(DATE_FMT));
                cs.endText();
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            document.save(out);
            return out.toByteArray();

        } catch (IOException e) {
            throw new RuntimeException("Failed to generate PDF", e);
        }
    }
}
