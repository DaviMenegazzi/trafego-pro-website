import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ConfirmProvider } from "@/components/ds";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ClientProvider } from "./contexts/ClientContext";
import TrafegoProHome from "./pages/TrafegoProHome";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { AdminRoute } from "./components/AdminRoute";

// Home, login e cadastro vão no pacote inicial (são a porta de entrada).
// As demais telas carregam sob demanda: quem abre a home não baixa o
// Financeiro, os gráficos da Dashboard nem o gerador de planilhas.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function page(load: () => Promise<{ default: React.ComponentType<any> }>) {
  const Lazy = lazy(load);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function LazyPage(props: any) {
    return (
      <Suspense fallback={<div className="min-h-dvh bg-[#050505]" aria-busy="true" />}>
        <Lazy {...props} />
      </Suspense>
    );
  };
}

const Dashboard = page(() => import("./pages/Dashboard"));
const DashboardConfiguracoes = page(() => import("./pages/DashboardConfiguracoes"));
const DashboardAnuncios = page(() => import("./pages/DashboardAnuncios"));
const DashboardFeedbackLeads = page(() => import("./pages/DashboardFeedbackLeads"));
const StandaloneFeedbackLeads = page(() => import("./pages/DashboardFeedbackLeads").then((m) => ({ default: m.StandaloneFeedbackLeads })));
const DashboardFeedbackLeadsList = page(() => import("./pages/DashboardFeedbackLeadsList"));
const DashboardUsuarios = page(() => import("./pages/DashboardUsuarios"));
const DashboardExternalAiTokens = page(() => import("./pages/DashboardExternalAiTokens"));
const DashboardFormularios = page(() => import("./pages/DashboardFormularios"));
const AdminMetricsOverview = page(() => import("./pages/AdminMetricsOverview"));
const TalentPublicForm = page(() => import("./pages/TalentPublicForm"));
const TalentBankAdmin = page(() => import("./pages/TalentBankAdmin"));
const EvolutionAdmin = page(() => import("./pages/EvolutionAdmin"));
const SocialPublishingAdmin = page(() => import("./pages/SocialPublishingAdmin"));
const AdminFinanceiro = page(() => import("./pages/admin/financeiro"));

// Vitrine do design system: só em desenvolvimento, fora do bundle de produção.
const DesignSystemPreview = import.meta.env.DEV ? lazy(() => import("./pages/DesignSystemPreview")) : null;

function ExistingSiteRoutes() {
  return (
    <Switch>
      <Route path={"/login"} component={Login} />
      <Route path={"/cadastro"} component={Register} />
      <Route path={"/cadastro/"} component={Register} />
      <Route path={"/signup"} component={Register} />
      <Route path={"/signup/"} component={Register} />
      <Route path={"/feedback-leads"} component={StandaloneFeedbackLeads} />
      <Route path={"/feedback-leads/"} component={StandaloneFeedbackLeads} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/dashboard/"} component={Dashboard} />
      <Route path={"/dashboard/configuracoes"} component={DashboardConfiguracoes} />
      <Route path={"/dashboard/configuracoes/"} component={DashboardConfiguracoes} />
      <Route path={"/dashboard/feedback-leads"} component={DashboardFeedbackLeads} />
      <Route path={"/dashboard/feedback-leads/"} component={DashboardFeedbackLeads} />
      <AdminRoute path={"/dashboard/feedback-leads/list"} component={DashboardFeedbackLeadsList} />
      <AdminRoute path={"/dashboard/feedback-leads/list/"} component={DashboardFeedbackLeadsList} />
      <Route path={"/dashboard/anuncios"} component={DashboardAnuncios} />
      <Route path={"/dashboard/anuncios/"} component={DashboardAnuncios} />
      <AdminRoute path={"/dashboard/usuarios"} component={DashboardUsuarios} />
      <AdminRoute path={"/dashboard/usuarios/"} component={DashboardUsuarios} />
      <AdminRoute path={"/dashboard/integracoes-ia"} component={DashboardExternalAiTokens} />
      <AdminRoute path={"/dashboard/integracoes-ia/"} component={DashboardExternalAiTokens} />
      <Route path={"/dashboard/banco-talentos"} component={TalentBankAdmin} />
      <Route path={"/dashboard/banco-talentos/"} component={TalentBankAdmin} />
      <Route path={"/dashboard/formularios"} component={DashboardFormularios} />
      <Route path={"/dashboard/formularios/"} component={DashboardFormularios} />
      <AdminRoute path={"/admin/metricas"} component={AdminMetricsOverview} />
      <AdminRoute path={"/admin/metricas/"} component={AdminMetricsOverview} />
      <AdminRoute path={"/admin/financeiro"} component={AdminFinanceiro} />
      <AdminRoute path={"/admin/financeiro/"} component={AdminFinanceiro} />
      <AdminRoute path={"/dashboard/financeiro"} component={AdminFinanceiro} />
      <AdminRoute path={"/dashboard/financeiro/"} component={AdminFinanceiro} />
      <AdminRoute path={"/dashboard/metricas"} component={AdminMetricsOverview} />
      <AdminRoute path={"/dashboard/metricas/"} component={AdminMetricsOverview} />
      {DesignSystemPreview && (
        <Route path={"/dev/ds"}>
          <Suspense fallback={null}><DesignSystemPreview /></Suspense>
        </Route>
      )}
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ExistingSiteWithClientProvider() {
  return <ClientProvider><ExistingSiteRoutes /></ClientProvider>;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider delayDuration={400} skipDelayDuration={300}>
          <ConfirmProvider>
          <Toaster />
          <Switch>
            <Route path={"/"} component={TrafegoProHome} />
            <Route path={"/pixel"} component={EvolutionAdmin} />
            <Route path={"/pixel/"} component={EvolutionAdmin} />
            <Route path={"/evolution"} component={EvolutionAdmin} />
            <Route path={"/evolution/"} component={EvolutionAdmin} />
            <Route path={"/publicacoes"} component={SocialPublishingAdmin} />
            <Route path={"/publicacoes/"} component={SocialPublishingAdmin} />
            <Route path={"/trabalhe-conosco/:slug"} component={TalentPublicForm} />
            <Route component={ExistingSiteWithClientProvider} />
          </Switch>
          </ConfirmProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
