
# 🗃️ TagonJS v2.0

**TagonJS** é um sistema educacional de banco de dados com comandos simples em português. A versão 2.0 traz um parser SQL completo, suporte a `JOIN`, `WHERE`, `ORDER BY`, `GROUP BY`, e muito mais — com foco em aprendizado acessível e arquitetura robusta.

---

## 🚀 Novidades na Versão 2.0

- ✅ **Parser SQL completo** (léxico + sintático)
- ✅ **Suporte a JOINs** (`INNER`, `LEFT`, `RIGHT`)
- ✅ **Consultas avançadas** com `WHERE`, `ORDER BY`, `GROUP BY`
- ✅ **Arquitetura modular** com padrões de design
- ✅ **Tratamento de erros melhorado**
- ✅ **Formatação avançada** dos resultados

---

## 📋 Comandos Disponíveis

### 🛠️ Gerenciamento de Banco de Dados

```sql
criar banco nome_do_banco
usar banco nome_do_banco
```

### 🧱 Gerenciamento de Tabelas

```sql
criar tabela produtos (
  id:numero,
  nome:texto,
  preco:numero,
  categoria_id:numero
)
```

### 🔍 Consultas (SELECT)

```sql
-- Seleção completa
selecionar * de produtos

-- Seleção de colunas específicas
selecionar nome, preco de produtos

-- Filtro com WHERE
selecionar * de produtos onde preco > 100

-- JOIN entre tabelas
selecionar p.nome, c.nome 
de produtos p 
juntar categorias c em p.categoria_id = c.id

-- LEFT JOIN
selecionar u.nome, p.titulo 
de usuarios u 
esquerda juntar posts p em u.id = p.usuario_id

-- Ordenação
selecionar * de produtos ordenar por preco decrescente

-- Agrupamento
selecionar categoria_id, count(*) 
de produtos 
agrupar por categoria_id
```

### ✏️ Manipulação de Dados

```sql
-- Inserção
inserir em produtos (id, nome, preco) 
valores (1, "Notebook", 2500)

-- Atualização
atualizar produtos 
definir preco = 2200 
onde id = 1

-- Remoção
remover de produtos onde preco < 100
```

---

## 🏗️ Estrutura do Projeto

```
src/
├── cli-new.js         # Interface CLI principal
├── parser/
│   ├── lexer.js       # Analisador léxico (tokens)
│   ├── parser.js      # Analisador sintático (AST)
│   └── ast/
│       └── nodes.js   # Nós da árvore sintática
├── query/
│   └── executor.js    # Executor de consultas
├── storage/
│   └── manager.js     # Gerenciador de arquivos XML
└── util.js            # Funções utilitárias
```

---

## ⚙️ Instalação e Execução

### Pré-requisitos

- Node.js v14 ou superior  
- npm

### Instalação

```bash
git clone https://github.com/user/tagonjs.git
cd tagonjs
npm install
npm start
```

### Scripts Disponíveis

```bash
npm start         # Executa a versão 2.0 (CLI)
npm test          # Executa todos os testes
npm run test-parser  # Testa apenas o parser
npm run start-old    # Executa a versão antiga (v1.0)
```

---

## 📊 Exemplo de Uso

```sql
-- Criar e usar banco
criar banco loja
usar banco loja

-- Criar tabelas
criar tabela categorias (
  id:numero,
  nome:texto
)

criar tabela produtos (
  id:numero,
  nome:texto,
  preco:numero,
  categoria_id:numero
)

-- Inserir dados
inserir em categorias (id, nome) valores (1, "Eletrônicos")
inserir em categorias (id, nome) valores (2, "Livros")

inserir em produtos (id, nome, preco, categoria_id) valores (1, "Smartphone", 800, 1)
inserir em produtos (id, nome, preco, categoria_id) valores (2, "Tablet", 400, 1)
inserir em produtos (id, nome, preco, categoria_id) valores (3, "JavaScript: O Guia Definitivo", 120, 2)

-- Consulta com JOIN
selecionar p.nome, p.preco, c.nome as categoria
de produtos p
juntar categorias c em p.categoria_id = c.id
onde p.preco > 200
ordenar por p.preco decrescente
```

---

## 🧪 Testes

Execute os testes com:

```bash
npm test
```

Inclui verificação de:

- ✅ Criação de bancos e tabelas  
- ✅ Inserção de dados  
- ✅ SELECT simples e complexos  
- ✅ JOINs (`INNER`, `LEFT`)  
- ✅ Condições com `WHERE`  
- ✅ `ORDER BY`, `GROUP BY`  
- ✅ Atualizações e exclusões

---

## 🔧 Tecnologias e Arquitetura

### Parser SQL

- **Lexer**: Tokens em português
- **Parser**: Gera árvore sintática (AST)
- **Visitor Pattern**: Para interpretar consultas

### Query Engine

- **Executor**: Processa e executa comandos
- **JOINs**: INNER, LEFT, RIGHT
- **WHERE**: Operadores `=`, `!=`, `<`, `>`, `LIKE`
- **ORDER BY** e **GROUP BY**: Suporte total

### Armazenamento

- **Formato**: XML estruturado
- **Transações**: Atômicas e seguras
- **Validação**: Tipagem e restrições

---

## 🔄 Compatibilidade com v1.0

Bancos criados na versão 1.0 são totalmente compatíveis com a v2.0.

Para usar a versão anterior:

```bash
npm run start-old
```

---

## 🤝 Contribuição

1. Fork este repositório  
2. Crie uma nova branch: `git checkout -b feature/NovaFuncionalidade`  
3. Commit suas mudanças: `git commit -m 'Adiciona NovaFuncionalidade'`  
4. Push para o repositório: `git push origin feature/NovaFuncionalidade`  
5. Crie um Pull Request

---

## 🛣️ Roadmap Futuro

- [ ] Funções agregadas: `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`  
- [ ] Subqueries: SELECTs aninhados  
- [ ] Índices para otimização  
- [ ] Transações: `BEGIN`, `COMMIT`, `ROLLBACK`  
- [ ] Views: Tabelas virtuais  
- [ ] Interface Web  
- [ ] Importação/Exportação: CSV, JSON, SQL  
- [ ] Backup automático

---

## 📄 Licença

Este projeto é licenciado sob a [MIT License](LICENSE).

---

## 👨‍💻 Autor

**TagonJS Team**  
GitHub: [@seu-github](https://github.com/seu-github)  
Email: contato@tagonjs.com

---

⭐ _Se este projeto te ajudou, considere deixar uma estrela no repositório!_
