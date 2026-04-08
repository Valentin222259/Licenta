import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ChatBot from "./components/ChatBot";
import AdminRoute from "./components/AdminRoute";
import Index from "./pages/Index";
import Rooms from "./pages/Rooms";
import RoomDetail from "./pages/RoomDetail";
import Booking from "./pages/Booking";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminBookings from "./pages/admin/AdminBookings";
import AdminRooms from "./pages/admin/AdminRooms";
import AdminImages from "./pages/admin/AdminImages";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminSettings from "./pages/admin/AdminSettings";
import About from "./pages/About";
import AdminLogin from "./pages/admin/AdminLogin";
import Account from "./pages/Account";
import BookingSuccess from "./pages/BookingSuccess";
import Availability from "./pages/Availability";
import Reviews from "./pages/Reviews";
import AdminReviews from "./pages/admin/AdminReviews";

const queryClient = new QueryClient();

// Wrapper pentru paginile publice (cu Navbar + Footer + ChatBot)
const PublicPage = ({ children }: { children: React.ReactNode }) => (
  <>
    <Navbar />
    {children}
    <Footer />
    <ChatBot />
  </>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* ─── PAGINI PUBLICE (cu Navbar + Footer) ─────────────────────── */}
          <Route
            path="/"
            element={
              <PublicPage>
                <Index />
              </PublicPage>
            }
          />
          <Route
            path="/rooms"
            element={
              <PublicPage>
                <Rooms />
              </PublicPage>
            }
          />
          <Route
            path="/rooms/:id"
            element={
              <PublicPage>
                <RoomDetail />
              </PublicPage>
            }
          />
          <Route
            path="/booking"
            element={
              <PublicPage>
                <Booking />
              </PublicPage>
            }
          />
          <Route
            path="/contact"
            element={
              <PublicPage>
                <Contact />
              </PublicPage>
            }
          />
          <Route
            path="/about"
            element={
              <PublicPage>
                <About />
              </PublicPage>
            }
          />
          <Route
            path="/login"
            element={
              <PublicPage>
                <Login />
              </PublicPage>
            }
          />
          <Route
            path="/account"
            element={
              <PublicPage>
                <Account />
              </PublicPage>
            }
          />

          <Route
            path="/booking/success"
            element={
              <PublicPage>
                <BookingSuccess />
              </PublicPage>
            }
          />

          <Route
            path="/availability"
            element={
              <PublicPage>
                <Availability />
              </PublicPage>
            }
          />
          <Route
            path="/reviews"
            element={
              <PublicPage>
                <Reviews />
              </PublicPage>
            }
          />

          {/* ─── ADMIN LOGIN (fără Navbar, fără Footer, complet izolat) ───── */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* ─── ADMIN PANEL (fără Navbar, fără Footer — doar sidebar admin) */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="rooms" element={<AdminRooms />} />
            <Route path="images" element={<AdminImages />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="reviews" element={<AdminReviews />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
