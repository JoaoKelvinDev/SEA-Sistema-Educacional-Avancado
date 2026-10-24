import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Atividade, ProfessorTurma, RespostaAluno, User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface DataContextType {
  atividades: Atividade[];
  respostas: RespostaAluno[];
  professores: User[];
  alunos: User[];
  professorTurmas: ProfessorTurma[];
  professorTurmasError: string | null;
  isLoading: boolean;
  addAtividade: (atividade: Omit<Atividade, 'id' | 'dataCriacao'>) => Promise<void>;
  updateAtividade: (id: string, atividade: Partial<Atividade>) => Promise<void>;
  deleteAtividade: (id: string) => Promise<void>;
  addResposta: (resposta: Omit<RespostaAluno, 'id' | 'dataEnvio'>) => Promise<{ pontosAtualizados: boolean }>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  saveProfessorTurmas: (professorId: string, turmas: string[]) => Promise<void>;
  getAtividadesByProfessor: (professorId: string) => Atividade[];
  getAtividadesByAluno: (turma: string) => Atividade[];
  getRespostasByAluno: (alunoId: string) => RespostaAluno[];
  getRespostasByAtividade: (atividadeId: string) => RespostaAluno[];
  refetch: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);
type DataUser = Pick<User, 'id' | 'role' | 'turma'>;

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [respostas, setRespostas] = useState<RespostaAluno[]>([]);
  const [professores, setProfessores] = useState<User[]>([]);
  const [alunos, setAlunos] = useState<User[]>([]);
  const [professorTurmas, setProfessorTurmas] = useState<ProfessorTurma[]>([]);
  const [professorTurmasError, setProfessorTurmasError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user, refreshUser } = useAuth();
  const userId = user?.id;
  const userRole = user?.role;
  const userTurma = user?.turma;
  const dataUser = useMemo<DataUser | null>(
    () => userId && userRole ? { id: userId, role: userRole, turma: userTurma } : null,
    [userId, userRole, userTurma]
  );

  const fetchAtividades = useCallback(async (currentUser: DataUser): Promise<Atividade[]> => {
    if (currentUser.role === 'aluno' && !currentUser.turma) {
      setAtividades([]);
      return [];
    }

    let query = supabase.from('atividades').select('*');
    if (currentUser.role === 'professor') {
      query = query.eq('professor_id', currentUser.id);
    } else if (currentUser.role === 'aluno') {
      query = query
        .eq('publicada', true)
        .contains('turmas', [currentUser.turma || '']);
    } else if (currentUser.role !== 'admin') {
      setAtividades([]);
      return [];
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar atividades:', error);
      return [];
    }

    const atividadesCarregadas = data.map(a => ({
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
    }));
    setAtividades(atividadesCarregadas);
    return atividadesCarregadas;
  }, []);

  const fetchRespostas = useCallback(async (currentUser: DataUser, atividadesUsuario: Atividade[]) => {
    let query = supabase.from('respostas').select('*');
    if (currentUser.role === 'aluno') {
      query = query.eq('aluno_id', currentUser.id);
    } else if (currentUser.role === 'professor') {
      const atividadeIds = atividadesUsuario.map((atividade) => atividade.id);
      if (atividadeIds.length === 0) {
        setRespostas([]);
        return;
      }
      query = query.in('atividade_id', atividadeIds);
    } else if (currentUser.role !== 'admin') {
      setRespostas([]);
      return;
    }

    const { data, error } = await query.order('created_at', { ascending: false });

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
  }, []);

  const fetchProfessores = useCallback(async (currentUser: DataUser) => {
    if (currentUser.role !== 'admin') {
      setProfessores([]);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, name, role, avatar, ativo')
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
  }, []);

  const fetchProfessorTurmas = useCallback(async (currentUser: DataUser): Promise<ProfessorTurma[] | null> => {
    setProfessorTurmasError(null);
    if (currentUser.role !== 'admin' && currentUser.role !== 'professor') {
      setProfessorTurmas([]);
      return [];
    }
    let query = supabase.from('professor_turmas').select('professor_id, turma').order('turma');
    if (currentUser.role === 'professor') query = query.eq('professor_id', currentUser.id);
    const { data, error } = await query;
    if (error) {
      console.error('Erro ao buscar vínculos de turmas:', error);
      setProfessorTurmas([]);
      setProfessorTurmasError('Não foi possível carregar os vínculos de turmas. Atualize os dados antes de editar.');
      return null;
    }
    const vinculos = data.map(v => ({ professorId: v.professor_id, turma: v.turma }));
    setProfessorTurmas(vinculos);
    return vinculos;
  }, []);

  const fetchAlunos = useCallback(async (currentUser: DataUser, vinculosUsuario: ProfessorTurma[]) => {
    let query = supabase.from('profiles')
      .select('id, email, name, role, turma, pontos, badges, ativo').eq('role', 'aluno');
    if (currentUser.role === 'professor') {
      const turmas = [...new Set(vinculosUsuario.filter(v => v.professorId === currentUser.id).map(v => v.turma))];
      if (turmas.length === 0) {
        setAlunos([]);
        return;
      }
      query = query.in('turma', turmas);
    } else if (currentUser.role !== 'admin') {
      setAlunos([]);
      return;
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar alunos:', error);
      setAlunos([]);
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
  }, []);

  const fetchAll = useCallback(async (currentUser: DataUser | null) => {
    if (!currentUser) {
      setAtividades([]);
      setRespostas([]);
      setProfessores([]);
      setAlunos([]);
      setProfessorTurmas([]);
      setProfessorTurmasError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [atividadesUsuario, vinculosUsuario] = await Promise.all([
        fetchAtividades(currentUser),
        fetchProfessorTurmas(currentUser),
      ]);
      await Promise.all([
        fetchRespostas(currentUser, atividadesUsuario),
        fetchProfessores(currentUser),
        fetchAlunos(currentUser, vinculosUsuario ?? []),
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchAtividades, fetchRespostas, fetchProfessores, fetchProfessorTurmas, fetchAlunos]);

  useEffect(() => {
    void fetchAll(dataUser);
  }, [dataUser, fetchAll]);

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
      throw new Error(error.message || 'Erro ao criar atividade.');
    }

    if (user) await fetchAtividades(user);
  };

  const updateAtividade = async (id: string, updates: Partial<Atividade>) => {
    const { data, error } = await supabase
      .from('atividades')
      .update({
        titulo: updates.titulo,
        descricao: updates.descricao,
        materia: updates.materia,
        turmas: updates.turmas,
        questoes: updates.questoes,
        publicada: updates.publicada,
      })
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error || !data) {
      console.error('Erro ao atualizar atividade:', error);
      throw new Error(error?.message || 'Atividade não encontrada ou atualização não autorizada.');
    }

    if (user) await fetchAtividades(user);
  };

  const deleteAtividade = async (id: string) => {
    const { data, error } = await supabase
      .from('atividades')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error || !data) {
      console.error('Erro ao deletar atividade:', error);
      if (error?.code === '23503') {
        throw new Error('Esta atividade possui respostas e não pode ser excluída.');
      }
      throw new Error(error?.message || 'Atividade não encontrada ou exclusão não autorizada.');
    }

    if (user) await fetchAtividades(user);
  };

  const addResposta = async (resposta: Omit<RespostaAluno, 'id' | 'dataEnvio'>) => {
    const { data: existente, error: consultaError } = await supabase
      .from('respostas')
      .select('id')
      .eq('atividade_id', resposta.atividadeId)
      .eq('aluno_id', resposta.alunoId)
      .maybeSingle();

    if (consultaError) {
      console.error('Erro ao verificar resposta existente:', consultaError);
      throw new Error('Não foi possível verificar se esta atividade já foi enviada.');
    }

    if (existente) {
      throw new Error('Esta atividade já foi enviada por este aluno.');
    }

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
      throw new Error(error.message || 'Erro ao enviar resposta.');
    }

    let pontosAtualizados = true;
    if (resposta.pontuacao && resposta.pontuacao > 0) {
      const { data: perfil, error: consultaPerfilError } = await supabase
        .from('profiles')
        .select('pontos')
        .eq('id', resposta.alunoId)
        .single();

      if (consultaPerfilError || !perfil) {
        console.error('Resposta salva, mas não foi possível consultar os pontos do aluno:', consultaPerfilError);
        pontosAtualizados = false;
      } else {
        const { data: perfilAtualizado, error: pontosError } = await supabase
          .from('profiles')
          .update({ pontos: (perfil.pontos || 0) + resposta.pontuacao })
          .eq('id', resposta.alunoId)
          .select('id')
          .maybeSingle();

        if (pontosError || !perfilAtualizado) {
          console.error('Resposta salva, mas não foi possível atualizar os pontos do aluno:', pontosError);
          pontosAtualizados = false;
        }
      }
    }

    if (pontosAtualizados) {
      await refreshUser();
    }
    if (user) {
      await fetchRespostas(user, atividades);
      await fetchAlunos(user, professorTurmas);
    }
    return { pontosAtualizados };
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        name: updates.name,
        turma: updates.turma,
        ativo: updates.ativo,
        avatar: updates.avatar,
      })
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error || !data) {
      console.error('Erro ao atualizar usuário:', error);
      throw new Error(error?.message || 'Usuário não encontrado ou atualização não autorizada.');
    }

    if (user) {
      await fetchProfessores(user);
      await fetchAlunos(user, professorTurmas);
    }
  };

  const deleteUser = async (id: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ativo: false })
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error || !data) {
      console.error('Erro ao desativar usuário:', error);
      throw new Error(error?.message || 'Usuário não encontrado ou desativação não autorizada.');
    }

    if (user) {
      await fetchProfessores(user);
      await fetchAlunos(user, professorTurmas);
    }
  };

  const saveProfessorTurmas = async (professorId: string, turmas: string[]) => {
    if (user?.role !== 'admin') throw new Error('Somente administradores podem atribuir turmas.');
    const { error } = await supabase.rpc('set_professor_turmas', {
      p_professor_id: professorId,
      p_turmas: turmas,
    });
    if (error) throw new Error(error.message || 'Não foi possível salvar as turmas.');
    const vinculos = await fetchProfessorTurmas(user);
    if (!vinculos) {
      throw new Error('As turmas foram salvas, mas a lista não pôde ser atualizada. Recarregue a página.');
    }
    await fetchAlunos(user, vinculos);
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
      professorTurmas,
      professorTurmasError,
      isLoading,
      addAtividade,
      updateAtividade,
      deleteAtividade,
      addResposta,
      updateUser,
      deleteUser,
      saveProfessorTurmas,
      getAtividadesByProfessor,
      getAtividadesByAluno,
      getRespostasByAluno,
      getRespostasByAtividade,
      refetch: () => fetchAll(dataUser),
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
