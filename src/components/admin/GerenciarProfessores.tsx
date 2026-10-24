import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Power, Edit2, Plus, GraduationCap } from 'lucide-react';
import { User } from '@/types';

const turmasPadrao = ['1º Ano A', '1º Ano B', '2º Ano A', '2º Ano B', '3º Ano A', '3º Ano B'];

const GerenciarProfessores = () => {
  const { professores, alunos, professorTurmas, professorTurmasError, isLoading,
    updateUser, deleteUser, saveProfessorTurmas, refetch } = useData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingProfessorId, setPendingProfessorId] = useState<string | null>(null);
  const [professorTurmasEditar, setProfessorTurmasEditar] = useState<User | null>(null);
  const [turmasSelecionadas, setTurmasSelecionadas] = useState<string[]>([]);
  const [isSavingTurmas, setIsSavingTurmas] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const resetForm = () => {
    setFormData({ name: '', email: '', password: '' });
    setEditingId(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Informe o nome do professor.');
      return;
    }

    if (!editingId && (!formData.email || !formData.password)) {
      toast.error('Preencha todos os campos!');
      return;
    }

    if (!editingId && formData.password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingId) {
        await updateUser(editingId, { name: formData.name.trim() });
        toast.success('Professor atualizado!');
        resetForm();
        setIsDialogOpen(false);
        return;
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        throw new Error('Você precisa estar autenticado para criar um professor.');
      }

      const { data, error } = await supabase.functions.invoke('smart-action', {
        body: {
          email: formData.email,
          password: formData.password,
          name: formData.name,
        },
      });

      if (error) {
        throw new Error(error.message || 'Não foi possível criar o professor.');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Não foi possível criar o professor.');
      }

      await refetch();
      toast.success(`Professor ${formData.name} cadastrado!`);
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Erro ao criar professor:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Erro ao criar professor. Verifique a conexão e a função no Supabase.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (prof: User) => {
    setEditingId(prof.id);
    setFormData({ name: prof.name, email: prof.email, password: '' });
    setIsDialogOpen(true);
  };

  const handleToggleStatus = async (professor: User) => {
    const ativar = professor.ativo === false;
    if (!ativar && !confirm('Tem certeza que deseja desativar este professor?')) return;

    setPendingProfessorId(professor.id);
    try {
      if (ativar) {
        await updateUser(professor.id, { ativo: true });
      } else {
        await deleteUser(professor.id);
      }
      toast.success(ativar ? 'Professor ativado!' : 'Professor desativado!');
    } catch (error) {
      console.error('Erro ao alterar status do professor:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao alterar status do professor.');
    } finally {
      setPendingProfessorId(null);
    }
  };

  const turmasDisponiveis = [...new Set([
    ...turmasPadrao,
    ...alunos.map(aluno => aluno.turma).filter((turma): turma is string => Boolean(turma)),
    ...professorTurmas.map(vinculo => vinculo.turma),
  ])].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const handleEditarTurmas = (professor: User) => {
    setTurmasSelecionadas(professorTurmas.filter(v => v.professorId === professor.id).map(v => v.turma));
    setProfessorTurmasEditar(professor);
  };

  const handleSaveTurmas = async () => {
    if (!professorTurmasEditar || isSavingTurmas || professorTurmasError || isLoading) return;
    setIsSavingTurmas(true);
    try {
      await saveProfessorTurmas(professorTurmasEditar.id, turmasSelecionadas);
      toast.success('Turmas do professor atualizadas.');
      setProfessorTurmasEditar(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar as turmas.');
    } finally {
      setIsSavingTurmas(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gerenciar Professores</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Professor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar' : 'Novo'} Professor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                name="name"
                placeholder="Nome completo"
                value={formData.name}
                onChange={handleInputChange}
              />
              <Input
                name="email"
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={!!editingId}
              />
              {!editingId && (
                <Input
                  name="password"
                  type="password"
                  placeholder="Senha (mínimo 6 caracteres)"
                  value={formData.password}
                  onChange={handleInputChange}
                />
              )}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : editingId ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {professorTurmasError && (
        <div role="alert" className="rounded-lg border border-destructive/30 p-3 text-sm">
          <p>{professorTurmasError}</p>
          <Button variant="outline" size="sm" className="mt-2" disabled={isLoading}
            onClick={() => void refetch()}>Atualizar dados</Button>
        </div>
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Turmas</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {professores.map(prof => (
              <TableRow key={prof.id}>
                <TableCell>{prof.name}</TableCell>
                <TableCell>{prof.email}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-sm ${prof.ativo !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {prof.ativo !== false ? 'Ativo' : 'Inativo'}
                  </span>
                </TableCell>
                <TableCell className="max-w-xs text-sm">
                  {professorTurmasError ? 'Indisponível' : isLoading ? 'Carregando...' :
                    professorTurmas.filter(v => v.professorId === prof.id).map(v => v.turma).join(', ') || 'Nenhuma turma atribuída'}
                </TableCell>
                <TableCell className="space-x-2">
                  <Button variant="outline" size="sm" disabled={isLoading || Boolean(professorTurmasError)}
                    onClick={() => handleEditarTurmas(prof)} aria-label={`Definir turmas de ${prof.name}`}>
                    <GraduationCap className="mr-1 h-4 w-4" />Turmas
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(prof)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={prof.ativo === false ? 'outline' : 'destructive'}
                    size="sm"
                    disabled={pendingProfessorId === prof.id}
                    onClick={() => void handleToggleStatus(prof)}
                    title={prof.ativo === false ? 'Ativar professor' : 'Desativar professor'}
                  >
                    <Power className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(professorTurmasEditar)} onOpenChange={(open) => {
        if (!open && !isSavingTurmas) setProfessorTurmasEditar(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Turmas de {professorTurmasEditar?.name}</DialogTitle>
            <DialogDescription>
              Defina as turmas cujos alunos este professor poderá consultar. Sem turmas atribuídas, ele não terá acesso aos alunos.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {turmasDisponiveis.map((turma, index) => (
              <div key={turma} className="flex items-center gap-2">
                <Checkbox id={`professor-turma-${index}`} checked={turmasSelecionadas.includes(turma)}
                  disabled={isSavingTurmas || isLoading || Boolean(professorTurmasError)}
                  onCheckedChange={(checked) => setTurmasSelecionadas(prev => checked === true
                    ? [...new Set([...prev, turma])] : prev.filter(t => t !== turma))} />
                <Label htmlFor={`professor-turma-${index}`}>{turma}</Label>
              </div>
            ))}
          </div>
          {turmasSelecionadas.length === 0 && (
            <p className="text-sm text-muted-foreground">Salvar sem turmas remove todos os vínculos deste professor.</p>
          )}
          {professorTurmasError && <p role="alert" className="text-sm text-destructive">{professorTurmasError}</p>}
          <Button onClick={() => void handleSaveTurmas()}
            disabled={isSavingTurmas || isLoading || Boolean(professorTurmasError)}>
            {isSavingTurmas ? 'Salvando...' : 'Salvar turmas'}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GerenciarProfessores;
