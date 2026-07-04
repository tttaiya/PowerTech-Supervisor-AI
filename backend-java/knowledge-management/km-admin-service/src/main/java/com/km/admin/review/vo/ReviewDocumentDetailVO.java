package com.km.admin.review.vo;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 审核文档详情 VO。已去除 Lombok。
 */
public class ReviewDocumentDetailVO {

    private Long docId;
    private Long kbId;
    private String kbName;
    private String originalName;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Integer currentVersionNo;
    private List<String> tags;
    private Integer chunkCount;
    private List<ReviewChunkVO> chunks;

    public Long getDocId() { return docId; }
    public void setDocId(Long docId) { this.docId = docId; }

    public Long getKbId() { return kbId; }
    public void setKbId(Long kbId) { this.kbId = kbId; }

    public String getKbName() { return kbName; }
    public void setKbName(String kbName) { this.kbName = kbName; }

    public String getOriginalName() { return originalName; }
    public void setOriginalName(String originalName) { this.originalName = originalName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public Integer getCurrentVersionNo() { return currentVersionNo; }
    public void setCurrentVersionNo(Integer currentVersionNo) { this.currentVersionNo = currentVersionNo; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }

    public Integer getChunkCount() { return chunkCount; }
    public void setChunkCount(Integer chunkCount) { this.chunkCount = chunkCount; }

    public List<ReviewChunkVO> getChunks() { return chunks; }
    public void setChunks(List<ReviewChunkVO> chunks) { this.chunks = chunks; }
}
