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
    <div className="min-h-screen bg-[#f8faff]">
      <Header />
      
      <main className="container mx-auto max-w-[1280px] px-4 py-7 animate-fade-in">
        <div className="mb-6">
          <h2 className="mb-1 text-3xl font-bold tracking-tight text-[#122554]">
            Meu Painel
          </h2>
          <p className="text-sm text-[#6d82aa]">
            Bem-vindo de volta, {user?.name}! Continue seus estudos
          </p>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="group flex min-h-[116px] items-center gap-4 rounded-lg border-[#dce8fb] bg-white p-5 shadow-none transition-shadow hover:shadow-md">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
              <Trophy className="h-5 w-5" />
            </div>
            <div><p className="text-xs font-medium text-[#7185a9]">Pontos Totais</p><h3 className="mt-1 text-2xl font-bold text-[#122554]">{pontosTotais}</h3><p className="text-[11px] text-[#8194b6]">Pontuação acumulada</p></div>
            <Star className="ml-auto h-4 w-4 text-amber-400" />
          </Card>

          <Card className="group flex min-h-[116px] items-center gap-4 rounded-lg border-[#dce8fb] bg-white p-5 shadow-none transition-shadow hover:shadow-md">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <BookOpen className="h-5 w-5" />
            </div>
            <div><p className="text-xs font-medium text-[#7185a9]">Atividades Concluídas</p><h3 className="mt-1 text-2xl font-bold text-[#122554]">{atividadesConcluidas}</h3><p className="text-[11px] text-emerald-500">{atividadesDisponiveis.length > 0 ? Math.round((atividadesConcluidas / atividadesDisponiveis.length) * 100) : 0}% do total</p></div>
          </Card>

          <Card className="group flex min-h-[116px] items-center gap-4 rounded-lg border-[#dce8fb] bg-white p-5 shadow-none transition-shadow hover:shadow-md">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Clock className="h-5 w-5" />
            </div>
            <div><p className="text-xs font-medium text-[#7185a9]">Conquistas</p><h3 className="mt-1 text-2xl font-bold text-[#122554]">{user?.badges?.length || 0}</h3><p className="text-[11px] text-[#8194b6]">Badges desbloqueados</p></div>
          </Card>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <Button
            onClick={() => setShowChat(true)}
            className="h-14 rounded-lg bg-[#1655d8] text-sm font-semibold shadow-sm hover:bg-[#1046bc]"
          >
            <MessageSquare className="w-6 h-6 mr-3" />
            Chat de Dúvidas
          </Button>
          
          <Button
            onClick={() => setShowConquistas(true)}
            variant="outline"
            className="h-14 rounded-lg border-[#dce8fb] bg-white text-sm font-semibold text-[#21355e] shadow-none hover:bg-blue-50"
          >
            <Trophy className="w-6 h-6 mr-3" />
            Minhas Conquistas
          </Button>
          
          <Button
            onClick={() => setShowHistorico(true)}
            variant="outline"
            className="h-14 rounded-lg border-[#dce8fb] bg-white text-sm font-semibold text-[#21355e] shadow-none hover:bg-blue-50"
          >
            <BookOpen className="w-6 h-6 mr-3" />
            Histórico
          </Button>
        </div>

        <Card className="rounded-lg border-[#dce8fb] bg-white p-4 shadow-none">
          <div className="mb-4 flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><BookOpen className="h-4 w-4" /></div><div><h3 className="text-sm font-bold text-[#122554]">Atividades Pendentes</h3><p className="text-[11px] text-[#7185a9]">Continue de onde parou e mantenha seu progresso.</p></div></div>
          {atividadesPendentes.length === 0 ? (
            <div className="py-12 text-center">
              <BookOpen className="mx-auto mb-4 h-12 w-12 text-[#9bb0d3]" />
              <p className="text-muted-foreground">
                Nenhuma atividade pendente no momento! 🎉
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {atividadesPendentes.map((ativ) => (
                <div
                  key={ativ.id}
                    className="rounded-lg border border-[#e1eafb] bg-[#f8faff] p-4 transition-colors hover:bg-blue-50/60 animate-scale-in"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="mb-2 text-sm font-bold text-[#21355e]">
                        {ativ.titulo}
                      </h4>
                      <div className="flex flex-wrap gap-2 text-xs text-[#7185a9]">
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">
                          {ativ.materia}
                        </span>
                        <span>{ativ.professorNome}</span>
                        <span>•</span>
                        <span>{ativ.questoes.length} questões</span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs text-[#7185a9]">
                        {ativ.descricao}
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleIniciarAtividade(ativ.id)}
                    className="mt-3 h-9 w-full bg-[#1655d8] text-xs hover:bg-[#1046bc]"
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
