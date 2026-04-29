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
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PdfGeneratorService {

    private final PackagingRepository packagingRepository;
    private final ItemRepository itemRepository;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private String safe(String s) {
        return s != null ? s : "N/A";
    }

    public byte[] generateOrderPdf(OrderPlan plan, List<OrderLine> lines, Supplier supplier, Store store) {
        if (lines == null) lines = List.of();
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            // CJK-capable font (Japanese/Korean/English)
            PDFont fontBold;
            PDFont fontRegular;
            try {
                InputStream boldStream = new ClassPathResource("fonts/NotoSansJP-Bold.ttf").getInputStream();
                InputStream regularStream = new ClassPathResource("fonts/NotoSansJP-Regular.ttf").getInputStream();
                fontBold = PDType0Font.load(document, boldStream);
                fontRegular = PDType0Font.load(document, regularStream);
            } catch (IOException e) {
                throw new RuntimeException("Font loading failed", e);
            }

            float pageWidth = page.getMediaBox().getWidth();
            float margin = 50;
            float y = page.getMediaBox().getHeight() - margin;

            try (PDPageContentStream cs = new PDPageContentStream(document, page)) {

                // Header
                drawText(cs, fontBold, 18, margin, y, "発注書 / Purchase Order");
                y -= 26;
                drawText(cs, fontRegular, 10, margin, y,
                        "注文番号: #" + plan.getId() + "  |  日付: " + (plan.getCreatedAt() != null ? plan.getCreatedAt().format(DATE_FMT) : "-"));
                y -= 14;
                drawText(cs, fontRegular, 10, margin, y, "状態: " + plan.getStatus().name());
                if (plan.getDeliveryDate() != null) {
                    drawText(cs, fontRegular, 10, margin + 200, y, "納品日: " + plan.getDeliveryDate());
                }
                y -= 28;

                // Supplier
                drawText(cs, fontBold, 12, margin, y, "仕入先 / Supplier");
                y -= 16;
                drawText(cs, fontRegular, 10, margin, y, safe(supplier.getName()));
                if (supplier.getEmail() != null && !"-".equals(supplier.getEmail())) {
                    drawText(cs, fontRegular, 9, margin + 200, y, supplier.getEmail());
                }
                y -= 12;
                if (supplier.getPhone() != null) {
                    drawText(cs, fontRegular, 9, margin, y, "TEL: " + supplier.getPhone());
                    y -= 12;
                }
                y -= 10;

                // Store
                drawText(cs, fontBold, 12, margin, y, "店舗 / Store");
                y -= 16;
                drawText(cs, fontRegular, 10, margin, y, safe(store.getName()));
                y -= 28;

                // Table header
                float col1 = margin;
                float col2 = margin + 30;
                float col3 = margin + 230;
                float col4 = margin + 410;
                float col5 = margin + 460;

                drawText(cs, fontBold, 9, col1, y, "#");
                drawText(cs, fontBold, 9, col2, y, "品名 / Item");
                drawText(cs, fontBold, 9, col3, y, "包装 / Pack");
                drawText(cs, fontBold, 9, col4, y, "数量");
                drawText(cs, fontBold, 9, col5, y, "Qty");
                y -= 4;

                cs.moveTo(margin, y);
                cs.lineTo(pageWidth - margin, y);
                cs.stroke();
                y -= 14;

                // Table rows
                int rowNum = 1;
                for (OrderLine line : lines) {
                    String itemName = "Unknown";
                    String packName = "-";

                    Packaging pkg = packagingRepository.findById(line.getPackagingId()).orElse(null);
                    if (pkg != null) {
                        packName = safe(pkg.getPackName());
                        itemName = itemRepository.findById(pkg.getItemId())
                                .map(item -> safe(item.getName()))
                                .orElse("Unknown");
                    }

                    drawText(cs, fontRegular, 9, col1, y, String.valueOf(rowNum++));
                    drawText(cs, fontRegular, 9, col2, y, truncate(itemName, 28));
                    drawText(cs, fontRegular, 9, col3, y, truncate(packName, 24));
                    drawText(cs, fontRegular, 9, col4, y, String.valueOf(line.getPackQty()));
                    y -= 16;

                    if (y < margin + 60) {
                        // New page
                        cs.close();
                        PDPage newPage = new PDPage(PDRectangle.A4);
                        document.addPage(newPage);
                        y = newPage.getMediaBox().getHeight() - margin;
                        // Note: simplified - would need new PDPageContentStream
                        break;
                    }
                }

                // Footer
                y -= 16;
                cs.moveTo(margin, y);
                cs.lineTo(pageWidth - margin, y);
                cs.stroke();
                y -= 14;
                drawText(cs, fontRegular, 8, margin, y,
                        "Coffee Inventory System  |  " + (plan.getCreatedAt() != null ? plan.getCreatedAt().format(DATE_FMT) : "-"));
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            document.save(out);
            return out.toByteArray();

        } catch (IOException e) {
            throw new RuntimeException("Failed to generate PDF", e);
        }
    }

    private void drawText(PDPageContentStream cs, PDFont font, float size, float x, float y, String text) throws IOException {
        cs.beginText();
        cs.setFont(font, size);
        cs.newLineAtOffset(x, y);
        cs.showText(text);
        cs.endText();
    }

    private String truncate(String s, int max) {
        if (s == null) return "-";
        return s.length() > max ? s.substring(0, max) + "..." : s;
    }
}
