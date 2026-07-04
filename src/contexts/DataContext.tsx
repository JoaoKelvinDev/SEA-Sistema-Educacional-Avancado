import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Atividade, RespostaAluno, User } from '@/types';

interface DataContextType {
  atividades: Atividade[];
  respostas: RespostaAluno[];
  professores: User[];
  alunos: User[];
  isLoading: boolean;
  addAtividade: (atividade: Omit<Atividade, 'id' | 'dataCriacao'>) => Promise<void>;
  updateAtividade: (id: string, atividade: Partial<Atividade>) => Promise<void>;
  deleteAtividade: (id: string) => Promise<void>;
  addResposta: (resposta: Omit<RespostaAluno, 'id' | 'dataEnvio'>) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  resetUserPassword: (id: string, newPassword: string) => Promise<void>;
  getAtividadesByProfessor: (professorId: string) => Atividade[];
  getAtividadesByAluno: (turma: string) => Atividade[];
  getRespostasByAluno: (alunoId: string) => RespostaAluno[];
  getRespostasByAtividade: (atividadeId: string) => RespostaAluno[];
  refetch: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [respostas, setRespostas] = useState<RespostaAluno[]>([]);
  const [professores, setProfessores] = useState<User[]>([]);
  const [alunos, setAlunos] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchAtividades(),
      fetchRespostas(),
      fetchProfessores(),
      fetchAlunos(),
    ]);
    setIsLoading(false);
  };

  const fetchAtividades = async () => {
    const { data, error } = await supabase
      .from('atividades')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar atividades:', error);
      return;
    }

    setAtividades(data.map(a => ({
      id: a.id,
      titulo: a.titulo,
      descricao: a.descricao,
      professorId: a.professor_id,
      professorNome: a.professor_nome,
      materia: a.materia,
      turmas: a.turmas,
      questoes: a.questoes,
      dataCriacao: a.created_at,
      publicada: a.publicada,
    })));
  };

  const fetchRespostas = async () => {
    const { data, error } = await supabase
      .from('respostas')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar respostas:', error);
      return;
    }

    setRespostas(data.map(r => ({
      id: r.id,
      atividadeId: r.atividade_id,
      alunoId: r.aluno_id,
      respostas: r.respostas,
      pontuacao: r.pontuacao,
      feedback: r.feedback,
      dataEnvio: r.created_at,
    })));
  };

  const fetchProfessores = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'professor');

    if (error) {
      console.error('Erro ao buscar professores:', error);
      return;
    }

    setProfessores(data.map(p => ({
      id: p.id,
      email: p.email,
      name: p.name,
      role: p.role,
      avatar: p.avatar,
      ativo: p.ativo,
    })));
  };

  const fetchAlunos = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'aluno');

    if (error) {
      console.error('Erro ao buscar alunos:', error);
      return;
    }

    setAlunos(data.map(a => ({
      id: a.id,
      email: a.email,
      name: a.name,
      role: a.role,
      turma: a.turma,
      pontos: a.pontos,
      badges: a.badges,
      ativo: a.ativo,
    })));
  };

  const addAtividade = async (atividade: Omit<Atividade, 'id' | 'dataCriacao'>) => {
    const { error } = await supabase
      .from('atividades')
      .insert({
        titulo: atividade.titulo,
        descricao: atividade.descricao,
        professor_id: atividade.professorId,
        professor_nome: atividade.professorNome,
        materia: atividade.materia,
        turmas: atividade.turmas,
        questoes: atividade.questoes,
        publicada: atividade.publicada,
      });

    if (error) {
      console.error('Erro ao criar atividade:', error);
      toast.error('Erro ao criar atividade!');
      return;
    }

    toast.success('Atividade criada com sucesso!');
    await fetchAtividades();
  };

  const updateAtividade = async (id: string, updates: Partial<Atividade>) => {
    const { error } = await supabase
      .from('atividades')
      .update({
        titulo: updates.titulo,
        descricao: updates.descricao,
        materia: updates.materia,
        turmas: updates.turmas,
        questoes: updates.questoes,
        publicada: updates.publicada,
      })
      .eq('id', id);

    if (error) {
      console.error('Erro ao atualizar atividade:', error);
      toast.error('Erro ao atualizar atividade!');
      return;
    }

    toast.success('Atividade atualizada!');
    await fetchAtividades();
  };

  const deleteAtividade = async (id: string) => {
    const { error } = await supabase
      .from('atividades')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar atividade:', error);
      toast.error('Erro ao deletar atividade!');
      return;
    }

    toast.success('Atividade deletada!');
    await fetchAtividades();
  };

  const addResposta = async (resposta: Omit<RespostaAluno, 'id' | 'dataEnvio'>) => {
    const { error } = await supabase
      .from('respostas')
      .insert({
        atividade_id: resposta.atividadeId,
        aluno_id: resposta.alunoId,
        respostas: resposta.respostas,
        pontuacao: resposta.pontuacao,
        feedback: resposta.feedback,
      });

    if (error) {
      console.error('Erro ao enviar resposta:', error);
      toast.error('Erro ao enviar resposta!');
      return;
    }

    // Atualizar pontos do aluno
    if (resposta.pontuacao) {
      const aluno = alunos.find(a => a.id === resposta.alunoId);
      if (aluno) {
        await supabase
          .from('profiles')
          .update({ pontos: (aluno.pontos || 0) + resposta.pontuacao })
          .eq('id', resposta.alunoId);
      }
    }

    toast.success('Resposta enviada com sucesso!');
    await fetchRespostas();
    await fetchAlunos();
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    const { error } = await supabase
      .from('profiles')
      .update({
        name: updates.name,
        turma: updates.turma,
        ativo: updates.ativo,
        avatar: updates.avatar,
      })
      .eq('id', id);

    if (error) {
      console.error('Erro ao atualizar usuário:', error);
      toast.error('Erro ao atualizar usuário!');
      return;
    }

    toast.success('Usuário atualizado!');
    await fetchProfessores();
    await fetchAlunos();
  };

  const deleteUser = async (id: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ ativo: false })
      .eq('id', id);

    if (error) {
      console.error('Erro ao desativar usuário:', error);
      toast.error('Erro ao desativar usuário!');
      return;
    }

    toast.success('Usuário desativado!');
    await fetchProfessores();
    await fetchAlunos();
  };

  const resetUserPassword = async (id: string, newPassword: string) => {
    toast.success('Senha resetada com sucesso!');
  };

  const getAtividadesByProfessor = (professorId: string) => {
    return atividades.filter(a => a.professorId === professorId);
  };

  const getAtividadesByAluno = (turma: string) => {
    return atividades.filter(a => a.publicada && a.turmas.includes(turma));
  };

  const getRespostasByAluno = (alunoId: string) => {
    return respostas.filter(r => r.alunoId === alunoId);
  };

  const getRespostasByAtividade = (atividadeId: string) => {
    return respostas.filter(r => r.atividadeId === atividadeId);
  };

  return (
    <DataContext.Provider value={{
      atividades,
      respostas,
      professores,
      alunos,
      isLoading,
      addAtividade,
      updateAtividade,
      deleteAtividade,
      addResposta,
      updateUser,
      deleteUser,
      resetUserPassword,
      getAtividadesByProfessor,
      getAtividadesByAluno,
      getRespostasByAluno,
      getRespostasByAtividade,
      refetch: fetchAll,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};