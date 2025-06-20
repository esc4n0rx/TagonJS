// src/parser/lexer.js (versão atualizada)
class Token {
  constructor(type, value, position) {
    this.type = type;
    this.value = value;
    this.position = position;
  }
}

const TokenType = {
  // Palavras-chave existentes
  SELECT: 'SELECT',
  FROM: 'FROM',
  WHERE: 'WHERE',
  JOIN: 'JOIN',
  INNER: 'INNER',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
  ON: 'ON',
  AND: 'AND',
  OR: 'OR',
  ORDER: 'ORDER',
  BY: 'BY',
  GROUP: 'GROUP',
  HAVING: 'HAVING',
  INSERT: 'INSERT',
  INTO: 'INTO',
  VALUES: 'VALUES',
  UPDATE: 'UPDATE',
  SET: 'SET',
  DELETE: 'DELETE',
  CREATE: 'CREATE',
  TABLE: 'TABLE',
  DATABASE: 'DATABASE',
  USE: 'USE',
  
  // Novas palavras-chave para constraints
  PRIMARY: 'PRIMARY',
  KEY: 'KEY',
  FOREIGN: 'FOREIGN',
  REFERENCES: 'REFERENCES',
  UNIQUE: 'UNIQUE',
  AUTO: 'AUTO',
  INCREMENT: 'INCREMENT',
  NOT: 'NOT',
  NULL: 'NULL',
  DEFAULT: 'DEFAULT',
  
  // Operadores
  EQUALS: '=',
  NOT_EQUALS: '!=',
  LESS_THAN: '<',
  GREATER_THAN: '>',
  LESS_EQUAL: '<=',
  GREATER_EQUAL: '>=',
  LIKE: 'LIKE',
  
  // Símbolos
  COMMA: ',',
  DOT: '.',
  COLON: ':',
  SEMICOLON: ';',
  OPEN_PAREN: '(',
  CLOSE_PAREN: ')',
  ASTERISK: '*',
  
  // Tipos de dados
  IDENTIFIER: 'IDENTIFIER',
  NUMBER: 'NUMBER',
  STRING: 'STRING',
  
  // Controle
  EOF: 'EOF',
  WHITESPACE: 'WHITESPACE'
};

class Lexer {
  constructor(input) {
    this.input = input.toLowerCase();
    this.position = 0;
    this.currentChar = this.input[this.position];
    this.tokenHistory = [];
    
    // Palavras-chave em português
    this.keywords = {
      // Palavras existentes
      'selecionar': TokenType.SELECT,
      'de': TokenType.FROM,
      'onde': TokenType.WHERE,
      'juntar': TokenType.JOIN,
      'interno': TokenType.INNER,
      'esquerda': TokenType.LEFT,
      'direita': TokenType.RIGHT,
      'em': this.detectContextualEm.bind(this),
      'e': TokenType.AND,
      'ou': TokenType.OR,
      'ordenar': TokenType.ORDER,
      'por': TokenType.BY,
      'agrupar': TokenType.GROUP,
      'tendo': TokenType.HAVING,
      'inserir': TokenType.INSERT,
      'valores': TokenType.VALUES,
      'atualizar': TokenType.UPDATE,
      'definir': TokenType.SET,
      'remover': TokenType.DELETE,
      'criar': TokenType.CREATE,
      'tabela': TokenType.TABLE,
      'banco': TokenType.DATABASE,
      'usar': TokenType.USE,
      'como': TokenType.LIKE,
      
      // Novas palavras para constraints
      'primaria': TokenType.PRIMARY,
      'chave': TokenType.KEY,
      'estrangeira': TokenType.FOREIGN,
      'referencia': TokenType.REFERENCES,
      'unico': TokenType.UNIQUE,
      'auto': TokenType.AUTO,
      'incremento': TokenType.INCREMENT,
      'nao': TokenType.NOT,
      'nulo': TokenType.NULL,
      'padrao': TokenType.DEFAULT,
      
      // Alternativas em inglês (para compatibilidade)
      'primary': TokenType.PRIMARY,
      'key': TokenType.KEY,
      'foreign': TokenType.FOREIGN,
      'references': TokenType.REFERENCES,
      'unique': TokenType.UNIQUE,
      'increment': TokenType.INCREMENT,
      'not': TokenType.NOT,
      'null': TokenType.NULL,
      'default': TokenType.DEFAULT,
    };
  }

  // Função para detectar se "em" é ON (JOIN) ou INTO (INSERT)
  detectContextualEm() {
    const previousTokens = this.getRecentTokens(3);
    
    if (previousTokens.some(token => token && token.type === TokenType.INSERT)) {
      return TokenType.INTO;
    }
    
    if (previousTokens.some(token => token && token.type === TokenType.JOIN)) {
      return TokenType.ON;
    }
    
    return TokenType.INTO;
  }

  getRecentTokens(count) {
    if (!this.tokenHistory) this.tokenHistory = [];
    return this.tokenHistory.slice(-count);
  }

