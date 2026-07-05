"""Rule-first intent routing."""

from dataclasses import dataclass

from sqlalchemy.orm import Session


@dataclass
class IntentResult:
    intent: str
    confidence: float
    reason: str


class IntentService:
    chat_keywords = ("你好", "您好", "早上好", "晚上好", "闲聊", "讲个笑话")

    def __init__(self, db: Session | None = None):
        self.db = db

    def detect(self, question: str, mode: str = "auto") -> IntentResult:
        if mode == "knowledge":
            return IntentResult("knowledge_qa", 1.0, "用户强制选择知识库模式")
        if mode == "chat":
            return IntentResult("general_chat", 1.0, "用户强制选择普通对话模式")
        text = question.lower()
        if any(keyword in text for keyword in self.chat_keywords):
            return IntentResult("general_chat", 0.82, "命中闲聊关键词")
        return IntentResult("knowledge_qa", 0.70, "未命中闲聊关键词，默认进入知识库检索")
