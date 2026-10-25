# Apresentação de Portfólio — CodeAtlas

> **Visualizador Interativo de Dependências e Arquitetura de Software no Navegador**  
> **Link da Aplicação:** [https://thiagoibrahimvieira.github.io/CodeAtlas/](https://thiagoibrahimvieira.github.io/CodeAtlas/)  
> **Repositório GitHub:** [https://github.com/ThiagoIbrahimVieira/CodeAtlas](https://github.com/ThiagoIbrahimVieira/CodeAtlas)

---

## 📌 Resumo Executivo para Portfólio

O **CodeAtlas** é uma ferramenta de engenharia de software desenvolvida para solucionar uma das maiores dores no desenvolvimento moderno: **a dificuldade de visualizar e compreender a arquitetura real e o acoplamento entre arquivos de bases de código JavaScript e TypeScript**.

Diferente de ferramentas que exigem instalação pesada de CLIs globais ou envio de código-fonte para servidores remotos, o CodeAtlas opera com **processamento 100% client-side** diretamente no navegador: o desenvolvedor aponta para a pasta do projeto local e a aplicação extrai a AST (Abstract Syntax Tree), resolve caminhos e aliases de importação (`tsconfig.json`/`jsconfig.json`) e renderiza um grafo direcional interativo de alta performance com feedback visual em tempo real.

---

## 💼 Textos Prontos para Card de Portfólio

### Opção 1: Concisa (ideal para cards de portfólio e currículo)
> **CodeAtlas — Visualizador de Arquitetura e Dependências JS/TS**  
> Aplicação web de análise estática de código e renderização de grafos interativos construída com React 19, TypeScript, Vite e `@xyflow/react`. Realiza parsing de AST via TypeScript Compiler API e resolução de aliases 100% no navegador (sem envio de código a servidores). Possui interface responsiva com design tokens em CSS nativo, conformidade de contraste WCAG 2.2 AA, 54 testes automatizados e pipeline de CI/CD no GitHub Actions.

### Opção 2: Narrativa de Engenharia (ideal para LinkedIn ou estudo de caso)
> **Como construí um analisador de código e visualizador de grafos client-side com React 19 e TypeScript Compiler API**  
> Compreender o impacto de uma alteração em bases de código legadas ou de grande porte é um desafio comum. Para resolver isso com foco em privacidade e rapidez, desenvolvi o **CodeAtlas**:
> - **Análise estática real no navegador:** uso da TypeScript Compiler API para extração formal de declarações de imports/exports e resolução determinística de aliases do `tsconfig.json`.
> - **Grafo reativo:** nós customizados, arestas direcionadas animadas, minimapa e realce contextual de dependências e dependentes.
> - **Engenharia de precisão:** 54 testes automatizados com Vitest, 0 erros no Oxlint, acessibilidade WCAG 2.2 AA e deploy contínuo via GitHub Actions no GitHub Pages.

---

## 🛠️ Tecnologias e Decisões de Arquitetura

| Tecnologia | Função no Projeto | Decisão de Engenharia |
| :--- | :--- | :--- |
| **React 19 & TypeScript** | Interface reativa e tipagem estática | Permite modelar contratos de dados rígidos (`AtlasProject`, `AtlasFile`, `ImportInfo`) garantindo previsibilidade entre o analisador e a camada de renderização. |
| **TypeScript Compiler API** | Parser estático de código | Substitui regex frágeis por parsing formal de AST (`ts.createSourceFile`), cobrindo importações estáticas, dinâmicas (`import()`), re-exports e arquivos JSON. |
| **Dynamic Code-Splitting** | Otimização de performance de bundle | O módulo do analisador TypeScript é carregado sob demanda via `import()` dinâmico, evitando penalizar o tempo de carregamento da landing page inicial. |
| **@xyflow/react** | Motor de renderização de grafos | Fornece manipulação interativa de canvas (zoom, pan, nós personalizados e conexões direcionadas) com posicionamento determinístico em camadas. |
| **Vanilla CSS (Design Tokens)** | Design System próprio | Implementação limpa de tokens de design (paleta Grafite `#151917` e Verde Menta `#63D6A5`), foco visível `:focus-visible` e conformidade WCAG 2.2 AA sem acoplar dependências de frameworks como Tailwind. |
| **Vitest & Oxlint** | Qualidade contínua | Suíte com 54 testes automatizados em 5 arquivos cobrindo parsing, resolução de aliases, construção de grafos e leitura de pastas locais em memória. |
| **GitHub Actions** | Pipeline CI/CD | Automação de qualidade executando lint, testes, build e deploy contínuo no GitHub Pages a cada push na branch principal. |

---

## 🎯 Principais Destaques para Apresentação Técnica

1. **Privacidade Absoluta (Zero Server Transmission):**
   - Demonstra respeito rigoroso a dados sensíveis: nenhum código analisado sai da máquina do usuário.
2. **Resolução Robusta de Módulos:**
   - Suporte a caminhos relativos (`./`, `../`), arquivos `index`, arquivos `.json` e aliases de caminho (`@/*`, `~/*`, etc.) definidos no `tsconfig.json` ou `jsconfig.json`.
3. **Sincronização Tridimensional:**
   - A seleção de um arquivo reflete instantaneamente na árvore de diretórios, nos nós conectados no grafo e no painel lateral de métricas e diagnósticos.
4. **Tratamento de Diagnósticos:**
   - Identificação visual e textual de imports não resolvidos e separação de artefatos gerados/ignorados (como pastas de build ou frameworks).
5. **Responsividade e Acessibilidade:**
   - Layout fluido que se transforma em gavetas deslizantes com backdrop em tablets e celulares, mantendo taxa de contraste adequada (`--text-muted: #829288` com 5.33:1).

---

## 📸 Guia de Capturas de Tela Recomendadas

As imagens abaixo estão salvas no repositório em `docs/assets/` prontas para inclusão em portfolios:

1. **`docs/assets/workspace-graph.png`**: Demonstra a visão principal do workspace com o grafo de dependências, conexões direcionadas, minimapa e a barra superior de comandos.
2. **`docs/assets/details-diagnostics.png`**: Demonstra a seleção de nós, o realce de conexões e o painel de diagnósticos com avisos de importações não resolvidas.
3. **`docs/assets/hero-landing.png`**: Demonstra a landing page técnica com o preview vetorial e os botões de ação ("Explorar demonstração" e "Abrir pasta local").
4. **`docs/assets/mobile-responsive.png`**: Demonstra a adaptabilidade em telas pequenas com gaveta lateral e filtros compactos.
