# CodeAtlas

Visualizador interativo de grafos de dependências para projetos JavaScript e TypeScript.

🔗 **Acesse online:** [https://thiagoibrahimvieira.github.io/CodeAtlas/](https://thiagoibrahimvieira.github.io/CodeAtlas/)

---

## 📌 Sobre o Projeto

O **CodeAtlas** é uma aplicação web focada em visualização de arquitetura de software. Ele mapeia e apresenta graficamente os arquivos, módulos e relações de dependência de uma base de código, tornando transparente a compreensão da estrutura interna, acoplamentos, módulos isolados e importações não resolvidas.

O processamento é **100% client-side** diretamente no navegador: o código-fonte analisado nunca é transmitido a nenhum servidor externo, garantindo total privacidade e segurança.

---

## 🚀 Funcionalidades Implementadas

- **Landing Page Técnica:** Apresentação com pré-visualização vetorial dinâmica e acesso direto ao workspace.
- **Grafo Interativo com React Flow:**
  - Nós personalizados estilizados por categoria de arquivo (Componentes, Hooks, Services, Types, Utils, Styles).
  - Conexões direcionadas indicando o fluxo de dependências.
  - Destaque inteligente: ao selecionar um arquivo, suas dependências e dependentes são realçados, atenuando os nós não relacionados.
  - Controles de navegação: zoom, pan, centralização (*fit view*) e minimapa com guia de legendas.
- **Árvore de Arquivos (File Tree):**
  - Navegação em árvore com pastas expansíveis e contadores de itens.
  - Filtros rápidos por tipo de arquivo.
  - Busca em tempo real com realce de correspondências.
- **Sincronização Bidirecional Total:**
  - A seleção de um arquivo na árvore, no grafo ou no painel de detalhes mantém todos os componentes sincronizados sem saltos bruscos de câmera.
- **Painel de Detalhes e Diagnósticos:**
  - Métricas de complexidade (número de dependências, dependentes diretos, imports externos).
  - Relação de importações internas, módulos externos e diagnósticos (como imports não resolvidos).
  - Navegação com um clique entre arquivos relacionados.
- **Acessibilidade e Design:**
  - Design tokens com Vanilla CSS e paleta de alto contraste inspirada em ferramentas de desenvolvimento (Grafite `#151917` e Verde Menta `#63D6A5`).
  - Suporte completo a navegação via teclado, indicadores de foco visível (`:focus-visible`) e respeito a `prefers-reduced-motion`.

---

## 🛠️ Tecnologias Utilizadas

- **[React 19](https://react.dev/):** Biblioteca para construção de interfaces reativas com componentes funcionais e hooks.
- **[TypeScript](https://www.typescriptlang.org/):** Tipagem estática rigorosa para garantir contratos de dados consistentes.
- **[Vite](https://vite.dev/):** Bundler e ambiente de desenvolvimento ultrarrápido com Hot Module Replacement (HMR).
- **[@xyflow/react (React Flow)](https://reactflow.dev/):** Biblioteca para renderização do grafo interativo de nós e arestas.
- **Vanilla CSS:** Design System baseado em variáveis CSS (Design Tokens), sem dependências pesadas de frameworks como Tailwind.
- **[Oxlint](https://oxc.rs/):** Linter de alta performance baseado em Rust.

---

## 📂 Estrutura do Projeto

```text
CodeAtlas/
├── public/                # Favicon e ativos estáticos
├── src/
│   ├── components/
│   │   ├── details/       # Painel de métricas e diagnóstico do arquivo selecionado
│   │   ├── fileTree/      # Árvore de arquivos, filtros de tipo e busca
│   │   ├── graph/         # Grafo React Flow e nós personalizados (CustomFileNode)
│   │   ├── layout/        # Barra superior (HeaderBar) e estrutura geral
│   │   └── LandingPage.tsx# Tela inicial com pré-visualização vetorial
│   ├── mock/              # Dados simulados realistas (sampleProject com 13 arquivos e arestas)
│   ├── types/             # Definições de tipos TypeScript (AtlasFile, AtlasEdge, etc.)
│   ├── App.tsx            # Ponto de entrada da aplicação e controle de estado global
│   ├── App.css            # Estilização completa com regras semânticas
│   ├── index.css          # Design tokens (cores, espaçamentos, tipografia) e reset
│   └── main.tsx           # Inicialização do React DOM
├── .gitignore             # Regras de exclusão para o Git
├── package.json           # Dependências e scripts npm
├── tsconfig.json          # Configuração TypeScript
└── vite.config.ts         # Configuração do Vite
```

---

## 💻 Como Executar Localmente

### Pré-requisitos

- **Node.js** (versão 18 ou superior recomendada)
- **npm** (incluso com o Node.js) ou outro gerenciador de pacotes (pnpm, yarn)

### Passo a passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/ThiagoIbrahimVieira/CodeAtlas.git
   cd CodeAtlas
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

4. **Abra no navegador:**  
   Acesse `http://localhost:5173` para visualizar a aplicação.

### Scripts Disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor local de desenvolvimento com HMR |
| `npm run build` | Compila o TypeScript e gera o bundle de produção na pasta `dist/` |
| `npm run lint` | Executa o Oxlint para checagem de erros e boas práticas |
| `npm run preview` | Executa um servidor local simulando o build de produção |

---

## 🗺️ Roadmap do Projeto

- [x] **Fase 1: Interface e Grafo Interativo**
  - [x] Design System com paleta grafite/verde menta em Vanilla CSS
  - [x] Layout de três colunas (árvore de arquivos, grafo central e métricas)
  - [x] Grafo interativo com nós customizados e destaque de dependências
  - [x] Árvore de arquivos com busca em tempo real e filtros por tipo
- [x] **Fase 2: Analisador Estático JS/TS**
  - [x] Extração de imports e exports via TypeScript Compiler API (AST)
  - [x] Resolução de caminhos relativos e arquivos index
  - [x] Construção determinística de nós e arestas direcionadas
- [x] **Fase 3: Leitura de Projetos Locais**
  - [x] Carregamento de pastas locais diretamente pelo navegador
  - [x] Filtragem de pastas ignoradas (`node_modules`, `.git`, `dist`, etc.)
  - [x] Processamento 100% client-side sem tráfego de código para servidores
- [x] **Fase 4: Resolução de Aliases e Tipos de Arquivos**
  - [x] Suporte a aliases de caminho configurados no `tsconfig.json` ou `jsconfig.json`
  - [x] Resolução de módulos e arquivos JSON
  - [x] Classificação de dependências externas, não resolvidas e geradas/ignoradas
- [x] **Fase 7: Auditoria Técnica, Testes e Qualidade**
  - [x] 54 testes automatizados em 5 suítes com Vitest
  - [x] Linting rigoroso sem erros ou avisos com Oxlint
  - [x] Dynamic import para code-splitting da Compiler API
- [x] **Fase 8: Polimento, Responsividade e Acessibilidade**
  - [x] Conformidade de contraste WCAG 2.2 AA (`--text-muted: #829288`)
  - [x] Semântica HTML (`<h2>`, `<h3>`), papéis ARIA (`role="treeitem"`, `aria-selected`)
  - [x] Layout responsivo para Desktop, Tablet e Mobile com gavetas e backdrop
- [x] **Fase 9: Publicação da Versão Web**
  - [x] Pipeline de CI/CD automatizado via GitHub Actions
  - [x] Deploy contínuo no GitHub Pages com subcaminho base configurável
  - [x] Compatibilidade com Vercel e suporte a headers de segurança
- [ ] **Fase 10: Documentação, Apresentação e Portfólio (Próxima etapa)**
- [ ] **Futuro: Análise Avançada de Arquitetura & Integração Git Remota**

---

## 📄 Licença

Este projeto é desenvolvido para fins de aprendizado e portfólio.
