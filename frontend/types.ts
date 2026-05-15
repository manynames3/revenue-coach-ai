export interface Rep {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  organization_id: string;
  created_at: string;
}

export interface Call {
  id: string;
  rep_id: string;
  organization_id: string;
  lead_name: string | null;
  lead_source: string | null;
  call_type: string | null;
  outcome: string | null;
  transcript: string | null;
  audio_s3_key: string | null;
  transcription_job_id: string | null;
  status: "created" | "transcribing" | "transcribed" | "analyzing" | "analyzed" | "failed";
  failure_reason: string | null;
  transcription_retry_count: number;
  analysis_retry_count: number;
  transcription_started_at: string | null;
  transcribed_at: string | null;
  analysis_started_at: string | null;
  analyzed_at: string | null;
  created_at: string;
  updated_at: string | null;
  analysis?: Analysis;
}

export interface Analysis {
  id: string;
  call_id: string;
  overall_score: number;
  summary: string;
  scores: {
    rapport: number;
    discovery: number;
    objection_handling: number;
    closing: number;
    follow_up: number;
  };
  strengths: string[];
  missed_opportunities: string[];
  objections: Array<{
    type: string;
    customer_quote: string;
    rep_response_quality: string;
    better_response: string;
  }>;
  buying_signals: Array<{
    signal: string;
    strength: string;
    why_it_matters: string;
  }>;
  manager_notes: string[];
  coaching_drill: string;
  follow_up_sms: string;
  follow_up_email: {
    subject: string;
    body: string;
  };
  created_at: string;
}

export interface UploadUrlResponse {
  url: string;
  fields: Record<string, string>;
  key: string;
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
