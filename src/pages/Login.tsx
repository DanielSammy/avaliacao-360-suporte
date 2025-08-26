import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate(); // Keep navigate for potential future use, but not for post-login redirect
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => { // Added async
    e.preventDefault();
    const success = await login(email, password); // Await the login promise
    if (success) {
      toast({
        title: "Login bem-sucedido",
        description: "Você foi logado com sucesso.",
        variant: "default",
      });
      // Removed: navigate('/evaluate-operators'); // AuthRedirect will handle this
    } else {
      toast({
        title: "Erro de Login",
        description: "Email ou senha inválidos.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="flex flex-col items-center space-y-4">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Avalia+ Logo" className="h-30 w-60" /> {/* Added logo */}
          {/* <CardTitle className="text-2xl font-bold text-center">Login</CardTitle> */}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
