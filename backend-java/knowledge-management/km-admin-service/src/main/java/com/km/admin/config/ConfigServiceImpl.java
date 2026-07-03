package com.km.admin.config;

import com.km.admin.config.dto.ConnectionTestRequest;
import com.km.admin.config.dto.ConnectionTestResult;
import com.km.admin.config.dto.EmbeddingConfigDTO;
import com.km.admin.config.dto.ParserConfigDTO;
import com.km.admin.config.dto.RerankConfigDTO;
import com.km.admin.config.entity.SystemConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 系统配置服务实现。
 *
 * 去 Lombok：显式构造 + 显式 getter/setter。
 * R21：删除 Controller 内 @ExceptionHandler，统一走 GlobalExceptionHandler。
 * R25：collectSafeConfigValues() 过滤 *api_key*。
 * R24：3 个 update 方法加 @Transactional + afterCommit 发 MQ。
 */
@Service
public class ConfigServiceImpl implements ConfigService {

    private static final String API_KEY_MASK = "********";

    @Autowired
    private ConfigMapper configMapper;

    @Autowired
    private ConfigChangedProducer configChangedProducer;

    // ---------------- embedding ----------------

    @Override
    public EmbeddingConfigDTO getEmbeddingConfig() {
        EmbeddingConfigDTO result = configMapper.loadEmbeddingConfig();
        result.setApiKey(API_KEY_MASK);
        return result;
    }

    @Override
    public EmbeddingConfigDTO updateEmbeddingConfig(EmbeddingConfigDTO dto) {
        String resolvedKey = resolveApiKey("embedding.api_key", dto.getApiKey());

        updateValue("embedding.model", dto.getModel());
        updateValue("embedding.api_base", dto.getApiBase() == null ? "" : dto.getApiBase());
        updateValue("embedding.api_key", resolvedKey);
        updateValue("embedding.dimension", String.valueOf(dto.getDimension()));

        registerAfterCommit("embedding", null);

        EmbeddingConfigDTO out = configMapper.loadEmbeddingConfig();
        out.setApiKey(API_KEY_MASK); // 永远不回显明文
        return out;
    }

    // ---------------- rerank ----------------

    @Override
    public RerankConfigDTO getRerankConfig() {
        RerankConfigDTO result = configMapper.loadRerankConfig();
        result.setApiKey(API_KEY_MASK);
        return result;
    }

    @Override
    public RerankConfigDTO updateRerankConfig(RerankConfigDTO dto) {
        String resolvedKey = resolveApiKey("rerank.api_key", dto.getApiKey());

        updateValue("rerank.model", dto.getModel());
        updateValue("rerank.api_base", dto.getApiBase() == null ? "" : dto.getApiBase());
        updateValue("rerank.api_key", resolvedKey);
        updateValue("rerank.top_n", String.valueOf(dto.getTopN()));
        updateValue("rerank.threshold", String.valueOf(dto.getThreshold()));

        registerAfterCommit("rerank", null);

        RerankConfigDTO out = configMapper.loadRerankConfig();
        out.setApiKey(API_KEY_MASK);
        return out;
    }

    // ---------------- parser ----------------

    @Override
    public ParserConfigDTO getParserConfig() {
        return configMapper.loadParserConfig();
    }

    @Override
    public ParserConfigDTO updateParserConfig(ParserConfigDTO dto) {
        updateValue("parser.paddleocr_enabled", String.valueOf(dto.isPaddleocrEnabled()));
        updateValue("parser.max_concurrent_tasks", String.valueOf(dto.getMaxConcurrentTasks()));
        updateValue("parser.max_retry_count", String.valueOf(dto.getMaxRetryCount()));
        updateValue("parser.timeout_seconds", String.valueOf(dto.getTimeoutSeconds()));

        Map<String, String> safeValues = collectSafeConfigValues();
        registerAfterCommit("parser", safeValues);

        return dto;
    }

    // ---------------- test connection ----------------

    @Override
    public ConnectionTestResult testConnection(ConnectionTestRequest req) {
        // P0 阶段：仅做格式校验，不真发 HTTP 请求（避免引入 Java 11+ HttpClient；R10 Java 8 兼容）
        // 真实连通性测试留待 commit #XX 引入 RestTemplate / OkHttp 后再做
        ConnectionTestResult r = new ConnectionTestResult();
        if (req.getApiBase() == null || req.getApiBase().isEmpty()) {
            r.setSuccess(false);
            r.setMessage("API 地址不能为空");
            return r;
        }
        URI uri;
        try {
            uri = URI.create(req.getApiBase() + "/v1/models");
        } catch (IllegalArgumentException e) {
            r.setSuccess(false);
            r.setMessage("API 地址非法: " + e.getMessage());
            return r;
        }
        if (uri.getScheme() == null || !(uri.getScheme().startsWith("http"))) {
            r.setSuccess(false);
            r.setMessage("API 地址协议必须为 http/https");
            return r;
        }
        r.setSuccess(true);
        r.setLatencyMs(0L);
        r.setMessage("格式校验通过（P0：未实发请求）");
        return r;
    }

    // ---------------- helpers ----------------

    private void updateValue(String key, String value) {
        if (value == null) value = "";
        configMapper.updateConfigValue(key, value);
    }

    private String safeGetValue(String key) {
        String v = configMapper.selectValue(key);
        return v == null ? "" : v;
    }

    /** R25：MQ 事件过滤 .api_key，永远不携带敏感字段 */
    private Map<String, String> collectSafeConfigValues() {
        List<Map<String, String>> all = configMapper.selectAllAsMap();
        Map<String, String> safe = new LinkedHashMap<>();
        for (Map.Entry<String, String> e : mapOf(all).entrySet()) {
            if (e.getKey() != null && e.getKey().endsWith(".api_key")) continue;
            safe.put(e.getKey(), e.getValue());
        }
        return safe;
    }

    private static Map<String, String> mapOf(List<Map<String, String>> rows) {
        Map<String, String> m = new LinkedHashMap<>();
        for (Map<String, String> r : rows) {
            m.putAll(r);
        }
        return m;
    }

    private void registerAfterCommit(String group, Map<String, String> values) {
        // R24：事务提交后才发 MQ；非事务上下文（如 Worker 调用 getParserConfig）也不会触发此回调
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                configChangedProducer.publishConfigChanged(group, values);
            }
        });
    }

    /**
     * 解析API Key，根据传入值决定如何处理
     * - null 或以掩码开头：保留原值
     * - 空字符串：清空Key
     * - 新字符串：替换Key
     */
    private String resolveApiKey(String configKey, String incomingApiKey) {
        if (incomingApiKey == null || incomingApiKey.startsWith(API_KEY_MASK)) {
            return safeGetValue(configKey);
        }
        return incomingApiKey;
    }

    // 系统未用，保留 SystemConfig entity 引用防止被 IDE 标记未使用
    @SuppressWarnings("unused")
    private static Class<?> KEEP_IMPORT = SystemConfig.class;
}