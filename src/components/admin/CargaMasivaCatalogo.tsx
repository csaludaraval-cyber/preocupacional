
"use client";

import { useState, useRef, ChangeEvent } from 'react';
import Papa from 'papaparse';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lightbulb, Loader2, FileUp, CheckCircle, XCircle } from 'lucide-react';
import type { Examen } from '@/lib/types';
import { Input } from '../ui/input';

interface CargaMasivaCatalogoProps {
    onUploadSuccess: () => void;
}

type CsvRow = {
    CODIGO: string;
    EXAMEN: string;
    ['CATEGORIA/SUBCATEGORIA']: string;
    UNIDAD: 'CLP' | 'UF';
    VALOR: string;
}

export function CargaMasivaCatalogo({ onUploadSuccess }: CargaMasivaCatalogoProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [fileStatus, setFileStatus] = useState<'pending' | 'success' | 'error'>('pending');
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setIsUploading(true);
        setFileStatus('pending');

        Papa.parse<CsvRow>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (result) => {
                processData(result.data);
            },
            error: (error) => {
                console.error("Error con PapaParse:", error);
                toast({
                    variant: "destructive",
                    title: "Error al leer archivo",
                    description: `No se pudo procesar el archivo CSV. ${error.message}`
                });
                setIsUploading(false);
                setFileStatus('error');
            },
        });
    };

    const processData = async (data: CsvRow[]) => {
        const examsToUpload: Omit<Examen, 'id'>[] = [];

        for (const row of data) {
            const codigo = row.CODIGO?.trim();
            const examen = row.EXAMEN?.trim();
            const categoriaSubcategoria = row['CATEGORIA/SUBCATEGORIA']?.trim();
            const unidad = row.UNIDAD?.trim() as 'CLP' | 'UF';
            const valorStr = row.VALOR?.trim();

            if (!codigo || !examen || !categoriaSubcategoria || !unidad || !valorStr) {
                 if (Object.values(row).every(v => !v || v.trim() === '')) continue;
                 
                toast({
                    variant: 'destructive',
                    title: 'Error de Fila',
                    description: `Una fila tiene datos incompletos. Código: ${codigo || 'vacío'}`,
                });
                setIsUploading(false);
                setFileStatus('error');
                return;
            }

            const [categoria, subcategoria] = categoriaSubcategoria.split('/').map(s => s.trim());
            const valor = parseFloat(valorStr.replace(/[$.]/g, '').replace(',', '.'));
            
            if (isNaN(valor)) {
                 toast({
                    variant: 'destructive',
                    title: 'Error de Valor',
                    description: `El valor "${valorStr}" para el examen "${examen}" no es un número válido.`,
                });
                setIsUploading(false);
                setFileStatus('error');
                return;
            }
            
             if (unidad !== 'CLP' && unidad !== 'UF') {
                toast({
                    variant: 'destructive',
                    title: 'Error de Unidad',
                    description: `La unidad "${unidad}" para el examen "${examen}" no es válida (debe ser CLP o UF).`,
                });
                setIsUploading(false);
                setFileStatus('error');
                return;
            }
            
             if(!categoria) {
                toast({
                    variant: 'destructive',
                    title: 'Error de Categoría',
                    description: `El formato de 'CATEGORIA/SUBCATEGORIA' debe ser 'Principal / Secundaria'. Fila para el examen: ${examen}`,
                });
                setIsUploading(false);
                setFileStatus('error');
                return;
            }


            examsToUpload.push({
                codigo: codigo,
                nombre: examen,
                categoria: categoria,
                subcategoria: subcategoria || 'General',
                unidad,
                valor,
            });
        }
        
        if (examsToUpload.length === 0) {
            toast({ title: 'No hay datos', description: 'El archivo está vacío o no contiene datos válidos.'});
            setIsUploading(false);
            setFileStatus('error');
            return;
        }

        try {
            const batch = writeBatch(firestore);
            const examsCollection = collection(firestore, 'examenes');
            
            examsToUpload.forEach(exam => {
                const newDocRef = doc(examsCollection); // Firestore autogenera el ID
                batch.set(newDocRef, exam);
            });

            await batch.commit();
            toast({
                title: '¡Carga Exitosa!',
                description: `${examsToUpload.length} exámenes han sido cargados/actualizados.`,
            });
            setFileStatus('success');
            onUploadSuccess();
        } catch (error: any) {
            console.error(error);
            setFileStatus('error');
            toast({
                variant: 'destructive',
                title: 'Error de Carga en Base de Datos',
                description: error.message || 'No se pudieron guardar los exámenes.',
            });
        } finally {
            setIsUploading(false);
        }
    }


    return (
        <div className="space-y-4">
             <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertTitle>Instrucciones</AlertTitle>
                <AlertDescription>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                        <li>
                            Prepare sus datos en una hoja de cálculo (Excel, Sheets) con los encabezados de columna exactamente así:
                            <br />
                            <code className="font-bold">CODIGO,EXAMEN,CATEGORIA/SUBCATEGORIA,UNIDAD,VALOR</code>
                        </li>
                         <li>Asegúrese de que la tercera columna contenga la categoría y subcategoría separadas por una barra inclinada (ej: <code className="font-mono">Médicos y Clínicos / Ruido</code>).</li>
                        <li>Guarde el archivo en formato <span className="font-bold">CSV (delimitado por comas)</span>.</li>
                        <li>Haga clic en "Seleccionar archivo" y elija el archivo CSV que acaba de guardar. La carga comenzará automáticamente.</li>
                    </ol>
                </AlertDescription>
            </Alert>
            
            <div>
                 <Input 
                    id="file-upload"
                    type="file" 
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".csv"
                    disabled={isUploading}
                />
                <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className='w-full'>
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                    {isUploading ? "Procesando..." : "Seleccionar archivo CSV"}
                </Button>
            </div>

            {fileName && (
                <div className="p-3 rounded-md border flex items-center justify-between text-sm">
                    <p className='text-muted-foreground truncate'>{fileName}</p>
                    {isUploading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    {fileStatus === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {fileStatus === 'error' && <XCircle className="h-4 w-4 text-destructive" />}
                </div>
            )}
        </div>
    );
}


    