# Crach-Inteligente 🎓

Sistema avançado para criação, gestão e geração de crachás estudantis personalizados. Este projeto permite o design dinâmico de crachás, importação em massa via Excel e exportação precisa para PDF (layout A4 com 8 crachás).

## 🚀 Funcionalidades Principais

- **Editor de Design**: Ajuste posições, cores, tamanhos de fonte e fundos em tempo real com preview instantâneo.
- **Importação em Massa**: Envie uma planilha Excel (.xlsx) e as fotos dos alunos para gerar dezenas de crachás de uma só vez.
- **Gestão Inteligente**: Busca por nome, filtros por turma e controle individual de quem deve ser incluído na impressão (Ativos/Inativos).
- **Exportação Profissional**: Geração de PDF calibrado para papel A4 (2 colunas x 4 linhas) com ajustes milimétricos de fonte e alinhamento.
- **Persistência na Nuvem**: Sincronização automática com Firebase Firestore para que você nunca perca seus dados ou modelos de design.

## 🛠️ Tecnologias Utilizadas

- **Frontend**: Next.js 15 (App Router), React, Tailwind CSS.
- **UI Components**: Shadcn/UI, Lucide React.
- **Processamento**: jsPDF (Geração de documentos), XLSX (Leitura de planilhas).
- **Backend**: Firebase Authentication (Anônimo) e Firestore Database.

## 📦 Como Publicar no GitHub

Para subir todo o código para o seu repositório, abra o **Terminal** no editor e execute estes comandos:

1. **Inicie o git e prepare todos os arquivos:**
```bash
git init
git add .
git commit -m "Initial commit: Sistema Crachá Inteligente completo"
```

2. **Conecte ao seu repositório remoto:**
```bash
git branch -M main
git remote add origin https://github.com/TICVM/Crach-Inteligente.git
```

3. **Caso o comando acima falhe** (se você já tiver configurado o remote antes):
```bash
git remote set-url origin https://github.com/TICVM/Crach-Inteligente.git
```

4. **Envie os arquivos para o GitHub:**
```bash
git push -u origin main
```

## 📄 Licença

Este projeto foi desenvolvido utilizando o Firebase Studio como um protótipo funcional de alta fidelidade.