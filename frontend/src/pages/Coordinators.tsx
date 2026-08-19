import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Plus, Search, UserCog } from 'lucide-react';

import api, { extractErrorMessage } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import type { Coordinator, PaginatedResult } from '@/types';

import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import Pagination from '@/components/shared/Pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SkeletonRows } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrapper } from '@/components/ui/table';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const coordinatorSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(150, 'Name is too long'),
  mobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  email: z.union([z.string().trim().email('Enter a valid email address'), z.literal('')]),
  employeeCode: z.string().trim().max(50, 'Employee code is too long'),
  location: z.string().trim().max(150, 'Location is too long'),
});

type CoordinatorFormValues = z.infer<typeof coordinatorSchema>;

const EMPTY_FORM: CoordinatorFormValues = {
  name: '',
  mobile: '',
  email: '',
  employeeCode: '',
  location: '',
};

const ALL = 'ALL';
const LIMIT = 20;

export default function Coordinators() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Coordinator[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(ALL);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Coordinator | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<Coordinator | null>(null);

  const form = useForm<CoordinatorFormValues>({
    resolver: zodResolver(coordinatorSchema),
    defaultValues: EMPTY_FORM,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: PaginatedResult<Coordinator> }>('/coordinators', {
        params: {
          page,
          limit: LIMIT,
          search: search || undefined,
          status: statusFilter === ALL ? undefined : statusFilter,
        },
      });
      setRows(res.data.data.rows);
      setTotal(res.data.data.total);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to load coordinators'));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    // Debounce so typing in the search box doesn't fire a request per keystroke.
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  // Any filter change invalidates the current page offset.
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const openAdd = () => {
    setEditing(null);
    form.reset(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (c: Coordinator) => {
    setEditing(c);
    form.reset({
      name: c.name,
      mobile: c.mobile,
      email: c.email || '',
      employeeCode: c.employee_code || '',
      location: c.location || '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: CoordinatorFormValues) => {
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/coordinators/${editing.id}`, values);
        toast.success('Coordinator updated');
      } else {
        await api.post('/coordinators', values);
        toast.success('Coordinator created');
      }
      setDialogOpen(false);
      await load();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to save coordinator'));
    } finally {
      setSaving(false);
    }
  };

  const confirmToggle = async () => {
    if (!pendingToggle) return;
    const next = pendingToggle.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.patch(`/coordinators/${pendingToggle.id}/status`, { status: next });
      toast.success(`Coordinator ${next === 'ACTIVE' ? 'activated' : 'deactivated'}`);
      setPendingToggle(null);
      await load();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to update status'));
    }
  };

  return (
    <div>
      <PageHeader
        title="Coordinators"
        description="Coordinators are data records only — they have no login access to this portal."
        actions={
          <Button onClick={openAdd}>
            <Plus aria-hidden="true" />
            Add Coordinator
          </Button>
        }
      />

      <Card>
        <CardContent className="border-b border-border pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-xs">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                className="pl-9"
                placeholder="Search name, mobile, email…"
                aria-label="Search coordinators"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="sm:w-48" aria-label="Filter by status">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>

        {loading ? (
          <CardContent>
            <SkeletonRows count={6} />
          </CardContent>
        ) : rows.length === 0 ? (
          <CardContent>
            <EmptyState
              icon={UserCog}
              title="No coordinators found"
              message="Add a coordinator to start assigning candidates."
              action={
                <Button className="mt-3" onClick={openAdd}>
                  <Plus aria-hidden="true" />
                  Add Coordinator
                </Button>
              }
            />
          </CardContent>
        ) : (
          <>
            <TableWrapper>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Employee Code</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Students</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="tabular">{c.mobile}</TableCell>
                      <TableCell className="max-w-52 truncate text-muted-foreground" title={c.email || undefined}>
                        {c.email || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{c.employee_code || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{c.location || '—'}</TableCell>
                      <TableCell className="text-right tabular">{c.candidate_count}</TableCell>
                      <TableCell>
                        <StatusBadge status={c.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
                            <Pencil aria-hidden="true" />
                            Edit
                          </Button>
                          <Button
                            variant={c.status === 'ACTIVE' ? 'destructive' : 'success'}
                            size="sm"
                            onClick={() => setPendingToggle(c)}
                          >
                            {c.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableWrapper>
            <CardContent className="pt-0">
              <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />
            </CardContent>
          </>
        )}
      </Card>

      {/* Add / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Coordinator' : 'Add Coordinator'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update this coordinator’s contact and posting details.'
                : 'Create a coordinator record that candidates can be assigned to.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form id="coordinator-form" onSubmit={form.handleSubmit(onSubmit)}>
              <DialogBody className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input autoComplete="name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="mobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile *</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel"
                            maxLength={10}
                            placeholder="10-digit mobile number"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" autoComplete="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="employeeCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee Code</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </DialogBody>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Deactivate / activate confirmation */}
      <ConfirmDialog
        open={Boolean(pendingToggle)}
        onOpenChange={(open) => !open && setPendingToggle(null)}
        title={pendingToggle?.status === 'ACTIVE' ? 'Deactivate coordinator?' : 'Activate coordinator?'}
        description={
          pendingToggle?.status === 'ACTIVE'
            ? `${pendingToggle?.name} will no longer be selectable when registering new candidates. Existing candidate assignments are unchanged.`
            : `${pendingToggle?.name} will become selectable again when registering new candidates.`
        }
        confirmLabel={pendingToggle?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        destructive={pendingToggle?.status === 'ACTIVE'}
        onConfirm={confirmToggle}
      />
    </div>
  );
}
