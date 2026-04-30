import { useQuery } from '@tanstack/react-query';
import { SkeletonTable } from '../../components/Skeleton';
import { FileText, Building2, Users, Shield, Leaf, FlaskConical, Scale, Download, Clock } from 'lucide-react';
import api from '../../services/api';

export default function SiteMasterFilePage() {
  const { data: smf, isLoading } = useQuery({
    queryKey: ['site-master-file'],
    queryFn: () => api.get('/site-master-file').then(r => r.data.smf),
  });

  if (isLoading) return <div className="space-y-4"><SkeletonTable rows={10} /></div>;
  if (!smf) return <div className="text-white/40 text-center py-12">Unable to load Site Master File</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Site Master File</h1>
          <div className="flex items-center gap-2 text-xs text-white/30 mt-1">
            <Clock size={12} />
            <span>Live — Generated {new Date(smf.generatedAt).toLocaleString('en-ZA')}</span>
            <span className="px-2 py-0.5 bg-primary/15 text-primary rounded-full font-mono">v{smf.version}</span>
          </div>
        </div>
        <button onClick={() => window.print()}
          className="px-4 py-2.5 bg-primary hover:bg-primary-light text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition min-h-[44px]">
          <Download size={16} /> Export PDF
        </button>
      </div>

      {/* Section 1: General Info */}
      <Section icon={Building2} title="1. General Information" color="text-primary">
        <InfoGrid items={[
          { label: 'Company', value: smf.generalInfo.companyName },
          { label: 'Trading As', value: smf.generalInfo.tradingAs },
          { label: 'Facility', value: smf.generalInfo.facilityName },
          { label: 'Address', value: smf.generalInfo.facilityAddress },
          { label: 'GPS', value: smf.generalInfo.gpsCoordinates },
          { label: 'GMP Status', value: smf.generalInfo.gmpStatus, highlight: true },
          { label: 'License', value: smf.generalInfo.licenseNumber },
          { label: 'Type', value: smf.generalInfo.facilityType },
        ]} />
      </Section>

      {/* Section 2: Regulatory */}
      <Section icon={Shield} title="2. Regulatory Status" color="text-red-400">
        {smf.regulatory.permits.length > 0 && (
          <div className="space-y-2 mb-4">
            {smf.regulatory.permits.map((p: any, i: number) => (
              <div key={i} className="bg-white/[0.03] border border-white/5 rounded-lg p-3 flex items-center justify-between">
                <div><div className="text-sm text-white font-medium">{p.type}</div><div className="text-xs text-white/30 font-mono">{p.number}</div></div>
                <div className="text-right"><div className="text-xs text-white/40">Expires</div><div className="text-sm text-white font-mono">{p.expiry || '—'}</div></div>
              </div>
            ))}
          </div>
        )}
        {smf.regulatory.incbQuota && (
          <div className="bg-white/[0.03] border border-white/5 rounded-lg p-4">
            <div className="text-xs text-white/40 mb-2">INCB Quota — {smf.regulatory.incbQuota.year}</div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><div className="text-xl font-bold font-mono text-white">{smf.regulatory.incbQuota.annual}</div><div className="text-[10px] text-white/20">Allocated</div></div>
              <div><div className="text-xl font-bold font-mono text-amber-400">{smf.regulatory.incbQuota.used}</div><div className="text-[10px] text-white/20">Used</div></div>
              <div><div className="text-xl font-bold font-mono text-green-400">{smf.regulatory.incbQuota.remaining}</div><div className="text-[10px] text-white/20">Remaining</div></div>
            </div>
            <div className="mt-2 h-2 bg-white/5 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${smf.regulatory.incbQuota.usedPercent > 85 ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${smf.regulatory.incbQuota.usedPercent}%` }} />
            </div>
          </div>
        )}
      </Section>

      {/* Section 3: Personnel */}
      <Section icon={Users} title="3. Personnel" color="text-blue-400">
        <div className="text-sm text-white/50 mb-3">Total staff: <strong className="text-white">{smf.personnel.totalStaff}</strong></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {smf.personnel.keyPersonnel.map((p: any, i: number) => (
            <div key={i} className="bg-white/[0.03] border border-white/5 rounded-lg p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">{p.name.charAt(0)}</div>
              <div><div className="text-sm text-white font-medium">{p.name}</div><div className="text-[10px] text-white/30">{p.role}</div></div>
            </div>
          ))}
        </div>
        <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3">
          <div className="text-xs text-white/40 mb-2">Staff by Role</div>
          {Object.entries(smf.personnel.byRole).map(([role, count]) => (
            <div key={role} className="flex justify-between py-1 text-xs">
              <span className="text-white/50">{role.replace(/_/g, ' ')}</span>
              <span className="text-white font-mono">{count as number}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Section 4: Premises */}
      <Section icon={Building2} title="4. Premises & Equipment" color="text-amber-400">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3">
            <div className="text-xs text-white/40 mb-2">Zones</div>
            {smf.premises.zones.map((z: any, i: number) => (
              <div key={i} className="flex justify-between py-1 text-xs">
                <span className="text-white/60">{z.name}</span><span className="text-white/30">{z.type}</span>
              </div>
            ))}
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3">
            <div className="text-xs text-white/40 mb-2">Greenhouses</div>
            {smf.premises.greenhouses.map((gh: any, i: number) => (
              <div key={i} className="flex justify-between py-1 text-xs">
                <span className="text-white/60">{gh.name} ({gh.type})</span><span className="text-white/30">{gh.activeBays}/{gh.totalBays} bays</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3">
          <div className="text-xs text-white/40 mb-2">Assets: {smf.premises.totalAssets} registered</div>
          {Object.entries(smf.premises.assetsByCategory).map(([cat, count]) => (
            <div key={cat} className="flex justify-between py-1 text-xs">
              <span className="text-white/50">{cat.replace(/_/g, ' ')}</span><span className="text-white font-mono">{count as number}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Section 5: Production */}
      <Section icon={Leaf} title="5. Production" color="text-green-400">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <StatBox label="Active Plants" value={smf.production.activePlants} />
          <StatBox label="Mother Plants" value={smf.production.motherPlants.active} sub={`${smf.production.motherPlants.totalClonesProduced} clones total`} />
          <StatBox label="Active Batches" value={smf.production.batches.active} />
          <StatBox label="Released" value={smf.production.batches.released} color="text-green-400" />
        </div>
        {smf.production.batches.quarantined > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-3 text-sm text-red-300">
            {smf.production.batches.quarantined} batches currently quarantined
          </div>
        )}
        <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3">
          <div className="text-xs text-white/40 mb-2">Registered Strains</div>
          {smf.production.strains.map((s: any, i: number) => (
            <div key={i} className="flex items-center justify-between py-1.5 text-xs border-b border-white/[0.03] last:border-0">
              <span className="text-white/70 font-medium">{s.name}</span>
              <div className="flex gap-3 text-white/30">
                <span>{s.species}</span>
                {s.expectedThc && <span>THC {s.expectedThc}%</span>}
                {s.floweringWeeks && <span>{s.floweringWeeks}wk flower</span>}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Section 6: Quality System */}
      <Section icon={FlaskConical} title="6. Quality Management System" color="text-cyan-400">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <StatBox label="Active SOPs" value={smf.qualitySystem.totalSOPs} />
          <StatBox label="COAs Issued" value={smf.qualitySystem.coasIssued} color="text-green-400" />
          <StatBox label="Open Deviations" value={smf.qualitySystem.openDeviations} color={smf.qualitySystem.openDeviations > 0 ? 'text-amber-400' : undefined} />
          <StatBox label="Open Anomalies" value={smf.qualitySystem.openAnomalies} color={smf.qualitySystem.openAnomalies > 0 ? 'text-red-400' : undefined} />
        </div>
        <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3 mb-3">
          <div className="text-xs text-white/40 mb-2">Standard Operating Procedures</div>
          {smf.qualitySystem.sops.map((s: any, i: number) => (
            <div key={i} className="flex justify-between py-1 text-xs">
              <span className="text-white/60">{s.title}</span><span className="text-white/20">v{s.version}</span>
            </div>
          ))}
        </div>
        <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3">
          <div className="text-xs text-white/40 mb-2">Anomaly Detection Rules (Automated)</div>
          {smf.qualitySystem.anomalyRules.map((r: string, i: number) => (
            <div key={i} className="text-xs text-white/50 py-0.5 pl-3 relative">
              <span className="absolute left-0 text-primary">•</span> {r}
            </div>
          ))}
        </div>
      </Section>

      {/* Section 7: Destruction */}
      <Section icon={Scale} title="7. Destruction Records" color="text-red-400">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <StatBox label="Total Events" value={smf.destruction.totalEvents} />
          <StatBox label="Weight Destroyed" value={`${smf.destruction.totalWeightDestroyed.toFixed(0)}g`} />
        </div>
        {smf.destruction.events.length > 0 && (
          <div className="space-y-1.5">
            {smf.destruction.events.map((d: any, i: number) => (
              <div key={i} className="bg-white/[0.03] border border-white/5 rounded-lg p-3 text-xs">
                <div className="flex justify-between"><span className="text-white/60">{d.date}</span><span className="text-white font-mono">{d.weight}g</span></div>
                <div className="text-white/30">{d.reason} — SAPS: {d.sapsOfficer} ({d.station})</div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Section 8: System */}
      <Section icon={FileText} title="8. Digital Compliance System" color="text-primary">
        <InfoGrid items={[
          { label: 'System', value: smf.compliance.systemName },
          { label: 'Description', value: smf.compliance.systemDescription },
          { label: 'Audit Trail', value: smf.compliance.auditTrailIntegrity, highlight: true },
          { label: 'Last Updated', value: new Date(smf.compliance.lastUpdated).toLocaleString('en-ZA') },
        ]} />
      </Section>

      <p className="text-center text-white/10 text-xs py-8 font-mono">Site Master File — Generated live from TnT-ZA v2.0 — {new Date().toLocaleDateString('en-ZA')}</p>
    </div>
  );
}

// ── Helper components ──

function Section({ icon: Icon, title, color, children }: { icon: any; title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/5">
        <Icon size={16} className={color} />
        <h2 className="text-sm font-bold text-white/70">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function InfoGrid({ items }: { items: { label: string; value: string; highlight?: boolean }[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {items.map((item, i) => (
        <div key={i} className="bg-white/[0.03] border border-white/5 rounded-lg p-3">
          <div className="text-[10px] text-white/30">{item.label}</div>
          <div className={`text-sm ${item.highlight ? 'text-primary font-semibold' : 'text-white/70'}`}>{item.value || '—'}</div>
        </div>
      ))}
    </div>
  );
}

function StatBox({ label, value, sub, color }: { label: string; value: any; sub?: string; color?: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3 text-center">
      <div className={`text-xl font-bold font-mono ${color || 'text-white'}`}>{value}</div>
      <div className="text-[10px] text-white/20">{label}</div>
      {sub && <div className="text-[9px] text-white/15 mt-0.5">{sub}</div>}
    </div>
  );
}
