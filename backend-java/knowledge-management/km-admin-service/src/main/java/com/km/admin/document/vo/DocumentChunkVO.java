package com.km.admin.document.vo;

import java.io.Serializable;

public class DocumentChunkVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private Integer chunkIndex;
    private String chapterPath;
    private Integer pageNo;
    private String chunkType;
    private String content;
    private Integer charCount;
    private String vectorId;
    private String vectorStatus;
    private Integer isEdited;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Integer getChunkIndex() { return chunkIndex; }
    public void setChunkIndex(Integer chunkIndex) { this.chunkIndex = chunkIndex; }

    public String getChapterPath() { return chapterPath; }
    public void setChapterPath(String chapterPath) { this.chapterPath = chapterPath; }

    public Integer getPageNo() { return pageNo; }
    public void setPageNo(Integer pageNo) { this.pageNo = pageNo; }

    public String getChunkType() { return chunkType; }
    public void setChunkType(String chunkType) { this.chunkType = chunkType; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public Integer getCharCount() { return charCount; }
    public void setCharCount(Integer charCount) { this.charCount = charCount; }

    public String getVectorId() { return vectorId; }
    public void setVectorId(String vectorId) { this.vectorId = vectorId; }

    public String getVectorStatus() { return vectorStatus; }
    public void setVectorStatus(String vectorStatus) { this.vectorStatus = vectorStatus; }

    public Integer getIsEdited() { return isEdited; }
    public void setIsEdited(Integer isEdited) { this.isEdited = isEdited; }
}
