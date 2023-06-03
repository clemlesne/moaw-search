from pydantic import BaseModel
from .metadata import MetadataModel
from typing import List, Optional
from uuid import UUID


class SearchAnswerModel(BaseModel):
    id: UUID
    metadata: MetadataModel
    score: float


class SearchStatsModel(BaseModel):
    time: float
    total: int


class SearchModel(BaseModel):
    answers: List[SearchAnswerModel]
    query: str
    stats: Optional[SearchStatsModel]
    suggestion_token: str
