const { TokenType } = require('./lexer');
const {
  SelectStatement,
  SelectList,
  ColumnExpression,
  AllColumnsExpression,
  IdentifierExpression,
  FromClause,
  JoinClause,
  WhereClause,
  BinaryExpression,
  LiteralExpression,
  OrderByClause,
  OrderByExpression,
  GroupByClause,
  CreateTableStatement,
  ColumnDefinition,
  ConstraintDefinition,
  TableConstraint,
  InsertStatement,
  UpdateStatement,
  DeleteStatement
} = require('./ast/nodes');


class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.currentToken = 0;
  }

  error(message) {
    const token = this.getCurrentToken();
    throw new Error(`Erro de sintaxe na posição ${token.position}: ${message}`);
  }

  getCurrentToken() {
    if (this.currentToken >= this.tokens.length) {
      return this.tokens[this.tokens.length - 1]; // EOF
    }
    return this.tokens[this.currentToken];
  }

  peekToken(offset = 1) {
    const index = this.currentToken + offset;
    if (index >= this.tokens.length) {
      return this.tokens[this.tokens.length - 1]; // EOF
    }
    return this.tokens[index];
  }

  consume(expectedType = null) {
    const token = this.getCurrentToken();
    if (expectedType && token.type !== expectedType) {
      this.error(`Esperado ${expectedType}, encontrado ${token.type}`);
    }
    this.currentToken++;
    return token;
  }

  match(...types) {
    return types.includes(this.getCurrentToken().type);
  }

  parse() {
    const statements = [];
    
    while (!this.match(TokenType.EOF)) {
      const statement = this.parseStatement();
      if (statement) {
        statements.push(statement);
      }
      
      // Consumir ponto e vírgula opcional
      if (this.match(TokenType.SEMICOLON)) {
        this.consume();
      }
    }
    
    return statements.length === 1 ? statements[0] : statements;
  }

  parseStatement() {
    const token = this.getCurrentToken();
    
    switch (token.type) {
      case TokenType.SELECT:
        return this.parseSelectStatement();
      case TokenType.CREATE:
        return this.parseCreateStatement();
      case TokenType.INSERT:
        return this.parseInsertStatement();
      case TokenType.UPDATE:
        return this.parseUpdateStatement();
      case TokenType.DELETE:
        return this.parseDeleteStatement();
      default:
        this.error(`Comando não reconhecido: ${token.value}`);
    }
  }

  parseSelectStatement() {
    this.consume(TokenType.SELECT); // 'selecionar'
    
    const selectList = this.parseSelectList();
    
    this.consume(TokenType.FROM); // 'de'
    const fromClause = this.parseFromClause();
    
    const joinClauses = [];
    while (this.match(TokenType.JOIN, TokenType.INNER, TokenType.LEFT, TokenType.RIGHT)) {
      joinClauses.push(this.parseJoinClause());
    }
    
    let whereClause = null;
    if (this.match(TokenType.WHERE)) {
      whereClause = this.parseWhereClause();
    }
    
    let groupByClause = null;
    if (this.match(TokenType.GROUP)) {
      groupByClause = this.parseGroupByClause();
    }
    
    let orderByClause = null;
    if (this.match(TokenType.ORDER)) {
      orderByClause = this.parseOrderByClause();
    }
    
    return new SelectStatement(
      selectList,
      fromClause,
      whereClause,
      joinClauses,
      orderByClause,
      groupByClause
    );
  }

  parseSelectList() {
    const columns = [];
    
    do {
      if (this.match(TokenType.ASTERISK)) {
        this.consume();
        // Verificar se é tabela.*
        if (this.currentToken > 0 && 
            this.tokens[this.currentToken - 2]?.type === TokenType.IDENTIFIER &&
            this.tokens[this.currentToken - 2]?.type === TokenType.DOT) {
          const tableName = this.tokens[this.currentToken - 3].value;
          columns.push(new ColumnExpression(new AllColumnsExpression(tableName)));
        } else {
          columns.push(new ColumnExpression(new AllColumnsExpression()));
        }
      } else {
        const expression = this.parseExpression();
        let alias = null;
        
        // Verificar se há alias (opcional)
        if (this.match(TokenType.IDENTIFIER) && 
            !this.match(TokenType.FROM, TokenType.WHERE, TokenType.ORDER, TokenType.GROUP)) {
          alias = this.consume(TokenType.IDENTIFIER).value;
        }
        
        columns.push(new ColumnExpression(expression, alias));
      }
      
      if (this.match(TokenType.COMMA)) {
        this.consume();
      } else {
        break;
      }
    } while (true);
    
    return new SelectList(columns);
  }

  parseFromClause() {
    const tableName = this.consume(TokenType.IDENTIFIER).value;
    let alias = null;
    
    // Verificar se há alias
    if (this.match(TokenType.IDENTIFIER) && 
        !this.match(TokenType.WHERE, TokenType.JOIN, TokenType.ORDER, TokenType.GROUP)) {
      alias = this.consume(TokenType.IDENTIFIER).value;
    }
    
    return new FromClause(tableName, alias);
  }

  parseJoinClause() {
    let joinType = 'INNER';
    
    if (this.match(TokenType.INNER, TokenType.LEFT, TokenType.RIGHT)) {
      joinType = this.consume().type;
    }
    
    this.consume(TokenType.JOIN); // 'juntar'
    
    const tableName = this.consume(TokenType.IDENTIFIER).value;
    let alias = null;
    
    // Verificar se há alias
    if (this.match(TokenType.IDENTIFIER) && !this.match(TokenType.ON)) {
      alias = this.consume(TokenType.IDENTIFIER).value;
    }
    
    this.consume(TokenType.ON); // 'em'
    const onCondition = this.parseExpression();
    
    return new JoinClause(joinType, tableName, onCondition, alias);
  }

  parseWhereClause() {
    this.consume(TokenType.WHERE); // 'onde'
    const condition = this.parseExpression();
    return new WhereClause(condition);
  }

  parseOrderByClause() {
    this.consume(TokenType.ORDER); // 'ordenar'
    this.consume(TokenType.BY); // 'por'
    
    const expressions = [];
    
    do {
      const expression = this.parseExpression();
      let direction = 'ASC';
      
      // Verificar direção (crescente/decrescente)
      if (this.match(TokenType.IDENTIFIER)) {
        const token = this.getCurrentToken();
        if (token.value === 'asc' || token.value === 'crescente') {
          direction = 'ASC';
          this.consume();
        } else if (token.value === 'desc' || token.value === 'decrescente') {
          direction = 'DESC';
          this.consume();
        }
      }
      
      expressions.push(new OrderByExpression(expression, direction));
      
      if (this.match(TokenType.COMMA)) {
        this.consume();
      } else {
        break;
      }
    } while (true);
    
    return new OrderByClause(expressions);
  }

  parseGroupByClause() {
    this.consume(TokenType.GROUP); // 'agrupar'
    this.consume(TokenType.BY); // 'por'
    
    const expressions = [];
    
    do {
      expressions.push(this.parseExpression());
      
      if (this.match(TokenType.COMMA)) {
        this.consume();
      } else {
        break;
      }
    } while (true);
    
    return new GroupByClause(expressions);
  }

  parseExpression() {
    return this.parseOrExpression();
  }

  parseOrExpression() {
    let left = this.parseAndExpression();
    
    while (this.match(TokenType.OR)) {
      const operator = this.consume().value;
      const right = this.parseAndExpression();
      left = new BinaryExpression(left, operator, right);
    }
    
    return left;
  }

  parseAndExpression() {
    let left = this.parseComparisonExpression();
    
    while (this.match(TokenType.AND)) {
      const operator = this.consume().value;
      const right = this.parseComparisonExpression();
      left = new BinaryExpression(left, operator, right);
    }
    
    return left;
  }

  parseComparisonExpression() {
    let left = this.parsePrimaryExpression();
    
    if (this.match(
      TokenType.EQUALS,
      TokenType.NOT_EQUALS,
      TokenType.LESS_THAN,
      TokenType.GREATER_THAN,
      TokenType.LESS_EQUAL,
      TokenType.GREATER_EQUAL,
      TokenType.LIKE
    )) {
      const operator = this.consume().value;
      const right = this.parsePrimaryExpression();
      left = new BinaryExpression(left, operator, right);
    }
    
    return left;
  }

  parsePrimaryExpression() {
    const token = this.getCurrentToken();
    
    switch (token.type) {
      case TokenType.NUMBER:
        this.consume();
        return new LiteralExpression(token.value, 'NUMBER');
        
      case TokenType.STRING:
        this.consume();
        return new LiteralExpression(token.value, 'STRING');
        
      case TokenType.IDENTIFIER:
        return this.parseIdentifierExpression();
        
      case TokenType.OPEN_PAREN:
        this.consume();
        const expression = this.parseExpression();
        this.consume(TokenType.CLOSE_PAREN);
        return expression;
        
      default:
        this.error(`Expressão inesperada: ${token.value}`);
    }
  }

  parseIdentifierExpression() {
    const name = this.consume(TokenType.IDENTIFIER).value;
    let tableName = null;
    
    // Verificar se é tabela.coluna
    if (this.match(TokenType.DOT)) {
      this.consume();
      tableName = name;
      const columnName = this.consume(TokenType.IDENTIFIER).value;
      return new IdentifierExpression(columnName, tableName);
    }
    
    return new IdentifierExpression(name);
  }

  parseCreateStatement() {
    this.consume(TokenType.CREATE); // 'criar'
    
    if (this.match(TokenType.DATABASE)) {
      return this.parseCreateDatabaseStatement();
    } else if (this.match(TokenType.TABLE)) {
      return this.parseCreateTableStatement();
    } else {
      this.error('Esperado "banco" ou "tabela" após "criar"');
    }
  }

  parseCreateDatabaseStatement() {
    this.consume(TokenType.DATABASE); // 'banco'
    const databaseName = this.consume(TokenType.IDENTIFIER).value;
    
    return {
      type: 'CREATE_DATABASE',
      databaseName: databaseName
    };
  }

