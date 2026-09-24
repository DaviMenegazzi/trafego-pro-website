import { useEffect, useState, useMemo, type CSSProperties, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Settings,
  Menu as MenuIcon,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  MessageSquare,
  Inbox,
  ShieldCheck,
  Link2,
  UsersRound,
  Tag,
  ChevronsUpDown,
  Building2,
  BarChart3,
  DollarSign,
  FileSpreadsheet,
  Check,
  Search,
} from "lucide-react";
import { useClientContext } from "@/contexts/ClientContext";
import { canSeeAdminFeedbacks } from "@/components/adminNavigationPolicy";
import { IconButton, Menu, Popover, PopoverClose, Tooltip } from "@/components/ds";
import { cn } from "@/lib/utils";
import { resolveActiveNav } from "@/lib/navigation";

const DURATION = "200ms";
const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";
const COLLAPSED_KEY = "tp_sidebar_collapsed";

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
type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };

const NAV_BASE: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/dashboard/anuncios", label: "Anúncios", icon: Tag },
  { to: "/dashboard/feedback-leads", label: "Feedback de Leads", icon: MessageSquare },
  { to: "/dashboard/banco-talentos", label: "Banco de Talentos", icon: UsersRound },
  { to: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
];

const NAV_ADMIN_ONLY: NavItem[] = [
  { to: "/admin/metricas", label: "Métricas da Rede", icon: BarChart3 },
  { to: "/admin/financeiro", label: "Financeiro", icon: DollarSign },
  { to: "/dashboard/feedback-leads/list", label: "Feedbacks enviados", icon: Inbox },
  { to: "/dashboard/usuarios", label: "Usuários", icon: ShieldCheck },
  { to: "/dashboard/integracoes-ia", label: "Integrações de IA", icon: Link2 },
  { to: "/dashboard/formularios", label: "Formulários", icon: FileSpreadsheet },
];

// Item exibido para clientes (não-admin) — só quando a unidade já tem ao
// menos 1 endpoint de formulário ativo. Endpoints em si nunca aparecem aqui,
// só os resultados recebidos.
const CLIENT_FORMS_RESULTS_ITEM: NavItem = {
  to: "/dashboard/formularios",
  label: "Formulários",
  icon: FileSpreadsheet,
};

