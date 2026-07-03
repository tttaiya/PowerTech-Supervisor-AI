package com.km.admin.config.dto;

import javax.validation.constraints.Min;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Pattern;

/**
 * 嵌入配置 DTO（API Key 默认掩码返回，前端必须用 ****** 回传表示不修改）。
 */
public class EmbeddingConfigDTO {
    @NotBlank(message = "嵌入模型名称不能为空")
    private String model;

    @NotBlank(message = "嵌入模型 API 地址不能为空")
    @Pattern(regexp = "^https?://\\S+$", message = "嵌入模型 API 地址必须以 http:// 或 https:// 开头")
    private String apiBase;

    // apiKey 不加 @NotBlank：允许不传，表示保留旧密钥
    private String apiKey;

    @NotNull(message = "向量维度不能为空")
    @Min(value = 1, message = "向量维度必须大于 0")
    private Integer dimension;

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }

    public String getApiBase() { return apiBase; }
    public void setApiBase(String apiBase) { this.apiBase = apiBase; }

    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }

    public Integer getDimension() { return dimension; }
    public void setDimension(Integer dimension) { this.dimension = dimension; }
}