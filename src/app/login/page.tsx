
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useFirebase } from '@/firebase'; // Use the central hook
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { auth } = useFirebase(); // Get auth from our provider

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Use the auth instance from the context
      await signInWithEmailAndPassword(auth, email, password);
      // The AuthProvider will handle redirection based on role
      // We can optimistically push to a default page
      router.push('/'); 
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error de inicio de sesión',
        description:
          'Credenciales incorrectas. Por favor, verifique su email y contraseña.',
      });
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleLogin}>
          <CardHeader className="text-center">
            <CardTitle className="font-headline text-2xl">
              Acceso Administrador
            </CardTitle>
            <CardDescription>
              Ingrese sus credenciales para continuar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@araval.cl"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Ingresando...' : <> <LogIn className="mr-2 h-4 w-4"/> Ingresar </>}
            </Button>
             <Link href="/crear-primer-admin" className="text-sm text-muted-foreground hover:text-primary">
                Crear primer administrador
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
