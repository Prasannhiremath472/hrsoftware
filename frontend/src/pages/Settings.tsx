import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';

import api, { extractErrorMessage } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { isFlagOn, SETTING_FLAGS, type AppSettings, type DocumentType, type PaginatedResult } from '@/types';

import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import Pagination from '@/components/shared/Pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SkeletonRows } from '@/components/ui/skeleton';
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

interface NewDocType {
  name: string;
  code: string;
  isMandatory: boolean;
  displayOrder: number;
}

const EMPTY_TYPE: NewDocType = { name: '', code: '', isMandatory: false, displayOrder: 0 };
const LIMIT = 10;

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [docTypes, setDocTypes] = useState<DocumentType[]>([]);
  const [docTypesTotal, setDocTypesTotal] = useState(0);
  const [docTypesPage, setDocTypesPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newType, setNewType] = useState<NewDocType>(EMPTY_TYPE);

  const load = useCallback(async (page: number) => {
    try {
      const [settingsRes, typesRes] = await Promise.all([
        api.get<{ data: AppSettings }>('/settings'),
        api.get<{ data: PaginatedResult<DocumentType> }>('/document-types', { params: { page, limit: LIMIT } }),
      ]);
      setSettings(settingsRes.data.data);
      setDocTypes(typesRes.data.data.rows);
      setDocTypesTotal(typesRes.data.data.total);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to load settings'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(docTypesPage);
  }, [load, docTypesPage]);

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      await api.put('/settings', settings);
      toast.success('Settings updated');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to save settings'));
    } finally {
      setSaving(false);
    }
  };

  /** Settings are stored as TEXT, so booleans round-trip as the strings "true"/"false". */
  const toggleFlag = (key: string) => {
    setSettings((prev) => (prev ? { ...prev, [key]: isFlagOn(prev[key]) ? 'false' : 'true' } : prev));
  };

  const patchDocType = async (t: DocumentType, patch: { isMandatory?: boolean; isActive?: boolean }) => {
    try {
      await api.patch(`/document-types/${t.id}`, patch);
      toast.success('Document type updated');
      await load(docTypesPage);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to update document type'));
    }
  };

  const createDocType = async (e: FormEvent) => {
    e.preventDefault();
    if (newType.name.trim().length < 2) {
      toast.error('Document type name must be at least 2 characters');
      return;
    }
    if (newType.code.trim().length < 2) {
      toast.error('Document type code must be at least 2 characters');
      return;
    }
    setCreating(true);
    try {
      await api.post('/document-types', newType);
      toast.success('Document type created');
      setDialogOpen(false);
      setNewType(EMPTY_TYPE);
      if (docTypesPage === 1) {
        await load(1);
      } else {
        setDocTypesPage(1);
      }
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to create document type'));
    } finally {
      setCreating(false);
    }
  };

  if (loading || !settings) {
    return (
      <div>
        <PageHeader title="Settings" />
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
      <PageHeader title="Settings" description="Application-wide configuration and the document type catalogue." />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
          <CardDescription>
            These values control candidate numbering, upload limits, and which onboarding steps are enforced at
            submission.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="candidate_number_prefix">Candidate Number Prefix</Label>
                <Input
                  id="candidate_number_prefix"
                  value={settings.candidate_number_prefix ?? ''}
                  onChange={(e) => setSettings({ ...settings, candidate_number_prefix: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_file_size_mb">Max File Size (MB)</Label>
                <Input
                  id="max_file_size_mb"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  className="tabular"
                  value={settings.max_file_size_mb ?? ''}
                  onChange={(e) => setSettings({ ...settings, max_file_size_mb: e.target.value })}
                />
              </div>
            </div>

            <fieldset className="space-y-3">
              <legend className="mb-1 text-sm font-medium">Required onboarding steps</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {SETTING_FLAGS.map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2.5">
                    <Checkbox id={key} checked={isFlagOn(settings[key])} onCheckedChange={() => toggleFlag(key)} />
                    <Label htmlFor={key} className="font-normal">
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </fieldset>

            <div className="border-t border-border pt-5">
              <Button type="submit" loading={saving}>
                {saving ? 'Saving…' : 'Save Settings'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Document Types</CardTitle>
            <CardDescription>Mandatory types are pre-selected on every candidate checklist.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus aria-hidden="true" />
            Add Type
          </Button>
        </CardHeader>

        <TableWrapper>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Requirement</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docTypes.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{t.code}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto px-2 py-1"
                      onClick={() => patchDocType(t, { isMandatory: !t.is_mandatory })}
                      aria-label={`Mark ${t.name} as ${t.is_mandatory ? 'optional' : 'mandatory'}`}
                    >
                      <StatusBadge variant={t.is_mandatory ? 'destructive' : 'neutral'}>
                        {t.is_mandatory ? 'Mandatory' : 'Optional'}
                      </StatusBadge>
                    </Button>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={t.is_active ? 'ACTIVE' : 'INACTIVE'} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => patchDocType(t, { isActive: !t.is_active })}>
                      {t.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableWrapper>
        <CardContent className="pt-0">
          <Pagination page={docTypesPage} limit={LIMIT} total={docTypesTotal} onPageChange={setDocTypesPage} />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Document Type</DialogTitle>
            <DialogDescription>
              The code is a stable identifier used by the API — it is uppercased automatically.
            </DialogDescription>
          </DialogHeader>
          <form id="doctype-form" onSubmit={createDocType}>
            <DialogBody className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-type-name">Name *</Label>
                <Input
                  id="new-type-name"
                  required
                  minLength={2}
                  maxLength={150}
                  value={newType.name}
                  onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-type-code">Code *</Label>
                <Input
                  id="new-type-code"
                  required
                  minLength={2}
                  maxLength={80}
                  className="font-mono"
                  value={newType.code}
                  onChange={(e) =>
                    setNewType({ ...newType, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })
                  }
                />
              </div>
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="newTypeMandatory"
                  checked={newType.isMandatory}
                  onCheckedChange={(v) => setNewType({ ...newType, isMandatory: Boolean(v) })}
                />
                <Label htmlFor="newTypeMandatory" className="font-normal">
                  Mandatory document
                </Label>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={creating}>
                {creating ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
