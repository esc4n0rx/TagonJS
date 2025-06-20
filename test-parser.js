// test-parser.js (arquivo de teste)
const { Lexer } = require('./src/parser/lexer');
const { Parser } = require('./src/parser/parser');

function testarParser() {
 const queries = [
   // SELECT simples
   'selecionar * de usuarios',
   
   // SELECT com WHERE
   'selecionar nome, idade de usuarios onde idade > 18',
   
   // SELECT com JOIN
   'selecionar u.nome, p.titulo de usuarios u juntar posts p em u.id = p.usuario_id',
   
   // SELECT complexo
   'selecionar u.nome, count(*) de usuarios u esquerda juntar posts p em u.id = p.usuario_id onde u.idade > 21 agrupar por u.nome ordenar por u.nome crescente',
   
   // INSERT
   'inserir em usuarios (nome, idade, email) valores ("João", 25, "joao@email.com")',
   
   // UPDATE
   'atualizar usuarios definir idade = 26 onde nome = "João"',
   
   // DELETE
   'remover de usuarios onde idade < 18',
   
   // CREATE TABLE
   'criar tabela produtos (id:numero primary key, nome:texto not null, preco:numero)'
 ];

 queries.forEach((query, index) => {
   console.log(`\n=== Teste ${index + 1}: ${query} ===`);
   
   try {
     // Análise léxica
     const lexer = new Lexer(query);
     const tokens = lexer.tokenize();
     
     console.log('Tokens:', tokens.map(t => `${t.type}:${t.value}`).join(' '));
     
     // Análise sintática
     const parser = new Parser(tokens);
     const ast = parser.parse();
     
     console.log('AST:', JSON.stringify(ast, null, 2));
     console.log('✅ Parsing bem-sucedido');
     
   } catch (error) {
     console.log('❌ Erro:', error.message);
   }
 });
}

// Executar testes
testarParser();