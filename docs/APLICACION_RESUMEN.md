# Resumen Quirúrgico de la Aplicación ARACORP

## Propósito Principal y Objetivos

**Propósito Principal:**
La aplicación es un **Sistema de Gestión y Facturación B2B (Business-to-Business)** diseñado para **ARACORP**. Su objetivo es automatizar y formalizar el proceso completo desde que un cliente solicita exámenes preocupacionales para sus trabajadores hasta que se emite un Documento Tributario Electrónico (DTE) válido ante el SII.

**Objetivos Clave:**
1.  **Centralizar Solicitudes:** Ofrecer un portal unificado (público y privado) para que las empresas clientes soliciten exámenes.
2.  **Automatizar Cotizaciones:** Permitir a los administradores de ARACORP convertir rápidamente una solicitud en una cotización formal en PDF.
3.  **Gestionar el Ciclo de Pago:** Facilitar el seguimiento de los estados de una cotización: enviada, aceptada, pagada (con carga de voucher) y finalmente facturada.
4.  **Integrar Facturación Electrónica:** Conectar con el proveedor **Lioren** para emitir facturas exentas (DTE 34) automáticamente, cumpliendo con la normativa del SII.
5.  **Segmentar Clientes:** Manejar dos flujos de facturación distintos:
    *   **Modalidad Normal:** Facturación inmediata por cada cotización pagada.
    *   **Modalidad Frecuente:** Acumulación de órdenes de examen para una facturación consolidada mensual.

---

## Flujo de Vida Completo: De la Solicitud a la Factura

Este es el recorrido que hace una transacción en el sistema:

1.  **La Solicitud (Punto de Entrada):**
    *   Un cliente (o un administrador en su nombre) accede a la página `/solicitud`.
    *   Rellena un formulario con los datos de su empresa, el contacto, los trabajadores a evaluar y los exámenes requeridos para cada uno.
    *   Al enviar, se crea un documento en la colección `solicitudes_publicas` de Firestore con `estado: 'pendiente'`. Este es el "buzón de entrada".

2.  **La Cotización (Procesamiento Interno):**
    *   Un administrador de ARACORP va a la sección `/solicitudes-recibidas`.
    *   Ve la solicitud pendiente y hace clic en **"Procesar"**.
    *   El sistema lo redirige a la página principal de creación de cotizaciones (`/`) y carga automáticamente todos los datos de la solicitud en el formulario.
    *   El administrador verifica los datos, ajusta si es necesario, y hace clic en **"Generar Cotización"**.
    *   Esto crea un documento en la colección `cotizaciones` de Firestore y redirige a la vista de vista previa de la cotización (`/cotizacion`).

3.  **El Envío y Confirmación:**
    *   En la vista previa, el administrador puede **"Exportar a PDF"** y/o **"Enviar por Email"**. El correo adjunta el PDF y contiene las instrucciones de pago. El estado de la cotización cambia a `CORREO_ENVIADO`.
    *   El cliente recibe el correo y realiza el pago mediante transferencia bancaria.

4.  **La Carga del Voucher:**
    *   Una vez pagado, el cliente envía el comprobante de pago a ARACORP.
    *   El administrador busca la cotización en `/cotizaciones-guardadas`, hace clic para gestionarla y utiliza la opción **"Subir Voucher"**.
    *   Al subir el comprobante, el estado de la cotización cambia a `PAGADO`. La orden ahora está confirmada y lista para que el trabajador asista al examen.

5.  **La Facturación (Integración con Lioren):**
    *   El administrador, viendo que la cotización tiene el estado `PAGADO`, vuelve a la gestión de la misma.
    *   Aparece el botón **"Facturar Ahora (SII)"**.
    *   Al hacer clic, se ejecuta la Server Action `ejecutarFacturacionSiiV2`.
    *   **Aquí entra Lioren:** La acción del servidor toma los datos de la cotización (cliente, detalles de exámenes, total) y construye un `payload` (una estructura de datos JSON).
    *   Llama a la API de Lioren (`https://www.lioren.cl/api/dtes`) enviando este `payload` junto con el **`LIOREN_TOKEN`** de autorización.
    *   **Lioren recibe la petición, la valida, la envía al SII, obtiene la aprobación y devuelve a nuestra aplicación el número de folio del DTE y la URL del PDF de la factura.**
    *   Nuestra aplicación recibe esta respuesta exitosa, actualiza el estado de la cotización a `FACTURADO` y guarda el folio y la URL del PDF en el documento de Firestore. El ciclo ha finalizado.

---

## El Rol de Lioren y el Manejo del Token

