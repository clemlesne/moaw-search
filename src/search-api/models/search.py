from pydantic import BaseModel
from .metadata import MetadataModel
from typing import List


class SearchAnswerModel(BaseModel):
    metadata: MetadataModel
    score: float


class SearchStatsModel(BaseModel):
    time: float
    total: int


class SearchModel(BaseModel):
    answers: List[SearchAnswerModel]
    query: str
    stats: SearchStatsModel
    suggestion_token: str
