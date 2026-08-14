import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ClientProvider } from "./contexts/ClientContext";
import TrafegoProHome from "./pages/TrafegoProHome";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DashboardPipeline from "./pages/DashboardPipeline";
import DashboardClientes from "./pages/DashboardClientes";
import DashboardPagamentos from "./pages/DashboardPagamentos";
import DashboardMeuTrabalho from "./pages/DashboardMeuTrabalho";
import DashboardAtualizacoes from "./pages/DashboardAtualizacoes";
import DashboardConfiguracoes from "./pages/DashboardConfiguracoes";
import DashboardAnuncios from "./pages/DashboardAnuncios";
import DashboardFeedbackLeads, { StandaloneFeedbackLeads } from "./pages/DashboardFeedbackLeads";
import DashboardFeedbackLeadsList from "./pages/DashboardFeedbackLeadsList";
import DashboardUsuarios from "./pages/DashboardUsuarios";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={TrafegoProHome} />
      <Route path={"/login"} component={Login} />
      <Route path={"/feedback-leads"} component={StandaloneFeedbackLeads} />
      <Route path={"/feedback-leads/"} component={StandaloneFeedbackLeads} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/dashboard/"} component={Dashboard} />
      <Route path={"/dashboard/pipeline"} component={DashboardPipeline} />
      <Route path={"/dashboard/pipeline/"} component={DashboardPipeline} />
      <Route path={"/dashboard/clientes"} component={DashboardClientes} />
      <Route path={"/dashboard/clientes/"} component={DashboardClientes} />
      <Route path={"/dashboard/pagamentos"} component={DashboardPagamentos} />
      <Route path={"/dashboard/pagamentos/"} component={DashboardPagamentos} />
      <Route path={"/dashboard/meu-trabalho"} component={DashboardMeuTrabalho} />
      <Route path={"/dashboard/meu-trabalho/"} component={DashboardMeuTrabalho} />
      <Route path={"/dashboard/atualizacoes"} component={DashboardAtualizacoes} />
      <Route path={"/dashboard/atualizacoes/"} component={DashboardAtualizacoes} />
      <Route path={"/dashboard/configuracoes"} component={DashboardConfiguracoes} />
      <Route path={"/dashboard/configuracoes/"} component={DashboardConfiguracoes} />
      <Route path={"/dashboard/feedback-leads"} component={DashboardFeedbackLeads} />
      <Route path={"/dashboard/feedback-leads/"} component={DashboardFeedbackLeads} />
      <Route path={"/dashboard/feedback-leads/list"} component={DashboardFeedbackLeadsList} />
      <Route path={"/dashboard/feedback-leads/list/"} component={DashboardFeedbackLeadsList} />
      <Route path={"/dashboard/anuncios"} component={DashboardAnuncios} />
      <Route path={"/dashboard/anuncios/"} component={DashboardAnuncios} />
      <Route path={"/dashboard/usuarios"} component={DashboardUsuarios} />
      <Route path={"/dashboard/usuarios/"} component={DashboardUsuarios} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <ClientProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
