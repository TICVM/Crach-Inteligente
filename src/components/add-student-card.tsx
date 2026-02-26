
"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { type Student, type BadgeModel } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Loader2 } from "lucide-react";
import React, { useEffect } from "react";
import { compressImage } from "@/lib/image-utils";

interface AddStudentCardProps {
  onAddStudent: (student: Omit<Student, "id">) => void;
  models: BadgeModel[];
  activeModelId?: string;
}

export default function AddStudentCard({ onAddStudent, models, activeModelId }: AddStudentCardProps) {
  const { toast } = useToast();

  const formSchema = z.object({
    nome: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
    turma: z.string().min(1, "A turma é obrigatória."),
    fotoUrl: z.any().refine(fileList => fileList && fileList.length === 1, "A foto é obrigatória."),
    modeloId: z.string().optional(),
  });
  
  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: "",
      turma: "",
      fotoUrl: undefined,
      modeloId: activeModelId || "",
    },
  });

  // Atualiza o modeloId no form quando o modelo ativo muda
  useEffect(() => {
    if (activeModelId) {
      form.setValue('modeloId', activeModelId);
    }
  }, [activeModelId, form]);

  const photoRef = form.register("fotoUrl");

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    const file = data.fotoUrl?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const rawPhotoDataUrl = e.target?.result as string;
        try {
          const optimizedPhoto = await compressImage(rawPhotoDataUrl);
          onAddStudent({ 
            nome: data.nome, 
            turma: data.turma, 
            fotoUrl: optimizedPhoto,
            modeloId: data.modeloId || "",
            enabled: true
          });
          
          form.reset({
              nome: "",
              turma: "",
              fotoUrl: undefined,
              modeloId: activeModelId || "",
          });
        } catch (error) {
          toast({ variant: "destructive", title: "Erro", description: "Falha ao processar foto." });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <UserPlus />
          Novo Aluno
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do aluno" {...field} />
                  </FormControl>
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
                    <FormControl>
                        <Input placeholder="Ex: 101" {...field} />
                    </FormControl>
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
                  <FormLabel>Foto</FormLabel>
                  <FormControl>
                    <Input type="file" accept="image/*" {...photoRef} className="cursor-pointer" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : "Registrar Aluno"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
