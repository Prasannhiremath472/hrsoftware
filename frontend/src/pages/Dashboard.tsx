import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, UserCog, Users } from 'lucide-react';

import api, { extractErrorMessage } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { formatDate, humanize } from '@/lib/utils';
import type { Candidate, CoordinatorReportRow, MonthlyRegistrationRow, PaginatedResult } from '@/types';

import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import AnimatedCounter from '@/components/shared/AnimatedCounter';
import Pagination from '@/components/shared/Pagination';
import BarChart from '@/components/charts/BarChart';
import PieChart from '@/components/charts/PieChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SkeletonRows, SkeletonStat } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrapper } from '@/components/ui/table';

interface StatDef {
  key: keyof Counts;
  label: string;
  /** Emphasised tiles lead the row; the rest are secondary detail. */
  accent?: 'primary' | 'success' | 'warning' | 'destructive';
}

interface Counts {
  total: number;
  completed: number;
  kycPending: number;
  documentPending: number;
  docVerificationPending: number;
  biometricPending: number;
  rejected: number;
}

const STAT_DEFS: StatDef[] = [
  { key: 'total', label: 'Total Candidates', accent: 'primary' },
  { key: 'completed', label: 'Completed', accent: 'success' },
  { key: 'kycPending', label: 'KYC Pending', accent: 'warning' },
  { key: 'documentPending', label: 'Documents Pending', accent: 'warning' },
  { key: 'docVerificationPending', label: 'Doc. Verification Pending' },
  { key: 'biometricPending', label: 'Biometric Pending' },
  { key: 'rejected', label: 'Rejected', accent: 'destructive' },
];

const ACCENT_CLASS: Record<NonNullable<StatDef['accent']>, string> = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
};

const COORDINATORS_LIMIT = 8;
const RECENT_LIMIT = 8;

