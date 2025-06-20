// src/banco.js
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const { lerArquivo, escreverArquivo, arquivoExiste } = require('./util');
const path = require('path');

// Configurações do parser XML
const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  textNodeName: '#text',
  parseAttributeValue: true,
  parseTrueNumberOnly: false,
  arrayMode: false
};

const builderOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  textNodeName: '#text',
  format: true,
  indentBy: '  '
};

const parser = new XMLParser(parserOptions);
const builder = new XMLBuilder(builderOptions);

/**
 * Cria um novo banco de dados (arquivo XML)
 * @param {string} nomeBanco - Nome do banco a ser criado
 */
async function criarBanco(nomeBanco) {
  const caminhoArquivo = path.join('dados', `${nomeBanco}.xml`);
  
  if (await arquivoExiste(caminhoArquivo)) {
    return {
      sucesso: false,
      mensagem: `❌ Banco '${nomeBanco}' já existe.`
    };
  }
  
  // Estrutura inicial do banco
  const estruturaBanco = {
    banco: {
      '@nome': nomeBanco,
      '@criado': new Date().toISOString(),
      tabelas: {}
    }
  };
  
  const xmlContent = builder.build(estruturaBanco);
  await escreverArquivo(caminhoArquivo, xmlContent);
  
  return {
    sucesso: true,
    mensagem: `✅ Banco '${nomeBanco}' criado com sucesso.`
  };
}

/**
 * Verifica se um banco existe
 * @param {string} nomeBanco - Nome do banco
 */
async function verificarBancoExiste(nomeBanco) {
  const caminhoArquivo = path.join('dados', `${nomeBanco}.xml`);
  return await arquivoExiste(caminhoArquivo);
}

/**
 * Carrega dados de um banco XML
 * @param {string} nomeBanco - Nome do banco
 */
async function carregarBanco(nomeBanco) {
  const caminhoArquivo = path.join('dados', `${nomeBanco}.xml`);
  const xmlContent = await lerArquivo(caminhoArquivo);
  return parser.parse(xmlContent);
}

/**
 * Salva dados em um banco XML
 * @param {string} nomeBanco - Nome do banco
 * @param {Object} dados - Dados a serem salvos
 */
async function salvarBanco(nomeBanco, dados) {
  const caminhoArquivo = path.join('dados', `${nomeBanco}.xml`);
  const xmlContent = builder.build(dados);
  await escreverArquivo(caminhoArquivo, xmlContent);
}

/**
 * Cria uma nova tabela no banco
 * @param {string} nomeBanco - Nome do banco
 * @param {string} nomeTabela - Nome da tabela
 * @param {string} definicaoColunas - Definição das colunas (ex: "id:numero,nome:texto")
 */
async function criarTabela(nomeBanco, nomeTabela, definicaoColunas) {
  try {
    const dados = await carregarBanco(nomeBanco);
    
    // Verificar se tabela já existe
    if (dados.banco.tabelas && dados.banco.tabelas[nomeTabela]) {
      return {
        sucesso: false,
        mensagem: `❌ Tabela '${nomeTabela}' já existe.`
      };
    }
    
    // Processar definição das colunas
    const colunas = {};
    const colunasArray = definicaoColunas.split(',');
    
    for (let coluna of colunasArray) {
      const [nome, tipo] = coluna.trim().split(':');
      if (!nome || !tipo) {
        return {
          sucesso: false,
          mensagem: '❌ Formato inválido para colunas. Use: nome:tipo'
        };
      }
      colunas[nome.trim()] = {
        '@tipo': tipo.trim()
      };
    }
    
    // Inicializar tabelas se não existir
    if (!dados.banco.tabelas) {
      dados.banco.tabelas = {};
    }
    
    // Criar estrutura da tabela
    dados.banco.tabelas[nomeTabela] = {
      '@criada': new Date().toISOString(),
      colunas: colunas,
      registros: {}
    };
    
    await salvarBanco(nomeBanco, dados);
    
    return {
      sucesso: true,
      mensagem: `✅ Tabela '${nomeTabela}' criada com sucesso.`
    };
    
  } catch (error) {
    return {
      sucesso: false,
      mensagem: `❌ Erro ao criar tabela: ${error.message}`
    };
  }
}