function initials(name?: string) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return ((parts[0][0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

// ─── Seletor de unidade (contexto global) ───────────────────────────────────
function UnitList({ onPick }: { onPick: () => void }) {
  const { clients, selectedClientId, setSelectedClientId } = useClientContext();
  const [unitSearch, setUnitSearch] = useState("");
  const visibleClients = unitSearch.trim()
    ? clients.filter((c) => c.name.toLowerCase().includes(unitSearch.toLowerCase()))
    : clients;

  return (
    <>
      {clients.length > 5 && (
        <div className="border-b border-white/10 p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              autoFocus
              value={unitSearch}
              onChange={(e) => setUnitSearch(e.target.value)}
              placeholder="Buscar unidade"
              aria-label="Buscar unidade"
              className="h-8 w-full rounded-md border border-white/10 bg-zinc-950 pl-8 pr-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-emerald-500/60"
            />
          </div>
        </div>
      )}
      <div className="max-h-72 overflow-y-auto p-1" role="listbox" aria-label="Unidades">
        {visibleClients.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-zinc-500">Nenhuma unidade encontrada.</p>
        ) : (
          visibleClients.map((client) => {
            const selected = client.id === selectedClientId;
            return (
              <PopoverClose asChild key={client.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    setSelectedClientId(client.id);
                    onPick();
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left text-sm outline-none transition-colors focus-visible:bg-white/[0.07]",
                    selected ? "text-white" : "text-zinc-300 hover:bg-white/[0.06] hover:text-white",
                  )}
                >
                  <span className="truncate">{client.name}</span>
                  {selected && <Check className="size-4 shrink-0 text-emerald-400" />}
                </button>
              </PopoverClose>
            );
          })
        )}
      </div>
    </>
  );
}

function ClientSelector({ variant = "sidebar" }: { variant?: "sidebar" | "compact" | "icon" }) {
  const { clients, selectedClientId, setSelectedClientId } = useClientContext();

  useEffect(() => {
    if (clients.length === 0) {
      if (selectedClientId !== null) setSelectedClientId(null);
      return;
    }

    const hasSelectedClient = clients.some((client) => client.id === selectedClientId);
    if (!hasSelectedClient) setSelectedClientId(clients[0].id);
  }, [clients, selectedClientId, setSelectedClientId]);

  if (clients.length === 0) return null;

  const selectedName = clients.find((client) => client.id === selectedClientId)?.name ?? clients[0].name;

  const trigger =
    variant === "icon" ? (
      <button
        type="button"
        aria-label={`Unidade: ${selectedName}`}
        className="flex size-10 items-center justify-center rounded-lg text-emerald-400 outline-none transition-colors hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-emerald-400/60"
      >
        <Building2 className="size-4" />
      </button>
    ) : (
      <button
        type="button"
        aria-label={`Unidade: ${selectedName}. Trocar unidade`}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border border-white/10 text-left text-sm text-zinc-100 outline-none transition-colors hover:border-white/20 hover:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-emerald-400/60",
          variant === "compact" ? "h-9 max-w-[180px] bg-zinc-900/90 px-2.5" : "h-10 w-full bg-white/[0.03] px-3",
        )}
      >
        <Building2 className="size-4 shrink-0 text-emerald-400" />
        <span className="min-w-0 flex-1 truncate font-medium">{selectedName}</span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-zinc-500" />
      </button>
    );

  return (
    <Popover
      trigger={trigger}
      tooltip={variant === "icon" ? selectedName : undefined}
      tooltipSide="right"
      align={variant === "compact" ? "end" : "start"}
      side={variant === "compact" ? "bottom" : "right"}
      className="w-72 p-0"
    >
      <div className="border-b border-white/10 px-3 py-2.5">
        <p className="text-sm font-medium text-white">Unidade</p>
        <p className="text-xs text-zinc-500">Os dados de todas as telas seguem esta unidade.</p>
      </div>
      <UnitList onPick={() => undefined} />
    </Popover>
  );
}

