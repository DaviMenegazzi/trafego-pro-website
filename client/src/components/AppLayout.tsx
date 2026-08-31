import { useEffect, useState, useMemo, type CSSProperties, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  GitBranch,
  CreditCard,
  ClipboardList,
  Newspaper,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  MessageSquare,
  Inbox,
  ShieldCheck,
  Link2,
  UsersRound,
  Tag,
  ChevronDown,
  Building2,
  BarChart3,
} from "lucide-react";
import { useClientContext } from "@/contexts/ClientContext";
import { canSeeAdminFeedbacks } from "@/components/adminNavigationPolicy";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const DURATION = "200ms";
const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";

// ─── Helper: lê o user do localStorage ──────────────────────────────────────
function getStoredUser(): {
  name?: string;
  email?: string;
  role?: string;
  allowedClientIds?: string[];
} {
  try {
    return JSON.parse(localStorage.getItem("tp_user") ?? "{}");
  } catch {
    return {};
  }
}

function isAdminUser(): boolean {
  return canSeeAdminFeedbacks(getStoredUser());
}

// ─── Nav items ──────────────────────────────────────────────────────────────
const NAV_BASE = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/dashboard/anuncios", label: "Anúncios", icon: Tag },
  { to: "/dashboard/feedback-leads", label: "Feedback de Leads", icon: MessageSquare },
  { to: "/dashboard/banco-talentos", label: "Banco de Talentos", icon: UsersRound },
  { to: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
];

const NAV_ADMIN_ONLY = [
  { to: "/admin/metricas", label: "Métricas da Rede", icon: BarChart3 },
  { to: "/dashboard/feedback-leads/list", label: "Feedbacks enviados", icon: Inbox },
  { to: "/dashboard/usuarios", label: "Usuários", icon: ShieldCheck },
  { to: "/dashboard/integracoes-ia", label: "Integrações de IA", icon: Link2 },
];

