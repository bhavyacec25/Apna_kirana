import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Login from "./pages/Login";
import Home from "./pages/customer/Home";
import Shop from "./pages/customer/Shop";
import Cart from "./pages/customer/Cart";
import Checkout from "./pages/customer/Checkout";
import Orders from "./pages/customer/Orders";
import OrderTracking from "./pages/customer/OrderTracking";
import Wishlist from "./pages/customer/Wishlist";
import Dashboard from "./pages/shopkeeper/Dashboard";
import ShopkeeperOrders from "./pages/shopkeeper/Orders";
import ShopkeeperProducts from "./pages/shopkeeper/Products";
import LegalRegistration from "./pages/shopkeeper/LegalRegistration";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminShops from "./pages/admin/AdminShops";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminLogin from "./pages/admin/AdminLogin";
import RiderPortal from "./pages/RiderPortal";

function homeForRole(role) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "shopkeeper") return "/shopkeeper/dashboard";
  return "/customer";
}

function RequireRole({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to={role === "admin" ? "/admin/login" : "/login"} replace />;
  if (user.role !== role) return <Navigate to={homeForRole(user.role)} replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <Navigate
              to={
                user.role === "admin"
                  ? "/admin/dashboard"
                  : user.role === "shopkeeper"
                  ? "/shopkeeper/dashboard"
                  : "/customer"
              }
              replace
            />
          ) : (
            <Login />
          )
        }
      />

      {/* Dedicated Executive Admin Portal Login */}
      <Route
        path="/admin/login"
        element={
          user && user.role === "admin" ? (
            <Navigate to="/admin/dashboard" replace />
          ) : (
            <AdminLogin />
          )
        }
      />

      {/* Customer routes */}
      <Route path="/customer" element={<RequireRole role="customer"><Home /></RequireRole>} />
      <Route path="/customer/shop/:shopId" element={<RequireRole role="customer"><Shop /></RequireRole>} />
      <Route path="/customer/cart" element={<RequireRole role="customer"><Cart /></RequireRole>} />
      <Route path="/customer/checkout" element={<RequireRole role="customer"><Checkout /></RequireRole>} />
      <Route path="/customer/orders" element={<RequireRole role="customer"><Orders /></RequireRole>} />
      <Route path="/customer/order-tracking" element={<RequireRole role="customer"><OrderTracking /></RequireRole>} />
      <Route path="/customer/wishlist" element={<RequireRole role="customer"><Wishlist /></RequireRole>} />

      {/* Shopkeeper routes */}
      <Route path="/shopkeeper/dashboard" element={<RequireRole role="shopkeeper"><Dashboard /></RequireRole>} />
      <Route path="/shopkeeper/orders" element={<RequireRole role="shopkeeper"><ShopkeeperOrders /></RequireRole>} />
      <Route path="/shopkeeper/products" element={<RequireRole role="shopkeeper"><ShopkeeperProducts /></RequireRole>} />
      <Route path="/shopkeeper/legal" element={<RequireRole role="shopkeeper"><LegalRegistration /></RequireRole>} />

      {/* Admin routes */}
      <Route path="/admin/dashboard" element={<RequireRole role="admin"><AdminDashboard /></RequireRole>} />
      <Route path="/admin/shops" element={<RequireRole role="admin"><AdminShops /></RequireRole>} />
      <Route path="/admin/orders" element={<RequireRole role="admin"><AdminOrders /></RequireRole>} />
      <Route path="/admin/users" element={<RequireRole role="admin"><AdminUsers /></RequireRole>} />

      {/* Delivery Partner Live GPS Tracking Portal (Blinkit / Zomato style) */}
      <Route path="/rider/:orderId" element={<RiderPortal />} />
      <Route path="/rider" element={<RiderPortal />} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