*   **¿Qué es Lioren?** Es un Proveedor de Servicios de Facturación Electrónica. Actúa como intermediario entre nuestra aplicación y el Servicio de Impuestos Internos (SII) de Chile. Nosotros le decimos "emite esta factura" y ellos se encargan de la comunicación oficial y de generar el documento con validez tributaria.
*   **¿Cómo se introduce el token?** El `LIOREN_TOKEN` es una credencial secreta. **No se introduce por la terminal en cada despliegue**. Se configura una sola vez en el sistema de secretos de Google Cloud (Secret Manager). La configuración de la aplicación en `apphosting.yaml` está instruida para leer este secreto y exponerlo como una variable de entorno (`process.env.LIOREN_TOKEN`) disponible **únicamente en el entorno del servidor**. El código del servidor (las Server Actions) lee esta variable de entorno para autenticarse con Lioren. Nadie, ni siquiera los desarrolladores, necesita ver o manipular el token directamente.

---

## Estado Actual y Tareas Pendientes para el 100% Operativo

La aplicación tiene toda la estructura, flujos de usuario, roles y componentes de UI implementados. La lógica del servidor para comunicarse con Lioren también está escrita.

Lo que falta para que la integración de Lioren sea 100% operativa y robusta es:

1.  **Implementar la Facturación Consolidada:** Actualmente, el botón "Facturar Grupo" en la vista de facturación consolidada no tiene la lógica final. Se debe crear una Server Action `emitirDTEConsolidado` que:
    *   Reciba el RUT de una empresa.
    *   Busque todas las cotizaciones con estado `orden_examen_enviada` para ese RUT.
    *   Agrupe todos los ítems de todas esas cotizaciones en un único `payload`.
    *   Envíe ese `payload` a Lioren para generar una sola factura que consolide todo el mes.
    *   Actualice todas las cotizaciones involucradas al estado `facturado_lioren`.

2.  **Refinar el PDF de la Orden de Examen:** El anexo en PDF que se genera (`OrdenDeExamen.tsx`) es funcional pero podría mejorarse estéticamente y asegurar que todos los datos del trabajador (fecha de nacimiento, fecha de atención) se muestren correctamente.

3.  **Descarga de PDF con Nombre Estandarizado:** Mejorar la función de descarga del PDF de la factura para que el nombre del archivo siga un formato estándar, como `FACTURA_34_[Folio]_[RUT].pdf`, para facilitar la organización de archivos al cliente. Esto se menciona en el `README.md` como tarea pendiente.

Una vez completados estos tres puntos, la aplicación estará 100% operativa según los requerimientos definidos.

---

## Códigos Clave de la Aplicación

### 1. Flujo de Facturación (Acción del Servidor)
`src/server/actions/facturacionActions.ts`
```typescript
'use server';

import { getDb } from '@/lib/firestore-admin';
import { createDTE, whoami } from '@/server/lioren';
import type { CotizacionFirestore } from '@/lib/types';
import { cleanRut } from '@/lib/utils';

// 1. TEST DE CONEXIÓN (Diagnóstico)
export async function probarConexionLioren() {
  try {
    const data = await whoami();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 2. FACTURACIÓN INMEDIATA (MODALIDAD NORMAL)
export async function ejecutarFacturacionSiiV2(cotizacionId: string) {
  let trace = "INICIO";
  try {
    trace = "1: DB Setup";
    const db = getDb();
    trace = "2: Referencia a Cotización";
    const docRef = db.collection('cotizaciones').doc(cotizacionId);
    trace = "3: Lectura de Cotización";
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new Error(`La cotización con ID ${cotizacionId} no fue encontrada.`);
    }

    const data = snap.data() as CotizacionFirestore;

    trace = "4: Validaciones de Datos Críticos";
    if (!data.empresaData?.rut) throw new Error("El RUT del receptor es obligatorio.");
    if (!data.empresaData?.razonSocial) throw new Error("La Razón Social del receptor es obligatoria.");
    if (!data.empresaData?.giro) throw new Error("El Giro de la empresa es obligatorio para el SII.");
    if (!data.empresaData?.direccion) throw new Error("La Dirección del receptor es obligatoria.");
    if (!data.empresaData?.comuna) throw new Error("La Comuna del receptor es obligatoria.");
    if (!data.empresaData?.ciudad) throw new Error("La Ciudad del receptor es obligatoria.");

    trace = "5: Construcción de Payload para DTE 34 (Factura Exenta)";
    const payload = {
      tipodoc: "34", // Factura Exenta
      receptor: {
        rut: cleanRut(data.empresaData.rut),
        rs: data.empresaData.razonSocial,
        giro: data.empresaData.giro,
        comuna: data.empresaData.comuna,
        ciudad: data.empresaData.ciudad,
        dir: data.empresaData.direccion,
        email: data.empresaData.email || data.solicitanteData?.mail,
      },
      detalles: (data.solicitudesData || []).flatMap((sol: any) =>
        (sol.examenes || []).map((ex: any) => ({
          nombre: `${ex.nombre} (Trabajador: ${sol.trabajador.nombre})`.substring(0, 80), // Limitar a 80 caracteres
          cantidad: 1,
          precio: Math.round(Number(ex.valor)), // Asegurar que es un entero
          exento: true
        }))
      ),
      montos: {
        neto: 0, // En factura exenta, el neto es 0
        exento: Math.round(Number(data.total)), // El total va en el campo exento
        iva: 0,
        total: Math.round(Number(data.total))
      },
      expect_all: true
    };

    trace = "6: Llamada a API de Lioren";
    const result = await createDTE(payload);

    trace = "7: Actualización de Documento en Firestore";
    await docRef.update({
      status: 'FACTURADO',
      liorenFolio: result.folio.toString(),
      liorenId: result.id,
      liorenPdfUrl: result.url_pdf_cedible || result.url_pdf,
      liorenFechaEmision: new Date().toISOString()
    });

    trace = "8: Finalizado";
    return { success: true, folio: result.folio };
  } catch (error: any) {
      const detailedError = error.response?.data?.message || error.message;
      console.error(`ERROR EN [${trace}]:`, detailedError);
      return { success: false, error: `Error en ${trace}: ${detailedError}` };
  }
}
```

