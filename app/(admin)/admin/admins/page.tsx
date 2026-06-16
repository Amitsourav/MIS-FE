"use client";

import { useState } from "react";
import { Plus, Loader2, Copy, Check, ShieldCheck, ShieldAlert } from "lucide-react";
import { useMe, useAdmins, useCreateAdmin } from "@/lib/queries";
import { errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableRowsSkeleton } from "@/components/skeletons";
import { EmptyState } from "@/components/empty-state";
import { BrandChip } from "@/components/stage-badge";
import { toast } from "@/components/ui/sonner";
import { date } from "@/lib/format";
import { BRAND_LABELS } from "@/lib/tokens";
import type { AdminCreated, Brand } from "@/lib/types";

// "super" is the UI value for a null-brand (super-admin) scope.
type ScopeChoice = "super" | Brand;

function ScopeBadge({ brand }: { brand: Brand | null }) {
  if (brand == null) {
    return (
      <Badge variant="secondary" className="gap-1">
        <ShieldCheck className="h-3 w-3" />
        Super-admin
      </Badge>
    );
  }
  return <BrandChip brand={brand} />;
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

export default function AdminsPage() {
  const { data: me, isLoading: meLoading } = useMe();
  const isSuperAdmin = me?.role === "admin" && me?.brand == null;

  const { data, isLoading } = useAdmins(isSuperAdmin);
  const create = useCreateAdmin();

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [scope, setScope] = useState<ScopeChoice>("fmc");
  // Admins created this session, with their one-time temp password.
  const [created, setCreated] = useState<AdminCreated[]>([]);

  // Defense-in-depth: middleware redirects company admins, but guard the view too.
  if (!meLoading && !isSuperAdmin) {
    return (
      <EmptyState
        icon={<ShieldAlert className="h-6 w-6" />}
        title="Not available"
        description="Admin management is restricted to super-admins."
      />
    );
  }

  function submit() {
    if (!email) return;
    create.mutate(
      { email, brand: scope === "super" ? null : scope },
      {
        onSuccess: (admin) => {
          setCreated((prev) => [admin, ...prev]);
          setEmail("");
          setScope("fmc");
          setOpen(false);
          toast.success("Admin created — copy the temporary password now.");
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admins</h1>
          <p className="text-sm text-muted-foreground">
            Manage admin accounts. A super-admin sees both companies; a company admin is locked to one.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              New admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New admin</DialogTitle>
              <DialogDescription>
                A one-time temporary password is generated and shown once.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Scope</Label>
                <Select value={scope} onValueChange={(v) => setScope(v as ScopeChoice)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super">Super-admin (both companies)</SelectItem>
                    <SelectItem value="fmc">{BRAND_LABELS.fmc}</SelectItem>
                    <SelectItem value="av">{BRAND_LABELS.av}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={submit} disabled={create.isPending || !email}>
                {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* One-time temp passwords for admins created this session */}
      {created.length > 0 && (
        <div className="space-y-2">
          {created.map((a) =>
            a.temp_password ? (
              <div
                key={a.id}
                className="rounded-md border bg-amber-50 p-3 text-amber-900"
              >
                <p className="text-xs font-medium">
                  Temporary password for {a.email} — shown once
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <code className="flex-1 rounded bg-white px-2 py-1 font-mono text-sm">
                    {a.temp_password}
                  </code>
                  <CopyButton value={a.temp_password} />
                </div>
              </div>
            ) : null,
          )}
        </div>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead className="w-40">Scope</TableHead>
              <TableHead className="w-40">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRowsSkeleton rows={5} cols={3} />
            ) : (data?.length ?? 0) === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="p-0">
                  <EmptyState
                    className="border-0"
                    title="No admins yet"
                    description="Create the first admin to get started."
                  />
                </TableCell>
              </TableRow>
            ) : (
              data!.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.email}</TableCell>
                  <TableCell>
                    <ScopeBadge brand={a.brand} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{date(a.created_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
