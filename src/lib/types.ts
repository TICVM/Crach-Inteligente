
import { type BadgeStyleConfig } from "./badge-styles";

export interface Student {
  id: string;
  nome: string;
  turma: string;
  fotoUrl: string; // Base64 data URL
  customData?: { [key: string]: string };
  modeloId?: string; // ID do modelo de crachá vinculado
}

export interface BadgeModel {
  id: string;
  nomeModelo: string;
  fundoCrachaUrl: string;
  badgeStyle: BadgeStyleConfig;
  userId?: string;
}
