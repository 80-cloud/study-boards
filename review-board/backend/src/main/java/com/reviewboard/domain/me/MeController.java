package com.reviewboard.domain.me;

import com.reviewboard.domain.auth.AuthPrincipal;
import com.reviewboard.domain.me.dto.MyDataExportResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 自分自身のデータに対する操作（#261）。常に認証済み principal のデータのみ（本人限定）。
 */
@RestController
@RequestMapping("/api/me")
public class MeController {

    private final DataExportService dataExportService;

    public MeController(DataExportService dataExportService) {
        this.dataExportService = dataExportService;
    }

    /** 自分のデータ（プロフィール・投稿・レビュー）を JSON で返す（ダウンロード）。 */
    @GetMapping("/export")
    public ResponseEntity<MyDataExportResponse> export(@AuthenticationPrincipal AuthPrincipal principal) {
        MyDataExportResponse body = dataExportService.export(principal.userId());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"my-data.json\"")
                .contentType(MediaType.APPLICATION_JSON)
                .body(body);
    }
}
