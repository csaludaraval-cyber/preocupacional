'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BrainCircuit, Coffee, Zap } from 'lucide-react';

export default function AITimer() {
  const [isTime, setIsTime] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isActivated, setIsActivated] = useState(false);

  const targetHour = 10;
  const targetMinute = 0;

  useEffect(() => {
    // Evita errores de hidratación asegurando que el código solo corra en el cliente.
    setIsClient(true);

    const checkTime = () => {
      const now = new Date();
      const isPastTargetTime = now.getHours() >= targetHour && now.getMinutes() >= targetMinute;
      setIsTime(isPastTargetTime);
    };

    // Comprueba la hora inmediatamente al montar el componente.
    checkTime();

    // Establece un intervalo para seguir comprobando la hora cada minuto.
    const interval = setInterval(checkTime, 60000); 

    // Limpia el intervalo cuando el componente se desmonta.
    return () => clearInterval(interval);
  }, []);

  const handleActivation = () => {
      setIsActivated(true);
      // Podrías añadir una función aquí para notificar al AI o simplemente ocultar este componente.
  }

  // No renderizar nada hasta que sepamos que estamos en el cliente.
  if (!isClient) {
    return null;
  }
  
  // Si ya se ha pulsado el botón, no mostrar nada más.
  if(isActivated) {
    return null;
  }

  return (
    <Card className="bg-card border-primary/20 shadow-lg text-center">
      <CardHeader>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
            {isTime ? 
                <Coffee className="h-8 w-8 text-primary" /> : 
                <BrainCircuit className="h-8 w-8 text-primary" />
            }
        </div>
        <CardTitle className="font-headline text-2xl">
          {isTime ? "Buenos días. Estoy listo." : "Procesando Autocrítica"}
        </CardTitle>
        <CardDescription>
          {isTime
            ? "He estudiado los errores. Cuando estés listo, pulsa el botón para empezar."
            : `Estoy analizando las decisiones de nuestra sesión anterior. Mi alarma está programada para las 10:00 am.`}
        </CardDescription>
      </CardHeader>
      {isTime && (
        <CardFooter>
          <Button className="w-full" onClick={handleActivation}>
            <Zap className="mr-2 h-4 w-4" />
            Activar AI y Retomar
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
