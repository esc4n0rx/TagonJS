// src/cli-new.js
const readline = require('readline');
const chalk = require('chalk');
const { Lexer } = require('./parser/lexer');
const { Parser } = require('./parser/parser');
const { QueryExecutor } = require('./query/executor');
const { StorageManager } = require('./storage/manager');

// Interface do CLI
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class TagonCLI {
  constructor() {
    this.storageManager = new StorageManager();
    this.queryExecutor = new QueryExecutor(this.storageManager);
    this.currentDatabase = null;
  }

  async initialize() {
    await this.storageManager.initialize();
    console.log(chalk.blue.bold('🗃️  TagonJS v2.0 - Sistema de Banco de Dados Educativo'));
    console.log(chalk.gray('Digite "ajuda" para ver os comandos disponíveis ou "sair" para encerrar.\n'));
    this.showPrompt();
  }

  showPrompt() {
    const prompt = this.currentDatabase 
      ? chalk.cyan(`TagonJS [${this.currentDatabase}] > `)
      : chalk.cyan('TagonJS > ');
    rl.question(prompt, (input) => this.processInput(input));
  }

  async processInput(input) {
    const command = input.trim();
    
    if (!command) {
      this.showPrompt();
      return;
    }

    try {
      // Comandos especiais
      if (command.toLowerCase() === 'ajuda' || command.toLowerCase() === 'help') {
        this.showHelp();
      } else if (command.toLowerCase() === 'sair' || command.toLowerCase() === 'exit') {
        console.log(chalk.yellow('👋 Até logo!'));
        rl.close();
        return;
      } else if (command.toLowerCase().startsWith('usar banco ')) {
        await this.handleUseDatabase(command);
      } else {
        // Processar comandos SQL
        await this.processSQLCommand(command);
      }
    } catch (error) {
      console.log(chalk.red(`❌ Erro: ${error.message}`));
    }
    
    this.showPrompt();
  }

  async handleUseDatabase(command) {
    const match = command.match(/usar banco (\w+)/i);
    if (match) {
      const dbName = match[1];
      if (await this.storageManager.databaseExists(dbName)) {
        this.currentDatabase = dbName;
        this.queryExecutor.setCurrentDatabase(dbName);
        console.log(chalk.green(`🗂️ Banco '${dbName}' selecionado`));
      } else {
        console.log(chalk.red(`❌ Banco '${dbName}' não encontrado`));
      }
    }
  }

  async processSQLCommand(command) {
    // Análise léxica
    const lexer = new Lexer(command);
    const tokens = lexer.tokenize();
    
    // Análise sintática
    const parser = new Parser(tokens);
    const ast = parser.parse();
    
    // Execução
    const result = await this.queryExecutor.execute(ast);
    
    if (result.sucesso) {
      console.log(chalk.green(result.mensagem));
      
      // Se há resultados, formatá-los
      if (result.resultados && result.resultados.length > 0) {
        this.formatResults(result.resultados);
      }
    } else {
      console.log(chalk.red(result.mensagem));
    }
  }

  formatResults(results) {
    if (results.length === 0) {
      console.log(chalk.gray('Nenhum resultado encontrado.'));
      return;
    }

    // Obter todas as colunas
    const columns = Object.keys(results[0]);
    
    // Calcular larguras
    const widths = {};
    columns.forEach(col => {
      widths[col] = Math.max(
        col.length,
        Math.max(...results.map(row => String(row[col] || '').length))
      );
    });

    // Linha superior
    const topLine = '┌' + columns.map(col => '─'.repeat(widths[col] + 2)).join('┬') + '┐';
    console.log(topLine);

    // Cabeçalhos
    const headerLine = '│' + columns.map(col => ` ${col.padEnd(widths[col])} `).join('│') + '│';
    console.log(chalk.bold(headerLine));

    // Linha separadora
    const sepLine = '├' + columns.map(col => '─'.repeat(widths[col] + 2)).join('┼') + '┤';
    console.log(sepLine);

    // Dados
    results.forEach(row => {
      const dataLine = '│' + columns.map(col => {
        const value = String(row[col] || '');
        return ` ${value.padEnd(widths[col])} `;
      }).join('│') + '│';
      console.log(dataLine);
    });

    // Linha inferior
    const bottomLine = '└' + columns.map(col => '─'.repeat(widths[col] + 2)).join('┴') + '┘';
    console.log(bottomLine);
  }

// src/cli-new.js (continuação - finalizando a classe)

  showHelp() {
    console.log(chalk.blue(`
📚 TagonJS v2.0 - Comandos Disponíveis:

🗄️  Gerenciamento de Bancos:
   criar banco NOME                    - Cria um novo banco de dados
   usar banco NOME                     - Seleciona um banco para usar

📋 Gerenciamento de Tabelas:
   criar tabela NOME (colunas)         - Cria uma nova tabela
   
📊 Consultas (SELECT):
   selecionar * de TABELA              - Seleciona todos os registros
   selecionar COLUNAS de TABELA        - Seleciona colunas específicas
   selecionar * de TAB1 juntar TAB2 em TAB1.id = TAB2.id - JOIN
   ... onde CONDICAO                   - Filtrar resultados
   ... ordenar por COLUNA              - Ordenar resultados
   ... agrupar por COLUNA              - Agrupar resultados

📝 Manipulação de Dados:
   inserir em TABELA (cols) valores (vals) - Insere um novo registro
   atualizar TABELA definir COL=VAL onde...  - Atualiza registros
   remover de TABELA onde CONDICAO      - Remove registros

🔧 Outros:
   ajuda                               - Mostra esta ajuda
   sair                                - Encerra o programa

💡 Exemplos:
   criar banco loja
   usar banco loja
   criar tabela produtos (id:numero, nome:texto, preco:numero)
   inserir em produtos (id, nome, preco) valores (1, "Notebook", 2500)
   selecionar * de produtos onde preco > 1000
   selecionar p.nome, c.nome de produtos p juntar categorias c em p.categoria_id = c.id
`));
  }
}

// Tratamento de saída
rl.on('close', () => {
  process.exit(0);
});

// Inicializar aplicação
const cli = new TagonCLI();
cli.initialize().catch(error => {
  console.error(chalk.red('Erro na inicialização:', error.message));
  process.exit(1);
});