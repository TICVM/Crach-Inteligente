"use client";

import React, { useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Image as ImageIcon, Wand2 } from 'lucide-react';
import Image from 'next/image';

interface CustomizeCardProps {
  currentBackground: string;
  onSetBackground: (dataUrl: string) => void;
}

export default function CustomizeCard({ currentBackground, onSetBackground }: CustomizeCardProps) {
  const backgroundFileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleBackgroundChange = () => {
    const file = backgroundFileRef.current?.files?.[0];
    if (!file) {
      toast({ variant: 'destructive', title: 'Nenhum arquivo selecionado.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      onSetBackground(e.target?.result as string);
      toast({ title: 'Fundo atualizado!' });
    };
    reader.readAsDataURL(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Wand2 />
          Personalização
        </CardTitle>
        <CardDescription>Altere o fundo do crachá.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2"><ImageIcon size={16}/>Fundo do Crachá</h3>
            <div className="flex items-center gap-4">
                <div className="w-20 h-14 relative rounded-md overflow-hidden border">
                    {currentBackground && <Image src={currentBackground} alt="Fundo atual" fill className="object-cover" />}
                </div>
                <div className="flex-1">
                    <Input type="file" accept="image/*" ref={backgroundFileRef} onChange={handleBackgroundChange} />
                    <p className="text-xs text-muted-foreground mt-1">Selecione uma imagem para o fundo.</p>
                </div>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
