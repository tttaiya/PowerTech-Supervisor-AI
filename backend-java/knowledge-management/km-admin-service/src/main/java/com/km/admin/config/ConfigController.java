package com.km.admin.config;

import com.km.admin.common.ApiResponse;
import com.km.admin.config.dto.ConnectionTestRequest;
import com.km.admin.config.dto.ConnectionTestResult;
import com.km.admin.config.dto.EmbeddingConfigDTO;
import com.km.admin.config.dto.ParserConfigDTO;
import com.km.admin.config.dto.RerankConfigDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import javax.validation.Valid;

/**
 * 系统配置 Controller（前端 /api/v1/configs/**）。
 *
 * R21：删除 Controller 内 @ExceptionHandler，统一走 GlobalExceptionHandler。
 * R24：update 方法加 @Transactional(rollbackFor=Exception.class)，MQ 发布由 Service 在 afterCommit 触发。
 */
@RestController
@RequestMapping("/api/v1/configs")
public class ConfigController {

    @Autowired
    private ConfigService configService;

    @GetMapping("/embedding")
    public ApiResponse<EmbeddingConfigDTO> getEmbedding() {
        return ApiResponse.success(configService.getEmbeddingConfig());
    }

    @PutMapping("/embedding")
    @Transactional(rollbackFor = Exception.class)
    public ApiResponse<EmbeddingConfigDTO> putEmbedding(@Valid @RequestBody EmbeddingConfigDTO dto) {
        return ApiResponse.success(configService.updateEmbeddingConfig(dto));
    }

    @GetMapping("/rerank")
    public ApiResponse<RerankConfigDTO> getRerank() {
        return ApiResponse.success(configService.getRerankConfig());
    }

    @PutMapping("/rerank")
    @Transactional(rollbackFor = Exception.class)
    public ApiResponse<RerankConfigDTO> putRerank(@Valid @RequestBody RerankConfigDTO dto) {
        return ApiResponse.success(configService.updateRerankConfig(dto));
    }

    @GetMapping("/parser")
    public ApiResponse<ParserConfigDTO> getParser() {
        return ApiResponse.success(configService.getParserConfig());
    }

    @PutMapping("/parser")
    @Transactional(rollbackFor = Exception.class)
    public ApiResponse<ParserConfigDTO> putParser(@Valid @RequestBody ParserConfigDTO dto) {
        return ApiResponse.success(configService.updateParserConfig(dto));
    }

    @PostMapping("/test-connection")
    public ApiResponse<ConnectionTestResult> testConnection(@Valid @RequestBody ConnectionTestRequest req) {
        return ApiResponse.success(configService.testConnection(req));
    }
}