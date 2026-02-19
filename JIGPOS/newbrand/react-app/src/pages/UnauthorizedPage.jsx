import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const { getRedirectPath, isAuthenticated } = useAuth();

  return (
    <div className="flex items-center justify-center min-h-screen bg-jig-slate">
      <div className="text-center max-w-md px-6">
        <h1 className="font-heading text-6xl text-jig-red uppercase mb-4">403</h1>
        <h2 className="font-heading text-2xl text-white uppercase mb-2">Access Denied</h2>
        <p className="text-sm text-gray-500 mb-8">
          You don't have permission to access this page. Contact your administrator if you believe this is an error.
        </p>
        <Button
          variant="secondary"
          onClick={() => navigate(isAuthenticated ? getRedirectPath() : '/login', { replace: true })}
        >
          {isAuthenticated ? 'Go to Dashboard' : 'Sign In'}
        </Button>
      </div>
    </div>
  );
}
