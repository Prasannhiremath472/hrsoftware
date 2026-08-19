import { useEffect, useState } from 'react';
import { ScrollText, Search } from 'lucide-react';

import api, { extractErrorMessage } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { formatDateTime } from '@/lib/utils';
import type { AuditLogEntry, PaginatedResult } from '@/types';

import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import Pagination from '@/components/shared/Pagination';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SkeletonRows } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrapper } from '@/components/ui/table';

const LIMIT = 25;

export default function AuditLogs() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      try {
        const res = await api.get<{ data: PaginatedResult<AuditLogEntry> }>('/audit-logs', {
          params: {
            page,
            limit: LIMIT,
            action: action || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
          },
        });
        if (ignore) return;
        setRows(res.data.data.rows);
        setTotal(res.data.data.total);
      } catch (err) {
        if (!ignore) toast.error(extractErrorMessage(err, 'Failed to load audit logs'));
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    // Debounced so typing in the action filter doesn't fire a request per keystroke.
    const t = setTimeout(load, 250);
    return () => {
      ignore = true;
      clearTimeout(t);
    };
  }, [page, action, dateFrom, dateTo]);

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Immutable record of every privileged action taken in this portal."
      />

      <Card>
        <CardContent className="border-b border-border pb-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <div className="space-y-2">
              <Label htmlFor="audit-action">Action</Label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="audit-action"
                  className="pl-9 sm:max-w-xs"
                  placeholder="e.g. LOGIN"
                  value={action}
                  onChange={(e) => {
                    setAction(e.target.value.toUpperCase());
                    setPage(1);
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="audit-from">From</Label>
              <Input
                id="audit-from"
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="audit-to">To</Label>
              <Input
                id="audit-to"
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
              />
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
              icon={ScrollText}
              title="No audit log entries found"
              message="Try widening the date range or clearing the action filter."
            />
          </CardContent>
        ) : (
          <>
            <TableWrapper>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap tabular text-muted-foreground">
                        {formatDateTime(r.created_at)}
                      </TableCell>
                      <TableCell className="font-medium">{r.user_name || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="info" className="font-mono">
                          {r.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {r.entity_type}
                        {r.entity_id ? ` #${r.entity_id}` : ''}
                      </TableCell>
                      <TableCell className="max-w-96 min-w-48">{r.description}</TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                        {r.ip_address || '—'}
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
