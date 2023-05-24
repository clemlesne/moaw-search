from pydantic import BaseModel
from .metadata import MetadataModel
from typing import List


class SearchAnswerModel(BaseModel):
    score: float
    metadata: MetadataModel


class SearchStatsModel(BaseModel):
    total: int
    time: float


class SearchSuggestionModel(BaseModel):
    message: str


class SearchModel(BaseModel):
    answers: List[SearchAnswerModel]
    stats: SearchStatsModel
    suggestion: SearchSuggestionModel