/**
 * Insere um registro na tabela
 * @param {string} nomeBanco - Nome do banco
 * @param {string} nomeTabela - Nome da tabela
 * @param {string} valores - Valores a serem inseridos (ex: "id:1,nome:João")
 */
async function inserirRegistro(nomeBanco, nomeTabela, valores) {
  try {
    const dados = await carregarBanco(nomeBanco);
    
    // Verificar se tabela existe
    if (!dados.banco.tabelas || !dados.banco.tabelas[nomeTabela]) {
      return {
        sucesso: false,
        mensagem: `❌ Tabela '${nomeTabela}' não existe.`
      };
    }
    
    const tabela = dados.banco.tabelas[nomeTabela];
    
    // Processar valores
    const registro = {};
    const valoresArray = valores.split(',');
    
    for (let valor of valoresArray) {
      const [campo, val] = valor.trim().split(':');
      if (!campo || val === undefined) {
        return {
          sucesso: false,
          mensagem: '❌ Formato inválido para valores. Use: campo:valor'
        };
      }
      
      const nomeCampo = campo.trim();
      let valorCampo = val.trim();
      
      // Verificar se coluna existe
      if (!tabela.colunas[nomeCampo]) {
        return {
          sucesso: false,
          mensagem: `❌ Coluna '${nomeCampo}' não existe na tabela.`
        };
      }
      
      // Converter tipo se necessário
      const tipoColuna = tabela.colunas[nomeCampo]['@tipo'];
      if (tipoColuna === 'numero') {
        valorCampo = parseFloat(valorCampo);
        if (isNaN(valorCampo)) {
          return {
            sucesso: false,
            mensagem: `❌ Valor inválido para coluna '${nomeCampo}' (esperado: número)`
          };
        }
      }
      
      registro[nomeCampo] = valorCampo;
    }
    
    // Inicializar registros se não existir
    if (!tabela.registros) {
      tabela.registros = {};
    }
    
    // Gerar ID único para o registro
    const proximoId = Object.keys(tabela.registros).length + 1;
    tabela.registros[`reg_${proximoId}`] = registro;
    
    await salvarBanco(nomeBanco, dados);
    
    return {
      sucesso: true,
      mensagem: `✅ Registro inserido na tabela '${nomeTabela}' com sucesso.`
    };
    
  } catch (error) {
    return {
      sucesso: false,
      mensagem: `❌ Erro ao inserir registro: ${error.message}`
    };
  }
}

/**
 * Mostra todos os registros de uma tabela
 * @param {string} nomeBanco - Nome do banco
 * @param {string} nomeTabela - Nome da tabela
 */
async function mostrarTabela(nomeBanco, nomeTabela) {
  try {
    const dados = await carregarBanco(nomeBanco);
    
    // Verificar se tabela existe
    if (!dados.banco.tabelas || !dados.banco.tabelas[nomeTabela]) {
      return {
        sucesso: false,
        mensagem: `❌ Tabela '${nomeTabela}' não existe.`
      };
    }
    
    const tabela = dados.banco.tabelas[nomeTabela];
    
    // Obter nomes das colunas
    const colunas = Object.keys(tabela.colunas);
    
    if (colunas.length === 0) {
      return {
        sucesso: true,
        mensagem: `📋 Tabela '${nomeTabela}' não possui colunas.`
      };
    }
    
    // Verificar se há registros
    if (!tabela.registros || Object.keys(tabela.registros).length === 0) {
      return {
        sucesso: true,
        mensagem: `📋 Tabela '${nomeTabela}' está vazia.`
      };
    }
    
    // Construir tabela formatada
    const registros = Object.values(tabela.registros);
    const tabelaFormatada = construirTabelaFormatada(colunas, registros);
    
    return {
      sucesso: true,
      mensagem: `📊 Tabela '${nomeTabela}':\n${tabelaFormatada}`
    };
    
  } catch (error) {
    return {
      sucesso: false,
      mensagem: `❌ Erro ao mostrar tabela: ${error.message}`
    };
  }
}

