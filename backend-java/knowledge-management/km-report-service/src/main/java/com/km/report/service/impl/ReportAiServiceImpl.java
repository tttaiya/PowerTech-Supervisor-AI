package com.km.report.service.impl;

import com.km.report.common.exception.BizException;
import com.km.report.dto.AiGenerateRequest;
import com.km.report.dto.AiGenerateResponse;
import com.km.report.entity.ReportAiCallLog;
import com.km.report.service.ReportAiCallLogService;
import com.km.report.service.ReportAiService;
import com.km.report.service.ReportSystemConfigService;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ReportAiServiceImpl implements ReportAiService {

    @Resource
    private ReportSystemConfigService reportSystemConfigService;
    @Resource
    private ReportAiCallLogService reportAiCallLogService;

    @Value("${report.llm.api-key:${REPORT_LLM_API_KEY:}}")
    private String configuredApiKey;
    @Value("${report.llm.enabled:${REPORT_LLM_ENABLED:false}}")
    private String configuredEnabled;
    @Value("${report.llm.base-url:${REPORT_LLM_BASE_URL:}}")
    private String configuredBaseUrl;
    @Value("${report.llm.model:${REPORT_LLM_MODEL:}}")
    private String configuredModel;

    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public boolean enabled() {
        return isEnabledValue(getKey("report.llm.enabled", "")) || isEnabledValue(configuredEnabled);
    }

    @Override
    public AiGenerateResponse generate(AiGenerateRequest request) {
        if (!enabled()) {
            throw new BizException("AI 未启用，请先配置 report.llm.enabled");
        }
        if (request == null) {
            throw new BizException("AI 请求不能为空");
        }
        String apiKey = hasText(configuredApiKey) ? configuredApiKey : getKey("report.llm.api-key", "");
        if (!hasText(apiKey)) {
            throw new BizException("AI API Key 未配置");
        }
        String baseUrl = firstText(getKey("report.llm.base-url", ""), configuredBaseUrl, "https://api.openai.com/v1");
        String model = firstText(getKey("report.llm.model", ""), configuredModel, "gpt-4o-mini");
        String url = normalizeUrl(baseUrl);

        String requestId = UUID.randomUUID().toString();
        long start = System.currentTimeMillis();
        ReportAiCallLog log = buildLog(request, requestId, model, baseUrl, "RUNNING", null, null, start);
        reportAiCallLogService.save(log);

        try {
            Map<String, Object> body = new HashMap<>();
            body.put("model", model);
            body.put("temperature", 0.2);
            body.put("stream", Boolean.FALSE);
            body.put("messages", buildMessages(request));
            if (hasText(request.getResponseFormat()) && "json".equalsIgnoreCase(request.getResponseFormat())) {
                Map<String, Object> responseFormat = new HashMap<>();
                responseFormat.put("type", "json_object");
                body.put("response_format", responseFormat);
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            ResponseEntity<Map> response = restTemplate.postForEntity(url, new HttpEntity<>(body, headers), Map.class);
            Map<?, ?> responseBody = response.getBody();
            if (responseBody == null) {
                throw new BizException("AI 返回为空");
            }

            AiGenerateResponse result = new AiGenerateResponse();
            result.setRawResponse(responseBody.toString());
            result.setModel(model);
            extractAiResult(responseBody, result);
            if (!hasText(result.getContent())) {
                result.setContent(responseBody.toString());
            }
            fillUsage(responseBody, result);
            finishLog(log, result, "SUCCESS", null, start, summarizeResponse(result));
            return result;
        } catch (RestClientException ex) {
            finishLog(log, null, "FAILED", ex.getMessage(), start, null);
            throw new BizException("AI 调用失败：" + ex.getMessage());
        } catch (RuntimeException ex) {
            finishLog(log, null, "FAILED", ex.getMessage(), start, null);
            throw ex;
        }
    }

    private List<Map<String, String>> buildMessages(AiGenerateRequest request) {
        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(message("system", request.getSystemPrompt()));
        messages.add(message("user", request.getUserPrompt()));
        return messages;
    }

    private Map<String, String> message(String role, String content) {
        Map<String, String> message = new HashMap<>();
        message.put("role", role);
        message.put("content", content == null ? "" : content);
        return message;
    }

    private void extractAiResult(Map<?, ?> responseBody, AiGenerateResponse result) {
        Object choicesObj = responseBody.get("choices");
        if (!(choicesObj instanceof List)) {
            String content = resolveResponseContent(responseBody);
            if (hasText(content)) {
                result.setContent(content.trim());
            }
            if (result.getFinishReason() == null) {
                Object finishReason = responseBody.get("finish_reason");
                if (finishReason != null) {
                    result.setFinishReason(String.valueOf(finishReason));
                }
            }
            return;
        }
        for (Object choiceObj : (List<?>) choicesObj) {
            if (!(choiceObj instanceof Map)) {
                continue;
            }
            Map<?, ?> choice = (Map<?, ?>) choiceObj;
            if (!hasText(result.getContent())) {
                String content = resolveChoiceContent(choice);
                if (hasText(content)) {
                    result.setContent(content.trim());
                }
            }
            if (result.getFinishReason() == null) {
                Object finishReason = choice.get("finish_reason");
                if (finishReason != null) {
                    result.setFinishReason(String.valueOf(finishReason));
                }
            }
            if (hasText(result.getContent()) && result.getFinishReason() != null) {
                break;
            }
        }
    }

    private String resolveChoiceContent(Map<?, ?> choice) {
        if (choice == null) {
            return "";
        }
        String content = extractMessageContent(choice.get("message"));
        if (hasText(content)) {
            return content;
        }
        content = extractMessageContent(choice.get("delta"));
        if (hasText(content)) {
            return content;
        }
        content = extractFragments(choice.get("text"));
        if (hasText(content)) {
            return content;
        }
        return "";
    }

    private String resolveResponseContent(Map<?, ?> responseBody) {
        if (responseBody == null) {
            return "";
        }
        String content = extractMessageContent(responseBody.get("message"));
        if (hasText(content)) {
            return content;
        }
        content = extractMessageContent(responseBody.get("delta"));
        if (hasText(content)) {
            return content;
        }
        content = extractFragments(responseBody.get("text"));
        if (hasText(content)) {
            return content;
        }
        content = extractFragments(responseBody.get("content"));
        if (hasText(content)) {
            return content;
        }
        content = extractFragments(responseBody.get("output_text"));
        if (hasText(content)) {
            return content;
        }
        content = extractFragments(responseBody.get("data"));
        if (hasText(content)) {
            return content;
        }
        return "";
    }

    private String extractMessageContent(Object messageObj) {
        if (messageObj instanceof Map) {
            Map<?, ?> message = (Map<?, ?>) messageObj;
            String content = extractFragments(message.get("content"));
            if (hasText(content)) {
                return content;
            }
            content = extractFragments(message.get("text"));
            if (hasText(content)) {
                return content;
            }
            content = extractFragments(message.get("message"));
            if (hasText(content)) {
                return content;
            }
        }
        return extractFragments(messageObj);
    }

    private String extractFragments(Object node) {
        if (node == null) {
            return "";
        }
        if (node instanceof String) {
            return sanitizeAiContent((String) node);
        }
        if (node instanceof Map) {
            Map<?, ?> map = (Map<?, ?>) node;
            String text = extractFragments(map.get("text"));
            if (hasText(text)) {
                return text;
            }
            text = extractFragments(map.get("value"));
            if (hasText(text)) {
                return text;
            }
            text = extractFragments(map.get("content"));
            if (hasText(text)) {
                return text;
            }
            return "";
        }
        if (node instanceof List) {
            StringBuilder builder = new StringBuilder();
            for (Object item : (List<?>) node) {
                String fragment = extractFragments(item);
                if (hasText(fragment)) {
                    if (builder.length() > 0) {
                        builder.append("\n\n");
                    }
                    builder.append(fragment);
                }
            }
            return builder.toString();
        }
        return "";
    }

    private String sanitizeAiContent(String value) {
        if (value == null) {
            return "";
        }
        String sanitized = value.trim();
        for (int i = 0; i < 3; i++) {
            String unwrapped = unwrapFinishReasonWrapper(sanitized);
            if (sanitized.equals(unwrapped)) {
                break;
            }
            sanitized = unwrapped.trim();
        }
        return sanitized;
    }

    private String unwrapFinishReasonWrapper(String value) {
        if (!hasText(value)) {
            return "";
        }
        String normalized = value.trim();
        if (!normalized.startsWith("{") || !normalized.endsWith("}")) {
            return normalized;
        }
        int textIndex = normalized.indexOf("text=");
        if (textIndex < 0) {
            return normalized;
        }
        String content = normalized.substring(textIndex + 5, normalized.length() - 1).trim();
        if (content.endsWith(", finish_reason=stop")) {
            content = content.substring(0, content.length() - ", finish_reason=stop".length()).trim();
        }
        return content;
    }

    private void fillUsage(Map<?, ?> responseBody, AiGenerateResponse result) {
        Object usageObj = responseBody.get("usage");
        if (usageObj instanceof Map) {
            Map<?, ?> usage = (Map<?, ?>) usageObj;
            result.setPromptTokens(toInteger(usage.get("prompt_tokens")));
            result.setCompletionTokens(toInteger(usage.get("completion_tokens")));
            result.setTotalTokens(toInteger(usage.get("total_tokens")));
        }
    }

    private ReportAiCallLog buildLog(AiGenerateRequest request, String requestId, String model, String baseUrl, String status, String errorMsg, String responseBody, long start) {
        ReportAiCallLog log = new ReportAiCallLog();
        log.setRequestId(requestId);
        log.setReportId(request.getReportId());
        log.setChapterId(request.getChapterId());
        log.setCallType(hasText(request.getResponseFormat()) && "json".equalsIgnoreCase(request.getResponseFormat()) ? "OUTLINE" : "CHAPTER");
        log.setModelName(model);
        log.setStatus("SUCCESS".equals(status) ? 1 : 0);
        log.setErrorMsg(errorMsg);
        log.setRequestBody(buildRequestBody(baseUrl, request));
        log.setResponseBody(responseBody);
        log.setCreateTime(LocalDateTime.now());
        log.setFinishTime(LocalDateTime.now());
        log.setDurationMs(0L);
        return log;
    }

    private void finishLog(ReportAiCallLog log, AiGenerateResponse result, String status, String errorMsg, long start, String responseBody) {
        if (log == null) {
            return;
        }
        log.setStatus("SUCCESS".equals(status) ? 1 : 0);
        log.setErrorMsg(errorMsg);
        log.setResponseBody(responseBody);
        log.setDurationMs(System.currentTimeMillis() - start);
        log.setFinishTime(LocalDateTime.now());
        if (result != null) {
            log.setPromptTokens(result.getPromptTokens());
            log.setCompletionTokens(result.getCompletionTokens());
            log.setTotalTokens(result.getTotalTokens());
        }
        reportAiCallLogService.updateById(log);
    }

    private String buildRequestBody(String baseUrl, AiGenerateRequest request) {
        StringBuilder builder = new StringBuilder();
        builder.append("baseUrl=").append(baseUrl).append('\n');
        builder.append("reportId=").append(request.getReportId()).append('\n');
        builder.append("chapterId=").append(request.getChapterId()).append('\n');
        builder.append("responseFormat=").append(request.getResponseFormat()).append('\n');
        builder.append("systemPromptChars=").append(length(request.getSystemPrompt())).append('\n');
        builder.append("userPromptChars=").append(length(request.getUserPrompt())).append('\n');
        return builder.toString();
    }

    private String summarizeResponse(AiGenerateResponse result) {
        if (result == null) {
            return "";
        }
        return "contentChars=" + length(result.getContent())
                + "\nfinishReason=" + (result.getFinishReason() == null ? "" : result.getFinishReason())
                + "\npromptTokens=" + result.getPromptTokens()
                + "\ncompletionTokens=" + result.getCompletionTokens()
                + "\ntotalTokens=" + result.getTotalTokens();
    }

    private String normalizeUrl(String baseUrl) {
        if (!hasText(baseUrl)) {
            return "https://api.openai.com/v1/chat/completions";
        }
        String normalized = baseUrl.trim();
        if (normalized.endsWith("/chat/completions")) {
            return normalized;
        }
        if (normalized.endsWith("/")) {
            return normalized + "chat/completions";
        }
        return normalized + "/chat/completions";
    }

    private String getKey(String key, String defaultValue) {
        return reportSystemConfigService.getValueByKey(key, defaultValue);
    }

    private boolean hasText(String value) {
        return value != null && value.trim().length() > 0;
    }

    private boolean isEnabledValue(String value) {
        return "1".equals(value) || "true".equalsIgnoreCase(value);
    }

    private String firstText(String... values) {
        if (values == null) {
            return "";
        }
        for (String value : values) {
            if (hasText(value)) {
                return value.trim();
            }
        }
        return "";
    }

    private int length(String value) {
        return value == null ? 0 : value.length();
    }

    private Integer toInteger(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (Exception ex) {
            return null;
        }
    }
}
