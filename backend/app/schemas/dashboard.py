from pydantic import BaseModel


class DashboardOverview(BaseModel):
    total_reps: int = 0
    total_calls: int = 0
    analyzed_calls: int = 0
    average_score: float = 0
    top_rep_name: str | None = None
    top_rep_score: float | None = None
    recent_scores: list[dict] = []
