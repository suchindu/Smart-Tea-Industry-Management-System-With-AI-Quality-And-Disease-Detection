import { Route } from "react-router-dom";
import Layout from "../layouts/Layout";
import Dashboard from "../pages/supplier/Dashboard";

const supplierRoutes = [
  <Route
    key="supplier-dashboard"
    path="/supplier/dashboard"
    element={
      <Layout>
        <Dashboard />
      </Layout>
    }
  />
];

export default supplierRoutes;
