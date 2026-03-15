import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "../layouts/Layout";
import Profile from "../components/ui/Profile";

import inventoryManagerRoutes from "./InventoryManagerRoutes";
import fertilizerManagerRoutes from "./FertilizerManagerRoutes";
import TransportManagerRoutes from "./TransportManagerRoutes";
import FactoryManagerRoutes from "./FactoryManagerRoutes";
import OwnerRoutes from "./OwnerRoutes";
import PaymentManagerRoutes from "./PaymentManagerRoutes";
import supplierRoutes from "./SupplierRoutes";

import Auth from "../components/Auth";
import DevLogin from "../pages/auth/login";
import Landing from "../components/landingNew";
import SignupForm from "../components/SignupForm";
import ForgotPassword from "../components/ui/ForgotPassword";
import TeaDiseaseDetection from "../pages/TeaDiseaseDetection";
import TeaQuality from "../pages/TeaQuality";
import DriverManagement from "../pages/TransportManager/Drivers/DriverManagement";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Show all route groups for all roles */}
        {inventoryManagerRoutes}
        {fertilizerManagerRoutes}
        {OwnerRoutes}
        {FactoryManagerRoutes}
        {TransportManagerRoutes}
        {PaymentManagerRoutes}
        {supplierRoutes}

        <Route path="/login" element={<Auth />} />
        {/* Development-only simple login (bypasses backend) */}
        <Route path="/dev-login" element={<DevLogin />} />
        <Route path="/signup" element={<SignupForm />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/profile"
          element={
            <Layout>
              <Profile />
            </Layout>
          }
        />
        <Route
          path="/owner/tea-disease"
          element={
            <Layout>
              <TeaDiseaseDetection />
            </Layout>
          }
        />
        <Route
          path="/owner/drivers"
          element={
            <Layout>
              <DriverManagement />
            </Layout>
          }
        />
        <Route
          path="/owner/tea-quality"
          element={
            <Layout>
              <TeaQuality />
            </Layout>
          }
        />
        <Route
          path="/supplier/tea-quality"
          element={
            <Layout>
              <TeaQuality />
            </Layout>
          }
        />
        <Route
          path="/factoryManager/tea-quality"
          element={
            <Layout>
              <TeaQuality />
            </Layout>
          }
        />
        <Route path="/landing" element={<Landing />} />
        <Route path="" element={<Navigate to="/landing" />} />
      </Routes>
    </BrowserRouter>
  );
}
