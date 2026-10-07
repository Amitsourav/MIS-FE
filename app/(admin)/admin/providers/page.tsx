"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Loader2, ChevronRight, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useProviders,
  useCreateProvider,
  useUpdateProvider,
  useMe,
  useCrmSources,
  useMapSources,
} from "@/lib/queries";
import { errorMessage } from "@/lib/api";
import { useAdminCompany, effectiveCompany } from "@/lib/admin-company";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BrandChip } from "@/components/stage-badge";
import { BRAND_LABELS } from "@/lib/tokens";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TableRowsSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { QueryError } from "@/components/query-error";
import { toast } from "@/components/ui/sonner";
import { date } from "@/lib/format";
import type { Brand, ProviderOut } from "@/lib/types";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  contact_email: z.string().email("Invalid email").optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

// Checkbox list of the company's CRM sources, shown once a company is known.
// Sources already mapped to another provider are shown but can't be picked.
function SourcePicker({
  brand,
  selected,
  onToggle,
}: {
  brand: Brand;
  selected: Record<string, string | null>;
  onToggle: (id: string, name: string | null) => void;
}) {
  const crm = useCrmSources(brand);
  const { data, isLoading } = crm;
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const sources = (data ?? []).filter(
    (s) =>
      !needle ||
      (s.name ?? "").toLowerCase().includes(needle) ||
      s.crm_source_id.toLowerCase().includes(needle),
  );
  const count = Object.keys(selected).length;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>CRM sources ({BRAND_LABELS[brand]})</Label>
        <span className="text-xs text-muted-foreground">
          {count > 0 ? `${count} selected` : "Optional"}
        </span>
      </div>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search sources…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-8"
        />
      </div>
      <div className="max-h-56 overflow-y-auto rounded-md border">
        {crm.isError ? (
          <QueryError className="border-0 py-6" error={crm.error} onRetry={() => void crm.refetch()} />
        ) : isLoading ? (
          <div className="space-y-2 p-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : sources.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">
            {needle ? "No sources match." : "No CRM sources found for this company."}
          </p>
        ) : (
          <ul className="divide-y">
            {sources.map((s) => {
              const taken = !!s.already_mapped_to;
              return (
                <li key={s.crm_source_id}>
                  <label
                    className={
                      taken
                        ? "flex cursor-not-allowed items-center gap-3 px-3 py-2 opacity-60"
                        : "flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/50"
                    }
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      disabled={taken}
                      checked={s.crm_source_id in selected}
                      onChange={() => onToggle(s.crm_source_id, s.name)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{s.name ?? s.crm_source_id}</span>
                      {taken && (
                        <span className="block text-xs text-muted-foreground">
                          Mapped to {s.already_mapped_to}
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function ActiveToggle({ provider }: { provider: ProviderOut }) {
  const update = useUpdateProvider(provider.id);
  return (
    <Switch
      checked={provider.is_active}
      disabled={update.isPending}
      onCheckedChange={(checked) =>
        update.mutate(
          { is_active: checked },
          {
            onSuccess: () => toast.success(`${provider.name} ${checked ? "activated" : "deactivated"}`),
            onError: (e) => toast.error(errorMessage(e)),
          },
        )
      }
    />
  );
}

export default function ProvidersPage() {
  const providersQuery = useProviders();
  const { data, isLoading } = providersQuery;
  const { data: me } = useMe();
  const { company } = useAdminCompany();
  const create = useCreateProvider();
  const mapSources = useMapSources();
  const [open, setOpen] = useState(false);
  const [formBrand, setFormBrand] = useState<Brand | "">("");
  // crm_source_id -> source name, for the sources ticked in the dialog.
  const [selected, setSelected] = useState<Record<string, string | null>>({});
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Super-admins (brand null) must pick a company; company admins inherit theirs.
  const isSuperAdmin = me?.role === "admin" && me?.brand == null;
  const scope = effectiveCompany(me?.brand, company);
  const providers =
    scope === "both" ? data : data?.filter((p) => p.brand === scope);
  // Company whose sources to offer: the picked one for super-admins, else the admin's own.
  const sourceBrand: Brand | "" = isSuperAdmin ? formBrand : me?.brand ?? "";

  function toggleSource(id: string, name: string | null) {
    setSelected((prev) => {
      const next = { ...prev };
      if (id in next) delete next[id];
      else next[id] = name;
      return next;
    });
  }

  function resetForm() {
    reset();
    setFormBrand("");
    setSelected({});
  }

  function onSubmit(values: FormValues) {
    if (isSuperAdmin && !formBrand) {
      toast.error("Pick a company for this provider.");
      return;
    }
    create.mutate(
      {
        name: values.name,
        contact_email: values.contact_email || undefined,
        // Only super-admins send brand; company admins omit it (backend forces theirs).
        ...(isSuperAdmin ? { brand: formBrand as Brand } : {}),
      },
      {
        onSuccess: (provider) => {
          const sources = Object.entries(selected).map(([crm_source_id, name]) => ({
            crm_source_id,
            source_name: name ?? undefined,
          }));
          resetForm();
          setOpen(false);
          if (sources.length === 0) {
            toast.success("Provider created");
            return;
          }
          mapSources.mutate(
            { providerId: provider.id, brand: provider.brand, sources },
            {
              onSuccess: ({ mapped, failed }) => {
                if (failed === 0) {
                  toast.success(`Provider created with ${mapped} source${mapped === 1 ? "" : "s"}`);
                } else {
                  toast.error(
                    `Provider created, but ${failed} of ${sources.length} sources couldn't be mapped. Map them from the provider page.`,
                  );
                }
              },
            },
          );
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Providers</h1>
          <p className="text-sm text-muted-foreground">Manage lead providers and their access.</p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              New provider
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit(onSubmit)}>
              <DialogHeader>
                <DialogTitle>New provider</DialogTitle>
                <DialogDescription>Create a lead provider organization.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {isSuperAdmin && (
                  <div className="space-y-1.5">
                    <Label>Company</Label>
                    <Select
                      value={formBrand}
                      onValueChange={(v) => {
                        setFormBrand(v as Brand);
                        setSelected({}); // sources belong to one company
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a company" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fmc">{BRAND_LABELS.fmc}</SelectItem>
                        <SelectItem value="av">{BRAND_LABELS.av}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" {...register("name")} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact_email">Contact email (optional)</Label>
                  <Input id="contact_email" type="email" {...register("contact_email")} />
                  {errors.contact_email && (
                    <p className="text-xs text-destructive">{errors.contact_email.message}</p>
                  )}
                </div>
                {sourceBrand && (
                  <SourcePicker brand={sourceBrand} selected={selected} onToggle={toggleSource} />
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={create.isPending || mapSources.isPending}>
                  {(create.isPending || mapSources.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-24">Company</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-24">Active</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {providersQuery.isError && !data ? (
              <TableRow>
                <TableCell colSpan={6} className="p-0">
                  <QueryError
                    className="border-0"
                    error={providersQuery.error}
                    onRetry={() => void providersQuery.refetch()}
                  />
                </TableCell>
              </TableRow>
            ) : isLoading ? (
              <TableRowsSkeleton rows={5} cols={6} />
            ) : (providers?.length ?? 0) === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="p-0">
                  <EmptyState className="border-0" title="No providers yet" description="Create your first provider to get started." />
                </TableCell>
              </TableRow>
            ) : (
              providers!.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/providers/${p.id}`} className="hover:underline">
                      {p.name}
                    </Link>
                    {!p.is_active && (
                      <Badge variant="secondary" className="ml-2 text-[10px]">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <BrandChip brand={p.brand} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.contact_email ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{date(p.created_at)}</TableCell>
                  <TableCell>
                    <ActiveToggle provider={p} />
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/providers/${p.id}`}>
                      <Button variant="ghost" size="icon">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
