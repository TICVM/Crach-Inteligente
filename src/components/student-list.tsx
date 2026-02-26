
"use client";

import React, { useState } from 'react';
import { type Student, type BadgeModel } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Loader2, Layout, CheckCircle2, Circle } from 'lucide-react';
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from './ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { compressImage } from '@/lib/image-utils';
import StudentBadge from './student-badge';
import { type BadgeStyleConfig } from '@/lib/badge-styles';

interface StudentListProps {
  students: Student[];
  models: BadgeModel[];
  onUpdate: (student: Student) => void;
  onDelete: (studentId: string) => void;
  viewMode: 'table' | 'grid';
  currentLiveBackground?: string;
  currentLiveStyle?: BadgeStyleConfig;
}

export default function StudentList({ 
  students, 
  models, 
  onUpdate, 
  onDelete, 
  viewMode,
  currentLiveBackground,
  currentLiveStyle
}: StudentListProps) {
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formSchema = z.object({
    nome: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
    turma: z.string().min(1, "A turma é obrigatória."),
    fotoUrl: z.any().optional(),
    modeloId: z.string().optional(),
  });

  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });
  
  const photoRef = form.register("fotoUrl");

  const handleEditClick = (student: Student) => {
    setEditingStudent(student);
    form.reset({
        nome: student.nome,
        turma: student.turma,
        fotoUrl: undefined,
        modeloId: student.modeloId || "",
    });
    setIsDialogOpen(true);
  };

  const toggleStudentEnabled = (student: Student, enabled: boolean) => {
    onUpdate({ ...student, enabled });
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (!editingStudent) return;
    setIsSubmitting(true);
    
    try {
      const file = data.fotoUrl?.[0];
      const updateData: Student = { 
        ...editingStudent, 
        nome: data.nome, 
        turma: data.turma, 
        modeloId: data.modeloId 
      };

      if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          updateData.fotoUrl = await compressImage(e.target?.result as string);
          onUpdate(updateData);
          finalizeEdit();
        };
        reader.readAsDataURL(file);
      } else {
        onUpdate(updateData);
        finalizeEdit();
      }
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
    }
  };

  const finalizeEdit = () => {
    setIsDialogOpen(false);
    setEditingStudent(null);
    setIsSubmitting(false);
  };

  if (students.length === 0) {
    return (
      <div className="text-center py-20 bg-muted/20 rounded-lg border border-dashed">
        <p className="text-muted-foreground">Nenhum aluno cadastrado ainda.</p>
        <p className="text-xs text-muted-foreground mt-1">Use o formulário à esquerda para começar.</p>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {students.map((student) => {
          const model = models.find(m => m.id === student.modeloId);
          const isEnabled = student.enabled !== false;
          return (
            <div key={student.id} className={`relative group border rounded-lg overflow-hidden transition-all ${!isEnabled ? 'opacity-40 grayscale-[0.5]' : ''}`}>
              <StudentBadge 
                student={student} 
                background={model?.fundoCrachaUrl || currentLiveBackground || ''} 
                styles={model?.badgeStyle || currentLiveStyle || ({} as BadgeStyleConfig)} 
              />
              <div className="absolute top-2 left-2 z-30">
                 <Button 
                    variant={isEnabled ? "default" : "outline"} 
                    size="sm" 
                    className="h-8 gap-2 bg-white text-black hover:bg-white/90 shadow-lg"
                    onClick={() => toggleStudentEnabled(student, !isEnabled)}
                  >
                    {isEnabled ? <CheckCircle2 size={16} className="text-green-500" /> : <Circle size={16} />}
                    {isEnabled ? "Ativo" : "Inativo"}
                  </Button>
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-30">
                <Button size="icon" variant="secondary" className="h-8 w-8 shadow-md" onClick={() => handleEditClick(student)}>
                  <Pencil size={14} />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="destructive" className="h-8 w-8 shadow-md">
                      <Trash2 size={14} />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir Aluno?</AlertDialogTitle>
                      <AlertDialogDescription>Remover {student.nome} permanentemente.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Não</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(student.id)}>Sim, Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead className="w-[80px]">Foto</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Turma</TableHead>
              <TableHead>Design Aplicado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => {
              const model = models.find(m => m.id === student.modeloId);
              const isEnabled = student.enabled !== false;
              return (
                <TableRow key={student.id} className={!isEnabled ? "opacity-50" : ""}>
                  <TableCell>
                    <Checkbox 
                      checked={isEnabled} 
                      onCheckedChange={(checked) => toggleStudentEnabled(student, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>
                    <Avatar className="h-10 w-10 border">
                      <AvatarImage src={student.fotoUrl} alt={student.nome} className="object-cover" />
                      <AvatarFallback>{student.nome.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{student.nome}</TableCell>
                  <TableCell>{student.turma}</TableCell>
                  <TableCell>
                    {model ? (
                      <Badge variant="secondary" className="gap-1">
                        <Layout size={10} />
                        {model.nomeModelo}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Padrão</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(student)} className="h-8 w-8">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover aluno?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Os dados de {student.nome} serão excluídos permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(student.id)} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

       <Dialog open={isDialogOpen} onOpenChange={(open) => !open && finalizeEdit()}>
        {editingStudent && (
            <DialogContent>
            <DialogHeader>
                <DialogTitle>Editar Aluno</DialogTitle>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="turma"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Turma</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                    control={form.control}
                    name="modeloId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Modelo de Crachá</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Escolha um design" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {models.map(m => (
                                    <SelectItem key={m.id} value={m.id}>{m.nomeModelo}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                <FormField
                    control={form.control}
                    name="fotoUrl"
                    render={() => (
                    <FormItem>
                        <FormLabel>Nova Foto (opcional)</FormLabel>
                        <FormControl><Input type="file" accept="image/*" {...photoRef} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <DialogFooter className="pt-4">
                    <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancelar</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : null}
                      Salvar Alterações
                    </Button>
                </DialogFooter>
                </form>
            </Form>
            </DialogContent>
        )}
       </Dialog>
    </>
  );
}
