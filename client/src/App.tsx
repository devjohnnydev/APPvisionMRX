import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Scan from "@/pages/scan";
import ScanResult from "@/pages/scan-result";
import Users from "@/pages/users";
import Profile from "@/pages/profile";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {/* Landing page for unauthenticated users */}
      {(isLoading || !isAuthenticated) && (
        <Route path="/" component={Landing} />
      )}
      
      {/* Protected routes - components handle their own auth redirects */}
      {isAuthenticated && (
        <Route path="/" component={Home} />
      )}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/scan" component={Scan} />
      <Route path="/scan-result" component={ScanResult} />
      <Route path="/users" component={Users} />
      <Route path="/profile" component={Profile} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
