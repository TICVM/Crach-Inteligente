
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
import { FileDown, Printer, Loader2, Cloud, RefreshCw } from "lucide-react";
import { type BadgeStyleConfig, defaultBadgeStyle } from "@/lib/badge-styles";
import { useFirestore, useCollection, useAuth, useMemoFirebase, useUser } from "@/firebase";
import { deleteDocumentNonBlocking, updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { collection, doc } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";

export default function Home() {
  // Estados para o editor "Live"
  const [activeModel, setActiveModel] = useState<BadgeModel | null>(null);
  const [liveStyle, setLiveStyle] = useState<BadgeStyleConfig>(defaultBadgeStyle);
  const [liveBackground, setLiveBackground] = useState<string>(PlaceHolderImages.find(img => img.id === 'default-background')?.imageUrl || "");
  const [liveModelName, setLiveModelName] = useState("");

  const [isPrinting, setIsPrinting] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
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

  // Coleções
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

  // Sincroniza o estado "Live" quando um modelo é selecionado na lista
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
      // O PDF generator agora precisa lidar com estilos individuais por aluno
      // Para simplificar esta versão, usamos o modelo ativo para todos se selecionado,
      // ou o estilo live atual.
      await generatePdf(students, liveBackground, liveStyle, models);
      toast({ title: "PDF gerado com sucesso!" });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Erro no PDF" });
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    document.body.classList.add("print-mode");
    setTimeout(() => {
      window.print();
      document.body.classList.remove("print-mode");
      setIsPrinting(false);
    }, 500);
  };
  
  const isLoading = !isMounted || isAuthLoading || isModelsLoading;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader />
      <main className="container mx-auto p-4 md:p-8">
        {isLoading ? (
            <div className="flex flex-col justify-center items-center h-96 gap-4">
                <Loader2 className="animate-spin h-12 w-12 text-primary" />
                <p className="text-muted-foreground animate-pulse">Carregando seus dados...</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 flex flex-col gap-8 no-print">
                <ModelsListCard 
                  models={models} 
                  activeModelId={activeModel?.id} 
                  onSelect={setActiveModel} 
                  onDelete={handleDeleteModel} 
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
                    Exportação e Impressão
                  </h2>
                  <div className="flex flex-col sm:flex-row gap-4">
                     <Button className="flex-1 shadow-md" onClick={handleGeneratePdf} disabled={isPdfLoading || students.length === 0}>
                      {isPdfLoading ? <Loader2 className="animate-spin mr-2" /> : <FileDown className="mr-2" />}
                      Gerar PDF Completo
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={handlePrint} disabled={isPrinting || students.length === 0}>
                      <Printer className="mr-2" />
                      Imprimir Crachás
                    </Button>
                  </div>
                </div>

                <div className="bg-card p-6 rounded-lg shadow-sm border">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold text-primary">Gestão de Alunos</h2>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        <Cloud className="h-3 w-3" />
                        Nuvem Ativa
                      </div>
                    </div>
                    {studentsLoading ? (
                      <div className="flex flex-col items-center py-12">
                        <Loader2 className="animate-spin mb-2" />
                        <span className="text-sm text-muted-foreground">Sincronizando...</span>
                      </div>
                    ) : (
                      <StudentList 
                        students={students} 
                        models={models}
                        onUpdate={updateStudent} 
                        onDelete={deleteStudent} 
                      />
                    )}
                </div>

                <div className="bg-card p-6 rounded-lg shadow-sm border no-print">
                    <h2 className="text-xl font-bold mb-4 text-primary">Preview em Tempo Real</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-2">
                          <StudentBadge 
                            student={{ 
                              id: "preview", 
                              nome: "NOME DO ALUNO", 
                              turma: "TURMA 101", 
                              fotoUrl: PlaceHolderImages.find(i => i.id === 'avatar-placeholder')?.imageUrl || "" 
                            }} 
                            background={liveBackground} 
                            styles={liveStyle} 
                          />
                          <p className="mt-2 text-xs text-center text-muted-foreground italic">
                            Esta visualização reflete exatamente o que você ajusta no editor à esquerda.
                          </p>
                        </div>
                    </div>
                </div>
              </div>
            </div>
        )}

        <div id="printable-area" className="hidden">
           <div className="print-container">
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
      </main>
      
      {isMounted && (
        <footer className="text-center py-8 text-muted-foreground text-sm no-print border-t mt-8">
          <p>&copy; {new Date().getFullYear()} Crachá Inteligente &bull; Edição Visual Dinâmica</p>
        </footer>
      )}
    </div>
  );
}
