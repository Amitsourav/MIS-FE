"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Loader2, ChevronRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useProviders, useCreateProvider, useUpdateProvider, useMe } from "@/lib/queries";
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
import { EmptyState } from "@/components/empty-state";
import { toast } from "@/components/ui/sonner";
import { date } from "@/lib/format";
import type { Brand, ProviderOut } from "@/lib/types";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  contact_email: z.string().email("Invalid email").optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

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
  const { data, isLoading } = useProviders();
  const { data: me } = useMe();
  const { company } = useAdminCompany();
  const create = useCreateProvider();
  const [open, setOpen] = useState(false);
  const [formBrand, setFormBrand] = useState<Brand | "">("");
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
        onSuccess: () => {
          toast.success("Provider created");
          reset();
          setFormBrand("");
          setOpen(false);
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
        <Dialog open={open} onOpenChange={setOpen}>
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
                    <Select value={formBrand} onValueChange={(v) => setFormBrand(v as Brand)}>
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
              </div>
              <DialogFooter>
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
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
            {isLoading ? (
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
