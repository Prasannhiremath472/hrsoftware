import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2, Users } from 'lucide-react';

import api, { extractErrorMessage } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { formatDate, humanize } from '@/lib/utils';
import { CANDIDATE_STATUSES, type Candidate, type Coordinator, type PaginatedResult } from '@/types';

import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import Pagination from '@/components/shared/Pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { SkeletonRows } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrapper } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle } from '@/components/ui/dialog';

const ALL = 'ALL';
const LIMIT = 20;

export default function Candidates() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Candidate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(ALL);
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [coordinatorId, setCoordinatorId] = useState(ALL);
  const [deleteTarget, setDeleteTarget] = useState<Candidate | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ data: Coordinator[] }>('/coordinators')
      .then((res) => {
        if (!cancelled) setCoordinators(res.data.data);
      })
      .catch(() => {
        /* filter list is non-critical — the page still works without it */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      try {
        const res = await api.get<{ data: PaginatedResult<Candidate> }>('/candidates', {
          params: {
            page,
            limit: LIMIT,
            search: search || undefined,
            status: status !== ALL ? status : undefined,
            coordinatorId: coordinatorId !== ALL ? coordinatorId : undefined,
          },
        });
        if (ignore) return;
        setRows(res.data.data.rows);
        setTotal(res.data.data.total);
      } catch (err) {
        if (!ignore) toast.error(extractErrorMessage(err, 'Failed to load candidates'));
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    // Debounced so typing in the search box doesn't fire a request per keystroke.
    const t = setTimeout(load, 250);
    return () => {
      ignore = true;
      clearTimeout(t);
    };
  }, [page, search, status, coordinatorId]);

  // Any filter change invalidates the current page offset.
  useEffect(() => {
    setPage(1);
  }, [search, status, coordinatorId]);

  const hasFilters = Boolean(search) || status !== ALL || coordinatorId !== ALL;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/candidates/${deleteTarget.id}`);
      toast.success(`${deleteTarget.full_name} deleted`, 'Deleted candidates can be restored from Trash.');
      setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setTotal((prev) => Math.max(0, prev - 1));
      setDeleteTarget(null);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to delete candidate'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Candidates"
        description={total > 0 ? `${total} candidate${total === 1 ? '' : 's'} matching the current filters.` : undefined}
        actions={
          <Button onClick={() => navigate('/candidates/new')}>
            <Plus aria-hidden="true" />
            Add Candidate
          </Button>
        }
      />

      <Card>
        <CardContent className="border-b border-border pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1 lg:max-w-sm">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                className="pl-9"
                placeholder="Search name, mobile, email, candidate #…"
                aria-label="Search candidates"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="sm:w-52" aria-label="Filter by status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All Statuses</SelectItem>
                  {CANDIDATE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {humanize(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={coordinatorId} onValueChange={setCoordinatorId}>
                <SelectTrigger className="sm:w-52" aria-label="Filter by coordinator">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All Coordinators</SelectItem>
                  {coordinators.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>

        {loading ? (
          <CardContent>
            <SkeletonRows count={8} />
          </CardContent>
        ) : rows.length === 0 ? (
          <CardContent>
            <EmptyState
              icon={Users}
              title="No candidates found"
              message={
                hasFilters
                  ? 'No candidates match the current filters. Try widening your search.'
                  : 'Register your first candidate to get started.'
              }
              action={
                <Button asChild className="mt-3">
                  <Link to="/candidates/new">
                    <Plus aria-hidden="true" />
                    Add Candidate
                  </Link>
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
                    <TableHead>Candidate #</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Coordinator</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Step</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead className="text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="whitespace-nowrap font-mono text-xs">{c.candidate_number}</TableCell>
                      <TableCell className="font-medium">{c.full_name}</TableCell>
                      <TableCell className="whitespace-nowrap tabular">{c.mobile}</TableCell>
                      <TableCell className="text-muted-foreground">{c.coordinator_name || '—'}</TableCell>
                      <TableCell>
                        <StatusBadge status={c.status} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {humanize(c.current_step)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(c.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link to={`/candidates/${c.id}`}>Open</Link>
                          </Button>
                          {c.status === 'COMPLETED' && (
                            <Button asChild variant="ghost" size="sm">
                              <Link to={`/candidates/${c.id}/summary`}>Summary</Link>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(c)}
                          >
                            <Trash2 aria-hidden="true" />
                            <span className="sr-only">Delete {c.full_name}</span>
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

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete candidate?</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{deleteTarget?.full_name}</span> ({deleteTarget?.candidate_number})
              will be removed from the candidates list. This does not permanently delete their data — it can be
              restored later from Trash.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} loading={deleting}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
