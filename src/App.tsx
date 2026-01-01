import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "@/contexts/AuthContext";
import LoadingScreen from "@/components/LoadingScreen";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import CreateFanlink from "./pages/CreateFanlink";
import CreatePreSave from "./pages/CreatePreSave";
import EditFanlink from "./pages/EditFanlink";
import EditPreSave from "./pages/EditPreSave";
import Login from "./pages/Login";
import FanlinkPage from "./pages/FanlinkPage";
import PreSavePage from "./pages/PreSavePage";
import DemoPage from "./pages/DemoPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <AnimatePresence mode="wait">
            {isLoading && <LoadingScreen key="loading" />}
          </AnimatePresence>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/create" element={<CreateFanlink />} />
              <Route path="/edit/fanlink/:id" element={<EditFanlink />} />
              <Route path="/edit/presave/:id" element={<EditPreSave />} />
              <Route path="/presave/create" element={<CreatePreSave />} />
              <Route path="/login" element={<Login />} />
              <Route path="/demo" element={<DemoPage />} />
              <Route path="/:artist/:song" element={<FanlinkPage />} />
              <Route path="/link/:id" element={<FanlinkPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
