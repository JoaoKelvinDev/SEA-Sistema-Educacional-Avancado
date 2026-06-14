import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardAdmin from '@/components/admin/DashboardAdmin';
import DashboardProfessor from '@/components/professor/DashboardProfessor';
import DashboardAluno from '@/components/aluno/DashboardAluno';

const Dashboard = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  switch (user.role) {
    case 'admin':
      return <DashboardAdmin />;
    case 'professor':
      return <DashboardProfessor />;
    case 'aluno':
      return <DashboardAluno />;
    default:
      return <div>Perfil não reconhecido</div>;
  }
};

export default Dashboard;
