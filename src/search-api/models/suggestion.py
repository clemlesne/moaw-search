from enum import Enum
from pydantic import BaseModel
from typing import Optional


class Status(str, Enum):
    FAIL = "fail"
    IN_PROGRESS = "in_progress"
    SUCCESS = "success"


class SuggestionModel(BaseModel):
    message: Optional[str] = None
    status: Status
