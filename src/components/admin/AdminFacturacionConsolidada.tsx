"use client";

import React, { useMemo, useState } from 'react';
import { collection, query, where, doc, deleteDoc } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemoFirebase } from '@/firebase/provider';
import { firestore } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileClock, ChevronDown, ChevronUp, Trash2, Eye, User, Download, Calendar, X, FolderDown } from 'lucide-react';
import { emitirDTEConsolidado, eliminarTrabajadorDeCotizacion } from '@/server/actions/facturacionActions';
import { GeneradorPDF } from '@/components/cotizacion/GeneradorPDF';
import JSZip from 'jszip';

const MESES = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

export function AdminFacturacionConsolidada() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<string | null>(null);
  const [isDownloadingZip, setIsDownloadingZip] = useState<string | null>(null);
  
  // Estados para el Modal de control de asistencia de trabajadores
  const [selectedQuote, setSelectedQuote] = useState<any | null>(null);
  const [isRemovingWorker, setIsRemovingWorker] = useState<string | null>(null);

  // Consulta solo órdenes PAGADAS
  const pendingQuery = useMemoFirebase(() => query(collection(firestore, 'cotizaciones'), where('status', '==', 'PAGADO')), []);
  const { data: quotesToBill, isLoading, refetch } = useCollection<any>(pendingQuery);

  // Agrupación por RUT + MES + AÑO con ordenamiento cronológico interno
  const groupedData = useMemo(() => {
    if (!quotesToBill) return [];
    const groups: Record<string, any> = {};

    quotesToBill.forEach(quote => {
      const modalidad = (quote.empresaData?.modalidadFacturacion || '').toLowerCase();
      if (modalidad === 'frecuente') {
        const rut = quote.empresaData?.rut || 'S-RUT';
        const fecha = quote.fechaCreacion?.toDate ? quote.fechaCreacion.toDate() : new Date();
        const mes = fecha.getMonth();
        const anio = fecha.getFullYear();
        const periodoKey = `${rut}_${mes}_${anio}`;

        if (!groups[periodoKey]) {
          groups[periodoKey] = { 
            key: periodoKey, 
            empresa: quote.empresaData, 
            mes, 
            anio, 
            quotes: [], 
            totalAmount: 0 
          };
        }
        groups[periodoKey].quotes.push(quote);
        groups[periodoKey].totalAmount += (quote.total || 0);
      }
    });

    // Convertimos a arreglo para ordenar los grupos por año/mes descendente
    const result = Object.values(groups);

    // ORDENAMIENTO CRONOLÓGICO INTERNO: Ordena las cotizaciones de cada mes de menor a mayor día
    result.forEach((group: any) => {
      group.quotes.sort((a: any, b: any) => {
        const dateA = a.fechaCreacion?.toDate ? a.fechaCreacion.toDate().getTime() : 0;
        const dateB = b.fechaCreacion?.toDate ? b.fechaCreacion.toDate().getTime() : 0;
        return dateA - dateB; // Ascendente (de más antiguo a más reciente)
      });
    });

    return result.sort((a: any, b: any) => b.anio - a.anio || b.mes - a.mes);
  }, [quotesToBill]);

  // FUNCIÓN: VER PDF COMPLETO
  const handleViewPDF = async (q: any) => {
    setIsGeneratingPDF(q.id);
    try {
      const blob = await GeneradorPDF.generar(q, true, false); 
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (e) {
      toast({ title: "Error al abrir PDF", variant: "destructive" });
    } finally {
      setIsGeneratingPDF(null);
    }
  };

  // FUNCIÓN: DESCARGAR COMPLETO INDIVIDUAL
  const handleDownloadFullPDF = async (q: any) => {
    setIsGeneratingPDF(q.id + "_full");
    try {
      const blob = await GeneradorPDF.generar(q, true, false);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `COTIZACION-${q.id.slice(-6).toUpperCase()}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast({ title: "Error al descargar", variant: "destructive" });
    } finally {
      setIsGeneratingPDF(null);
    }
  };

  // FUNCIÓN CLAVE: DESCARGAR TODAS LAS COTIZACIONES DEL MES EN UN ARCHIVO COMPRIMIDO (.ZIP)
  const handleDownloadMonthZip = async (group: any) => {
    setIsDownloadingZip(group.key);
    try {
      const zip = new JSZip();
      
      for (const q of group.quotes) {
        try {
          const pdfBlob = await GeneradorPDF.generar(q, true, false);
          const trabajadorNombre = (q.solicitudesData?.[0]?.trabajador?.nombre || `ORDEN-${q.id.slice(-6)}`)
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "_");
          
          const fileName = `${q.id.slice(-6).toUpperCase()}_${trabajadorNombre}.pdf`;
          zip.file(fileName, pdfBlob);
        } catch (err) {
          console.error(`Error generando PDF para la cotización ${q.id}:`, err);
        }
      }

      const zipContent = await zip.generateAsync({ type: "blob" });
      const empresaLimpia = (group.empresa?.razonSocial || "EMPRESA").toUpperCase().replace(/[^A-Z0-9]/g, "_");
      const zipName = `${empresaLimpia}_${MESES[group.mes]}_${group.anio}.zip`;

      const url = URL.createObjectURL(zipContent);
      const a = document.createElement('a');
      a.href = url;
      a.download = zipName;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({ title: "✅ Descarga Completada", description: `Se descargaron ${group.quotes.length} documentos en el archivo ZIP.` });
    } catch (error) {
      toast({ title: "❌ Error", variant: "destructive", description: "No se pudo compilar la carpeta ZIP." });
    } finally {
      setIsDownloadingZip(null);
    }
  };

  // FUNCIÓN PARA SACAR UN TRABAJADOR ASOCIADO QUE NO ASISTIÓ
  const handleRemoveWorker = async (workerRut: string, workerName: string) => {
    if (!selectedQuote) return;
    
    if (confirm(`¿Confirmas que el trabajador ${workerName} no asistió y deseas removerlo de la cotización?`)) {
      setIsRemovingWorker(workerRut);
      const res = await eliminarTrabajadorDeCotizacion(selectedQuote.id, workerRut);
      
      if (res.success) {
        toast({ title: "✅ Nómina Actualizada", description: "El trabajador fue removido y el monto recalculado." });
        
        const updatedQuotes = quotesToBill?.find((q: any) => q.id === selectedQuote.id);
        if (updatedQuotes) {
          if (!updatedQuotes.solicitudesData || updatedQuotes.solicitudesData.length === 0) {
            setSelectedQuote(null);
          } else {
            setSelectedQuote(updatedQuotes);
          }
        } else {
          setSelectedQuote(null);
        }
        refetch();
      } else {
        toast({ title: "❌ Error al remover", variant: "destructive", description: res.error });
      }
      setIsRemovingWorker(null);
    }
  };

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin h-10 w-10 text-slate-300" /></div>;

  return (
    <div className='space-y-8 container mx-auto p-4 max-w-6xl pb-20 text-left'>
        <h1 className="text-2xl font-black uppercase text-slate-800 tracking-tighter italic leading-none">Facturación Consolidada</h1>
        
        <Card className="border-none shadow-xl bg-white overflow-hidden rounded-xl">
            <CardHeader className="bg-[#0a0a4d] text-white">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                    <FileClock className="h-4 w-4 text-blue-400"/> Cartera de Clientes Frecuentes
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-slate-900">
                        <TableRow>
                            <TableHead className="w-10"></TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-white tracking-widest">Periodo</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-white tracking-widest text-left">Empresa Cliente</TableHead>
                            <TableHead className="text-center text-[10px] font-black uppercase text-white tracking-widest">Órdenes</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase text-white tracking-widest">Monto</TableHead>
                            <TableHead className="text-right px-6 text-[10px] font-black uppercase text-white tracking-widest">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {groupedData.length === 0 && (
                            <TableRow><TableCell colSpan={6} className="py-20 text-center text-slate-400 font-bold uppercase text-xs">No hay órdenes pendientes para consolidar</TableCell></TableRow>
                        )}
                        {groupedData.map((group: any) => (
                            <React.Fragment key={group.key}>
                                <TableRow className="hover:bg-slate-50 border-slate-100">
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => setExpandedKey(expandedKey === group.key ? null : group.key)}>
                                            {expandedKey === group.key ? <ChevronUp className="h-4 w-4 text-blue-600"/> : <ChevronDown className="h-4 w-4 text-slate-400"/>}
                                        </Button>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className="bg-blue-50 text-blue-700 border-blue-100 font-black text-[9px] flex gap-1 w-fit">
                                            <Calendar className="w-2.5 h-2.5"/> {MESES[group.mes]} {group.anio}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-left"><div className="font-black text-slate-700 uppercase text-xs">{group.empresa?.razonSocial}</div></TableCell>
                                    <TableCell className="text-center"><Badge className="bg-slate-100 text-slate-600 font-black text-[10px]">{group.quotes.length}</Badge></TableCell>
                                    <TableCell className="text-right font-black text-emerald-600 text-xs">${group.totalAmount.toLocaleString('es-CL')}</TableCell>
                                    <TableCell className="text-right px-6 flex justify-end gap-2 items-center h-14">
                                        
                                        <Button
                                            variant="outline"
                                            className="border-blue-600 text-blue-600 hover:bg-blue-50 font-black text-[10px] uppercase tracking-widest h-9 px-4 flex items-center gap-2"
                                            disabled={isDownloadingZip === group.key}
                                            onClick={() => handleDownloadMonthZip(group)}
                                        >
                                            {isDownloadingZip === group.key ? (
                                                <Loader2 className="h-4 w-4 animate-spin"/>
                                            ) : (
                                                <FolderDown className="h-4 w-4" />
                                            )}
                                            Descargar PDFs
                                        </Button>

                                        <Button 
                                            className="bg-emerald-600 hover:bg-emerald-700 font-black text-[10px] uppercase tracking-widest h-9 px-6" 
                                            disabled={isProcessing === group.key}
                                            onClick={async () => {
                                                if(confirm(`¿Emitir factura consolidada de ${MESES[group.mes]} ${group.anio} para ${group.empresa?.razonSocial}?`)) {
                                                    setIsProcessing(group.key);
                                                    const res = await emitirDTEConsolidado(group.empresa?.rut, group.mes, group.anio);
                                                    if(res.success) { 
                                                        toast({title: "✅ Factura Emitida", description: `Folio: ${res.folio}`}); 
                                                        refetch(); 
                                                    } else { 
                                                        toast({title: "❌ Error", variant: "destructive", description: res.error}); 
                                                    }
                                                    setIsProcessing(null);
                                                }
                                            }}
                                        >
                                            {isProcessing === group.key ? <Loader2 className="h-4 w-4 animate-spin"/> : "Facturar Mes"}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                                {expandedKey === group.key && (
                                    <TableRow><TableCell colSpan={6} className="p-4 bg-slate-50/50">
                                        <div className="space-y-2">
                                            {group.quotes.map((q: any) => {
                                                // Formateo de la fecha de la cotización individual
                                                const rawDate = q.fechaCreacion?.toDate ? q.fechaCreacion.toDate() : null;
                                                const formattedQuoteDate = rawDate 
                                                    ? `${String(rawDate.getDate()).padStart(2, '0')}/${String(rawDate.getMonth() + 1).padStart(2, '0')}/${rawDate.getFullYear()}` 
                                                    : 'S/F';

                                                return (
                                                    <div key={q.id} className="flex justify-between p-3 border rounded-lg bg-white items-center shadow-sm">
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="text-[10px] font-mono font-black text-blue-600 leading-none">#{q.id.slice(-6).toUpperCase()}</span>
                                                                <span className="text-[9px] font-bold text-slate-400 font-mono leading-none">{formattedQuoteDate}</span>
                                                            </div>
                                                            <span className="text-xs font-black text-slate-600 uppercase truncate max-w-[200px]">{q.solicitudesData?.[0]?.trabajador?.nombre || 'S/N'}</span>
                                                            
                                                            <button 
                                                                onClick={() => setSelectedQuote(q)}
                                                                className="flex items-center gap-1 bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 transition-colors border border-slate-200 rounded px-2 py-0.5 text-[9px] font-black uppercase shadow-sm"
                                                                title="Gestionar Asistencia de Trabajadores"
                                                            >
                                                                <User className="w-2.5 h-2.5 text-blue-500"/> {q.solicitudesData?.length || 0} PACIENTES
                                                            </button>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-4">
                                                            {/* MONTO VISUAL ASOCIADO A ESTA COTIZACIÓN INDIVIDUAL */}
                                                            <span className="text-xs font-black text-slate-700">
                                                                ${(q.total || 0).toLocaleString('es-CL')}
                                                            </span>

                                                            <div className="flex gap-2">
                                                                <Button 
                                                                    variant="ghost" size="icon" title="Ver Cotización Completa" className="h-8 w-8 text-slate-400 hover:text-blue-600" 
                                                                    disabled={isGeneratingPDF === q.id}
                                                                    onClick={() => handleViewPDF(q)}
                                                                >
                                                                    {isGeneratingPDF === q.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Eye className="h-4 w-4"/>}
                                                                </Button>
                                                                
                                                                <Button 
                                                                    variant="ghost" size="icon" title="Descargar Cotización Completa" className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100" 
                                                                    disabled={isGeneratingPDF === q.id + "_full"}
                                                                    onClick={() => handleDownloadFullPDF(q)}
                                                                >
                                                                    {isGeneratingPDF === q.id + "_full" ? <Loader2 className="h-4 w-4 animate-spin"/> : <Download className="h-4 w-4"/>}
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-300 hover:text-red-600" onClick={async () => { if(confirm("¿Eliminar esta orden del grupo?")) { await deleteDoc(doc(firestore, 'cotizaciones', q.id!)); refetch(); } }}><Trash2 className="h-4 w-4"/></Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </TableCell></TableRow>
                                )}
                            </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        {/* MODAL DE CONTROL DE ASISTENCIA */}
        {selectedQuote && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
                    <div className="bg-[#0a0a4d] p-4 text-white flex justify-between items-center">
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-wider text-blue-400">Control de Asistencia</h3>
                            <p className="text-[10px] font-mono opacity-80 mt-0.5">ORDEN: #{selectedQuote.id.slice(-6).toUpperCase()}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white h-8 w-8" onClick={() => setSelectedQuote(null)}>
                            <X className="h-4 w-4"/>
                        </Button>
                    </div>
                    
                    <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-slate-50/50">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Lista de Trabajadores Inscritos:</p>
                        
                        {(selectedQuote.solicitudesData || []).map((sol: any, idx: number) => {
                            const rutTrabajador = sol.trabajador?.rut || '';
                            const nombreTrabajador = sol.trabajador?.nombre || 'SIN NOMBRE';
                            
                            return (
                                <div key={rutTrabajador || idx} className="flex justify-between items-center bg-white p-3 border border-slate-100 rounded-lg shadow-sm hover:border-slate-200 transition-all">
                                    <div className="space-y-0.5 text-left">
                                        <div className="font-black text-slate-700 uppercase text-xs">{nombreTrabajador}</div>
                                        <div className="text-[10px] font-mono text-slate-400">{rutTrabajador}</div>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {(sol.examenes || []).map((ex: any, eIdx: number) => (
                                                <Badge key={eIdx} variant="outline" className="text-[8px] bg-slate-50 border-slate-200 text-slate-500 font-bold uppercase px-1 py-0">
                                                    {ex.nombre}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="text-red-300 hover:text-red-600 hover:bg-red-50 h-8 w-8 rounded-md transition-colors"
                                        title="Remover por Inasistencia"
                                        disabled={isRemovingWorker === rutTrabajador}
                                        onClick={() => handleRemoveWorker(rutTrabajador, nombreTrabajador)}
                                    >
                                        {isRemovingWorker === rutTrabajador ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin text-red-600"/>
                                        ) : (
                                            <Trash2 className="h-4 w-4"/>
                                        )}
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                    
                    <div className="p-3 border-t bg-white flex justify-end">
                        <Button 
                            className="bg-slate-900 hover:bg-slate-800 font-black text-[10px] uppercase tracking-widest h-8" 
                            onClick={() => setSelectedQuote(null)}
                        >
                            Cerrar Panel
                        </Button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}