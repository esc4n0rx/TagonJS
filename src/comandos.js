// src/comandos.js
const { 
  criarBanco, 
  usarBanco, 
  criarTabela, 
  inserirRegistro, 
  mostrarTabela, 
  removerRegistro,
  atualizarRegistro,
  listarTabelas,
  verificarBancoExiste
} = require('./banco');

/**
 * Processa e executa comandos em português
 * @param {string} comando - Comando digitado pelo usuário
 * @param {string} bancoAtivo - Nome do banco atualmente ativo
 * @returns {Object} - Resultado da execução do comando
 */
async function processarComando(comando, bancoAtivo) {
  const comandoLower = comando.toLowerCase().trim();
  
  // Comando: ajuda
  if (comandoLower === 'ajuda' || comandoLower === 'help') {
    return {
      sucesso: true,
      mensagem: exibirAjuda()
    };
  }
  
  // Comando: sair
  if (comandoLower === 'sair' || comandoLower === 'exit') {
    return {
      sucesso: true,
      sair: true
    };
  }
  
  // Comando: criar banco NOME
  const matchCriarBanco = comandoLower.match(/^criar banco (\w+)$/);
  if (matchCriarBanco) {
    const nomeBanco = matchCriarBanco[1];
    const resultado = await criarBanco(nomeBanco);
    return resultado;
  }
  
  // Comando: usar banco NOME
  const matchUsarBanco = comandoLower.match(/^usar banco (\w+)$/);
  if (matchUsarBanco) {
    const nomeBanco = matchUsarBanco[1];
    const existe = await verificarBancoExiste(nomeBanco);
    if (existe) {
      return {
        sucesso: true,
        mensagem: `🗂️ Banco '${nomeBanco}' selecionado.`,
        novoBanco: nomeBanco
      };
    } else {
      return {
        sucesso: false,
        mensagem: `❌ Banco '${nomeBanco}' não encontrado.`
      };
    }
  }
  
  // Verificar se há banco ativo para comandos que precisam
  if (!bancoAtivo) {
    return {
      sucesso: false,
      mensagem: '❌ Nenhum banco selecionado. Use "usar banco NOME" primeiro.'
    };
  }
  
  // Comando: criar tabela NOME (col1:tipo, col2:tipo, ...)
  const matchCriarTabela = comandoLower.match(/^criar tabela (\w+) \((.+)\)$/);
  if (matchCriarTabela) {
    const nomeTabela = matchCriarTabela[1];
    const colunas = matchCriarTabela[2];
    const resultado = await criarTabela(bancoAtivo, nomeTabela, colunas);
    return resultado;
  }
  
  // Comando: inserir em TABELA (col1:valor, col2:valor, ...)
  const matchInserir = comandoLower.match(/^inserir em (\w+) \((.+)\)$/);
  if (matchInserir) {
    const nomeTabela = matchInserir[1];
    const valores = matchInserir[2];
    const resultado = await inserirRegistro(bancoAtivo, nomeTabela, valores);
    return resultado;
  }
  
  // Comando: mostrar tabela NOME
  const matchMostrar = comandoLower.match(/^mostrar tabela (\w+)$/);
  if (matchMostrar) {
    const nomeTabela = matchMostrar[1];
    const resultado = await mostrarTabela(bancoAtivo, nomeTabela);
    return resultado;
  }
  
  // Comando: remover de TABELA onde CONDICAO
  const matchRemover = comandoLower.match(/^remover de (\w+) onde (.+)$/);
  if (matchRemover) {
    const nomeTabela = matchRemover[1];
    const condicao = matchRemover[2];
    const resultado = await removerRegistro(bancoAtivo, nomeTabela, condicao);
    return resultado;
  }
  
  // Comando: atualizar TABELA onde CONDICAO definir ATUALIZACAO
  const matchAtualizar = comandoLower.match(/^atualizar (\w+) onde (.+) definir (.+)$/);
  if (matchAtualizar) {
    const nomeTabela = matchAtualizar[1];
    const condicao = matchAtualizar[2];
    const atualizacao = matchAtualizar[3];
    const resultado = await atualizarRegistro(bancoAtivo, nomeTabela, condicao, atualizacao);
    return resultado;
  }
  
  // Comando: listar tabelas
  if (comandoLower === 'listar tabelas') {
    const resultado = await listarTabelas(bancoAtivo);
    return resultado;
  }
  
  // Comando não reconhecido
  return {
    sucesso: false,
    mensagem: '❌ Comando não reconhecido. Digite "ajuda" para ver os comandos disponíveis.'
  };
}

/**
 * Retorna texto de ajuda com todos os comandos disponíveis
 */
function exibirAjuda() {
  return `
📚 Comandos disponíveis:

🗄️  Gerenciamento de bancos:
   criar banco NOME              - Cria um novo banco de dados
   usar banco NOME               - Seleciona um banco para usar

📋 Gerenciamento de tabelas:
   criar tabela NOME (colunas)   - Cria uma nova tabela
   listar tabelas                - Lista todas as tabelas do banco

📊 Manipulação de dados:
   inserir em TABELA (dados)     - Insere um novo registro
   mostrar tabela TABELA         - Mostra todos os registros da tabela
   remover de TABELA onde X=Y    - Remove registros que atendem condição
   atualizar TABELA onde X=Y definir Z=W - Atualiza registros

🔧 Outros comandos:
   ajuda                         - Mostra esta ajuda
   sair                          - Encerra o programa

💡 Exemplos:
   criar banco loja
   usar banco loja
   criar tabela produtos (id:numero, nome:texto, preco:numero)
   inserir em produtos (id:1, nome:Notebook, preco:2500)
   mostrar tabela produtos
`;
}

module.exports = { processarComando };