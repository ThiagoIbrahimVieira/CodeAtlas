# CodeAtlas

Visualizador interativo de grafos de dependências para projetos JavaScript e TypeScript.

---

## 📌 Sobre o Projeto

O **CodeAtlas** é uma aplicação web focada em visualização de arquitetura de software. Ele mapeia e apresenta graficamente os arquivos, módulos e relações de dependência de uma base de código, tornando transparente a compreensão da estrutura interna, acoplamentos, módulos isolados e importações não resolvidas.

Este projeto foi concebido como uma iniciativa de portfólio e aprofundamento técnico em engenharia de software frontend, explorando renderização interativa de grafos, acessibilidade, design systems com CSS nativo e análise estática de código.

> **Transparência sobre o estado atual:**  
> A versão atual contempla a **interface visual e interativa completa** (layout de 3 colunas, grafo interativo, navegação sincronizada e painéis de métricas) operando sobre um **conjunto de dados de teste (mock realista)**. O analisador estático real — que fará a leitura de diretórios locais e o parsing dos arquivos via AST/regex — está planejado para as próximas etapas no [Roadmap](#-roadmap).

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

## 🗺️ Roadmap

- [x] **Fase 1: Interface e Grafo Interativo**
  - [x] Design System com paleta grafite/verde menta em Vanilla CSS
  - [x] Layout de três colunas (navegação, grafo central e métricas)
  - [x] Grafo interativo com nós customizados e destaque de dependências
  - [x] Árvore de arquivos com busca e filtros
  - [x] Dados simulados realistas com diagnósticos de importações
- [ ] **Fase 2: Analisador Estático JS/TS (Em breve)**
  - [ ] Parser de imports estáticos (`import ... from '...'`) e dinâmicos (`import(...)`)
  - [ ] Resolução de caminhos relativos e aliases configurados no `tsconfig.json`
  - [ ] Geração dinâmica do grafo a partir do código-fonte
- [ ] **Fase 3: Leitura de Projetos Locais**
  - [ ] Suporte à *File System Access API* para carregar diretórios do computador
  - [ ] Processamento client-side seguro (sem envio de código para servidores externos)
- [ ] **Fase 4: Análise Avançada de Arquitetura**
  - [ ] Detecção automática de ciclos de dependência (dependências circulares)
  - [ ] Identificação de arquivos órfãos (código morto / não importado)
  - [ ] Métricas de acoplamento aferente e eferente
- [ ] **Fase 5: Integração com Repositórios Remotos**
  - [ ] Carregamento direto de repositórios públicos do GitHub

---

## 📄 Licença

Este projeto é desenvolvido para fins de aprendizado e portfólio.
