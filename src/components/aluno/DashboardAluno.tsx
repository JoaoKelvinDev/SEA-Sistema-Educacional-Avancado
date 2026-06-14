import { useState } from 'react';
import Header from '@/components/shared/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, MessageSquare, Trophy, Star, Clock } from 'lucide-react';
import ChatDuvidasModal from './ChatDuvidasModal';
import ResolverAtividadeCard from './ResolverAtividadeCard';
import ConquistasModal from './ConquistasModal';
import HistoricoModal from './HistoricoModal';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';

const DashboardAluno = () => {
  const [showChat, setShowChat] = useState(false);
  const [showConquistas, setShowConquistas] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);
  const [atividadeAtual, setAtividadeAtual] = useState<string | null>(null);
  const { user } = useAuth();
  const { getAtividadesByAluno, getRespostasByAluno, atividades } = useData();

  const atividadesDisponiveis = user?.turma ? getAtividadesByAluno(user.turma) : [];
  const respostasAluno = user ? getRespostasByAluno(user.id) : [];
  
  const atividadesPendentes = atividadesDisponiveis.filter(ativ => 
    !respostasAluno.some(resp => resp.atividadeId === ativ.id)
  );

  const pontosTotais = user?.pontos || 0;
  const atividadesConcluidas = respostasAluno.length;

  const handleIniciarAtividade = (atividadeId: string) => {
    setAtividadeAtual(atividadeId);
  };

  const handleFecharAtividade = () => {
    setAtividadeAtual(null);
  };

  if (atividadeAtual) {
    const atividade = atividades.find(a => a.id === atividadeAtual);
    if (atividade && user) {
      return (
        <ResolverAtividadeCard
          atividade={atividade}
          alunoId={user.id}
          onClose={handleFecharAtividade}
        />
      );
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 animate-fade-in">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Meu Painel
          </h2>
          <p className="text-muted-foreground">
            Bem-vindo de volta, {user?.name}! Continue seus estudos
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
            <div className="flex items-center justify-between mb-4">
              <Trophy className="w-8 h-8" />
              <Star className="w-6 h-6" />
            </div>
            <h3 className="text-3xl font-bold mb-1">{pontosTotais}</h3>
            <p className="text-sm opacity-90">Pontos Totais</p>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-secondary to-green-500 text-white">
            <div className="flex items-center justify-between mb-4">
              <BookOpen className="w-8 h-8" />
              <span className="text-sm font-semibold">
                {atividadesDisponiveis.length > 0 
                  ? Math.round((atividadesConcluidas / atividadesDisponiveis.length) * 100)
                  : 0}%
              </span>
            </div>
            <h3 className="text-3xl font-bold mb-1">{atividadesConcluidas}</h3>
            <p className="text-sm opacity-90">Atividades Concluídas</p>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-accent to-orange-600 text-white">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-8 h-8" />
              <span className="text-sm font-semibold">{user?.badges?.length || 0}</span>
            </div>
            <h3 className="text-3xl font-bold mb-1">🔥</h3>
            <p className="text-sm opacity-90">Conquistas</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Button
            onClick={() => setShowChat(true)}
            className="h-20 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 text-lg font-semibold"
          >
            <MessageSquare className="w-6 h-6 mr-3" />
            Chat de Dúvidas
          </Button>
          
          <Button
            onClick={() => setShowConquistas(true)}
            variant="outline"
            className="h-20 text-lg font-semibold border-2"
          >
            <Trophy className="w-6 h-6 mr-3" />
            Minhas Conquistas
          </Button>
          
          <Button
            onClick={() => setShowHistorico(true)}
            variant="outline"
            className="h-20 text-lg font-semibold border-2"
          >
            <BookOpen className="w-6 h-6 mr-3" />
            Histórico
          </Button>
        </div>

        <Card className="p-6">
          <h3 className="text-2xl font-bold mb-6">Atividades Pendentes</h3>
          {atividadesPendentes.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Nenhuma atividade pendente no momento! 🎉
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {atividadesPendentes.map((ativ) => (
                <div
                  key={ativ.id}
                  className="p-6 rounded-lg bg-muted/50 hover:bg-muted transition-colors animate-scale-in"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-foreground mb-2">
                        {ativ.titulo}
                      </h4>
                      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full">
                          {ativ.materia}
                        </span>
                        <span>{ativ.professorNome}</span>
                        <span>•</span>
                        <span>{ativ.questoes.length} questões</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {ativ.descricao}
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleIniciarAtividade(ativ.id)}
                    className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Iniciar Atividade
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>

      <ChatDuvidasModal
        isOpen={showChat}
        onClose={() => setShowChat(false)}
      />

      <ConquistasModal
        isOpen={showConquistas}
        onClose={() => setShowConquistas(false)}
      />

      <HistoricoModal
        isOpen={showHistorico}
        onClose={() => setShowHistorico(false)}
      />
    </div>
  );
};

export default DashboardAluno;