/**
 * Remove registros de uma tabela com base em condição
 * @param {string} nomeBanco - Nome do banco
 * @param {string} nomeTabela - Nome da tabela
 * @param {string} condicao - Condição para remoção (ex: "id=1")
 */
async function removerRegistro(nomeBanco, nomeTabela, condicao) {
  try {
    const dados = await carregarBanco(nomeBanco);
    
    // Verificar se tabela existe
    if (!dados.banco.tabelas || !dados.banco.tabelas[nomeTabela]) {
      return {
        sucesso: false,
        mensagem: `❌ Tabela '${nomeTabela}' não existe.`
      };
    }
    
    const tabela = dados.banco.tabelas[nomeTabela];
    
    if (!tabela.registros) {
      return {
        sucesso: false,
        mensagem: `❌ Tabela '${nomeTabela}' não possui registros.`
      };
    }
    
    // Processar condição
    const [campo, valor] = condicao.split('=');
    if (!campo || valor === undefined) {
      return {
        sucesso: false,
        mensagem: '❌ Formato inválido para condição. Use: campo=valor'
      };
    }
    
    const nomeCampo = campo.trim();
    let valorCondicao = valor.trim();
    
    // Converter tipo se for número
    if (tabela.colunas[nomeCampo] && tabela.colunas[nomeCampo]['@tipo'] === 'numero') {
      valorCondicao = parseFloat(valorCondicao);
    }
    
    // Encontrar e remover registros que atendem à condição
    let removidos = 0;
    const registrosParaManter = {};
    
    for (let [id, registro] of Object.entries(tabela.registros)) {
      if (registro[nomeCampo] != valorCondicao) {
        registrosParaManter[id] = registro;
      } else {
        removidos++;
      }
    }
    
    tabela.registros = registrosParaManter;
    await salvarBanco(nomeBanco, dados);
    
    return {
      sucesso: true,
      mensagem: `✅ ${removidos} registro(s) removido(s) da tabela '${nomeTabela}'.`
    };
    
  } catch (error) {
    return {
      sucesso: false,
      mensagem: `❌ Erro ao remover registro: ${error.message}`
    };
  }
}

/**
 * Atualiza registros de uma tabela com base em condição
 * @param {string} nomeBanco - Nome do banco
 * @param {string} nomeTabela - Nome da tabela
 * @param {string} condicao - Condição para atualização (ex: "id=1")
 * @param {string} atualizacao - Campos a serem atualizados (ex: "nome=Pedro")
 */
