export interface Rep {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  organization_id: string;
  created_at: string;
}

export interface DashboardOverview {
  total_reps: number;
  total_calls: number;
  analyzed_calls: number;
  average_score: number;
  top_rep_name: string | null;
  top_rep_score: number | null;
  recent_scores: Array<{
    call_id: string;
    lead_name: string;
    rep_id: string;
    overall_score: number;
    scores: Record<string, number>;
    analyzed_at: string;
  }>;
}