### 2. Cliente de API Lioren
`src/server/lioren.ts`
```typescript
/**
 * Llama a la API de Lioren para crear un Documento Tributario Electrónico (DTE).
 * @param dteData El payload con los datos del DTE.
 * @returns La respuesta de la API de Lioren.
 */
export async function createDTE(dteData: any): Promise<any> {
  const token = process.env.LIOREN_TOKEN;
  if (!token) throw new Error('LIOREN_TOKEN no configurado en el entorno del servidor.');

  const response = await fetch('https://www.lioren.cl/api/dtes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token.trim()}`,
    },
    body: JSON.stringify(dteData),
    cache: 'no-store',
  });

  const responseData = await response.json();

  if (!response.ok) {
    // Para errores, lanzamos el objeto completo de la respuesta de Lioren.
    // El 'message' suele contener el detalle del campo que falló.
    throw new Error(responseData.message || JSON.stringify(responseData));
  }

  return responseData;
}

/**
 * Llama al endpoint "whoami" de Lioren para verificar las credenciales del token.
 * @returns La información de la empresa asociada al token.
 */
export async function whoami(): Promise<any> {
    const token = process.env.LIOREN_TOKEN;
    if (!token) {
        throw new Error('LIOREN_TOKEN no está configurado en el servidor.');
    }

    try {
        const response = await fetch('https://www.lioren.cl/api/whoami', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token.trim()}`,
            },
            cache: 'no-store',
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Respuesta no válida de Lioren al verificar credenciales.');
        }

        return data;

    } catch (error: any) {
        console.error("Error al conectar con Lioren (whoami):", error);
        throw new Error(`Fallo de conexión con Lioren: ${error.message}`);
    }
}
```

### 3. Vista de Administración de Cotizaciones (Donde se inician las acciones)
`src/components/admin/AdminCotizaciones.tsx`
```typescript
"use client";

import React, { useMemo, useState, useRef } from 'react';
import { useCotizaciones } from '@/hooks/use-cotizaciones';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, MoreVertical, FlaskConical,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { DetalleCotizacion } from '@/components/cotizacion/DetalleCotizacion';
import { useRouter } from 'next/navigation';
import { updateDoc, doc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Cotizacion } from '@/lib/types';
import { mapLegacyStatus } from '@/lib/status-mapper';
import { ejecutarFacturacionSiiV2, probarConexionLioren } from '@/server/actions/facturacionActions';
import { Input } from '@/components/ui/input';

const QuoteStatusMap: Record<string, 'default' | 'outline' | 'destructive' | 'secondary'> = {
  PENDIENTE: 'secondary', CONFIRMADA: 'outline', CORREO_ENVIADO: 'outline',
  PAGADO: 'default', FACTURADO: 'default', RECHAZADA: 'destructive',
  orden_examen_enviada: 'secondary',
};

export default function AdminCotizaciones() {
  const { quotes, isLoading, error, refetchQuotes } = useCotizaciones();
  const [quoteToManage, setQuoteToManage] = useState<Cotizacion | null>(null);
  const [isInvoicing, setIsInvoicing] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  const getMs = (ts: any) => ts?.seconds ? ts.seconds * 1000 : new Date(ts).getTime() || 0;
  const formatDate = (ts: any) => {
    const ms = getMs(ts);
    return ms === 0 ? 'N/A' : new Date(ms).toLocaleDateString('es-CL');
  };

  const sortedQuotes = useMemo(() => {
    if (!quotes) return [];
    return [...quotes].sort((a, b) => getMs(b.fechaCreacion) - getMs(a.fechaCreacion));
  }, [quotes]);

  const handleTestLioren = async () => {
    toast({ title: 'Probando conexión con Lioren...' });
    const result = await probarConexionLioren();
    if (result.success && result.data) {
        alert(`✅ Conexión Exitosa\nEmpresa: ${result.data.rs}\nRUT: ${result.data.rut}`);
    } else {
        alert(`❌ ERROR DE CONEXIÓN\nDetalle: ${result.error}`);
    }
  };

  const handleInvoiceNow = async (id: string) => {
    setIsInvoicing(id);
    const result = await ejecutarFacturacionSiiV2(id);
    if (result.success) {
      toast({ title: 'Factura Emitida Correctamente', description: `Se ha generado el DTE con folio ${result.folio}.` });
      refetchQuotes();
      setQuoteToManage(null);
    } else {
      toast({ variant: 'destructive', title: 'Error al Facturar en SII', description: result.error });
    }
    setIsInvoicing(null);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.[0] || !quoteToManage) return;
    setIsUploading(true);
    try {
      const storage = getStorage();
      const fileRef = storageRef(storage, `vouchers/${quoteToManage.id}_${Date.now()}`);
      await uploadBytes(fileRef, event.target.files[0]);
      const url = await getDownloadURL(fileRef);
      await updateDoc(doc(firestore, 'cotizaciones', quoteToManage.id), { pagoVoucherUrl: url, status: 'PAGADO' });
      toast({ title: 'Voucher Subido', description: 'El estado de la cotización se actualizó a PAGADO.' });
      refetchQuotes();
      setQuoteToManage(null);
    } catch (err: any) {
        toast({ variant: 'destructive', title: 'Error de Subida', description: err.message });
    }
    finally { setIsUploading(false); }
  };

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
  if (error) return <div className="text-red-500 p-10">Error al cargar cotizaciones: {error.message}</div>;

  return (
    <div className="container mx-auto p-4 bg-white rounded-lg shadow-sm border">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold uppercase font-headline tracking-tight text-foreground">
          Gestión de Cotizaciones
        </h1>
        <Button onClick={handleTestLioren} variant="outline" size="sm"><FlaskConical className="mr-2 h-4 w-4"/> Test Lioren</Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Empresa</TableHead><TableHead>Fecha</TableHead><TableHead>Estado</TableHead><TableHead className="text-center">Acciones</TableHead></TableRow></TableHeader>
        <TableBody>
          {sortedQuotes.map((quote) => (
            <TableRow key={quote.id}>
              <TableCell className="font-mono text-xs">{quote.id?.slice(-6)}</TableCell>
              <TableCell className="font-bold">{quote.empresaData?.razonSocial || 'N/A'}</TableCell>
              <TableCell>{formatDate(quote.fechaCreacion)}</TableCell>
              <TableCell><Badge variant={QuoteStatusMap[mapLegacyStatus(quote.status)]}>{mapLegacyStatus(quote.status)}</Badge></TableCell>
              <TableCell className="text-center">
                <Button variant="ghost" size="icon" onClick={() => setQuoteToManage(quote)}><MoreVertical/></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!quoteToManage} onOpenChange={() => setQuoteToManage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {quoteToManage && (
            <div className="space-y-4">
              <DialogHeader><DialogTitle>Gestión de Cotización: {quoteToManage.id.slice(-6)}</DialogTitle></DialogHeader>
              <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-lg border">
                {mapLegacyStatus(quoteToManage.status) === 'CONFIRMADA' && (
                  <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} size="sm">
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    Subir Voucher de Pago
                  </Button>
                )}
                {mapLegacyStatus(quoteToManage.status) === 'PAGADO' && (
                  <Button onClick={() => handleInvoiceNow(quoteToManage.id)} disabled={!!isInvoicing} className="bg-green-600 hover:bg-green-700" size="sm">
                    {isInvoicing === quoteToManage.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    Facturar Ahora (SII)
                  </Button>
                )}
                {quoteToManage.liorenPdfUrl && (
                  <Button asChild className="bg-blue-600 hover:bg-blue-700" size="sm"><a href={quoteToManage.liorenPdfUrl} target="_blank" rel="noopener noreferrer">Ver Factura Emitida</a></Button>
                )}
                 {quoteToManage.pagoVoucherUrl && (
                  <Button asChild variant="outline" size="sm"><a href={quoteToManage.pagoVoucherUrl} target="_blank" rel="noopener noreferrer">Ver Voucher Cargado</a></Button>
                )}
                <Input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,.pdf"/>
              </div>
              <DetalleCotizacion quote={quoteToManage} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
```
