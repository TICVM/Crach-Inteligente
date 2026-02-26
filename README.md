# Crachá Inteligente 🎓

Sistema avançado para criação, gestão e geração de crachás estudantis personalizados. Este projeto permite o design dinâmico de crachás, importação em massa via Excel e exportação precisa para PDF (layout A4 com 8 crachás).

## 🚀 Funcionalidades Principais

- **Editor de Design**: Ajuste posições, cores, tamanhos de fonte e fundos em tempo real.
- **Importação em Massa**: Envie uma planilha Excel (.xlsx) e as fotos dos alunos para gerar dezenas de crachás instantaneamente.
- **Gestão de Alunos**: Busca por nome, filtros por turma e controle de quem deve ser incluído na impressão (Ativos/Inativos).
- **Exportação Profissional**: Geração de PDF calibrado para papel A4 (2 colunas x 4 linhas).
- **Persistência na Nuvem**: Sincronização automática com Firebase Firestore.

## 🛠️ Tecnologias Utilizadas

- **Frontend**: Next.js 15 (App Router), React, Tailwind CSS.
- **UI Components**: Shadcn/UI, Lucide React.
- **Processamento**: jsPDF (Geração de documentos), XLSX (Leitura de planilhas).
- **Backend**: Firebase Authentication (Anônimo) e Firestore Database.

## 📦 Como Publicar no GitHub

Para subir este código para o seu próprio repositório, execute estes comandos no terminal:

1. Crie um repositório vazio no GitHub.
2. No terminal, execute:

```bash
git init
git add .
git commit -m "Initial commit: Crachá Inteligente completo"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPOSITORIO.git
git push -u origin main
```

## 📄 Licença

Este projeto foi desenvolvido utilizando o Firebase Studio.
