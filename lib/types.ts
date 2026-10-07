// Mirrors the MIS backend responses 1:1. See §4 of the build spec.

export type Brand = "fmc" | "av";
export type BrandFilter = Brand | "both";
export type CanonicalStage =
  | "delivered"
  | "contacted"
  | "connected"
  | "qualified"
  | "in_process"
  | "converted"
  | "opportunity"
  | "dnp"
  | "lost";
export type Grade = "A" | "B" | "C" | "D" | "F";

// An admin's company scope. null = super-admin (sees both companies).
export type AdminScope = Brand | null;

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// --- auth ---
export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: "provider" | "admin";
  provider_id?: string | null;
  brand?: Brand | null; // company scope; null = super-admin
}
export interface Me {
  user_id: string;
  email: string;
  role: "provider" | "admin";
  provider_id?: string | null;
  provider_name?: string | null;
  brand?: Brand | null; // company scope; null = super-admin
}

// --- metrics ---
export interface FunnelCounts {
  delivered: number;
  contacted: number;
  connected: number;
  qualified: number;
  converted: number;
  dnp: number;
  lost: number;
}
export interface QualityMetrics {
  delivered: number;
  invalid: number;
  duplicates: number;
  valid: number;
  invalid_rate: number;
  duplicate_rate: number;
}
export interface RateMetrics {
  contact_rate: number;
  qualification_rate: number;
  conversion_rate: number;
  time_to_first_contact_sec: number | null;
  time_to_qualify_sec: number | null;
}
export interface ScorecardCriterion {
  value: number;
  rating: number;
  weight: number;
}
export interface Scorecard {
  score_pct: number;
  grade: Grade;
  criteria: Record<string, ScorecardCriterion>;
}
export interface OverviewResponse {
  brand: string;
  date_from: string;
  date_to: string;
  funnel: FunnelCounts;
  quality: QualityMetrics;
  rates: RateMetrics;
  scorecard: Scorecard | null;
  data_as_of: string | null;
}
export interface TrendPoint {
  period: string;
  delivered: number;
  valid: number;
  qualified: number;
  converted: number;
}
export interface TrendsResponse {
  granularity: "day" | "week";
  points: TrendPoint[];
}
export interface BrandSplitRow {
  brand: Brand;
  funnel: FunnelCounts;
  quality: QualityMetrics;
  rates: RateMetrics;
}
export interface BrandSplitResponse {
  rows: BrandSplitRow[];
}

// --- leads ---
export interface LeadOut {
  id: string;
  serial_no: number | null;
  full_name: string | null;
  phone: string | null;
  brand: Brand;
  source_name: string | null;
  canonical_stage: CanonicalStage;
  is_invalid: boolean;
  is_duplicate: boolean;
  created_at: string | null;
}

// --- admin ---
export interface ProviderOut {
  id: string;
  name: string;
  brand: Brand; // the company this provider belongs to
  contact_email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
export interface ProviderCreate {
  name: string;
  brand?: Brand | null; // required for super-admin; omit for company admin
  contact_email?: string | null;
  is_active?: boolean;
}

// --- admin management (super-admin only) ---
export interface AdminOut {
  id: string;
  email: string;
  brand: Brand | null; // null = super-admin
  created_at: string;
}
export interface AdminCreated extends AdminOut {
  temp_password?: string | null;
}
export interface AdminCreate {
  email: string;
  password?: string;
  brand?: Brand | null; // null = super-admin, "fmc"/"av" = company admin
}
export interface ProviderUserCreated {
  id: string;
  provider_id: string;
  email: string;
  is_active: boolean;
  created_at: string;
  temp_password?: string | null;
}
export interface ProviderSourceOut {
  id: string;
  provider_id: string;
  brand: Brand;
  crm_source_id: string;
  source_name: string | null;
}
export interface CrmSourceOut {
  crm_source_id: string;
  name: string | null;
  already_mapped_to: string | null;
}
export interface LeaderboardRow {
  provider_id: string;
  provider_name: string;
  delivered: number;
  valid: number;
  qualified: number;
  converted: number;
  qualification_rate: number;
  conversion_rate: number;
  score_pct: number;
  grade: Grade;
}
export interface TargetOut {
  id: string;
  brand: Brand | null;
  metric_key: string;
  target_value: number;
}
export interface SyncStateOut {
  brand: Brand;
  last_watermark: string | null;
  last_run_at: string | null;
  last_status: string | null;
}
export interface SyncStatusResponse {
  states: SyncStateOut[];
  running: boolean;
}

// --- payouts (FundMyCampus only) ---
/** Decimal money as a string, e.g. "10800.00". Never do arithmetic on it. */
export type MoneyString = string;

export type PayoutBasis = "rate" | "agreed";

export interface PayoutSummary {
  students: number; // distinct students (one student can span several lender rows)
  loan_total: MoneyString;
  earned: MoneyString;
  paid: MoneyString;
  pending: MoneyString;
}

export interface PayoutItem {
  serial_no: number | null;
  full_name: string | null;
  bank_name: string | null;
  loan_amount: MoneyString | null; // sanctioned by this lender
  pf_paid_on: string | null; // YYYY-MM-DD — the date the payout is earned
  disbursed_total: MoneyString; // information only
  payout_basis: PayoutBasis;
  payout_rate: string | null; // percent, e.g. "0.60"; null when basis = "agreed"
  earned: MoneyString;
  paid: MoneyString;
  pending: MoneyString;
}

export interface PayoutsResponse {
  brand_supported: boolean;
  summary: PayoutSummary;
  items: PayoutItem[];
  page: number;
  page_size: number;
  total: number; // rows (student × lender), for pagination
  data_as_of: string | null;
}

export interface PayoutFilters {
  date_from?: string; // omit for all time
  date_to?: string;
}
