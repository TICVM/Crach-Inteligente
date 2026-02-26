
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
  const [activeModel, setActiveModel] = useState<BadgeModel | null>(null);
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

  // Coleção de Alunos
  const alunosCollection = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'alunos');
  }, [firestore, user]);

  const { data: studentsData, isLoading: studentsLoading } = useCollection<Student>(alunosCollection);
  const students = studentsData || [];

  // Coleção de Modelos
  const modelosCollection = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'modelosCracha');
  }, [firestore, user]);

  const { data: modelsData, isLoading: isModelsLoading } = useCollection<BadgeModel>(modelosCollection);
  const models = modelsData || [];

  // Seleciona um modelo padrão se não houver um ativo e houver modelos salvos
  useEffect(() => {
    if (!activeModel && models.length > 0) {
      setActiveModel(models[0]);
    }
  }, [models, activeModel]);

  const addStudent = (student: Omit<Student, "id">) => {
    if (!alunosCollection) return;
    addDocumentNonBlocking(alunosCollection, {
      ...student,
      modeloId: activeModel?.id || ""
    });
    toast({ title: "Aluno adicionado!", description: `Vinculado ao modelo: ${activeModel?.nomeModelo || 'Padrão'}` });
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

  const handleBulkImport = (newStudents: Omit<Student, "id">[]) => {
     if (!alunosCollection) return;
     newStudents.forEach(student => {
        addDocumentNonBlocking(alunosCollection, {
          ...student,
          modeloId: activeModel?.id || ""
        });
     });
     toast({ title: "Importação concluída!", description: `${newStudents.length} alunos salvos com o modelo atual.` });
  };

  const handleSaveModel = (modelName: string, background: string, style: BadgeStyleConfig) => {
    if (!modelosCollection || !user || !firestore) return;
    
    if (activeModel?.id) {
      // Atualizar modelo existente
      const modelDocRef = doc(firestore, 'modelosCracha', activeModel.id);
      updateDocumentNonBlocking(modelDocRef, {
        nomeModelo: modelName,
        fundoCrachaUrl: background,
        badgeStyle: style
      });
      toast({ title: "Modelo atualizado!" });
    } else {
      // Criar novo modelo
      addDocumentNonBlocking(modelosCollection, {
        nomeModelo: modelName,
        fundoCrachaUrl: background,
        badgeStyle: style,
        userId: user.uid
      }).then((docRef) => {
        if (docRef) {
          setActiveModel({ 
            id: docRef.id, 
            nomeModelo: modelName, 
            fundoCrachaUrl: background, 
            badgeStyle: style 
          });
        }
      });
      toast({ title: "Novo modelo criado!" });
    }
  };

  const handleDeleteModel = (modelId: string) => {
    if (!firestore) return;
    const modelDocRef = doc(firestore, 'modelosCracha', modelId);
    deleteDocumentNonBlocking(modelDocRef);
    if (activeModel?.id === modelId) setActiveModel(null);
    toast({ title: "Modelo removido." });
  };

  const handlePrint = () => {
    if (students.length === 0 || !activeModel) {
      toast({ variant: "destructive", title: "Atenção", description: "Adicione alunos e selecione um modelo para imprimir." });
      return;
    }
    setIsPrinting(true);
    document.body.classList.add("print-mode");
    setTimeout(() => {
      window.print();
      document.body.classList.remove("print-mode");
      setIsPrinting(false);
    }, 500);
  };
  
  const handleGeneratePdf = async () => {
    if (students.length === 0 || !activeModel) {
      toast({ variant: "destructive", title: "Atenção", description: "Selecione um modelo e adicione alunos." });
      return;
    }
    setIsPdfLoading(true);
    try {
      // Aqui poderíamos iterar sobre cada aluno e buscar seu modelo específico,
      // mas para esta versão, geramos todos com o modelo ATIVO para garantir performance.
      await generatePdf(students, activeModel.fundoCrachaUrl, activeModel.badgeStyle);
      toast({ title: "PDF gerado com sucesso!" });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Erro no PDF" });
    } finally {
      setIsPdfLoading(false);
    }
  };
  
  const isLoading = !isMounted || isAuthLoading || isModelsLoading;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader />
      <main className="container mx-auto p-4 md:p-8">
        {isLoading ? (
            <div className="flex flex-col justify-center items-center h-96 gap-4">
                <Loader2 className="animate-spin h-12 w-12 text-primary" />
                <p className="text-muted-foreground animate-pulse">Carregando seus modelos e alunos...</p>
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
                  activeModel={activeModel}
                  onSaveModel={handleSaveModel}
                  onReset={() => setActiveModel(null)}
                />
                
                <AddStudentCard onAddStudent={addStudent} badgeStyle={activeModel?.badgeStyle || defaultBadgeStyle} />
                <BulkImportCard onImport={handleBulkImport} />
              </div>

              <div className="lg:col-span-2 flex flex-col gap-8">
                <div className="bg-card p-6 rounded-lg shadow-sm no-print border">
                  <h2 className="text-xl font-bold mb-4 text-primary flex items-center gap-2">
                    Ações de Exportação
                  </h2>
                  <div className="flex flex-col sm:flex-row gap-4">
                     <Button className="flex-1 shadow-md" onClick={handleGeneratePdf} disabled={isPdfLoading || !activeModel || students.length === 0}>
                      {isPdfLoading ? <Loader2 className="animate-spin mr-2" /> : <FileDown className="mr-2" />}
                      Gerar PDF em Alta Definição
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={handlePrint} disabled={isPrinting || !activeModel || students.length === 0}>
                      <Printer className="mr-2" />
                      Imprimir Crachás
                    </Button>
                  </div>
                </div>

                <div className="bg-card p-6 rounded-lg shadow-sm border">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold text-primary">Banco de Alunos</h2>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        <Cloud className="h-3 w-3" />
                        Sincronizado
                      </div>
                    </div>
                    {studentsLoading ? (
                      <div className="flex flex-col items-center py-12">
                        <Loader2 className="animate-spin mb-2" />
                        <span className="text-sm text-muted-foreground">Carregando dados...</span>
                      </div>
                    ) : students.length > 0 ? (
                      <StudentList 
                        students={students} 
                        onUpdate={updateStudent} 
                        onDelete={deleteStudent} 
                        badgeStyle={activeModel?.badgeStyle || defaultBadgeStyle}
                      />
                    ) : (
                      <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
                        Nenhum aluno cadastrado para este lote.
                      </div>
                    )}
                </div>

                <div className="bg-card p-6 rounded-lg shadow-sm border no-print">
                    <h2 className="text-xl font-bold mb-4 text-primary">Visualização do Modelo Selecionado</h2>
                    {activeModel ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {students.length > 0 ? (
                          students.slice(0, 4).map((student) => (
                            <StudentBadge key={student.id} student={student} background={activeModel.fundoCrachaUrl} styles={activeModel.badgeStyle} />
                          ))
                        ) : (
                          <div className="col-span-2">
                            <StudentBadge 
                              student={{ id: "preview", nome: "NOME DO ALUNO", turma: "TURMA 101", fotoUrl: PlaceHolderImages.find(i => i.id === 'avatar-placeholder')?.imageUrl || "" }} 
                              background={activeModel.fundoCrachaUrl} 
                              styles={activeModel.badgeStyle} 
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground italic border border-dashed rounded-lg">
                        Selecione ou crie um modelo de design para ver a prévia.
                      </div>
                    )}
                </div>
              </div>
            </div>
        )}

        <div id="printable-area" className="hidden">
           <div className="print-container">
            {students.map((student) => (
                <div key={`print-${student.id}`} className="print-item">
                    <StudentBadge 
                      student={student} 
                      background={activeModel?.fundoCrachaUrl || ""} 
                      styles={activeModel?.badgeStyle || defaultBadgeStyle} 
                    />
                </div>
            ))}
           </div>
        </div>
      </main>
      
      {isMounted && (
        <footer className="text-center py-8 text-muted-foreground text-sm no-print border-t mt-8">
          <p>&copy; {new Date().getFullYear()} Crachá Inteligente &bull; Sistema de Modelos Dinâmicos</p>
        </footer>
      )}
    </div>
  );
}