parseCreateTableStatement() {
  this.consume(TokenType.TABLE); // 'tabela'
  const tableName = this.consume(TokenType.IDENTIFIER).value;
  
  this.consume(TokenType.OPEN_PAREN); // '('
  
  const columns = [];
  const tableConstraints = [];
  
  do {
    if (this.match(TokenType.PRIMARY, TokenType.FOREIGN, TokenType.UNIQUE)) {
      // Parse table-level constraint
      const constraint = this.parseTableConstraint();
      tableConstraints.push(constraint);
    } else {
      // Parse column definition
      const column = this.parseColumnDefinition();
      columns.push(column);
    }
    
    if (this.match(TokenType.COMMA)) {
      this.consume();
    } else {
      break;
    }
  } while (true);
  
  this.consume(TokenType.CLOSE_PAREN); // ')'
  
  return new CreateTableStatement(tableName, columns, tableConstraints);
}

parseColumnDefinition() {
  const columnName = this.consume(TokenType.IDENTIFIER).value;
  this.consume(TokenType.COLON); // ':'
  const columnType = this.parseColumnType();
  
  const constraints = [];
  let defaultValue = null;
  let autoIncrement = false;
  
  // Parse column constraints
  while (this.match(TokenType.PRIMARY, TokenType.UNIQUE, TokenType.NOT, TokenType.AUTO, TokenType.DEFAULT)) {
    if (this.match(TokenType.PRIMARY)) {
      this.consume(); // 'primaria' ou 'primary'
      this.consume(TokenType.KEY); // 'chave' ou 'key'
      constraints.push(new ConstraintDefinition('PRIMARY_KEY'));
      
    } else if (this.match(TokenType.UNIQUE)) {
      this.consume(); // 'unico' ou 'unique'
      constraints.push(new ConstraintDefinition('UNIQUE'));
      
    } else if (this.match(TokenType.NOT)) {
      this.consume(); // 'nao' ou 'not'
      this.consume(TokenType.NULL); // 'nulo' ou 'null'
      constraints.push(new ConstraintDefinition('NOT_NULL'));
      
    } else if (this.match(TokenType.AUTO)) {
      this.consume(); // 'auto'
      this.consume(TokenType.INCREMENT); // 'incremento' ou 'increment'
      autoIncrement = true;
      constraints.push(new ConstraintDefinition('AUTO_INCREMENT'));
      
    } else if (this.match(TokenType.DEFAULT)) {
      this.consume(); // 'padrao' ou 'default'
      defaultValue = this.parseExpression();
      constraints.push(new ConstraintDefinition('DEFAULT', { value: defaultValue }));
    }
  }
  
  return new ColumnDefinition(columnName, columnType, constraints, defaultValue, autoIncrement);
}

