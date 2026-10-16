"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  type QueryClient,
} from "@tanstack/react-query";
import { api } from "./api";
import { Filters, metricQuery, leadsQuery } from "./filters";
import type {
  OverviewResponse,
  TrendsResponse,
  BrandSplitResponse,
  QualityMetrics,
  Page,
  LeadOut,
  LeadDetail,
  ChatThread,
  ChatMessage,
  ChatPost,
  ChatLatest,
  ProviderOut,
  ProviderSourceOut,
  ProviderUserCreated,
  ProviderUserOut,
  UnmappedPayoutsResponse,
  LeadFunnelResponse,
  PayoutMonthlyResponse,
  CrmSourceOut,
  LeaderboardRow,
  TargetOut,
  Me,
  Brand,
  ProviderCreate,
  AdminOut,
  AdminCreated,
  AdminCreate,
  PayoutsResponse,
  CrmStageOption,
  PayoutFilters,
} from "./types";

const STALE = 45_000;

async function get<T>(url: string, params?: Record<string, string>): Promise<T> {
  const res = await api.get<T>(url, { params });
  return res.data;
}

// ---------------- auth ----------------
export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => get<Me>("/auth/me"),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

// ---------------- provider metrics ----------------
export function useOverview(f: Filters, opts?: { enabled?: boolean }) {
  const params = metricQuery(f);
  return useQuery({
    queryKey: ["overview", params],
    queryFn: () => get<OverviewResponse>("/me/overview", params),
    staleTime: STALE,
    enabled: opts?.enabled ?? true,
  });
}

export function useTrends(f: Filters, granularity: "day" | "week") {
  const params = { ...metricQuery(f), granularity };
  return useQuery({
    queryKey: ["trends", params],
    queryFn: () => get<TrendsResponse>("/me/trends", params),
    staleTime: STALE,
  });
}

export function useBrandSplit(f: Filters) {
  const params: Record<string, string> = f.allTime
    ? { all_time: "true" }
    : { from: f.from, to: f.to };
  return useQuery({
    queryKey: ["brand-split", params],
    queryFn: () => get<BrandSplitResponse>("/me/brand-split", params),
    staleTime: STALE,
  });
}

export function useQuality(f: Filters) {
  const params = metricQuery(f);
  return useQuery({
    queryKey: ["quality", params],
    queryFn: () => get<QualityMetrics>("/me/quality", params),
    staleTime: STALE,
  });
}

export function useLeads(f: Filters) {
  const params = leadsQuery(f);
  return useQuery({
    queryKey: ["leads", params],
    queryFn: () => get<Page<LeadOut>>("/me/leads", params),
    staleTime: STALE,
    placeholderData: keepPreviousData,
  });
}

// Loan pipeline (All leads → Login → Sanction → PF paid → Disbursed), by lead created date.
// One lead with its stage history and payouts. A 404 (not this partner's lead) is final.
export function useLeadDetail(id: string) {
  return useQuery({
    queryKey: ["lead", id],
    queryFn: () => get<LeadDetail>(`/me/leads/${encodeURIComponent(id)}`),
    staleTime: STALE,
  });
}

// ---------------- partner chat on a lead ----------------
// Unread "new reply" flags for the Leads table. Before the CRM chat API is live this
// 503s; the table then just shows no dots, so don't retry or surface it.
export function useMessagesLatest() {
  return useQuery({
    queryKey: ["messages-latest"],
    queryFn: () => get<ChatLatest[]>("/me/messages/latest"),
    staleTime: STALE,
    retry: false,
  });
}

// Opening the thread marks staff replies as read, so refresh the unread flags after.
// Polls every 20 s while the tab is visible, and on window focus.
export function useLeadMessages(id: string) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ["lead-messages", id],
    queryFn: async () => {
      const thread = await get<ChatThread>(`/me/leads/${encodeURIComponent(id)}/messages`);
      // Only when this lead had a dot, so the 20 s poll doesn't refetch the list each time.
      const latest = qc.getQueryData<ChatLatest[]>(["messages-latest"]);
      if (latest?.some((m) => m.lead_id === id && m.unread)) {
        void qc.invalidateQueries({ queryKey: ["messages-latest"] });
      }
      return thread;
    },
    staleTime: 0,
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  });
}

// Appends the returned message to the cached thread; no full refetch.
export function useSendLeadMessage(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ChatPost) =>
      api
        .post<ChatMessage>(`/me/leads/${encodeURIComponent(id)}/messages`, body)
        .then((r) => r.data),
    onSuccess: (msg) => {
      qc.setQueryData<ChatThread>(["lead-messages", id], (t) =>
        t && !t.items.some((m) => m.id === msg.id) ? { ...t, items: [...t.items, msg] } : t,
      );
    },
  });
}

