package com.km.admin.config.dto;

import javax.validation.constraints.DecimalMax;
import javax.validation.constraints.DecimalMin;
import javax.validation.constraints.Min;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Pattern;

/**
 * 重排序配置 DTO（API Key 默认掩码返回）。
 */
public class RerankConfigDTO {
    @NotBlank(message = "重排序模型名称不能为空")
    private String model;

    @NotBlank(message = "重排序模型 API 地址不能为空")
    @Pattern(regexp = "^https?://\\S+$", message = "重排序模型 API 地址必须以 http:// 或 https:// 开头")
    private String apiBase;

    // 允许不传，表示保留旧密钥
    private String apiKey;

    @NotNull(message = "Top N 不能为空")
    @Min(value = 1, message = "Top N 必须大于 0")
    private Integer topN;

    @NotNull(message = "重排序阈值不能为空")
    @DecimalMin(value = "0.0", inclusive = true, message = "重排序阈值不能小于 0")
    @DecimalMax(value = "1.0", inclusive = true, message = "重排序阈值不能大于 1")
    private Double threshold;

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }

    public String getApiBase() { return apiBase; }
    public void setApiBase(String apiBase) { this.apiBase = apiBase; }

    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }

    public Integer getTopN() { return topN; }
    public void setTopN(Integer topN) { this.topN = topN; }

    public Double getThreshold() { return threshold; }
    public void setThreshold(Double threshold) { this.threshold = threshold; }
}