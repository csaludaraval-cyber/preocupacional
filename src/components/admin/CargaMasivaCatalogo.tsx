
"use client";

import { useState } from 'react';
import Papa from 'papaparse';
import { collection, writeBatch } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lightbulb, Loader2 } from 'lucide-react';
import type { Examen } from '@/lib/types';


interface CargaMasivaCatalogoProps {
    onUploadSuccess: () => void;
}

export function CargaMasivaCatalogo({ onUploadSuccess }: CargaMasivaCatalogoProps) {
    const [pastedData, setPastedData] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast();

    const handleUpload = async () => {
        setIsUploading(true);

        // Usar PapaParse para convertir los datos pegados (reconoce tabulaciones)
        const result = Papa.parse<string[]>(pastedData.trim(), {
            skipEmptyLines: true,
        });

        if (result.errors.length > 0) {
            toast({
                variant: 'destructive',
                title: 'Error de Formato',
                description: `Error en la fila ${result.errors[0].row}: ${result.errors[0].message}`,
            });
            setIsUploading(false);
            return;
        }

        const examsToUpload: Omit<Examen, 'id'>[] = [];

        for (const row of result.data) {
            // Validar que cada fila tenga 6 columnas
            if (row.length !== 6) {
                toast({
                    variant: 'destructive',
                    title: 'Error de Datos',
                    description: `Una fila no tiene las 6 columnas esperadas. Fila: ${row.join(', ')}`,
                });
                setIsUploading(false);
                return;
            }

            const [codigo, nombre, categoria, subcategoria, unidad, valorStr] = row;
            const valor = parseFloat(valorStr.replace(/[^0-9,-]+/g,"").replace(",", "."));

            if (isNaN(valor)) {
                 toast({
                    variant: 'destructive',
                    title: 'Error de Valor',
                    description: `El valor "${valorStr}" no es un número válido. Fila: ${row.join(', ')}`,
                });
                setIsUploading(false);
                return;
            }
            
             if (unidad !== 'CLP' && unidad !== 'UF') {
                toast({
                    variant: 'destructive',
                    title: 'Error de Unidad',
                    description: `La unidad "${unidad}" no es válida (debe ser CLP o UF). Fila: ${row.join(', ')}`,
                });
                setIsUploading(false);
                return;
            }

            examsToUpload.push({
                codigo,
                nombre,
                categoria,
                subcategoria,
                unidad,
                valor,
            });
        }
        
        if (examsToUpload.length === 0) {
            toast({ title: 'No hay datos', description: 'El área de texto está vacía o no contiene datos válidos.'});
            setIsUploading(false);
            return;
        }

        try {
            const batch = writeBatch(firestore);
            const examsCollection = collection(firestore, 'examenes');
            
            // Opcional: Eliminar catálogo antiguo antes de cargar el nuevo
            // const oldDocs = await getDocs(examsCollection);
            // oldDocs.forEach(doc => batch.delete(doc.ref));
            
            // Añadir nuevos exámenes
            examsToUpload.forEach(exam => {
                const newDocRef = collection(firestore, 'examenes').doc();
                batch.set(newDocRef, exam);
            });

            await batch.commit();
            toast({
                title: '¡Éxito!',
                description: `${examsToUpload.length} exámenes han sido cargados al catálogo.`,
            });
            onUploadSuccess(); // Callback para cerrar el modal y refrescar
        } catch (error: any) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Error de Carga',
                description: error.message || 'No se pudieron subir los exámenes a la base de datos.',
            });
        } finally {
            setIsUploading(false);
        }
    };


    return (
        <div className="space-y-4">
             <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertTitle>Instrucciones</AlertTitle>
                <AlertDescription>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                        <li>Prepare sus datos en una hoja de cálculo (Excel, Sheets) con las columnas en este orden exacto:
                            <br />
                            <code className="font-bold">CODIGO, EXAMEN, CATEGORIA, SUBCATEGORIA, UNIDAD, VALOR</code>
                        </li>
                        <li>Seleccione y copie las filas de datos (sin los encabezados).</li>
                        <li>Pegue los datos copiados en el área de texto de abajo.</li>
                        <li>Haga clic en "Procesar y Cargar Catálogo".</li>
                    </ol>
                </AlertDescription>
            </Alert>
            <Textarea
                placeholder="Pegue aquí los datos de su hoja de cálculo..."
                rows={15}
                value={pastedData}
                onChange={(e) => setPastedData(e.target.value)}
                disabled={isUploading}
            />
            <Button onClick={handleUpload} disabled={isUploading || !pastedData} className="w-full">
                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isUploading ? 'Cargando...' : 'Procesar y Cargar Catálogo'}
            </Button>
        </div>
    );
}

    