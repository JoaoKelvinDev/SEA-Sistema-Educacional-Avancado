import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { GraduationCap, Mail, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [turma, setTurma] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsLoggingIn(true);
    const success = await login(email, password);
    
    if (success) {
      toast.success('Login realizado com sucesso!');
      navigate('/dashboard');
    } else {
      toast.error('Email ou senha incorretos');
    }
    setIsLoggingIn(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !name || !turma) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsLoggingIn(true);
    const success = await signup(email, password, name, turma);
    
    if (success) {
      toast.success('Cadastro realizado com sucesso!');
      navigate('/dashboard');
    } else {
      toast.error('Email já cadastrado');
    }
    setIsLoggingIn(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary-glow to-accent p-4 animate-fade-in">
      <Card className="w-full max-w-md p-8 shadow-xl animate-scale-in">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gradient-to-br from-primary to-primary-glow p-4 rounded-2xl shadow-lg mb-4">
            <GraduationCap className="w-12 h-12 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">SEA</h1>
          <p className="text-muted-foreground text-center mt-2">
            Sistema Educacional Avançado
          </p>
        </div>

        <form onSubmit={isSignupMode ? handleSignup : handleLogin} className="space-y-6">
          {isSignupMode && (
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Nome Completo
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Senha
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isSignupMode && (
            <div className="space-y-2">
              <Label htmlFor="turma" className="text-sm font-medium">
                Turma
              </Label>
              <select
                id="turma"
                value={turma}
                onChange={(e) => setTurma(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Selecione sua turma</option>
                <option value="1º Ano A">1º Ano A</option>
                <option value="1º Ano B">1º Ano B</option>
                <option value="2º Ano A">2º Ano A</option>
                <option value="2º Ano B">2º Ano B</option>
                <option value="3º Ano A">3º Ano A</option>
                <option value="3º Ano B">3º Ano B</option>
              </select>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-opacity"
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (isSignupMode ? 'Cadastrando...' : 'Entrando...') : (isSignupMode ? 'Cadastrar' : 'Entrar')}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignupMode(!isSignupMode);
                setName('');
                setTurma('');
              }}
              className="text-sm text-primary hover:underline"
            >
              {isSignupMode ? 'Já tem uma conta? Entrar' : 'Aluno novo? Cadastre-se'}
            </button>
          </div>
        </form>

{!isSignupMode && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-2">Contas de demonstração:</p>
                <ul className="space-y-1">
                  <li>• Admin: admin@sea.com</li>
                  <li>• Professor: prof@sea.com</li>
                  <li>• Aluno: aluno@sea.com</li>
                  <li className="mt-2 italic">Senha para todos: qualquer valor</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Login;
