package com.km.report.service;

import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.km.report.dto.GenerateReportRequest;
import com.km.report.vo.ReportGenerationProgressVO;

public interface ReportGenerationService {
    ReportGenerationProgressVO startGenerate(GenerateReportRequest request);

    ReportGenerationProgressVO getProgress(Long reportId);

    SseEmitter streamGenerate(GenerateReportRequest request);
}