// ─── Menu da conta ──────────────────────────────────────────────────────────
function AccountMenu({ collapsed }: { collapsed: boolean }) {
  const user = getStoredUser();
  const [, setLocation] = useLocation();

  const ROLE_LABELS: Record<string, string> = {
    admin: "Admin",
    socio: "Sócio",
    gerente: "Gerente",
    viewer: "Visualizador",
    client_viewer: "Cliente",
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

  const name = user?.name ?? "Usuário";
  const role = ROLE_LABELS[user?.role ?? ""] ?? user?.role ?? "";

  const trigger = (
    <button
      type="button"
      aria-label={`Conta de ${name}`}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left outline-none transition-colors hover:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-emerald-400/60",
        collapsed && "justify-center px-0",
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-200">
        {initials(name)}
      </span>
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-zinc-100">{name}</span>
            {role && <span className="block truncate text-xs text-zinc-500">{role}</span>}
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-zinc-500" />
        </>
      )}
    </button>
  );

  return (
    <Menu
      side={collapsed ? "right" : "top"}
      align={collapsed ? "end" : "start"}
      className="w-60"
      trigger={trigger}
      items={[
        { type: "label", label: <span className="block truncate text-zinc-300">{user?.email ?? name}</span> },
        { type: "separator" },
        { label: "Configurações", icon: <Settings />, onSelect: () => setLocation("/dashboard/configuracoes") },
        { label: "Sair", icon: <LogOut />, onSelect: handleLogout },
      ]}
    />
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

function NavLink({ item, active, collapsed, onNavigate, dense = false }: { item: NavItem; active: boolean; collapsed: boolean; onNavigate: () => void; dense?: boolean }) {
  const Icon = item.icon;
  const link = (
    <Link
      href={item.to}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 overflow-hidden rounded-lg text-sm outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-emerald-400/60",
        collapsed ? "size-10 justify-center" : cn("px-3", dense ? "h-9" : "h-10"),
        active ? "bg-white/[0.09] text-white" : "text-zinc-400 hover:bg-white/[0.045] hover:text-zinc-100",
      )}
    >
      <Icon className={cn("size-4 shrink-0", active ? "text-white" : "text-zinc-500 group-hover:text-zinc-300")} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
  return collapsed ? <Tooltip content={item.label} side="right">{link}</Tooltip> : link;
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [pathname] = useLocation();

  const admin = isAdminUser();

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      // Preferência de interface; sem armazenamento, só não é lembrada.
    }
  }, [collapsed]);

  // Clientes (não-admin): descobre, sem expor nada sobre as chaves em si, se
  // a unidade já tem ao menos 1 endpoint de formulário ativo — só então o
  // link "Resultados de Formulários" aparece no menu.
  const [clientFormsVisible, setClientFormsVisible] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem("tp_forms_endpoint_visible") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (admin) return;
    const token = localStorage.getItem("tp_token");
    if (!token) return;
    let cancelled = false;
    fetch("/api/forms/keys/exists", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const visible = Boolean(data.hasEndpoint);
        setClientFormsVisible(visible);
        try {
          sessionStorage.setItem("tp_forms_endpoint_visible", visible ? "1" : "0");
        } catch {
          // ignore
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [admin]);

  const visibleNavBase = useMemo(
    () => (!admin && clientFormsVisible ? [...NAV_BASE, CLIENT_FORMS_RESULTS_ITEM] : NAV_BASE),
    [admin, clientFormsVisible],
  );

  const activeTo = resolveActiveNav(pathname, admin ? [...visibleNavBase, ...NAV_ADMIN_ONLY] : visibleNavBase);

  // Fecha a gaveta do celular com Esc.
  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileSidebarOpen]);

  const sidebarWidth = collapsed ? 68 : 248;
  const closeMobile = () => setMobileSidebarOpen(false);

  const renderSidebar = (isCollapsed: boolean, isMobile: boolean) => (
    <>
      {/* Marca */}
      <div className={cn("flex h-16 shrink-0 items-center px-4", isCollapsed ? "justify-center" : "justify-between")}>
        {!isCollapsed && (
          <Link href="/dashboard" onClick={closeMobile} className="rounded-md font-display text-sm font-semibold tracking-[0.14em] whitespace-nowrap text-white outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60">
            TRÁFEGO<span className="text-zinc-500"> PRO</span>
          </Link>
        )}
        {isMobile ? (
          <IconButton label="Fechar menu" icon={<X />} size="sm" onClick={closeMobile} />
        ) : (
          <IconButton
            label={isCollapsed ? "Expandir menu" : "Recolher menu"}
            icon={isCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            size="sm"
            tooltipSide="right"
            onClick={() => setCollapsed((c) => !c)}
          />
        )}
      </div>

      {/* Contexto: unidade */}
      <div className={cn("pb-3", isCollapsed ? "flex justify-center px-2" : "px-3")}>
        <ClientSelector variant={isCollapsed ? "icon" : "sidebar"} />
      </div>

      {/* Navegação */}
      <nav aria-label="Navegação principal" className={cn("flex-1 space-y-0.5 overflow-y-auto pb-4", isCollapsed ? "flex flex-col items-center px-2" : "px-3")}>
        {visibleNavBase.map((item) => (
          <NavLink key={item.to} item={item} active={activeTo === item.to} collapsed={isCollapsed} onNavigate={closeMobile} />
        ))}
        {admin && (
          <div className={cn("pt-4", isCollapsed && "flex flex-col items-center gap-0.5 border-t border-white/[0.06]")} role="group" aria-label="Administração">
            {!isCollapsed && <p className="px-3 pb-1.5 text-xs font-medium text-zinc-500">Administração</p>}
            <div className={cn("space-y-0.5", isCollapsed && "flex flex-col items-center")}>
              {NAV_ADMIN_ONLY.map((item) => (
                <NavLink key={item.to} item={item} active={activeTo === item.to} collapsed={isCollapsed} onNavigate={closeMobile} dense />
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Conta */}
      <div className={cn("mt-auto border-t border-white/[0.06] p-2", isCollapsed && "flex justify-center")}>
        <AccountMenu collapsed={isCollapsed} />
      </div>
    </>
  );

  return (
    <div className="dashboard-dark relative min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      <AmbientBackground />

      {/* Topo no celular */}
      <header
        className="fixed top-0 inset-x-0 z-50 flex items-center justify-between gap-2 border-b border-white/10 bg-zinc-950/90 px-3 backdrop-blur-xl md:hidden"
        style={{
          height: "calc(3.5rem + env(safe-area-inset-top, 0px))",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <Link href="/dashboard" className="rounded-md font-display text-xs font-semibold tracking-[0.14em] text-white outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60">
          TRÁFEGO<span className="text-zinc-500"> PRO</span>
        </Link>
        <div className="flex items-center gap-1.5">
          <ClientSelector variant="compact" />
          <button
            type="button"
            onClick={() => setMobileSidebarOpen((o) => !o)}
            aria-label={mobileSidebarOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileSidebarOpen}
            className="inline-flex size-10 items-center justify-center rounded-lg text-zinc-200 outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-emerald-400/60"
          >
            {mobileSidebarOpen ? <X className="size-5" /> : <MenuIcon className="size-5" />}
          </button>
        </div>
      </header>

      {/* Fundo da gaveta no celular */}
      {mobileSidebarOpen && (
        <button
          type="button"
          aria-label="Fechar menu lateral"
          tabIndex={-1}
          onClick={closeMobile}
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Sidebar no desktop */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden h-screen shrink-0 flex-col overflow-hidden border-r border-white/[0.07] bg-[#0b0b0c] md:flex"
        style={{
          width: sidebarWidth,
          transition: `width ${DURATION} ${EASE}`,
        }}
      >
        {renderSidebar(collapsed, false)}
      </aside>

      {/* Gaveta no celular (entra e sai pela esquerda) */}
      <aside
        aria-hidden={!mobileSidebarOpen}
        inert={!mobileSidebarOpen || undefined}
        className={cn(
          "fixed inset-y-0 left-0 z-[70] flex h-dvh w-72 shrink-0 flex-col border-r border-white/10 bg-[#0b0b0c] shadow-2xl transition-transform duration-300 md:hidden",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
        style={{ transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)" }}
      >
        {renderSidebar(false, true)}
      </aside>

      {/* Conteúdo. Sem z-index próprio: modais e popovers precisam ficar acima da sidebar. */}
      <main
        className="relative min-w-0 overflow-x-hidden md:ml-[var(--dashboard-sidebar-width)] md:!pt-0 md:!pb-0"
        style={{
          "--dashboard-sidebar-width": `${sidebarWidth}px`,
          transition: `margin-left ${DURATION} ${EASE}`,
          paddingTop: "calc(3.5rem + env(safe-area-inset-top, 0px))",
          paddingBottom: "calc(5rem + env(safe-area-inset-bottom, 0px))",
        } as CSSProperties}
      >
        {children}
      </main>

      {/* Barra inferior no celular: as duas telas de uso diário */}
      <nav
        aria-label="Navegação rápida"
        className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-center gap-2 border-t border-white/10 bg-zinc-950/90 px-4 backdrop-blur-2xl md:hidden"
        style={{
          height: "calc(4rem + env(safe-area-inset-bottom, 0px))",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {[
          { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
          { to: "/dashboard/anuncios", label: "Anúncios", icon: Tag },
        ].map((item) => {
          const active = activeTo === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              href={item.to}
              aria-current={active ? "page" : undefined}
              onClick={closeMobile}
              className={cn(
                "flex h-12 max-w-[160px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400/60",
                active ? "bg-white/[0.07] font-medium text-white" : "text-zinc-400 hover:text-zinc-200",
              )}
            >
              <Icon className={cn("size-5", active && "text-emerald-400")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
