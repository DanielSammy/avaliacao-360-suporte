// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { EvaluationProvider } from "./contexts/EvaluationContext";
import { useAuth } from "./contexts/AuthContext";
import { Login } from "./pages/Login";
import { EvaluateOperators } from "./pages/EvaluateOperators";
import { ConfigurationPanel } from "./components/configuration/ConfigurationPanel";
import Index from "./pages/Index";
import { EvaluationTracking } from "./pages/EvaluationTracking";
import { AppHeader } from "./components/layout/AppHeader";
import RankingPage  from "./pages/Ranking";
import React from 'react'; // Import React for React.ReactNode

const queryClient = new QueryClient();

// ProtectedRoute component with role-based access control
const ProtectedRoute = ({ children, allowedGroups }: { children: React.ReactNode; allowedGroups: number[] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // Or a proper loading spinner
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if the user's group is allowed for this route
  if (!allowedGroups.includes(user.grupo)) {
    // Redirect to their appropriate home page based on group
    if (user.grupo === 4 || user.grupo === 3) {
      return <Navigate to="/evaluate-operators" replace />;
    } else {
      return <Navigate to="/" replace />;
    }
  }

  return (
    <>
      <AppHeader />
      <main className="flex-1 container mx-auto py-6">
        {children}
      </main>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <EvaluationProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
          <Routes>
            <Route
              path="/login"
              element={
                <AuthRedirect>
                  <Login />
                </AuthRedirect>
              }
            />
            {/* Protected route for operators (grupo 4 and 3) */}
            <Route
              path="/evaluate-operators"
              element={
                <ProtectedRoute allowedGroups={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}>
                  <EvaluateOperators />
                </ProtectedRoute>
              }
            />
            {/* Protected route for management (grupo 3) */}
            <Route
              path="/management"
              element={
                <ProtectedRoute allowedGroups={[3]}>
                  <ConfigurationPanel />
                </ProtectedRoute>
              }
            />
            {/* Protected route for index (other grupos) */}
            <Route
              path="/"
              element={
                <ProtectedRoute allowedGroups={[1, 2, 5, 6, 7, 8, 9, 10]}> {/* Example: groups 1,2,5-10 can access index */}
                  <Index />
                </ProtectedRoute>
              }
            />
            {/* Protected route for Evaluation Tracking (accessible by all logged-in users for now) */}
            <Route
              path="/evaluation-tracking"
              element={
                <ProtectedRoute allowedGroups={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}> {/* Example: all groups can access */}
                  <EvaluationTracking />
                </ProtectedRoute>
              }
            />
            {/* Protected route for Ranking Page (accessible by all logged-in users for now) */}
            <Route
              path="/ranking"
              element={
                <ProtectedRoute allowedGroups={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}> {/* Example: all groups can access */}
                  <RankingPage />
                </ProtectedRoute>
              }
            />
            {/* Catch-all for unhandled routes - redirect to login if not authenticated */}
            <Route
              path="*"
              element={<Navigate to="/login" replace />}
            />
          </Routes>
        </HashRouter>
      </TooltipProvider>
    </EvaluationProvider>
  </QueryClientProvider>
);

// Component to handle redirection based on authentication status and user group
const AuthRedirect = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // Or a proper loading spinner
  }

  if (user) {
    // If user is logged in, redirect them based on group
    if (user.grupo === 4 || user.grupo === 3) {
      return <Navigate to="/evaluate-operators" replace />;
    } else {
      return <Navigate to="/" replace />;
    }
  }

  // If user is not logged in, allow access to children (which should be the Login page)
  return children;
};

export default App;