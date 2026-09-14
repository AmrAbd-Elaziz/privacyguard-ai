// @ts-nocheck
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState } from 'react';
import type { ChangeEvent,
  Dispatch,
  SetStateAction } from 'react';
import { QueryClient,
  QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Cloud,
  Database,
  Download,
  FileCheck2,
  FileText,
  Filter,
  Globe2,
  HardDrive,
  Info,
  LayoutDashboard,
  Link2,
  ListFilter,
  LockKeyhole,
  Menu,
  Network,
  Paperclip,
  Plus,
  Search,
  Send,
  Settings2,
  Shield,
  Sparkles,
  Target,
  Upload,
  UserRound,
  X,
  Zap,
  type LucideIcon,
  AlertCircle,
  Users,
  ShieldAlert
} from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as ChartTooltip } from 'recharts';
import { Link, Redirect, Route, Switch, useLocation } from 'wouter';
import {
  loadWorkspaceData,
  uploadAssessment,
  createAsset,
  loadRiskRegisterData,
  requestRiskGuidance,
  updateWorkflow,
  loadReportsData,
  loadPersistedReports,
  generatePersistedReport,
  requestReportExecutiveSummary,
  getReportDownloadUrl,
  loadAiAssistantData,
  requestAiGuidance,
  type AiContextType,
} from '@/lib/privacyguard-api';

const queryClient = new QueryClient();

type Classification = 'Internal' | 'Confidential' | 'Restricted PII' | 'Sensitive PII' | 'Unknown';
type Asset = {
  id: number; name: string; owner: string; purpose: string; environment: string;
  location: string; processors: string; classification: Classification; assessments: number; risk: string; controls: number; assetType?: string; updated?: string;
};
type Assessment = { id: number; name: string; asset: string; categories: string[]; classification: Classification; risk: string; workflow: string; date: string; file: string };
type Workflow = { id: number; asset: string; assessment: string; classification: Classification; risk: string; control: string; owner: string; remediation: string; closure: string; updated: string };

const initialAssets: Asset[] = [
  { id: 1, name: 'Customer Portal', owner: 'Data Engineering', purpose: 'Customer self-service and account management', environment: 'Cloud application', location: 'AWS, Snowflake', processors: 'AWS, Snowflake', classification: 'Confidential', assessments: 4, risk: 'High', controls: 12, assetType: 'Application', updated: '27 Jan 2025' },
  { id: 2, name: 'HR Database', owner: 'People & Culture', purpose: 'Employee records and people operations', environment: 'HR systems', location: 'Workday', processors: 'Workday', classification: 'Sensitive PII', assessments: 5, risk: 'High', controls: 15, assetType: 'Database', updated: '24 Jan 2025' },
  { id: 3, name: 'Vendor Email Service', owner: 'Procurement', purpose: 'Third-party customer communications', environment: 'SaaS platform', location: 'Cloud email provider', processors: 'Cloud email provider', classification: 'Confidential', assessments: 3, risk: 'High', controls: 11, assetType: 'Vendor', updated: '20 Jan 2025' },
  { id: 4, name: 'Finance Reporting', owner: 'Finance', purpose: 'Finance reporting and management information', environment: 'Data platform', location: 'SAP, Stripe', processors: 'SAP, Stripe', classification: 'Confidential', assessments: 3, risk: 'High', controls: 11, assetType: 'Business system', updated: '18 Jan 2025' },
  { id: 5, name: 'Marketing Website', owner: 'Marketing', purpose: 'Public website and campaign measurement', environment: 'Public website', location: 'Cloudflare', processors: 'Cloudflare', classification: 'Internal', assessments: 3, risk: 'Medium', controls: 10, assetType: 'Website', updated: '16 Jan 2025' },
  { id: 6, name: 'Employee Devices', owner: 'IT', purpose: 'Managed employee endpoints', environment: 'Endpoint fleet', location: 'Corporate devices', processors: 'Endpoint security provider', classification: 'Confidential', assessments: 2, risk: 'Medium', controls: 9, assetType: 'Technical asset', updated: '14 Jan 2025' },
  { id: 7, name: 'Customer Support System', owner: 'Customer Success', purpose: 'Customer support', environment: 'SaaS platform', location: 'Zendesk', processors: 'Zendesk', classification: 'Internal', assessments: 3, risk: 'Low', controls: 7, assetType: 'SaaS service', updated: '12 Jan 2025' },
  { id: 8, name: 'Legal Document Repository', owner: 'Legal', purpose: 'Legal and compliance records', environment: 'Cloud storage', location: 'SharePoint', processors: 'Microsoft', classification: 'Unknown', assessments: 1, risk: 'Low', controls: 5, assetType: 'Document store', updated: '10 Jan 2025' },
];
const initialAssessments: Assessment[] = [
  { id: 1, name: 'Customer Portal Privacy Assessment', asset: 'Customer Portal', categories: ['Personal Data', 'Usage Data', 'Support Data'], classification: 'Restricted PII', risk: 'High', workflow: 'Completed', date: '27 Jan 2025', file: 'assessment_customer_portal.xlsx' },
  { id: 2, name: 'HR Data Classification Assessment', asset: 'HR Database', categories: ['Personal Data', 'Employee Data'], classification: 'Confidential', risk: 'Medium', workflow: 'In Progress', date: '24 Jan 2025', file: 'hr_employee_data.pdf' },
  { id: 3, name: 'Vendor Processing Assessment', asset: 'Vendor Email Service', categories: ['Personal Data', 'Usage Data', 'Business Confidential Data'], classification: 'Internal', risk: 'Low', workflow: 'Completed', date: '22 Jan 2025', file: 'vendor_processing_assessment.csv' },
  { id: 4, name: 'Finance Reporting Assessment', asset: 'Finance Reporting', categories: ['Financial Data', 'Business Confidential Data'], classification: 'Confidential', risk: 'Medium', workflow: 'Completed', date: '20 Jan 2025', file: 'finance_reporting.docx' },
  { id: 5, name: 'Employee Device Classification Assessment', asset: 'Employee Devices', categories: ['Employee Data', 'Technical Security Data'], classification: 'Internal', risk: 'Low', workflow: 'In Progress', date: '18 Jan 2025', file: 'employee_devices.txt' },
];
const initialWorkflows: Workflow[] = [
  { id: 1, asset: 'Customer Portal', assessment: 'Customer Portal Privacy Assessment', classification: 'Confidential', risk: 'High', control: 'CM-001', owner: 'Alex Carter', remediation: 'Ongoing', closure: 'Open', updated: '27 Jan 2025 10:24' },
  { id: 2, asset: 'HR Database', assessment: 'Assessment Q1 2025', classification: 'Sensitive PII', risk: 'Medium', control: 'CM-007', owner: 'Jordan Lee', remediation: 'Partial', closure: 'Partial', updated: '26 Jan 2025 16:43' },
  { id: 3, asset: 'Vendor Email Service', assessment: 'Vendor Processing Assessment', classification: 'Internal', risk: 'Low', control: 'CM-012', owner: 'Taylor Kim', remediation: 'Completed', closure: 'Completed', updated: '24 Jan 2025 09:12' },
];

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/workflows', label: 'Workflows', icon: Network },
  { href: '/risk-register', label: 'Risk Register', icon: AlertTriangle },
  { href: '/data-inventory', label: 'Data Inventory', icon: Database },
  { href: '/controls-compliance', label: 'Controls & Compliance', icon: Shield },
  { href: '/control-map', label: 'Control Map', icon: Network },
  { href: '/assessments', label: 'Assessments', icon: ClipboardCheck },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/ai-assistant', label: 'AI Assistant', icon: Sparkles },
];

type WorkspaceContextValue = {
  assets: Asset[]; setAssets: Dispatch<SetStateAction<Asset[]>>;
  overview: any;
  assessments: Assessment[]; workflows: Workflow[];
  setWorkflows: Dispatch<SetStateAction<Workflow[]>>;
  refreshWorkspace: () => Promise<void>;
  globalSearch: string; setGlobalSearch: (value: string) => void;
  notify: (message: string) => void;
};
const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('Workspace context unavailable');
  return context;
}

