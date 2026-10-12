"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Plus, Loader2, Copy, Check, KeyRound, Link2, X } from "lucide-react";
import {
  useProvider,
  useUpdateProvider,
  useProviderSources,
  useCreateProviderUser,
  useProviderUsers,
  useResetProviderPassword,
  useUnmapSource,
  useCrmSources,
  useMapSource,
  useAdminProviderPayouts,
  useAdminProviderPayoutsMonthly,
} from "@/lib/queries";
import { errorMessage, statusOf } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BrandChip } from "@/components/stage-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PayoutsPanel } from "@/components/payouts/payouts-panel";
import { EmptyState } from "@/components/empty-state";
import { QueryError } from "@/components/query-error";
import { toast } from "@/components/ui/sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BRAND_LABELS } from "@/lib/tokens";
import { date } from "@/lib/format";
import type {
  Brand,
  PayoutFilters,
  ProviderSourceOut,
  ProviderUserCreated,
  ProviderUserOut,
} from "@/lib/types";

export default function ProviderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const providerQuery = useProvider(id);
  const { data: provider, isLoading } = providerQuery;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/providers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            {isLoading ? <Skeleton className="h-7 w-48" /> : provider?.name ?? "Provider not found"}
            {provider && <BrandChip brand={provider.brand} />}
          </h1>
          <p className="text-sm text-muted-foreground">
            Edit details, manage logins, map CRM sources, and review payouts.
          </p>
        </div>
      </div>

      {providerQuery.isError && !provider ? (
        <QueryError error={providerQuery.error} onRetry={() => void providerQuery.refetch()} />
      ) : !isLoading && !provider ? (
        <EmptyState title="Provider not found" description="It may have been removed." />
      ) : (
        // Inactive tab content unmounts, so payouts are only fetched while that tab is open.
        <Tabs defaultValue="details" className="space-y-4">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
          </TabsList>
          <TabsContent value="details">
            <div className="grid gap-6 lg:grid-cols-2">
              <EditProviderCard id={id} />
              <LoginsCard id={id} />
              <div className="lg:col-span-2">
                <SourcesCard id={id} />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="payouts">
            <PayoutsTab id={id} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function EditProviderCard({ id }: { id: string }) {
  const { data: provider } = useProvider(id);
  const update = useUpdateProvider(id);
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  if (!provider) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const nameVal = name ?? provider.name;
  const emailVal = email ?? provider.contact_email ?? "";

  function save() {
    update.mutate(
      { name: nameVal, contact_email: emailVal || undefined },
      {
        onSuccess: () => toast.success("Provider updated"),
        onError: (e) => toast.error(errorMessage(e)),
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="p-name">Name</Label>
          <Input id="p-name" value={nameVal} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-email">Contact email</Label>
          <Input id="p-email" type="email" value={emailVal} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <p className="text-sm font-medium">Active</p>
            <p className="text-xs text-muted-foreground">Inactive providers cannot log in.</p>
          </div>
          <Switch
            checked={provider.is_active}
            onCheckedChange={(checked) =>
              update.mutate(
                { is_active: checked },
                { onError: (e) => toast.error(errorMessage(e)) },
              )
            }
          />
        </div>
        <Button onClick={save} disabled={update.isPending}>
          {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </CardContent>
    </Card>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Could not copy");
        }
      }}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

function TempPassword({ value }: { value: string }) {
  return (
    <div className="mt-2 rounded-md bg-amber-50 p-2.5 text-amber-900">
      <p className="text-xs font-medium">Temporary password — shown once</p>
      <div className="mt-1.5 flex items-center gap-2">
        <code className="flex-1 rounded bg-white px-2 py-1 font-mono text-sm">{value}</code>
        <CopyButton value={value} />
      </div>
    </div>
  );
}

function LoginsCard({ id }: { id: string }) {
  const usersQuery = useProviderUsers(id);
  const { data: users, isLoading } = usersQuery;
  const createUser = useCreateProviderUser(id);
  const [open, setOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  // One-time passwords from a create or reset this session, keyed by user id.
  const [tempPasswords, setTempPasswords] = useState<Record<string, string>>({});
  const [resetting, setResetting] = useState<ProviderUserOut | null>(null);

  function rememberPassword(user: ProviderUserCreated) {
    const pw = user.temp_password;
    if (pw) setTempPasswords((prev) => ({ ...prev, [user.id]: pw }));
  }

  function submit() {
    if (!emailInput) return;
    createUser.mutate(
      { email: emailInput },
      {
        onSuccess: (user) => {
          rememberPassword(user);
          setEmailInput("");
          setOpen(false);
          toast.success("Login created — copy the temporary password now.");
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Logins</CardTitle>
          <CardDescription>Portal accounts for this provider.</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Create login
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create login</DialogTitle>
              <DialogDescription>
                A one-time temporary password is generated and shown once.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5 py-4">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button onClick={submit} disabled={createUser.isPending || !emailInput}>
                {createUser.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-3">
        {usersQuery.isError && !users ? (
          <QueryError
            className="py-6"
            error={usersQuery.error}
            onRetry={() => void usersQuery.refetch()}
          />
        ) : isLoading ? (
          <Skeleton className="h-14 w-full" />
        ) : (users?.length ?? 0) === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <KeyRound className="h-4 w-4" />
            No logins yet. Create one to give this provider portal access.
          </p>
        ) : (
          users!.map((u) => (
            <div key={u.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{u.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {u.is_active ? "Active" : "Deactivated"} · created {date(u.created_at)}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setResetting(u)}>
                  <KeyRound className="h-4 w-4" />
                  Reset password
                </Button>
              </div>
              {tempPasswords[u.id] && <TempPassword value={tempPasswords[u.id]} />}
            </div>
          ))
        )}
      </CardContent>
      <ResetPasswordDialog
        providerId={id}
        user={resetting}
        onClose={() => setResetting(null)}
        onReset={rememberPassword}
      />
    </Card>
  );
}

// Generate a password (shown once) or set one. Signs out anyone using the old one.
function ResetPasswordDialog({
  providerId,
  user,
  onClose,
  onReset,
}: {
  providerId: string;
  user: ProviderUserOut | null;
  onClose: () => void;
  onReset: (user: ProviderUserCreated) => void;
}) {
  const reset = useResetProviderPassword(providerId);
  const [password, setPassword] = useState("");
  const tooShort = password.length > 0 && password.length < 8;

  function close() {
    setPassword("");
    onClose();
  }

  function submit() {
    if (!user || tooShort) return;
    reset.mutate(
      { userId: user.id, password: password || undefined },
      {
        onSuccess: (updated) => {
          onReset(updated);
          toast.success(
            updated.temp_password
              ? "Password reset — copy the temporary password now."
              : "Password reset.",
          );
          close();
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    );
  }

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            {user?.email} will be signed out everywhere and must use the new password.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 py-4">
          <Label htmlFor="reset-password">New password (optional)</Label>
          <Input
            id="reset-password"
            type="text"
            autoComplete="off"
            placeholder="Leave blank to generate one"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {tooShort ? (
            <p className="text-xs text-destructive">At least 8 characters.</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              A generated password is shown once, here on this page.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={reset.isPending || tooShort}>
            {reset.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Reset password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SourcesCard({ id }: { id: string }) {
  const mappingsQuery = useProviderSources(id);
  const { data: mappings, isLoading: loadingMappings } = mappingsQuery;
  const [brand, setBrand] = useState<Brand | "">("");
  const crmQuery = useCrmSources(brand);
  const { data: crmSources, isLoading: loadingCrm } = crmQuery;
  const mapSource = useMapSource(id);
  const unmapSource = useUnmapSource(id);
  const [removing, setRemoving] = useState<ProviderSourceOut | null>(null);

  function unmap() {
    if (!removing) return;
    unmapSource.mutate(
      { mappingId: removing.id, brand: removing.brand },
      {
        onSuccess: () => {
          toast.success("Source removed");
          setRemoving(null);
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    );
  }

  function map(crmSourceId: string, sourceName: string | null) {
    if (!brand) return;
    mapSource.mutate(
      { brand, crm_source_id: crmSourceId, source_name: sourceName ?? undefined },
      {
        onSuccess: () => toast.success("Source mapped"),
        onError: (e) => {
          if (statusOf(e) === 409) toast.error("That source is already mapped to another provider.");
          else toast.error(errorMessage(e));
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          CRM Sources
        </CardTitle>
        <CardDescription>Map CRM lead sources to this provider so their leads are attributed.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current mappings */}
        <div>
          <p className="mb-2 text-sm font-medium">Current mappings</p>
          {mappingsQuery.isError && !mappings ? (
            <QueryError
              className="py-6"
              error={mappingsQuery.error}
              onRetry={() => void mappingsQuery.refetch()}
            />
          ) : loadingMappings ? (
            <Skeleton className="h-10 w-full" />
          ) : (mappings?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No sources mapped yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {mappings!.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-2 rounded-md border bg-muted/40 py-1 pl-2.5 pr-1 text-sm"
                >
                  <BrandChip brand={m.brand} />
                  {m.source_name ?? m.crm_source_id}
                  <button
                    type="button"
                    title="Remove source"
                    aria-label={`Remove ${m.source_name ?? m.crm_source_id}`}
                    onClick={() => setRemoving(m)}
                    className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <Dialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove source</DialogTitle>
              <DialogDescription>
                Leads and payouts from{" "}
                <span className="font-medium text-foreground">
                  {removing?.source_name ?? removing?.crm_source_id}
                </span>{" "}
                will stop showing for this provider straight away. You can map it again, here or
                to another provider.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRemoving(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={unmap} disabled={unmapSource.isPending}>
                {unmapSource.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Remove source
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Map a new source */}
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center gap-3">
            <Label className="text-sm">Add from brand</Label>
            <Select value={brand} onValueChange={(v) => setBrand(v as Brand)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select a brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fmc">{BRAND_LABELS.fmc}</SelectItem>
                <SelectItem value="av">{BRAND_LABELS.av}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {brand && (
            <div className="rounded-md border">
              {crmQuery.isError && !crmSources ? (
                <QueryError
                  className="border-0 py-6"
                  error={crmQuery.error}
                  onRetry={() => void crmQuery.refetch()}
                />
              ) : loadingCrm ? (
                <div className="space-y-2 p-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (crmSources?.length ?? 0) === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No CRM sources found for this brand.</p>
              ) : (
                <ul className="divide-y">
                  {crmSources!.map((s) => {
                    const mappedElsewhere = !!s.already_mapped_to;
                    return (
                      <li
                        key={s.crm_source_id}
                        className="flex items-center justify-between gap-3 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {s.name ?? s.crm_source_id}
                          </p>
                          {mappedElsewhere && (
                            <p className="text-xs text-muted-foreground">
                              Mapped to {s.already_mapped_to}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant={mappedElsewhere ? "outline" : "default"}
                          disabled={mappedElsewhere || mapSource.isPending}
                          onClick={() => map(s.crm_source_id, s.name)}
                        >
                          {mappedElsewhere ? "Mapped" : "Map"}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Same view as the provider's Payout page, minus Export (no admin export endpoint).
// Filter/paging state is local so it never collides with other query params.
function PayoutsTab({ id }: { id: string }) {
  const [filters, setFilters] = useState<PayoutFilters>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const query = useAdminProviderPayouts(id, filters, page, pageSize);
  const monthlyQuery = useAdminProviderPayoutsMonthly(id, filters);

  return (
    <PayoutsPanel
      query={query}
      monthlyQuery={monthlyQuery}
      filters={filters}
      onFiltersChange={(f) => {
        setFilters(f);
        setPage(1);
      }}
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={(n) => {
        setPageSize(n);
        setPage(1);
      }}
    />
  );
}
