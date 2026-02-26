
"use client";

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { type Student, type BadgeModel } from '@/lib/types';
import { Upload, Loader2, Layout } from 'lucide-react';
import { compressImage } from '@/lib/image-utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface BulkImportCardProps {
  onImport: (students: Omit<Student, 'id'>[]) => void;
  models: BadgeModel[];
}

export default function BulkImportCard({ onImport, models }: BulkImportCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string>("default");
  const excelFileRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImport = async () => {
    const excelFile = excelFileRef.current?.files?.[0];
    const photoFiles = photosRef.current?.files;

    if (!excelFile || !photoFiles || photoFiles.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Arquivos ausentes',
        description: 'Selecione o arquivo Excel e as fotos dos alunos.',
      });
      return;
    }

    setIsLoading(true);

    try {
      const data = await excelFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Obtém todas as linhas como arrays de strings (header: 1)
      const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
      
      // 1. Filtrar linhas que estão realmente vazias (sem dados úteis nas primeiras colunas)
      const filteredRows = rawRows.filter(row => {
        if (!row || row.length < 1) return false;
        const nomeValue = String(row[0] || '').trim();
        const turmaValue = String(row[1] || '').trim();
        return nomeValue !== '' || turmaValue !== '';
      });

      // 2. Detectar e ignorar o cabeçalho
      // Se a primeira linha válida contém as palavras "Nome" ou "Turma", é o cabeçalho.
      let studentData = filteredRows;
      if (filteredRows.length > 0) {
        const firstRow = filteredRows[0];
        const cell1 = String(firstRow[0] || '').toLowerCase();
        const cell2 = String(firstRow[1] || '').toLowerCase();
        
        const isHeader = cell1.includes('nome') || cell1.includes('name') || 
                         cell2.includes('turma') || cell2.includes('class');
        
        if (isHeader) {
          studentData = filteredRows.slice(1);
        }
      }

      const sortedPhotos = Array.from(photoFiles).sort((a, b) => 
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      );

      // Verificação de quantidade após remover o cabeçalho
      if (studentData.length !== sortedPhotos.length) {
        toast({
          variant: 'destructive',
          title: 'Erro de correspondência',
          description: `Foram detectados ${studentData.length} alunos válidos no Excel, mas você selecionou ${sortedPhotos.length} fotos. As quantidades devem ser iguais.`,
        });
        setIsLoading(false);
        return;
      }
      
      const promises = studentData.map((row, index) => {
        const nome = row[0]?.toString().trim();
        const turma = row[1]?.toString().trim();
        const photoFile = sortedPhotos[index];

        if (!nome || !turma || !photoFile) return null;
        
        return new Promise<Omit<Student, 'id'>>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const rawFotoUrl = e.target?.result as string;
                try {
                  const optimizedFoto = await compressImage(rawFotoUrl);
                  resolve({ 
                    nome, 
                    turma, 
                    fotoUrl: optimizedFoto, 
                    enabled: true,
                    modeloId: selectedModelId === "default" ? undefined : selectedModelId
                  });
                } catch (err) {
                  reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(photoFile);
        });
      }).filter(Boolean);

      const importedStudents = await Promise.all(promises as Promise<Omit<Student, 'id'>>[]);
      onImport(importedStudents);
      
      toast({
        title: "Sucesso!",
        description: `${importedStudents.length} alunos importados com sucesso.`,
      });

    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro na importação',
        description: 'Verifique se o Excel segue o formato esperado (Coluna A: Nome, Coluna B: Turma).',
      });
    } finally {
      setIsLoading(false);
      if(excelFileRef.current) excelFileRef.current.value = "";
      if(photosRef.current) photosRef.current.value = "";
      setSelectedModelId("default");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Upload />
          Importação em Massa
        </CardTitle>
        <CardDescription>Importe via Excel e associe com fotos locais.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Layout size={14} /> Modelo de Design (Opcional)
          </Label>
          <Select onValueChange={setSelectedModelId} value={selectedModelId}>
            <SelectTrigger>
              <SelectValue placeholder="Design Aplicado (Padrão)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Design Aplicado (Padrão)</SelectItem>
              {models.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.nomeModelo}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="excelFileUnico" className="text-sm font-medium">Arquivo Excel (.xlsx)</Label>
          <Input id="excelFileUnico" type="file" accept=".xlsx" ref={excelFileRef} />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="fotosEmMassa" className="text-sm font-medium">Fotos dos Alunos</Label>
          <Input id="fotosEmMassa" type="file" accept="image/*" multiple ref={photosRef} />
        </div>

        <div className="text-xs text-muted-foreground bg-secondary/50 p-3 rounded-md border border-dashed">
            <b>Nota:</b> O sistema ignora automaticamente a linha de título (Nome/Turma). Garanta que a ordem das fotos selecionadas corresponda à ordem do Excel.
        </div>
        
        <Button onClick={handleImport} className="w-full shadow-sm" disabled={isLoading}>
          {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Upload className="mr-2" />}
          Importar Lote
        </Button>
      </CardContent>
    </Card>
  );
}
