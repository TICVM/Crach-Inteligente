
"use client";

import React, { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Wand2, Trash2, PlusCircle, Loader2, Save, Plus, Palette } from 'lucide-react';
import NextImage from 'next/image';
import { type BadgeStyleConfig, type CustomField, type TextStyle, type PhotoStyle, defaultBadgeStyle } from '@/lib/badge-styles';
import { type BadgeModel } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import { compressImage } from '@/lib/image-utils';
import { PlaceHolderImages } from '@/lib/placeholder-images';

interface CustomizeCardProps {
  activeModel: BadgeModel | null;
  onSaveModel: (name: string, background: string, style: BadgeStyleConfig) => void;
  onReset: () => void;
}

const safeParseInt = (val: string): number => {
  const parsed = parseInt(val);
  return isNaN(parsed) ? 0 : parsed;
};

const StyleInput = ({ label, value, onChange, unit = 'px', ...props }: { label: string, value: number, onChange: (e: ChangeEvent<HTMLInputElement>) => void, unit?: string, [key: string]: any }) => (
  <div className="grid grid-cols-2 items-center gap-2">
    <Label className="text-xs">{label}</Label>
    <div className="flex items-center gap-1">
      <Input type="number" value={isNaN(value) ? 0 : value} onChange={onChange} className="h-8 w-20" {...props} />
      <span className="text-xs text-muted-foreground">{unit}</span>
    </div>
  </div>
);

const ColorInput = ({ label, value, onChange }: { label: string, value: string, onChange: (e: ChangeEvent<HTMLInputElement>) => void }) => (
  <div className="grid grid-cols-2 items-center gap-2">
    <Label className="text-xs">{label}</Label>
    <Input type="color" value={value || "#000000"} onChange={onChange} className="h-8 w-20 p-1" />
  </div>
);

const OpacitySlider = ({ label, value, onChange }: { label: string, value: number, onChange: (value: number[]) => void }) => (
    <div className="grid grid-cols-2 items-center gap-2">
        <Label className="text-xs">{label}</Label>
        <Slider value={[isNaN(value) ? 0 : value]} onValueChange={onChange} max={1} step={0.1} />
    </div>
);

