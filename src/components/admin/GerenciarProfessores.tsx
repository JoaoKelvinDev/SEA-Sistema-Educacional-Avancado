import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Trash2, Edit2, Plus } from 'lucide-react';

const GerenciarProfessores = () => {
  const { professores, updateUser, deleteUser } = useData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

    if (editingId) {
      await updateUser(editingId, { name: formData.name });
      toast.success('Professor atualizado!');
      resetForm();
      setIsDialogOpen(false);
      return;
    }

    if (!formData.email || !formData.password || !formData.name) {
      toast.error('Preencha todos os campos!');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        toast.error('Você precisa estar autenticado para criar um professor.');
        return;
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

  const handleEdit = (prof: any) => {
    setEditingId(prof.id);
    setFormData({ name: prof.name, email: prof.email, password: '' });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja deletar este professor?')) {
      await deleteUser(id);
      toast.success('Professor deletado!');
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

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {professores.map(prof => (
              <TableRow key={prof.id}>
                <TableCell>{prof.name}</TableCell>
                <TableCell>{prof.email}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-sm ${prof.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {prof.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </TableCell>
                <TableCell className="space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(prof)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(prof.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default GerenciarProfessores;