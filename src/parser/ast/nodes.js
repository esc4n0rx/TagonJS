// src/parser/ast/nodes.js (versão completa com as novas classes)

class ASTNode {
  accept(visitor) {
    const methodName = `visit${this.constructor.name}`;
    if (visitor[methodName]) {
      return visitor[methodName](this);
    }
    throw new Error(`Visitor não implementa ${methodName}`);
  }
}

// Novo nó para constraints
class ConstraintDefinition extends ASTNode {
  constructor(type, options = {}) {
    super();
    this.type = type; // 'PRIMARY_KEY', 'FOREIGN_KEY', 'UNIQUE', 'NOT_NULL', 'AUTO_INCREMENT', 'DEFAULT'
    this.options = options; // { referencedTable, referencedColumn, defaultValue, etc. }
  }
}

// Novo nó para constraints de tabela (como FOREIGN KEY)
class TableConstraint extends ASTNode {
  constructor(type, columnName, options = {}) {
    super();
    this.type = type;
    this.columnName = columnName;
    this.options = options;
  }
}

// Classes existentes...
class SelectStatement extends ASTNode {
  constructor(selectList, fromClause, whereClause = null, joinClauses = [], orderByClause = null, groupByClause = null) {
    super();
    this.selectList = selectList;
    this.fromClause = fromClause;
    this.whereClause = whereClause;
    this.joinClauses = joinClauses;
    this.orderByClause = orderByClause;
    this.groupByClause = groupByClause;
  }
}

class SelectList extends ASTNode {
  constructor(columns) {
    super();
    this.columns = columns;
  }
}

class ColumnExpression extends ASTNode {
  constructor(expression, alias = null) {
    super();
    this.expression = expression;
    this.alias = alias;
  }
}

class AllColumnsExpression extends ASTNode {
  constructor(tableName = null) {
    super();
    this.tableName = tableName;
  }
}

class IdentifierExpression extends ASTNode {
  constructor(name, tableName = null) {
    super();
    this.name = name;
    this.tableName = tableName;
  }
}

class FromClause extends ASTNode {
  constructor(tableName, alias = null) {
    super();
    this.tableName = tableName;
    this.alias = alias;
  }
}

class JoinClause extends ASTNode {
  constructor(joinType, tableName, onCondition, alias = null) {
    super();
    this.joinType = joinType;
    this.tableName = tableName;
    this.onCondition = onCondition;
    this.alias = alias;
  }
}

class WhereClause extends ASTNode {
  constructor(condition) {
    super();
    this.condition = condition;
  }
}

class BinaryExpression extends ASTNode {
  constructor(left, operator, right) {
    super();
    this.left = left;
    this.operator = operator;
    this.right = right;
  }
}

class LiteralExpression extends ASTNode {
  constructor(value, type) {
    super();
    this.value = value;
    this.type = type;
  }
}

class OrderByClause extends ASTNode {
  constructor(expressions) {
    super();
    this.expressions = expressions;
  }
}

class OrderByExpression extends ASTNode {
  constructor(expression, direction = 'ASC') {
    super();
    this.expression = expression;
    this.direction = direction;
  }
}

class GroupByClause extends ASTNode {
  constructor(expressions) {
    super();
    this.expressions = expressions;
  }
}

// Comandos DDL
class CreateTableStatement extends ASTNode {
  constructor(tableName, columns, tableConstraints = []) {
    super();
    this.tableName = tableName;
    this.columns = columns;
    this.tableConstraints = tableConstraints;
  }
}

class CreateDatabaseStatement extends ASTNode {
  constructor(databaseName) {
    super();
    this.databaseName = databaseName;
  }
}

// Atualizada para suportar constraints
class ColumnDefinition extends ASTNode {
  constructor(name, type, constraints = [], defaultValue = null, autoIncrement = false) {
    super();
    this.name = name;
    this.type = type;
    this.constraints = constraints;
    this.defaultValue = defaultValue;
    this.autoIncrement = autoIncrement;
  }
}

// Comandos DML
class InsertStatement extends ASTNode {
  constructor(tableName, columns, values) {
    super();
    this.tableName = tableName;
    this.columns = columns;
    this.values = values;
  }
}

class UpdateStatement extends ASTNode {
  constructor(tableName, assignments, whereClause = null) {
    super();
    this.tableName = tableName;
    this.assignments = assignments;
    this.whereClause = whereClause;
  }
}

class DeleteStatement extends ASTNode {
  constructor(tableName, whereClause = null) {
    super();
    this.tableName = tableName;
    this.whereClause = whereClause;
  }
}

class Assignment extends ASTNode {
  constructor(column, value) {
    super();
    this.column = column;
    this.value = value;
  }
}

class UseDatabaseStatement extends ASTNode {
  constructor(databaseName) {
    super();
    this.databaseName = databaseName;
  }
}

module.exports = {
  ASTNode,
  // Novos exports para constraints
  ConstraintDefinition,
  TableConstraint,
  // Exports existentes
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
  CreateDatabaseStatement,
  ColumnDefinition,
  InsertStatement,
  UpdateStatement,
  DeleteStatement,
  Assignment,
  UseDatabaseStatement
};