parseColumnType() {
  const type = this.consume(TokenType.IDENTIFIER).value;
  
  // Suporte para tipos especiais
  if (type === 'uuid') {
    return 'uuid';
  }
  
  // Suporte para tipos com tamanho (ex: texto(50))
  if (this.match(TokenType.OPEN_PAREN)) {
    this.consume(); // '('
    const size = this.consume(TokenType.NUMBER).value;
    this.consume(TokenType.CLOSE_PAREN); // ')'
    return `${type}(${size})`;
  }
  
  return type;
}

parseTableConstraint() {
  if (this.match(TokenType.PRIMARY)) {
    this.consume(); // 'primaria'
    this.consume(TokenType.KEY); // 'chave'
    this.consume(TokenType.OPEN_PAREN); // '('
    const columnName = this.consume(TokenType.IDENTIFIER).value;
    this.consume(TokenType.CLOSE_PAREN); // ')'
    
    return new TableConstraint('PRIMARY_KEY', columnName);
    
  } else if (this.match(TokenType.FOREIGN)) {
    this.consume(); // 'estrangeira'
    this.consume(TokenType.KEY); // 'chave'
    this.consume(TokenType.OPEN_PAREN); // '('
    const columnName = this.consume(TokenType.IDENTIFIER).value;
    this.consume(TokenType.CLOSE_PAREN); // ')'
    this.consume(TokenType.REFERENCES); // 'referencia'
    const referencedTable = this.consume(TokenType.IDENTIFIER).value;
    this.consume(TokenType.OPEN_PAREN); // '('
    const referencedColumn = this.consume(TokenType.IDENTIFIER).value;
    this.consume(TokenType.CLOSE_PAREN); // ')'
    
    return new TableConstraint('FOREIGN_KEY', columnName, {
      referencedTable,
      referencedColumn
    });
    
  } else if (this.match(TokenType.UNIQUE)) {
    this.consume(); // 'unico'
    this.consume(TokenType.OPEN_PAREN); // '('
    const columnName = this.consume(TokenType.IDENTIFIER).value;
    this.consume(TokenType.CLOSE_PAREN); // ')'
    
    return new TableConstraint('UNIQUE', columnName);
  }
  
  this.error('Constraint de tabela não reconhecida');
}

  parseInsertStatement() {
    this.consume(TokenType.INSERT); // 'inserir'
    this.consume(TokenType.INTO); // 'em'
    
    const tableName = this.consume(TokenType.IDENTIFIER).value;
    
    let columns = null;
    
    // Verificar se há especificação de colunas
    if (this.match(TokenType.OPEN_PAREN)) {
      this.consume(); // '('
      columns = [];
      
      do {
        columns.push(this.consume(TokenType.IDENTIFIER).value);
        
        if (this.match(TokenType.COMMA)) {
          this.consume();
        } else {
          break;
        }
      } while (true);
      
      this.consume(TokenType.CLOSE_PAREN); // ')'
    }
    
    this.consume(TokenType.VALUES); // 'valores'
    this.consume(TokenType.OPEN_PAREN); // '('
    
    const values = [];
    
    do {
      values.push(this.parseExpression());
      
      if (this.match(TokenType.COMMA)) {
        this.consume();
      } else {
        break;
      }
    } while (true);
    
    this.consume(TokenType.CLOSE_PAREN); // ')'
    
    return new InsertStatement(tableName, columns, values);
  }

  parseUpdateStatement() {
    this.consume(TokenType.UPDATE); // 'atualizar'
    
    const tableName = this.consume(TokenType.IDENTIFIER).value;
    
    this.consume(TokenType.SET); // 'definir'
    
    const assignments = [];
    
    do {
      const columnName = this.consume(TokenType.IDENTIFIER).value;
      this.consume(TokenType.EQUALS); // '='
      const value = this.parseExpression();
      
      assignments.push({
        column: columnName,
        value: value
      });
      
      if (this.match(TokenType.COMMA)) {
        this.consume();
      } else {
        break;
      }
    } while (true);
    
    let whereClause = null;
    if (this.match(TokenType.WHERE)) {
      whereClause = this.parseWhereClause();
    }
    
    return new UpdateStatement(tableName, assignments, whereClause);
  }

  parseDeleteStatement() {
    this.consume(TokenType.DELETE); // 'remover'
    this.consume(TokenType.FROM); // 'de'
    
    const tableName = this.consume(TokenType.IDENTIFIER).value;
    
    let whereClause = null;
    if (this.match(TokenType.WHERE)) {
      whereClause = this.parseWhereClause();
    }
    
    return new DeleteStatement(tableName, whereClause);
  }
}

module.exports = { Parser };