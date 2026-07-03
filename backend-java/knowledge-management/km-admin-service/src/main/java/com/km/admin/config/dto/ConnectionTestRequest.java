package com.km.admin.config.dto;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Pattern;

/**
 * 连接测试请求 DTO（前端"测试连接"按钮用）。
 */
public class ConnectionTestRequest {
    @NotBlank(message = "API 地址不能为空")
    @Pattern(regexp = "^https?://\\S+$", message = "API 地址必须以 http:// 或 https:// 开头")
    private String apiBase;
    private String apiKey;
    private String model;

    public String getApiBase() { return apiBase; }
    public void setApiBase(String apiBase) { this.apiBase = apiBase; }

    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
}