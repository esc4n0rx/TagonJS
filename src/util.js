// src/util.js
const fs = require('fs').promises;
const path = require('path');

/**
 * Inicializa o diretório de dados se não existir
 */
async function inicializarDiretorio() {
  const diretorioDados = path.join(process.cwd(), 'dados');
  
  try {
    await fs.access(diretorioDados);
  } catch (error) {
    // Diretório não existe, criar
    await fs.mkdir(diretorioDados, { recursive: true });
  }
}

/**
 * Verifica se um arquivo existe
 * @param {string} caminho - Caminho do arquivo
 * @returns {boolean} - True se o arquivo existe
 */
async function arquivoExiste(caminho) {
  try {
    await fs.access(caminho);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Lê conteúdo de um arquivo
 * @param {string} caminho - Caminho do arquivo
 * @returns {string} - Conteúdo do arquivo
 */
async function lerArquivo(caminho) {
  try {
    return await fs.readFile(caminho, 'utf8');
  } catch (error) {
    throw new Error(`Erro ao ler arquivo: ${error.message}`);
  }
}

/**
* Escreve conteúdo em um arquivo
* @param {string} caminho - Caminho do arquivo
* @param {string} conteudo - Conteúdo a ser escrito
*/
async function escreverArquivo(caminho, conteudo) {
 try {
   await fs.writeFile(caminho, conteudo, 'utf8');
 } catch (error) {
   throw new Error(`Erro ao escrever arquivo: ${error.message}`);
 }
}

/**
* Valida nome de banco ou tabela
* @param {string} nome - Nome a ser validado
* @returns {boolean} - True se o nome é válido
*/
function validarNome(nome) {
 // Nome deve ter apenas letras, números e underscore
 const regex = /^[a-zA-Z][a-zA-Z0-9_]*$/;
 return regex.test(nome) && nome.length <= 50;
}

/**
* Valida tipo de dados suportado
* @param {string} tipo - Tipo a ser validado
* @returns {boolean} - True se o tipo é válido
*/
function validarTipo(tipo) {
 const tiposValidos = ['texto', 'numero', 'booleano'];
 return tiposValidos.includes(tipo.toLowerCase());
}

/**
* Formata data para exibição
* @param {string} isoDate - Data em formato ISO
* @returns {string} - Data formatada
*/
function formatarData(isoDate) {
 const data = new Date(isoDate);
 return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR');
}

/**
* Sanitiza entrada do usuário
* @param {string} entrada - Entrada a ser sanitizada
* @returns {string} - Entrada sanitizada
*/
function sanitizarEntrada(entrada) {
 return entrada.trim().replace(/[<>]/g, '');
}

module.exports = {
 inicializarDiretorio,
 arquivoExiste,
 lerArquivo,
 escreverArquivo,
 validarNome,
 validarTipo,
 formatarData,
 sanitizarEntrada
};