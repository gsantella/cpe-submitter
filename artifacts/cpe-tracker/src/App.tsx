import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';
import Layout from '@/components/layout';
import { AuthProvider, useAuth } from '@/context/auth-context';

import Dashboard from '@/pages/dashboard';
import Members from '@/pages/members';
import Events from '@/pages/events';
import NewEvent from '@/pages/event-new';
import EventDetail from '@/pages/event-detail';
import Chapter from '@/pages/chapter';
import Login from '@/pages/login';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  const { authenticated, enabled } = useAuth();

  // Still checking auth status — render nothing to avoid flash
  if (enabled === null) return null;

  // Auth is enabled and user is not logged in — show login page only
  if (!authenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route><Redirect to="/login" /></Route>
      </Switch>
    );
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/members" component={Members} />
        <Route path="/events" component={Events} />
        <Route path="/events/new" component={NewEvent} />
        <Route path="/events/:id" component={EventDetail} />
        <Route path="/chapter" component={Chapter} />
        <Route path="/login"><Redirect to="/" /></Route>
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