export default function CustomizeCard({ activeModel, onSaveModel, onReset }: CustomizeCardProps) {
  const [modelName, setModelName] = useState("");
  const [background, setBackground] = useState("");
  const [badgeStyle, setBadgeStyle] = useState<BadgeStyleConfig>(defaultBadgeStyle);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const backgroundFileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (activeModel) {
      setModelName(activeModel.nomeModelo);
      setBackground(activeModel.fundoCrachaUrl);
      setBadgeStyle(activeModel.badgeStyle);
    } else {
      setModelName("");
      setBackground(PlaceHolderImages.find(img => img.id === 'default-background')?.imageUrl || "");
      setBadgeStyle(defaultBadgeStyle);
    }
  }, [activeModel]);

  const handleBackgroundChange = () => {
    const file = backgroundFileRef.current?.files?.[0];
    if (!file) return;
    
    setIsOptimizing(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const rawDataUrl = e.target?.result as string;
      try {
        // Redimensiona o fundo para o tamanho base do crachá para economizar espaço no banco
        const optimizedBackground = await compressImage(rawDataUrl, 1063, 768, 0.7);
        setBackground(optimizedBackground);
      } catch (error) {
        toast({ variant: "destructive", title: "Erro na imagem", description: "Não foi possível processar o fundo." });
      } finally {
        setIsOptimizing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStyleChange = (section: keyof BadgeStyleConfig, key: keyof (PhotoStyle | TextStyle), value: any) => {
    setBadgeStyle({
      ...badgeStyle,
      [section]: {
        // @ts-ignore
        ...badgeStyle[section],
        [key]: value
      }
    });
  };

  const handleCustomFieldChange = (id: string, key: keyof CustomField, value: any) => {
      setBadgeStyle({
        ...badgeStyle,
        customFields: badgeStyle.customFields.map(field => 
            field.id === id ? { ...field, [key]: value } : field
        )
      });
  };
  
  const addCustomField = () => {
      const newField: CustomField = {
          id: `custom-${Date.now()}`,
          label: 'Novo Campo',
          x: 50,
          y: 600,
          width: 400,
          height: 40,
          fontSize: 24,
          color: '#ffffff',
          fontWeight: 'normal',
          textAlign: 'left',
          backgroundColor: '#000000',
          backgroundOpacity: 0,
          backgroundRadius: 6,
      };
      setBadgeStyle({ ...badgeStyle, customFields: [...badgeStyle.customFields, newField] });
  };

  const removeCustomField = (id: string) => {
      setBadgeStyle({ ...badgeStyle, customFields: badgeStyle.customFields.filter(field => field.id !== id) });
  };
  
  const renderTextControls = (field: 'name' | 'turma', title: string) => (
    <AccordionItem value={field}>
      <AccordionTrigger className="text-sm font-medium">{title}</AccordionTrigger>
      <AccordionContent className="space-y-3 p-1">
        <StyleInput label="Posição X" value={badgeStyle[field].x} onChange={(e) => handleStyleChange(field, 'x', safeParseInt(e.target.value))} />
        <StyleInput label="Posição Y" value={badgeStyle[field].y} onChange={(e) => handleStyleChange(field, 'y', safeParseInt(e.target.value))} />
        <StyleInput label="Largura" value={badgeStyle[field].width} onChange={(e) => handleStyleChange(field, 'width', safeParseInt(e.target.value))} />
        <StyleInput label="Altura" value={badgeStyle[field].height} onChange={(e) => handleStyleChange(field, 'height', safeParseInt(e.target.value))} />
        <StyleInput label="Tam. Fonte" value={badgeStyle[field].fontSize} onChange={(e) => handleStyleChange(field, 'fontSize', safeParseInt(e.target.value))} />
        <ColorInput label="Cor da Fonte" value={badgeStyle[field].color} onChange={(e) => handleStyleChange(field, 'color', e.target.value)} />
        <ColorInput label="Cor do Fundo" value={badgeStyle[field].backgroundColor} onChange={(e) => handleStyleChange(field, 'backgroundColor', e.target.value)} />
        <OpacitySlider label="Opacidade Fundo" value={badgeStyle[field].backgroundOpacity} onChange={(val) => handleStyleChange(field, 'backgroundOpacity', val[0])} />
        <StyleInput label="Raio do Fundo" value={badgeStyle[field].backgroundRadius} onChange={(e) => handleStyleChange(field, 'backgroundRadius', safeParseInt(e.target.value))} />
      </AccordionContent>
    </AccordionItem>
  );

  return (
    <Card className="shadow-lg border-2">
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-primary">
                <Palette size={20}/> Editor de Design
            </CardTitle>
            {activeModel && (
                <Button variant="ghost" size="sm" onClick={onReset} className="h-8 gap-1">
                    <Plus size={14}/> Novo
                </Button>
            )}
        </div>
        <CardDescription>Ajuste visual do crachá selecionado.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Nome do Modelo</Label>
            <Input 
                placeholder="Ex: Padrão 2024" 
                value={modelName} 
                onChange={(e) => setModelName(e.target.value)}
                className="font-medium"
            />
        </div>

        <Accordion type="multiple" className="w-full">
          <AccordionItem value="background">
            <AccordionTrigger className="text-sm font-medium">Fundo do Crachá</AccordionTrigger>
            <AccordionContent>
                <div className="flex items-center gap-4 pt-2">
                    <div className="w-16 h-12 relative rounded border overflow-hidden bg-muted flex-shrink-0">
                        {background ? <NextImage src={background} alt="BG" fill className="object-cover" /> : null}
                    </div>
                    <div className="flex-1">
                        <Input type="file" accept="image/*" ref={backgroundFileRef} onChange={handleBackgroundChange} disabled={isOptimizing} className="h-8 text-[10px]" />
                    </div>
                </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="photo">
            <AccordionTrigger className="text-sm font-medium">Foto do Aluno</AccordionTrigger>
            <AccordionContent className="space-y-3 p-1">
              <StyleInput label="Posição X" value={badgeStyle.photo.x} onChange={(e) => handleStyleChange('photo', 'x', safeParseInt(e.target.value))} />
              <StyleInput label="Posição Y" value={badgeStyle.photo.y} onChange={(e) => handleStyleChange('photo', 'y', safeParseInt(e.target.value))} />
              <StyleInput label="Largura" value={badgeStyle.photo.width} onChange={(e) => handleStyleChange('photo', 'width', safeParseInt(e.target.value))} />
              <StyleInput label="Altura" value={badgeStyle.photo.height} onChange={(e) => handleStyleChange('photo', 'height', safeParseInt(e.target.value))} />
              <StyleInput label="Arredondamento" value={badgeStyle.photo.borderRadius} onChange={(e) => handleStyleChange('photo', 'borderRadius', safeParseInt(e.target.value))} />
            </AccordionContent>
          </AccordionItem>

          {renderTextControls('name', 'Campo Nome')}
          {renderTextControls('turma', 'Campo Turma')}

          <AccordionItem value="customFields">
            <AccordionTrigger className="text-sm font-medium">Campos Dinâmicos</AccordionTrigger>
            <AccordionContent className="space-y-3 p-1">
              {badgeStyle.customFields.map((field) => (
                <div key={field.id} className="border p-2 rounded-md space-y-2">
                    <div className="flex justify-between">
                        <Input value={field.label} onChange={(e) => handleCustomFieldChange(field.id, 'label', e.target.value)} className="h-7 text-xs" />
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeCustomField(field.id)}><Trash2 size={12}/></Button>
                    </div>
                    <StyleInput label="Posição Y" value={field.y} onChange={(e) => handleCustomFieldChange(field.id, 'y', safeParseInt(e.target.value))} />
                </div>
              ))}
               <Button onClick={addCustomField} className="w-full mt-2" variant="outline" size="sm">
                <PlusCircle size={14} className="mr-2"/> Add Campo
              </Button>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
      <CardFooter className="bg-muted/30 pt-4 flex flex-col gap-2">
        <Button 
          className="w-full gap-2" 
          onClick={() => onSaveModel(modelName, background, badgeStyle)}
          disabled={!modelName}
        >
          {isOptimizing ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
          {activeModel ? "Atualizar Modelo" : "Salvar como Novo Modelo"}
        </Button>
      </CardFooter>
    </Card>
  );
}
