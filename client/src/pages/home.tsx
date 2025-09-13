import React from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { BottomNav } from '@/components/ui/bottom-nav';

const Home: React.FC = () => {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    // Redirect to dashboard for logged in users
    if (user) {
      setLocation('/dashboard');
    }
  }, [user, setLocation]);

  return (
    <div className="min-h-screen bg-background">
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-foreground">Redirecionando...</h1>
      </div>
      <BottomNav />
    </div>
  );
};

export default Home;
