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
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 animate-fade-in">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Painel Administrativo
          </h2>
          <p className="text-muted-foreground">
            Gerencie professores, alunos e configurações do sistema
          </p>
        </div>

        {/* Grade de estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="hover-scale">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                  </div>
                  <stat.icon className={`h-12 w-12 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Botão de Análise de Desempenho */}
        <div className="mb-8">
          <Button
            onClick={() => setShowDesempenhoAlunos(true)}
            size="lg"
            className="w-full md:w-auto bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
          >
            <BarChart3 className="w-5 h-5 mr-2" />
            Análise de Desempenho dos Alunos
          </Button>
        </div>

        {/* Guias de gerenciamento */}
        <Tabs defaultValue="professores" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
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
            <Card>
              <CardHeader>
                <CardTitle>Configurações do Sistema</CardTitle>
                <CardDescription>Configure parâmetros gerais da plataforma</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Funcionalidades de configuração em desenvolvimento.</p>
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