export default function Dashboard() {
  const shouldReduceMotion = useReducedMotion();
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [monthly, setMonthly] = useState<MonthlyRegistrationRow[]>([]);

  // Coordinator-wise stats table — independently paginated.
  const [coordinators, setCoordinators] = useState<CoordinatorReportRow[]>([]);
  const [coordinatorsTotal, setCoordinatorsTotal] = useState(0);
  const [coordinatorsPage, setCoordinatorsPage] = useState(1);
  const [coordinatorsLoading, setCoordinatorsLoading] = useState(true);

  // Recent candidates table — independently paginated (separate from the
  // full snapshot below, which only powers the stat tiles and pie chart).
  const [recent, setRecent] = useState<Candidate[]>([]);
  const [recentTotal, setRecentTotal] = useState(0);
  const [recentPage, setRecentPage] = useState(1);
  const [recentLoading, setRecentLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      try {
        const [candRes, monthlyRes] = await Promise.all([
          api.get<{ data: PaginatedResult<Candidate> }>('/candidates', { params: { limit: 200 } }),
          api.get<{ data: MonthlyRegistrationRow[] }>('/reports/monthly-registrations'),
        ]);
        if (ignore) return;
        setCandidates(candRes.data.data.rows);
        setMonthly(monthlyRes.data.data);
      } catch (err) {
        if (!ignore) toast.error(extractErrorMessage(err, 'Failed to load dashboard'));
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    setCoordinatorsLoading(true);
    api
      .get<{ data: PaginatedResult<CoordinatorReportRow> }>('/reports/coordinators', {
        params: { page: coordinatorsPage, limit: COORDINATORS_LIMIT },
      })
      .then((res) => {
        if (ignore) return;
        setCoordinators(res.data.data.rows);
        setCoordinatorsTotal(res.data.data.total);
      })
      .catch((err) => {
        if (!ignore) toast.error(extractErrorMessage(err, 'Failed to load coordinator stats'));
      })
      .finally(() => {
        if (!ignore) setCoordinatorsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [coordinatorsPage]);

  useEffect(() => {
    let ignore = false;
    setRecentLoading(true);
    api
      .get<{ data: PaginatedResult<Candidate> }>('/candidates', {
        params: { page: recentPage, limit: RECENT_LIMIT },
      })
      .then((res) => {
        if (ignore) return;
        setRecent(res.data.data.rows);
        setRecentTotal(res.data.data.total);
      })
      .catch((err) => {
        if (!ignore) toast.error(extractErrorMessage(err, 'Failed to load recent candidates'));
      })
      .finally(() => {
        if (!ignore) setRecentLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [recentPage]);

  const counts = useMemo<Counts>(() => {
    const by = (status: string) => candidates.filter((c) => c.status === status).length;
    return {
      total: candidates.length,
      completed: by('COMPLETED'),
      kycPending: by('KYC_PENDING'),
      documentPending: by('DOCUMENT_PENDING'),
      docVerificationPending: by('DOCUMENT_VERIFICATION_PENDING'),
      biometricPending: by('BIOMETRIC_PENDING'),
      rejected: by('REJECTED'),
    };
  }, [candidates]);

  const statusData = useMemo(() => {
    const tally = candidates.reduce<Record<string, number>>((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(tally).map(([status, total]) => ({ status: humanize(status), total }));
  }, [candidates]);

  if (loading) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Onboarding pipeline at a glance." />
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonStat key={i} />
          ))}
        </div>
        <Card>
          <CardContent>
            <SkeletonRows count={6} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Onboarding pipeline at a glance."
        actions={
          <Button asChild>
            <Link to="/candidates/new">
              Add Candidate
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      {/* Stat tiles */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STAT_DEFS.map((stat, i) => (
          <motion.div
            key={stat.key}
            initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: shouldReduceMotion ? 0 : i * 0.04, ease: 'easeOut' }}
          >
            <Card className="h-full">
              <CardContent className="p-5">
                <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground" title={stat.label}>
                  {stat.label}
                </p>
                <p
                  className={`mt-2 text-3xl font-semibold tabular leading-none ${
                    stat.accent ? ACCENT_CLASS[stat.accent] : 'text-foreground'
                  }`}
                >
                  <AnimatedCounter value={counts[stat.key]} />
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChart data={statusData} labelKey="status" valueKey="total" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Monthly Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={monthly} labelKey="month" valueKey="total" />
          </CardContent>
        </Card>
      </div>

      {/* Coordinator-wise stats */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Coordinator-wise Stats</CardTitle>
        </CardHeader>
        {coordinatorsLoading ? (
          <CardContent>
            <SkeletonRows count={4} />
          </CardContent>
        ) : coordinators.length === 0 ? (
          <CardContent>
            <EmptyState icon={UserCog} title="No coordinators yet" message="Add a coordinator to start assigning candidates." />
          </CardContent>
        ) : (
          <>
            <TableWrapper>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Coordinator</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total Candidates</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coordinators.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>
                        <StatusBadge status={c.status} />
                      </TableCell>
                      <TableCell className="text-right tabular">{c.total_candidates}</TableCell>
                      <TableCell className="text-right tabular">{c.completed_candidates}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableWrapper>
            <CardContent className="pt-0">
              <Pagination
                page={coordinatorsPage}
                limit={COORDINATORS_LIMIT}
                total={coordinatorsTotal}
                onPageChange={setCoordinatorsPage}
              />
            </CardContent>
          </>
        )}
      </Card>

      {/* Recent candidates */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Recent Candidates</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/candidates">
              View all
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </CardHeader>
        {recentLoading ? (
          <CardContent>
            <SkeletonRows count={4} />
          </CardContent>
        ) : recent.length === 0 ? (
          <CardContent>
            <EmptyState
              icon={Users}
              title="No candidates yet"
              message="Register your first candidate to get started."
              action={
                <Button asChild className="mt-3">
                  <Link to="/candidates/new">Add Candidate</Link>
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
                    <TableHead>Status</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead className="text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.candidate_number}</TableCell>
                      <TableCell className="font-medium">{c.full_name}</TableCell>
                      <TableCell className="tabular">{c.mobile}</TableCell>
                      <TableCell>
                        <StatusBadge status={c.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(c.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/candidates/${c.id}`}>Open</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableWrapper>
            <CardContent className="pt-0">
              <Pagination page={recentPage} limit={RECENT_LIMIT} total={recentTotal} onPageChange={setRecentPage} />
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
