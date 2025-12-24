
'use client';

import { useState } from 'react';
import { AppStatus } from '@/components/admin/AppStatus';
import { Suspense } from 'react';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ShieldCheck, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const STATUS_PIN = '2828'; // PIN de 4 dígitos

function PinLockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === STATUS_PIN) {
      onUnlock();
    } else {
      toast({
        variant: 'destructive',
        title: 'PIN Incorrecto',
        description: 'El PIN de 4 dígitos ingresado no es válido.',
      });
      setPin('');
    }
  };

  return (
     <div className="flex items-center justify-center py-12">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleSubmit}>
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="mt-4 font-headline text-2xl">
              Acceso Restringido
            </CardTitle>
            <CardDescription>
              Ingrese el PIN de 4 dígitos para ver el estado del sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                id="pin"
                type="password"
                maxLength={4}
                placeholder="****"
                required
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                className="text-center text-2xl font-mono tracking-[1em]"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full">
              <KeyRound className="mr-2 h-4 w-4" /> Desbloquear
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}


export default function StatusPage() {
  const [isUnlocked, setIsUnlocked] = useState(false);

  return (
    <FirebaseClientProvider>
      {isUnlocked ? (
        <Suspense fallback={<p>Cargando estado del sistema...</p>}>
          <AppStatus />
        </Suspense>
      ) : (
        <PinLockScreen onUnlock={() => setIsUnlocked(true)} />
      )}
    </FirebaseClientProvider>
  );
}
