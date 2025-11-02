
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, firestore } from '@/lib/firebase';
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
import { UserPlus } from 'lucide-react';

export default function CreateFirstAdminPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (password.length < 6) {
        toast({
            variant: "destructive",
            title: "Contraseña débil",
            description: "La contraseña debe tener al menos 6 caracteres.",
        });
        setLoading(false);
        return;
    }

    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Update user profile with name
      await updateProfile(user, { displayName: name });

      // 3. Create admin role document in Firestore
      const adminRoleRef = doc(firestore, 'roles_admin', user.uid);
      await setDoc(adminRoleRef, { admin: true, createdAt: new Date() });
      
      // 4. Create user profile document (optional but good practice)
      const userProfileRef = doc(firestore, 'solicitantes', user.uid);
      await setDoc(userProfileRef, {
          nombre: name,
          mail: email,
          rut: '', // Add fields as necessary
          cargo: 'Administrador',
          centroCostos: 'N/A'
      }, { merge: true });


      toast({
        title: 'Administrador creado',
        description: 'La cuenta de administrador ha sido creada exitosamente.',
      });

      // 5. Redirect to the admin panel
      router.push('/admin');

    } catch (error: any) {
      let description = 'Ocurrió un error inesperado. Intente de nuevo.';
      if (error.code === 'auth/email-already-in-use') {
          description = 'El correo electrónico ingresado ya está en uso.';
      } else if (error.code === 'auth/invalid-email') {
          description = 'El formato del correo electrónico no es válido.';
      }
      
      toast({
        variant: 'destructive',
        title: 'Error al crear cuenta',
        description: description,
      });
      console.error('Admin creation error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleCreateAdmin}>
          <CardHeader className="text-center">
            <CardTitle className="font-headline text-2xl">
              Crear Primer Administrador
            </CardTitle>
            <CardDescription>
              Complete el formulario para registrar la cuenta principal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                type="text"
                placeholder="Nombre completo"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
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
                placeholder="Mínimo 6 caracteres"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creando cuenta...' : <> <UserPlus className="mr-2 h-4 w-4"/> Crear Administrador </>}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
