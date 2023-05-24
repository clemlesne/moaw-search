from datetime import datetime
from pydantic import BaseModel
from typing import List


class MetadataModel(BaseModel):
    audience: List[str]
    authors: List[str]
    description: str
    language: str
    last_updated: datetime
    tags: List[str]
    title: str
    url: str
