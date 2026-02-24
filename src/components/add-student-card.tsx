"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { type Student } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Loader2 } from "lucide-react";
import React from "react";
import { type BadgeStyleConfig } from "@/lib/badge-styles";


interface AddStudentCardProps {
  onAddStudent: (student: Omit<Student, "id">) => void;
  badgeStyle: BadgeStyleConfig;
}

export default function AddStudentCard({ onAddStudent, badgeStyle }: AddStudentCardProps) {
  const { toast } = useToast();

  const formSchema = React.useMemo(() => {
    const customFieldsSchema = badgeStyle.customFields.reduce((acc, field) => {
      acc[field.id] = z.string().optional();
      return acc;
    }, {} as Record<string, z.ZodOptional<z.ZodString>>);

    return z.object({
      nome: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
      turma: z.string().min(1, "A turma é obrigatória."),
      fotoUrl: z.any().refine(fileList => fileList && fileList.length === 1, "A foto é obrigatória."),
      ...customFieldsSchema,
    });
  }, [badgeStyle.customFields]);
  
  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: "",
      turma: "",
      fotoUrl: undefined,
    },
  });

  const photoRef = form.register("fotoUrl");

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    const file = data.fotoUrl?.[0];
    if (file) {
      const { nome, turma, fotoUrl, ...customDataValues } = data;
      
      const customData = Object.entries(customDataValues).reduce((acc, [key, value]) => {
          if (value) {
            acc[key] = value as string;
          }
          return acc;
      }, {} as { [key: string]: string });

      const reader = new FileReader();
      reader.onload = (e) => {
        const photoDataUrl = e.target?.result as string;
        onAddStudent({ nome, turma, fotoUrl: photoDataUrl, customData });
        form.reset();
        // Manually reset custom fields as well
        const defaultCustomValues: {[key: string]: string} = {};
        badgeStyle.customFields.forEach(f => defaultCustomValues[f.id] = '');
        form.reset({
            nome: "",
            turma: "",
            fotoUrl: undefined,
            ...defaultCustomValues,
        });

      };
      reader.onerror = () => {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível ler a imagem.",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <UserPlus />
          Registro Manual de Aluno
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
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o nome do aluno" {...field} />
                  </FormControl>
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
                  <FormControl>
                    <Input placeholder="Digite a turma" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fotoUrl"
              render={() => (
                <FormItem>
                  <FormLabel>Foto</FormLabel>
                  <FormControl>
                    <Input type="file" accept="image/*" {...photoRef} />
                  </FormControl>
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
                        <Input placeholder={`Digite o ${field.label.toLowerCase()}`} {...formField} value={formField.value || ''} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            ))}
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : "Adicionar Aluno"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