  addToHistory(token) {
    if (!this.tokenHistory) this.tokenHistory = [];
    this.tokenHistory.push(token);
    if (this.tokenHistory.length > 10) {
      this.tokenHistory.shift();
    }
  }

  error(message) {
    throw new Error(`Erro léxico na posição ${this.position}: ${message}`);
  }

  advance() {
    this.position++;
    if (this.position >= this.input.length) {
      this.currentChar = null;
    } else {
      this.currentChar = this.input[this.position];
    }
  }

  skipWhitespace() {
    while (this.currentChar && /\s/.test(this.currentChar)) {
      this.advance();
    }
  }

  readNumber() {
    let result = '';
    while (this.currentChar && /\d/.test(this.currentChar)) {
      result += this.currentChar;
      this.advance();
    }
    
    if (this.currentChar === '.') {
      result += this.currentChar;
      this.advance();
      while (this.currentChar && /\d/.test(this.currentChar)) {
        result += this.currentChar;
        this.advance();
      }
    }
    
    return parseFloat(result);
  }

  readString() {
    let result = '';
    const quote = this.currentChar;
    this.advance();
    
    while (this.currentChar && this.currentChar !== quote) {
      if (this.currentChar === '\\') {
        this.advance();
        if (this.currentChar) {
          switch (this.currentChar) {
            case 'n': result += '\n'; break;
            case 't': result += '\t'; break;
            case 'r': result += '\r'; break;
            case '\\': result += '\\'; break;
            case '"': result += '"'; break;
            case "'": result += "'"; break;
            default: result += this.currentChar;
          }
          this.advance();
        }
      } else {
        result += this.currentChar;
        this.advance();
      }
    }
    
    if (!this.currentChar) {
      this.error('String não fechada');
    }
    
    this.advance();
    return result;
  }

  readIdentifier() {
    let result = '';
    while (this.currentChar && (/\w/.test(this.currentChar) || this.currentChar === '_')) {
      result += this.currentChar;
      this.advance();
    }
    return result;
  }

  getNextToken() {
    while (this.currentChar) {
      if (/\s/.test(this.currentChar)) {
        this.skipWhitespace();
        continue;
      }

      if (/\d/.test(this.currentChar)) {
        const token = new Token(TokenType.NUMBER, this.readNumber(), this.position);
        this.addToHistory(token);
        return token;
      }

      if (this.currentChar === "'" || this.currentChar === '"') {
        const token = new Token(TokenType.STRING, this.readString(), this.position);
        this.addToHistory(token);
        return token;
      }

      if (/[a-zA-Z_]/.test(this.currentChar)) {
        const identifier = this.readIdentifier();
        let tokenType = TokenType.IDENTIFIER;
        
        if (this.keywords[identifier]) {
          if (typeof this.keywords[identifier] === 'function') {
            tokenType = this.keywords[identifier]();
          } else {
            tokenType = this.keywords[identifier];
          }
        }
        
        const token = new Token(tokenType, identifier, this.position);
        this.addToHistory(token);
        return token;
      }

      // Operadores de dois caracteres
      if (this.currentChar === '!' && this.input[this.position + 1] === '=') {
        this.advance();
        this.advance();
        const token = new Token(TokenType.NOT_EQUALS, '!=', this.position - 2);
        this.addToHistory(token);
        return token;
      }

      if (this.currentChar === '<' && this.input[this.position + 1] === '=') {
        this.advance();
        this.advance();
        const token = new Token(TokenType.LESS_EQUAL, '<=', this.position - 2);
        this.addToHistory(token);
        return token;
      }

      if (this.currentChar === '>' && this.input[this.position + 1] === '=') {
        this.advance();
        this.advance();
        const token = new Token(TokenType.GREATER_EQUAL, '>=', this.position - 2);
        this.addToHistory(token);
        return token;
      }

      // Operadores de um caractere
      const singleCharTokens = {
        '=': TokenType.EQUALS,
        '<': TokenType.LESS_THAN,
        '>': TokenType.GREATER_THAN,
        ',': TokenType.COMMA,
        '.': TokenType.DOT,
        ':': TokenType.COLON,
        ';': TokenType.SEMICOLON,
        '(': TokenType.OPEN_PAREN,
        ')': TokenType.CLOSE_PAREN,
        '*': TokenType.ASTERISK
      };

      if (this.currentChar in singleCharTokens) {
        const tokenType = singleCharTokens[this.currentChar];
        const currentChar = this.currentChar;
        this.advance();
        const token = new Token(tokenType, currentChar, this.position - 1);
        this.addToHistory(token);
        return token;
      }

      this.error(`Caractere inesperado: ${this.currentChar}`);
    }

    return new Token(TokenType.EOF, null, this.position);
  }

  tokenize() {
    const tokens = [];
    let token = this.getNextToken();
    
    while (token.type !== TokenType.EOF) {
      tokens.push(token);
      token = this.getNextToken();
    }
    
    tokens.push(token);
    return tokens;
  }
}

module.exports = { Lexer, Token, TokenType };