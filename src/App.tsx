import { useState, useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "@/contexts/AuthContext";
import LoadingScreen from "@/components/LoadingScreen";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import OfflineBanner from "./components/OfflineBanner";

// Lazy-loaded routes for code splitting
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CreateFanlink = lazy(() => import("./pages/CreateFanlink"));
const CreatePreSave = lazy(() => import("./pages/CreatePreSave"));
const EditFanlink = lazy(() => import("./pages/EditFanlink"));
const EditPreSave = lazy(() => import("./pages/EditPreSave"));
const FanlinkAnalytics = lazy(() => import("./pages/FanlinkAnalytics"));
const PreSaveAnalytics = lazy(() => import("./pages/PreSaveAnalytics"));
const FanlinkPage = lazy(() => import("./pages/FanlinkPage"));
const PreSavePage = lazy(() => import("./pages/PreSavePage"));
const PreSaveCampaignRoute = lazy(() => import("./pages/PreSaveCampaignRoute"));
const SpotifyCallback = lazy(() => import("./pages/SpotifyCallback"));
const DemoPage = lazy(() => import("./pages/DemoPage"));
const ArtistBioPage = lazy(() => import("./pages/ArtistBioPage"));
const EditArtistBio = lazy(() => import("./pages/EditArtistBio"));
const ListenPage = lazy(() => import("./pages/ListenPage"));
const CampaignDashboard = lazy(() => import("./pages/CampaignDashboard"));
const CreateCampaign = lazy(() => import("./pages/CreateCampaign"));
const CampaignList = lazy(() => import("./pages/CampaignList"));
const CampaignPage = lazy(() => import("./pages/CampaignPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
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
            <OfflineBanner />
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/create" element={<CreateFanlink />} />
                <Route path="/edit/fanlink/:id" element={<EditFanlink />} />
                <Route path="/edit/presave/:id" element={<EditPreSave />} />
                <Route path="/analytics/fanlink/:id" element={<FanlinkAnalytics />} />
                <Route path="/analytics/presave/:id" element={<PreSaveAnalytics />} />
                <Route path="/presave/create" element={<CreatePreSave />} />
                <Route path="/login" element={<Login />} />
                <Route path="/demo" element={<DemoPage />} />
                <Route path="/presave/:artist/:slug" element={<PreSavePage />} />
                <Route path="/pre/:slug" element={<PreSaveCampaignRoute />} />
                <Route path="/listen/:slug" element={<ListenPage />} />
                <Route path="/artist/campaigns" element={<CampaignDashboard />} />
                <Route path="/artist/campaigns/create" element={<CreateCampaign />} />
                <Route path="/artist/campaigns/list" element={<CampaignList />} />
                <Route path="/artist/campaigns/view/:id" element={<CampaignPage />} />
                <Route path="/callback/spotify" element={<SpotifyCallback />} />
                <Route path="/artist/:username" element={<ArtistBioPage />} />
                <Route path="/artist-bio/edit" element={<EditArtistBio />} />
                <Route path="/:artist/:song" element={<FanlinkPage />} />
                <Route path="/link/:id" element={<FanlinkPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