function ClientSelector({ collapsed, variant = "sidebar" }: { collapsed: boolean; variant?: "sidebar" | "compact" }) {
  const { clients, selectedClientId, setSelectedClientId } = useClientContext();
  const [open, setOpen] = useState(false);
  const [unitSearch, setUnitSearch] = useState("");

  useEffect(() => {
    if (clients.length === 0) {
      if (selectedClientId !== null) setSelectedClientId(null);
      return;
    }

    const hasSelectedClient = clients.some((client) => client.id === selectedClientId);
    if (!hasSelectedClient) setSelectedClientId(clients[0].id);
  }, [clients, selectedClientId, setSelectedClientId]);

  if (clients.length === 0 || collapsed) return null;

  const selectedName = clients.find((client) => client.id === selectedClientId)?.name ?? clients[0].name;

  const visibleClients = unitSearch.trim()
    ? clients.filter((c) => c.name.toLowerCase().includes(unitSearch.toLowerCase()))
    : clients;

  return (
    <Popover open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) setUnitSearch(""); }}>
      <PopoverTrigger asChild>
        {variant === "compact" ? (
          <button
            type="button"
            aria-label="Selecionar unidade"
            className="inline-flex h-9 max-w-[165px] items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900/90 px-2.5 py-1 text-left text-xs text-foreground shadow-sm transition-all duration-200 active:scale-95 hover:border-emerald-500/50 hover:bg-zinc-800 focus:outline-none"
          >
            <Building2 className="size-3.5 shrink-0 text-emerald-400" />
            <span className="min-w-0 flex-1 truncate font-medium text-zinc-200">{selectedName}</span>
            <ChevronDown className="size-3 shrink-0 text-zinc-400" />
          </button>
        ) : (
          <button
            type="button"
            aria-label="Selecionar unidade"
            className="inline-flex min-h-10 w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2.5 text-left text-xs text-foreground shadow-sm transition-all duration-200 hover:border-zinc-500 hover:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-zinc-400"
          >
            <Building2 className="size-4 shrink-0 text-emerald-400" />
            <span className="min-w-0 flex-1 truncate font-medium">{selectedName}</span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align={variant === "compact" ? "end" : "start"}
        side={variant === "compact" ? "bottom" : "right"}
        sideOffset={variant === "compact" ? 8 : 10}
        className="w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border border-white/10 bg-zinc-950/95 p-0 text-foreground shadow-2xl backdrop-blur-2xl z-50 max-w-[calc(100vw-1rem)]"
      >
        <div className="border-b border-white/10 px-4 py-3">
          <p className="font-display text-sm font-semibold text-white">Unidades disponíveis</p>
          <p className="mt-0.5 text-xs text-zinc-400">Selecione para atualizar os dados.</p>
          {clients.length > 5 && (
            <div className="mt-2.5">
              <input
                type="text"
                value={unitSearch}
                onChange={(e) => setUnitSearch(e.target.value)}
                placeholder="Filtrar unidade…"
                className="h-8 w-full rounded-lg border border-white/10 bg-zinc-900 px-2.5 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-emerald-500/60"
              />
            </div>
          )}
        </div>
        <div className="max-h-64 overflow-y-auto p-2">
          {visibleClients.length === 0 ? (
            <p className="px-3 py-4 text-xs text-zinc-500 text-center">Nenhuma unidade encontrada.</p>
          ) : (
            visibleClients.map((client) => {
              const selected = client.id === selectedClientId;
              return (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => {
                    setSelectedClientId(client.id);
                    setOpen(false);
                    setUnitSearch("");
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-xs transition-colors ${
                    selected ? "bg-emerald-500 text-zinc-950 font-bold shadow-sm" : "text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <span className="truncate">{client.name}</span>
                  {selected && <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wider text-zinc-900">Ativa</span>}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function UserProfileButton({ collapsed }: { collapsed: boolean }) {
  const user = getStoredUser();

  const ROLE_LABELS: Record<string, string> = {
    admin: "Admin",
    socio: "Sócio",
    gerente: "Gerente",
  };

  function handleLogout() {
    const token = localStorage.getItem("tp_token");
    void fetch("/api/auth/logout", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }).finally(() => {
      localStorage.removeItem("tp_token");
      localStorage.removeItem("tp_user");
      localStorage.removeItem("tp_selected_client_id");
      window.location.href = "/login";
    });
  }

  return (
    <button
      onClick={handleLogout}
      title="Sair"
      className={`group flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground transition-colors overflow-hidden ${collapsed ? "justify-center px-0" : ""}`}
    >
      <div className="size-7 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
        <User className="size-3.5 text-zinc-200" />
      </div>
      <div
        className="flex-1 min-w-0 overflow-hidden text-left"
        style={{
          maxWidth: collapsed ? 0 : 160,
          opacity: collapsed ? 0 : 1,
          transition: `max-width ${DURATION} ${EASE}, opacity ${DURATION} ${EASE}`,
        }}
      >
        <div className="text-xs font-medium text-foreground truncate">{user?.name ?? "Usuário"}</div>
        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
          <span>{ROLE_LABELS[user?.role ?? ""] ?? user?.role ?? ""}</span>
          <span>·</span>
          <LogOut className="size-2.5" /> Sair
        </div>
      </div>
    </button>
  );
}

function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <div
        className="ambient-glow absolute -top-32 -left-32 size-[600px] rounded-full opacity-[0.07]"
        style={{ background: "radial-gradient(circle, var(--color-primary) 0%, transparent 70%)" }}
      />
      <div
        className="ambient-glow absolute -bottom-32 -right-32 size-[500px] rounded-full opacity-[0.05]"
        style={{ background: "radial-gradient(circle, var(--color-primary) 0%, transparent 70%)", animationDelay: "4s" }}
      />
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [pathname] = useLocation();

  const admin = isAdminUser();
  const nav = admin ? [...NAV_BASE, ...NAV_ADMIN_ONLY] : NAV_BASE;

  const sidebarWidth = collapsed ? 64 : 256;

  const renderSidebar = (isCollapsed: boolean) => (
    <>
      {/* Header */}
      <div className={`relative flex h-[4.5rem] shrink-0 items-center border-b border-white/10 px-4 ${isCollapsed ? "justify-center" : "justify-between"}`}>
        <div className="flex min-w-0 items-center">
          <div
            className="flex-1 min-w-0 overflow-hidden"
            style={{
              maxWidth: isCollapsed ? 0 : 180,
              opacity: isCollapsed ? 0 : 1,
              transition: `max-width ${DURATION} ${EASE}, opacity ${DURATION} ${EASE}`,
            }}
          >
            <div className="font-display text-sm font-semibold tracking-[0.16em] whitespace-nowrap text-white">TRÁFEGO<span className="text-zinc-400"> PRO</span></div>
            <div className="mt-0.5 text-[8px] font-medium uppercase tracking-[0.24em] text-zinc-500">Central de gestão</div>
          </div>
        </div>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden size-7 shrink-0 items-center justify-center rounded-lg border border-white/10 text-zinc-400 transition-colors hover:border-zinc-500 hover:bg-white/[0.07] hover:text-white md:flex"
          title={isCollapsed ? "Expandir" : "Recolher"}
        >
          {isCollapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
        </button>
      </div>

      {/* Client selector */}
      {!isCollapsed && (
        <div className="space-y-1.5 border-b border-white/10 px-3 pb-4 pt-3">
          <div className="px-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">Contexto de trabalho</div>
          <ClientSelector collapsed={false} />
        </div>
      )}

      {/* Nav */}
      <nav className={`flex-1 space-y-1 ${isCollapsed ? "px-2 pt-4" : "px-3 pt-4"}`}>
        {nav.map((item) => {
          const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              href={item.to}
              title={isCollapsed ? item.label : undefined}
              onClick={() => setMobileSidebarOpen(false)}
              className={`group flex items-center gap-3 overflow-hidden rounded-xl text-sm transition-all duration-200 ${
                isCollapsed ? "size-10 justify-center px-0 py-0" : "px-3 py-2.5"
              } ${
                active
                  ? "bg-white/10 text-white shadow-[inset_3px_0_0_#e4e4e7]"
                  : "text-muted-foreground hover:bg-white/[0.045] hover:text-foreground"
              }`}
            >
              <Icon className={`size-4 shrink-0 transition-colors ${active ? "text-white" : "group-hover:text-zinc-200"}`} />
              <span
                className="whitespace-nowrap overflow-hidden"
                style={{
                  maxWidth: isCollapsed ? 0 : 160,
                  opacity: isCollapsed ? 0 : 1,
                  transition: `max-width ${DURATION} ${EASE}, opacity ${DURATION} ${EASE}`,
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="mt-auto border-t border-white/10 p-3">
        <UserProfileButton collapsed={isCollapsed} />
      </div>
    </>
  );

  return (
    <div className="dashboard-dark relative min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      <AmbientBackground />

      {/* Mobile Top App Bar */}
      <header
        className="fixed top-0 inset-x-0 z-50 flex items-center justify-between border-b border-white/10 bg-zinc-950/90 px-3.5 backdrop-blur-xl md:hidden"
        style={{
          height: "calc(3.5rem + env(safe-area-inset-top, 0px))",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="flex items-center gap-1.5 focus:outline-none">
            <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500 font-display text-[11px] font-black text-zinc-950 shadow-sm shadow-emerald-500/30">TP</span>
            <span className="font-display text-xs font-bold tracking-wider text-white">TRÁFEGO<span className="text-zinc-400"> PRO</span></span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <ClientSelector variant="compact" collapsed={false} />
          <button
            type="button"
            onClick={() => setMobileSidebarOpen((o) => !o)}
            aria-label={mobileSidebarOpen ? "Fechar menu" : "Abrir menu"}
            className="inline-flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-200 shadow-sm backdrop-blur hover:bg-white/10 active:scale-95 transition-all"
          >
            {mobileSidebarOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </header>

      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <button
          type="button"
          aria-label="Fechar menu lateral"
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-[60] bg-background/70 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Desktop sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden h-screen shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[linear-gradient(180deg,#111111_0%,#090909_52%,#030303_100%)] shadow-[18px_0_50px_rgba(0,0,0,0.28)] backdrop-blur-xl md:flex"
        style={{
          width: sidebarWidth,
          transition: `width ${DURATION} ${EASE}`,
        }}
      >
        {renderSidebar(collapsed)}
      </aside>

      {/* Mobile sidebar drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-[70] flex h-screen w-72 shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-[linear-gradient(180deg,#111111_0%,#090909_52%,#030303_100%)] shadow-2xl backdrop-blur-xl transition-transform duration-300 md:hidden ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ transitionTimingFunction: EASE }}
      >
        {renderSidebar(false)}
      </aside>

      {/* Main content */}
      <main
        className="relative z-10 min-w-0 overflow-x-hidden md:ml-[var(--dashboard-sidebar-width)] md:!pt-0 md:!pb-0"
        style={{
          "--dashboard-sidebar-width": `${sidebarWidth}px`,
          transition: `margin-left ${DURATION} ${EASE}`,
          paddingTop: "calc(3.5rem + env(safe-area-inset-top, 0px))",
          paddingBottom: "calc(5rem + env(safe-area-inset-bottom, 0px))",
        } as CSSProperties}
      >
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar (Apenas Dashboard e Anúncios) */}
      <nav
        aria-label="Navegação móvel principal"
        className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-center gap-6 border-t border-white/10 bg-zinc-950/90 px-6 backdrop-blur-2xl md:hidden"
        style={{
          height: "calc(4rem + env(safe-area-inset-bottom, 0px))",
          paddingBottom: "calc(0.25rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <Link
          href="/dashboard"
          onClick={() => setMobileSidebarOpen(false)}
          className={`flex flex-1 max-w-[160px] flex-col items-center justify-center gap-1 py-1.5 px-4 rounded-2xl transition-all ${
            pathname === "/dashboard" ? "text-emerald-400 font-bold bg-emerald-500/10 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <LayoutDashboard className="size-5" />
          <span className="text-[11px] font-medium tracking-tight">Dashboard</span>
        </Link>

        <Link
          href="/dashboard/anuncios"
          onClick={() => setMobileSidebarOpen(false)}
          className={`flex flex-1 max-w-[160px] flex-col items-center justify-center gap-1 py-1.5 px-4 rounded-2xl transition-all ${
            pathname.startsWith("/dashboard/anuncios") ? "text-emerald-400 font-bold bg-emerald-500/10 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Tag className="size-5" />
          <span className="text-[11px] font-medium tracking-tight">Anúncios</span>
        </Link>
      </nav>
    </div>
  );
}
