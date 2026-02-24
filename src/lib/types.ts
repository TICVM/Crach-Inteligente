export interface Student {
  id: string;
  nome: string;
  turma: string;
  fotoUrl: string; // Base64 data URL
  customData?: { [key: string]: string };
}
