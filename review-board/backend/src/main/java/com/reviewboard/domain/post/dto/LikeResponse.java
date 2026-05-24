package com.reviewboard.domain.post.dto;

/**
 * いいね操作後の状態。フロントのボタン表示（押下状態＋件数）を即時更新するために返す。
 */
public record LikeResponse(int likeCount, boolean liked) {
}
