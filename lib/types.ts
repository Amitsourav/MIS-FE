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
  is_demo?: boolean; // provider logins: true for a sales-demo partner
}
export interface Me {
  user_id: string;
  email: string;
  role: "provider" | "admin";
  provider_id?: string | null;
  provider_name?: string | null;
  brand?: Brand | null; // company scope; null = super-admin
  is_demo?: boolean; // provider logins: true for a sales-demo partner
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
// Partners never see FMC's serial no., the brand or our CRM source name.
export type LeadLenderStatus = "loan_login" | "sanctioned" | "pf_paid" | "disbursed" | "lost";

export interface LeadLender {
  bank: string | null; // the real bank ("PNB"); null = still on an aggregator → "—"
  status: LeadLenderStatus;
  status_label: string; // "Logged in" | "Sanctioned" | "PF Paid" | "Disbursed" | "Declined"
  amount: MoneyString | null;
  amount_kind: "sanctioned" | "applied" | null; // applied = asked for, before a sanction
  application_no: string | null;
}

export interface LeadOut {
  id: string;
  lead_no: number | null; // the partner's own number, 1 = their oldest lead
  full_name: string | null;
  phone: string | null;
  canonical_stage: CanonicalStage; // charts only — the table shows crm_stage_label
  crm_stage: string | null;
  crm_stage_label: string | null; // the CRM's own stage name
  is_invalid: boolean;
  is_duplicate: boolean;
  created_at: string | null;
  counsellor_name: string | null;
  lenders: LeadLender[]; // furthest-along first; [] until the file is logged in somewhere
}

// --- one lead (GET /me/leads/{id}); 404 = not this partner's lead ---
export interface StageEvent {
  stage: string; // as stored, e.g. "pf_paid"
  label: string; // the CRM's name, e.g. "PF Paid"
  at: string; // when the lead moved to it
}

export interface LeadDetail extends LeadOut {
  contacted_at: string | null;
  qualified_at: string | null;
  converted_at: string | null;
  stage_history: StageEvent[]; // oldest first; can be []
  payouts: PayoutItem[]; // one per lender file; [] for Admitverse or no payout yet
}

// --- loan pipeline (GET /me/lead-funnel, FundMyCampus only) ---
export interface FunnelStep {
  key: "all" | "logged_in" | "sanctioned" | "pf_paid" | "disbursed";
  label: string; // "All leads" | "Login" | "Sanction" | "PF paid" | "Disbursed"
  count: number; // leads that reached this step or went further
}
export interface LeadFunnelResponse {
  brand_supported: boolean;
  date_from: string | null;
  date_to: string | null;
  steps: FunnelStep[]; // the 5 steps in order when supported; [] otherwise
}

// A CRM stage for the Leads filter, in the CRM's own order (GET /me/stages).
export interface CrmStageOption {
  value: string; // sent back as crm_stage=
  label: string;
  count: number;
}

// --- admin ---
export interface ProviderOut {
  id: string;
  name: string;
  brand: Brand; // the company this provider belongs to
  contact_email: string | null;
  is_active: boolean;
  is_demo: boolean; // sales-demo partner: sees "AI Calling", left out of the leaderboard
  created_at: string;
  updated_at: string;
}
export interface ProviderCreate {
  name: string;
  brand?: Brand | null; // required for super-admin; omit for company admin
  contact_email?: string | null;
  is_active?: boolean;
  is_demo?: boolean;
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
export interface ProviderUserOut {
  id: string;
  provider_id: string;
  email: string;
  is_active: boolean;
  created_at: string;
}
export interface ProviderUserCreated extends ProviderUserOut {
  temp_password?: string | null; // returned once, when the backend generated it
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

// --- payouts (FundMyCampus only) ---
/** Decimal money as a string, e.g. "10800.00". Never do arithmetic on it. */
export type MoneyString = string;

export type PayoutBasis = "rate" | "agreed";

export interface PayoutSummary {
  students: number; // distinct students (one student can span several lender rows)
  loan_total: MoneyString;
  earned: MoneyString;
  paid: MoneyString;
  pending: MoneyString; // still to pay, per student (never negative)
  overpaid: MoneyString; // paid above earned, per student (never negative)
  balance: MoneyString; // earned − paid, SIGNED: + FMC still owes, − FMC paid extra
  // "Where your money is" pie: these 5 add up exactly to `earned`.
  cash_transferred: MoneyString; // paid (up to earned) minus TDS
  tds: MoneyString;
  invoice_not_raised: MoneyString; // pending, no bill yet
  invoice_raised: MoneyString; // pending, on a bill not yet due
  invoice_overdue: MoneyString; // pending, on a bill past its due date
}

export type InvoiceStatus = "raised" | "paid" | "cancelled";
export type InvoiceState = "not_raised" | "raised" | "overdue";

export interface PayoutItem {
  lead_no: number | null; // the partner's own lead number
  full_name: string | null;
  bank_name: string | null; // the real bank ("PNB"); null = still on an aggregator → "—"
  loan_amount: MoneyString | null; // sanctioned by this lender
  pf_paid_on: string | null; // information only; no longer the earning date
  first_disbursed_on: string | null; // YYYY-MM-DD — the bank's first release
  last_disbursed_on: string | null; // YYYY-MM-DD — latest release: the row's date (sort + filter)
  disbursed_total: MoneyString; // released so far — the payout basis
  payout_basis: PayoutBasis;
  payout_rate: string | null; // percent, e.g. "0.60"; null when basis = "agreed"
  earned: MoneyString;
  paid: MoneyString;
  pending: MoneyString;
  overpaid: MoneyString; // paid beyond earned; "0.00" normally
  balance: MoneyString; // earned − paid, signed
  tds: MoneyString;
  net_paid: MoneyString; // paid − TDS
  paid_on: string | null; // FMC's latest payment date
  invoice_number: string | null; // the student's latest partner bill
  invoice_amount: MoneyString | null;
  invoice_date: string | null;
  invoice_due_date: string | null;
  invoice_status: InvoiceStatus | null;
  invoice_state: InvoiceState; // where this row's pending sits
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

// Revenue vs Disbursement by month (GET /provider/payouts/monthly).
export interface MonthlyPayoutPoint {
  month: string; // "YYYY-MM"
  revenue: MoneyString; // full sanctioned payout, in the sanction month
  disbursement: MoneyString; // earned on released money, in each release month
}
export interface PayoutMonthlyResponse {
  brand_supported: boolean;
  months: MonthlyPayoutPoint[]; // oldest first, continuous (empty months are "0.00")
  revenue_total: MoneyString;
  disbursement_total: MoneyString;
  revenue_dated_by_first_release: number; // loans with no sanction date, shown in first release month
  revenue_undated: MoneyString; // in revenue_total but in no month
}

export interface PayoutFilters {
  date_from?: string; // omit for all time
  date_to?: string;
}

// Admin only: FMC payouts on CRM sources no provider is mapped to (GET /admin/payouts/unmapped).
// Admin pages may show FMC's serial no. and the CRM route (e.g. "UC PNB").
export interface UnmappedPayoutItem extends PayoutItem {
  serial_no: number | null;
  crm_bank_name: string | null;
  crm_source_id: string | null;
  source_name: string | null;
}
export interface UnmappedPayoutsResponse {
  summary: PayoutSummary;
  items: UnmappedPayoutItem[];
  total: number;
}
