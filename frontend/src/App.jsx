import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Defects from "./pages/Defects";
import NotFound from "./pages/NotFound";
import Projects from "./pages/Projects";
import Reports from "./pages/Reports";
import TestCases from "./pages/TestCases";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/test-cases" element={<TestCases />} />
        <Route path="/defects" element={<Defects />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
