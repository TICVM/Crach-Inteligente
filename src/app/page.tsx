"use client";

import React, { useState, useEffect } from "react";
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
import { FileDown, Printer, Loader2, ChevronLeft, ChevronRight, LayoutGrid, List } from "lucide-react";
import { type BadgeStyleConfig, defaultBadgeStyle } from "@/lib/badge-styles";
import { useFirestore, useCollection, useAuth, useMemoFirebase, useUser } from "@/firebase";
import { deleteDocumentNonBlocking, updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { collection, doc } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";

export default function Home() {
  const [activeModel, setActiveModel] = useState<BadgeModel | null>(null);
  const [liveStyle, setLiveStyle] = useState<BadgeStyleConfig>(defaultBadgeStyle);
  const [liveBackground, setLiveBackground] = useState<string>(PlaceHolderImages.find(img => img.id === 'default-background')?.imageUrl || "");
  const [liveModelName, setLiveModelName] = useState("");

  const [isPrinting, setIsPrinting] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [previewIndex, setPreviewIndex] = useState(0);
  
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

  // Define um modelo padrão ao carregar se nenhum estiver selecionado
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
    addDocumentNonBlocking(alunosCollection, student);
    toast({ title: "Aluno adicionado!" });
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

  const handleGeneratePdf = async () => {
    if (students.length === 0) {
      toast({ variant: "destructive", title: "Atenção", description: "Adicione alunos primeiro." });
      return;
    }
    setIsPdfLoading(true);
    try {
      await generatePdf(students, liveBackground, liveStyle, models);
      toast({ title: "PDF gerado com sucesso!" });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Erro no PDF", description: "Ocorreu um erro ao processar o PDF. Verifique os logs." });
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    // Pequeno atraso para garantir que o DOM de impressão esteja atualizado
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  const nextPreview = () => setPreviewIndex((prev) => (prev + 1) % (students.length || 1));
  const prevPreview = () => setPreviewIndex((prev) => (prev - 1 + (students.length || 1)) % (students.length || 1));

  const currentPreviewStudent = students.length > 0 ? students[previewIndex % students.length] : {
    id: "preview",
    nome: "NOME DO ALUNO",
    turma: "TURMA 101",
    fotoUrl: PlaceHolderImages.find(i => i.id === 'avatar-placeholder')?.imageUrl || ""
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
                <BulkImportCard onImport={(newOnes) => newOnes.forEach(addStudent)} />
              </div>

              <div className="lg:col-span-2 flex flex-col gap-8">
                <div className="bg-card p-6 rounded-lg shadow-sm no-print border">
                  <h2 className="text-xl font-bold mb-4 text-primary flex items-center gap-2">
                    Ações Rápidas
                  </h2>
                  <div className="flex flex-col sm:flex-row gap-4">
                     <Button className="flex-1 shadow-md" onClick={handleGeneratePdf} disabled={isPdfLoading || students.length === 0}>
                      {isPdfLoading ? <Loader2 className="animate-spin mr-2" /> : <FileDown className="mr-2" />}
                      Gerar PDF (6 por folha)
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={handlePrint} disabled={isPrinting || students.length === 0}>
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
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                      <div>
                        <h2 className="text-xl font-bold text-primary">Gestão de Alunos</h2>
                        <p className="text-xs text-muted-foreground">Total: {students.length} registros</p>
                      </div>
                      <div className="flex items-center bg-muted p-1 rounded-md no-print">
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
                    {studentsLoading ? (
                      <div className="flex flex-col items-center py-12">
                        <Loader2 className="animate-spin mb-2" />
                        <span className="text-sm text-muted-foreground">Carregando alunos...</span>
                      </div>
                    ) : (
                      <StudentList 
                        students={students} 
                        models={models}
                        onUpdate={updateStudent} 
                        onDelete={deleteStudent} 
                        viewMode={viewMode}
                        currentLiveBackground={liveBackground}
                        currentLiveStyle={liveStyle}
                      />
                    )}
                </div>
              </div>
            </div>
        )}
      </main>
      
      {/* Área de Impressão isolada */}
      <div id="printable-area">
          <div className="print-grid">
          {students.map((student) => {
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
