'use server';
/**
 * @fileOverview A Genkit flow for generating inspirational slogans for students.
 *
 * - generateStudentSlogan - A function that handles the slogan generation process.
 * - GenerateStudentSloganInput - The input type for the generateStudentSlogan function.
 * - GenerateStudentSloganOutput - The return type for the generateStudentSlogan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateStudentSloganInputSchema = z.object({
  theme: z
    .string()
    .describe(
      'O tema para o slogan, como "estudo", "futuro" ou "sucesso".'
    ),
});
export type GenerateStudentSloganInput = z.infer<
  typeof GenerateStudentSloganInputSchema
>;

const GenerateStudentSloganOutputSchema = z.object({
  slogan: z.string().describe('O slogan curto e inspirador gerado pela IA.'),
});
export type GenerateStudentSloganOutput = z.infer<
  typeof GenerateStudentSloganOutputSchema
>;

export async function generateStudentSlogan(
  input: GenerateStudentSloganInput
): Promise<GenerateStudentSloganOutput> {
  return generateStudentSloganFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateStudentSloganPrompt',
  input: {schema: GenerateStudentSloganInputSchema},
  output: {schema: GenerateStudentSloganOutputSchema},
  prompt: `Você é um gerador de slogans criativo e inspirador, focado em estudantes.
Sua tarefa é criar um slogan curto (até 15 palavras) e motivacional para um crachá de estudante,
baseado no tema fornecido. O slogan deve ser positivo e encorajador.

Tema: {{{theme}}}

Exemplo de slogan:
{
  "slogan": "Sua jornada de aprendizado começa agora!"
}`,
});

const generateStudentSloganFlow = ai.defineFlow(
  {
    name: 'generateStudentSloganFlow',
    inputSchema: GenerateStudentSloganInputSchema,
    outputSchema: GenerateStudentSloganOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