export function useLeadFunnel(f: Filters) {
  const params = metricQuery(f);
  return useQuery({
    queryKey: ["lead-funnel", params],
    queryFn: () => get<LeadFunnelResponse>("/me/lead-funnel", params),
    staleTime: STALE,
  });
}

// CRM stages for the Leads filter, scoped like /me/leads (dates/brand, not stage/search).
export function useStages(f: Filters) {
  const params = metricQuery(f);
  return useQuery({
    queryKey: ["stages", params],
    queryFn: () => get<CrmStageOption[]>("/me/stages", params),
    staleTime: STALE,
    placeholderData: keepPreviousData,
  });
}

// ---------------- payouts ----------------
// Note: /provider/payouts (not /me/...) and date_from/date_to (not from/to).
// Omitting both dates means all time.
function payoutParams(f: PayoutFilters, page?: number, pageSize?: number): Record<string, string> {
  const params: Record<string, string> = {};
  if (f.date_from) params.date_from = f.date_from;
  if (f.date_to) params.date_to = f.date_to;
  if (page !== undefined) params.page = String(page);
  if (pageSize !== undefined) params.page_size = String(pageSize);
  return params;
}

export function usePayouts(filters: PayoutFilters, page: number, pageSize: number) {
  return useQuery({
    queryKey: ["payouts", payoutParams(filters), page, pageSize],
    queryFn: () =>
      get<PayoutsResponse>("/provider/payouts", payoutParams(filters, page, pageSize)),
    staleTime: STALE,
    placeholderData: keepPreviousData,
  });
}

export function usePayoutsMonthly(filters: PayoutFilters) {
  const params = payoutParams(filters);
  return useQuery({
    queryKey: ["payouts-monthly", params],
    queryFn: () => get<PayoutMonthlyResponse>("/provider/payouts/monthly", params),
    staleTime: STALE,
  });
}

export function useAdminProviderPayoutsMonthly(providerId: string, filters: PayoutFilters) {
  const params = payoutParams(filters);
  return useQuery({
    queryKey: ["admin", "provider", providerId, "payouts-monthly", params],
    queryFn: () =>
      get<PayoutMonthlyResponse>(`/admin/providers/${providerId}/payouts/monthly`, params),
    staleTime: STALE,
    enabled: !!providerId,
  });
}

export function useAdminProviderPayouts(
  providerId: string,
  filters: PayoutFilters,
  page: number,
  pageSize: number,
) {
  return useQuery({
    queryKey: ["admin", "provider", providerId, "payouts", payoutParams(filters), page, pageSize],
    queryFn: () =>
      get<PayoutsResponse>(
        `/admin/providers/${providerId}/payouts`,
        payoutParams(filters, page, pageSize),
      ),
    staleTime: STALE,
    placeholderData: keepPreviousData,
    enabled: !!providerId,
  });
}

// FMC payouts on sources no provider is mapped to. FMC + super admins only; not paged.
export function useUnmappedPayouts() {
  return useQuery({
    queryKey: ["admin", "payouts", "unmapped"],
    queryFn: () => get<UnmappedPayoutsResponse>("/admin/payouts/unmapped"),
    staleTime: STALE,
  });
}

/** Same-origin CSV download URL for the provider's payouts (dates only, when set). */
export function payoutsExportUrl(filters: PayoutFilters): string {
  const qs = new URLSearchParams(payoutParams(filters)).toString();
  return `/api/provider/payouts/export${qs ? `?${qs}` : ""}`;
}

// ---------------- admin: providers ----------------
export function useProviders() {
  return useQuery({
    queryKey: ["providers"],
    queryFn: () => get<ProviderOut[]>("/admin/providers"),
    staleTime: STALE,
  });
}

export function useProvider(id: string) {
  return useQuery({
    queryKey: ["providers", id],
    queryFn: async () => {
      const all = await get<ProviderOut[]>("/admin/providers");
      return all.find((p) => p.id === id) ?? null;
    },
    staleTime: STALE,
    enabled: !!id,
  });
}

export function useProviderSources(id: string) {
  return useQuery({
    queryKey: ["provider-sources", id],
    queryFn: () => get<ProviderSourceOut[]>(`/admin/providers/${id}/sources`),
    staleTime: STALE,
    enabled: !!id,
  });
}

export function useCrmSources(brand: Brand | "") {
  return useQuery({
    queryKey: ["crm-sources", brand],
    queryFn: () => get<CrmSourceOut[]>("/admin/crm-sources", { brand }),
    staleTime: STALE,
    enabled: !!brand,
  });
}

export function useLeaderboard(range: { from?: string; to?: string }) {
  const params: Record<string, string> = {};
  if (range.from) params.from = range.from;
  if (range.to) params.to = range.to;
  return useQuery({
    queryKey: ["leaderboard", params],
    queryFn: () => get<LeaderboardRow[]>("/admin/leaderboard", params),
    staleTime: STALE,
  });
}

