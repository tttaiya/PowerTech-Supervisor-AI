package com.km.admin.knowledgebase.controller;

import com.km.admin.common.ApiResponse;
import com.km.admin.knowledgebase.dto.SelectableKnowledgeBaseDTO;
import com.km.admin.knowledgebase.service.KnowledgeBaseService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * 提供给智能问答模块的正式知识库内部接口。
 */
@RestController
@RequestMapping("/internal/km/knowledge-bases")
public class InternalKnowledgeBaseController {

    private final KnowledgeBaseService knowledgeBaseService;

    @Value("${km.internal.token:demo-internal-token}")
    private String internalToken;

    public InternalKnowledgeBaseController(KnowledgeBaseService knowledgeBaseService) {
        this.knowledgeBaseService = knowledgeBaseService;
    }

    @GetMapping("/selectable")
    public ApiResponse<List<SelectableKnowledgeBaseDTO>> listSelectable(
            @RequestHeader("X-Internal-Token") String token,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        if (!internalToken.equals(token)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid internal token");
        }
        return new ApiResponse<List<SelectableKnowledgeBaseDTO>>(
                200,
                "success",
                knowledgeBaseService.listSelectable(userId));
    }
}
