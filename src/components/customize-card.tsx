"use client";

import React, { useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Image as ImageIcon, Wand2, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface CustomizeCardProps {
  currentBackground: string;
  onSetBackground: (dataUrl: string) => void;
  onGenerateSlogan: (theme: string) => Promise<void>;
}

export default function CustomizeCard({ currentBackground, onSetBackground, onGenerateSlogan }: CustomizeCardProps) {
  const backgroundFileRef = useRef<HTMLInputElement>(null);
  const [sloganTheme, setSloganTheme] = useState('');
  const [isSloganLoading, setIsSloganLoading] = useState(false);
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

  const handleSloganGeneration = async () => {
    if (!sloganTheme.trim()) {
        toast({ variant: 'destructive', title: 'Tema necessário', description: 'Digite um tema para gerar o lema.' });
        return;
    }
    setIsSloganLoading(true);
    await onGenerateSlogan(sloganTheme);
    setIsSloganLoading(false);
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Wand2 />
          Personalização
        </CardTitle>
        <CardDescription>Altere o fundo e gere um lema com IA.</CardDescription>
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
        
        <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2"><Wand2 size={16}/>Gerador de Lema com IA</h3>
            <div className="flex gap-2">
                <Input 
                    placeholder="Tema (ex: futuro, sucesso)" 
                    value={sloganTheme}
                    onChange={(e) => setSloganTheme(e.target.value)}
                />
                <Button onClick={handleSloganGeneration} disabled={isSloganLoading}>
                    {isSloganLoading ? <Loader2 className="animate-spin" /> : "Gerar"}
                </Button>
            </div>
            <p className="text-xs text-muted-foreground">A IA criará um lema inspirador para os crachás.</p>
        </div>
      </CardContent>
    </Card>
  );
}
