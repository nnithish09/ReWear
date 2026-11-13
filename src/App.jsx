import { Route, Routes } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { firebaseInitError } from './firebase/firebaseConfig';
import ProtectedRoute, { PublicRoute } from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Wardrobe from './pages/Wardrobe';
import AddClothing from './pages/AddClothing';
import EditClothing from './pages/EditClothing';
import ClothingDetails from './pages/ClothingDetails';
import NotFound from './pages/NotFound';

function FirebaseErrorScreen({ error }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="card max-w-lg p-8 text-center">
        <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-clay" />
        <h1 className="text-2xl">Firebase is not configured</h1>
        <p className="mt-3 text-sm text-muted">{error.message}</p>
      </div>
    </div>
  );
}

export default function App() {
  if (firebaseInitError) return <FirebaseErrorScreen error={firebaseInitError} />;

  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/wardrobe" element={<Wardrobe />} />
          <Route path="/wardrobe/add" element={<AddClothing />} />
          <Route path="/wardrobe/:id" element={<ClothingDetails />} />
          <Route path="/wardrobe/:id/edit" element={<EditClothing />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
