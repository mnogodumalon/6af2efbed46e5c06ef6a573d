import { useDashboardData } from '@/hooks/useDashboardData';
import type { Grussbuch } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GrussbuchDialog } from '@/components/dialogs/GrussbuchDialog';
import { GrussbuchViewDialog } from '@/components/dialogs/GrussbuchViewDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconSearch, IconHeart, IconPencil, IconTrash, IconCalendar, IconMail,
} from '@tabler/icons-react';

const APPGROUP_ID = '6af2efbed46e5c06ef6a573d';
const REPAIR_ENDPOINT = '/claude/build/repair';

type DialogMode = { mode: 'create' } | { mode: 'edit'; record: Grussbuch } | null;

export default function DashboardOverview() {
  const { grussbuch, loading, error, fetchAll } = useDashboardData();

  const [search, setSearch] = useState('');
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [viewRecord, setViewRecord] = useState<Grussbuch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Grussbuch | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return grussbuch;
    const q = search.toLowerCase();
    return grussbuch.filter(r =>
      [r.fields.vorname, r.fields.nachname, r.fields.email, r.fields.nachricht]
        .some(v => v?.toLowerCase().includes(q))
    );
  }, [grussbuch, search]);

  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => {
      const ta = a.fields.zeitpunkt ?? a.createdat ?? '';
      const tb = b.fields.zeitpunkt ?? b.createdat ?? '';
      return tb.localeCompare(ta);
    }),
  [filtered]);

  const handleCreate = async (fields: Grussbuch['fields']) => {
    await LivingAppsService.createGrussbuchEntry(fields);
    fetchAll();
  };

  const handleEdit = async (fields: Grussbuch['fields']) => {
    if (dialogMode?.mode !== 'edit') return;
    await LivingAppsService.updateGrussbuchEntry(dialogMode.record.record_id, fields);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteGrussbuchEntry(deleteTarget.record_id);
    setDeleteTarget(null);
    fetchAll();
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const thisMonth = grussbuch.filter(r => {
    const d = r.fields.zeitpunkt ?? r.createdat ?? '';
    return d.startsWith(new Date().toISOString().slice(0, 7));
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <IconHeart size={22} className="text-primary shrink-0" />
            <h1 className="text-2xl font-bold text-foreground">Grußbuch</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {grussbuch.length} Einträge gesamt · {thisMonth} diesen Monat
          </p>
        </div>
        <Button onClick={() => setDialogMode({ mode: 'create' })} className="shrink-0 gap-2">
          <IconPlus size={16} className="shrink-0" />
          Neuer Eintrag
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Namen, E-Mail oder Nachricht suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Cards grid */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <IconHeart size={32} stroke={1.5} className="text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">Noch keine Einträge</h3>
            <p className="text-sm text-muted-foreground">
              {search ? 'Keine Ergebnisse für deine Suche.' : 'Sei der Erste und hinterlasse einen Gruß!'}
            </p>
          </div>
          {!search && (
            <Button onClick={() => setDialogMode({ mode: 'create' })} className="gap-2">
              <IconPlus size={16} />
              Ersten Eintrag erstellen
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map(record => (
            <GrussbuchCard
              key={record.record_id}
              record={record}
              onView={() => setViewRecord(record)}
              onEdit={() => setDialogMode({ mode: 'edit', record })}
              onDelete={() => setDeleteTarget(record)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      {(dialogMode?.mode === 'create' || dialogMode?.mode === 'edit') && (
        <GrussbuchDialog
          open={!!dialogMode}
          onClose={() => setDialogMode(null)}
          onSubmit={dialogMode.mode === 'create' ? handleCreate : handleEdit}
          defaultValues={dialogMode.mode === 'edit' ? dialogMode.record.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Grussbuch']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Grussbuch']}
        />
      )}

      {/* View Dialog */}
      {viewRecord && (
        <GrussbuchViewDialog
          open={!!viewRecord}
          onClose={() => setViewRecord(null)}
          record={viewRecord}
          onEdit={(r: Grussbuch) => { setViewRecord(null); setDialogMode({ mode: 'edit', record: r }); }}
        />
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Eintrag löschen"
        description={`Soll der Eintrag von ${deleteTarget?.fields.vorname ?? ''} ${deleteTarget?.fields.nachname ?? ''} wirklich gelöscht werden?`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function GrussbuchCard({
  record,
  onView,
  onEdit,
  onDelete,
}: {
  record: Grussbuch;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const name = [record.fields.vorname, record.fields.nachname].filter(Boolean).join(' ') || 'Unbekannt';
  const initials = [record.fields.vorname?.[0], record.fields.nachname?.[0]].filter(Boolean).join('').toUpperCase() || '?';
  const dateStr = formatDate(record.fields.zeitpunkt ?? record.createdat);

  return (
    <div
      className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden flex flex-col cursor-pointer hover:shadow-md transition-shadow"
      onClick={onView}
    >
      {/* Card top */}
      <div className="p-5 flex-1 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground truncate">{name}</p>
            {record.fields.email && (
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                <IconMail size={12} className="shrink-0" />
                {record.fields.email}
              </p>
            )}
          </div>
        </div>
        {record.fields.nachricht && (
          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed italic">
            „{record.fields.nachricht}"
          </p>
        )}
      </div>

      {/* Card bottom */}
      <div className="px-5 py-3 border-t border-border flex items-center justify-between gap-2 bg-muted/30">
        <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
          <IconCalendar size={12} className="shrink-0" />
          <span className="truncate">{dateStr}</span>
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
            onClick={e => { e.stopPropagation(); onEdit(); }}
            title="Bearbeiten"
          >
            <IconPencil size={14} className="text-muted-foreground" />
          </button>
          <button
            className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
            onClick={e => { e.stopPropagation(); onDelete(); }}
            title="Löschen"
          >
            <IconTrash size={14} className="text-destructive" />
          </button>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <Skeleton className="h-9 w-72" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);
    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });
    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });
      if (!resp.ok || !resp.body) { setRepairing(false); setRepairFailed(true); return; }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          if (content.startsWith('[DONE]')) { setRepairDone(true); setRepairing(false); }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) setRepairFailed(true);
        }
      }
    } catch { setRepairing(false); setRepairFailed(true); }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktiere den Support.</p>}
    </div>
  );
}
