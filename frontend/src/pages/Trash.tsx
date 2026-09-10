import { useEffect, useState } from 'react';
import { RotateCcw, Search, Trash2 } from 'lucide-react';

import api, { extractErrorMessage } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import type { Candidate, PaginatedResult } from '@/types';

import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import Pagination from '@/components/shared/Pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { SkeletonRows } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrapper } from '@/components/ui/table';

const LIMIT = 20;

export default function Trash() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Candidate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [restoringId, setRestoringId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: PaginatedResult<Candidate> }>('/candidates', {
        params: { page, limit: LIMIT, search: search || undefined, deleted: true },
      });
      setRows(res.data.data.rows);
      setTotal(res.data.data.total);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to load deleted candidates'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (ignore) return;
      await load();
    })();
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load();
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleRestore = async (candidate: Candidate) => {
    setRestoringId(candidate.id);
    try {
      await api.post(`/candidates/${candidate.id}/restore`);
      toast.success(`${candidate.full_name} restored`, 'They are back in the main candidates list.');
      setRows((prev) => prev.filter((r) => r.id !== candidate.id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to restore candidate'));
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Trash"
        description={
          total > 0
            ? `${total} deleted candidate${total === 1 ? '' : 's'}. Restore to bring them back.`
            : 'Deleted candidates appear here and can be restored.'
        }
      />

      <Card>
        <CardContent className="border-b border-border pb-4">
          <div className="relative max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              className="pl-9"
              placeholder="Search name, mobile, email, candidate #…"
              aria-label="Search deleted candidates"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>

        {loading ? (
          <CardContent>
            <SkeletonRows count={8} />
          </CardContent>
        ) : rows.length === 0 ? (
          <CardContent>
            <EmptyState
              icon={Trash2}
              title="Trash is empty"
              message={
                search
                  ? 'No deleted candidates match your search.'
                  : 'Candidates you delete from the Candidates page will show up here.'
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
                    <TableHead>Status</TableHead>
                    <TableHead>Deleted</TableHead>
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
                      <TableCell>
                        <StatusBadge status={c.status} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {c.deleted_at ? formatDate(c.deleted_at) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(c)}
                          loading={restoringId === c.id}
                        >
                          <RotateCcw aria-hidden="true" />
                          Restore
                        </Button>
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
    </div>
  );
}
