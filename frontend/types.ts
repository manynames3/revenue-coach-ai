export interface Rep {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  organization_id: string;
  user_id: string | null;
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
  transcript_segments: TranscriptSegment[] | null;
  is_sample: boolean;
  consent_confirmed: boolean;
  consent_notes: string | null;
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
  analysis?: Analysis | null;
}

export interface Analysis {
  id: string;
  call_id: string;
  overall_score: number | null;
  summary: string | null;
  scores: Record<string, number | null> | null;
  score_reasons: Record<string, string>;
  source_mode: "sample" | "model" | "legacy";
  model_name: string | null;
  feedback_rating: number | null;
  review_seconds: number | null;
  feedback_at: string | null;
  evidence_coverage: number | null;
  rubric_snapshot: (CoachingFramework & { version: number }) | null;
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
  evidence: Array<{
    segment_id: string;
    category: string;
    speaker: string;
    quote: string;
    timestamp: string;
    score_area: string;
    coaching_point: string;
  }>;
  manager_notes: string[];
  coaching_drill: string | null;
  follow_up_sms: string | null;
  follow_up_email: {
    subject: string;
    body: string;
  } | null;
  sales_psychology?: SalesPsychology | null;
  created_at: string | null;
}

export interface SalesPsychology {
  trust_level: string;
  pain_depth: string;
  urgency_level: string;
  decision_clarity: string;
  money_readiness: string;
  resistance_created: string;
  close_probability: string;
  emotional_driver: string;
  primary_blocker: string;
  scores: {
    trust_and_safety: number | null;
    problem_clarity: number | null;
    emotional_depth: number | null;
    consequence_awareness: number | null;
    decision_clarity: number | null;
    money_readiness: number | null;
    urgency: number | null;
    resistance_management: number | null;
  };
  better_questions: Array<{
    category: string;
    missed_moment: string;
    suggested_question: string;
    why_it_works: string;
  }>;
  objection_psychology: Array<{
    objection_type: string;
    buyer_language: string;
    underlying_concern: string;
    recommended_question: string;
  }>;
  next_call_strategy: string;
}

export interface UploadUrlResponse {
  url: string;
  fields: Record<string, string>;
  key: string;
}

export interface CoachingCategory {
  key: string;
  label: string;
  description: string;
  weight: number;
  low_anchor: string;
  high_anchor: string;
}

export interface CoachingFramework {
  name: string;
  description: string;
  principles: string[];
  score_categories: CoachingCategory[];
}

export interface TrustControls {
  data_retention_days: number;
  recording_consent_required: boolean;
  pii_redaction_enabled: boolean;
  audio_uploads_direct_to_s3: boolean;
  delete_call_removes_audio_artifacts: boolean;
  auth_mode: string;
}

export interface Account {
  processing_enabled: boolean;
  organization: {
    id: string;
    name: string;
    created_at: string;
  };
  users: Array<{
    id: string;
    email: string;
    role: string;
    name: string;
    active: boolean;
    created_at: string;
  }>;
  reps: Rep[];
  coaching_framework: CoachingFramework;
  trust_controls: TrustControls;
  framework_version: number;
  offer_context: Record<string, string>;
}

export interface DashboardOverview {
  total_reps: number;
  total_calls: number;
  analyzed_calls: number;
  average_score: number | null;
  current_rubric_version: number;
  top_rep_name: string | null;
  top_rep_score: number | null;
  recent_scores: Array<{
    call_id: string;
    lead_name: string;
    rep_id: string;
    overall_score: number | null;
    scores: Record<string, number | null>;
    source_mode: "model" | "sample" | "legacy";
    rubric_version: number | null;
    analyzed_at: string;
  }>;
  coaching: { assigned: number; completed: number; reviewed: number };
  feedback: { reviewed_calls: number; helpful_percent: number | null; average_review_seconds: number | null; window_days: number };
  skill_comparisons: Array<{ id: string; skill: string; rep_name: string; baseline: number; latest: number; delta: number; is_sample: boolean }>;
}

export interface SessionUser { id: string; email: string; name: string; role: "manager" | "rep"; organization_id: string }
export interface TranscriptSegment { id: string; speaker: string; text: string; start_seconds: number | null; end_seconds: number | null }
export interface CoachingAssignment {
  id: string; rep_id: string; rep_name: string; call_id: string; skill: string; instructions: string;
  due_at: string; state: "assigned" | "completed" | "reviewed"; practice_response: string | null;
  feedback: string | null; verification_call_id: string | null; baseline_score: number | null;
  verified_score: number | null; created_at: string; completed_at: string | null; reviewed_at: string | null;
}
