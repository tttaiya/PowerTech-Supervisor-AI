"""告警截图解析服务。"""

import re
from pathlib import Path

from app.models.alert import AlertParseResult


class ScreenshotAlertParser:
    """从 OCR 文本中提取结构化告警字段。

    第一版支持同名 txt 模拟 OCR，方便先跑通多模态入口闭环。
    """

    def extract_text_from_image(self, image_path: str) -> str:
        path = Path(image_path)
        mock_text_path = path.with_suffix(".txt")
        if mock_text_path.exists():
            return mock_text_path.read_text(encoding="utf-8")
        return ""

    def parse(self, image_path: str) -> AlertParseResult:
        return self.parse_text(self.extract_text_from_image(image_path))

    def parse_text(self, raw_text: str) -> AlertParseResult:
        service = self._find_first(
            raw_text,
            [r"服务[:：]\s*([a-zA-Z0-9_-]+)", r"\b([a-zA-Z][a-zA-Z0-9_-]{2,40}-(?:service|api|worker))\b"],
        )
        alert_name = self._find_first(
            raw_text,
            [r"告警名称[:：]\s*([a-zA-Z0-9_-]+)", r"\b(CPUHighUsage|MemoryHighUsage|DiskHighUsage|ServiceUnavailable|SlowResponse)\b"],
        )
        metric = self._find_first(
            raw_text,
            [r"指标[:：]\s*([a-zA-Z0-9_%-]+)", r"\b(cpu_usage|memory_usage|disk_usage|error_rate|latency)\b"],
        )
        current_value = self._find_first(
            raw_text,
            [r"当前值[:：]\s*([0-9.]+%|[0-9.]+ms)", r"current[:：]\s*([0-9.]+%|[0-9.]+ms)"],
        )
        threshold = self._find_first(
            raw_text,
            [r"阈值[:：]\s*([0-9.]+%|[0-9.]+ms)", r"threshold[:：]\s*([0-9.]+%|[0-9.]+ms)"],
        )
        time_range = self._find_first(
            raw_text,
            [
                r"时间范围[:：]\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(?::\d{2})?\s*[~\-]\s*\d{2}:\d{2}(?::\d{2})?)",
                r"(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(?::\d{2})?)",
            ],
        )
        score = sum(bool(item) for item in [service, alert_name, metric, current_value, threshold, time_range])
        return AlertParseResult(
            alert_name=alert_name,
            service=service,
            metric=metric,
            current_value=current_value,
            threshold=threshold,
            time_range=time_range,
            raw_text=raw_text,
            confidence=round(score / 6, 2),
        )

    def build_diagnosis_task(self, parsed: AlertParseResult) -> str:
        return (
            "请根据以下告警截图解析结果进行 AIOps 诊断：\n"
            f"- 告警名称: {parsed.alert_name or '未知'}\n"
            f"- 服务: {parsed.service or '未知'}\n"
            f"- 指标: {parsed.metric or '未知'}\n"
            f"- 当前值: {parsed.current_value or '未知'}\n"
            f"- 阈值: {parsed.threshold or '未知'}\n"
            f"- 时间范围: {parsed.time_range or '未知'}\n"
            "请查询相关日志、监控和知识库，输出根因分析和处理建议。"
        )

    def _find_first(self, text: str, patterns: list[str]) -> str:
        for pattern in patterns:
            match = re.search(pattern, text, flags=re.IGNORECASE)
            if match:
                return match.group(1)
        return ""


screenshot_alert_parser = ScreenshotAlertParser()
