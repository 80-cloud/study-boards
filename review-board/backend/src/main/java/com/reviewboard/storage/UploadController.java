package com.reviewboard.storage;

import com.reviewboard.common.InvalidRequestException;
import com.reviewboard.domain.auth.AuthPrincipal;
import com.reviewboard.storage.dto.UploadResponse;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * 成果物スクショのアップロード（★SEC-8）。認証必須（SecurityConfig の anyRequest().authenticated()）。
 *
 * <p>返す key を投稿の screenshotKey に渡す二段構え（アップロード→投稿保存）。
 * 検証（magic byte・サイズ・隔離保存）は {@link StorageService} に集約する。
 */
@RestController
@RequestMapping("/api/uploads")
public class UploadController {

    private final StorageService storageService;

    public UploadController(StorageService storageService) {
        this.storageService = storageService;
    }

    @PostMapping("/screenshot")
    public UploadResponse uploadScreenshot(@AuthenticationPrincipal AuthPrincipal principal,
                                           @RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidRequestException("ファイルが指定されていません");
        }
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new InvalidRequestException("ファイルの読み込みに失敗しました");
        }
        String key = storageService.uploadScreenshot(bytes, principal);
        return new UploadResponse(key, storageService.presignedGetUrl(key));
    }
}
