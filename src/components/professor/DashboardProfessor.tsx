import { useState } from 'react';
import Header from '@/components/shared/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  GraduationCap,
  Mic,
  MoreVertical,
  Target,
  Users,
} from 'lucide-react';
import CriarAtividadeModal from './CriarAtividadeModal';
import MinhasAtividadesModal from './MinhasAtividadesModal';
import DesempenhoModal from './DesempenhoModal';
import DesempenhoAlunosModal from '@/components/shared/DesempenhoAlunosModal';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';

const DashboardProfessor = () => {
  const [showCriarAtividade, setShowCriarAtividade] = useState(false);
  const [showMinhasAtividades, setShowMinhasAtividades] = useState(false);
  const [showDesempenho, setShowDesempenho] = useState(false);
  const [showDesempenhoAlunos, setShowDesempenhoAlunos] = useState(false);
  const [turmaInicialRelatorio, setTurmaInicialRelatorio] = useState<string | null>(null);
  const { user } = useAuth();
  const { getAtividadesByProfessor, getRespostasByAtividade, alunos } = useData();

  const atividadesProfessor = user ? getAtividadesByProfessor(user.id) : [];
  const atividadesPublicadas = atividadesProfessor.filter((atividade) => atividade.publicada);
  const turmas = [...new Set(atividadesProfessor.flatMap((atividade) => atividade.turmas))];
  const alunosProfessor = alunos.filter((aluno) => aluno.turma && turmas.includes(aluno.turma));
  const totalRespostas = atividadesPublicadas.reduce((acc, ativ) => 
    acc + getRespostasByAtividade(ativ.id).length, 0
  );
  const totalPontos = atividadesPublicadas.reduce((total, atividade) => {
    const respostas = getRespostasByAtividade(atividade.id);
    return total + respostas.reduce((sum, resposta) => sum + (resposta.pontuacao || 0), 0);
  }, 0);
  const totalPontosPossiveis = atividadesPublicadas.reduce((total, atividade) => {
    const pontosAtividade = atividade.questoes.reduce((sum, questao) => sum + questao.pontos, 0);
    return total + getRespostasByAtividade(atividade.id).length * pontosAtividade;
  }, 0);
  const taxaDesempenho = totalPontosPossiveis > 0
    ? Math.round((totalPontos / totalPontosPossiveis) * 100)
    : 0;
  const respostasEsperadas = atividadesPublicadas.reduce((total, atividade) => {
    const alunosDaTurma = alunosProfessor.filter((aluno) =>
      aluno.turma && atividade.turmas.includes(aluno.turma),
    ).length;
    return total + alunosDaTurma;
  }, 0);
  const taxaConclusao = respostasEsperadas > 0
    ? Math.min(100, Math.round((totalRespostas / respostasEsperadas) * 100))
    : 0;
  const desempenhoPorMateria = atividadesPublicadas.reduce<Record<string, { pontos: number; possiveis: number }>>((acc, atividade) => {
    const respostas = getRespostasByAtividade(atividade.id);
    const pontosPossiveis = atividade.questoes.reduce((sum, questao) => sum + questao.pontos, 0);
    const materia = acc[atividade.materia] || { pontos: 0, possiveis: 0 };
    materia.pontos += respostas.reduce((sum, resposta) => sum + (resposta.pontuacao || 0), 0);
    materia.possiveis += respostas.length * pontosPossiveis;
    acc[atividade.materia] = materia;
    return acc;
  }, {});
  const materias = Object.entries(desempenhoPorMateria)
    .map(([materia, dados]) => ({
      materia,
      percentual: dados.possiveis > 0 ? Math.round((dados.pontos / dados.possiveis) * 100) : 0,
    }))
    .sort((a, b) => b.percentual - a.percentual)
    .slice(0, 4);
  const coresMaterias = ['bg-emerald-500', 'bg-blue-600', 'bg-violet-500', 'bg-amber-400'];

  const stats = [
    {
      title: 'Atividades Publicadas',
      value: atividadesPublicadas.length.toString(),
      detail: `${atividadesProfessor.length} criadas`,
      icon: FileText,
      iconClass: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Alunos',
      value: alunosProfessor.length.toString(),
      detail: `${totalRespostas} respostas`,
      icon: Users,
      iconClass: 'bg-indigo-50 text-indigo-600',
    },
    {
      title: 'Taxa de Conclusão',
      value: `${taxaConclusao}%`,
      detail: `${respostasEsperadas} respostas esperadas`,
      icon: Target,
      iconClass: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Turmas',
      value: turmas.length.toString(),
      detail: 'Total de turmas',
      icon: Users,
      iconClass: 'bg-orange-50 text-orange-500',
    },
  ];

  const atividadesRecentes = [...atividadesProfessor]
    .sort((a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime())
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-[#f8faff]">
      <Header />
      
      <main className="container mx-auto max-w-[1280px] px-4 py-7 animate-fade-in">
        <div className="mb-6">
          <h2 className="text-3xl font-bold tracking-tight text-[#122554] mb-1">
            Painel do Professor
          </h2>
          <p className="text-sm text-[#6d82aa]">
            Crie atividades e acompanhe o desempenho dos alunos
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 mb-4">
          {stats.map((stat, index) => (
            <Card
              key={index}
              className="group flex min-h-[98px] items-center gap-4 rounded-lg border-[#dce8fb] bg-white p-4 shadow-none transition-shadow hover:shadow-md animate-scale-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.iconClass}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-[#7185a9]">{stat.title}</p>
                <h3 className="mt-0.5 text-2xl font-bold text-[#122554]">{stat.value}</h3>
                <p className={`text-[11px] ${index === 3 ? 'text-[#7185a9]' : 'text-emerald-500'}`}>{stat.detail}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-[#8ba4cf] transition-transform group-hover:translate-x-0.5" />
            </Card>
          ))}
        </div>

        <div className="relative mb-4 overflow-hidden rounded-lg bg-gradient-to-r from-[#1655d8] via-[#356de2] to-[#bed7ff] px-7 py-5 text-white shadow-sm">
          <div className="absolute -right-3 -top-12 h-40 w-40 rounded-full border-[20px] border-white/10" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 ring-8 ring-white/5">
                <Mic className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Criar Atividade com IA</h3>
                <p className="mt-1 max-w-md text-xs leading-5 text-blue-50">Fale ou escreva o que deseja criar. A IA organiza o conteúdo e gera as questões automaticamente.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setShowCriarAtividade(true)} className="h-10 bg-white px-6 text-xs font-semibold text-[#1655d8] hover:bg-blue-50">
                <Mic className="mr-2 h-4 w-4" /> Criar por Áudio
              </Button>
              <Button onClick={() => setShowCriarAtividade(true)} className="h-10 border border-white/25 bg-[#1854d2] px-6 text-xs font-semibold text-white hover:bg-[#1046bc]">
                <FileText className="mr-2 h-4 w-4" /> Criar por Texto
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.05fr_1fr]">
          <Card className="rounded-lg border-[#dce8fb] bg-white p-4 shadow-none">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><BookOpen className="h-4 w-4" /></div>
                <div><h3 className="text-sm font-bold text-[#122554]">Atividades Recentes</h3><p className="text-[11px] text-[#7185a9]">Veja as últimas atividades criadas e publicadas.</p></div>
              </div>
              <Button variant="ghost" onClick={() => setShowMinhasAtividades(true)} className="h-8 px-2 text-[11px] font-semibold text-blue-600 hover:bg-blue-50">Ver todas <ArrowRight className="ml-1 h-3 w-3" /></Button>
            </div>
            {atividadesRecentes.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma atividade criada ainda. Clique em "Criar Atividade por Áudio" para começar!
              </p>
            ) : (
              <div className="divide-y divide-[#e7eef9] rounded-lg border border-[#e7eef9]">
                {atividadesRecentes.map((ativ, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 transition-colors hover:bg-blue-50/40"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><FileText className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-xs font-bold text-[#21355e]">{ativ.materia} — {ativ.titulo}</h4>
                      <p className="mt-1 truncate text-[10px] text-[#8295b7]">{ativ.turmas[0] || 'Turma geral'} • {ativ.questoes.length} questões • Criada em {new Date(ativ.dataCriacao).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-600">
                        {ativ.publicada ? 'Publicada' : 'Rascunho'}
                    </span>
                    <MoreVertical className="h-4 w-4 shrink-0 text-[#90a6cb]" />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="rounded-lg border-[#dce8fb] bg-white p-4 shadow-none">
            <div className="mb-3 flex items-start justify-between"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><BarChart3 className="h-4 w-4" /></div><div><h3 className="text-sm font-bold text-[#122554]">Desempenho dos Alunos</h3><p className="text-[11px] text-[#7185a9]">Acompanhe o progresso e identifique pontos de atenção.</p></div></div><Button variant="outline" onClick={() => setShowDesempenho(true)} className="h-8 gap-1 border-[#dce8fb] px-2 text-[10px] text-[#61779f]">Todas as atividades <ChevronDown className="h-3 w-3" /></Button></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[145px_1fr]">
              <div className="flex flex-col items-center justify-center rounded-lg border border-[#e0eafb] py-4"><div className="relative flex h-28 w-28 items-center justify-center rounded-full" style={{ background: `conic-gradient(#17b997 ${taxaDesempenho}%, #e7effb 0)` }}><div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-white"><span className="text-xl font-bold text-[#122554]">{taxaDesempenho}%</span><span className="text-[9px] text-[#8194b6]">Taxa de Acerto Geral</span></div></div><span className="mt-2 text-[10px] text-[#8194b6]">{totalRespostas} respostas avaliadas</span></div>
              <div className="rounded-lg border border-[#e0eafb] p-3">
                {materias.length === 0 ? <p className="py-8 text-center text-[11px] text-[#8194b6]">Ainda não há respostas avaliadas por matéria.</p> : materias.map(({ materia, percentual }, index) => <div key={materia} className="mb-3 last:mb-0"><div className="mb-1 flex justify-between text-[10px] text-[#61779f]"><span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${coresMaterias[index]}`} />{materia}</span><strong className="text-[#21355e]">{percentual}%</strong></div><div className="h-1.5 rounded-full bg-[#edf2fa]"><div className={`h-full rounded-full ${coresMaterias[index]}`} style={{ width: `${percentual}%` }} /></div></div>)}
              </div>
            </div>
              <Button variant="ghost" onClick={() => { setTurmaInicialRelatorio(null); setShowDesempenhoAlunos(true); }} className="mt-3 h-8 px-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50">Ver relatório completo <ArrowRight className="ml-1 h-3 w-3" /></Button>
          </Card>
        </div>

        <Card className="mt-4 rounded-lg border-[#dce8fb] bg-white p-4 shadow-none"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Users className="h-4 w-4" /></div><div><h3 className="text-sm font-bold text-[#122554]">Minhas Turmas</h3><p className="text-[11px] text-[#7185a9]">Acesse suas turmas e acompanhe o andamento das atividades.</p></div></div><Button variant="ghost" onClick={() => { setTurmaInicialRelatorio(null); setShowDesempenhoAlunos(true); }} className="h-7 px-1 text-[10px] font-semibold text-blue-600">Ver todas as turmas <ArrowRight className="ml-1 h-3 w-3" /></Button></div><div className="grid grid-cols-1 gap-3 md:grid-cols-3">{turmas.slice(0, 3).map((turma, index) => { const totalAlunosTurma = alunos.filter((aluno) => aluno.turma === turma).length; return <button key={turma} onClick={() => { setTurmaInicialRelatorio(turma); setShowDesempenhoAlunos(true); }} className={`flex items-center gap-3 rounded-lg border border-[#dce8fb] p-3 text-left transition-shadow hover:shadow-sm ${index === 1 ? 'bg-violet-50/40' : index === 2 ? 'bg-emerald-50/40' : 'bg-blue-50/40'}`}><div className={`flex h-9 w-9 items-center justify-center rounded-lg ${index === 1 ? 'bg-violet-100 text-violet-600' : index === 2 ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}><GraduationCap className="h-5 w-5" /></div><span className="min-w-0 flex-1"><strong className="block truncate text-xs text-[#21355e]">{turma}</strong><small className="text-[10px] text-[#8194b6]">{totalAlunosTurma} alunos</small></span><ChevronRight className="h-4 w-4 text-[#90a6cb]" /></button>; })}{turmas.length === 0 && <p className="col-span-3 py-4 text-center text-sm text-muted-foreground">Nenhuma turma vinculada às suas atividades.</p>}</div></Card>
      </main>

      <CriarAtividadeModal
        isOpen={showCriarAtividade}
        onClose={() => setShowCriarAtividade(false)}
      />
      
      <MinhasAtividadesModal
        isOpen={showMinhasAtividades}
        onClose={() => setShowMinhasAtividades(false)}
      />
      
      <DesempenhoModal
        isOpen={showDesempenho}
        onClose={() => setShowDesempenho(false)}
      />

      <DesempenhoAlunosModal
        isOpen={showDesempenhoAlunos}
        onClose={() => { setShowDesempenhoAlunos(false); setTurmaInicialRelatorio(null); }}
        professorId={user?.id}
        turmaInicial={turmaInicialRelatorio || undefined}
      />
    </div>
  );
};

export default DashboardProfessor;
