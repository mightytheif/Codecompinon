import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { FavoritesProvider } from "@/hooks/use-favorites";
import { PropertyFeedbackProvider } from "@/hooks/use-property-feedback";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Search from "@/pages/search";
import Lifestyle from "@/pages/lifestyle";
import Property from "@/pages/property";
import AuthPage from "@/pages/auth";
import ProfilePage from "@/pages/profile";
import FavoritesPage from "@/pages/favorites";
import { ProtectedRoute } from "@/lib/protected-route";
import { ProtectedAdminRoute } from "@/lib/protected-admin-route";
import { ProtectedLandlordRoute } from "@/lib/protected-landlord-route";
import AdminDashboard from "@/pages/admin/dashboard";
import Messages from "@/pages/messages";
import AddProperty from "@/pages/properties/add";
import EditProperty from "@/pages/properties/edit";
import AdminApproveProperties from "@/pages/admin/approve-properties";
import AdminReports from "@/pages/admin/reports";
import CheckAdminStatus from "@/pages/admin/check-admin-status";
import MyProperties from "@/pages/my-properties";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FavoritesProvider>
          <PropertyFeedbackProvider>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-grow">
                <Switch>
                  <Route path="/auth" component={AuthPage} />
                  <ProtectedRoute path="/" component={Home} />
                  <ProtectedRoute path="/search" component={Search} />
                  <ProtectedRoute path="/lifestyle" component={Lifestyle} />
                  <ProtectedRoute path="/property/:id" component={Property} />
                  <ProtectedRoute path="/profile" component={ProfilePage} />
                  <ProtectedRoute path="/favorites" component={FavoritesPage} />
                  <ProtectedRoute path="/messages" component={Messages} />
                  <ProtectedLandlordRoute path="/properties/add" component={AddProperty} />
                  <ProtectedLandlordRoute path="/properties/edit/:id" component={EditProperty} />
                  <ProtectedLandlordRoute path="/my-properties" component={MyProperties} />
                  <ProtectedAdminRoute path="/admin/dashboard" component={AdminDashboard} />
                  <ProtectedAdminRoute path="/admin/approve-properties" component={AdminApproveProperties} />
                  <ProtectedAdminRoute path="/admin/reports" component={AdminReports} />
                  <ProtectedAdminRoute path="/admin/check-admin-status" component={CheckAdminStatus} />
                  <Route component={NotFound} />
                </Switch>
              </main>
              <Footer />
              <Toaster />
            </div>
          </PropertyFeedbackProvider>
        </FavoritesProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;