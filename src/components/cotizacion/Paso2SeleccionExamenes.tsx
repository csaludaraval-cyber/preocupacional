"use client";

import React, { useEffect, useState, useMemo } from 'react';
import type { Examen } from '@/lib/types';
import { getExams } from '@/lib/data';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, SearchX } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';

interface Props {
  selectedExams: Examen[];
  onExamToggle: (exam: Examen, checked: boolean) => void;
  showPrice?: boolean;
}

// COMPONENTE DE TABLA
function ListaExamenes({ 
  data, 
  selectedIds, 
  onToggle 
}: { 
  data: Examen[], 
  selectedIds: Set<string>, 
  onToggle: (exam: Examen, checked: boolean) => void 
}) {
  if (data.length === 0) {
    return (
      <Table>
        <TableBody>
          <TableRow>
            {/* CORRECCIÓN DEFINITIVA: USANDO "3" COMO STRING PARA EVITAR LLAVES VACÍAS */}
            <TableCell colSpan={3} className="text-center py-20 text-slate-400 text-xs">
              <div className="flex flex-col items-center">
                <SearchX className="h-8 w-8 mb-2 opacity-20" />
                <span>No hay resultados en esta categoría.</span>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  }

  return (
    <Table>
      <TableHeader className="bg-slate-50 sticky top-0 z-10">
        <TableRow>
          <TableHead className="font-bold uppercase text-[10px] py-4 text-slate-500 text-left">Examen / Batería</TableHead>
          <TableHead className="font-bold uppercase text-[10px] text-slate-500 text-left">Descripción / Componentes</TableHead>
          <TableHead className="text-center font-bold uppercase text-[10px] text-slate-500 w-24">Seleccionar</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((exam) => (
          <TableRow key={exam.id} className="hover:bg-blue-50/30 transition-colors border-slate-100">
            <TableCell className="py-4 text-left">
              <div className="flex flex-col">
                <span className="font-bold text-slate-700 text-xs uppercase">{exam.nombre}</span>
                <span className="text-[9px] font-mono text-slate-400">{exam.codigo}</span>
              </div>
            </TableCell>
            <TableCell className="text-[11px] text-slate-500 italic text-left">
              {/* @ts-ignore */}
              {exam.descripcion || "Sin descripción detallada."}
            </TableCell>
            <TableCell className="text-center">
              <Checkbox 
                checked={selectedIds.has(exam.id)}
                onCheckedChange={(checked) => onToggle(exam, !!checked)}
                className="h-5 w-5 border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function Paso2SeleccionExamenes({ selectedExams, onExamToggle, showPrice = false }: Props) {
  const [allExams, setAllExams] = useState<Examen[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    async function loadExams() {
      setLoading(true);
      try {
        const examsData = await getExams();
        setAllExams(examsData);
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo cargar el catálogo." });
      } finally {
        setLoading(false);
      }
    }
    loadExams();
  }, [toast]);

  const selectedExamIds = useMemo(() => new Set(selectedExams.map(e => e.id)), [selectedExams]);

  const getFilteredData = (subtipo: string) => {
    return allExams.filter(exam => {
      // @ts-ignore
      const matchSubtipo = (exam.subtipo || "examen") === subtipo;
      const lowerSearch = searchTerm.toLowerCase();
      const matchSearch = 
        (exam?.nombre || "").toLowerCase().includes(lowerSearch) || 
        (exam?.codigo || "").toLowerCase().includes(lowerSearch);
      return matchSubtipo && matchSearch;
    }).sort((a, b) => (a?.nombre || "").localeCompare(b?.nombre || ""));
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-[40vh] w-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input 
          placeholder="Filtrar por nombre o código..."
          className="pl-10 bg-slate-50 border-slate-200 h-11 text-sm rounded-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Tabs defaultValue="empresa" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4 bg-[#0a0a4d] p-0 h-12 rounded-lg border-none shadow-md overflow-hidden">
          <TabsTrigger 
            value="empresa" 
            className="h-full rounded-none text-[11px] font-bold uppercase transition-all text-white/65 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            Batería Empresa
          </TabsTrigger>
          <TabsTrigger 
            value="bateria" 
            className="h-full rounded-none text-[11px] font-bold uppercase transition-all text-white/65 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            Batería Preocupacional
          </TabsTrigger>
          <TabsTrigger 
            value="examen" 
            className="h-full rounded-none text-[11px] font-bold uppercase transition-all text-white/65 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            Examen Complementario
          </TabsTrigger>
        </TabsList>
        
        {['empresa', 'bateria', 'examen'].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-0 focus-visible:outline-none">
            <ScrollArea className="h-[50vh] border rounded-md bg-white">
              <ListaExamenes data={getFilteredData(tab)} selectedIds={selectedExamIds} onToggle={onExamToggle} />
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
      
      <div className="bg-slate-50 p-4 rounded-lg flex items-center justify-between border border-slate-200">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resumen de selección</span>
        <span className="text-xs font-black text-blue-600 uppercase italic">
          {selectedExams.length} ítems añadidos
        </span>
      </div>
    </div>
  );
}