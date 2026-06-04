import json


def test_context_compressor_extracts_structured_summary():
    from app.services.context_compressor import context_compressor

    long_log = "\n".join(
        [
            f"2026-06-02 10:{i:02d}:00 order-service ERROR timeout calling payment-service cpu {85 + i % 10}%"
            for i in range(80)
        ]
    )

    result = context_compressor.compress(long_log)

    assert result["compressed"] is True
    assert "structured_summary" in result
    assert result["structured_summary"]["key_errors"]
    assert result["structured_summary"]["metric_abnormalities"]
    assert "order-service" in result["summary_text"]


def test_bad_case_service_creates_and_reads_case(tmp_path):
    from app.models.bad_case import BadCaseCreateRequest
    from app.services.bad_case_service import BadCaseService

    service = BadCaseService(base_dir=str(tmp_path))
    record = service.create(
        BadCaseCreateRequest(
            trace_id="trace_1",
            case_type="workflow",
            symptom="Replanner ended too early",
            root_cause="insufficient decision criteria",
            fix_action="record replanner action and adjust prompt",
            verification_result="rerun passed",
        )
    )

    assert record.case_id.startswith("case_")
    assert service.get(record.case_id).root_cause == "insufficient decision criteria"
    assert service.list_cases()[0].trace_id == "trace_1"


def test_screenshot_alert_parser_extracts_alert_fields():
    from app.services.screenshot_alert_parser import screenshot_alert_parser

    parsed = screenshot_alert_parser.parse_text(
        """
        告警名称: CPUHighUsage
        服务: order-service
        指标: cpu_usage
        当前值: 92%
        阈值: 80%
        时间范围: 2026-06-02 10:00~10:10
        """
    )

    assert parsed.alert_name == "CPUHighUsage"
    assert parsed.service == "order-service"
    assert parsed.metric == "cpu_usage"
    assert parsed.current_value == "92%"
    assert parsed.threshold == "80%"
    assert parsed.confidence >= 0.8


def test_eval_cases_have_expected_distribution():
    path = "eval/agent_eval_cases.json"
    with open(path, encoding="utf-8") as f:
        cases = json.load(f)

    counts = {}
    for case in cases:
        counts[case["type"]] = counts.get(case["type"], 0) + 1
        assert case["id"]
        assert case["question"]
        assert case["expected_behavior"]

    assert len(cases) >= 20
    assert counts.get("rag", 0) >= 8
    assert counts.get("aiops", 0) >= 8
    assert counts.get("exception", 0) >= 4
    assert counts.get("screenshot", 0) >= 1
