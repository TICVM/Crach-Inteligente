
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
import { FileDown, Printer, Loader2 } from "lucide-react";
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
  
  const { toast } = useToast();
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading: isAuthLoading } = useUser();
  
  // Ref para controlar se a mudança veio do banco ou do usuário
  const lastSavedConfigRef = useRef<string>("");

  useEffect(() => {
    setIsMounted(true);
    if (auth && !user && !isAuthLoading) {
      signInAnonymously(auth).catch((error) => {
        console.error("Falha na autenticação anônima", error);
        toast({
          variant: "destructive",
          title: "Erro de Conexão",
          description: "Não foi possível conectar ao servidor com segurança.",
        });
      });
    }
  }, [auth, user, isAuthLoading, toast]);

  const alunosCollection = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'alunos');
  }, [firestore, user]);

  const { data: studentsData, isLoading: studentsLoading } = useCollection<Student>(alunosCollection);
  const students = studentsData || [];

  const configDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    // Salva a configuração por usuário para evitar sobrescrever o design de outros
    return doc(firestore, 'configuracaoCracha', user.uid);
  }, [firestore, user]);
  
  const { data: configData, isLoading: isConfigLoading } = useDoc<any>(configDocRef);

  // 1. CARREGAR dados do Firestore (Sync DOWN)
  useEffect(() => {
    if (isMounted && !isConfigLoading && user) {
      if (configData) {
        // Se temos dados no banco, atualizamos o estado local
        const savedStyle = configData.badgeStyle;
        const savedBackground = configData.fundoCrachaUrl;
        
        if (savedStyle) {
          // Mesclagem profunda para garantir que novos campos do sistema não quebrem estilos antigos
          const mergedStyle = {
            ...defaultBadgeStyle,
            ...savedStyle,
            photo: { ...defaultBadgeStyle.photo, ...savedStyle.photo },
            name: { ...defaultBadgeStyle.name, ...savedStyle.name },
            turma: { ...defaultBadgeStyle.turma, ...savedStyle.turma },
            customFields: savedStyle.customFields || [],
          };
          setBadgeStyle(mergedStyle);
        }
        
        if (savedBackground) {
          setBackground(savedBackground);
        }
        
        // Registramos o que acabamos de carregar para não salvar de volta imediatamente
        lastSavedConfigRef.current = JSON.stringify({ 
          style: savedStyle || defaultBadgeStyle, 
          bg: savedBackground || "" 
        });
        
        setIsConfigInitialized(true);
      } else if (configData === null) {
        // Se o documento não existe no banco, inicializamos com os padrões
        const defaultBg = PlaceHolderImages.find(img => img.id === 'default-background')?.imageUrl || '';
        setBackground(defaultBg);
        setBadgeStyle(defaultBadgeStyle);
        
        const initialData = { 
          badgeStyle: defaultBadgeStyle, 
          fundoCrachaUrl: defaultBg 
        };
        
        if (configDocRef) {
          setDocumentNonBlocking(configDocRef, initialData, { merge: true });
          lastSavedConfigRef.current = JSON.stringify({ style: defaultBadgeStyle, bg: defaultBg });
          setIsConfigInitialized(true);
        }
      }
    }
  }, [configData, isConfigLoading, user, isMounted, configDocRef]);
  
  // 2. SALVAR alterações no Firestore (Sync UP) com Proteção
  useEffect(() => {
    // SÓ SALVAMOS se:
    // - O sistema já carregou os dados iniciais do banco (isConfigInitialized)
    // - Os dados atuais são diferentes dos que carregamos/salvamos pela última vez
    if (isConfigInitialized && configDocRef && user) {
      const currentConfigStr = JSON.stringify({ style: badgeStyle, bg: background });
      
      if (currentConfigStr !== lastSavedConfigRef.current) {
        const handler = setTimeout(() => {
          updateDocumentNonBlocking(configDocRef, { 
            badgeStyle, 
            fundoCrachaUrl: background 
          });
          lastSavedConfigRef.current = currentConfigStr;
          console.log("Configurações salvas na nuvem com sucesso.");
        }, 1000); // Debounce de 1 segundo

        return () => clearTimeout(handler);
      }
    }
  }, [badgeStyle, background, isConfigInitialized, configDocRef, user]);

  const addStudent = (student: Omit<Student, "id">) => {
    if (!alunosCollection) return;
    addDocumentNonBlocking(alunosCollection, student);
    toast({ title: "Sucesso!", description: "Aluno salvo na nuvem." });
  };

  const updateStudent = (updatedStudent: Student) => {
    if (!firestore || !updatedStudent.id) return;
    const studentDocRef = doc(firestore, 'alunos', updatedStudent.id);
    const { id, ...dataToUpdate } = updatedStudent;
    updateDocumentNonBlocking(studentDocRef, dataToUpdate);
    toast({ title: "Sucesso!", description: "Dados sincronizados." });
  };

  const deleteStudent = (studentId: string) => {
    if (!firestore) return;
    const studentDocRef = doc(firestore, 'alunos', studentId);
    deleteDocumentNonBlocking(studentDocRef);
    toast({ title: "Aluno removido da nuvem." });
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
      toast({ title: "Sucesso!", description: "PDF gerado e baixado." });
    } catch (error) {
      console.error("Erro na geração do PDF:", error);
      toast({ variant: "destructive", title: "Erro", description: "Erro ao processar o PDF." });
    } finally {
      setIsPdfLoading(false);
    }
  };
  
  const isLoading = !isMounted || isAuthLoading || (user && (studentsLoading || isConfigLoading || !isConfigInitialized));

  return (
    <div className="min-h-screen bg-background">
      <PageHeader />
      <main className="container mx-auto p-4 md:p-8">
        {isLoading ? (
            <div className="flex flex-col justify-center items-center h-64 gap-4">
                <Loader2 className="animate-spin h-12 w-12 text-primary" />
                <p className="text-muted-foreground animate-pulse">Sincronizando com seu banco de dados na nuvem...</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 flex flex-col gap-8 no-print">
                <AddStudentCard onAddStudent={addStudent} badgeStyle={badgeStyle} />
                <BulkImportCard onImport={handleBulkImport} />
                <CustomizeCard
                  currentBackground={background}
                  onSetBackground={setBackground}
                  badgeStyle={badgeStyle}
                  onStyleChange={setBadgeStyle}
                />
              </div>

              <div className="lg:col-span-2 flex flex-col gap-8">
                <div className="bg-card p-6 rounded-lg shadow-sm no-print border">
                  <h2 className="text-xl font-bold mb-4 text-primary flex items-center gap-2">
                    Exportação Profissional
                  </h2>
                  <div className="flex flex-col sm:flex-row gap-4">
                     <Button className="flex-1" onClick={handleGeneratePdf} disabled={isPdfLoading || students.length === 0}>
                      {isPdfLoading ? <Loader2 className="animate-spin mr-2" /> : <FileDown className="mr-2" />}
                      Exportar PDF (Alta Resolução)
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={handlePrint} disabled={isPrinting || students.length === 0}>
                      <Printer className="mr-2" />
                      Imprimir Crachás
                    </Button>
                  </div>
                </div>

                <div className="bg-card p-6 rounded-lg shadow-sm border">
                    <h2 className="text-xl font-bold mb-4 text-primary">Lista de Alunos Sincronizada</h2>
                    {students.length > 0 ? (
                      <StudentList students={students} onUpdate={updateStudent} onDelete={deleteStudent} badgeStyle={badgeStyle}/>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
                        Nenhum aluno no banco. Adicione manualmente ou importe via Excel.
                      </div>
                    )}
                </div>

                <div className="bg-card p-6 rounded-lg shadow-sm border no-print">
                    <h2 className="text-xl font-bold mb-4 text-primary">Pré-visualização do Design</h2>
                    {students.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {students.slice(0, 4).map((student) => (
                          <StudentBadge key={student.id} student={student} background={background} styles={badgeStyle} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground italic text-center py-8">Cadastre alunos para visualizar seu design com dados reais.</p>
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
          <p>&copy; {new Date().getFullYear()} Crachá Inteligente. Todos os dados estão protegidos e sincronizados no Cloud Firestore.</p>
        </footer>
      )}
    </div>
  );
}
