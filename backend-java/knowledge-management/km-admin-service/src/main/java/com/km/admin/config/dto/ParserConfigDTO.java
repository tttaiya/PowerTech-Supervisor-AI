package com.km.admin.config.dto;

import javax.validation.constraints.Min;
import javax.validation.constraints.NotNull;

/**
 * 解析器配置 DTO（不含 API Key，仅运行时配置；Worker DynamicConfigHolder 热加载 maxConcurrentTasks）。
 */
public class ParserConfigDTO {
    private boolean paddleocrEnabled;
    @NotNull(message = "最大并发任务数不能为空")
    @Min(value = 1, message = "最大并发任务数必须大于 0")
    private Integer maxConcurrentTasks;

    @NotNull(message = "最大重试次数不能为空")
    @Min(value = 0, message = "最大重试次数不能小于 0")
    private Integer maxRetryCount;

    @NotNull(message = "任务超时时间不能为空")
    @Min(value = 1, message = "任务超时时间必须大于 0")
    private Integer timeoutSeconds;

    public boolean isPaddleocrEnabled() { return paddleocrEnabled; }
    public void setPaddleocrEnabled(boolean paddleocrEnabled) { this.paddleocrEnabled = paddleocrEnabled; }

    public Integer getMaxConcurrentTasks() {
        return maxConcurrentTasks;
    }
    public void setMaxConcurrentTasks(Integer maxConcurrentTasks) { this.maxConcurrentTasks = maxConcurrentTasks; }

    public int getMaxRetryCount() { return maxRetryCount; }
    public void setMaxRetryCount(int maxRetryCount) { this.maxRetryCount = maxRetryCount; }

    public int getTimeoutSeconds() { return timeoutSeconds; }
    public void setTimeoutSeconds(int timeoutSeconds) { this.timeoutSeconds = timeoutSeconds; }
}