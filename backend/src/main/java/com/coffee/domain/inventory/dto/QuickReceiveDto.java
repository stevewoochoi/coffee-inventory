package com.coffee.domain.inventory.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

public class QuickReceiveDto {

    @Getter
    @Setter
    public static class QuickConfirmRequest {
        private List<ReceiveLine> lines;
        private String note;
    }

    @Getter
    @Setter
    public static class ReceiveLine {
        private Long packagingId;
        private Integer receivedQty;
        private LocalDate expDate;
    }
}
