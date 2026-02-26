
"use client";

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { type Student } from '@/lib/types';
import { Upload, Loader2 } from 'lucide-react';
import { compressImage } from '@/lib/image-utils';

interface BulkImportCardProps {
  onImport: (students: Omit<Student, 'id'>[]) => void;
}

export default function BulkImportCard({ onImport }: BulkImportCardProps) {
  const [isLoading, setIsLoading] = useState(false);
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
      const json = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });
      
      const studentData = json.slice(1); // Ignora o cabeçalho
      const sortedPhotos = Array.from(photoFiles).sort((a, b) => 
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      );

      if (studentData.length !== sortedPhotos.length) {
        toast({
          variant: 'destructive',
          title: 'Erro de correspondência',
          description: `O arquivo Excel tem ${studentData.length} alunos, mas ${sortedPhotos.length} fotos foram selecionadas. A quantidade deve ser a mesma.`,
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
                  // Otimiza cada foto durante a importação em massa
                  const optimizedFoto = await compressImage(rawFotoUrl);
                  resolve({ nome, turma, fotoUrl: optimizedFoto, enabled: true });
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

    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro na importação',
        description: 'Não foi possível processar os arquivos. Verifique o formato.',
      });
    } finally {
      setIsLoading(false);
      if(excelFileRef.current) excelFileRef.current.value = "";
      if(photosRef.current) photosRef.current.value = "";
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
        <div>
          <label htmlFor="excelFileUnico" className="text-sm font-medium">Arquivo Excel (.xlsx)</label>
          <Input id="excelFileUnico" type="file" accept=".xlsx" ref={excelFileRef} />
        </div>
        <div>
          <label htmlFor="fotosEmMassa" className="text-sm font-medium">Fotos dos Alunos</label>
          <Input id="fotosEmMassa" type="file" accept="image/*" multiple ref={photosRef} />
        </div>
        <div className="text-xs text-muted-foreground bg-secondary p-2 rounded-md">
            <b>Dica:</b> O sistema associará a primeira linha do Excel à primeira foto, a segunda à segunda, e assim por diante. Renomeie suas fotos em ordem (ex: `aluno_01.jpg`, `aluno_02.jpg`) para garantir a associação correta.
        </div>
        <Button onClick={handleImport} className="w-full" disabled={isLoading}>
          {isLoading ? <Loader2 className="animate-spin" /> : 'Importar Alunos'}
        </Button>
      </CardContent>
    </Card>
  );
}
