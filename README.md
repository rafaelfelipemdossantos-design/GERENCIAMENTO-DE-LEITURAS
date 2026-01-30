# SISTEMA DE GESTÃO | Painel Avançado de Gerenciamento de Leitura

Este é um projeto de painel de gestão de leitura desenvolvido em HTML, Tailwind CSS e JavaScript puro. Ele foi projetado para auxiliar no monitoramento e gerenciamento das leituras de Pontos de Venda (PDVs) por promotores de campo, com foco em eficiência e classificação de qualidade (MOP).

## Funcionalidades Principais

*   **Visão Geral (Dashboard):** Acompanhamento do progresso global, total de lojas, lojas de elite e alertas de atraso.
*   **Gestão de Lojas:** Adição, edição e exclusão de PDVs, com filtros avançados por status, frequência e ordenação por pontuação.
*   **Lojas de Elite:** Visualização e análise das lojas classificadas como "Boas" e "Perfeitas", com gráficos de distribuição por canal.
*   **Gestão de Atrasos:** Relatório detalhado dos PDVs com leituras pendentes, indicando o tempo de atraso e permitindo a cobrança via WhatsApp.
*   **Time de Campo:** Gerenciamento de promotores, visualização de eficiência individual e lojas sob sua responsabilidade.
*   **Backup e Restauração:** Funcionalidades para salvar e restaurar os dados do sistema localmente (via `localStorage` do navegador).
*   **Exportação de Dados:** Exportação de relatórios completos para Excel (`.xlsx`).

## Tecnologias Utilizadas

O projeto é uma aplicação de página única (SPA) que utiliza as seguintes tecnologias:

| Tecnologia | Uso |
| :--- | :--- |
| **HTML5** | Estrutura principal da página. |
| **Tailwind CSS** | Framework CSS para estilização rápida e responsiva. |
| **JavaScript (Puro)** | Lógica de negócios, manipulação do DOM e gestão de estado. |
| **Chart.js** | Biblioteca para renderização de gráficos dinâmicos. |
| **SweetAlert2** | Biblioteca para alertas e modais customizados. |
| **SheetJS (xlsx)** | Biblioteca para exportação de dados para Excel. |
| **Font Awesome** | Ícones. |

## Como Utilizar

Este projeto é totalmente *client-side* (roda no navegador) e não requer um servidor web para funcionar.

1.  **Clone o Repositório:**
    ```bash
    git clone [URL DO SEU REPOSITÓRIO]
    cd gerenciamento-leitura
    ```
2.  **Abra o Arquivo:**
    Simplesmente abra o arquivo `index.html` no seu navegador de preferência.

    ```bash
    # No Linux/macOS
    open index.html
    # No Windows
    start index.html
    ```

3.  **Comece a Gerenciar:**
    O sistema carregará com dados de demonstração. Você pode começar a adicionar seus próprios promotores e lojas. Lembre-se que os dados são salvos no `localStorage` do seu navegador.

## Estrutura de Arquivos

A estrutura do projeto é a seguinte:

```
gerenciamento-leitura/
├── index.html          # Arquivo principal do painel
├── README.md           # Este arquivo
├── assets/
│   ├── css/
│   │   └── style.css   # Estilos customizados
│   └── js/
│       └── script.js   # Lógica JavaScript da aplicação
└── .gitignore          # Arquivo de configuração do Git
```

## Contribuição

Sinta-se à vontade para contribuir com melhorias, correções de bugs ou novas funcionalidades.

1.  Faça um fork do projeto.
2.  Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`).
3.  Commit suas mudanças (`git commit -m 'feat: Adiciona nova funcionalidade X'`).
4.  Faça o push para a branch (`git push origin feature/nova-funcionalidade`).
5.  Abra um Pull Request.

---
Desenvolvido por **Manus AI**
