'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useFirebase } from '@/firebase'; 
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { LogIn, Activity } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { auth } = useFirebase();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Autenticar con Firebase
      await signInWithEmailAndPassword(auth, email, password);
      
      // NOTA: No hacemos router.push aquí. 
      // Dejamos que el AuthProvider detecte el cambio de estado 
      // y redirija según el ROL (médico o admin).
      
      toast({ title: 'Ingresando...', description: 'Verificando perfil de usuario.' });

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error de acceso',
        description: 'Email o contraseña incorrectos.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-sm shadow-2xl border-t-4 border-t-primary">
        <form onSubmit={handleLogin}>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
                <div className="bg-primary/10 p-3 rounded-full">
                    <Activity className="h-6 w-6 text-primary" />
                </div>
            </div>
            <CardTitle className="font-headline text-2xl">Portal Araval Salud</CardTitle>
            <CardDescription>Ingrese sus credenciales de acceso</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full h-11 text-base font-bold" disabled={loading}>
              {loading ? 'Procesando...' : <><LogIn className="mr-2 h-5 w-5"/> Entrar al Sistema</>}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}