async function atualizarRegistro(nomeBanco, nomeTabela, condicao, atualizacao) {
  try {
    const dados = await carregarBanco(nomeBanco);
    
    // Verificar se tabela existe
    if (!dados.banco.tabelas || !dados.banco.tabelas[nomeTabela]) {
      return {
        sucesso: false,
        mensagem: `❌ Tabela '${nomeTabela}' não existe.`
      };
    }
    
    const tabela = dados.banco.tabelas[nomeTabela];
    
    if (!tabela.registros) {
      return {
        sucesso: false,
        mensagem: `❌ Tabela '${nomeTabela}' não possui registros.`
      };
    }
    
    // Processar condição
    const [campoCondicao, valorCondicao] = condicao.split('=');
    const [campoAtualizacao, valorAtualizacao] = atualizacao.split('=');
    
    if (!campoCondicao || !valorCondicao || !campoAtualizacao || !valorAtualizacao) {
      return {
        sucesso: false,
        mensagem: '❌ Formato inválido. Use: campo=valor'
      };
    }
    
    const nomeCampoCondicao = campoCondicao.trim();
    let valorCondicaoProcessado = valorCondicao.trim();
    const nomeCampoAtualizacao = campoAtualizacao.trim();
    let valorAtualizacaoProcessado = valorAtualizacao.trim();
    
    // Converter tipos se necessário
    if (tabela.colunas[nomeCampoCondicao] && tabela.colunas[nomeCampoCondicao]['@tipo'] === 'numero') {
      valorCondicaoProcessado = parseFloat(valorCondicaoProcessado);
    }
    
    if (tabela.colunas[nomeCampoAtualizacao] && tabela.colunas[nomeCampoAtualizacao]['@tipo'] === 'numero') {
      valorAtualizacaoProcessado = parseFloat(valorAtualizacaoProcessado);
    }
    
    // Atualizar registros que atendem à condição
    let atualizados = 0;
    
    for (let registro of Object.values(tabela.registros)) {
      if (registro[nomeCampoCondicao] == valorCondicaoProcessado) {
        registro[nomeCampoAtualizacao] = valorAtualizacaoProcessado;
        atualizados++;
      }
    }
    
    await salvarBanco(nomeBanco, dados);
    
    return {
      sucesso: true,
      mensagem: `✅ ${atualizados} registro(s) atualizado(s) na tabela '${nomeTabela}'.`
    };
    
  } catch (error) {
    return {
      sucesso: false,
      mensagem: `❌ Erro ao atualizar registro: ${error.message}`
    };
  }
}

/**
 * Lista todas as tabelas do banco
 * @param {string} nomeBanco - Nome do banco
 */
async function listarTabelas(nomeBanco) {
  try {
    const dados = await carregarBanco(nomeBanco);
    
    if (!dados.banco.tabelas || Object.keys(dados.banco.tabelas).length === 0) {
      return {
        sucesso: true,
        mensagem: `📋 Banco '${nomeBanco}' não possui tabelas.`
      };
    }
    
    const tabelas = Object.keys(dados.banco.tabelas);
    const lista = tabelas.map(nome => `  • ${nome}`).join('\n');
    
    return {
      sucesso: true,
      mensagem: `📋 Tabelas no banco '${nomeBanco}':\n${lista}`
    };
    
  } catch (error) {
    return {
      sucesso: false,
      mensagem: `❌ Erro ao listar tabelas: ${error.message}`
    };
  }
}

/**
 * Constrói uma tabela formatada para exibição
 * @param {Array} colunas - Array com nomes das colunas
 * @param {Array} registros - Array com os registros
 */
function construirTabelaFormatada(colunas, registros) {
  if (registros.length === 0) {
    return 'Tabela vazia';
  }
  
  // Calcular largura máxima de cada coluna
  const larguras = {};
  colunas.forEach(col => {
    larguras[col] = Math.max(col.length, 
      Math.max(...registros.map(reg => String(reg[col] || '').length))
    );
  });
  
  // Construir linhas da tabela
  let resultado = '';
  
  // Linha superior
  resultado += '┌' + colunas.map(col => '─'.repeat(larguras[col] + 2)).join('┬') + '┐\n';
  
  // Cabeçalhos
  resultado += '│' + colunas.map(col => ` ${col.padEnd(larguras[col])} `).join('│') + '│\n';
  
  // Linha separadora
  resultado += '├' + colunas.map(col => '─'.repeat(larguras[col] + 2)).join('┼') + '┤\n';
  
  // Dados
  registros.forEach(registro => {
    resultado += '│' + colunas.map(col => {
      const valor = String(registro[col] || '');
      return ` ${valor.padEnd(larguras[col])} `;
    }).join('│') + '│\n';
  });
  
  // Linha inferior
  resultado += '└' + colunas.map(col => '─'.repeat(larguras[col] + 2)).join('┴') + '┘';
  
  return resultado;
}

module.exports = {
  criarBanco,
  verificarBancoExiste,
  criarTabela,
  inserirRegistro,
  mostrarTabela,
  removerRegistro,
  atualizarRegistro,
  listarTabelas
};