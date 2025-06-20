// src/cli.js
const readline = require('readline');
const chalk = require('chalk');
const { processarComando } = require('./comandos');
const { inicializarDiretorio } = require('./util');

// Interface do CLI
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Estado global do aplicativo
let bancoAtivo = null;

// Função para exibir o prompt
function exibirPrompt() {
  const prompt = bancoAtivo 
    ? chalk.cyan(`TagonJS [${bancoAtivo}] > `)
    : chalk.cyan('TagonJS > ');
  rl.question(prompt, processarEntrada);
}

// Função para processar entrada do usuário
async function processarEntrada(entrada) {
  const comando = entrada.trim();
  
  if (!comando) {
    exibirPrompt();
    return;
  }

  try {
    const resultado = await processarComando(comando, bancoAtivo);
    
    // Atualizar banco ativo se necessário
    if (resultado.novoBanco) {
      bancoAtivo = resultado.novoBanco;
    }
    
    // Exibir mensagem de resultado
    if (resultado.sucesso) {
      console.log(chalk.green(resultado.mensagem));
    } else {
      console.log(chalk.red(resultado.mensagem));
    }
    
    // Verificar se deve sair
    if (resultado.sair) {
      console.log(chalk.yellow('👋 Até logo!'));
      rl.close();
      return;
    }
    
  } catch (error) {
    console.log(chalk.red(`❌ Erro: ${error.message}`));
  }
  
  exibirPrompt();
}

// Função principal de inicialização
function inicializar() {
  console.log(chalk.blue.bold('🗃️  TagonJS - Sistema de Banco de Dados Educativo'));
  console.log(chalk.gray('Digite "ajuda" para ver os comandos disponíveis ou "sair" para encerrar.\n'));
  
  // Inicializar diretório de dados
  inicializarDiretorio();
  
  // Iniciar prompt
  exibirPrompt();
}

// Tratamento de saída
rl.on('close', () => {
  process.exit(0);
});

// Inicializar aplicação
inicializar();