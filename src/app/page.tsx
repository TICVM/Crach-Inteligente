"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { type Student, type BadgeModel } from "@/lib/types";
import { generatePdf } from "@/lib/pdf-generator";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import PageHeader from "@/components/page-header";
import AddStudentCard from "@/components/add-student-card";
import BulkImportCard from "@/components/bulk-import-card";
import CustomizeCard from "@/components/customize-card";
import StudentList from "@/components/student-list";
import StudentBadge from "@/components/student-badge";
import ModelsListCard from "@/components/models-list-card";
import { Button } from "@/components/ui/button";
import { 
  FileDown, Printer, Loader2, ChevronLeft, ChevronRight, LayoutGrid, List, 
  CheckSquare, Square, Users, FilterX, Settings2, Sparkles, PencilLine, 
  ArrowRightLeft, Trash2, Eye, EyeOff, AlertTriangle 
} from "lucide-react";
import { type BadgeStyleConfig, defaultBadgeStyle } from "@/lib/badge-styles";
import { useFirestore, useCollection, useAuth, useMemoFirebase, useUser } from "@/firebase";
import { deleteDocumentNonBlocking, updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { collection, doc } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/alert-dialog";

export default function Home() {
  const [activeModel, setActiveModel] = useState<BadgeModel | null>(null);
  const [liveStyle, setLiveStyle] = useState<BadgeStyleConfig>(defaultBadgeStyle);
  const [liveBackground, setLiveBackground] = useState<string>(PlaceHolderImages.find(img => img.id === 'default-background')?.imageUrl || "");
  const [liveModelName, setLiveModelName] = useState("");

  const [isPrinting, setIsPrinting] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isListVisible, setIsListVisible] = useState(true);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [filterTurma, setFilterTurma] = useState<string | null>(null);
  const [bulkModelId, setBulkModelId] = useState<string>("default");
  const [bulkNewTurma, setBulkNewTurma] = useState<string>("");
  
  const { toast } = useToast();
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading: isAuthLoading } = useUser();

  useEffect(() => {
    setIsMounted(true);
    if (auth && !user && !isAuthLoading) {
      signInAnonymously(auth).catch((error) => console.error("Erro auth:", error));
    }
  }, [auth, user, isAuthLoading]);

  const alunosCollection = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'alunos');
  }, [firestore, user]);

  const modelosCollection = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'modelosCracha');
  }, [firestore, user]);

  const { data: studentsData, isLoading: studentsLoading } = useCollection<Student>(alunosCollection);
  const { data: modelsData, isLoading: isModelsLoading } = useCollection<BadgeModel>(modelosCollection);
  
  const students = studentsData || [];
  const models = modelsData || [];

  // Estatísticas por turma
  const turmaStats = useMemo(() => {
    const stats: Record<string, number> = {};
    students.forEach(s => {
      stats[s.turma] = (stats[s.turma] || 0) + 1;
    });
    return Object.entries(stats).sort((a, b) => a[0].localeCompare(b[0]));
  }, [students]);

  // Filtra alunos baseados na turma selecionada
  const filteredStudents = useMemo(() => {
    if (!filterTurma) return students;
    return students.filter(s => s.turma === filterTurma);
  }, [students, filterTurma]);

  // Filtra apenas os alunos habilitados para impressão
  const enabledStudents = students.filter(s => s.enabled !== false);

  useEffect(() => {
    if (!isModelsLoading && models.length > 0 && !activeModel) {
      setActiveModel(models[0]);
    }
  }, [models, isModelsLoading, activeModel]);

  useEffect(() => {
    if (activeModel) {
      setLiveStyle(activeModel.badgeStyle);
      setLiveBackground(activeModel.fundoCrachaUrl);
      setLiveModelName(activeModel.nomeModelo);
    } else {
      setLiveStyle(defaultBadgeStyle);
      setLiveBackground(PlaceHolderImages.find(img => img.id === 'default-background')?.imageUrl || "");
      setLiveModelName("");
    }
  }, [activeModel]);

  const handleSaveModel = () => {
    if (!modelosCollection || !user || !firestore || !liveModelName) {
      toast({ variant: "destructive", title: "Erro", description: "Dê um nome ao modelo antes de salvar." });
      return;
    };
    
    if (activeModel?.id) {
      const modelDocRef = doc(firestore, 'modelosCracha', activeModel.id);
      updateDocumentNonBlocking(modelDocRef, {
        nomeModelo: liveModelName,
        fundoCrachaUrl: liveBackground,
        badgeStyle: liveStyle
      });
      toast({ title: "Modelo atualizado!" });
    } else {
      addDocumentNonBlocking(modelosCollection, {
        nomeModelo: liveModelName,
        fundoCrachaUrl: liveBackground,
        badgeStyle: liveStyle,
        userId: user.uid
      }).then((docRef) => {
        if (docRef) {
          setActiveModel({ 
            id: docRef.id, 
            nomeModelo: liveModelName, 
            fundoCrachaUrl: liveBackground, 
            badgeStyle: liveStyle 
          });
        }
      });
      toast({ title: "Novo modelo criado!" });
    }
  };

  const handleDuplicateModel = (model: BadgeModel) => {
    if (!modelosCollection || !user) return;

    const duplicatedData = {
      nomeModelo: `${model.nomeModelo} (Cópia)`,
      fundoCrachaUrl: model.fundoCrachaUrl,
      badgeStyle: JSON.parse(JSON.stringify(model.badgeStyle)),
      userId: user.uid
    };

    addDocumentNonBlocking(modelosCollection, duplicatedData);
    toast({ title: "Modelo duplicado!" });
  };

  const handleNewModel = () => {
    setActiveModel(null);
    setLiveStyle(defaultBadgeStyle);
    setLiveBackground(PlaceHolderImages.find(img => img.id === 'default-background')?.imageUrl || "");
    setLiveModelName("");
  };

  const handleDeleteModel = (modelId: string) => {
    if (!firestore) return;
    const modelDocRef = doc(firestore, 'modelosCracha', modelId);
    deleteDocumentNonBlocking(modelDocRef);
    if (activeModel?.id === modelId) handleNewModel();
    toast({ title: "Modelo removido." });
  };

  const addStudent = (student: Omit<Student, "id">) => {
    if (!alunosCollection) return;
    addDocumentNonBlocking(alunosCollection, { ...student, enabled: true });
  };

  const updateStudent = (updatedStudent: Student) => {
    if (!firestore || !updatedStudent.id) return;
    const studentDocRef = doc(firestore, 'alunos', updatedStudent.id);
    const { id, ...dataToUpdate } = updatedStudent;
    updateDocumentNonBlocking(studentDocRef, dataToUpdate);
  };

  const deleteStudent = (studentId: string) => {
    if (!firestore) return;
    const studentDocRef = doc(firestore, 'alunos', studentId);
    deleteDocumentNonBlocking(studentDocRef);
  };

  const handleBulkApplyModel = () => {
    if (enabledStudents.length === 0) {
      toast({ variant: "destructive", title: "Atenção", description: "Nenhum aluno selecionado (ativo) para atualizar." });
      return;
    }

    const mId = bulkModelId === "default" ? "" : bulkModelId;
    const modelName = bulkModelId === "default" ? "Padrão" : (models.find(m => m.id === bulkModelId)?.nomeModelo || "Selecionado");

    enabledStudents.forEach(student => {
      updateStudent({ ...student, modeloId: mId });
    });

    toast({ title: "Design Atualizado!", description: `O modelo '${modelName}' foi aplicado a ${enabledStudents.length} alunos.` });
  };

  const handleBulkUpdateTurma = () => {
    if (enabledStudents.length === 0) {
      toast({ variant: "destructive", title: "Atenção", description: "Nenhum aluno selecionado para alteração de turma." });
      return;
    }
    if (!bulkNewTurma.trim()) {
      toast({ variant: "destructive", title: "Atenção", description: "Informe o nome da nova turma." });
      return;
    }

    enabledStudents.forEach(student => {
      updateStudent({ ...student, turma: bulkNewTurma.trim() });
    });

    toast({ title: "Turma Atualizada!", description: `${enabledStudents.length} alunos movidos para a turma '${bulkNewTurma}'.` });
    setBulkNewTurma("");
  };

  const handleBulkDelete = () => {
    if (enabledStudents.length === 0) {
      toast({ variant: "destructive", title: "Atenção", description: "Nenhum aluno selecionado para exclusão." });
      return;
    }

    enabledStudents.forEach(student => {
      deleteStudent(student.id);
    });

    toast({ title: "Exclusão Concluída", description: `${enabledStudents.length} alunos foram removidos.` });
  };

  const handleGeneratePdf = async () => {
    if (enabledStudents.length === 0) {
      toast({ variant: "destructive", title: "Atenção", description: "Nenhum aluno habilitado para impressão." });
      return;
    }
    setIsPdfLoading(true);
    try {
      await generatePdf(enabledStudents, liveBackground, liveStyle, models);
      toast({ title: "PDF gerado com sucesso!" });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Erro no PDF", description: "Ocorreu um erro ao processar o PDF." });
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handlePrint = () => {
    if (enabledStudents.length === 0) {
      toast({ variant: "destructive", title: "Atenção", description: "Nenhum aluno habilitado para impressão." });
      return;
    }
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  const toggleAllInCurrentView = (enable: boolean) => {
    filteredStudents.forEach(student => {
      if (student.enabled !== enable) {
        updateStudent({ ...student, enabled: enable });
      }
    });
    const scope = filterTurma ? `na turma ${filterTurma}` : "em todos os alunos";
    toast({ title: `${enable ? "Ativados" : "Desativados"} ${scope}` });
  };

  const nextPreview = () => setPreviewIndex((prev) => (prev + 1) % (students.length || 1));
  const prevPreview = () => setPreviewIndex((prev) => (prev - 1 + (students.length || 1)) % (students.length || 1));

  const currentPreviewStudent = students.length > 0 ? students[previewIndex % students.length] : {
    id: "preview",
    nome: "NOME DO ALUNO",
    turma: "TURMA 101",
    fotoUrl: PlaceHolderImages.find(i => i.id === 'avatar-placeholder')?.imageUrl || "",
    enabled: true
  };
  
  const isLoading = !isMounted || isAuthLoading || isModelsLoading;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader />
      <main className="container mx-auto p-4 md:p-8 no-print">
        {isLoading ? (
            <div className="flex flex-col justify-center items-center h-96 gap-4">
                <Loader2 className="animate-spin h-12 w-12 text-primary" />
                <p className="text-muted-foreground animate-pulse">Sincronizando com a nuvem...</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 flex flex-col gap-8 no-print">
                <ModelsListCard 
                  models={models} 
                  activeModelId={activeModel?.id} 
                  onSelect={setActiveModel} 
                  onDelete={handleDeleteModel}
                  onDuplicate={handleDuplicateModel}
                />
                
                <CustomizeCard
                  modelName={liveModelName}
                  setModelName={setLiveModelName}
                  background={liveBackground}
                  setBackground={setLiveBackground}
                  badgeStyle={liveStyle}
                  setBadgeStyle={setLiveStyle}
                  onSave={handleSaveModel}
                  onNew={handleNewModel}
                  isEdit={!!activeModel}
                />
                
                <AddStudentCard 
                  onAddStudent={addStudent} 
                  models={models} 
                  activeModelId={activeModel?.id} 
                />
                <BulkImportCard 
                  onImport={(newOnes) => newOnes.forEach(addStudent)} 
                  models={models}
                />
              </div>

              <div className="lg:col-span-2 flex flex-col gap-8">
                <div className="bg-card p-6 rounded-lg shadow-sm no-print border">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                      Ações de Impressão
                    </h2>
                    <span className="text-sm font-medium text-muted-foreground">
                      {enabledStudents.length} de {students.length} alunos selecionados
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                     <Button className="flex-1 shadow-md" onClick={handleGeneratePdf} disabled={isPdfLoading || enabledStudents.length === 0}>
                      {isPdfLoading ? <Loader2 className="animate-spin mr-2" /> : <FileDown className="mr-2" />}
                      Gerar PDF ({enabledStudents.length} crachás)
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={handlePrint} disabled={isPrinting || enabledStudents.length === 0}>
                      <Printer className="mr-2" />
                      Imprimir Folha A4
                    </Button>
                  </div>
                </div>

                <div className="bg-card p-6 rounded-lg shadow-sm border no-print">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold text-primary">Prévia com Dados Reais</h2>
                      {students.length > 1 && (
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={prevPreview}><ChevronLeft /></Button>
                          <span className="text-sm font-medium">{previewIndex + 1} / {students.length}</span>
                          <Button variant="ghost" size="icon" onClick={nextPreview}><ChevronRight /></Button>
                        </div>
                      )}
                    </div>
                    <div className="max-w-md mx-auto">
                        <StudentBadge 
                          student={currentPreviewStudent} 
                          background={liveBackground} 
                          styles={liveStyle} 
                        />
                        <p className="mt-4 text-[10px] text-center text-muted-foreground uppercase tracking-wider font-bold">
                          Design: {liveModelName || 'Edição Livre'} • Visualizando: {currentPreviewStudent.nome}
                        </p>
                    </div>
                </div>

                <div className="bg-card p-6 rounded-lg shadow-sm border">
                    <div className="flex flex-col mb-6 gap-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <h2 className="text-xl font-bold text-primary">Gestão de Alunos</h2>
                          <p className="text-xs text-muted-foreground">Filtre por turma e gerencie a impressão.</p>
                        </div>
                        <div className="flex items-center gap-2 bg-muted p-1 rounded-md no-print">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setIsListVisible(!isListVisible)}
                            className="h-8 w-8 p-0"
                            title={isListVisible ? "Ocultar Lista" : "Mostrar Lista"}
                          >
                            {isListVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                          </Button>
                          <div className="w-[1px] h-4 bg-border mx-1" />
                          <Button 
                            variant={viewMode === 'table' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            onClick={() => setViewMode('table')}
                            className="h-8 gap-2"
                          >
                            <List size={14} /> Tabela
                          </Button>
                          <Button 
                            variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            onClick={() => setViewMode('grid')}
                            className="h-8 gap-2"
                          >
                            <LayoutGrid size={14} /> Grade
                          </Button>
                        </div>
                      </div>

                      {isListVisible && (
                        <>
                          {/* Painel de Resumo por Turma */}
                          <div className="bg-muted/30 p-4 rounded-lg border no-print">
                            <div className="flex items-center gap-2 mb-3">
                              <Users size={16} className="text-primary" />
                              <h3 className="text-sm font-bold uppercase tracking-wider">Resumo por Turma</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button 
                                variant={filterTurma === null ? "default" : "outline"} 
                                size="sm" 
                                onClick={() => setFilterTurma(null)}
                                className="h-8 text-xs"
                              >
                                Todas ({students.length})
                              </Button>
                              {turmaStats.map(([turma, count]) => (
                                <Button 
                                  key={turma} 
                                  variant={filterTurma === turma ? "default" : "outline"} 
                                  size="sm" 
                                  onClick={() => setFilterTurma(turma)}
                                  className="h-8 text-xs gap-2"
                                >
                                  {turma} 
                                  <Badge variant="secondary" className="h-4 px-1 text-[10px]">{count}</Badge>
                                </Button>
                              ))}
                            </div>
                          </div>

                          {/* Ações Rápidas e Edição em Massa */}
                          <div className="space-y-4 no-print border-b pb-6">
                            <div className="flex flex-wrap gap-4 items-center justify-between">
                              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                {filterTurma ? (
                                  <span className="flex items-center gap-1">
                                    Exibindo: <Badge className="bg-primary/20 text-primary border-primary/20 hover:bg-primary/20">{filterTurma}</Badge>
                                    <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setFilterTurma(null)}><FilterX size={10} /></Button>
                                  </span>
                                ) : (
                                  <span>Exibindo todos os alunos</span>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => toggleAllInCurrentView(true)} className="text-xs h-8">
                                  <CheckSquare className="mr-2 h-3 w-3" /> Ativar {filterTurma ? `Turma ${filterTurma}` : "Tudo"}
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => toggleAllInCurrentView(false)} className="text-xs h-8">
                                  <Square className="mr-2 h-3 w-3" /> Desativar {filterTurma ? `Turma ${filterTurma}` : "Tudo"}
                                </Button>
                                
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="destructive" 
                                      size="sm" 
                                      disabled={enabledStudents.length === 0}
                                      className="text-xs h-8"
                                    >
                                      <Trash2 className="mr-2 h-3 w-3" /> Excluir {enabledStudents.length} Selecionados
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="flex items-center gap-2">
                                        <AlertTriangle className="text-destructive" />
                                        Confirmação de Exclusão
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta ação excluirá permanentemente os <b>{enabledStudents.length}</b> alunos marcados como ativos. Esta ação não pode ser desfeita.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90">
                                        Sim, Excluir Todos
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>

                            {/* Alteração de Design e Turma em Massa */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 flex flex-col gap-3">
                                <div className="flex items-center gap-2 shrink-0">
                                  <Sparkles size={16} className="text-primary" />
                                  <span className="text-xs font-bold uppercase tracking-tight">Design em Massa</span>
                                </div>
                                <div className="flex gap-2 items-center">
                                  <Select onValueChange={setBulkModelId} value={bulkModelId}>
                                    <SelectTrigger className="h-9 text-xs">
                                      <SelectValue placeholder="Escolha um design" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="default">Design Aplicado (Padrão)</SelectItem>
                                      {models.map(m => (
                                        <SelectItem key={m.id} value={m.id}>{m.nomeModelo}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button 
                                    size="sm" 
                                    onClick={handleBulkApplyModel} 
                                    disabled={enabledStudents.length === 0}
                                    className="h-9 px-3 gap-2 whitespace-nowrap"
                                  >
                                    <Settings2 size={14} /> Aplicar
                                  </Button>
                                </div>
                              </div>

                              <div className="bg-accent/5 p-4 rounded-lg border border-accent/10 flex flex-col gap-3">
                                <div className="flex items-center gap-2 shrink-0">
                                  <ArrowRightLeft size={16} className="text-accent" />
                                  <span className="text-xs font-bold uppercase tracking-tight">Mover de Turma</span>
                                </div>
                                <div className="flex gap-2 items-center">
                                  <Input 
                                    placeholder="Nova turma ou existente" 
                                    value={bulkNewTurma}
                                    onChange={(e) => setBulkNewTurma(e.target.value)}
                                    className="h-9 text-xs"
                                  />
                                  <Button 
                                    size="sm" 
                                    variant="secondary"
                                    onClick={handleBulkUpdateTurma} 
                                    disabled={enabledStudents.length === 0 || !bulkNewTurma.trim()}
                                    className="h-9 px-3 gap-2 whitespace-nowrap"
                                  >
                                    <ArrowRightLeft size={14} /> Mover
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {isListVisible ? (
                      studentsLoading ? (
                        <div className="flex flex-col items-center py-12">
                          <Loader2 className="animate-spin mb-2" />
                          <span className="text-sm text-muted-foreground">Carregando alunos...</span>
                        </div>
                      ) : (
                        <StudentList 
                          students={filteredStudents} 
                          models={models}
                          onUpdate={updateStudent} 
                          onDelete={deleteStudent} 
                          viewMode={viewMode}
                          currentLiveBackground={liveBackground}
                          currentLiveStyle={liveStyle}
                        />
                      )
                    ) : (
                      <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed text-muted-foreground">
                        <p className="text-sm">A lista de alunos está oculta.</p>
                        <Button variant="link" size="sm" onClick={() => setIsListVisible(true)}>Mostrar lista</Button>
                      </div>
                    )}
                </div>
              </div>
            </div>
        )}
      </main>
      
      <div id="printable-area">
          <div className="print-grid">
          {enabledStudents.map((student) => {
              const studentModel = models.find(m => m.id === student.modeloId) || activeModel;
              return (
                <div key={`print-${student.id}`} className="print-item">
                    <StudentBadge 
                      student={student} 
                      background={studentModel?.fundoCrachaUrl || liveBackground} 
                      styles={studentModel?.badgeStyle || liveStyle} 
                    />
                </div>
              );
          })}
          </div>
      </div>

      {isMounted && (
        <footer className="text-center py-8 text-muted-foreground text-[10px] no-print border-t mt-8 uppercase tracking-widest font-bold">
          <p>&copy; {new Date().getFullYear()} Crachá Inteligente • Sistema de Identificação Estudantil</p>
        </footer>
      )}
    </div>
  );
}