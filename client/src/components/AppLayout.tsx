import { useState, useMemo, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  GitBranch,
  Users2,
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
  ShieldCheck,
} from "lucide-react";
import { useClientContext } from "@/contexts/ClientContext";

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
  const user = getStoredUser();
  return (
    user.role === "admin" ||
    (Array.isArray(user.allowedClientIds) && user.allowedClientIds.includes("*"))
  );
}

// ─── Nav items ──────────────────────────────────────────────────────────────
const NAV_BASE = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/dashboard/pipeline", label: "Pipeline", icon: GitBranch },
  { to: "/dashboard/clientes", label: "Clientes", icon: Users2 },
  { to: "/dashboard/pagamentos", label: "Pagamentos", icon: CreditCard },
  { to: "/dashboard/meu-trabalho", label: "Meu Trabalho", icon: ClipboardList },
  { to: "/dashboard/atualizacoes", label: "Atualizações", icon: Newspaper },
  { to: "/dashboard/feedback-leads", label: "Feedback de Leads", icon: MessageSquare },
  { to: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
];

const NAV_ADMIN_ONLY = [
  { to: "/dashboard/usuarios", label: "Usuários", icon: ShieldCheck },
];

function ClientSelector({ collapsed }: { collapsed: boolean }) {
  const { clients, selectedClientId, setSelectedClientId } = useClientContext();
  const user = getStoredUser();

  // Filtra clients pelas permissões do usuário
  const filteredClients = useMemo(() => {
    if (!user.allowedClientIds || user.allowedClientIds.includes("*")) {
      return clients;
    }
    return clients.filter((c) => user.allowedClientIds!.includes(String(c.id)));
  }, [clients, user.allowedClientIds]);

  if (filteredClients.length === 0) return null;

  // Se só tem 1 unidade, não mostra selector — auto-seleciona
  if (filteredClients.length === 1) {
    // Auto-seleciona se não está selecionado
    if (selectedClientId !== filteredClients[0].id) {
      setTimeout(() => setSelectedClientId(filteredClients[0].id), 0);
    }
    if (collapsed) return null;
    return (
      <div className="px-1 py-2 text-xs text-muted-foreground truncate">
        {filteredClients[0].name}
      </div>
    );
  }

  return (
    <div className="relative">
      {collapsed ? (
        <button
          title="Selecionar cliente"
          className="w-full flex items-center justify-center py-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors"
        >
          <Users2 className="size-4 text-muted-foreground" />
        </button>
      ) : (
        <select
          value={selectedClientId ?? ""}
          onChange={(e) => setSelectedClientId(e.target.value || null)}
          className="w-full text-xs rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {/* Só admins podem ver "Todos os clientes" */}
          {isAdminUser() && <option value="">Todos os clientes</option>}
          {filteredClients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
    </div>
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
    localStorage.removeItem("tp_token");
    localStorage.removeItem("tp_user");
    window.location.href = "/login";
  }

  return (
    <button
      onClick={handleLogout}
      title="Sair"
      className={`group flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground transition-colors overflow-hidden ${collapsed ? "justify-center px-0" : ""}`}
    >
      <div className="size-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
        <User className="size-3.5 text-primary" />
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
      <div className={`flex items-center h-14 shrink-0 border-b border-sidebar-border px-3 ${isCollapsed ? "justify-center" : "justify-between"}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <LayoutDashboard className="size-4 text-primary-foreground" />
          </div>
          <div
            className="flex-1 min-w-0 overflow-hidden"
            style={{
              maxWidth: isCollapsed ? 0 : 180,
              opacity: isCollapsed ? 0 : 1,
              transition: `max-width ${DURATION} ${EASE}, opacity ${DURATION} ${EASE}`,
            }}
          >
            <div className="font-display text-sm font-semibold tracking-[0.14em] whitespace-nowrap">TRÁFEGO<span className="text-muted-foreground"> PRO</span></div>
          </div>
        </div>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden md:flex size-6 items-center justify-center rounded-md hover:bg-sidebar-accent/50 text-muted-foreground transition-colors shrink-0"
          title={isCollapsed ? "Expandir" : "Recolher"}
        >
          {isCollapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
        </button>
      </div>

      {/* Client selector */}
      <div className="pb-3 space-y-1.5 px-3 pt-3">
        <div
          className="overflow-hidden"
          style={{
            maxHeight: isCollapsed ? 0 : 20,
            opacity: isCollapsed ? 0 : 1,
            transition: `max-height ${DURATION} ${EASE}, opacity ${DURATION} ${EASE}`,
          }}
        >
          <div className="px-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">Cliente</div>
        </div>
        <div className={isCollapsed ? "" : "-mx-3"}>
          <ClientSelector collapsed={isCollapsed} />
        </div>
      </div>

      {/* Nav */}
      <nav className="space-y-0.5 px-2 flex-1">
        {nav.map((item) => {
          const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              href={item.to}
              title={isCollapsed ? item.label : undefined}
              onClick={() => setMobileSidebarOpen(false)}
              className={`group flex items-center gap-3 rounded-lg text-sm transition-colors overflow-hidden ${
                isCollapsed ? "justify-center px-0 py-2.5" : "px-3 py-2"
              } ${
                active
                  ? "bg-sidebar-accent text-foreground brand-border-glow"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
              }`}
            >
              <Icon className={`size-4 shrink-0 ${active ? "text-primary" : ""}`} />
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
      <div className="mt-auto p-2 border-t border-sidebar-border">
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
        className="fixed inset-y-0 left-0 z-40 hidden h-screen shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar/90 backdrop-blur-xl md:flex"
        style={{
          width: sidebarWidth,
          transition: `width ${DURATION} ${EASE}`,
        }}
      >
        {renderSidebar(collapsed)}
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-[70] flex h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar/95 shadow-2xl backdrop-blur-xl transition-transform duration-300 md:hidden ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ transitionTimingFunction: EASE }}
      >
        {renderSidebar(false)}
      </aside>

      {/* Main content */}
      <main
        className="relative z-10 min-w-0 pt-16 md:pt-0 overflow-x-hidden"
        style={{
          marginLeft: typeof window !== "undefined" && window.innerWidth >= 768 ? `${sidebarWidth}px` : 0,
          transition: `margin-left ${DURATION} ${EASE}`,
        }}
      >
        {children}
      </main>
    </div>
  );
}
