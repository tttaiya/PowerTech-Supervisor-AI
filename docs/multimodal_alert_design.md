# Day08 告警截图解析设计与执行说明

## 为什么要做

真实 OnCall 场景中，告警经常来自截图、群消息或监控平台页面。用户未必会手动整理服务名、指标和阈值。Day08 增加截图告警解析入口，让系统能从图片入口生成结构化诊断任务，增强项目的真实业务感。

## 怎么加的

新增模型：

- `app/models/alert.py`
- `AlertParseResult`

新增服务：

- `app/services/screenshot_alert_parser.py`
- 第一版支持同名 `.txt` 模拟 OCR，便于本地稳定演示和测试。

新增接口：

- `POST /api/aiops/screenshot`

接口会把上传文件保存到 `uploads/screenshots/`，解析字段后返回 `parsed_alert` 和 `diagnosis_task`。

## 操作步骤

准备一个模拟截图文件和同名 OCR 文本：

```powershell
New-Item -ItemType Directory -Force uploads\screenshots
Set-Content -Path uploads\screenshots\alert_demo.txt -Encoding UTF8 -Value @"
告警名称: CPUHighUsage
服务: order-service
指标: cpu_usage
当前值: 92%
阈值: 80%
时间范围: 2026-06-02 10:00~10:10
"@
```

上传任意图片文件名为 `alert_demo.png`，同名 txt 会作为 OCR 结果：

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:9900/api/aiops/screenshot" -Form @{ file = Get-Item "uploads\screenshots\alert_demo.png" }
```

如果没有真实图片，可先创建一个占位文件：

```powershell
Set-Content -Path uploads\screenshots\alert_demo.png -Value "demo"
```

## 验收标准

- 返回 alert_name、service、metric、current_value、threshold、time_range。
- confidence 在字段完整时较高。
- diagnosis_task 能直接交给 AIOps 诊断链路作为任务描述。

## 亮点和思考

这里没有直接依赖外部 OCR 服务，是为了保证本地演示稳定。设计上把“图片转文字”和“文字转结构化告警”拆成两层，后续可以无缝替换为 PaddleOCR、云 OCR 或多模态模型。面试讲解时可以强调：我优先实现可测试的多模态入口，并保留可演进的抽象边界。

## 面试题

1. 为什么截图解析要先转结构化字段？
2. 模拟 OCR 的价值是什么？
3. 如果 OCR 结果缺字段，系统应该如何处理？
4. 如何把截图入口和原有 AIOps 诊断链路打通？
5. 后续接入真实 OCR 或多模态模型时要注意什么？
