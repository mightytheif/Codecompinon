import { Route, Switch } from "wouter";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

// Import all pages directly to avoid any loading issues
import Home from "./pages/home";
import NotFound from "./pages/not-found";
import AuthPage from "./pages/auth";
import MyPropertiesPage from "./pages/my-properties";
import PropertiesPage from "./pages/properties";
import PropertyPage from "./pages/property";
import ProfilePage from "./pages/profile";
import AddPropertyPage from "./pages/properties/add";
import AdminDashboardPage from "./pages/admin/dashboard";
import AdminSettingsPage from "./pages/admin-settings";
import SearchPage from "./pages/search";
import MessagesPage from "./pages/messages";
import LifestylePage from "./pages/lifestyle";

// Loading component for suspense fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-border" />
  </div>
);

export default function Routes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Public routes */}
        <Route path="/" component={Home} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/properties" component={PropertiesPage} />
        <Route path="/property/:id">
          {params => <PropertyPage id={params.id} />}
        </Route>
        <Route path="/search" component={SearchPage} />
        <Route path="/messages" component={MessagesPage} />
        <Route path="/lifestyle" component={LifestylePage} />
        
        {/* Protected routes with direct component references to ensure they load properly */}
        <Route path="/my-properties">
          <MyPropertiesPage />
        </Route>
        
        <Route path="/profile">
          <ProfilePage />
        </Route>
        
        <Route path="/properties/add">
          <AddPropertyPage />
        </Route>
        
        <Route path="/admin">
          <AdminDashboardPage />
        </Route>
        
        <Route path="/admin/settings">
          <AdminSettingsPage />
        </Route>
        
        {/* Catch-all route for 404 */}
        <Route>
          <NotFound />
        </Route>
      </Switch>
    </Suspense>
  );
}