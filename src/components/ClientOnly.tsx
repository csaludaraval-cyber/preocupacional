'use client';

import { useState, useEffect, type ReactNode } from 'react';

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Un componente que renderiza a sus hijos solo en el lado del cliente.
 * Esto es útil para prevenir errores de hidratación cuando un componente
 * se comporta de manera diferente en el servidor y en el cliente.
 * @param {ClientOnlyProps} props - Las props del componente.
 * @param {ReactNode} props.children - Los componentes hijos a renderizar solo en el cliente.
 * @param {ReactNode} [props.fallback=null] - Un componente o elemento a mostrar durante el renderizado del servidor.
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient ? <>{children}</> : <>{fallback}</>;
}
