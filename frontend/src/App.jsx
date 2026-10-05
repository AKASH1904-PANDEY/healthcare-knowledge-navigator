import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Header } from "./components/Header";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { Ask } from "./pages/Ask";
import { Submit } from "./pages/Submit";
import { Reviews } from "./pages/Reviews";
import { SubmissionDetail } from "./pages/SubmissionDetail";

// Wraps a page in the auth guard and the shared header.
function Page({ roles, children }) {
  return (
    <ProtectedRoute roles={roles}>
      <div className="min-h-screen bg-paper">
        <Header />
        {children}
      </div>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={<Page><Ask /></Page>} />
          <Route
            path="/submit"
            element={<Page roles={["researcher", "admin"]}><Submit /></Page>}
          />
          <Route
            path="/reviews"
            element={<Page roles={["doctor", "admin"]}><Reviews /></Page>}
          />
          <Route path="/submissions/:id" element={<Page><SubmissionDetail /></Page>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
