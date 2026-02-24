"use client";

import React, { useState } from 'react';
import { type Student } from '@/lib/types';
import { type BadgeStyleConfig } from '@/lib/badge-styles';
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

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pencil, Trash2 } from 'lucide-react';
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from './ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';

interface StudentListProps {
  students: Student[];
  onUpdate: (student: Student) => void;
  onDelete: (studentId: string) => void;
  badgeStyle: BadgeStyleConfig;
}

export default function StudentList({ students, onUpdate, onDelete, badgeStyle }: StudentListProps) {
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const formSchema = React.useMemo(() => {
    const customFieldsSchema = badgeStyle.customFields.reduce((acc, field) => {
      acc[field.id] = z.string().optional();
      return acc;
    }, {} as Record<string, z.ZodOptional<z.ZodString>>);

    return z.object({
      nome: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
      turma: z.string().min(1, "A turma é obrigatória."),
      fotoUrl: z.any().optional(),
      ...customFieldsSchema,
    });
  }, [badgeStyle.customFields]);

  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });
  
  const photoRef = form.register("fotoUrl");

  const handleEditClick = (student: Student) => {
    setEditingStudent(student);
    const defaultCustomValues: {[key: string]: string} = {};
    badgeStyle.customFields.forEach(field => {
        defaultCustomValues[field.id] = student.customData?.[field.id] || '';
    });
    form.reset({
        nome: student.nome,
        turma: student.turma,
        fotoUrl: undefined,
        ...defaultCustomValues,
    });
    setIsDialogOpen(true);
  };

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    if (!editingStudent) return;
    
    const { nome, turma, fotoUrl, ...customDataValues } = data;
    const customData = Object.entries(customDataValues).reduce((acc, [key, value]) => {
        if (value) {
            acc[key] = value as string;
        }
        return acc;
    }, {} as { [key: string]: string });
    
    const file = data.fotoUrl?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const photoDataUrl = e.target?.result as string;
        onUpdate({ ...editingStudent, nome: data.nome, turma: data.turma, fotoUrl: photoDataUrl, customData });
        setIsDialogOpen(false);
        setEditingStudent(null);
      };
      reader.readAsDataURL(file);
    } else {
      onUpdate({ ...editingStudent, nome: data.nome, turma: data.turma, customData });
      setIsDialogOpen(false);
      setEditingStudent(null);
    }
  };

  if (students.length === 0) {
    return <p className="text-muted-foreground text-center">Nenhum aluno cadastrado.</p>;
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Foto</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Turma</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id}>
                <TableCell>
                  <Avatar>
                    <AvatarImage src={student.fotoUrl} alt={student.nome} />
                    <AvatarFallback>{student.nome.charAt(0)}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">{student.nome}</TableCell>
                <TableCell>{student.turma}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleEditClick(student)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. Isso removerá permanentemente os dados do aluno.
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
            ))}
          </TableBody>
        </Table>
      </div>

       <Dialog open={isDialogOpen} onOpenChange={(open) => {
         if (!open) {
           setEditingStudent(null);
         }
         setIsDialogOpen(open);
       }}>
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
                    name="fotoUrl"
                    render={() => (
                    <FormItem>
                        <FormLabel>Nova Foto (opcional)</FormLabel>
                        <FormControl><Input type="file" accept="image/*" {...photoRef} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                {badgeStyle.customFields.map((field) => (
                    <FormField
                        key={field.id}
                        control={form.control}
                        name={field.id}
                        render={({ field: formField }) => (
                        <FormItem>
                            <FormLabel>{field.label}</FormLabel>
                            <FormControl>
                            <Input placeholder={`Digite o ${field.label.toLowerCase()}`} {...formField} value={formField.value || ''}/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                ))}
                <DialogFooter>
                    <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancelar</Button>
                    </DialogClose>
                    <Button type="submit">Salvar Alterações</Button>
                </DialogFooter>
                </form>
            </Form>
            </DialogContent>
        )}
       </Dialog>
    </>
  );
}
