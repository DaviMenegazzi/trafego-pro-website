import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ClientProvider } from "./contexts/ClientContext";
import TrafegoProHome from "./pages/TrafegoProHome";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import DashboardPipeline from "./pages/DashboardPipeline";
import DashboardPagamentos from "./pages/DashboardPagamentos";
import DashboardMeuTrabalho from "./pages/DashboardMeuTrabalho";
import DashboardAtualizacoes from "./pages/DashboardAtualizacoes";
import DashboardConfiguracoes from "./pages/DashboardConfiguracoes";
import DashboardAnuncios from "./pages/DashboardAnuncios";
import DashboardFeedbackLeads, { StandaloneFeedbackLeads } from "./pages/DashboardFeedbackLeads";
import DashboardFeedbackLeadsList from "./pages/DashboardFeedbackLeadsList";
import DashboardUsuarios from "./pages/DashboardUsuarios";
import DashboardExternalAiTokens from "./pages/DashboardExternalAiTokens";
import AdminMetricsOverview from "./pages/AdminMetricsOverview";
import TalentPublicForm from "./pages/TalentPublicForm";
import TalentBankAdmin from "./pages/TalentBankAdmin";
import EvolutionAdmin from "./pages/EvolutionAdmin";
import SocialPublishingAdmin from "./pages/SocialPublishingAdmin";

import AdminFinanceiro from "./pages/admin/financeiro";

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
      <Route path={"/dashboard/pipeline"} component={DashboardPipeline} />
      <Route path={"/dashboard/pipeline/"} component={DashboardPipeline} />
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
      <Route path={"/dashboard/integracoes-ia"} component={DashboardExternalAiTokens} />
      <Route path={"/dashboard/integracoes-ia/"} component={DashboardExternalAiTokens} />
      <Route path={"/admin/metricas"} component={AdminMetricsOverview} />
      <Route path={"/admin/metricas/"} component={AdminMetricsOverview} />
      <Route path={"/admin/financeiro"} component={AdminFinanceiro} />
      <Route path={"/admin/financeiro/"} component={AdminFinanceiro} />
      <Route path={"/dashboard/financeiro"} component={AdminFinanceiro} />
      <Route path={"/dashboard/financeiro/"} component={AdminFinanceiro} />
      <Route path={"/dashboard/metricas"} component={AdminMetricsOverview} />
      <Route path={"/dashboard/metricas/"} component={AdminMetricsOverview} />
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
        <TooltipProvider>
          <Toaster />
          <Switch>
            <Route path={"/"} component={TrafegoProHome} />
            <Route path={"/evolution"} component={EvolutionAdmin} />
            <Route path={"/evolution/"} component={EvolutionAdmin} />
            <Route path={"/publicacoes"} component={SocialPublishingAdmin} />
            <Route path={"/publicacoes/"} component={SocialPublishingAdmin} />
            <Route path={"/dashboard/banco-talentos"} component={TalentBankAdmin} />
            <Route path={"/dashboard/banco-talentos/"} component={TalentBankAdmin} />
            <Route path={"/trabalhe-conosco/:slug"} component={TalentPublicForm} />
            <Route component={ExistingSiteWithClientProvider} />
          </Switch>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
