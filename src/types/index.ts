export type UserRole = 'admin' | 'professor' | 'aluno';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  turma?: string;
  pontos?: number;
  badges?: string[];
  ativo?: boolean;
}

export interface Atividade {
  id: string;
  titulo: string;
  descricao: string;
  professorId: string;
  professorNome: string;
  materia: string;
  turmas: string[];
  questoes: Questao[];
  dataCriacao: string;
  publicada: boolean;
}

export interface Questao {
  id: string;
  enunciado: string;
  tipo: 'multipla_escolha' | 'dissertativa' | 'verdadeiro_falso';
  alternativas?: string[];
  gabarito: string;
  pontos: number;
}

export interface RespostaAluno {
  id: string;
  atividadeId: string;
  alunoId: string;
  respostas: { [questaoId: string]: string };
  pontuacao?: number;
  dataEnvio: string;
  feedback?: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
  isAI?: boolean;
}

export interface Materia {
  id: string;
  nome: string;
  icon: string;
  cor: string;
}
