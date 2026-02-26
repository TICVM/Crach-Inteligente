# Crach-Inteligente 🎓

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

Para subir todo o código para o seu repositório, abra o **Terminal** no editor e execute estes comandos:

1. Inicie o git e prepare os arquivos:
```bash
git init
git add .
git commit -m "Initial commit: Crachá Inteligente completo"
```

2. Conecte ao seu repositório (se der erro de "remote origin already exists", use o comando do passo 3):
```bash
git branch -M main
git remote add origin https://github.com/TICVM/Crach-Inteligente.git
```

3. **Caso o comando acima falhe** (se você já tinha tentado antes):
```bash
git remote set-url origin https://github.com/TICVM/Crach-Inteligente.git
```

4. Envie os arquivos:
```bash
git push -u origin main
```

## 📄 Licença

Este projeto foi desenvolvido utilizando o Firebase Studio.
