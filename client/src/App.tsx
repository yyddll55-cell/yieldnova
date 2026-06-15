import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Dashboard from "@/pages/Dashboard";
import Deposit from "@/pages/Deposit";
import Withdrawal from "@/pages/Withdrawal";
import Organization from "@/pages/Organization";
import Staking from "@/pages/Staking";
import PriceChart from "@/pages/PriceChart";
import P2PTransfer from "@/pages/P2PTransfer";
import Admin from "@/pages/Admin";
import Package from "@/pages/Package";
import Marketing from "@/pages/Marketing";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Marketing} />
      <Route path="/app" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/deposit" component={Deposit} />
      <Route path="/withdrawal" component={Withdrawal} />
      <Route path="/organization" component={Organization} />
      <Route path="/staking" component={Staking} />
      <Route path="/price-chart" component={PriceChart} />
      <Route path="/p2p-transfer" component={P2PTransfer} />
      <Route path="/admin" component={Admin} />
      <Route path="/package" component={Package} />
      <Route path="/marketing" component={Marketing} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
