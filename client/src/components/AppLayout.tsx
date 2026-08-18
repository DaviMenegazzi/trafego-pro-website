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
  Tag,
  ChevronDown,
  Building2,
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
  { to: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
];

const NAV_ADMIN_ONLY = [
  { to: "/dashboard/feedback-leads/list", label: "Feedbacks enviados", icon: Inbox },
  { to: "/dashboard/usuarios", label: "Usuários", icon: ShieldCheck },
];

function ClientSelector({ collapsed }: { collapsed: boolean }) {
  const { clients, selectedClientId, setSelectedClientId } = useClientContext();
  const user = useMemo(() => getStoredUser(), []);
  const [open, setOpen] = useState(false);

  // Filtra clients pelas permissões do usuário
  const filteredClients = useMemo(() => {
    if (!user.allowedClientIds || user.allowedClientIds.includes("*")) {
      return clients;
    }
    return clients.filter((c) => user.allowedClientIds!.includes(String(c.id)));
  }, [clients, user.allowedClientIds]);

  useEffect(() => {
    if (filteredClients.length === 0) {
      if (selectedClientId !== null) setSelectedClientId(null);
      return;
    }

    const hasSelectedClient = filteredClients.some((client) => client.id === selectedClientId);
    if (!hasSelectedClient) setSelectedClientId(filteredClients[0].id);
  }, [filteredClients, selectedClientId, setSelectedClientId]);

  if (filteredClients.length === 0) return null;

  if (collapsed) return null;

  const selectedName = filteredClients.find((client) => client.id === selectedClientId)?.name ?? filteredClients[0].name;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label="Selecionar unidade" className="inline-flex min-h-10 w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2.5 text-left text-xs text-foreground shadow-sm transition-all duration-200 hover:border-zinc-500 hover:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-zinc-400">
          <Building2 className="size-4 shrink-0 text-zinc-300" />
          <span className="min-w-0 flex-1 truncate font-medium">{selectedName}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="right" sideOffset={10} className="w-[min(22rem,calc(100vw-2rem))] rounded-2xl border-border bg-[color:var(--color-surface)] p-0 text-foreground shadow-2xl">
        <div className="border-b border-border px-4 py-4"><p className="font-display text-base font-semibold">Unidades disponíveis</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Selecione a unidade para atualizar toda a dashboard.</p></div>
        <div className="max-h-64 overflow-y-auto p-2">
          {filteredClients.map((client) => {
            const selected = client.id === selectedClientId;
            return <button key={client.id} type="button" onClick={() => { setSelectedClientId(client.id); setOpen(false); }} className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors ${selected ? "bg-zinc-200 text-zinc-950 shadow-sm" : "text-foreground hover:bg-white/[0.06]"}`}><span className="truncate font-medium">{client.name}</span>{selected && <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-700">Selecionada</span>}</button>;
          })}
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
    <div className="dashboard-dark relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      <AmbientBackground />

      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setMobileSidebarOpen((o) => !o)}
        aria-label={mobileSidebarOpen ? "Fechar menu" : "Abrir menu"}
        className="fixed left-4 top-4 z-[80] md:hidden inline-flex size-10 items-center justify-center rounded-xl border border-border bg-card/90 text-foreground shadow-lg backdrop-blur hover:bg-card transition-colors"
      >
        {mobileSidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

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

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-[70] flex h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-[linear-gradient(180deg,#111111_0%,#090909_52%,#030303_100%)] shadow-2xl backdrop-blur-xl transition-transform duration-300 md:hidden ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ transitionTimingFunction: EASE }}
      >
        {renderSidebar(false)}
      </aside>

      {/* Main content */}
      <main
        className="relative z-10 min-w-0 overflow-x-hidden pt-16 md:ml-[var(--dashboard-sidebar-width)] md:pt-0"
        style={{
          "--dashboard-sidebar-width": `${sidebarWidth}px`,
          transition: `margin-left ${DURATION} ${EASE}`,
        } as CSSProperties}
      >
        {children}
      </main>
    </div>
  );
}
