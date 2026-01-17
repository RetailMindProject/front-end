import { Route, Routes } from "react-router-dom";
import ForecastingDashboardPage from "./ForecastingDashboardPage";
import ProductForecastDetailPage from "./ProductForecastDetailPage";

export default function Forecasting() {
  return (
    <Routes>
      <Route index element={<ForecastingDashboardPage />} />
      <Route path="products/:productId" element={<ProductForecastDetailPage />} />
    </Routes>
  );
}


