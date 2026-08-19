import { useCallback, useEffect, useState } from 'react';
import { BarChart3, Download } from 'lucide-react';

import api, { buildAuthedUrl, extractErrorMessage } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { titleizeColumn } from '@/lib/utils';
import { REPORT_DEFS, type PaginatedResult, type ReportKey, type ReportRow } from '@/types';

import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import Pagination from '@/components/shared/Pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SkeletonRows } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrapper } from '@/components/ui/table';

const LIMIT = 20;

export default function Reports() {
  const [active, setActive] = useState<ReportKey>('candidates');
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(
    async (key: ReportKey, pageToLoad: number) => {
      setActive(key);
      setLoading(true);
      try {
        const res = await api.get<{ data: PaginatedResult<ReportRow> }>(`/reports/${key}`, {
          params: { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, page: pageToLoad, limit: LIMIT },
        });
        setRows(res.data.data.rows);
        setTotal(res.data.data.total);
      } catch (err) {
        toast.error(extractErrorMessage(err, 'Failed to load report'));
        setRows([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [dateFrom, dateTo]
  );

  useEffect(() => {
    // Initial load only — subsequent loads are driven by tab clicks and "Apply".
    load('candidates', 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * CSV export streams from the API, so it opens in a new tab with the token as a
   * query param rather than going through the axios instance.
   */
  const exportCsv = () => {
    const params: Record<string, string> = { format: 'csv' };
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    window.open(buildAuthedUrl(`/reports/${active}`, params), '_blank');
  };

  const columns = rows.length ? Object.keys(rows[0]) : [];
  const activeLabel = REPORT_DEFS.find((r) => r.key === active)?.label ?? 'Report';

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Filter by registration date, then export the current view as CSV."
        actions={
          <Button onClick={exportCsv} disabled={rows.length === 0}>
            <Download aria-hidden="true" />
            Export CSV
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4 border-b border-border pb-4">
          <Tabs
            value={active}
            onValueChange={(v) => {
              setPage(1);
              load(v as ReportKey, 1);
            }}
          >
            <TabsList>
              {REPORT_DEFS.map((r) => (
                <TabsTrigger key={r.key} value={r.key}>
                  {r.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">From</Label>
              <Input id="dateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">To</Label>
              <Input id="dateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setPage(1);
                load(active, 1);
              }}
            >
              Apply
            </Button>
          </div>
        </CardContent>

        {loading ? (
          <CardContent>
            <SkeletonRows count={8} />
          </CardContent>
        ) : rows.length === 0 ? (
          <CardContent>
            <EmptyState
              icon={BarChart3}
              title="No data for this report"
              message={`The ${activeLabel.toLowerCase()} returned no rows for the selected date range.`}
            />
          </CardContent>
        ) : (
          <>
            <TableWrapper>
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((c) => (
                      <TableHead key={c}>{titleizeColumn(c)}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={i}>
                      {columns.map((c) => (
                        <TableCell key={c} className="whitespace-nowrap">
                          {row[c] === null || row[c] === undefined || row[c] === '' ? '—' : String(row[c])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableWrapper>
            <CardContent className="pt-0">
              <Pagination page={page} limit={LIMIT} total={total} onPageChange={(p) => { setPage(p); load(active, p); }} />
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
