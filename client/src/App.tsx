import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Index from "./pages/Index";
import Home from "./pages/Home";
import JulioDeCastilhos from "./pages/JulioDeCastilhos";
import TrafegoProHome from "./pages/TrafegoProHome";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DashboardAdvanced from "./pages/DashboardAdvanced";
import Ijui from "./pages/Ijui";


function Router() {
  return (
    <Switch>
      <Route path={"/"} component={TrafegoProHome} />
      <Route path={"/tupancireta"} component={Home} />
      <Route path={"/tupancireta/"} component={Home} />
      <Route path={"/juliodecastilhos"} component={JulioDeCastilhos} />
      <Route path={"/juliodecastilhos/"} component={JulioDeCastilhos} />
      <Route path={"/ijui"} component={Ijui} />
      <Route path={"/ijui/"} component={Ijui} />
      <Route path={"/login"} component={Login} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/dashboard/"} component={Dashboard} />
      <Route path={"/dashboard-advanced"} component={DashboardAdvanced} />
      <Route path={"/dashboard-advanced/"} component={DashboardAdvanced} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
