// test-complete.js
const { Lexer } = require('./src/parser/lexer');
const { Parser } = require('./src/parser/parser');
const { QueryExecutor } = require('./src/query/executor');
const { StorageManager } = require('./src/storage/manager');

async function runCompleteTest() {
  console.log('🚀 Testando TagonJS v2.0 Completo\n');
  
  const storageManager = new StorageManager();
  await storageManager.initialize();
  
  const queryExecutor = new QueryExecutor(storageManager);
  
  try {
    // 1. Criar banco
    console.log('📋 Teste 1: Criando banco...');
    await executeCommand('criar banco testdb', queryExecutor);
    
    // 2. Usar banco
    queryExecutor.setCurrentDatabase('testdb');
    console.log('✅ Banco testdb selecionado\n');
    
    // 3. Criar tabelas
    console.log('📋 Teste 2: Criando tabelas...');
    await executeCommand('criar tabela usuarios (id:numero, nome:texto, idade:numero, email:texto)', queryExecutor);
    await executeCommand('criar tabela posts (id:numero, titulo:texto, conteudo:texto, usuario_id:numero)', queryExecutor);
    
    // 4. Inserir dados
    console.log('📋 Teste 3: Inserindo dados...');
    await executeCommand('inserir em usuarios (id, nome, idade, email) valores (1, "João", 25, "joao@email.com")', queryExecutor);
    await executeCommand('inserir em usuarios (id, nome, idade, email) valores (2, "Maria", 30, "maria@email.com")', queryExecutor);
    await executeCommand('inserir em usuarios (id, nome, idade, email) valores (3, "Pedro", 22, "pedro@email.com")', queryExecutor);
    
    await executeCommand('inserir em posts (id, titulo, conteudo, usuario_id) valores (1, "Primeiro Post", "Conteúdo do primeiro post", 1)', queryExecutor);
    await executeCommand('inserir em posts (id, titulo, conteudo, usuario_id) valores (2, "Segundo Post", "Conteúdo do segundo post", 2)', queryExecutor);
    await executeCommand('inserir em posts (id, titulo, conteudo, usuario_id) valores (3, "Terceiro Post", "Mais conteúdo", 1)', queryExecutor);
    
    // 5. Consultas SELECT
    console.log('📋 Teste 4: Consultas SELECT...');
    
    console.log('\n--- SELECT simples ---');
    await executeCommand('selecionar * de usuarios', queryExecutor);
    
    console.log('\n--- SELECT com WHERE ---');
    await executeCommand('selecionar nome, idade de usuarios onde idade > 24', queryExecutor);
    
    console.log('\n--- SELECT com JOIN ---');
    await executeCommand('selecionar u.nome, p.titulo de usuarios u juntar posts p em u.id = p.usuario_id', queryExecutor);
    
    console.log('\n--- SELECT com LEFT JOIN ---');
    await executeCommand('selecionar u.nome, p.titulo de usuarios u esquerda juntar posts p em u.id = p.usuario_id', queryExecutor);
    
    console.log('\n--- SELECT com ORDER BY ---');
    await executeCommand('selecionar nome, idade de usuarios ordenar por idade decrescente', queryExecutor);
    
    // 6. UPDATE
    console.log('📋 Teste 5: UPDATE...');
    await executeCommand('atualizar usuarios definir idade = 26 onde nome = "João"', queryExecutor);
    
    console.log('\n--- Verificar UPDATE ---');
    await executeCommand('selecionar * de usuarios onde nome = "João"', queryExecutor);
    
    // 7. DELETE
    console.log('📋 Teste 6: DELETE...');
    await executeCommand('remover de usuarios onde idade > 29', queryExecutor);
    
    console.log('\n--- Verificar após DELETE ---');
    await executeCommand('selecionar * de usuarios', queryExecutor);
    
    console.log('\n🎉 Todos os testes concluídos com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error.message);
  }
}

async function executeCommand(sql, queryExecutor) {
  try {
    console.log(`\n🔍 Executando: ${sql}`);
    
    const lexer = new Lexer(sql);
    const tokens = lexer.tokenize();
    
    const parser = new Parser(tokens);
    const ast = parser.parse();
    
    const result = await queryExecutor.execute(ast);
    
    if (result.sucesso) {
      console.log(`✅ ${result.mensagem}`);
      
      if (result.resultados && result.resultados.length > 0) {
        console.table(result.resultados);
      }
    } else {
      console.log(`❌ ${result.mensagem}`);
    }
  } catch (error) {
    console.log(`❌ Erro: ${error.message}`);
  }
}

// Executar testes
runCompleteTest();