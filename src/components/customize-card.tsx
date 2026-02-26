
"use client";

import React, { useRef, type ChangeEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Wand2, Trash2, PlusCircle, Loader2, Save, AlertCircle } from 'lucide-react';
import NextImage from 'next/image';
import { type BadgeStyleConfig, type CustomField, type TextStyle, type PhotoStyle } from '@/lib/badge-styles';
import { Switch } from '@/components/ui/switch';
import { compressImage } from '@/lib/image-utils';

interface CustomizeCardProps {
  currentBackground: string;
  onSetBackground: (dataUrl: string) => void;
  badgeStyle: BadgeStyleConfig;
  onStyleChange: (style: BadgeStyleConfig) => void;
  onSave: () => void;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
}

const safeParseInt = (val: string): number => {
  const parsed = parseInt(val);
  return isNaN(parsed) ? 0 : parsed;
};

const StyleInput = ({ label, value, onChange, unit = 'px', ...props }: { label: string, value: number, onChange: (e: ChangeEvent<HTMLInputElement>) => void, unit?: string, [key: string]: any }) => (
  <div className="grid grid-cols-2 items-center gap-2">
    <Label className="text-xs">{label}</Label>
    <div className="flex items-center gap-1">
      <Input 
        type="number" 
        value={isNaN(value) || value === undefined ? "" : value} 
        onChange={onChange} 
        className="h-8 w-20" 
        {...props} 
      />
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

export default function CustomizeCard({ 
  currentBackground, 
  onSetBackground, 
  badgeStyle, 
  onStyleChange,
  onSave,
  isSaving,
  hasUnsavedChanges
}: CustomizeCardProps) {
  const [isOptimizing, setIsOptimizing] = React.useState(false);
  const backgroundFileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleBackgroundChange = () => {
    const file = backgroundFileRef.current?.files?.[0];
    if (!file) return;
    
    setIsOptimizing(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const rawDataUrl = e.target?.result as string;
      try {
        const optimizedBackground = await compressImage(rawDataUrl, 1063, 768, 0.7);
        onSetBackground(optimizedBackground);
        toast({ title: 'Fundo alterado!', description: 'Não esqueça de salvar o design para persistir na nuvem.' });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erro na otimização",
          description: "Não foi possível processar a imagem de fundo.",
        });
      } finally {
        setIsOptimizing(false);
        if (backgroundFileRef.current) backgroundFileRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStyleChange = (section: keyof BadgeStyleConfig, key: keyof (PhotoStyle | TextStyle), value: any) => {
    onStyleChange({
      ...badgeStyle,
      [section]: {
        // @ts-ignore
        ...badgeStyle[section],
        [key]: value
      }
    });
  };

  const handleCustomFieldChange = (id: string, key: keyof CustomField, value: any) => {
      onStyleChange({
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
      onStyleChange({
        ...badgeStyle,
        customFields: [...badgeStyle.customFields, newField]
      });
  };

  const removeCustomField = (id: string) => {
      onStyleChange({
        ...badgeStyle,
        customFields: badgeStyle.customFields.filter(field => field.id !== id)
      });
  };
  
  const renderTextControls = (field: 'name' | 'turma', title: string) => (
    <AccordionItem value={field}>
      <AccordionTrigger className="text-base">{title}</AccordionTrigger>
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
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Wand2 />
          Personalização do Crachá
        </CardTitle>
        <CardDescription>Ajuste o visual dos crachás.</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full" defaultValue={["background"]}>
          <AccordionItem value="background">
            <AccordionTrigger className="text-base">Fundo do Crachá</AccordionTrigger>
            <AccordionContent>
                <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-14 relative rounded-md overflow-hidden border bg-muted flex items-center justify-center">
                            {currentBackground ? (
                              <NextImage src={currentBackground} alt="Fundo atual" fill className="object-cover" />
                            ) : (
                              <span className="text-[10px] text-muted-foreground text-center px-1">Sem Fundo</span>
                            )}
                        </div>
                        <div className="flex-1">
                            <div className="relative">
                              <Input 
                                type="file" 
                                accept="image/*" 
                                ref={backgroundFileRef} 
                                onChange={handleBackgroundChange} 
                                disabled={isOptimizing}
                                className={isOptimizing ? "opacity-50" : ""}
                              />
                              {isOptimizing && (
                                <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-md">
                                  <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
                                  <span className="text-xs font-medium">Processando...</span>
                                </div>
                              )}
                            </div>
                        </div>
                    </div>
                </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="photo">
            <AccordionTrigger className="text-base">Foto do Aluno</AccordionTrigger>
            <AccordionContent className="space-y-3 p-1">
              <StyleInput label="Posição X" value={badgeStyle.photo.x} onChange={(e) => handleStyleChange('photo', 'x', safeParseInt(e.target.value))} />
              <StyleInput label="Posição Y" value={badgeStyle.photo.y} onChange={(e) => handleStyleChange('photo', 'y', safeParseInt(e.target.value))} />
              <StyleInput label="Largura" value={badgeStyle.photo.width} onChange={(e) => handleStyleChange('photo', 'width', safeParseInt(e.target.value))} />
              <StyleInput label="Altura" value={badgeStyle.photo.height} onChange={(e) => handleStyleChange('photo', 'height', safeParseInt(e.target.value))} />
              <StyleInput label="Arredondamento" value={badgeStyle.photo.borderRadius} onChange={(e) => handleStyleChange('photo', 'borderRadius', safeParseInt(e.target.value))} />
              <div className="border-t pt-3 mt-3 space-y-3">
                <div className="grid grid-cols-2 items-center gap-2">
                  <Label className="text-xs">Borda</Label>
                  <Switch
                    checked={badgeStyle.photo.hasBorder}
                    onCheckedChange={(checked) => handleStyleChange('photo', 'hasBorder', checked)}
                  />
                </div>
                {badgeStyle.photo.hasBorder && (
                  <>
                    <StyleInput label="Largura da Borda" value={badgeStyle.photo.borderWidth} onChange={(e) => handleStyleChange('photo', 'borderWidth', safeParseInt(e.target.value))} />
                    <ColorInput label="Cor da Borda" value={badgeStyle.photo.borderColor} onChange={(e) => handleStyleChange('photo', 'borderColor', e.target.value)} />
                    <OpacitySlider label="Opacidade da Borda" value={badgeStyle.photo.borderOpacity} onChange={(val) => handleStyleChange('photo', 'borderOpacity', val[0])} />
                  </>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {renderTextControls('name', 'Campo: Nome')}
          {renderTextControls('turma', 'Campo: Turma')}

          <AccordionItem value="customFields">
            <AccordionTrigger className="text-base">Campos Adicionais</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              {badgeStyle.customFields.map((field, index) => (
                <Accordion key={field.id} type="single" collapsible className="border rounded-md px-2">
                   <AccordionItem value={`custom-${index}`} >
                    <AccordionTrigger className="text-sm py-2">
                        <div className="flex justify-between w-full items-center pr-2">
                            <span className="truncate">{field.label || "Novo Campo"}</span>
                             <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); removeCustomField(field.id); }}>
                                <Trash2 size={16}/>
                            </Button>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 p-1 border-t mt-2">
                         <div className="grid grid-cols-2 items-center gap-2">
                            <Label className="text-xs">Rótulo</Label>
                            <Input value={field.label} onChange={(e) => handleCustomFieldChange(field.id, 'label', e.target.value)} className="h-8"/>
                        </div>
                        <StyleInput label="Posição X" value={field.x} onChange={(e) => handleCustomFieldChange(field.id, 'x', safeParseInt(e.target.value))} />
                        <StyleInput label="Posição Y" value={field.y} onChange={(e) => handleCustomFieldChange(field.id, 'y', safeParseInt(e.target.value))} />
                        <StyleInput label="Largura" value={field.width} onChange={(e) => handleCustomFieldChange(field.id, 'width', safeParseInt(e.target.value))} />
                        <StyleInput label="Altura" value={field.height} onChange={(e) => handleCustomFieldChange(field.id, 'height', safeParseInt(e.target.value))} />
                        <StyleInput label="Tam. Fonte" value={field.fontSize} onChange={(e) => handleCustomFieldChange(field.id, 'fontSize', safeParseInt(e.target.value))} />
                        <ColorInput label="Cor da Fonte" value={field.color} onChange={(e) => handleCustomFieldChange(field.id, 'color', e.target.value)} />
                        <ColorInput label="Cor do Fundo" value={field.backgroundColor} onChange={(e) => handleCustomFieldChange(field.id, 'backgroundColor', e.target.value)} />
                        <OpacitySlider label="Opacidade Fundo" value={field.backgroundOpacity} onChange={(val) => handleCustomFieldChange(field.id, 'backgroundOpacity', val[0])} />
                        <StyleInput label="Raio do Fundo" value={field.backgroundRadius} onChange={(e) => handleCustomFieldChange(field.id, 'backgroundRadius', safeParseInt(e.target.value))} />
                    </AccordionContent>
                   </AccordionItem>
                </Accordion>
              ))}
               <Button onClick={addCustomField} className="w-full mt-2" variant="outline" size="sm">
                <PlusCircle size={14} className="mr-2"/> Adicionar Novo Campo
              </Button>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 border-t pt-4 bg-muted/30">
        {hasUnsavedChanges && (
          <div className="flex items-center gap-2 text-xs text-amber-600 font-medium mb-1">
            <AlertCircle size={14} />
            Você tem alterações não salvas.
          </div>
        )}
        <Button 
          className="w-full shadow-md" 
          onClick={onSave} 
          disabled={isSaving || !hasUnsavedChanges}
          variant={hasUnsavedChanges ? "default" : "secondary"}
        >
          {isSaving ? (
            <Loader2 className="animate-spin mr-2" />
          ) : (
            <Save className="mr-2" />
          )}
          Salvar Design na Nuvem
        </Button>
      </CardFooter>
    </Card>
  );
}
