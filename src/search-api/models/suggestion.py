from pydantic import BaseModel


class SuggestionModel(BaseModel):
    message: str
