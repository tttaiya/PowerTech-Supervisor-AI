package com.km.report.controller;

import com.km.report.common.result.ApiResult;
import com.km.report.dto.AiConfigVO;
import com.km.report.entity.ReportSystemConfig;
import com.km.report.service.ReportAiService;
import com.km.report.service.ReportSystemConfigService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/reports/ai")
public class ReportAiConfigController {

    @Resource
    private ReportSystemConfigService reportSystemConfigService;
    @Resource
    private ReportAiService reportAiService;
    @Value("${report.llm.base-url:${REPORT_LLM_BASE_URL:}}")
    private String configuredBaseUrl;
    @Value("${report.llm.model:${REPORT_LLM_MODEL:gpt-4o-mini}}")
    private String configuredModel;
    @Value("${report.llm.api-key:${REPORT_LLM_API_KEY:}}")
    private String configuredApiKey;

    @GetMapping("/config")
    public ApiResult<AiConfigVO> getConfig() {
        AiConfigVO vo = new AiConfigVO();
        vo.setEnabled(reportAiService.enabled());
        vo.setBaseUrl(firstText(reportSystemConfigService.getValueByKey("report.llm.base-url", ""), configuredBaseUrl));
        vo.setModel(firstText(reportSystemConfigService.getValueByKey("report.llm.model", ""), configuredModel, "gpt-4o-mini"));
        String apiKey = firstText(reportSystemConfigService.getValueByKey("report.llm.api-key", ""), configuredApiKey);
        vo.setApiKeyMasked(mask(apiKey));
        return ApiResult.ok(vo);
    }

    @PutMapping("/config")
    public ApiResult<Boolean> updateConfig(@RequestBody AiConfigVO vo) {
        save("report.llm.enabled", Boolean.TRUE.equals(vo.getEnabled()) ? "1" : "0", "AI", "AI总开关");
        save("report.llm.base-url", vo.getBaseUrl(), "AI", "AI基础地址");
        save("report.llm.model", vo.getModel(), "AI", "AI模型");
        if (vo.getApiKey() != null && vo.getApiKey().trim().length() > 0) {
            save("report.llm.api-key", vo.getApiKey(), "AI", "AI密钥");
        }
        return ApiResult.ok(true);
    }

    private void save(String key, String value, String type, String description) {
        ReportSystemConfig config = reportSystemConfigService.lambdaQuery().eq(ReportSystemConfig::getConfigKey, key).oneOpt().orElse(null);
        if (config == null) {
            config = new ReportSystemConfig();
            config.setConfigKey(key);
            config.setConfigType(type);
            config.setDescription(description);
            config.setEditable(1);
            config.setDeleted(0);
            config.setCreateTime(LocalDateTime.now());
        }
        config.setConfigValue(value == null ? "" : value);
        config.setUpdateTime(LocalDateTime.now());
        reportSystemConfigService.saveOrUpdate(config);
    }

    private String mask(String apiKey) {
        if (apiKey == null || apiKey.length() <= 8) {
            return apiKey == null ? "" : "***";
        }
        return apiKey.substring(0, 4) + "***" + apiKey.substring(apiKey.length() - 4);
    }

    private String firstText(String... values) {
        if (values == null) {
            return "";
        }
        for (String value : values) {
            if (value != null && value.trim().length() > 0) {
                return value.trim();
            }
        }
        return "";
    }
}
