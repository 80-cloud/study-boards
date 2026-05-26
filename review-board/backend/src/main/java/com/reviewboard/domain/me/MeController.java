package com.reviewboard.domain.me;

import com.reviewboard.domain.auth.AuthCookies;
import com.reviewboard.domain.auth.AuthPrincipal;
import com.reviewboard.domain.me.dto.MyDataExportResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 自分自身のデータに対する操作（#261/#263）。常に認証済み principal のデータのみ（本人限定）。
 */
@RestController
@RequestMapping("/api/me")
public class MeController {

    private final DataExportService dataExportService;
    private final AccountService accountService;
    private final AuthCookies cookies;

    public MeController(DataExportService dataExportService, AccountService accountService, AuthCookies cookies) {
        this.dataExportService = dataExportService;
        this.accountService = accountService;
        this.cookies = cookies;
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

    /** 退会（#263・論理削除＋匿名化）。本人のみ。成功後は認証 Cookie を消してログアウト状態にする。 */
    @DeleteMapping
    public ResponseEntity<Void> deleteMe(@AuthenticationPrincipal AuthPrincipal principal) {
        accountService.deleteSelf(principal);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cookies.clearAccess().toString())
                .header(HttpHeaders.SET_COOKIE, cookies.clearRefresh().toString())
                .build();
    }
}
