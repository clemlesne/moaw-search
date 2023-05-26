from pydantic import BaseModel
from .metadata import MetadataModel
from typing import List
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
    stats: SearchStatsModel
    suggestion_token: UUID
