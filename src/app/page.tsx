
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { type Student } from "@/lib/types";
import { generatePdf } from "@/lib/pdf-generator";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import PageHeader from "@/components/page-header";
import AddStudentCard from "@/components/add-student-card";
import BulkImportCard from "@/components/bulk-import-card";
import CustomizeCard from "@/components/customize-card";
import StudentList from "@/components/student-list";
import StudentBadge from "@/components/student-badge";
import { Button } from "@/components/ui/button";
import { FileDown, Printer, Loader2, Cloud, RefreshCw } from "lucide-react";
import { type BadgeStyleConfig, defaultBadgeStyle } from "@/lib/badge-styles";
import { useFirestore, useCollection, useDoc, useAuth, useMemoFirebase, useUser } from "@/firebase";
import { deleteDocumentNonBlocking, updateDocumentNonBlocking, setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { collection, doc } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";

export default function Home() {
  const [background, setBackground] = useState<string>("");
  const [badgeStyle, setBadgeStyle] = useState<BadgeStyleConfig>(defaultBadgeStyle);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isConfigInitialized, setIsConfigInitialized] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const { toast } = useToast();
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading: isAuthLoading } = useUser();
  
  const lastSavedStateRef = useRef<string>("");

  useEffect(() => {
    setIsMounted(true);
    if (auth && !user && !isAuthLoading) {
      signInAnonymously(auth).catch((error) => {
        console.error("Erro na autenticação anônima:", error);
      });
    }
  }, [auth, user, isAuthLoading]);

  const alunosCollection = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'alunos');
  }, [firestore, user]);

  const { data: studentsData, isLoading: studentsLoading } = useCollection<Student>(alunosCollection);
  const students = studentsData || [];

  const configDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'configuracaoCracha', user.uid);
  }, [firestore, user]);
  
  const { data: configData, isLoading: isConfigLoading } = useDoc<any>(configDocRef);

  useEffect(() => {
    if (!isMounted || isAuthLoading || isConfigLoading || !user || isConfigInitialized || !configDocRef) return;

    if (configData !== undefined) {
      let initialStyle = defaultBadgeStyle;
      let initialBg = PlaceHolderImages.find(img => img.id === 'default-background')?.imageUrl || '';

      if (configData) {
        const savedStyle = configData.badgeStyle;
        const savedBackground = configData.fundoCrachaUrl || "";
        
        initialStyle = {
          ...defaultBadgeStyle,
          ...savedStyle,
          photo: { ...defaultBadgeStyle.photo, ...(savedStyle?.photo || {}) },
          name: { ...defaultBadgeStyle.name, ...(savedStyle?.name || {}) },
          turma: { ...defaultBadgeStyle.turma, ...(savedStyle?.turma || {}) },
          customFields: savedStyle?.customFields || [],
        };
        initialBg = savedBackground || initialBg;
      }
      
      setBadgeStyle(initialStyle);
      setBackground(initialBg);
      lastSavedStateRef.current = JSON.stringify({ style: initialStyle, bg: initialBg });
      setIsConfigInitialized(true);
    }
  }, [configData, isConfigLoading, isAuthLoading, user, isMounted, isConfigInitialized, configDocRef]);

  useEffect(() => {
    if (!isConfigInitialized) return;
    const currentState = JSON.stringify({ style: badgeStyle, bg: background });
    setHasUnsavedChanges(currentState !== lastSavedStateRef.current);
  }, [badgeStyle, background, isConfigInitialized]);

  const saveDesign = () => {
    if (!configDocRef || !user) return;
    
    setIsSavingConfig(true);
    const currentState = { style: badgeStyle, bg: background };
    
    setDocumentNonBlocking(configDocRef, { 
      badgeStyle: currentState.style, 
      fundoCrachaUrl: currentState.bg 
    }, { merge: true });
    
    lastSavedStateRef.current = JSON.stringify(currentState);
    setHasUnsavedChanges(false);
    setIsSavingConfig(false);
    
    toast({ 
      title: "Design salvo na nuvem!", 
      description: "Seu layout foi sincronizado com sucesso." 
    });
  };

  const addStudent = (student: Omit<Student, "id">) => {
    if (!alunosCollection) return;
    addDocumentNonBlocking(alunosCollection, student);
    toast({ title: "Aluno adicionado!", description: "Dados salvos na nuvem." });
  };

  const updateStudent = (updatedStudent: Student) => {
    if (!firestore || !updatedStudent.id) return;
    const studentDocRef = doc(firestore, 'alunos', updatedStudent.id);
    const { id, ...dataToUpdate } = updatedStudent;
    updateDocumentNonBlocking(studentDocRef, dataToUpdate);
    toast({ title: "Dados atualizados!", description: "Sincronizado com o banco de dados." });
  };

  const deleteStudent = (studentId: string) => {
    if (!firestore) return;
    const studentDocRef = doc(firestore, 'alunos', studentId);
    deleteDocumentNonBlocking(studentDocRef);
    toast({ title: "Aluno removido." });
  };

  const handleBulkImport = (newStudents: Omit<Student, "id">[]) => {
     if (!alunosCollection) return;
     newStudents.forEach(student => {
        addDocumentNonBlocking(alunosCollection, student);
     });
     toast({ title: "Importação concluída!", description: `${newStudents.length} alunos salvos.` });
  };

  const handlePrint = () => {
    if (students.length === 0) {
      toast({ variant: "destructive", title: "Atenção", description: "Adicione alunos para imprimir." });
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
    if (students.length === 0) {
      toast({ variant: "destructive", title: "Atenção", description: "Adicione alunos para gerar o PDF." });
      return;
    }
    setIsPdfLoading(true);
    try {
      await generatePdf(students, background, badgeStyle);
      toast({ title: "PDF gerado!", description: "O arquivo foi baixado em alta resolução." });
    } catch (error) {
      console.error("Erro na geração do PDF:", error);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao processar as imagens do PDF." });
    } finally {
      setIsPdfLoading(false);
    }
  };
  
  const isSyncing = !isMounted || isAuthLoading || (user && (!isConfigInitialized || isConfigLoading));

  return (
    <div className="min-h-screen bg-background">
      <PageHeader />
      <main className="container mx-auto p-4 md:p-8">
        {isSyncing ? (
            <div className="flex flex-col justify-center items-center h-96 gap-6">
                <Loader2 className="animate-spin h-16 w-16 text-primary" />
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <div className="flex items-center gap-2 font-medium">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Sincronizando com Cloud Firestore...</span>
                  </div>
                  <p className="text-sm opacity-70">Recuperando seu design personalizado</p>
                </div>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 flex flex-col gap-8 no-print">
                <CustomizeCard
                  currentBackground={background}
                  onSetBackground={setBackground}
                  badgeStyle={badgeStyle}
                  onStyleChange={setBadgeStyle}
                  onSave={saveDesign}
                  isSaving={isSavingConfig}
                  hasUnsavedChanges={hasUnsavedChanges}
                />
                <AddStudentCard onAddStudent={addStudent} badgeStyle={badgeStyle} />
                <BulkImportCard onImport={handleBulkImport} />
              </div>

              <div className="lg:col-span-2 flex flex-col gap-8">
                <div className="bg-card p-6 rounded-lg shadow-sm no-print border">
                  <h2 className="text-xl font-bold mb-4 text-primary flex items-center gap-2">
                    Exportação Profissional
                  </h2>
                  <div className="flex flex-col sm:flex-row gap-4">
                     <Button className="flex-1 shadow-md" onClick={handleGeneratePdf} disabled={isPdfLoading || students.length === 0}>
                      {isPdfLoading ? <Loader2 className="animate-spin mr-2" /> : <FileDown className="mr-2" />}
                      Gerar PDF (Alta Resolução)
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={handlePrint} disabled={isPrinting || students.length === 0}>
                      <Printer className="mr-2" />
                      Imprimir Crachás
                    </Button>
                  </div>
                </div>

                <div className="bg-card p-6 rounded-lg shadow-sm border">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold text-primary">Banco de Dados de Alunos</h2>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        <Cloud className="h-3 w-3" />
                        Tempo Real
                      </div>
                    </div>
                    {studentsLoading ? (
                      <div className="flex flex-col items-center py-12 gap-4">
                        <Loader2 className="animate-spin" />
                        <span className="text-sm text-muted-foreground">Carregando registros...</span>
                      </div>
                    ) : students.length > 0 ? (
                      <StudentList students={students} onUpdate={updateStudent} onDelete={deleteStudent} badgeStyle={badgeStyle}/>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
                        O banco de dados está vazio. Registre alunos para começar.
                      </div>
                    )}
                </div>

                <div className="bg-card p-6 rounded-lg shadow-sm border no-print">
                    <h2 className="text-xl font-bold mb-4 text-primary">Prévia do Design Sincronizado</h2>
                    {students.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {students.slice(0, 4).map((student) => (
                          <StudentBadge key={student.id} student={student} background={background} styles={badgeStyle} />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 bg-muted/10 rounded-lg border border-dashed">
                         <p className="text-muted-foreground italic">Seu design aparecerá aqui após adicionar o primeiro aluno.</p>
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
                    <StudentBadge student={student} background={background} styles={badgeStyle} />
                </div>
            ))}
           </div>
        </div>
      </main>
      
      {isMounted && (
        <footer className="text-center py-8 text-muted-foreground text-sm no-print border-t mt-8">
          <p>&copy; {new Date().getFullYear()} Crachá Inteligente &bull; Conectado ao Firebase Cloud Firestore</p>
        </footer>
      )}
    </div>
  );
}