export function useTargets() {
  return useQuery({
    queryKey: ["targets"],
    queryFn: () => get<TargetOut[]>("/admin/targets"),
    staleTime: STALE,
  });
}

// ---------------- admin: mutations ----------------
export function useCreateProvider() {
  const qc = useQueryClient();
  return useMutation({
    // brand is required for super-admins; company admins omit it (backend forces theirs).
    mutationFn: (body: ProviderCreate) =>
      api.post<ProviderOut>("/admin/providers", body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["providers"] }),
  });
}

export function useUpdateProvider(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name?: string;
      contact_email?: string;
      is_active?: boolean;
      is_demo?: boolean;
    }) =>
      api.put<ProviderOut>(`/admin/providers/${id}`, body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["providers"] });
      qc.invalidateQueries({ queryKey: ["providers", id] });
    },
  });
}

export function useProviderUsers(id: string) {
  return useQuery({
    queryKey: ["provider-users", id],
    queryFn: () => get<ProviderUserOut[]>(`/admin/providers/${id}/users`),
    staleTime: STALE,
    enabled: !!id,
  });
}

export function useCreateProviderUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; password?: string }) =>
      api.post<ProviderUserCreated>(`/admin/providers/${id}/users`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["provider-users", id] }),
  });
}

// Omit password to have the backend generate one (returned once as temp_password).
// Signs out anyone still using the old password.
export function useResetProviderPassword(id: string) {
  return useMutation({
    mutationFn: (vars: { userId: string; password?: string }) =>
      api
        .post<ProviderUserCreated>(
          `/admin/providers/${id}/users/${vars.userId}/reset-password`,
          vars.password ? { password: vars.password } : undefined,
        )
        .then((r) => r.data),
  });
}

// Data is read live from the CRM, so a new mapping shows that provider's leads and
// payouts immediately: refresh everything that depends on the mapping.
function invalidateAfterMapping(qc: QueryClient, providerId: string, brand: Brand) {
  qc.invalidateQueries({ queryKey: ["provider-sources", providerId] });
  qc.invalidateQueries({ queryKey: ["crm-sources", brand] });
  qc.invalidateQueries({ queryKey: ["admin", "provider", providerId, "payouts"] });
  qc.invalidateQueries({ queryKey: ["admin", "provider", providerId, "payouts-monthly"] });
  qc.invalidateQueries({ queryKey: ["leaderboard"] });
  qc.invalidateQueries({ queryKey: ["admin", "payouts", "unmapped"] });
}

export function useMapSource(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { brand: Brand; crm_source_id: string; source_name?: string }) =>
      api.post<ProviderSourceOut>(`/admin/providers/${id}/sources`, body).then((r) => r.data),
    onSuccess: (_d, vars) => invalidateAfterMapping(qc, id, vars.brand),
  });
}

// Unmap a source (e.g. mapped to the wrong provider). Its leads and payouts leave
// this provider at once and the source can be mapped elsewhere.
export function useUnmapSource(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { mappingId: string; brand: Brand }) =>
      api.delete(`/admin/providers/${id}/sources/${vars.mappingId}`).then(() => undefined),
    onSuccess: (_d, vars) => invalidateAfterMapping(qc, id, vars.brand),
  });
}

// Map several CRM sources to a provider in one go (used right after creating it).
// Each source is its own request; failures (e.g. 409 already mapped) don't stop the rest.
export function useMapSources() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      providerId: string;
      brand: Brand;
      sources: { crm_source_id: string; source_name?: string }[];
    }) => {
      const results = await Promise.allSettled(
        vars.sources.map((s) =>
          api.post<ProviderSourceOut>(`/admin/providers/${vars.providerId}/sources`, {
            brand: vars.brand,
            ...s,
          }),
        ),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      return { mapped: results.length - failed, failed };
    },
    onSettled: (_d, _e, vars) => invalidateAfterMapping(qc, vars.providerId, vars.brand),
  });
}

export function useSaveTargets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (targets: { brand?: Brand | null; metric_key: string; target_value: number }[]) =>
      api.put<TargetOut[]>("/admin/targets", { targets }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["targets"] }),
  });
}

// ---------------- admin management (super-admin only) ----------------
export function useAdmins(enabled = true) {
  return useQuery({
    queryKey: ["admins"],
    queryFn: () => get<AdminOut[]>("/admin/admins"),
    staleTime: STALE,
    enabled,
    retry: false, // company admins get 403 — don't hammer it
  });
}

export function useCreateAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminCreate) =>
      api.post<AdminCreated>("/admin/admins", body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admins"] }),
  });
}
