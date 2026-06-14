import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Atividade, RespostaAluno, User } from '@/types';

interface DataContextType {
  atividades: Atividade[];
  respostas: RespostaAluno[];
  professores: User[];
  alunos: User[];
  addAtividade: (atividade: Atividade) => void;
  updateAtividade: (id: string, atividade: Partial<Atividade>) => void;
  deleteAtividade: (id: string) => void;
  addResposta: (resposta: RespostaAluno) => void;
  addProfessor: (professor: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  resetUserPassword: (id: string, newPassword: string) => void;
  getAtividadesByProfessor: (professorId: string) => Atividade[];
  getAtividadesByAluno: (turma: string) => Atividade[];
  getRespostasByAluno: (alunoId: string) => RespostaAluno[];
  getRespostasByAtividade: (atividadeId: string) => RespostaAluno[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Dados mockados iniciais
const mockAtividades: Atividade[] = [
  {
    id: 'ativ-1',
    titulo: 'Interpretação de Texto - Machado de Assis',
    descricao: 'Leia o conto "A Cartomante" e responda às questões sobre interpretação e análise literária.',
    professorId: 'prof-1',
    professorNome: 'Professor João Silva',
    materia: 'Português',
    turmas: ['1º Ano A', '1º Ano B'],
    questoes: [
      {
        id: 'q1',
        enunciado: 'Qual é o tema central do conto "A Cartomante"?',
        tipo: 'multipla_escolha',
        alternativas: ['Amor e traição', 'Política brasileira', 'Economia do café', 'Revolução industrial'],
        gabarito: 'Amor e traição',
        pontos: 10
      },
      {
        id: 'q2',
        enunciado: 'Explique o papel da cartomante na narrativa.',
        tipo: 'dissertativa',
        gabarito: 'A cartomante representa o destino e a superstição, sendo um elemento que influencia as decisões dos personagens.',
        pontos: 15
      }
    ],
    dataCriacao: '2025-10-28',
    publicada: true
  },
  {
    id: 'ativ-2',
    titulo: 'Equações do 2º Grau',
    descricao: 'Resolva os exercícios sobre equações quadráticas e suas aplicações.',
    professorId: 'prof-1',
    professorNome: 'Professor João Silva',
    materia: 'Matemática',
    turmas: ['1º Ano A'],
    questoes: [
      {
        id: 'q1',
        enunciado: 'Resolva a equação: x² - 5x + 6 = 0',
        tipo: 'multipla_escolha',
        alternativas: ['x = 2 ou x = 3', 'x = 1 ou x = 6', 'x = -2 ou x = -3', 'x = 0 ou x = 5'],
        gabarito: 'x = 2 ou x = 3',
        pontos: 10
      }
    ],
    dataCriacao: '2025-10-29',
    publicada: true
  },
  {
    id: 'ativ-3',
    titulo: 'Leis de Newton',
    descricao: 'Questões sobre as três leis de Newton e suas aplicações práticas.',
    professorId: 'prof-1',
    professorNome: 'Professor João Silva',
    materia: 'Física',
    turmas: ['2º Ano A', '2º Ano B'],
    questoes: [
      {
        id: 'q1',
        enunciado: 'A primeira lei de Newton é também conhecida como:',
        tipo: 'multipla_escolha',
        alternativas: ['Lei da Inércia', 'Lei da Ação e Reação', 'Lei da Gravitação', 'Lei da Aceleração'],
        gabarito: 'Lei da Inércia',
        pontos: 10
      }
    ],
    dataCriacao: '2025-10-30',
    publicada: true
  }
];

const mockRespostas: RespostaAluno[] = [
  {
    id: 'resp-1',
    atividadeId: 'ativ-1',
    alunoId: 'aluno-1',
    respostas: {
      'q1': 'Amor e traição',
      'q2': 'A cartomante é uma figura importante que representa o misticismo e influencia as escolhas dos personagens.'
    },
    pontuacao: 22,
    dataEnvio: '2025-10-29T10:30:00',
    feedback: 'Ótimo trabalho! Você demonstrou boa compreensão do texto.'
  }
];

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [respostas, setRespostas] = useState<RespostaAluno[]>([]);
  const [professores, setProfessores] = useState<User[]>([]);
  const [alunos, setAlunos] = useState<User[]>([]);

  useEffect(() => {
    // Carregar dados do localStorage ou usar dados mockados
    const savedAtividades = localStorage.getItem('sea_atividades');
    const savedRespostas = localStorage.getItem('sea_respostas');
    const savedProfessores = localStorage.getItem('sea_professores');
    const savedAlunos = localStorage.getItem('sea_alunos');

    setAtividades(savedAtividades ? JSON.parse(savedAtividades) : mockAtividades);
    setRespostas(savedRespostas ? JSON.parse(savedRespostas) : mockRespostas);
    setProfessores(savedProfessores ? JSON.parse(savedProfessores) : [
      {
        id: 'prof-1',
        email: 'prof@sea.com',
        name: 'Professor João Silva',
        role: 'professor',
      }
    ]);
    setAlunos(savedAlunos ? JSON.parse(savedAlunos) : [
      {
        id: 'aluno-1',
        email: 'aluno@sea.com',
        name: 'Maria Santos',
        role: 'aluno',
        turma: '1º Ano A',
        pontos: 850,
        badges: ['Primeira Atividade', 'Sequência 7 dias'],
      }
    ]);
  }, []);

  // Salvar alterações no localStorage
  // Salvar alterações no localStorage de forma otimizada
  useEffect(() => {
    if (atividades.length > 0) {
      localStorage.setItem('sea_atividades', JSON.stringify(atividades));
    }
  }, [atividades]);

  useEffect(() => {
    if (respostas.length > 0) {
      localStorage.setItem('sea_respostas', JSON.stringify(respostas));
    }
  }, [respostas]);

  useEffect(() => {
    if (professores.length > 0) {
      localStorage.setItem('sea_professores', JSON.stringify(professores));
    }
  }, [professores]);

  useEffect(() => {
    if (alunos.length > 0) {
      localStorage.setItem('sea_alunos', JSON.stringify(alunos));
    }
  }, [alunos]);

  const addAtividade = (atividade: Atividade) => {
    setAtividades(prev => [...prev, atividade]);
  };

  const updateAtividade = (id: string, updates: Partial<Atividade>) => {
    setAtividades(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const deleteAtividade = (id: string) => {
    setAtividades(prev => prev.filter(a => a.id !== id));
  };

  const addResposta = (resposta: RespostaAluno) => {
    setRespostas(prev => [...prev, resposta]);
    
    // Atualizar pontos do aluno
    if (resposta.pontuacao) {
      setAlunos(prev => prev.map(a => 
        a.id === resposta.alunoId 
          ? { ...a, pontos: (a.pontos || 0) + resposta.pontuacao! }
          : a
      ));
    }
  };

  const addProfessor = (professor: User) => {
    setProfessores(prev => [...prev, professor]);
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setProfessores(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    setAlunos(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const deleteUser = (id: string) => {
    setProfessores(prev => prev.filter(p => p.id !== id));
    setAlunos(prev => prev.filter(a => a.id !== id));
  };

  const resetUserPassword = (id: string, newPassword: string) => {
    // Em produção, isso seria uma chamada API segura
    // Por enquanto, apenas simulamos a operação
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
      addAtividade,
      updateAtividade,
      deleteAtividade,
      addResposta,
      addProfessor,
      updateUser,
      deleteUser,
      resetUserPassword,
      getAtividadesByProfessor,
      getAtividadesByAluno,
      getRespostasByAluno,
      getRespostasByAtividade,
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
