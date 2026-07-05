package com.km.admin.knowledgebase.vo;

/**
 * 供智能问答模块选择正式知识库的精简视图。
 */
public class SelectableKnowledgeBaseVO {

    private String id;
    private String name;
    private String description;
    private String documentType;
    private Integer documentCount;
    private Integer readyDocumentCount;
    private Boolean enabled;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getDocumentType() {
        return documentType;
    }

    public void setDocumentType(String documentType) {
        this.documentType = documentType;
    }

    public Integer getDocumentCount() {
        return documentCount;
    }

    public void setDocumentCount(Integer documentCount) {
        this.documentCount = documentCount;
    }

    public Integer getReadyDocumentCount() {
        return readyDocumentCount;
    }

    public void setReadyDocumentCount(Integer readyDocumentCount) {
        this.readyDocumentCount = readyDocumentCount;
    }

    public Boolean getEnabled() {
        return enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }
}