function Brand({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`brand flex items-center py-3.5 ${
        collapsed ? 'justify-center px-0' : 'gap-2.5 px-4'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="pg-brand-toggle shrink-0"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        data-testid="button-sidebar-logo"
      >
        <img
          src="/privacyguard-logo.png"
          alt="PrivacyGuard"
          className="pg-brand-logo"
        />
      </button>

      {!collapsed && (
        <Link
          href="/dashboard"
          className="brand-copy min-w-0 leading-tight"
          data-testid="link-brand"
        >
          <span className="block whitespace-nowrap text-[14px] font-bold tracking-tight text-slate-100">
            PrivacyGuard <b className="text-cyan-300">AI</b>
          </span>

          <span className="pg-brand-subtitle block text-slate-400">
            Enterprise Privacy &amp; Security
            <br />
            Assessor
          </span>
        </Link>
      )}
    </div>
  );
}

function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const [location] = useLocation();
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      className={`pg-sidebar ${
        collapsed ? 'pg-sidebar-collapsed' : ''
      } ${expanded ? 'expanded' : ''}`}
    >
      <div className="border-b border-slate-800/80">
        <Brand collapsed={collapsed} onToggle={onToggle} />
      </div>

      <nav
        className={`nav-list flex flex-1 flex-col gap-1 py-4 ${
          collapsed ? 'px-2' : 'px-2'
        }`}
      >
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setExpanded(false)}
            title={collapsed ? label : undefined}
            className={`nav-item flex items-center rounded-md py-2.5 text-[12px] transition-all hover:bg-slate-800/80 ${
              collapsed ? 'justify-center px-0' : 'gap-3 px-3'
            } ${
              location === href
                ? 'bg-cyan-500/15 text-cyan-200 ring-1 ring-inset ring-cyan-400/45'
                : 'text-slate-300'
            }`}
            data-testid={`link-nav-${label
              .toLowerCase()
              .replace(/[^a-z]+/g, '-')}`}
          >
            <Icon
              size={18}
              strokeWidth={1.8}
              className={`shrink-0 ${
                location === href ? 'text-cyan-300' : 'text-slate-400'
              }`}
            />

            {!collapsed && (
              <span className="nav-label">{label}</span>
            )}
          </Link>
        ))}
      </nav>

      {!collapsed && (
        <div className="sidebar-footer pg-sidebar-footer-art">
          <img
            src="/privacyguard-sidebar-footer.png"
            alt="Built for a more private tomorrow"
            className="pg-sidebar-footer-image"
          />

          <div className="pg-sidebar-built-by">
            <span className="pg-built-line" />
            <span className="pg-built-text">
              Built by <strong>Amr Abdelaziz</strong>
            </span>
            <span className="pg-built-line" />
          </div>
        </div>
      )}
    </aside>
  );
}

function Topbar() {
  const { globalSearch, setGlobalSearch } = useWorkspace();

  const currentDate = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());
  return <header className="pg-topbar">

    <div className="topbar-date ml-auto hidden text-right text-[10px] text-slate-400 sm:block"><span className="block text-slate-300">{currentDate}</span><span>Workspace is current</span></div>
    <button className="pg-button ghost relative h-8 w-8 p-0" aria-label="Notifications" data-testid="button-notifications"><Bell size={17} /><span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-cyan-300" /></button>
    <div className="flex items-center gap-2 border-l border-slate-700 pl-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20 text-[11px] font-bold text-cyan-200">PA</span>
      <div className="profile-copy leading-tight"><span className="block text-[11px] font-semibold text-slate-200">PrivacyGuard AI</span><span className="block text-[9px] text-slate-400">Enterprise</span></div>
      <ChevronDown size={13} className="text-slate-500" />
    </div>
  </header>;
}
function Shell({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [overview, setOverview] = useState<any>({});
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [globalSearch, setGlobalSearch] = useState('');
  const [notice, setNotice] = useState('');
  const notify = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 3000); };

  const refreshWorkspace = async () => {
    try {
      const data = await loadWorkspaceData();
      setAssets(data.assets);
      setOverview(data.overview || {});
      setAssessments(data.assessments);
      setWorkflows(data.workflows);
    } catch (error) {
      console.error(error);
      notify('Backend is unavailable. Start the API on port 8001.');
    }
  };

  useEffect(() => { void refreshWorkspace(); }, []);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return <WorkspaceContext.Provider value={{ assets, setAssets, overview, assessments, workflows, setWorkflows, refreshWorkspace, globalSearch, setGlobalSearch, notify }}>
    <div className="pg-shell">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((value) => !value)}
      />

      <main className="pg-main">
        <Topbar />
        <div className="pg-page-viewport relative flex-1">
          {children}
          {notice && <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-md border border-cyan-300/40 bg-slate-900 px-4 py-3 text-xs text-cyan-100 shadow-xl" data-testid="status-notification"><CheckCircle2 size={15} className="text-teal-300" />{notice}</div>}
        </div>
      </main>
    </div>
  </WorkspaceContext.Provider>;
}
function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: ReactNode }) {
  return <div className="mb-5 flex flex-wrap items-end justify-between gap-4 pg-fade-in">
    <div><div className="pg-kicker mb-1">{eyebrow || 'PrivacyGuard AI'}</div><h1 className="pg-gradient-text text-[25px] font-bold leading-tight tracking-[-.035em]">{title}</h1><p className="mt-1 text-[12px] text-slate-400">{description}</p></div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>;
}
function Panel({ title, icon: Icon, children, action, className = '' }: { title?: string; icon?: typeof Shield; children: ReactNode; action?: ReactNode; className?: string }) {
  return <section className={`pg-panel ${className}`}>{title && <div className="pg-panel-header"><div className="flex items-center gap-2 text-[13px] font-semibold text-slate-100">{Icon && <Icon size={15} className="text-cyan-300" />}{title}</div>{action}</div>}{children}</section>;
}
function DynamicIcon({ icon: Icon, size = 16, className = '' }: { icon: LucideIcon; size?: number; className?: string }) {
  return <Icon size={size} className={className} />;
}
function Badge({ children, tone = 'blue', dot = false }: { children: ReactNode; tone?: 'blue' | 'teal' | 'amber' | 'red' | 'violet'; dot?: boolean }) {
  return <span className={`pg-badge ${tone}`}>{dot && <span className="pg-status-dot" />}{children}</span>;
}
function StatCard({ label, value, note, icon: Icon, tone = 'blue' }: { label: string; value: string; note?: string; icon: typeof Shield; tone?: string }) {
  return <div className="pg-panel flex min-h-[88px] items-center gap-3 p-3.5 transition-transform hover:-translate-y-0.5">
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${tone === 'teal' ? 'bg-teal-500/15 text-teal-300' : tone === 'amber' ? 'bg-amber-400/15 text-amber-300' : tone === 'red' ? 'bg-red-400/15 text-red-300' : 'bg-cyan-400/15 text-cyan-300'}`}><Icon size={21} strokeWidth={1.8} /></div>
    <div><div className="text-[10px] text-slate-400">{label}</div><div className="mt-0.5 text-[23px] font-bold tracking-tight text-slate-100">{value}</div>{note && <div className="text-[9px] text-slate-500">{note}</div>}</div>
  </div>;
}
function Toolbar({ children }: { children: ReactNode }) { return <div className="mb-3 flex flex-wrap items-center gap-2">{children}</div>; }
function SearchBox({ placeholder, value, onChange, testId }: { placeholder: string; value: string; onChange: (v: string) => void; testId: string }) {
  return <div className="relative min-w-[200px] flex-1"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" /><input className="pg-input pl-8" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} data-testid={testId} /></div>;
}
function Select({ value, onChange, options, testId, className = '' }: { value: string; onChange: (v: string) => void; options: string[]; testId: string; className?: string }) {
  return <div className={`relative ${className}`}><select className="pg-input appearance-none pr-7" value={value} onChange={(e) => onChange(e.target.value)} data-testid={testId}>{options.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" /></div>;
}
function EmptyState({ message }: { message: string }) { return <div className="py-16 text-center text-xs text-slate-500"><Database size={26} className="mx-auto mb-2 text-slate-600" /><p>{message}</p></div>; }

function Dashboard() {
  const { assets, assessments, workflows, overview, globalSearch } = useWorkspace();
  const [priorityAssetTab, setPriorityAssetTab] = useState<
    'top' | 'high' | 'needs-assessment'
  >('top');

  const [pipelineView, setPipelineView] = useState<'graph' | 'list'>('graph');

  const totalAssets = assets.length;
  const totalAssessments = assessments.length;
  const calculatedRisks = Number(overview.calculated_risks || 0);
  const highRisks = Number(overview.high_priority_risks || 0);
  const mappedControls = Number(overview.mapped_controls || 0);

  const assessedAssets = assets.filter(
    (asset) => Number(asset.assessments || 0) > 0
  ).length;

  const coverage = totalAssets
    ? Math.round((assessedAssets / totalAssets) * 100)
    : 0;

  const highRiskPercent = calculatedRisks
    ? Math.round((highRisks / calculatedRisks) * 100)
    : 0;

  const colors: Record<string, string> = {
    Internal: '#159cf4',
    Confidential: '#9b7af7',
    'Restricted PII': '#e85d98',
    'Sensitive PII': '#f6bd4b',
    Unknown: '#91a7c5',
  };

  const distribution = [
    'Internal',
    'Confidential',
    'Restricted PII',
    'Sensitive PII',
    'Unknown',
  ]
    .map((name) => ({
      name,
      value: Number(overview.classification_distribution?.[name] || 0),
      color: colors[name],
    }))
    .filter((item) => item.value > 0);

  const chartData = distribution.length
    ? distribution
    : [{ name: 'Unknown', value: 1, color: colors.Unknown }];

  const searchedAssets = assets.filter(
    (asset) =>
      !globalSearch ||
      asset.name.toLowerCase().includes(globalSearch.toLowerCase())
  );

  const priorityAssets = searchedAssets
    .filter((asset) => {
      if (priorityAssetTab === 'high') {
        return asset.risk === 'High';
      }

      if (priorityAssetTab === 'needs-assessment') {
        return Number(asset.assessments || 0) === 0;
      }

      return true;
    })
    .sort((a, b) => {
      if (priorityAssetTab !== 'top') return 0;

      const riskWeight: Record<string, number> = {
        High: 3,
        Medium: 2,
        Low: 1,
        Unknown: 0,
      };

      const riskDifference =
        (riskWeight[b.risk || 'Unknown'] || 0) -
        (riskWeight[a.risk || 'Unknown'] || 0);

      if (riskDifference !== 0) return riskDifference;

      return Number(b.assessments || 0) - Number(a.assessments || 0);
    })
    .slice(0, 5);

  /*
   * Dashboard intelligence charts
   * -----------------------------
   * Risk-category exposure is derived from the assessment
   * detected categories already returned by the workspace API.
   *
   * Closure status is derived ONLY from workflow.closure.
   */
  const categoryCounts = assessments.reduce<Record<string, number>>(
    (counts, assessment) => {
      (assessment.categories || []).forEach((category) => {
        counts[category] = (counts[category] || 0) + 1;
      });

      return counts;
    },
    {}
  );

  const topRiskCategories = Object.entries(categoryCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const maxRiskCategory =
    Math.max(...topRiskCategories.map((item) => item.value), 1);

  const categoryBarClasses = [
    'critical',
    'high',
    'medium',
    'low',
    'info',
  ];

  const closureOrder = [
    'Open',
    'In review',
    'Partial',
    'Completed',
    'Lifetime',
  ];

  const closureCounts = workflows.reduce<Record<string, number>>(
    (counts, workflow) => {
      const status = workflow.closure || 'Open';
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    },
    {}
  );

  const closureStatusData = [
    ...closureOrder
      .filter((status) => closureCounts[status] > 0)
      .map((status) => ({
        status,
        value: closureCounts[status],
      })),

    ...Object.entries(closureCounts)
      .filter(([status]) => !closureOrder.includes(status))
      .map(([status, value]) => ({
        status,
        value,
      })),
  ];

  const maxClosureCount =
    Math.max(...closureStatusData.map((item) => item.value), 1);

  const classificationCount = distribution.length;

  const pipeline = [
    {
      label: 'Assets',
      value: totalAssets,
      note: 'registered',
      icon: Database,
    },
    {
      label: 'Assessments',
      value: totalAssessments,
      note: 'workspace assessments',
      icon: FileText,
    },
    {
      label: 'Classification',
      value: classificationCount,
      note: 'active classifications',
      icon: Target,
    },
    {
      label: 'Risks',
      value: calculatedRisks,
      note: 'calculated',
      icon: AlertTriangle,
    },
    {
      label: 'Controls',
      value: mappedControls,
      note: 'mapped',
      icon: Shield,
    },
  ];

  return (
    <div className="pg-content pg-command-dashboard">
      <PageHeader
        eyebrow="Enterprise security posture"
        title="Privacy & Security Command Center"
        description="Executive visibility across privacy assessments, risk exposure and control coverage."
        actions={
          <div className="pg-command-header-actions">
            <span className="pg-command-live">
              <span />
              Live workspace
            </span>

          </div>
        }
      />

      {/* FINAL 3x3 DASHBOARD */}
      <div className="pg-dashboard-final-333">

      {/* HERO */}
      <div className="pg-command-hero">
        <section className="pg-command-risk">
          <div className="pg-command-risk-glow" />

          <div className="pg-command-risk-head">
            <div>
              <div className="pg-command-kicker">
                CURRENT RISK EXPOSURE
              </div>

              <h2>Enterprise privacy risk posture</h2>

              <p>
                Backend-calculated exposure across the active
                PrivacyGuard assessment workspace.
              </p>
            </div>

            <div className="pg-command-score">
              <strong>{highRiskPercent}%</strong>
              <span>HIGH PRIORITY</span>
            </div>
          </div>

          <div className="pg-command-risk-numbers">
            <div>
              <span>CALCULATED RISKS</span>
              <strong>{calculatedRisks}</strong>
            </div>

            <div>
              <span>HIGH PRIORITY</span>
              <strong className="warning">{highRisks}</strong>
            </div>

            <div>
              <span>MAPPED CONTROLS</span>
              <strong>{mappedControls}</strong>
            </div>
          </div>

          <div className="pg-command-risk-meter">
            <div
              style={{
                width: `${Math.min(100, highRiskPercent)}%`,
              }}
            />
          </div>

          <div className="pg-command-risk-foot">
            <span>
              <AlertTriangle size={14} />
              {highRisks} of {calculatedRisks} risks meet the
              high-priority threshold.
            </span>

            <Link href="/risk-register">
              Open Risk Register
              <ArrowRight size={13} />
            </Link>
          </div>
        </section>

        <div className="pg-command-kpis">
          <Link href="/data-inventory" className="pg-command-kpi">
            <div className="pg-command-kpi-icon cyan">
              <Database size={21} />
            </div>

            <div className="pg-command-kpi-copy">
              <span>ASSETS IN SCOPE</span>
              <strong>{totalAssets}</strong>
              <small>{assessedAssets} with linked assessments</small>
            </div>

            <ArrowRight size={14} />
          </Link>

          <Link href="/assessments" className="pg-command-kpi">
            <div className="pg-command-kpi-icon violet">
              <FileText size={21} />
            </div>

            <div className="pg-command-kpi-copy">
              <span>ASSESSMENTS</span>
              <strong>{totalAssessments}</strong>
              <small>{coverage}% asset coverage</small>
            </div>

            <ArrowRight size={14} />
          </Link>

          <Link href="/control-map" className="pg-command-kpi">
            <div className="pg-command-kpi-icon teal">
              <Shield size={21} />
            </div>

            <div className="pg-command-kpi-copy">
              <span>MAPPED CONTROLS</span>
              <strong>{mappedControls}</strong>
              <small>GDPR + ISO/IEC 27001:2022</small>
            </div>

            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* INTELLIGENCE */}
      <div className="pg-command-intelligence">
        <Panel
          title="Data classification exposure"
          icon={Database}
          action={
            <Link href="/data-inventory" className="pg-command-panel-link">
              Inventory <ArrowRight size={11} />
            </Link>
          }
        >
          <div className="pg-command-classification">
            <div className="pg-command-donut">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    innerRadius={52}
                    outerRadius={73}
                    stroke="hsl(214 44% 11%)"
                    strokeWidth={3}
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>

              <div className="pg-command-donut-center">
                <strong>{totalAssessments}</strong>
                <span>ASSESSMENTS</span>
              </div>
            </div>

            <div className="pg-command-legend">
              {chartData.map((item) => (
                <div key={item.name}>
                  <span>
                    <i style={{ backgroundColor: item.color }} />
                    {item.name}
                  </span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Assessment coverage" icon={Target}>
          <div className="pg-command-coverage">
            <div className="pg-command-coverage-top">
              <div>
                <span>WORKSPACE COVERAGE</span>
                <strong>{coverage}%</strong>
              </div>

              <div className="pg-command-target">
                <Target size={26} />
              </div>
            </div>

            <div className="pg-command-coverage-meter">
              <div
                style={{
                  width: `${Math.min(100, coverage)}%`,
                }}
              />
            </div>

            <div className="pg-command-coverage-stats">
              <div>
                <strong>{assessedAssets}</strong>
                <span>Assessed assets</span>
              </div>

              <div>
                <strong>
                  {Math.max(totalAssets - assessedAssets, 0)}
                </strong>
                <span>Awaiting assessment</span>
              </div>
            </div>

            <Link href="/assessments" className="pg-command-inline-link">
              Review assessment workspace
              <ArrowRight size={12} />
            </Link>
          </div>
        </Panel>

        <Panel title="Framework alignment" icon={Shield}>
          <div className="pg-command-frameworks">
            <div className="pg-command-framework">
              <div className="pg-command-framework-badge">GDPR</div>

              <div>
                <strong>GDPR</strong>
                <span>Privacy control mapping</span>
              </div>

              <CheckCircle2 size={17} />
            </div>

            <div className="pg-command-framework">
              <div className="pg-command-framework-badge iso">ISO</div>

              <div>
                <strong>ISO/IEC 27001:2022</strong>
                <span>Security control mapping</span>
              </div>

              <CheckCircle2 size={17} />
            </div>

            <div className="pg-command-framework-total">
              <span>Control catalog</span>
              <strong>{Number(overview.control_catalog_size || 0)}</strong>
            </div>

            <Link href="/controls" className="pg-command-inline-link">
              Explore control library
              <ArrowRight size={12} />
            </Link>
          </div>
        </Panel>
      </div>

      {/* LIVE SECURITY INTELLIGENCE */}
      <div className="pg-command-live-intelligence">

        <Panel
          title="Top Data Risk Categories"
          icon={AlertTriangle}
          className="pg-command-category-panel"
        >
          <div className="pg-command-category-chart">
            {topRiskCategories.length ? (
              topRiskCategories.map((item, index) => (
                <div
                  className="pg-command-category-row"
                  key={item.name}
                >
                  <span
                    className="pg-command-category-name"
                    title={item.name}
                  >
                    {item.name}
                  </span>

                  <div className="pg-command-category-track">
                    <div
                      className={`pg-command-category-fill ${
                        categoryBarClasses[index] || 'info'
                      }`}
                      style={{
                        width: `${
                          (item.value / maxRiskCategory) * 100
                        }%`,
                      }}
                    />
                  </div>

                  <strong>{item.value}</strong>
                </div>
              ))
            ) : (
              <div className="pg-command-chart-empty">
                No assessment categories available.
              </div>
            )}
          </div>
        </Panel>

        <Panel
          title="Assessments by closure status"
          icon={CheckCircle2}
          action={
            <Link
              href="/workflows"
              className="pg-command-panel-link"
            >
              Workflows
              <ArrowRight size={11} />
            </Link>
          }
        >
          <div className="pg-command-closure-chart">
            {closureStatusData.length ? (
              <div className="pg-command-closure-bars">
                {closureStatusData.map((item, index) => {
                  const height =
                    24 +
                    (item.value / maxClosureCount) * 116;

                  return (
                    <div
                      className="pg-command-closure-column"
                      key={item.status}
                    >
                      <div className="pg-command-closure-value">
                        {item.value}
                      </div>

                      <div className="pg-command-closure-bar-area">
                        <div
                          className={`pg-command-closure-bar status-${index % 5}`}
                          style={{
                            height: `${height}px`,
                          }}
                        />
                      </div>

                      <div
                        className="pg-command-closure-label"
                        title={item.status}
                      >
                        {item.status}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="pg-command-chart-empty">
                No workflow closure data available.
              </div>
            )}
          </div>
        </Panel>

        {/* ASSESSMENT INTELLIGENCE — SYSTEM ARCHITECTURE GRAPH */}
        <section className="pg-arch-pipeline-panel">
        <div className="pg-arch-pipeline-header">
          <div className="pg-arch-pipeline-title">
            <Network size={18} />
            <div>
              <strong>Assessment intelligence pipeline</strong>
              <span>System architecture view — from assets to controls</span>
            </div>
          </div>

          <div className="pg-arch-view-switch">
            <span>View:</span>

            <button
              type="button"
              className={pipelineView === 'graph' ? 'active' : ''}
              aria-pressed={pipelineView === 'graph'}
              onClick={() => setPipelineView('graph')}
            >
              Graph
            </button>

            <button
              type="button"
              className={pipelineView === 'list' ? 'active' : ''}
              aria-pressed={pipelineView === 'list'}
              onClick={() => setPipelineView('list')}
            >
              List
            </button>
          </div>
        </div>

        {pipelineView === 'graph' ? (
          <div className="pg-arch-pipeline-canvas pg-arch-dynamic-flow">

            <svg
              className="pg-arch-flow-lines"
              viewBox="0 0 1000 430"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <marker
                  id="pg-arrow-cyan"
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="4"
                  orient="auto"
                >
                  <path d="M0,0 L8,4 L0,8 Z" fill="#00c8f8" />
                </marker>

                <marker
                  id="pg-arrow-purple"
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="4"
                  orient="auto"
                >
                  <path d="M0,0 L8,4 L0,8 Z" fill="#a855f7" />
                </marker>

                <linearGradient
                  id="pg-classification-risk-gradient"
                  x1="100%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#00c8f8" />
                  <stop offset="42%" stopColor="#00c8f8" />
                  <stop offset="68%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#f43f5e" />
                </linearGradient>

                <marker
                  id="pg-arrow-red"
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="4"
                  orient="auto"
                >
                  <path d="M0,0 L8,4 L0,8 Z" fill="#f43f5e" />
                </marker>
              </defs>

              {/* Assets → Assessments */}
              <path
                className="pg-flow-path pg-flow-cyan"
                d="M190 112 H475"
                markerEnd="url(#pg-arrow-cyan)"
              />

              {/* Assessments → Classification */}
              <path
                className="pg-flow-path pg-flow-purple"
                d="M525 112 H810"
                markerEnd="url(#pg-arrow-purple)"
              />

              {/* Classification → Risks */}
              <path
                className="pg-flow-path pg-flow-classification-risk"
                d="M855 130
                   V205
                   Q855 225 835 225
                   H165
                   Q145 225 145 245
                   V300"
                markerEnd="url(#pg-arrow-red)"
              />

              {/* Risks → Controls */}
              <path
                className="pg-flow-path pg-flow-red"
                d="M190 325 H475"
                markerEnd="url(#pg-arrow-red)"
              />
            </svg>

            {pipeline.map((step, index) => {
              const Icon = step.icon;

              const stageClass = [
                'assets',
                'assessments',
                'classification',
                'risks',
                'controls',
              ][index];

              return (
                <div
                  className={`pg-arch-stage pg-arch-stage-${stageClass}`}
                  key={step.label}
                  title={`${step.label}: ${step.value} ${step.note}`}
                >
                  <div className="pg-arch-stage-visual">
                    <div className="pg-arch-platform pg-arch-platform-back" />
                    <div className="pg-arch-platform pg-arch-platform-front" />

                    <div className="pg-arch-stage-icon">
                      <Icon size={28} strokeWidth={1.8} />
                    </div>

                    <span className="pg-arch-stage-count">
                      {step.value}
                    </span>
                  </div>

                  <strong>{step.label}</strong>

                  <small className="pg-arch-stage-note">
                    {step.note}
                  </small>


                </div>
              );
            })}
          </div>
        ) : (
          <div className="pg-arch-list">
            {pipeline.map((step, index) => {
              const Icon = step.icon;

              const stageClass = [
                'assets',
                'assessments',
                'classification',
                'risks',
                'controls',
              ][index];

              return (
                <div
                  className={`pg-arch-list-row pg-arch-list-row-${stageClass}`}
                  key={step.label}
                >
                  <div className="pg-arch-list-icon">
                    <Icon size={18} strokeWidth={1.9} />
                  </div>

                  <div className="pg-arch-list-copy">
                    <strong>{step.label}</strong>
                    <span>{step.note}</span>
                  </div>

                  <div className="pg-arch-list-value">
                    {step.value}
                  </div>

                  {index < pipeline.length - 1 && (
                    <ArrowRight
                      className="pg-arch-list-arrow"
                      size={16}
                      aria-hidden="true"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        </section>

      </div>

      {/* WORKSPACE */}
      <div className="pg-command-bottom">
        <Panel
          title="Priority assets"
          icon={Database}
          action={
            <Link href="/data-inventory" className="pg-command-panel-link">
              View all assets <ArrowRight size={11} />
            </Link>
          }
        >
          <div className="pg-priority-assets">
            <div
              className="pg-priority-tabs"
              role="tablist"
              aria-label="Priority asset filters"
            >
              <button
                type="button"
                role="tab"
                aria-selected={priorityAssetTab === 'top'}
                className={priorityAssetTab === 'top' ? 'active' : ''}
                onClick={() => setPriorityAssetTab('top')}
              >
                <Database size={13} />
                <span>Top assets</span>
                <span className="pg-priority-tab-count">
                  {searchedAssets.length}
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={priorityAssetTab === 'high'}
                className={priorityAssetTab === 'high' ? 'active' : ''}
                onClick={() => setPriorityAssetTab('high')}
              >
                <AlertTriangle size={13} />
                <span>High risk</span>
                <span className="pg-priority-tab-count">
                  {searchedAssets.filter((asset) => asset.risk === 'High').length}
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={priorityAssetTab === 'needs-assessment'}
                className={
                  priorityAssetTab === 'needs-assessment' ? 'active' : ''
                }
                onClick={() => setPriorityAssetTab('needs-assessment')}
              >
                <ClipboardCheck size={13} />
                <span>Needs assessment</span>
                <span className="pg-priority-tab-count">
                  {
                    searchedAssets.filter(
                      (asset) => Number(asset.assessments || 0) === 0
                    ).length
                  }
                </span>
              </button>
            </div>

            <div className="pg-priority-table-wrap">
              <table className="pg-priority-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Environment</th>
                    <th>Assessments</th>
                    <th>Classification</th>
                    <th>Risk</th>
                  </tr>
                </thead>

                <tbody>
                  {priorityAssets.map((asset) => (
                    <tr key={asset.id}>
                      <td>
                        <Link
                          href="/data-inventory"
                          className="pg-priority-asset-name"
                        >
                          <span className="pg-priority-asset-icon">
                            <Database size={13} />
                          </span>
                          {asset.name}
                        </Link>
                      </td>

                      <td>{asset.environment || 'Not specified'}</td>

                      <td className="pg-priority-assessment-count">
                        {asset.assessments}
                      </td>

                      <td>
                        <Badge
                          tone={
                            asset.classification === 'Sensitive PII'
                              ? 'red'
                              : asset.classification === 'Confidential'
                                ? 'violet'
                                : asset.classification === 'Unknown'
                                  ? 'amber'
                                  : 'blue'
                          }
                        >
                          {asset.classification || 'Unknown'}
                        </Badge>
                      </td>

                      <td>
                        <Badge
                          tone={
                            asset.risk === 'High'
                              ? 'red'
                              : asset.risk === 'Medium'
                                ? 'amber'
                                : asset.risk === 'Low'
                                  ? 'teal'
                                  : 'blue'
                          }
                        >
                          {asset.risk || 'Unknown'}
                        </Badge>
                      </td>
                    </tr>
                  ))}

                  {priorityAssets.length === 0 && (
                    <tr className="pg-priority-empty-row">
                      <td colSpan={5}>
                        <div className="pg-priority-empty">
                          <Database size={18} />
                          <span>
                            {priorityAssetTab === 'high'
                              ? 'No high-risk assets in the current view.'
                              : priorityAssetTab === 'needs-assessment'
                                ? 'All visible assets have an assessment.'
                                : 'No assets match the current search.'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Panel>

        <Panel title="Security actions" icon={Zap}>
          <div className="pg-command-actions">
            <Link href="/assessments">
              <div className="pg-command-action-icon">
                <FileText size={16} />
              </div>

              <div>
                <strong>Run assessment</strong>
                <span>Analyze approved metadata</span>
              </div>

              <ArrowRight size={13} />
            </Link>

            <Link href="/risk-register">
              <div className="pg-command-action-icon amber">
                <AlertTriangle size={16} />
              </div>

              <div>
                <strong>Review priority risks</strong>
                <span>{highRisks} items require review</span>
              </div>

              <ArrowRight size={13} />
            </Link>

            <Link href="/ai-assistant">
              <div className="pg-command-action-icon teal">
                <Sparkles size={18} />
              </div>

              <div>
                <strong>Ask PrivacyGuard AI</strong>
                <span>Grounded security guidance</span>
              </div>

              <ArrowRight size={14} />
            </Link>

            <Link href="/controls-compliance">
              <div className="pg-command-action-icon blue">
                <Shield size={18} />
              </div>

              <div>
                <strong>Browse control library</strong>
                <span>View mapped GDPR + ISO controls</span>
              </div>

              <ArrowRight size={14} />
            </Link>
          </div>
        </Panel>
      </div>

      </div>
      {/* END FINAL 3x3 DASHBOARD */}

</div>
  );
}

function Workflows() {
  const [workflowPage, setWorkflowPage] = useState(1);
  const workflowRowsPerPage = 10;
  const { workflows, globalSearch, notify, refreshWorkspace } = useWorkspace();
  const [query, setQuery] = useState('');
  const [owner, setOwner] = useState('All owners');
  const [remediationFilter, setRemediationFilter] = useState('All remediation');
  const [closureFilter, setClosureFilter] = useState('All closure');

  const options = ['Ongoing', 'Partial', 'Completed', 'Lifetime'];
  const closureOptions = ['Open', 'In review', 'Completed', 'Lifetime'];

  const ownerOptions = [
    'All owners',
    ...Array.from(new Set(workflows.map((w) => w.owner).filter(Boolean))).sort(),
  ];

  const searchTerm = [query, globalSearch]
    .filter(Boolean)
    .join(' ')
    .trim()
    .toLowerCase();

  const filtered = workflows.filter((w) => {
    const searchableText = [
      `WF-${String(w.id).padStart(3, '0')}`,
      w.asset,
      w.assessment,
      w.classification,
      w.risk,
      w.control,
      w.owner,
      w.remediation,
      w.closure,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matchesSearch = !searchTerm || searchableText.includes(searchTerm);
    const matchesOwner = owner === 'All owners' || w.owner === owner;
    const matchesRemediation =
      remediationFilter === 'All remediation' ||
      w.remediation === remediationFilter;
    const matchesClosure =
      closureFilter === 'All closure' ||
      w.closure === closureFilter;

    return matchesSearch && matchesOwner && matchesRemediation && matchesClosure;
  });
  const workflowTotalPages = Math.max(
    1,
    Math.ceil(filtered.length / workflowRowsPerPage)
  );

  const currentWorkflowPage = Math.min(
    workflowPage,
    workflowTotalPages
  );

  const paginatedWorkflows = filtered.slice(
    (currentWorkflowPage - 1) * workflowRowsPerPage,
    currentWorkflowPage * workflowRowsPerPage
  );

  const workflowStart = filtered.length
    ? (currentWorkflowPage - 1) * workflowRowsPerPage + 1
    : 0;

  const workflowEnd = Math.min(
    currentWorkflowPage * workflowRowsPerPage,
    filtered.length
  );

  const workflowStatusTone = (value: string): any => ({
    Open: 'red',
    Partial: 'violet',
    Ongoing: 'amber',
    'In review': 'blue',
    Lifetime: 'teal',
    Completed: 'teal',
  }[value] || 'blue');
  const workflowStatusSelectClass = (value: string, width: string) => `${width} ${
    {
      Open: 'border-red-400/60 bg-red-500/10 text-red-100',
      Partial: 'border-violet-400/60 bg-violet-500/10 text-violet-100',
      Ongoing: 'border-amber-400/60 bg-amber-500/10 text-amber-100',
      'In review': 'border-blue-400/60 bg-blue-500/10 text-blue-100',
      Lifetime: 'border-teal-400/60 bg-teal-500/10 text-teal-100',
      Completed: 'border-teal-400/60 bg-teal-500/10 text-teal-100',
    }[value] || 'border-slate-700 text-slate-200'
  }`;
  const update = async (id: number, key: 'remediation' | 'closure', value: string) => { try { await updateWorkflow(id, { [key]: value }); await refreshWorkspace(); notify('Workflow status saved'); } catch (error) { notify('Workflow update failed. Confirm that the API is running on port 8001.'); } };
  // Dashboard counts are based only on the Closure status.
  const totalWorkflows = workflows.length;
  const openClosureWorkflows = workflows.filter((workflow) => workflow.closure === 'Open').length;
  const inReviewClosureWorkflows = workflows.filter((workflow) => workflow.closure === 'In review').length;
  const closedWorkflows = workflows.filter((workflow) => ['Completed', 'Lifetime'].includes(workflow.closure)).length;
  const today = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date());
  return <div className="pg-content"><PageHeader title="Workflows" description="Track assessment follow-up across linked assets." actions={<div className="text-right text-[10px] text-slate-400">Good morning. Here’s what’s happening today.<br /><span className="font-mono text-slate-200">{today}</span></div>} />
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Active workflows" value={totalWorkflows} icon={FileText} note="All workflows in this workspace" /><StatCard label="Open" value={openClosureWorkflows} icon={AlertCircle} tone="red" note="Closure is still open" /><StatCard label="In review" value={inReviewClosureWorkflows} icon={Activity} tone="blue" note="Closure evidence is under review" /><StatCard label="Closed" value={closedWorkflows} icon={CheckCircle2} tone="teal" note="Completed or lifetime closure" /></div>
    <Panel title="Workflow Register" icon={Network} className="pg-workflow-register"><div className="flex flex-wrap gap-2 border-b border-slate-800 p-3"><SearchBox placeholder="Search workflow ID, asset, assessment, owner, status..." value={query} onChange={setQuery} testId="input-search-workflows" /><Select value={owner} onChange={setOwner} options={ownerOptions} testId="select-workflow-owner" className="w-[140px]" /><Select value={remediationFilter} onChange={setRemediationFilter} options={['All remediation', ...options]} testId="select-workflow-remediation-filter" className="w-[150px]" /><Select value={closureFilter} onChange={setClosureFilter} options={['All closure', ...closureOptions]} testId="select-workflow-closure-filter" className="w-[140px]" /></div><div className="pg-workflow-table-scroll"><table className="pg-table"><thead><tr>{['Workflow', 'Linked asset', 'Linked assessment', 'Classification', 'Calculated risk', 'Control map', 'Owner', 'Remediation', 'Status', 'Closure', 'Status', 'Last updated'].map((heading, i) => <th key={`${heading}-${i}`}>{heading}</th>)}</tr></thead><tbody>{paginatedWorkflows.map((w) => <tr key={w.id}><td className="font-semibold text-slate-100">WF-{String(w.id).padStart(3, '0')}</td><td>{w.asset}</td><td>{w.assessment}</td><td><Badge tone={w.classification === 'Sensitive PII' ? 'red' : w.classification === 'Confidential' ? 'violet' : 'blue'}>{w.classification}</Badge></td><td><Badge tone={w.risk === 'High' ? 'red' : w.risk === 'Medium' ? 'amber' : 'teal'}>{w.risk}</Badge></td><td className="pg-mono text-cyan-200">{w.control}</td><td>{w.owner}</td><td><Select value={w.remediation} onChange={(value) => update(w.id, 'remediation', value)} options={options} testId={`select-remediation-${w.id}`} className={workflowStatusSelectClass(w.remediation, "min-w-[120px]")} /></td><td><Badge tone={workflowStatusTone(w.remediation)} dot>{w.remediation}</Badge></td><td><Select value={w.closure} onChange={(value) => update(w.id, 'closure', value)} options={closureOptions} testId={`select-closure-${w.id}`} className={workflowStatusSelectClass(w.closure, "min-w-[110px]")} /></td><td><Badge tone={workflowStatusTone(w.closure)} dot>{w.closure}</Badge></td><td className="whitespace-nowrap text-[10px] text-slate-500">{w.updated}</td></tr>)}</tbody></table>{filtered.length === 0 && <EmptyState message="No workflows match these filters." />}</div>

      <div className="pg-workflow-pagination">
        <span className="text-[10px] text-slate-500">
          Showing {workflowStart}–{workflowEnd} of {filtered.length} workflows
        </span>

        <div className="flex items-center gap-2">
          <button
            className="pg-button"
            disabled={currentWorkflowPage <= 1}
            onClick={() =>
              setWorkflowPage((page) => Math.max(1, page - 1))
            }
          >
            <ChevronLeft size={13} />
            Previous
          </button>

          <span className="pg-workflow-page-number">
            Page {currentWorkflowPage} of {workflowTotalPages}
          </span>

          <button
            className="pg-button"
            disabled={currentWorkflowPage >= workflowTotalPages}
            onClick={() =>
              setWorkflowPage((page) =>
                Math.min(workflowTotalPages, page + 1)
              )
            }
          >
            Next
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

    </Panel>
  </div>;
}

const risks = [
  { id: 'PRIV-001', title: 'Privileged access lacks MFA', asset: 'Customer Portal', assessment: 'Access Control Review', classification: 'Confidential', likelihood: 'High', impact: 'High', score: 20, owner: 'Jordan Diaz', controls: 'GDPR Art. 32 · ISO 27001 A.5.15' },
  { id: 'PRIV-002', title: 'Retention period not defined', asset: 'HR Database', assessment: 'Data Retention Assessment', classification: 'Restricted PII', likelihood: 'Medium', impact: 'High', score: 16, owner: 'Emma Turner', controls: 'GDPR Art. 32 · ISO 27001 A.5.18' },
  { id: 'PRIV-003', title: 'Third-party processor review required', asset: 'Vendor Email Service', assessment: 'Third-Party Risk Assessment', classification: 'Confidential', likelihood: 'Medium', impact: 'Medium', score: 12, owner: 'Sarah Lee', controls: 'GDPR Art. 32 · ISO 27001 A.5.19' },
  { id: 'PRIV-004', title: 'Sensitive support attachments', asset: 'Customer Portal', assessment: 'Support Process Review', classification: 'Sensitive PII', likelihood: 'Low', impact: 'High', score: 10, owner: 'Miguel Santos', controls: 'GDPR Art. 32 · ISO 27001 A.5.15' },
];
function RiskRegister() {
  const [riskPage, setRiskPage] = useState(1);
  const riskRowsPerPage = 10;
  const { notify, globalSearch } = useWorkspace();
  const [risks, setRisks] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [query, setQuery] = useState('');
  const [severity, setSeverity] = useState('All severity');
  const [classification, setClassification] = useState('All classifications');
  const [owner, setOwner] = useState('All owners');
  const [linkedAsset, setLinkedAsset] = useState('All linked assets');
  const [framework, setFramework] = useState('All frameworks');
  const [loading, setLoading] = useState(true);
  const [guidance, setGuidance] = useState('');
  const [asking, setAsking] = useState(false);

  const loadRisks = async () => {
    setLoading(true);
    try {
      const items = await loadRiskRegisterData();
      setRisks(items);
      setSelected((current: any) => items.find((item: any) => item.dbId === current?.dbId) || items[0] || null);
    } catch (error) {
      notify('Backend is unavailable. Start the API on port 8001.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadRisks(); }, []);

  const owners = ['All owners', ...Array.from(new Set(risks.map((risk) => risk.owner)))];
  const linkedAssets = ['All linked assets', ...Array.from(new Set(risks.map((risk) => risk.asset)))];
  const activeSearch = (query.trim() || globalSearch.trim()).toLowerCase();
  const filtered = risks.filter((risk) => {
    const searchable = `${risk.id} ${risk.title} ${risk.asset} ${risk.assessment} ${risk.owner} ${risk.classification}`.toLowerCase();
    return (!activeSearch || searchable.includes(activeSearch))
      && (severity === 'All severity' || risk.likelihood === severity)
      && (classification === 'All classifications' || risk.classification === classification)
      && (owner === 'All owners' || risk.owner === owner)
      && (linkedAsset === 'All linked assets' || risk.asset === linkedAsset)
      && (framework === 'All frameworks' || risk.controls.some((control: any) => control.framework === framework));
  });

  const riskTone = (value: string) => value === 'High' ? 'red' : value === 'Medium' ? 'amber' : 'teal';
  const classificationTone = (value: string) => value === 'Sensitive PII' ? 'red' : value === 'Confidential' ? 'violet' : value === 'Restricted PII' ? 'blue' : 'teal';

  const askAI = async (risk: any) => {
    setSelected(risk);
    setAsking(true);
    setGuidance('');
    try {
      const result = await requestRiskGuidance(risk.dbId, 'Explain why this calculated risk needs attention, which mapped controls are most relevant, and the next practical remediation step.');
      setGuidance(result.answer || 'No guidance was returned.');
      notify(`AI guidance prepared for ${risk.id}`);
    } catch (error) {
      notify('AI guidance is unavailable. Confirm that Ollama and the API are running.');
    } finally {
      setAsking(false);
    }
  };

  const exportRisks = () => {
    const header = ['Risk ID', 'Risk title', 'Linked asset', 'Linked assessment', 'Classification', 'Likelihood', 'Impact', 'Inherent score', 'Owner', 'Mapped controls'];
    const lines = paginatedRisks.map((risk) => [risk.id, risk.title, risk.asset, risk.assessment, risk.classification, risk.likelihood, risk.impact, risk.score, risk.owner, risk.controls.map((control: any) => control.label).join(' | ')]);
    const csv = [header, ...lines].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    const file = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'privacyguard-risk-register.csv';
    link.click();
    URL.revokeObjectURL(url);
    notify(`${filtered.length} live risk records exported`);
  };

  const renderGuidance = (answer: string) => {
    const headings = new Set([
      'assessment insight', 'classification explanation', 'calculated risk guidance',
      'control map guidance', 'suggested next step', 'important limitation',
    ]);
    const lines = answer.split('\n').map((line) => line.trim()).filter(Boolean);
    return <div className="max-h-[360px] space-y-3 overflow-y-auto rounded border border-cyan-400/25 bg-cyan-500/5 p-4 text-[11px] leading-relaxed text-slate-300">
      {lines.map((line, index) => {
        const clean = line.replace(/\*\*/g, '').replace(/^[-*]\s*/, '');
        const match = clean.match(/^([^:]{3,48}):\s*(.*)$/);
        const isHeading = match && headings.has(match[1].trim().toLowerCase());
        if (isHeading) return <section key={`${index}-${clean.slice(0, 18)}`} className="border-b border-cyan-400/10 pb-3 last:border-0 last:pb-0"><h4 className="mb-1.5 text-[12px] font-bold text-cyan-100">{match[1]}</h4>{match[2] && <p className="break-words text-slate-300">{match[2]}</p>}</section>;
        const numbered = /^\d+\.\s+/.test(clean);
        return <p key={`${index}-${clean.slice(0, 18)}`} className={`${numbered ? 'border-l-2 border-cyan-400/35 pl-3 text-slate-200' : 'break-words'} ${clean.length < 60 ? 'font-medium text-slate-200' : ''}`}>{clean}</p>;
      })}
    </div>;
  };

  const riskTotalPages = Math.max(
    1,
    Math.ceil(filtered.length / riskRowsPerPage)
  );

  const currentRiskPage = Math.min(
    riskPage,
    riskTotalPages
  );

  const paginatedRisks = filtered.slice(
    (currentRiskPage - 1) * riskRowsPerPage,
    currentRiskPage * riskRowsPerPage
  );

  return <div className="pg-content">
    <PageHeader title="Risk Register" description="Calculated privacy and security risks from linked assets and assessments." actions={<div className="flex items-center gap-2"><span className="text-[10px] text-slate-500">Calculated automatically</span><button className="pg-button" onClick={exportRisks} disabled={!filtered.length} data-testid="button-export-risks"><Download size={14} />Export</button></div>} />
    <div className="pg-risk-workspace grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Panel title="Calculated risks" icon={AlertTriangle} className="pg-risk-table-panel">
        <div className="border-b border-slate-800 p-3"><Toolbar><SearchBox placeholder="Search risks by title, asset, assessment, or owner..." value={query} onChange={setQuery} testId="input-search-risks" /><span className="self-center whitespace-nowrap text-[10px] text-slate-500">{filtered.length} results</span><Select value={linkedAsset} onChange={setLinkedAsset} options={linkedAssets} testId="select-risk-linked-asset" className="w-[190px]" /><Select value={severity} onChange={setSeverity} options={['All severity', 'High', 'Medium', 'Low']} testId="select-risk-severity" className="w-[145px]" /><Select value={classification} onChange={setClassification} options={['All classifications', 'Internal', 'Confidential', 'Restricted PII', 'Sensitive PII', 'Unknown']} testId="select-risk-classification" className="w-[175px]" /><Select value={owner} onChange={setOwner} options={owners} testId="select-risk-owner" className="w-[145px]" /><Select value={framework} onChange={setFramework} options={['All frameworks', 'GDPR', 'ISO/IEC 27001:2022']} testId="select-risk-framework" className="w-[175px]" /><button className="pg-button ghost" onClick={() => { setQuery(''); setSeverity('All severity'); setClassification('All classifications'); setOwner('All owners'); setLinkedAsset('All linked assets'); setFramework('All frameworks'); }} data-testid="button-clear-risk-filters"><Filter size={14} />Clear</button></Toolbar></div>
        <div className="pg-scroll-x pg-risk-table-scroll"><table className="pg-table min-w-[1120px]"><thead><tr>{['', 'Risk ID', 'Risk title', 'Linked asset', 'Linked assessment', 'Classification', 'Likelihood', 'Impact', 'Inherent score', 'Owner', 'Mapped controls', 'Ask AI'].map((heading, index) => <th key={`${heading}-${index}`}>{heading}</th>)}</tr></thead><tbody>{paginatedRisks.map((risk) => <tr key={risk.dbId} onClick={() => { setSelected(risk); setGuidance(''); }} className="cursor-pointer"><td><input type="checkbox" checked={selected?.dbId === risk.dbId} readOnly className="accent-cyan-400" aria-label={`Select ${risk.id}`} data-testid={`checkbox-risk-${risk.id}`} /></td><td className="pg-mono text-cyan-200">{risk.id}</td><td className="font-semibold text-slate-100">{risk.title}</td><td>{risk.asset}</td><td>{risk.assessment}</td><td><Badge tone={classificationTone(risk.classification) as any}>{risk.classification}</Badge></td><td><Badge tone={riskTone(risk.likelihood) as any}>{risk.likelihood}</Badge></td><td><Badge tone={riskTone(risk.impact) as any}>{risk.impact}</Badge></td><td className="font-mono text-[16px] font-bold text-amber-300">{risk.score}</td><td>{risk.owner}</td><td className="max-w-[180px] text-[10px]">{risk.controls.map((control: any) => control.label).join(' · ') || '—'}</td><td><button className="pg-button h-7 w-7 p-0 text-cyan-300" onClick={(event) => { event.stopPropagation(); void askAI(risk); }} aria-label={`Ask AI about ${risk.id}`} data-testid={`button-ask-risk-${risk.id}`}><Sparkles size={14} /></button></td></tr>)}</tbody></table>{loading && <EmptyState message="Loading calculated risks..." />}{!loading && filtered.length === 0 && <EmptyState message="No calculated risks match these filters." />}</div>

        <div className="pg-risk-pagination flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-4 py-3">

          <span className="text-[9px] text-slate-500">
            Showing {filtered.length === 0 ? 0 : ((currentRiskPage - 1) * riskRowsPerPage) + 1}
            {' '}–{' '}
            {Math.min(currentRiskPage * riskRowsPerPage, filtered.length)}
            {' '}of {filtered.length} risks
          </span>

          <div className="flex items-center gap-2">

            <button
              className="pg-button"
              disabled={currentRiskPage <= 1}
              onClick={() =>
                setRiskPage((page) => Math.max(1, page - 1))
              }
            >
              <ChevronLeft size={13} />
              Previous
            </button>

            <span className="min-w-[70px] text-center text-[9px] text-slate-400">
              Page {currentRiskPage} of {riskTotalPages}
            </span>

            <button
              className="pg-button"
              disabled={
                currentRiskPage >= riskTotalPages ||
                filtered.length === 0
              }
              onClick={() =>
                setRiskPage((page) =>
                  Math.min(riskTotalPages, page + 1)
                )
              }
            >
              Next
              <ChevronRight size={13} />
            </button>

          </div>

          <span className="text-[9px] text-slate-600">
            {filtered.length} total calculated risks
          </span>

        </div>
      </Panel>
      <Panel className="pg-risk-detail-panel pg-risk-modern-card min-w-0">
        {selected ? (
          <>
            <div className="pg-risk-modern-header">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="pg-risk-modern-alert">
                    <AlertTriangle size={20} />
                  </div>

                  <div className="min-w-0">
                    <div className="pg-mono text-[10px] text-slate-400">
                      {selected.id}
                    </div>

                    <div className="mt-1 text-[14px] font-semibold leading-snug text-slate-100">
                      {selected.title}
                    </div>
                  </div>
                </div>

                <button
                  className="pg-button ghost h-6 w-6 shrink-0 p-0"
                  onClick={() => {
                    setSelected(risks[0] || null);
                    setGuidance('');
                  }}
                  aria-label="Reset selected risk"
                  data-testid="button-reset-risk"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="pg-risk-modern-badges">
                <span className="pg-risk-modern-badge pg-risk-modern-badge-high">
                  <span className="pg-risk-modern-dot" />
                  {selected.score >= 16
                    ? 'High Risk'
                    : selected.score >= 8
                      ? 'Medium Risk'
                      : 'Low Risk'}
                </span>

                <span className="pg-risk-modern-badge">
                  Score {selected.score}
                </span>

                <span className="pg-risk-modern-badge pg-risk-modern-badge-classification">
                  {selected.classification}
                </span>
              </div>
            </div>

            <div className="pg-risk-detail-scroll pg-risk-modern-body">

              <section className="pg-risk-modern-section">
                <h3 className="pg-risk-modern-section-title">
                  <BarChart3 size={15} />
                  Why it was calculated
                </h3>

                <p className="pg-risk-modern-rationale">
                  {selected.rationale}
                </p>
              </section>

              <section className="pg-risk-modern-section">
                <h3 className="pg-risk-modern-section-title">
                  <Link2 size={15} />
                  Linked context
                </h3>

                <div className="pg-risk-context-grid">

                  <div className="pg-risk-context-card">
                    <div className="pg-risk-context-icon">
                      <Database size={16} />
                    </div>

                    <div className="min-w-0">
                      <div className="pg-risk-context-label">Asset</div>
                      <div className="pg-risk-context-value">
                        {selected.asset}
                      </div>
                    </div>
                  </div>

                  <div className="pg-risk-context-card">
                    <div className="pg-risk-context-icon">
                      <ClipboardCheck size={16} />
                    </div>

                    <div className="min-w-0">
                      <div className="pg-risk-context-label">Assessment</div>
                      <div className="pg-risk-context-value">
                        {selected.assessment}
                      </div>
                    </div>
                  </div>

                  <div className="pg-risk-context-card">
                    <div className="pg-risk-context-icon">
                      <Users size={16} />
                    </div>

                    <div className="min-w-0">
                      <div className="pg-risk-context-label">Owner</div>
                      <div className="pg-risk-context-value">
                        {selected.owner}
                      </div>
                    </div>
                  </div>

                </div>
              </section>

              <section className="pg-risk-modern-section">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="pg-risk-modern-section-title mb-0">
                    <Shield size={15} />
                    Mapped controls
                  </h3>

                  <span className="pg-risk-control-count">
                    {selected.controls?.length || 0}
                  </span>
                </div>

                <div className="pg-risk-modern-controls">
                  {selected.controls?.length ? (
                    selected.controls.map((control: any) => (
                      <div
                        key={control.id}
                        className="pg-risk-modern-control"
                      >
                        <Shield size={14} />
                        <span>{control.label}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-500">
                      No mapped controls
                    </span>
                  )}
                </div>
              </section>

              {guidance && (
                <div className="pg-risk-modern-guidance">
                  {renderGuidance(guidance)}
                </div>
              )}

              <button
                className="pg-button primary pg-risk-modern-ai-button w-full"
                onClick={() => void askAI(selected)}
                disabled={asking}
                data-testid="button-risk-guidance"
              >
                <Sparkles size={15} />
                {asking ? 'Preparing guidance...' : 'Ask AI for guidance'}
                <ArrowRight size={15} />
              </button>

            </div>
          </>
        ) : (
          <EmptyState message="No calculated risks yet. Upload an assessment to generate one." />
        )}
      </Panel>
    </div>
  </div>;
}

function AddAssetModal({ onClose }: { onClose: () => void }) {
  const { notify, refreshWorkspace } = useWorkspace();
  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState('Application');
  const [purpose, setPurpose] = useState('');
  const [owner, setOwner] = useState('Data Engineering');
  const [environment, setEnvironment] = useState('Cloud application');
  const [location, setLocation] = useState('');
  const [processors, setProcessors] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const hasManualAsset = Boolean(name.trim() && purpose.trim() && location.trim());

    // Either a complete manual form OR an Asset Profile file is enough.
    if (!hasManualAsset && !attachmentFile) {
      setError('Use one method: complete the manual details or upload an Asset Profile file.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await createAsset({
        name: name.trim(),
        asset_type: assetType,
        owner,
        business_purpose: purpose.trim(),
        environment,
        data_location: location.trim(),
        processors,
      }, attachmentFile);

      await refreshWorkspace();
      notify('Asset saved and added to the inventory.');
      onClose();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Could not save the asset.';
      setError(message.replace(/^{"detail":"?/, '').replace(/"}$/, ''));
    } finally {
      setSaving(false);
    }
  };

  return <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
    <div className="pg-panel w-full max-w-[510px] pg-fade-in">
      <div className="pg-panel-header"><div><div className="pg-kicker">Inventory intake</div><h2 className="text-[17px] font-semibold">Add Asset</h2></div><button className="pg-button ghost h-7 w-7 p-0" onClick={onClose} aria-label="Close add asset" data-testid="button-close-add-asset"><X size={15} /></button></div>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        <label className="text-[11px] text-slate-300 sm:col-span-2">Asset name<input value={name} onChange={(e) => setName(e.target.value)} className="pg-input mt-1" placeholder="Customer Feedback Portal" data-testid="input-asset-name" /></label>
        <label className="text-[11px] text-slate-300 sm:col-span-2">Business purpose<textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} className="pg-input mt-1 h-20 py-2" placeholder="Collect and analyse customer feedback..." data-testid="input-asset-purpose" /></label>
        <label className="text-[11px] text-slate-300">Asset type<Select value={assetType} onChange={setAssetType} options={['Application', 'Database', 'SaaS service', 'Vendor', 'Technical asset']} testId="select-asset-type" className="mt-1" /></label>
        <label className="text-[11px] text-slate-300">Business owner<Select value={owner} onChange={setOwner} options={['Data Engineering', 'People & Culture', 'Finance', 'Marketing', 'IT']} testId="select-asset-owner" className="mt-1" /></label>
        <label className="text-[11px] text-slate-300">Environment<Select value={environment} onChange={setEnvironment} options={['Cloud application', 'SaaS platform', 'Public website', 'HR systems', 'Data platform']} testId="select-asset-environment" className="mt-1" /></label>
        <label className="text-[11px] text-slate-300">Data location<input value={location} onChange={(e) => setLocation(e.target.value)} className="pg-input mt-1" placeholder="EU region, AWS" data-testid="input-asset-location" /></label>
        <label className="text-[11px] text-slate-300 sm:col-span-2">Third parties / processors<input value={processors} onChange={(e) => setProcessors(e.target.value)} className="pg-input mt-1" placeholder="AWS, Stripe" data-testid="input-asset-processors" /></label>
        <label className="flex cursor-pointer items-center gap-2 rounded border border-dashed border-slate-600 bg-slate-900/40 p-3 text-[11px] text-slate-500 sm:col-span-2"><Paperclip size={17} className="text-cyan-300" /><span className="flex-1">{attachmentFile?.name || 'Optional attachment · PDF, DOCX, XLSX'}</span><input type="file" accept=".pdf,.docx,.xlsx" className="hidden" onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)} data-testid="input-asset-attachment" /><span className="pg-button h-7 px-2">Browse</span></label>
        {error && <p className="rounded border border-red-400/35 bg-red-500/10 px-3 py-2 text-[11px] text-red-200 sm:col-span-2" data-testid="asset-save-error">{error}</p>}
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-800 p-4"><button className="pg-button" onClick={onClose} disabled={saving} data-testid="button-cancel-add-asset">Cancel</button><button className="pg-button primary" onClick={submit} disabled={saving} data-testid="button-submit-add-asset"><Plus size={14} />{saving ? 'Saving...' : 'Add asset'}</button></div>
    </div>
  </div>;
}
function DataInventory() {
  const { assets, globalSearch } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [classification, setClassification] = useState('All classifications');
  const [assetType, setAssetType] = useState('All asset types');
  const [owner, setOwner] = useState('All owners');
  const [selected, setSelected] = useState<Asset | null>(null);

  const [assetPage, setAssetPage] = useState(1);
  const assetsPerPage = 10;

  const owners = ['All owners', ...Array.from(new Set(assets.map((asset) => asset.owner)))];
  const assetTypes = ['All asset types', ...Array.from(new Set(assets.map((asset) => asset.assetType || 'Application')))];
  const filtered = assets.filter((a) => `${a.name} ${a.owner} ${a.purpose} ${globalSearch} ${query}`.toLowerCase().includes((query || globalSearch).toLowerCase()) && (classification === 'All classifications' || a.classification === classification) && (assetType === 'All asset types' || (a.assetType || 'Application') === assetType) && (owner === 'All owners' || a.owner === owner));

  const assetTotalPages = Math.max(1, Math.ceil(filtered.length / assetsPerPage));
  const currentAssetPage = Math.min(assetPage, assetTotalPages);

  const paginatedAssets = filtered.slice(
    (currentAssetPage - 1) * assetsPerPage,
    currentAssetPage * assetsPerPage
  );

  const assetStart = filtered.length
    ? (currentAssetPage - 1) * assetsPerPage + 1
    : 0;

  const assetEnd = Math.min(
    currentAssetPage * assetsPerPage,
    filtered.length
  );
  return <div className="pg-content">
    <PageHeader title="Data Inventory" description="A consolidated view of all assets and their linked assessments." actions={<button className="pg-button primary" onClick={() => setOpen(true)} data-testid="button-open-add-asset"><Plus size={15} />Add Asset</button>} />
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4"><StatCard label="Linked assets" value="18" icon={Database} note="Across your inventory" /><StatCard label="With assessments" value="12" icon={ClipboardCheck} tone="violet" note="Linked records" /><StatCard label="High risk assets" value="8" icon={AlertTriangle} tone="red" note="Needs review" /><StatCard label="Mapped controls" value="36" icon={Shield} tone="teal" note="GDPR + ISO/IEC 27001:2022" /></div>
    <Panel title="Asset register" icon={Database} className="pg-asset-register">
      <div className="flex flex-wrap gap-2 border-b border-slate-800 p-3"><SearchBox placeholder="Search assets..." value={query} onChange={setQuery} testId="input-search-assets" /><Select value={classification} onChange={setClassification} options={['All classifications', 'Internal', 'Confidential', 'Restricted PII', 'Sensitive PII', 'Unknown']} testId="select-asset-classification" className="w-[170px]" /><Select value={assetType} onChange={setAssetType} options={assetTypes} testId="select-asset-type-filter" className="w-[145px]" /><Select value={owner} onChange={setOwner} options={owners} testId="select-asset-owner-filter" className="w-[145px]" /><span className="ml-auto self-center text-[10px] text-slate-500">{filtered.length} assets</span></div>
      <div className="pg-asset-table-scroll"><table className="pg-table min-w-[1040px]"><thead><tr>{['Asset name', 'Asset type', 'Owner', 'Environment', 'Linked assessments', 'Highest classification', 'Calculated risk', 'Third parties / processors', 'Last updated'].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{paginatedAssets.map((asset) => <tr key={asset.id} className="cursor-pointer" onClick={() => setSelected(asset)}><td><div className="flex items-center gap-2 font-semibold text-slate-100"><Database size={14} className="text-cyan-300" />{asset.name}</div></td><td>{asset.assetType || 'Application'}</td><td>{asset.owner}</td><td>{asset.environment}</td><td className="text-center">{asset.assessments}</td><td><Badge tone={asset.classification === 'Confidential' ? 'violet' : asset.classification === 'Sensitive PII' ? 'red' : asset.classification === 'Unknown' ? 'amber' : 'blue'}>{asset.classification}</Badge></td><td><Badge tone={asset.risk === 'High' ? 'red' : asset.risk === 'Medium' ? 'amber' : asset.risk === 'Low' ? 'teal' : 'blue'}>{asset.risk}</Badge></td><td className="text-[10px]">{asset.processors}</td><td className="whitespace-nowrap text-[10px] text-slate-500">{asset.updated || '10 Jan 2025'}</td></tr>)}</tbody></table>{filtered.length === 0 && <EmptyState message="No assets match these filters." />}</div>

      <div className="pg-asset-pagination">
        <div className="text-[10px] text-slate-500">
          Showing {assetStart}–{assetEnd} of {filtered.length} assets
        </div>

        <div className="flex items-center gap-2">
          <button
            className="pg-button"
            disabled={currentAssetPage <= 1}
            onClick={() => setAssetPage((page) => Math.max(1, page - 1))}
          >
            <ChevronLeft size={13} />
            Previous
          </button>

          <div className="pg-asset-page-number">
            Page {currentAssetPage} of {assetTotalPages}
          </div>

          <button
            className="pg-button"
            disabled={currentAssetPage >= assetTotalPages}
            onClick={() =>
              setAssetPage((page) => Math.min(assetTotalPages, page + 1))
            }
          >
            Next
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

    </Panel>
    {open && <AddAssetModal onClose={() => setOpen(false)} />}
    {selected && <div className="fixed inset-0 z-30 flex justify-end bg-slate-950/50" onClick={() => setSelected(null)}><div className="h-full w-full max-w-[370px] overflow-y-auto border-l border-cyan-400/25 bg-slate-950 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="flex justify-between"><div><div className="pg-kicker">Asset detail</div><h2 className="mt-1 text-[19px] font-semibold">{selected.name}</h2></div><button className="pg-button ghost h-7 w-7 p-0" onClick={() => setSelected(null)} aria-label="Close asset details" data-testid="button-close-asset-details"><X size={15} /></button></div><div className="mt-5 space-y-3 text-[12px]">{[['Asset type', selected.assetType || 'Application'], ['Business purpose', selected.purpose], ['Owner', selected.owner], ['Environment', selected.environment], ['Data location', selected.location], ['Processors / third parties', selected.processors]].map(([label, value]) => <div key={label} className="border-b border-slate-800 pb-3"><div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 text-slate-200">{value}</div></div>)}<div className="pt-2"><Badge tone="blue">{selected.classification}</Badge><span className="ml-2"><Badge tone={selected.risk === 'High' ? 'red' : 'amber'}>{selected.risk} risk</Badge></span></div></div></div></div>}
  </div>;
}

const controls = [{ code: 'Article 5', name: 'Principles relating to processing of personal data', framework: 'GDPR' }, { code: 'Article 25', name: 'Data protection by design and by default', framework: 'GDPR' }, { code: 'Article 28', name: 'Processor', framework: 'GDPR' }, { code: 'Article 30', name: 'Records of processing activities', framework: 'GDPR' }, { code: 'Article 32', name: 'Security of processing', framework: 'GDPR' }, { code: 'A.5.34', name: 'Privacy and protection of PII', framework: 'ISO 27001' }, { code: 'A.8.10', name: 'Information deletion', framework: 'ISO 27001' }, { code: 'A.8.12', name: 'Data leakage prevention', framework: 'ISO 27001' }, { code: 'A.8.15', name: 'Logging', framework: 'ISO 27001' }, { code: 'A.8.24', name: 'Use of cryptography', framework: 'ISO 27001' }];
// @ts-ignore The catalog rows intentionally store icon components beside copy in a compact tuple.
function ControlsCompliance() {
  const [selected, setSelected] = useState(controls[4]);
  const [query, setQuery] = useState('');
  const [frameworkFilter, setFrameworkFilter] = useState('All');
  const [linkedRisks, setLinkedRisks] = useState<any[]>([]);
  const [guidance, setGuidance] = useState('');
  const [asking, setAsking] = useState(false);
  const [loadingContext, setLoadingContext] = useState(true);
  const [showAllLinkedRisks, setShowAllLinkedRisks] = useState(false);
  const { notify } = useWorkspace();

  const controlContent: Record<string, any> = {
    'Article 5': {
      requirement:
        'Personal data must be processed lawfully, fairly and transparently; collected for specified purposes; limited to what is necessary; kept accurate; retained only as long as needed; and protected appropriately.',
      why:
        'Article 5 establishes the core principles that govern the full personal-data lifecycle. Weaknesses here can affect almost every downstream privacy control.',
      risks:
        'Excessive data collection, unclear processing purposes, inaccurate records, excessive retention, unlawful processing and insufficient protection of personal data.',
      implementation:
        'Define processing purposes, apply data minimisation, establish retention schedules, maintain data-quality processes and ensure appropriate security safeguards.',
      organisational:
        'Maintain privacy policies, processing ownership, accountability records, periodic compliance reviews and documented procedures for handling personal data.',
      evidence: [
        'Data inventory and processing purposes',
        'Retention and deletion schedule',
        'Data minimisation review',
        'Privacy policies and procedures'
      ]
    },

    'Article 25': {
      requirement:
        'Data protection principles and safeguards must be integrated into processing activities by design and by default.',
      why:
        'Privacy requirements are more effective when they are built into systems before deployment instead of added after privacy weaknesses are discovered.',
      risks:
        'Over-collection of personal data, privacy-invasive defaults, excessive access, unnecessary exposure and late discovery of privacy design weaknesses.',
      implementation:
        'Use privacy threat modelling, least-privilege access, data minimisation, pseudonymisation, secure defaults and privacy-focused architecture reviews.',
      organisational:
        'Include privacy reviews in project governance, change management, SDLC gates and architecture approval processes.',
      evidence: [
        'Privacy design review',
        'Architecture or data-flow diagram',
        'Default privacy configuration',
        'DPIA or privacy assessment'
      ]
    },

    'Article 28': {
      requirement:
        'Processors handling personal data on behalf of the organisation must provide sufficient guarantees and operate under appropriate contractual and security obligations.',
      why:
        'Third parties can introduce privacy and security exposure even when the organisation itself maintains strong internal controls.',
      risks:
        'Uncontrolled processor access, weak supplier security, unauthorised subprocessors, insufficient breach notification and unclear data-handling responsibilities.',
      implementation:
        'Assess processor security, restrict access, monitor supplier controls, define breach notification requirements and review subprocessor arrangements.',
      organisational:
        'Maintain processor agreements, supplier due diligence, periodic third-party reviews and documented responsibilities.',
      evidence: [
        'Data Processing Agreement',
        'Processor security assessment',
        'Approved subprocessor register',
        'Supplier review evidence'
      ]
    },

    'Article 30': {
      requirement:
        'The organisation must maintain appropriate records describing its personal-data processing activities.',
      why:
        'A reliable processing inventory is necessary to understand where personal data exists, why it is processed, who receives it and how it is protected.',
      risks:
        'Unknown processing activities, undocumented data flows, missing processors, unclear retention periods and incomplete compliance visibility.',
      implementation:
        'Maintain a structured processing inventory covering systems, purposes, data categories, recipients, transfers, retention and security measures.',
      organisational:
        'Assign processing owners and establish a review process to keep records current after business or technical changes.',
      evidence: [
        'Record of Processing Activities',
        'Data-flow documentation',
        'Processing owner register',
        'Periodic ROPA review records'
      ]
    },

    'Article 32': {
      requirement:
        'Controllers and processors must implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk.',
      why:
        'Article 32 protects confidentiality, integrity and availability of personal data and requires security measures to reflect actual processing risk.',
      risks:
        'Unauthorised access, data breaches, accidental loss, data manipulation, service disruption and compromise of confidentiality, integrity or availability.',
      implementation:
        'Use encryption, MFA, least privilege, segmentation, secure configuration, logging, monitoring, vulnerability management, backups and resilience controls.',
      organisational:
        'Maintain security policies, incident response, awareness training, defined responsibilities, supplier security requirements and regular control testing.',
      evidence: [
        'MFA and access-control configuration',
        'Encryption configuration',
        'Vulnerability assessment report',
        'Security monitoring evidence',
        'Backup / recovery test'
      ]
    },

    'A.5.34': {
      requirement:
        'Privacy and protection of personally identifiable information must be managed according to applicable legal, regulatory and contractual requirements.',
      why:
        'PII requires defined governance throughout collection, use, sharing, storage, retention and deletion.',
      risks:
        'Unlawful handling of PII, excessive exposure, unclear ownership, inappropriate sharing and non-compliance with privacy obligations.',
      implementation:
        'Identify PII, classify it appropriately, restrict access, protect transfers and monitor systems that process sensitive information.',
      organisational:
        'Define privacy responsibilities, policies, processing requirements and periodic compliance reviews.',
      evidence: [
        'PII inventory',
        'Data classification records',
        'Privacy policy',
        'Access review evidence'
      ]
    },

    'A.8.10': {
      requirement:
        'Information stored in systems, devices or storage media must be deleted when it is no longer required.',
      why:
        'Keeping unnecessary information increases exposure during incidents and can conflict with retention and privacy requirements.',
      risks:
        'Excessive retention, recovery of supposedly deleted data, unnecessary breach exposure and storage of information beyond business need.',
      implementation:
        'Implement automated retention, secure deletion, lifecycle policies and verification of deletion across production, backup and endpoint environments.',
      organisational:
        'Define retention requirements, deletion ownership, exception handling and periodic retention reviews.',
      evidence: [
        'Retention policy',
        'Deletion configuration',
        'Deletion logs',
        'Retention review evidence'
      ]
    },

    'A.8.12': {
      requirement:
        'Data leakage prevention measures must be applied to systems, networks and devices that process, store or transmit sensitive information.',
      why:
        'Sensitive information can leave the organisation through email, cloud applications, endpoints, removable media or other transfer channels.',
      risks:
        'Data exfiltration, accidental disclosure, unauthorised transfer, insider misuse and exposure of confidential or personal information.',
      implementation:
        'Deploy DLP controls, classify sensitive information, monitor transfer channels and enforce policies for email, endpoint, web and cloud activity.',
      organisational:
        'Define acceptable handling rules, escalation procedures, incident response and exception approval processes.',
      evidence: [
        'DLP policies',
        'DLP incident records',
        'Data classification policy',
        'Exception approvals'
      ]
    },

    'A.8.15': {
      requirement:
        'Logs recording activities, exceptions, faults and relevant security events must be produced, stored, protected and analysed.',
      why:
        'Reliable logs provide visibility for detection, investigation, accountability and reconstruction of security events.',
      risks:
        'Undetected attacks, incomplete investigations, loss of accountability, log tampering and insufficient evidence after an incident.',
      implementation:
        'Enable security logging, centralise events in a SIEM, protect log integrity, synchronise time and define monitoring and alerting rules.',
      organisational:
        'Define logging requirements, retention periods, monitoring ownership and periodic review procedures.',
      evidence: [
        'SIEM configuration',
        'Log retention settings',
        'Alert rules',
        'Sample security events'
      ]
    },

    'A.8.24': {
      requirement:
        'Rules for the effective use of cryptography, including cryptographic key management, must be defined and implemented.',
      why:
        'Cryptography protects sensitive information at rest and in transit, but weak algorithms or poor key management can undermine that protection.',
      risks:
        'Exposure of sensitive data, weak encryption, compromised keys, insecure transmission and unauthorised decryption.',
      implementation:
        'Use approved algorithms, TLS for data in transit, encryption at rest, secure key storage, rotation and access restrictions.',
      organisational:
        'Maintain cryptographic standards, key-management responsibilities, certificate governance and periodic cryptographic reviews.',
      evidence: [
        'Encryption standard',
        'TLS configuration',
        'Key-management records',
        'Certificate inventory'
      ]
    }
  };

  const filtered = controls.filter((control) => {
    const matchesSearch = `${control.code} ${control.name}`
      .toLowerCase()
      .includes(query.toLowerCase());

    const matchesFramework =
      frameworkFilter === 'All' ||
      (frameworkFilter === 'GDPR' && control.framework === 'GDPR') ||
      (frameworkFilter === 'ISO' && control.framework === 'ISO 27001');

    return matchesSearch && matchesFramework;
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoadingContext(true);

      try {
        const items = await loadRiskRegisterData();
        if (active) setLinkedRisks(items);
      } catch {
        if (active) setLinkedRisks([]);
      } finally {
        if (active) setLoadingContext(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const info = controlContent[selected.code] || controlContent['Article 32'];

  const normalize = (value: string) =>
    value.toLowerCase().replace(/iso\/iec/g, 'iso').replace(/\s+/g, ' ').trim();

  const matchingRisks = linkedRisks.filter((risk: any) =>
    risk.controls?.some((control: any) => {
      const haystack = normalize(
        `${control.id || ''} ${control.label || ''} ${control.framework || ''}`
      );

      const code = normalize(selected.code);

      return haystack.includes(code);
    })
  );

  const primaryRisk = matchingRisks[0] || null;

  const selectControl = (control: any) => {
    setSelected(control);
    setGuidance('');
    setShowAllLinkedRisks(false);
  };

  const askControlAI = async () => {
    if (!primaryRisk?.dbId) {
      notify(`No calculated risk is currently mapped to ${selected.code}.`);
      return;
    }

    setAsking(true);
    setGuidance('');

    try {
      const result = await requestRiskGuidance(
        primaryRisk.dbId,
        `Review ${selected.framework} ${selected.code} - ${selected.name} in the context of this mapped risk. Explain the requirement, why it matters for this risk, recommended implementation steps, validation steps, and evidence that should be collected.`
      );

      setGuidance(result.answer || 'No AI guidance was returned.');
      notify(`AI guidance prepared for ${selected.code}`);
    } catch {
      notify(
        'AI guidance is unavailable. Confirm that Ollama and the API are running.'
      );
    } finally {
      setAsking(false);
    }
  };

  const guidanceCards = [
    {
      title: 'Requirement',
      icon: FileText,
      text: info.requirement
    },
    {
      title: 'Why this matters',
      icon: Shield,
      text: info.why
    },
    {
      title: 'Risks addressed',
      icon: AlertTriangle,
      text: info.risks
    },
    {
      title: 'Technical implementation',
      icon: Settings2,
      text: info.implementation
    },
    {
      title: 'Organisational measures',
      icon: UserRound,
      text: info.organisational
    }
  ];

  const parseControlGuidance = (text: string) => {
    if (!text?.trim()) return [];

    const definitions = [
      {
        key: 'assessment',
        title: 'Assessment Insight',
        aliases: ['Assessment Insight'],
        icon: ClipboardCheck,
        tone: 'blue'
      },
      {
        key: 'classification',
        title: 'Classification Explanation',
        aliases: ['Classification Explanation'],
        icon: Database,
        tone: 'violet'
      },
      {
        key: 'calculated',
        title: 'Calculated Risk Guidance',
        aliases: ['Calculated Risk Guidance', 'Risk Guidance'],
        icon: AlertTriangle,
        tone: 'red'
      },
      {
        key: 'control',
        title: 'Control Map Guidance',
        aliases: ['Control Map Guidance', 'Control Guidance'],
        icon: Shield,
        tone: 'cyan'
      },
      {
        key: 'next',
        title: 'Suggested Next Step',
        aliases: ['Suggested Next Step', 'Next Practical Remediation Step', 'Next Step'],
        icon: ArrowRight,
        tone: 'green'
      },
      {
        key: 'validation',
        title: 'Validation & Evidence',
        aliases: ['Validation Steps', 'Evidence Required', 'Validation & Evidence'],
        icon: CheckCircle2,
        tone: 'amber'
      }
    ];

    const clean = text
      .replace(/\r/g, '')
      .replace(/\*\*/g, '')
      .trim();

    const found: any[] = [];

    definitions.forEach((definition) => {
      let bestIndex = -1;
      let matchedAlias = '';

      definition.aliases.forEach((alias) => {
        const patterns = [
          `- ${alias}:`,
          `${alias}:`,
          `- ${alias}`,
          `${alias}`
        ];

        patterns.forEach((pattern) => {
          const index = clean.toLowerCase().indexOf(pattern.toLowerCase());

          if (index !== -1 && (bestIndex === -1 || index < bestIndex)) {
            bestIndex = index;
            matchedAlias = pattern;
          }
        });
      });

      if (bestIndex !== -1) {
        found.push({
          ...definition,
          index: bestIndex,
          matchedAlias
        });
      }
    });

    found.sort((a, b) => a.index - b.index);

    if (!found.length) {
      return [{
        key: 'guidance',
        title: 'AI Guidance',
        icon: Sparkles,
        tone: 'cyan',
        content: clean
      }];
    }

    return found.map((item, index) => {
      const start = item.index + item.matchedAlias.length;
      const end = found[index + 1]?.index ?? clean.length;

      const content = clean
        .slice(start, end)
        .replace(/^[:\s\-–—]+/, '')
        .trim();

      return {
        key: item.key,
        title: item.title,
        icon: item.icon,
        tone: item.tone,
        content
      };
    }).filter((item) => item.content);
  };

  const controlGuidanceCards = parseControlGuidance(guidance);

  return (
    <div className="pg-content">
      <PageHeader
        title="Controls & Compliance"
        description="Explore requirements, implementation guidance, evidence expectations and linked risk context."
      />

      <div className="grid gap-4 lg:grid-cols-[310px_minmax(0,1fr)]">

        <Panel title="Policy & Control Library" icon={ListFilter}>
          <div className="border-b border-slate-800 p-3">
            <SearchBox
              placeholder="Search controls..."
              value={query}
              onChange={setQuery}
              testId="input-search-controls"
            />

            <div className="mt-3 flex gap-1">
              {['All', 'GDPR', 'ISO'].map((item) => (
                <button
                  key={item}
                  onClick={() => setFrameworkFilter(item)}
                  className={`pg-button h-7 px-3 text-[10px] ${
                    frameworkFilter === item ? 'primary' : ''
                  }`}
                >
                  {item === 'ISO' ? 'ISO 27001' : item}
                </button>
              ))}
            </div>
          </div>

          <div className="p-2">
            {filtered.map((control) => {
              const active = selected.code === control.code;

              return (
                <button
                  key={control.code}
                  onClick={() => selectControl(control)}
                  className={`mb-1 flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition-all ${
                    active
                      ? 'bg-cyan-500/15 ring-1 ring-inset ring-cyan-400/45'
                      : 'hover:bg-slate-800/70'
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                      active
                        ? 'bg-cyan-500/15 text-cyan-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <FileText size={15} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-slate-100">
                        {control.code}
                      </span>

                      <span className="text-[8px] uppercase tracking-wide text-slate-500">
                        {control.framework}
                      </span>
                    </div>

                    <span className="mt-0.5 block text-[9px] leading-relaxed text-slate-500">
                      {control.name}
                    </span>
                  </div>

                  <ChevronRight
                    size={13}
                    className={active ? 'text-cyan-300' : 'text-slate-600'}
                  />
                </button>
              );
            })}

            {filtered.length === 0 && (
              <div className="p-5 text-center text-[10px] text-slate-500">
                No controls match this filter.
              </div>
            )}
          </div>
        </Panel>

        <div className="space-y-4">

          <Panel>
            <div className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">

                <div className="flex min-w-0 gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-500/10 text-cyan-300">
                    <Shield size={22} />
                  </div>

                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="pg-kicker">
                        {selected.framework}
                      </span>

                      <Badge tone="teal">
                        Applicable
                      </Badge>

                      {matchingRisks.length > 0 && (
                        <Badge tone="red">
                          {matchingRisks.length} linked risk{matchingRisks.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>

                    <h2 className="text-[19px] font-bold text-slate-100">
                      {selected.code}
                      <span className="font-medium text-cyan-200">
                        {' '}— {selected.name}
                      </span>
                    </h2>

                    <p className="mt-2 max-w-3xl text-[11px] leading-relaxed text-slate-400">
                      Review what this requirement means, the risks it addresses,
                      implementation expectations and the evidence needed to validate it.
                    </p>
                  </div>
                </div>

                <button
                  className="pg-button primary shrink-0"
                  onClick={() => void askControlAI()}
                  disabled={asking || !primaryRisk}
                  data-testid="button-ask-control"
                  title={
                    primaryRisk
                      ? `Ask AI using ${primaryRisk.id} as linked risk context`
                      : 'No calculated risk is mapped to this control'
                  }
                >
                  <Sparkles size={14} />
                  {asking ? 'Preparing guidance...' : 'Ask AI about this control'}
                </button>
              </div>
            </div>
          </Panel>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.65fr)_minmax(390px,.85fr)]">

            <div className="grid gap-3 md:grid-cols-2">

              {guidanceCards.map(({ title, icon: Icon, text }, index) => (
                <Panel
                  key={title}
                  className={index === 0 ? 'md:col-span-2' : ''}
                >
                  <div className="p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-300">
                        <Icon size={16} />
                      </div>

                      <h3 className="text-[12px] font-semibold text-slate-200">
                        {title}
                      </h3>
                    </div>

                    <p className="text-[10.5px] leading-[1.7] text-slate-400">
                      {text}
                    </p>
                  </div>
                </Panel>
              ))}



            <Panel title="Linked Risk Context" icon={Network} className="pg-controls-linked-risks">
                <div className="p-3">

                  {loadingContext ? (
                    <div className="py-6 text-center text-[10px] text-slate-500">
                      Loading mapped risks...
                    </div>
                  ) : matchingRisks.length ? (
                    <div className="space-y-2">
                      {(showAllLinkedRisks ? matchingRisks : matchingRisks.slice(0, 3)).map((risk: any) => (
                        <div
                          key={risk.dbId}
                          className="rounded-md border border-slate-800 bg-slate-900/65 p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="pg-mono text-[10px] font-semibold text-cyan-200">
                              {risk.id}
                            </span>

                            <Badge
                              tone={
                                risk.score >= 16
                                  ? 'red'
                                  : risk.score >= 8
                                  ? 'amber'
                                  : 'teal'
                              }
                            >
                              Score {risk.score}
                            </Badge>
                          </div>

                          <div className="mt-2 text-[10.5px] font-semibold leading-relaxed text-slate-200">
                            {risk.title}
                          </div>

                          <div className="mt-3 grid gap-2 text-[9px]">
                            <div>
                              <span className="text-slate-500">Asset</span>
                              <span className="ml-2 text-slate-300">
                                {risk.asset}
                              </span>
                            </div>

                            <div>
                              <span className="text-slate-500">Assessment</span>
                              <span className="ml-2 text-slate-300">
                                {risk.assessment}
                              </span>
                            </div>

                            <div>
                              <span className="text-slate-500">Owner</span>
                              <span className="ml-2 text-slate-300">
                                {risk.owner}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}

                      {matchingRisks.length > 3 && (
                        <button
                          className="pg-button mt-2 w-full justify-center border-cyan-400/20 text-cyan-300"
                          onClick={() => setShowAllLinkedRisks((value) => !value)}
                        >
                          {showAllLinkedRisks
                            ? 'Show less'
                            : `View all ${matchingRisks.length} risks`}
                          <ChevronRight
                            size={13}
                            className={`transition-transform ${
                              showAllLinkedRisks ? 'rotate-90' : ''
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed border-slate-700 p-4 text-center">
                      <Network
                        size={20}
                        className="mx-auto mb-2 text-slate-600"
                      />

                      <div className="text-[10px] font-semibold text-slate-400">
                        No mapped calculated risks
                      </div>

                      <p className="mt-1 text-[9px] leading-relaxed text-slate-600">
                        This control is available in the library, but no current
                        calculated risk is mapped to it.
                      </p>
                    </div>
                  )}

                </div>
              </Panel>

          </div>

            <div className="space-y-3">

              <Panel title="Evidence Required" icon={ClipboardCheck}>
                <div className="space-y-2 p-3">
                  {info.evidence.map((item: string, index: number) => (
                    <div
                      key={item}
                      className="flex items-start gap-3 rounded-md border border-slate-800 bg-slate-900/60 p-3"
                    >
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-cyan-500/10 text-[9px] font-bold text-cyan-300">
                        {String(index + 1).padStart(2, '0')}
                      </div>

                      <span className="pt-1 text-[10px] leading-relaxed text-slate-300">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>

              {guidance && (
                <Panel title={`AI Guidance — ${selected.code}`} icon={Sparkles}>
                  <div className="p-3">
                    <div className="mb-3 flex items-center gap-2 rounded-md border border-cyan-400/15 bg-cyan-500/5 px-3 py-2 text-[9px] text-slate-400">
                      <Bot size={13} className="shrink-0 text-cyan-300" />
                      <span>
                        Generated using linked risk context
                        {primaryRisk ? ` · ${primaryRisk.id}` : ''}
                      </span>
                    </div>

                    <div className="pg-control-ai-grid">
                      {controlGuidanceCards.map((card: any) => {
                        const Icon = card.icon;

                        return (
                          <div
                            key={card.key}
                            className={`pg-control-ai-card pg-control-ai-${card.tone}`}
                          >
                            <div className="pg-control-ai-card-head">
                              <div className="pg-control-ai-card-icon">
                                <Icon size={15} />
                              </div>

                              <h4>{card.title}</h4>
                            </div>

                            <div className="pg-control-ai-card-text">
                              {card.content}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        className="pg-button primary flex-1"
                        onClick={() => void askControlAI()}
                        disabled={asking}
                      >
                        <Sparkles size={13} />
                        {asking ? 'Refreshing...' : 'Refresh guidance'}
                      </button>

                      <button
                        className="pg-button"
                        onClick={() => setGuidance('')}
                        aria-label="Close AI guidance"
                      >
                        <X size={13} />
                      </button>
                    </div>

                    <p className="mt-3 border-t border-slate-800 pt-3 text-[8.5px] leading-relaxed text-slate-500">
                      AI guidance is advisory. Validate recommendations against
                      actual implementation evidence and applicable requirements.
                    </p>
                  </div>
                </Panel>
              )}



            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function CalendarGlyph({ size, className }: { size?: number; className?: string }) { return <Activity size={size} className={className} />; }

function ControlMap() {
  const { notify } = useWorkspace();

  const [risks, setRisks] = useState<any[]>([]);
  const [selectedRow, setSelectedRow] = useState(0);
  const [loading, setLoading] = useState(true);

  const [mapSearch, setMapSearch] = useState('');
  const [mapFramework, setMapFramework] = useState('All');
  const [mapRiskLevel, setMapRiskLevel] = useState('All');
  const [mapPage, setMapPage] = useState(1);
  const [mapGuidance, setMapGuidance] = useState('');
  const [mapGuidanceLoading, setMapGuidanceLoading] = useState(false);
  const [mapGuidanceRisk, setMapGuidanceRisk] = useState('');
  const rowsPerPage = 10;

  const loadMappings = async () => {
    setLoading(true);

    try {
      const items = await loadRiskRegisterData();
      setRisks(items);
      setSelectedRow(0);
    } catch (error) {
      notify('Unable to load control mappings from the backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMappings();
  }, []);

  /*
   * One risk may map to multiple controls.
   * Flatten the backend relationship into mapping rows:
   *
   * Asset → Assessment → Risk → Control
   */
  const mappings = risks.flatMap((risk: any) =>
    (risk.controls || []).map((control: any) => ({
      asset: risk.asset,
      assessment: risk.assessment,

      risk: risk.id,
      dbId: risk.dbId,
      riskName: risk.title,

      level:
        risk.score >= 15
          ? 'High'
          : risk.score >= 8
            ? 'Medium'
            : 'Low',

      score: risk.score,

      controlId: control.id,
      control: control.label,
      framework: control.framework,

      owner: risk.owner || 'Unassigned',
    }))
  );

  const filteredMappings = mappings.filter((item: any) => {
    const searchable = [
      item.asset,
      item.assessment,
      item.risk,
      item.riskName,
      item.control,
      item.framework,
      item.owner,
    ].join(' ').toLowerCase();

    const matchesSearch =
      !mapSearch.trim() ||
      searchable.includes(mapSearch.trim().toLowerCase());

    const matchesFramework =
      mapFramework === 'All' ||
      item.framework === mapFramework;

    const matchesRisk =
      mapRiskLevel === 'All' ||
      item.level === mapRiskLevel;

    return matchesSearch && matchesFramework && matchesRisk;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMappings.length / rowsPerPage)
  );

  const currentPage = Math.min(mapPage, totalPages);

  const paginatedMappings = filteredMappings.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const safeSelectedRow =
    mappings.length === 0
      ? 0
      : Math.min(selectedRow, mappings.length - 1);

  const selected = mappings[safeSelectedRow];

  const uniqueAssets = new Set(
    mappings.map((item: any) => item.asset)
  ).size;

  const uniqueControls = new Set(
    mappings.map((item: any) => item.controlId)
  ).size;

  const highRisks = new Set(
    mappings
      .filter((item: any) => item.level === 'High')
      .map((item: any) => item.risk)
  ).size;

  const mapGuidanceCards = [
    {
      title: 'Risk Analysis',
      icon: AlertTriangle,
      empty: 'AI risk analysis will appear here.',
    },
    {
      title: 'Classification Explanation',
      icon: Target,
      empty: 'AI classification context will appear here.',
    },
    {
      title: 'Control Map Guidance',
      icon: Network,
      empty: 'AI control mapping guidance will appear here.',
    },
    {
      title: 'Suggested Next Step',
      icon: CheckCircle2,
      empty: 'AI recommended next step will appear here.',
    },
    {
      title: 'Validation Steps',
      icon: ClipboardCheck,
      empty: 'AI validation steps will appear here.',
    },
    {
      title: 'Evidence Required',
      icon: FileText,
      empty: 'AI evidence requirements will appear here.',
    },
  ];

  const parseMapGuidance = (answer: string) => {
    const aliases: Record<string, string[]> = {
      'Risk Analysis': [
        'Risk Analysis',
        'Assessment Insight',
        'Risk Assessment',
        'Risk Summary',
      ],
      'Classification Explanation': [
        'Classification Explanation',
        'Classification Context',
        'Data Classification',
      ],
      'Control Map Guidance': [
        'Control Map Guidance',
        'Calculated Risk Guidance',
        'Mapped Control Guidance',
        'Control Guidance',
      ],
      'Suggested Next Step': [
        'Suggested Next Step',
        'Suggested Next Steps',
        'Recommended Actions',
        'Recommended Action',
        'Next Steps',
      ],
      'Validation Steps': [
        'Validation Steps',
        'Validation',
        'Verification Steps',
      ],
      'Evidence Required': [
        'Evidence Required',
        'Required Evidence',
        'Evidence',
      ],
    };

    const clean = String(answer || '')
      .replace(/\r/g, '')
      .replace(/\*\*/g, '')
      .replace(/```(?:markdown|text)?/gi, '')
      .replace(/```/g, '')
      .trim();

    if (!clean) {
      return mapGuidanceCards.map((card) => ({
        ...card,
        text: '',
      }));
    }

    /*
     * Parse line-by-line rather than searching the whole answer with
     * indexOf(). This accepts:
     *
     * Risk Analysis
     * Risk Analysis:
     * ## Risk Analysis
     * 1. Risk Analysis
     * ### **Risk Analysis:**
     */
    const headingLookup = new Map<string, string>();

    Object.entries(aliases).forEach(([canonical, names]) => {
      names.forEach((name) => {
        headingLookup.set(
          name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(),
          canonical
        );
      });
    });

    const extracted: Record<string, string[]> = {};
    let currentSection = '';

    for (const rawLine of clean.split('\n')) {
      const line = rawLine.trim();

      if (!line) {
        if (currentSection && extracted[currentSection]?.length) {
          extracted[currentSection].push('');
        }
        continue;
      }

      const candidate = line
        .replace(/^#{1,6}\s*/, '')
        .replace(/^\d+[\.\)]\s*/, '')
        .replace(/^[-*•]\s*/, '')
        .replace(/[:\-–—]\s*$/, '')
        .trim();

      const normalized = candidate
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

      const matchedHeading = headingLookup.get(normalized);

      if (matchedHeading) {
        currentSection = matchedHeading;

        if (!extracted[currentSection]) {
          extracted[currentSection] = [];
        }

        continue;
      }

      /*
       * Also support:
       * Risk Analysis: actual answer on the same line
       */
      let inlineMatched = false;

      for (const [canonical, names] of Object.entries(aliases)) {
        for (const alias of names) {
          const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const match = line.match(
            new RegExp(
              `^(?:#{1,6}\\s*)?(?:\\d+[\\.\\)]\\s*)?${escaped}\\s*[:\\-–—]\\s*(.+)$`,
              'i'
            )
          );

          if (match) {
            currentSection = canonical;

            if (!extracted[currentSection]) {
              extracted[currentSection] = [];
            }

            extracted[currentSection].push(match[1].trim());
            inlineMatched = true;
            break;
          }
        }

        if (inlineMatched) break;
      }

      if (inlineMatched) continue;

      if (currentSection) {
        extracted[currentSection].push(line);
      }
    }

    const parsed = mapGuidanceCards.map((card) => ({
      ...card,
      text: (extracted[card.title] || [])
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim(),
    }));

    /*
     * Safety fallback:
     * Never throw away a valid AI response just because the local model
     * ignored the requested headings.
     */
    const hasParsedContent = parsed.some((card) => card.text.trim());

    if (!hasParsedContent && clean) {
      return parsed.map((card, index) => ({
        ...card,
        text: index === 0 ? clean : '',
      }));
    }

    return parsed;
  };

  const guidanceSections = parseMapGuidance(mapGuidance);

  const askMappingAI = async (mapping: any) => {
    setMapGuidanceLoading(true);
    setMapGuidance('');
    setMapGuidanceRisk(mapping.risk);

    try {
      const question = `You are reviewing one privacy and security risk-to-control mapping.

Asset: ${mapping.asset}
Assessment: ${mapping.assessment}
Risk: ${mapping.risk} — ${mapping.riskName}
Risk level: ${mapping.level}
Mapped control: ${mapping.control}
Framework: ${mapping.framework}
Owner: ${mapping.owner}

Return the response using EXACTLY these six headings:

Risk Analysis
Explain the actual privacy/security risk for this asset.

Classification Explanation
Explain why the asset or data classification matters to this risk.

Control Map Guidance
Explain how the mapped control addresses the risk and identify any important control gap.

Suggested Next Step
Give the most important practical remediation actions.

Validation Steps
Give practical technical steps to verify remediation effectiveness.

Evidence Required
List the evidence required to demonstrate implementation.

Do not add any other headings.
Keep every section concise, specific and implementation-focused.
Do not repeat the same information across sections.`;

      const result = await requestRiskGuidance(
        mapping.dbId,
        question
      );

      setMapGuidance(
        result.answer || 'No AI guidance was returned.'
      );

      notify(`AI guidance prepared for ${mapping.risk}`);
    } catch (error) {
      setMapGuidance(
        'Unable to generate AI guidance. Check the local AI service and backend connection.'
      );
    } finally {
      setMapGuidanceLoading(false);
    }
  };

  return (
    <div className="pg-content">
      <PageHeader
        title="Control Map"
        description="Trace how assets, assessments, risks and controls connect using live workspace data."
      />

      {/* LIVE SUMMARY */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">

        <StatCard
          label="Mapped assets"
          value={String(uniqueAssets)}
          icon={Database}
          note="From current workspace"
        />

        <StatCard
          label="Mapped controls"
          value={String(uniqueControls)}
          icon={Shield}
          tone="teal"
          note={`${mappings.length} total mappings`}
        />

        <StatCard
          label="High risks"
          value={String(highRisks)}
          icon={AlertTriangle}
          tone="red"
          note="Unique high-risk findings"
        />

        <StatCard
          label="Total mappings"
          value={String(mappings.length)}
          icon={Network}
          tone="teal"
          note="Risk-to-control relationships"
        />

      </div>

      {loading ? (
        <Panel>
          <div className="p-8 text-center text-[11px] text-slate-500">
            Loading control mappings from workspace…
          </div>
        </Panel>
      ) : !selected ? (
        <Panel>
          <div className="p-8 text-center">
            <Shield
              size={28}
              className="mx-auto mb-3 text-slate-600"
            />

            <div className="text-[12px] font-semibold text-slate-300">
              No control mappings available
            </div>

            <p className="mt-2 text-[10px] text-slate-500">
              Complete an assessment and map controls to risks to populate
              this workspace.
            </p>
          </div>
        </Panel>
      ) : (
        <>
          {/* SELECTED TRACE */}
          <Panel title="Selected Mapping" icon={Network} className="pg-control-map-selected">
            <div className="p-5">

              <div className="grid items-stretch gap-2 xl:grid-cols-[1fr_34px_1fr_34px_1fr_34px_1fr_34px_1fr]">

                {/* ASSET */}
                <div className="pg-map-node rounded-lg border border-slate-700 bg-slate-900/60 p-4">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-300">
                    <Database size={16} />
                  </div>

                  <div className="pg-map-node-label text-[9px] uppercase tracking-wider text-slate-500">
                    Asset
                  </div>

                  <div className="pg-map-node-value mt-1 text-[12px] font-semibold text-slate-100">
                    {selected.asset}
                  </div>
                </div>

                <div className="hidden items-center justify-center text-cyan-400/60 xl:flex">
                  <ArrowRight size={18} />
                </div>

                {/* ASSESSMENT */}
                <div className="pg-map-node rounded-lg border border-slate-700 bg-slate-900/60 p-4">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-300">
                    <ClipboardCheck size={16} />
                  </div>

                  <div className="pg-map-node-label text-[9px] uppercase tracking-wider text-slate-500">
                    Assessment
                  </div>

                  <div className="pg-map-node-value mt-1 text-[12px] font-semibold text-slate-100">
                    {selected.assessment}
                  </div>
                </div>

                <div className="hidden items-center justify-center text-cyan-400/60 xl:flex">
                  <ArrowRight size={18} />
                </div>

                {/* RISK */}
                <div className="pg-map-node rounded-lg border border-red-400/20 bg-red-500/5 p-4">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-red-500/10 text-red-300">
                    <AlertTriangle size={16} />
                  </div>

                  <div className="pg-map-node-label text-[9px] uppercase tracking-wider text-slate-500">
                    Risk
                  </div>

                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-slate-100">
                      {selected.risk}
                    </span>

                    <Badge
                      tone={
                        selected.level === 'High'
                          ? 'red'
                          : selected.level === 'Medium'
                            ? 'amber'
                            : 'teal'
                      }
                    >
                      {selected.level}
                    </Badge>
                  </div>

                  <div className="mt-1 text-[9px] text-slate-500">
                    {selected.riskName}
                  </div>
                </div>

                <div className="hidden items-center justify-center text-cyan-400/60 xl:flex">
                  <ArrowRight size={18} />
                </div>

                {/* CONTROL */}
                <div className="pg-map-node rounded-lg border border-cyan-400/25 bg-cyan-500/5 p-4">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-300">
                    <Shield size={16} />
                  </div>

                  <div className="pg-map-node-label text-[9px] uppercase tracking-wider text-slate-500">
                    Control
                  </div>

                  <div className="mt-1 text-[11px] font-semibold leading-relaxed text-cyan-100">
                    {selected.control}
                  </div>

                  <div className="mt-2 text-[9px] text-slate-500">
                    {selected.framework}
                  </div>
                </div>

                <div className="hidden items-center justify-center text-cyan-400/60 xl:flex">
                  <ArrowRight size={18} />
                </div>

                {/* AI GUIDANCE */}
                <div className="pg-map-node rounded-lg border border-cyan-400/25 bg-cyan-500/5 p-4">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-300">
                    <Sparkles size={16} />
                  </div>

                  <div className="pg-map-node-label text-[9px] uppercase tracking-wider text-slate-500">
                    AI Guidance
                  </div>

                  <button
                    className="pg-button primary mt-2"
                    onClick={() => void askMappingAI(selected)}
                  >
                    <Sparkles size={13} />
                    Ask AI
                  </button>

                  <div className="mt-2 text-[9px] text-slate-500">
                    Get recommended actions for this mapping.
                  </div>
                </div>

              </div>
            </div>
          </Panel>

          {/* CONTROL MAP WORKSPACE */}
          <div className="pg-control-map-workspace">

            <div className="pg-control-map-ai-column">
          {/* INLINE AI GUIDANCE */}
          <Panel
              title={`AI Guidance${mapGuidanceRisk ? ` · ${mapGuidanceRisk}` : ''}`}
              icon={Sparkles}
              className="mt-4 pg-control-map-guidance"
              action={
                mapGuidance && !mapGuidanceLoading ? (
                  <button
                    className="pg-button h-7 px-3 text-[9px]"
                    onClick={() => {
                      setMapGuidance('');
                      setMapGuidanceRisk('');
                    }}
                  >
                    Clear Guidance
                  </button>
                ) : undefined
              }
            >
              {mapGuidanceLoading ? (
                <div className="flex items-center gap-3 p-5 text-[11px] text-cyan-200">
                  <Activity size={16} className="text-cyan-300" />
                  PrivacyGuard AI is reviewing this mapping…
                </div>
              ) : (
                <>
                  <div className="pg-control-map-guidance-grid pg-fixed-guidance-grid">
                    {guidanceSections.map(({ title, text, icon: Icon, empty }) => (
                      <div
                        key={title}
                        data-guidance={title}
                        className={`pg-control-map-guidance-card pg-fixed-guidance-card ${
                          text ? 'is-filled' : 'is-empty'
                        }`}
                      >
                        <div className="mb-3 flex items-center gap-3">
                          <div className="pg-guidance-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-300">
                            <Icon size={16} />
                          </div>

                          <h3 className="text-[13px] font-semibold text-slate-100">
                            {title}
                          </h3>
                        </div>

                        <div className="pg-guidance-text whitespace-pre-line">
                          {text || empty}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pg-control-map-ai-disclaimer flex items-center gap-2 border-t border-slate-800 bg-slate-950/30 px-4 py-2.5 text-[9px] text-slate-500">
                    <AlertTriangle size={12} className="shrink-0 text-amber-300" />
                    AI guidance is advisory. Validate recommendations against the actual environment, evidence and applicable requirements.
                  </div>
                </>
              )}
            </Panel>

            </div>

            <div className="pg-control-map-register-column">
          {/* LIVE MAPPING REGISTER */}
          <Panel
            title="Control Mapping Register"
            icon={ListFilter}
            className="mt-4 pg-control-map-register"
          >
            <div className="pg-map-toolbar flex flex-wrap items-center gap-2 border-b border-slate-800 p-3">

              <div className="min-w-[240px] flex-1">
                <SearchBox
                  placeholder="Search asset, risk, control or owner..."
                  value={mapSearch}
                  onChange={(value) => {
                    setMapSearch(value);
                    setMapPage(1);
                  }}
                />
              </div>

              <Select
                value={mapFramework}
                onChange={(value) => {
                  setMapFramework(value);
                  setMapPage(1);
                }}
                options={[
                  'All',
                  ...Array.from(
                    new Set(
                      mappings.map((item: any) => item.framework)
                    )
                  ),
                ]}
              />

              <Select
                value={mapRiskLevel}
                onChange={(value) => {
                  setMapRiskLevel(value);
                  setMapPage(1);
                }}
                options={['All', 'High', 'Medium', 'Low']}
              />

            </div>

            <div className="pg-scroll-x">
              <table className="pg-table min-w-[1100px]">

                <thead>
                  <tr>
                    {[
                      'Asset',
                      'Assessment',
                      'Risk',
                      'Risk level',
                      'Control',
                      'Framework',
                      'Owner',
                      'AI Guidance',
                    ].map((heading) => (
                      <th key={heading}>{heading}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {paginatedMappings.map((row: any, pageIndex: number) => {
                    const index = mappings.indexOf(row);

                    return (
                    <tr
                      key={`${row.risk}-${row.controlId}-${index}`}
                      onClick={() => setSelectedRow(index)}
                      className={`cursor-pointer ${
                        safeSelectedRow === index
                          ? 'bg-cyan-500/5'
                          : ''
                      }`}
                    >

                      <td>
                        <div className="flex items-center gap-2 font-semibold text-slate-200">
                          <Database
                            size={13}
                            className="text-cyan-300"
                          />
                          {row.asset}
                        </div>
                      </td>

                      <td className="text-[10px] text-slate-300">
                        {row.assessment}
                      </td>

                      <td>
                        <span className="font-semibold text-slate-200">
                          {row.risk}
                        </span>

                        <small className="mt-0.5 block text-[9px] text-slate-500">
                          {row.riskName}
                        </small>
                      </td>

                      <td>
                        <Badge
                          tone={
                            row.level === 'High'
                              ? 'red'
                              : row.level === 'Medium'
                                ? 'amber'
                                : 'teal'
                          }
                          dot
                        >
                          {row.level}
                        </Badge>
                      </td>

                      <td className="max-w-[260px]">
                        <div className="flex items-start gap-2">
                          <Shield
                            size={13}
                            className="mt-0.5 shrink-0 text-cyan-300"
                          />

                          <span className="text-[10px] text-slate-200">
                            {row.control}
                          </span>
                        </div>
                      </td>

                      <td className="text-[10px] text-slate-400">
                        {row.framework}
                      </td>

                      <td className="text-[10px] text-slate-300">
                        {row.owner}
                      </td>

                      <td>
                        <button
                          className="pg-button h-7 px-3 text-[9px]"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedRow(index);
                            void askMappingAI(row);
                          }}
                        >
                          <Sparkles size={12} />
                          Ask AI
                        </button>
                      </td>

                    </tr>
                    );
                  })}
                </tbody>

              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-4 py-3">

              <span className="text-[9px] text-slate-500">
                Showing {filteredMappings.length === 0 ? 0 : ((currentPage - 1) * rowsPerPage) + 1}
                {' '}–{' '}
                {Math.min(currentPage * rowsPerPage, filteredMappings.length)}
                {' '}of {filteredMappings.length} mappings
              </span>

              <div className="flex items-center gap-2">

                <button
                  className="pg-button"
                  disabled={currentPage <= 1}
                  onClick={() =>
                    setMapPage((page) => Math.max(1, page - 1))
                  }
                >
                  <ChevronLeft size={13} />
                  Previous
                </button>

                <span className="min-w-[70px] text-center text-[9px] text-slate-400">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  className="pg-button"
                  disabled={
                    currentPage >= totalPages ||
                    filteredMappings.length === 0
                  }
                  onClick={() =>
                    setMapPage((page) =>
                      Math.min(totalPages, page + 1)
                    )
                  }
                >
                  Next
                  <ChevronRight size={13} />
                </button>

              </div>

              <span className="text-[9px] text-slate-500">
                {mappings.length} total live mappings
              </span>

            </div>
          </Panel>
            </div>
          </div>

        </>
      )}
    </div>
  );
}

function Assessments() {
  const { assets, assessments, notify, refreshWorkspace } = useWorkspace();
  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [asset, setAsset] = useState('Select an asset');
  const [tab, setTab] = useState('Upload & Select Asset');
  const [query, setQuery] = useState('');
  const [assessmentPage, setAssessmentPage] = useState(1);
  const assessmentRowsPerPage = 10;
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const assetOptions = ['Select an asset', ...assets.map((item) => item.name)];
  const assetReady = asset !== 'Select an asset';

  const reset = () => {
    setFileName('');
    setSelectedFile(null);
    setAsset('Select an asset');
    setResult(null);
    setTab('Upload & Select Asset');
    notify('Assessment workspace reset');
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    if (!picked) return;

    const linkedAsset = assets.find((item) => item.name === asset);
    if (!linkedAsset) {
      notify('Select a linked asset before uploading a file.');
      event.target.value = '';
      return;
    }

    setSelectedFile(picked);
    setFileName(picked.name);
    setUploading(true);

    try {
      const assessmentName = `${linkedAsset.name} — ${picked.name.replace(/\.[^.]+$/, '')} Assessment`;
      const response = await uploadAssessment(linkedAsset.id, assessmentName, picked);
      setResult(response);
      setTab('Review & Report');
      await refreshWorkspace();
      notify('Assessment analyzed locally and linked to the asset.');
    } catch (error) {
      console.error(error);
      setFileName('');
      setSelectedFile(null);
      notify('Upload failed. Confirm the backend is running on port 8001.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const classification = result?.assessment?.classification;
  const riskLevel = result?.assessment?.risk_level;
  const categories = result?.assessment?.detected_categories || [];
  const mappedControls = result?.assessment?.mapped_control_ids || [];
  const tone = classification === 'Sensitive PII' || classification === 'Restricted PII' ? 'red' : classification === 'Confidential' ? 'violet' : 'blue';


  const filteredAssessments = assessments.filter((item) =>
    `${item.name} ${item.asset}`.toLowerCase().includes(query.toLowerCase())
  );

  const assessmentTotalPages = Math.max(
    1,
    Math.ceil(filteredAssessments.length / assessmentRowsPerPage)
  );

  const currentAssessmentPage = Math.min(
    assessmentPage,
    assessmentTotalPages
  );

  const paginatedAssessments = filteredAssessments.slice(
    (currentAssessmentPage - 1) * assessmentRowsPerPage,
    currentAssessmentPage * assessmentRowsPerPage
  );

  const assessmentStart =
    filteredAssessments.length === 0
      ? 0
      : (currentAssessmentPage - 1) * assessmentRowsPerPage + 1;

  const assessmentEnd = Math.min(
    currentAssessmentPage * assessmentRowsPerPage,
    filteredAssessments.length
  );

return <div className="pg-content">
    <PageHeader title="Assessments" description="Upload approved assessment material to identify data, classification, risks, and control mappings." actions={<button className="pg-button" onClick={reset} data-testid="button-reset-assessment"><X size={14} />Reset</button>} />

    <div className="mb-3 flex overflow-x-auto rounded border border-slate-700 bg-slate-900/40">
      {['Upload & Select Asset', 'Analyze', 'Assess', 'Review & Report'].map((step, index) => <button key={step} className={`flex min-w-[170px] flex-1 items-center gap-2 p-3 text-left ${tab === step ? 'bg-cyan-500/15 text-cyan-100' : 'text-slate-400'}`} onClick={() => setTab(step)} data-testid={`tab-assessment-${step.toLowerCase().replace(/[^a-z]+/g, '-')}`}>
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-cyan-300/60 text-[10px] text-cyan-200">{index + 1}</span>
        <span className="text-[10px]"><b className="block">{step}</b><small>{index === 0 ? 'Provide a file and link an asset' : index === 1 ? 'Detect data and classify' : index === 2 ? 'Calculate risk and map controls' : 'Review the calculated result'}</small></span>
      </button>)}
    </div>

    <div className="grid gap-3 lg:grid-cols-[1fr_1.2fr]">
      <Panel title="Upload Data and Select Asset" icon={Upload}>
        <div className="grid gap-3 p-4 sm:grid-cols-[1fr_1.2fr]">
          <label className={`flex min-h-[150px] flex-col items-center justify-center rounded border border-dashed p-5 text-center ${uploading ? 'cursor-wait border-cyan-300/30 bg-cyan-500/5' : !assetReady ? 'cursor-not-allowed border-slate-700 bg-slate-900/50 opacity-70' : 'cursor-pointer border-cyan-400/50 bg-cyan-500/5'}`}>
            <Upload size={30} className="mb-2 text-cyan-300" />
            <span className="text-[12px] font-semibold text-slate-200">{uploading ? 'Analyzing locally…' : !assetReady ? 'Select an asset first' : fileName || 'Drag and drop a file here'}</span>
            <span className="mt-1 text-[10px] text-slate-500">{assetReady ? 'or click to browse · TXT, CSV, XLSX, DOCX, PDF' : 'Step 1: choose an asset from the list'}</span>
            <input type="file" onChange={handleFile} disabled={uploading || !assetReady} className="hidden" accept=".txt,.csv,.xlsx,.docx,.pdf" data-testid="input-assessment-file" />
          </label>

          <div>
            <label className="text-[11px] text-slate-300">Link to Asset
              <Select value={asset} onChange={setAsset} options={assetOptions} testId="select-assessment-asset" className="mt-2" />
              {!assetReady && <p className="mt-2 text-[10px] text-amber-300">Required before file upload.</p>}
            </label>
            {selectedFile && <div className="mt-3 flex items-center gap-2 rounded border border-teal-400/30 bg-teal-400/10 p-3 text-[10px] text-teal-200"><FileCheck2 size={17} />{fileName}<Check size={14} className="ml-auto" /></div>}
          </div>

          <div className="rounded border border-cyan-400/30 bg-cyan-500/10 p-3 text-[10px] leading-relaxed text-cyan-100 sm:col-span-2"><LockKeyhole size={14} className="mr-1 inline text-cyan-300" /><b>Your data stays private.</b> Raw uploaded content is analyzed locally and is never sent to AI.</div>
        </div>
      </Panel>

      <Panel title="Assessment Results" icon={Sparkles} action={<button className="pg-button primary" onClick={() => notify(result ? 'Open AI Assistant and select this assessment for metadata-only guidance.' : 'Upload an assessment first.')} data-testid="button-ask-assessment"><Sparkles size={13} />Ask AI for guidance</button>}>
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-[11px] font-semibold text-slate-200">Detected Data Categories</h3>
            {categories.length ? <div className="space-y-2">{categories.map((category: string) => <div key={category} className="flex items-center gap-2 text-[11px] text-slate-300"><span className="flex h-6 w-6 items-center justify-center rounded bg-cyan-500/15 text-cyan-300"><Database size={13} /></span>{category}<Check size={12} className="ml-auto text-teal-300" /></div>)}</div> : <p className="py-5 text-[10px] text-slate-500">Upload a file to see local classification results.</p>}
          </div>

          <div className={`rounded border p-4 ${classification === 'Sensitive PII' || classification === 'Restricted PII' ? 'border-red-400/25 bg-red-500/10' : 'border-cyan-400/25 bg-cyan-500/10'}`}>
            <AlertTriangle size={23} className="mb-3 text-cyan-300" />
            <div className="text-[10px] text-slate-400">Classification</div>
            <div className="mt-1 text-[17px] font-bold text-slate-100">{classification || 'Awaiting upload'}</div>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-400">{classification ? `${mappedControls.length} GDPR / ISO control mappings calculated.` : 'Select an asset and upload an approved assessment file.'}</p>
          </div>

          <div className="flex items-center justify-between rounded border border-amber-400/30 bg-amber-400/10 p-3 sm:col-span-2">
            <span className="text-[11px] text-slate-300">Calculated risk score</span>
            <span className="text-[19px] font-bold text-amber-300">{result?.assessment?.risk_score ?? '—'} <small className="text-[10px]">{riskLevel || 'Not calculated'}</small></span>
          </div>
        </div>
      </Panel>
    </div>

    <Panel title="Assessment Register" icon={FileText} className="mt-3 pg-assessment-register">
      <div className="border-b border-slate-800 p-3"><SearchBox placeholder="Search assessments..." value={query}
      onChange={(value) => {
        setQuery(value);
        setAssessmentPage(1);
      }}
      testId="input-search-assessments" /></div>
      <div className="pg-scroll-x pg-assessment-table-scroll"><table className="pg-table min-w-[900px]"><thead><tr>{['Assessment name', 'Source', 'Linked asset', 'Detected categories', 'Classification', 'Risk level', 'Mapped controls', 'Workflow status', 'Last updated'].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead>
        <tbody>{paginatedAssessments.map((item) => <tr key={item.id}>
          <td className="font-semibold text-slate-200"><FileText size={13} className="mr-2 inline text-cyan-300" />{item.name}</td><td>File Upload</td><td>{item.asset}</td>
          <td><div className="flex gap-1">{item.categories.slice(0, 3).map((category) => <i key={category} title={category} className="h-2.5 w-2.5 rounded-full bg-cyan-400" />)}</div></td>
          <td><Badge tone={item.classification === 'Restricted PII' || item.classification === 'Sensitive PII' ? 'red' : item.classification === 'Confidential' ? 'violet' : 'blue'}>{item.classification}</Badge></td>
          <td><Badge tone={item.risk === 'High' ? 'red' : item.risk === 'Medium' ? 'amber' : 'teal'} dot>{item.risk}</Badge></td>
          <td className="text-[10px]">Calculated</td><td><Badge tone={item.workflow === 'Completed' ? 'teal' : 'blue'} dot>{item.workflow}</Badge></td><td className="text-[10px] text-slate-500">{item.date}</td>
        </tr>)}</tbody></table></div>

      <div className="pg-assessment-pagination">
        <div className="text-[10px] text-slate-500">
          Showing {assessmentStart}–{assessmentEnd} of {filteredAssessments.length} assessments
        </div>

        <div className="flex items-center gap-2">
          <button
            className="pg-button"
            disabled={currentAssessmentPage <= 1}
            onClick={() =>
              setAssessmentPage((page) => Math.max(1, page - 1))
            }
          >
            Previous
          </button>

          <span className="pg-assessment-page-number">
            Page {currentAssessmentPage} of {assessmentTotalPages}
          </span>

          <button
            className="pg-button"
            disabled={currentAssessmentPage >= assessmentTotalPages}
            onClick={() =>
              setAssessmentPage((page) =>
                Math.min(assessmentTotalPages, page + 1)
              )
            }
          >
            Next
          </button>
        </div>
      </div>
    </Panel>
  </div>;
}
type LiveReport = {
  id: string | number;
  name: string;
  type: 'Assessment' | 'Classification' | 'Risk' | 'Control Map';
  asset: string;
  framework: string;
  owner: string;
  date: string;
  status: 'Ready' | 'Draft';
  assessmentId?: number;
};

function parseExecutiveSummary(summary: string) {
  if (!summary.trim()) return [];

  const headingPattern =
    /^(?:#{1,6}\s*)?(Executive Risk Posture|Priority Risk Exposure|Remediation Priorities|Management Actions|Important Limitation)\s*:?\s*$/i;

  const sections: Array<{
    title: string;
    content: string[];
  }> = [];

  let current: {
    title: string;
    content: string[];
  } | null = null;

  for (const rawLine of summary.split('\n')) {
    const line = rawLine.trim();

    if (!line) continue;

    const heading = line.match(headingPattern);

    if (heading) {
      current = {
        title: heading[1],
        content: [],
      };

      sections.push(current);
      continue;
    }

    if (!current) {
      current = {
        title: 'Executive Summary',
        content: [],
      };

      sections.push(current);
    }

    current.content.push(
      line
        .replace(/^[-*]\s+/, '')
        .replace(/^\d+[.)]\s+/, '')
        .trim()
    );
  }

  return sections;
}

function Reports() {
  const { notify } = useWorkspace();

  const [reportData, setReportData] = useState<any | null>(null);
  const [loadingReports, setLoadingReports] = useState(true);

  const [query, setQuery] = useState('');
  const [reportType, setReportType] = useState('All report types');
  const [reportFramework, setReportFramework] = useState('All frameworks');

  const [reportPage, setReportPage] = useState(1);
  const reportsPerPage = 10;

  const [preview, setPreview] = useState<LiveReport | null>(null);
  const [includeWorkflow, setIncludeWorkflow] = useState(true);

  const [reportScope, setReportScope] = useState('All linked assets');
  const [builderType, setBuilderType] = useState('Assessment summary');
  const [builderFramework, setBuilderFramework] = useState('GDPR');
  const [persistedReports, setPersistedReports] = useState<LiveReport[]>([]);
  const [executiveSummary, setExecutiveSummary] = useState('');
  const [draftingSummary, setDraftingSummary] = useState(false);
  const [summaryReport, setSummaryReport] = useState<LiveReport | null>(null);

  const loadLiveReports = async () => {
    setLoadingReports(true);

    try {
      const [data, storedReports] = await Promise.all([
        loadReportsData(),
        loadPersistedReports(),
      ]);

      setReportData(data);

      const assets = data?.assets || [];
      const assetById = new Map(
        assets.map((asset: any) => [asset.id, asset])
      );

      const normalizedPersisted: LiveReport[] = (storedReports || []).map(
        (report: any) => {
          let normalizedType: LiveReport['type'] = 'Assessment';

          if (
            String(report.report_type || '')
              .toLowerCase()
              .includes('risk')
          ) {
            normalizedType = 'Risk';
          } else if (
            String(report.report_type || '')
              .toLowerCase()
              .includes('control')
          ) {
            normalizedType = 'Control Map';
          } else if (
            String(report.report_type || '')
              .toLowerCase()
              .includes('classification')
          ) {
            normalizedType = 'Classification';
          }

          const asset = report.asset_id
            ? assetById.get(report.asset_id)
            : null;

          return {
            id: report.id,
            name: report.name,
            type: normalizedType,
            asset: asset?.name || 'All linked assets',
            framework: (report.frameworks || []).join(' · '),
            owner: asset?.owner || 'Privacy & Security',
            date: new Intl.DateTimeFormat('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }).format(new Date(report.created_at)),
            status:
              report.status === 'Ready' ? 'Ready' : 'Draft',
          };
        }
      );

      setPersistedReports(normalizedPersisted);
    } catch (error) {
      console.error('Reports loading error:', error);
      notify(
        'Reports could not load live data. Confirm that the API is running.'
      );
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    void loadLiveReports();
  }, []);

  const rawAssets = reportData?.assets || [];
  const rawAssessments = reportData?.assessments || [];
  const rawRisks = reportData?.risks || [];
  const rawWorkflows = reportData?.workflows || [];
  const rawControls = reportData?.controls || [];
  const overview = reportData?.overview || {};

  const assetById = new Map(
    rawAssets.map((asset: any) => [asset.id, asset])
  );

  const workflowByAssessment = new Map(
    rawWorkflows.map((workflow: any) => [workflow.assessment_id, workflow])
  );

  const liveReports: LiveReport[] = rawAssessments
    .slice()
    .sort(
      (a: any, b: any) =>
        new Date(b.updated_at).valueOf() -
        new Date(a.updated_at).valueOf()
    )
    .map((assessment: any) => {
      const asset: any = assetById.get(assessment.asset_id);
      const workflow: any = workflowByAssessment.get(assessment.id);

      const frameworks = new Set<string>();

      (assessment.mapped_control_ids || []).forEach((controlId: string) => {
        const control = rawControls.find(
          (item: any) => item.id === controlId
        );

        if (control?.framework) {
          frameworks.add(
            control.framework === 'ISO 27001'
              ? 'ISO/IEC 27001:2022'
              : control.framework
          );
        }
      });

      const date = assessment.updated_at
        ? new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }).format(new Date(assessment.updated_at))
        : '—';

      const status =
        workflow?.closure_status === 'Completed' ||
        workflow?.closure === 'Completed'
          ? 'Ready'
          : 'Draft';

      return {
        id: `assessment-${assessment.id}`,
        assessmentId: assessment.id,
        name: assessment.name || `Assessment #${assessment.id}`,
        type: 'Assessment',
        asset: asset?.name || `Asset #${assessment.asset_id}`,
        framework:
          Array.from(frameworks).join(' · ') || 'Not mapped',
        owner: asset?.owner || assessment.owner || 'Unassigned',
        date,
        status,
      };
    });

  const assessedAssetIds = new Set(
    rawAssessments.map((assessment: any) => assessment.asset_id)
  );

  const mappedControlIds = new Set(
    rawAssessments.flatMap(
      (assessment: any) => assessment.mapped_control_ids || []
    )
  );

  const highRiskCount = rawRisks.filter(
    (risk: any) =>
      risk.inherent_score >= 16 ||
      risk.risk_level === 'High'
  ).length;

  const completedWorkflows = rawWorkflows.filter(
    (workflow: any) =>
      workflow.closure_status === 'Completed' ||
      workflow.closure === 'Completed'
  ).length;

  const workflowCompletion = rawWorkflows.length
    ? Math.round((completedWorkflows / rawWorkflows.length) * 100)
    : 0;

  const controlCoverage = rawControls.length
    ? Math.round((mappedControlIds.size / rawControls.length) * 100)
    : 0;

  /*
    Privacy posture is a transparent operational indicator,
    not a legal/compliance score.

    50% control coverage
    50% workflow completion
  */
  const privacyPosture = Math.round(
    (controlCoverage * 0.5) +
    (workflowCompletion * 0.5)
  );

  const allReports = [...persistedReports, ...liveReports];

  const activeQuery = query.trim().toLowerCase();

  const filteredReports = allReports.filter((report) => {
    const searchable =
      `${report.name} ${report.type} ${report.asset} ${report.framework} ${report.owner}`
        .toLowerCase();

    return (
      (!activeQuery || searchable.includes(activeQuery)) &&
      (reportType === 'All report types' ||
        report.type === reportType) &&
      (reportFramework === 'All frameworks' ||
        report.framework.includes(reportFramework))
    );
  });

  const reportTotalPages = Math.max(
    1,
    Math.ceil(filteredReports.length / reportsPerPage)
  );

  const currentReportPage = Math.min(
    reportPage,
    reportTotalPages
  );

  const paginatedReports = filteredReports.slice(
    (currentReportPage - 1) * reportsPerPage,
    currentReportPage * reportsPerPage
  );

  const reportStart = filteredReports.length
    ? (currentReportPage - 1) * reportsPerPage + 1
    : 0;

  const reportEnd = Math.min(
    currentReportPage * reportsPerPage,
    filteredReports.length
  );

  useEffect(() => {
    setReportPage(1);
  }, [query, reportType, reportFramework]);

  const assetOptions = [
    'All linked assets',
    ...rawAssets.map((asset: any) => asset.name),
  ];

  const generateReport = async () => {
    if (!reportData) {
      notify('Live workspace data is still loading.');
      return;
    }

    const selectedAsset =
      reportScope === 'All linked assets'
        ? null
        : rawAssets.find(
            (asset: any) => asset.name === reportScope
          );

    const scopedAssessments = selectedAsset
      ? rawAssessments.filter(
          (assessment: any) =>
            assessment.asset_id === selectedAsset.id
        )
      : rawAssessments;

    if (!scopedAssessments.length) {
      notify('No assessments are available for the selected scope.');
      return;
    }

    let generatedType: LiveReport['type'] = 'Assessment';

    if (builderType === 'Risk overview') {
      generatedType = 'Risk';
    }

    if (builderType === 'Control map summary') {
      generatedType = 'Control Map';
    }

    const frameworks =
      builderFramework === 'GDPR + ISO/IEC 27001:2022'
        ? ['GDPR', 'ISO/IEC 27001:2022']
        : [builderFramework];

    try {
      const result = await generatePersistedReport({
        report_type: builderType,
        asset_id: selectedAsset?.id ?? null,
        frameworks,
        include_workflow_status: includeWorkflow,
      });

      const backendReport = result?.report;

      if (!backendReport?.id) {
        throw new Error('Backend did not return a report ID');
      }

      const generated: LiveReport = {
        id: backendReport.id,
        name: backendReport.name,
        type: generatedType,
        asset: reportScope,
        framework: frameworks.join(' · '),
        owner: selectedAsset?.owner || 'Privacy & Security',
        date: new Intl.DateTimeFormat('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }).format(new Date()),
        status:
          backendReport.status === 'Ready' ? 'Ready' : 'Draft',
      };

      setPersistedReports((current) => [
        generated,
        ...current.filter(
          (report) => report.id !== generated.id
        ),
      ]);

      setReportPage(1);
      setPreview(generated);
      setSummaryReport(generated);
      setExecutiveSummary('');

      notify(
        `Report ${backendReport.name} generated and saved.`
      );
    } catch (error) {
      console.error('Report generation error:', error);
      notify(
        'Report generation failed. Confirm that the API is running.'
      );
    }
  };

  const draftExecutiveSummary = async () => {
    const targetReport = summaryReport || preview;

    if (!targetReport) {
      notify('Select or preview a report first.');
      return;
    }

    if (typeof targetReport.id !== 'number') {
      notify(
        'AI executive summaries are available for generated reports saved in the report library.'
      );
      return;
    }

    setDraftingSummary(true);
    setExecutiveSummary('');

    try {
      const result = await requestReportExecutiveSummary(
        targetReport.id,
        `Draft a concise executive summary for this PrivacyGuard report.

The report itself is the approved source of context.

Write for senior management.
Focus on the report type and scope.
Use exact counts where available.
Do not invent vulnerabilities, controls, remediation activity, compliance status, audit results, technologies, policies, or business context.
If supporting detail is absent, explicitly state that it is not provided in the approved metadata.
Do not claim legal or regulatory compliance.`
      );

      const answer = result?.answer?.trim();

      if (!answer) {
        throw new Error('AI returned an empty response');
      }

      setExecutiveSummary(answer);

      notify(
        `Executive summary drafted for ${targetReport.name}.`
      );
    } catch (error) {
      console.error('Executive summary error:', error);

      notify(
        'AI summary failed. Confirm that the API and Ollama are running.'
      );
    } finally {
      setDraftingSummary(false);
    }
  };

  const printReport = (report: LiveReport) => {
    if (typeof report.id === 'number') {
      window.open(
        getReportDownloadUrl(report.id),
        '_blank',
        'noopener,noreferrer'
      );
      return;
    }

    const popup = window.open('', '_blank', 'width=1000,height=760');

    if (!popup) {
      notify('Allow pop-ups to open the printable report.');
      return;
    }

    const escapeHtml = (value: unknown) =>
      String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

    const scopedAsset =
      report.asset === 'All linked assets'
        ? null
        : rawAssets.find(
            (asset: any) => asset.name === report.asset
          );

    const scopedAssessments = scopedAsset
      ? rawAssessments.filter(
          (assessment: any) =>
            assessment.asset_id === scopedAsset.id
        )
      : rawAssessments;

    const scopedAssessmentIds = new Set(
      scopedAssessments.map((assessment: any) => assessment.id)
    );

    const scopedRisks = scopedAsset
      ? rawRisks.filter(
          (risk: any) =>
            risk.asset_id === scopedAsset.id ||
            scopedAssessmentIds.has(risk.assessment_id)
        )
      : rawRisks;

    const scopedHighRisks = scopedRisks.filter(
      (risk: any) =>
        risk.inherent_score >= 16 ||
        risk.risk_level === 'High'
    );

    const riskRows = scopedRisks
      .slice(0, 12)
      .map(
        (risk: any) => `
          <tr>
            <td>${escapeHtml(risk.risk_code || risk.id)}</td>
            <td>${escapeHtml(risk.title)}</td>
            <td>${escapeHtml(risk.classification)}</td>
            <td>${escapeHtml(risk.inherent_score ?? '—')}</td>
            <td>${escapeHtml(risk.owner || 'Unassigned')}</td>
          </tr>
        `
      )
      .join('');

    popup.document.write(`
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(report.name)}</title>

<style>
  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    padding: 38px 44px;
    background: #ffffff;
    color: #172033;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12px;
    line-height: 1.5;
  }

  .brand {
    color: #0891b2;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
  }

  h1 {
    margin: 7px 0 4px;
    color: #0f172a;
    font-size: 26px;
  }

  h2 {
    margin: 0 0 10px;
    color: #0f172a;
    font-size: 16px;
  }

  .muted {
    color: #64748b;
  }

  .header {
    padding-bottom: 18px;
    border-bottom: 3px solid #0891b2;
  }

  .metrics {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin: 22px 0;
  }

  .metric {
    min-height: 76px;
    padding: 12px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
  }

  .metric span {
    display: block;
    color: #64748b;
    font-size: 10px;
  }

  .metric strong {
    display: block;
    margin-top: 4px;
    color: #0f172a;
    font-size: 22px;
  }

  .section {
    margin-top: 22px;
    padding-top: 16px;
    border-top: 1px solid #e2e8f0;
  }

  .context {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 20px;
  }

  .context div {
    padding: 7px 0;
    border-bottom: 1px solid #f1f5f9;
  }

  .context b {
    display: block;
    margin-bottom: 2px;
    color: #64748b;
    font-size: 9px;
    text-transform: uppercase;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    padding: 8px;
    border-bottom: 1px solid #e2e8f0;
    text-align: left;
    vertical-align: top;
  }

  th {
    background: #f8fafc;
    color: #475569;
    font-size: 9px;
    text-transform: uppercase;
  }

  .notice {
    padding: 12px;
    border-left: 3px solid #0891b2;
    background: #f0fdfa;
    color: #334155;
  }

  .footer {
    margin-top: 28px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
    color: #64748b;
    font-size: 9px;
  }

  @page {
    margin: 14mm;
  }

  @media print {
    body {
      padding: 0;
    }

    .section,
    table,
    tr {
      break-inside: avoid;
    }
  }
</style>
</head>

<body>

<div class="header">
  <div class="brand">PrivacyGuard AI · Enterprise Privacy & Security</div>

  <h1>${escapeHtml(report.name)}</h1>

  <div class="muted">
    ${escapeHtml(report.type)}
    · ${escapeHtml(report.framework)}
    · Generated ${escapeHtml(report.date)}
  </div>
</div>

<div class="metrics">

  <div class="metric">
    <span>Privacy posture</span>
    <strong>${privacyPosture}/100</strong>
  </div>

  <div class="metric">
    <span>Calculated risks</span>
    <strong>${scopedRisks.length}</strong>
  </div>

  <div class="metric">
    <span>High priority</span>
    <strong>${scopedHighRisks.length}</strong>
  </div>

  <div class="metric">
    <span>Control coverage</span>
    <strong>${controlCoverage}%</strong>
  </div>

</div>

<section class="section">

  <h2>Report Context</h2>

  <div class="context">

    <div>
      <b>Scope</b>
      ${escapeHtml(report.asset)}
    </div>

    <div>
      <b>Report type</b>
      ${escapeHtml(report.type)}
    </div>

    <div>
      <b>Framework</b>
      ${escapeHtml(report.framework)}
    </div>

    <div>
      <b>Owner</b>
      ${escapeHtml(report.owner)}
    </div>

    <div>
      <b>Assessments in scope</b>
      ${scopedAssessments.length}
    </div>

    <div>
      <b>Status</b>
      ${escapeHtml(report.status)}
    </div>

  </div>

</section>

<section class="section">

  <h2>Calculated Risk Overview</h2>

  ${
    scopedRisks.length
      ? `
        <table>
          <thead>
            <tr>
              <th>Risk ID</th>
              <th>Finding</th>
              <th>Classification</th>
              <th>Score</th>
              <th>Owner</th>
            </tr>
          </thead>

          <tbody>
            ${riskRows}
          </tbody>
        </table>
      `
      : `
        <div class="notice">
          No calculated risks are currently associated with this report scope.
        </div>
      `
  }

</section>

<section class="section">

  <h2>Workspace Summary</h2>

  <div class="notice">
    This report was generated from the current PrivacyGuard AI
    workspace state. It reflects linked assets, approved assessment
    metadata, calculated risks, workflow status and mapped
    privacy/security controls at generation time.
  </div>

</section>

<div class="footer">
  PrivacyGuard AI · Generated locally ·
  Privacy and security decision-support output.
  This report does not constitute legal advice.
</div>

<script>
window.onload = function () {
  window.focus();

  setTimeout(function () {
    window.print();
  }, 250);
};
</script>

</body>
</html>
    `);

    popup.document.close();
  };

  const typeTone = (type: string) =>
    type === 'Risk'
      ? 'red'
      : type === 'Control Map'
        ? 'teal'
        : type === 'Classification'
          ? 'violet'
          : 'blue';

  return (
    <div className="pg-content">
      <PageHeader
        title="Reports"
        description="Clear, decision-ready outputs from linked assets and assessments."
        actions={
          <span className="text-[10px] text-slate-500">
            Live workspace reflection
          </span>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Privacy posture"
          value={String(privacyPosture)}
          icon={Shield}
          tone="teal"
          note="/100"
        />

        <StatCard
          label="Calculated risks"
          value={String(
            overview.calculated_risks ?? rawRisks.length
          )}
          icon={AlertTriangle}
          tone="red"
          note={`${highRiskCount} high priority`}
        />

        <StatCard
          label="Assets assessed"
          value={String(assessedAssetIds.size)}
          icon={FileText}
          tone="amber"
          note={`of ${rawAssets.length} linked`}
        />

        <StatCard
          label="Control coverage"
          value={`${controlCoverage}%`}
          icon={Activity}
          note={`${mappedControlIds.size} of ${rawControls.length} controls`}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_245px]">
        <Panel
          title="Report Library"
          icon={FileText}
          className="pg-report-library"
        >
          <div className="border-b border-slate-800 p-3">
            <Toolbar>
              <SearchBox
                placeholder="Search reports by name, type, asset..."
                value={query}
                onChange={setQuery}
                testId="input-search-reports"
              />

              <Select
                value={reportType}
                onChange={setReportType}
                options={[
                  'All report types',
                  'Assessment',
                  'Classification',
                  'Risk',
                  'Control Map',
                ]}
                testId="select-report-type"
                className="w-[150px]"
              />

              <Select
                value={reportFramework}
                onChange={setReportFramework}
                options={[
                  'All frameworks',
                  'GDPR',
                  'ISO/IEC 27001:2022',
                ]}
                testId="select-report-framework"
                className="w-[175px]"
              />

              <span className="self-center whitespace-nowrap text-[10px] text-slate-500">
                {filteredReports.length} reports
              </span>
            </Toolbar>
          </div>

          <div className="pg-scroll-x pg-report-table-scroll">
            <table className="pg-table min-w-[900px]">
              <thead>
                <tr>
                  {[
                    'Report name',
                    'Type',
                    'Linked asset',
                    'Frameworks',
                    'Owner',
                    'Generated date',
                    'Status',
                    'Actions',
                  ].map((heading) => (
                    <th key={heading}>{heading}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {paginatedReports.map((report) => (
                  <tr key={report.id}>
                    <td className="font-semibold text-slate-200">
                      <FileText
                        size={14}
                        className="mr-2 inline text-cyan-300"
                      />
                      {report.name}
                    </td>

                    <td>
                      <Badge tone={typeTone(report.type) as any}>
                        {report.type}
                      </Badge>
                    </td>

                    <td>{report.asset}</td>

                    <td className="text-[10px]">
                      {report.framework}
                    </td>

                    <td>{report.owner}</td>

                    <td className="text-[10px] text-slate-500">
                      {report.date}
                    </td>

                    <td>
                      <Badge
                        tone={
                          report.status === 'Ready'
                            ? 'teal'
                            : 'amber'
                        }
                        dot
                      >
                        {report.status}
                      </Badge>
                    </td>

                    <td>
                      <div className="flex gap-1">
                        <button
                          className="pg-button h-7 px-2 text-[10px]"
                          onClick={() => {
                            setPreview(report);
                            setSummaryReport(report);
                            setExecutiveSummary('');
                          }}
                          data-testid={`button-preview-report-${report.id}`}
                        >
                          <Globe2 size={12} />
                          Preview
                        </button>

                        <button
                          className="pg-button h-7 px-2 text-[10px]"
                          onClick={() => printReport(report)}
                          data-testid={`button-download-report-${report.id}`}
                        >
                          <Download size={12} />
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {loadingReports && (
              <EmptyState message="Loading live reports..." />
            )}

            {!loadingReports && filteredReports.length === 0 && (
              <EmptyState message="No reports match these filters." />
            )}
          </div>

          <div className="pg-report-pagination">
            <span className="text-[9px] text-slate-500">
              Showing {reportStart}–{reportEnd} of{' '}
              {filteredReports.length} reports
            </span>

            <div className="flex items-center gap-2">
              <button
                className="pg-button"
                disabled={currentReportPage <= 1}
                onClick={() =>
                  setReportPage((page) =>
                    Math.max(1, page - 1)
                  )
                }
              >
                <ChevronLeft size={13} />
                Previous
              </button>

              <span className="pg-report-page-number">
                Page {currentReportPage} of {reportTotalPages}
              </span>

              <button
                className="pg-button"
                disabled={
                  currentReportPage >= reportTotalPages
                }
                onClick={() =>
                  setReportPage((page) =>
                    Math.min(reportTotalPages, page + 1)
                  )
                }
              >
                Next
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </Panel>

        <div className="space-y-3">
          <Panel title="Report Builder" icon={FileText}>
            <div className="space-y-3 p-3 text-[10px]">
              <label>
                Report scope
                <Select
                  value={reportScope}
                  onChange={setReportScope}
                  options={assetOptions}
                  testId="select-report-scope"
                  className="mt-1"
                />
              </label>

              <label>
                Report type
                <Select
                  value={builderType}
                  onChange={setBuilderType}
                  options={[
                    'Assessment summary',
                    'Risk overview',
                    'Control map summary',
                  ]}
                  testId="select-report-builder-type"
                  className="mt-1"
                />
              </label>

              <label>
                Frameworks
                <Select
                  value={builderFramework}
                  onChange={setBuilderFramework}
                  options={[
                    'GDPR',
                    'ISO/IEC 27001:2022',
                    'GDPR + ISO/IEC 27001:2022',
                  ]}
                  testId="select-report-builder-framework"
                  className="mt-1"
                />
              </label>

              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={includeWorkflow}
                  onChange={(e) =>
                    setIncludeWorkflow(e.target.checked)
                  }
                  className="accent-cyan-400"
                  data-testid="checkbox-include-workflow-status"
                />
                Include workflow status
              </label>

              <button
                className="pg-button primary w-full"
                onClick={generateReport}
                data-testid="button-generate-report"
              >
                <FileText size={14} />
                Generate report
              </button>
            </div>
          </Panel>

          <Panel title="Recent reports">
            <div className="space-y-2 p-3">
              {liveReports.slice(0, 4).map((report) => (
                <button
                  key={report.id}
                  className="flex w-full items-center gap-2 border-b border-slate-800 pb-2 text-left text-[10px] last:border-0"
                  onClick={() => {
                    setPreview(report);
                    setSummaryReport(report);
                    setExecutiveSummary('');
                  }}
                >
                  <FileText
                    size={14}
                    className="text-cyan-300"
                  />

                  <span className="flex-1 truncate">
                    {report.name}
                    <small className="block text-slate-500">
                      {report.date} · {report.owner}
                    </small>
                  </span>

                  <ChevronRight
                    size={13}
                    className="text-slate-500"
                  />
                </button>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <Panel
        title="Ask AI to draft executive summary"
        icon={Sparkles}
        className="mt-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 p-3">
          <div className="min-w-0 flex-1">
            <p className="max-w-3xl text-[11px] leading-relaxed text-slate-400">
              AI drafts an executive brief for the selected report using
              approved report metadata and its current live scope.
              Raw uploaded content is not sent to AI.
            </p>

            {summaryReport && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-cyan-300">
                <FileText size={12} />
                <span>Summary target:</span>

                <span className="font-semibold text-slate-200">
                  {summaryReport.name}
                </span>

                <span className="text-slate-500">
                  · {summaryReport.type}
                  · {summaryReport.asset}
                </span>
              </div>
            )}

            {executiveSummary && (
              <div className="mt-3 overflow-hidden rounded-lg border border-cyan-400/20 bg-slate-950/30">
                <div className="flex items-center justify-between border-b border-slate-700/60 bg-cyan-500/5 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles size={13} className="text-cyan-300" />

                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                      Executive AI Brief
                    </span>
                  </div>

                  <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-cyan-300">
                    AI generated
                  </span>
                </div>

                <div className="max-h-[310px] overflow-y-auto p-3">
                  <div className="grid gap-2">
                    {parseExecutiveSummary(executiveSummary).map(
                      (section, index) => {
                        const limitation =
                          section.title.toLowerCase() ===
                          'important limitation';

                        const priority =
                          section.title.toLowerCase() ===
                          'priority risk exposure';

                        const remediation =
                          section.title.toLowerCase() ===
                          'remediation priorities';

                        const management =
                          section.title.toLowerCase() ===
                          'management actions';

                        return (
                          <section
                            key={`${section.title}-${index}`}
                            className={`rounded-md border p-4 ${
                              limitation
                                ? 'border-amber-400/20 bg-amber-500/5'
                                : priority
                                  ? 'border-red-400/15 bg-red-500/[0.035]'
                                  : 'border-slate-700/60 bg-slate-900/35'
                            }`}
                          >
                            <div className="mb-2 flex items-center gap-2">
                              <div
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                                  limitation
                                    ? 'border-amber-400/20 bg-amber-500/10 text-amber-300'
                                    : priority
                                      ? 'border-red-400/20 bg-red-500/10 text-red-300'
                                      : remediation
                                        ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
                                        : management
                                          ? 'border-blue-400/20 bg-blue-500/10 text-blue-300'
                                          : 'border-cyan-400/20 bg-cyan-500/10 text-cyan-300'
                                }`}
                              >
                                {limitation ? (
                                  <AlertTriangle size={12} />
                                ) : priority ? (
                                  <ShieldAlert size={12} />
                                ) : remediation ? (
                                  <CheckCircle2 size={12} />
                                ) : management ? (
                                  <ArrowRight size={12} />
                                ) : (
                                  <Activity size={12} />
                                )}
                              </div>

                              <h4 className="text-[11px] font-semibold text-slate-100">
                                {section.title}
                              </h4>
                            </div>

                            <div className="space-y-1.5 pl-8">
                              {section.content.map((item, itemIndex) => (
                                <div
                                  key={itemIndex}
                                  className="flex items-start gap-2 text-[10.5px] leading-[1.65] text-slate-300"
                                >
                                  {section.content.length > 1 && (
                                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-cyan-400/70" />
                                  )}

                                  <span>{item}</span>
                                </div>
                              ))}
                            </div>
                          </section>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            className="pg-button primary"
            onClick={() => void draftExecutiveSummary()}
            disabled={draftingSummary || loadingReports || !summaryReport}
            data-testid="button-draft-executive-summary"
          >
            <Sparkles size={14} />
            {draftingSummary
              ? 'Drafting...'
              : executiveSummary
                ? 'Regenerate summary'
                : 'Draft executive summary'}
          </button>
        </div>
      </Panel>

      {preview && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="pg-panel max-h-[85vh] w-full max-w-[680px] overflow-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pg-panel-header">
              <span className="font-semibold">
                {preview.name}
              </span>

              <button
                className="pg-button ghost h-7 w-7 p-0"
                onClick={() => setPreview(null)}
                aria-label="Close report preview"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="border-b border-slate-800 pb-4">
                <div className="pg-kicker">
                  Live workspace report · {preview.framework}
                </div>

                <h2 className="mt-2 text-2xl font-bold text-slate-100">
                  {preview.name}
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Updated {preview.date} · Owner {preview.owner}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded bg-cyan-500/10 p-3">
                  <small className="text-slate-500">
                    Privacy posture
                  </small>
                  <strong className="mt-1 block text-xl">
                    {privacyPosture}
                  </strong>
                </div>

                <div className="rounded bg-red-500/10 p-3">
                  <small className="text-slate-500">
                    Calculated risks
                  </small>
                  <strong className="mt-1 block text-xl text-red-300">
                    {rawRisks.length}
                  </strong>
                </div>

                <div className="rounded bg-teal-500/10 p-3">
                  <small className="text-slate-500">
                    Control coverage
                  </small>
                  <strong className="mt-1 block text-xl text-teal-300">
                    {controlCoverage}%
                  </strong>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded border border-slate-800 p-3">
                  <small className="text-slate-500">
                    Linked asset
                  </small>
                  <div className="mt-1 text-xs text-slate-200">
                    {preview.asset}
                  </div>
                </div>

                <div className="rounded border border-slate-800 p-3">
                  <small className="text-slate-500">
                    Status
                  </small>
                  <div className="mt-1 text-xs text-slate-200">
                    {preview.status}
                  </div>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-slate-400">
                This report reflects the current PrivacyGuard workspace
                state including linked assets, assessments, calculated
                risks, workflow status and mapped privacy/security
                controls.
              </p>

              <button
                className="pg-button primary"
                onClick={() => printReport(preview)}
              >
                Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// @ts-ignore The response rows intentionally store icon components beside copy in a compact tuple.
function AIAssistant() {
  const { notify } = useWorkspace();

  type AiOption = {
    key: string;
    type: AiContextType;
    id: string | number;
    label: string;
    subtitle: string;
  };

  type Consultation = {
    key: string;
    label: string;
    question: string;
    type: AiContextType;
    id: string | number;
  };

  const params = new URLSearchParams(window.location.search);

  const mappedRisk = params.get('risk');
  const mappedControl = params.get('control');

  const [loading, setLoading] = useState(true);
  const [asking, setAsking] = useState(false);

  const [data, setData] = useState<any>(null);
  const [options, setOptions] = useState<AiOption[]>([]);

  const [contextKey, setContextKey] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [provider, setProvider] = useState('');

  const [consultations, setConsultations] = useState<Consultation[]>([]);

  const selected = options.find((item) => item.key === contextKey);

  const loadData = async () => {
    setLoading(true);

    try {
      const live = await loadAiAssistantData();

      setData(live);

      const riskOptions: AiOption[] = (live.risks || []).map((risk: any) => ({
        key: `risk::${risk.id}`,
        type: 'risk',
        id: risk.id,
        label: `${risk.risk_code} · ${risk.title}`,
        subtitle: `${risk.classification} · Score ${risk.inherent_score} · ${risk.owner}`,
      }));

      const assetOptions: AiOption[] = (live.assets || []).map((asset: any) => ({
        key: `asset::${asset.id}`,
        type: 'asset',
        id: asset.id,
        label: `Asset · ${asset.name}`,
        subtitle: `${asset.asset_type} · ${asset.owner}`,
      }));

      const assessmentOptions: AiOption[] = (live.assessments || []).map((assessment: any) => ({
        key: `assessment::${assessment.id}`,
        type: 'assessment',
        id: assessment.id,
        label: `Assessment · ${assessment.name}`,
        subtitle: `${assessment.classification} · ${assessment.risk_level}`,
      }));

      const controlOptions: AiOption[] = (live.controls || []).map((control: any) => ({
        key: `control::${control.id}`,
        type: 'control',
        id: control.id,
        label: `${control.framework} ${control.reference} · ${control.title}`,
        subtitle: control.framework,
      }));

      const reportOptions: AiOption[] = (live.reports || []).map((report: any) => ({
        key: `report::${report.id}`,
        type: 'report',
        id: report.id,
        label: `Report · ${report.name}`,
        subtitle: `${report.report_type} · ${report.status}`,
      }));

      const nextOptions = [
        ...riskOptions,
        ...assetOptions,
        ...assessmentOptions,
        ...controlOptions,
        ...reportOptions,
      ];

      setOptions(nextOptions);

      let initial: AiOption | undefined;

      if (mappedRisk) {
        initial = riskOptions.find(
          (item) =>
            String(item.id) === mappedRisk ||
            item.label.startsWith(mappedRisk)
        );
      }

      if (!initial && mappedControl) {
        initial = controlOptions.find(
          (item) =>
            String(item.id) === mappedControl ||
            item.label.includes(mappedControl)
        );
      }

      initial = initial || riskOptions[0] || assessmentOptions[0] || assetOptions[0] || controlOptions[0] || reportOptions[0];

      if (initial) {
        setContextKey(initial.key);
      }
    } catch (error) {
      console.error(error);
      notify('Unable to load live AI context');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    setAnswer('');
    setProvider('');
  }, [contextKey]);

  const suggestedQuestions: Record<AiContextType, string[]> = {
    risk: [
      'Explain this risk using only the approved metadata.',
      'What mapped controls apply to this risk?',
      'What should the risk owner review next?',
      'What evidence is missing for a stronger conclusion?',
    ],
    asset: [
      'Summarize the privacy and security context of this asset.',
      'What risk considerations should be reviewed for this asset?',
      'What information is currently available about this asset?',
      'What should the asset owner review next?',
    ],
    assessment: [
      'Summarize this assessment and its classification.',
      'Explain the calculated risk using the approved metadata.',
      'What mapped controls are associated with this assessment?',
      'What should be reviewed next for this assessment?',
    ],
    control: [
      'Explain the objective of this control.',
      'What technical measures are defined for this control?',
      'What organizational measures are defined for this control?',
      'How should this control be reviewed in practice?',
    ],
    report: [
      'Draft an executive summary using only approved report metadata.',
      'What are the priority findings in this report?',
      'What management actions are supported by this report?',
      'What important evidence limitations should management know?',
    ],
  };

  const prompts = selected
    ? suggestedQuestions[selected.type]
    : suggestedQuestions.risk;

  const ask = async () => {
    if (!selected || !question.trim() || asking) return;

    setAsking(true);
    setAnswer('');

    try {
      const response = await requestAiGuidance(
        selected.type,
        selected.id,
        question.trim()
      );

      setAnswer(response?.answer || 'No guidance was returned.');
      setProvider(response?.provider || 'local');

      setConsultations((current) => {
        const next: Consultation = {
          key: `${selected.key}-${Date.now()}`,
          label: selected.label,
          question: question.trim(),
          type: selected.type,
          id: selected.id,
        };

        return [next, ...current].slice(0, 6);
      });

      notify('Guidance generated from approved metadata');
    } catch (error) {
      console.error(error);
      notify('AI guidance request failed');
    } finally {
      setAsking(false);
    }
  };

  const responseSections = (() => {
    if (!answer.trim()) return [];

    const lines = answer.split('\n');
    const sections: { title: string; text: string }[] = [];

    let title = 'AI Guidance';
    let body: string[] = [];

    const push = () => {
      const text = body.join('\n').trim();

      if (text) {
        sections.push({
          title,
          text,
        });
      }

      body = [];
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();

      const markdownHeading = line.match(/^#{1,4}\s+(.+)$/);

      const knownHeading =
        line.endsWith(':') &&
        line.length < 80 &&
        !line.startsWith('-');

      if (markdownHeading) {
        push();
        title = markdownHeading[1].trim();
        continue;
      }

      if (knownHeading) {
        push();
        title = line.slice(0, -1).trim();
        continue;
      }

      body.push(rawLine);
    }

    push();

    if (!sections.length && answer.trim()) {
      sections.push({
        title: 'AI Guidance',
        text: answer.trim(),
      });
    }

    const normalized: { title: string; text: string }[] = [];

    for (const section of sections) {
      const cleanTitle = section.title
        .replace(/^[-*#\s]+/, '')
        .replace(/:+$/, '')
        .trim();

      let cleanText = section.text.trim();

      const escapedTitle = cleanTitle.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      );

      cleanText = cleanText
        .replace(
          new RegExp(
            `^(?:[-*]\\s*)?${escapedTitle}\\s*:?\\s*`,
            'i'
          ),
          ''
        )
        .trim();

      if (!cleanText) continue;

      const existing = normalized.find(
        (item) =>
          item.title.toLowerCase() === cleanTitle.toLowerCase()
      );

      if (existing) {
        if (!existing.text.includes(cleanText)) {
          existing.text = `${existing.text}\n${cleanText}`;
        }
        continue;
      }

      normalized.push({
        title: cleanTitle,
        text: cleanText,
      });
    }

    return normalized;
  })();

  const sectionIcon = (title: string) => {
    const value = title.toLowerCase();

    if (value.includes('limitation')) return AlertTriangle;
    if (value.includes('risk') || value.includes('exposure')) return ShieldAlert;
    if (value.includes('control')) return Shield;
    if (value.includes('action') || value.includes('next')) return CheckCircle2;
    if (value.includes('classification')) return Target;
    if (value.includes('asset')) return Database;
    if (value.includes('report') || value.includes('summary')) return FileText;

    return Sparkles;
  };

  const selectLabels = options.map((item) => item.label);

  const selectedLabel = selected?.label || '';

  const handleSelect = (label: string) => {
    const match = options.find((item) => item.label === label);

    if (match) {
      setContextKey(match.key);
    }
  };

  const recentAssets = (data?.assets || []).slice(0, 3);

  return (
    <div className="pg-content">
      <PageHeader
        title="PrivacyGuard AI Assistant"
        description="Local AI Advisor for Privacy & Security Assessments."
      />

      <div className="mb-3 flex items-center gap-3 rounded border border-cyan-400/50 bg-cyan-500/10 p-3 shadow-[0_0_22px_rgba(20,160,245,.12)]">
        <Shield size={27} className="text-cyan-300" />

        <div className="flex-1">
          <div className="text-[12px] font-semibold text-cyan-100">
            Your data stays private
          </div>

          <div className="text-[10px] text-slate-400">
            Only approved metadata is sent to your local AI engine.
            Raw uploaded file content is never sent to AI.
          </div>
        </div>

        <div className="hidden items-center gap-2 border-l border-cyan-400/20 pl-4 text-[10px] text-slate-300 sm:flex">
          <LockKeyhole size={17} />

          <div>
            Runs locally with Ollama
            <br />
            <span className="text-slate-500">
              Your data. Your environment.
            </span>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[310px_minmax(0,1fr)_285px]">
        <Panel title="Context" icon={Target}>
          <div className="p-3">
            <p className="mb-4 text-[12px] leading-5 text-slate-400">
              Select a live risk, asset, control, assessment or report
              to get grounded guidance.
            </p>

            {loading ? (
              <div className="rounded border border-slate-700/70 bg-slate-950/20 p-3 text-[10px] text-slate-400">
                Loading live workspace context...
              </div>
            ) : (
              <Select
                value={selectedLabel}
                onChange={handleSelect}
                options={selectLabels}
                testId="select-ai-context"
              />
            )}

            {selected && (
              <div className="mt-3 rounded-md border border-cyan-400/15 bg-cyan-500/5 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone="teal">
                    {selected.type.toUpperCase()}
                  </Badge>

                  <span className="text-[9px] text-slate-500">
                    Live context
                  </span>
                </div>

                <div className="mt-3 text-[12px] font-semibold leading-5 text-slate-200">
                  {selected.label}
                </div>

                <div className="mt-1.5 text-[11px] leading-5 text-slate-500">
                  {selected.subtitle}
                </div>
              </div>
            )}

            <label className="mt-4 block text-[11px] font-semibold text-slate-200">
              Your question

              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="pg-input mt-2 h-28 resize-none py-2"
                placeholder="Ask about this item, request guidance, assessment steps, or evidence requirements..."
                data-testid="textarea-ai-question"
              />
            </label>

            <div className="mt-3 grid grid-cols-2 gap-1">
              {prompts.map((prompt, index) => (
                <button
                  key={prompt}
                  className="pg-button min-h-9 px-1.5 text-[9px] leading-tight"
                  onClick={() => setQuestion(prompt)}
                  data-testid={`button-ai-prompt-${index}`}
                >
                  {prompt}
                </button>
              ))}
            </div>

            <button
              className="pg-button primary mt-3 w-full"
              onClick={() => void ask()}
              disabled={
                loading ||
                asking ||
                !selected ||
                !question.trim()
              }
              data-testid="button-ask-ai"
            >
              {asking ? (
                <>
                  <Activity size={14} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Send size={14} />
                  Ask PrivacyGuard AI
                </>
              )}
            </button>
          </div>
        </Panel>

        <Panel
          title="AI Response"
          icon={Bot}
          action={
            <span className="text-[10px] text-teal-300">
              <span className="pg-status-dot mr-1" />
              {provider
                ? `Powered by ${provider}`
                : 'Local evidence-grounded guidance'}
            </span>
          }
        >
          <div className="max-h-[650px] overflow-y-auto p-3">
            {!answer && !asking && (
              <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-500/5 text-cyan-300">
                  <Sparkles size={21} />
                </div>

                <div className="text-[12px] font-semibold text-slate-300">
                  Ready for a grounded consultation
                </div>

                <p className="mt-2 max-w-sm text-[10px] leading-relaxed text-slate-500">
                  Select live workspace context and ask a question.
                  PrivacyGuard AI will use only approved metadata available
                  for that object.
                </p>
              </div>
            )}

            {asking && (
              <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
                <Activity size={23} className="animate-spin text-cyan-300" />

                <div className="mt-3 text-[11px] text-slate-300">
                  Reviewing approved metadata...
                </div>

                <div className="mt-1 text-[9px] text-slate-500">
                  Raw uploaded content remains outside the AI context.
                </div>
              </div>
            )}

            {!asking && responseSections.length > 0 && (
              <div className="space-y-2">
                <div className="mb-4 flex items-center justify-between rounded-md border border-cyan-400/20 bg-cyan-500/5 px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-400">
                      Consultation context
                    </div>

                    <div className="mt-1.5 truncate text-[12px] font-semibold text-slate-200">
                      {selected?.label}
                    </div>
                  </div>

                  <Badge tone="teal">
                    {selected?.type || 'AI'}
                  </Badge>
                </div>

                {responseSections.map((section, index) => {
                  const Icon = sectionIcon(section.title);
                  const limitation = section.title
                    .toLowerCase()
                    .includes('limitation');

                  return (
                    <div
                      key={`${section.title}-${index}`}
                      className={`rounded-md border p-4 ${
                        limitation
                          ? 'border-red-400/20 bg-red-500/5'
                          : 'border-slate-700/70 bg-slate-950/20'
                      }`}
                    >
                      <div className="flex gap-4">
                        <div
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${
                            limitation
                              ? 'border-red-400/20 bg-red-500/10 text-red-300'
                              : 'border-cyan-400/20 bg-cyan-500/10 text-cyan-300'
                          }`}
                        >
                          <Icon size={17} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-semibold text-slate-100">
                            {section.title}
                          </div>

                          <div className="mt-2 whitespace-pre-wrap text-[12px] leading-[1.65] text-slate-300">
                            {section.text}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Recent consultations" icon={Activity}>
          <div className="p-3">
            {consultations.length === 0 ? (
              <div className="rounded border border-dashed border-slate-700 p-3 text-center text-[9px] leading-relaxed text-slate-500">
                Your live consultations will appear here during this session.
              </div>
            ) : (
              <div className="space-y-1">
                {consultations.map((item, index) => (
                  <button
                    key={item.key}
                    className="flex w-full items-center gap-3 border-b border-slate-800 py-3 text-left text-[11px] text-slate-300 last:border-0"
                    onClick={() => {
                      const match = options.find(
                        (option) =>
                          option.type === item.type &&
                          String(option.id) === String(item.id)
                      );

                      if (match) {
                        setContextKey(match.key);
                        setQuestion(item.question);
                      }
                    }}
                    data-testid={`button-consultation-${index}`}
                  >
                    <Sparkles size={13} className="shrink-0 text-cyan-300" />

                    <span className="min-w-0 flex-1">
                      <span className="block truncate">
                        {item.label}
                      </span>

                      <span className="mt-1 block truncate text-[9px] text-slate-500">
                        {item.question}
                      </span>
                    </span>

                    <ChevronRight size={13} className="shrink-0 text-slate-500" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="pg-panel-header mt-2 text-[11px]">
            <span>Live assets ({recentAssets.length})</span>
            <span className="text-slate-500">Workspace</span>
          </div>

          <div className="space-y-3 p-4 text-[11px] text-slate-300">
            {recentAssets.map((asset: any) => (
              <button
                key={asset.id}
                className="flex w-full items-center gap-2 text-left transition-colors hover:text-cyan-200"
                onClick={() => {
                  const match = options.find(
                    (item) =>
                      item.type === 'asset' &&
                      String(item.id) === String(asset.id)
                  );

                  if (match) {
                    setContextKey(match.key);
                  }
                }}
              >
                <Database size={13} className="shrink-0 text-cyan-300" />

                <span className="truncate">
                  {asset.name}
                </span>
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Router() {
  return <Shell><ErrorBoundary resetKey={window.location.pathname}><Switch>
    <Route path="/" component={() => <Redirect to="/dashboard" />} />
    <Route path="/dashboard" component={Dashboard} />
    <Route path="/workflows" component={Workflows} />
    <Route path="/risk-register" component={RiskRegister} />
    <Route path="/data-inventory" component={DataInventory} />
    <Route path="/controls-compliance" component={ControlsCompliance} />
    <Route path="/control-map" component={ControlMap} />
    <Route path="/assessments" component={Assessments} />
    <Route path="/reports" component={Reports} />
    <Route path="/ai-assistant" component={AIAssistant} />
    <Route component={() => <div className="p-8 text-slate-300">Page not found</div>} />
  </Switch></ErrorBoundary></Shell>;
}
function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><Router /><Toaster /></TooltipProvider></QueryClientProvider>;
}
export default App;