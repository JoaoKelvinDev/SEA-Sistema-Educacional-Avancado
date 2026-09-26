import { useState } from 'react';
import { Users, GraduationCap, BookOpen, TrendingUp, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import Header from '@/components/shared/Header';
import GerenciarProfessores from './GerenciarProfessores';
import GerenciarAlunos from './GerenciarAlunos';
import DesempenhoAlunosModal from '@/components/shared/DesempenhoAlunosModal';
import { useData } from '@/contexts/DataContext';

export default function DashboardAdmin() {
  const [showDesempenhoAlunos, setShowDesempenhoAlunos] = useState(false);
  const { professores, alunos, atividades } = useData();
  
  const stats = [
    { title: 'Total de Professores', value: professores.length.toString(), icon: Users, color: 'text-primary' },
    { title: 'Total de Alunos', value: alunos.length.toString(), icon: GraduationCap, color: 'text-secondary' },
    { title: 'Atividades Publicadas', value: atividades.filter(a => a.publicada).length.toString(), icon: BookOpen, color: 'text-accent' },
    { title: 'Taxa de Engajamento', value: '89%', icon: TrendingUp, color: 'text-primary' },
  ];

  return (
    <div className="min-h-screen bg-[#f8faff]">
      <Header />
      
      <main className="container mx-auto max-w-[1280px] px-4 py-7 animate-fade-in">
        <div className="mb-6">
          <h2 className="mb-1 text-3xl font-bold tracking-tight text-[#122554]">
            Painel Administrativo
          </h2>
          <p className="text-sm text-[#6d82aa]">
            Gerencie professores, alunos e configurações do sistema
          </p>
        </div>

        {/* Grade de estatísticas */}
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat, index) => (
            <Card key={index} className="group min-h-[104px] rounded-lg border-[#dce8fb] bg-white shadow-none transition-shadow hover:shadow-md">
              <CardContent className="flex h-full items-center justify-between p-4">
                <div><p className="mb-1 text-xs font-medium text-[#7185a9]">{stat.title}</p><p className="text-2xl font-bold text-[#122554]">{stat.value}</p></div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 ${stat.color}`}><stat.icon className="h-5 w-5" /></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Botão de Análise de Desempenho */}
        <div className="relative mb-4 overflow-hidden rounded-lg bg-gradient-to-r from-[#1655d8] via-[#356de2] to-[#bed7ff] px-6 py-4 text-white shadow-sm">
          <div className="absolute -right-3 -top-12 h-40 w-40 rounded-full border-[20px] border-white/10" />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><h3 className="text-base font-bold">Visão geral da plataforma</h3><p className="text-xs text-blue-50">Acompanhe os indicadores e o desempenho dos alunos.</p></div>
          <Button
            onClick={() => setShowDesempenhoAlunos(true)}
            size="default"
            className="w-full bg-white text-xs font-semibold text-[#1655d8] hover:bg-blue-50 sm:w-auto"
          >
            <BarChart3 className="w-5 h-5 mr-2" />
            Análise de Desempenho dos Alunos
          </Button>
          </div>
        </div>

        {/* Guias de gerenciamento */}
        <Tabs defaultValue="professores" className="space-y-4">
          <TabsList className="grid h-11 w-full grid-cols-3 rounded-lg border border-[#dce8fb] bg-white p-1">
            <TabsTrigger value="professores">Professores</TabsTrigger>
            <TabsTrigger value="alunos">Alunos</TabsTrigger>
            <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
          </TabsList>
          
          <TabsContent value="professores">
            <GerenciarProfessores />
          </TabsContent>
          
          <TabsContent value="alunos">
            <GerenciarAlunos />
          </TabsContent>
          
          <TabsContent value="configuracoes">
              <Card className="rounded-lg border-[#dce8fb] bg-white shadow-none">
              <CardHeader className="p-5">
                <CardTitle className="text-base text-[#122554]">Configurações do Sistema</CardTitle>
                <CardDescription className="text-xs">Configure parâmetros gerais da plataforma</CardDescription>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <p className="text-sm text-[#7185a9]">Funcionalidades de configuração em desenvolvimento.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DesempenhoAlunosModal
          isOpen={showDesempenhoAlunos}
          onClose={() => setShowDesempenhoAlunos(false)}
        />
      </main>
    </div>
  );
}
