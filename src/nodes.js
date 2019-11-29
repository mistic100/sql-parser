function indent(str) {
    return ((function () {
        const ref = str.split('\n');
        const results = [];
        for (let i = 0, len = ref.length; i < len; i++) {
            results.push(`  ${ref[i]}`);
        }
        return results;
    })()).join('\n');
}

exports.Select = class Select {
    constructor(fields, source, distinct = false, joins = [], unions = []) {
        this.fields = fields;
        this.source = source;
        this.distinct = distinct;
        this.joins = joins;
        this.unions = unions;
        this.order = null;
        this.group = null;
        this.where = null;
        this.limit = null;
    }

    toString() {
        const ret = [`SELECT ${this.fields.join(', ')}`];
        ret.push(indent(`FROM ${this.source}`));
        for (let i = 0, len = this.joins.length; i < len; i++) {
            ret.push(indent(this.joins[i].toString()));
        }
        if (this.where) {
            ret.push(indent(this.where.toString()));
        }
        if (this.group) {
            ret.push(indent(this.group.toString()));
        }
        if (this.order) {
            ret.push(indent(this.order.toString()));
        }
        if (this.limit) {
            ret.push(indent(this.limit.toString()));
        }
        for (let j = 0, len1 = this.unions.length; j < len1; j++) {
            ret.push(this.unions[j].toString());
        }
        return ret.join('\n');
    }
};

exports.SubSelect = class SubSelect {
    constructor(select, name = null) {
        this.select = select;
        this.name = name;
    }

    toString() {
        const ret = [];
        ret.push('(');
        ret.push(indent(this.select.toString()));
        ret.push(this.name ? `) ${this.name.toString()}` : ')');
        return ret.join('\n');
    }
};

exports.Join = class Join {
    constructor(right, conditions = null, side = null, mode = null) {
        this.right = right;
        this.conditions = conditions;
        this.side = side;
        this.mode = mode;
    }

    toString() {
        let ret = '';
        if (this.side != null) {
            ret += `${this.side} `;
        }
        if (this.mode != null) {
            ret += `${this.mode} `;
        }
        return ret + `JOIN ${this.right}\n` + indent(`ON ${this.conditions}`);
    }
};

exports.Union = class Union {
    constructor(query, all1 = false) {
        this.query = query;
        this.all = all1;
    }

    toString() {
        const all = this.all ? ' ALL' : '';
        return `UNION${all}\n${this.query.toString()}`;
    }
};

exports.LiteralValue = class LiteralValue {
    constructor(value1, value2 = null) {
        this.value = value1;
        this.value2 = value2;
        if (this.value2) {
            this.nested = true;
            this.values = this.value.values;
            this.values.push(this.value2);
        }
        else {
            this.nested = false;
            this.values = [this.value];
        }
    }

    // TODO: Backtick quotes only supports MySQL, Postgres uses double-quotes
    toString(quote = true) {
        if (quote) {
            return `\`${this.values.join('`.`')}\``;
        }
        else {
            return `${this.values.join('.')}`;
        }
    }
};

exports.StringValue = class StringValue {
    constructor(value1, quoteType = '\'\'') {
        this.value = value1;
        this.quoteType = quoteType;
    }

    toString() {
        const escaped = this.quoteType === '\'' ? this.value.replace(/(^|[^\\])'/g, '$1\'\'') : this.value;
        return `${this.quoteType}${escaped}${this.quoteType}`;
    }
};

exports.NumberValue = class NumberValue {
    constructor(value) {
        this.value = Number(value);
    }

    toString() {
        return this.value.toString();
    }
};

exports.ListValue = class ListValue {
    constructor(value1) {
        this.value = value1;
    }

    toString() {
        return `(${this.value.join(', ')})`;
    }
};

exports.WhitepaceList = class WhitepaceList {
    constructor(value1) {
        this.value = value1;
    }

    toString() {
        // not backtick for literals
        return this.value.map(function (value) {
            if (value instanceof exports.LiteralValue) {
                return value.toString(false);
            }
            else {
                return value.toString();
            }
        }).join(' ');
    }
};

exports.ParameterValue = class ParameterValue {
    constructor(value) {
        this.value = value;
        this.index = parseInt(value.substr(1), 10) - 1;
    }

    toString() {
        return `$${this.value}`;
    }
};

exports.ArgumentListValue = class ArgumentListValue {
    constructor(value1, distinct = false) {
        this.value = value1;
        this.distinct = distinct;
    }

    toString() {
        if (this.distinct) {
            return `DISTINCT ${this.value.join(', ')}`;
        }
        else {
            return `${this.value.join(', ')}`;
        }
    }
};

exports.BooleanValue = class LiteralValue {
    constructor(value) {
        this.value = (function () {
            switch (value.toLowerCase()) {
                case 'true':
                    return true;
                case 'false':
                    return false;
                default:
                    return null;
            }
        })();
    }

    toString() {
        if (this.value != null) {
            return this.value.toString().toUpperCase();
        }
        else {
            return 'NULL';
        }
    }
};

exports.FunctionValue = class FunctionValue {
    constructor(name, _arguments = null, udf = false) {
        this.name = name;
        this.arguments = _arguments;
        this.udf = udf;
    }

    toString() {
        if (this.arguments) {
            return `${this.name.toUpperCase()}(${this.arguments.toString()})`;
        }
        else {
            return `${this.name.toUpperCase()}()`;
        }
    }
};

exports.Case = class Case {
    constructor(whens, _else) {
        this.whens = whens;
        this.else = _else;
    }

    toString() {
        const whensStr = this.whens.map(function (w) {
            return w.toString();
        }).join(' ');
        if (this.else) {
            return `CASE ${whensStr} ${this.else.toString()} END`;
        }
        else {
            return `CASE ${whensStr} END`;
        }
    }
};

exports.CaseWhen = class CaseWhen {
    constructor(whenCondition, resCondition) {
        this.whenCondition = whenCondition;
        this.resCondition = resCondition;
    }

    toString() {
        return `WHEN ${this.whenCondition} THEN ${this.resCondition}`;
    }
};

exports.CaseElse = class CaseElse {
    constructor(elseCondition) {
        this.elseCondition = elseCondition;
    }

    toString() {
        return `ELSE ${this.elseCondition}`;
    }
};

exports.Order = class Order {
    constructor(orderings, offset) {
        this.orderings = orderings;
        this.offset = offset;
    }

    toString() {
        return `ORDER BY ${this.orderings.join(', ')}` + (this.offset ? '\n' + this.offset.toString() : '');
    }
};

exports.OrderArgument = class OrderArgument {
    constructor(value, direction = 'ASC') {
        this.value = value;
        this.direction = direction;
        null;
    }

    toString() {
        return `${this.value} ${this.direction}`;
    }
};

exports.Offset = class Offset {
    constructor(row_count, limit) {
        this.row_count = row_count;
        this.limit = limit;
    }

    toString() {
        return `OFFSET ${this.row_count} ROWS` + (this.limit ? `\nFETCH NEXT ${this.limit} ROWS ONLY` : '');
    }
};

exports.Limit = class Limit {
    constructor(value1, offset) {
        this.value = value1;
        this.offset = offset;
    }

    toString() {
        return `LIMIT ${this.value}` + (this.offset ? `\nOFFSET ${this.offset}` : '');
    }
};

exports.Table = class Table {
    constructor(name, alias = null, win = null, winFn = null, winArg = null) {
        this.name = name;
        this.alias = alias;
        this.win = win;
        this.winFn = winFn;
        this.winArg = winArg;
    }

    toString() {
        if (this.win) {
            return `${this.name}.${this.win}:${this.winFn}(${this.winArg})`;
        }
        else if (this.alias) {
            return `${this.name} AS ${this.alias}`;
        }
        else {
            return this.name.toString();
        }
    }
};

exports.Group = class Group {
    constructor(fields) {
        this.fields = fields;
        this.having = null;
    }

    toString() {
        const ret = [`GROUP BY ${this.fields.join(', ')}`];
        if (this.having) {
            ret.push(this.having.toString());
        }
        return ret.join('\n');
    }
};

exports.Where = class Where {
    constructor(conditions) {
        this.conditions = conditions;
    }

    toString() {
        return `WHERE ${this.conditions}`;
    }
};

exports.Having = class Having {
    constructor(conditions) {
        this.conditions = conditions;
    }

    toString() {
        return `HAVING ${this.conditions}`;
    }
};

exports.Op = class Op {
    constructor(operation, left, right) {
        this.operation = operation;
        this.left = left;
        this.right = right;
    }

    toString() {
        return `(${this.left} ${this.operation.toUpperCase()} ${this.right})`;
    }
};

exports.UnaryOp = class UnaryOp {
    constructor(operator, operand) {
        this.operator = operator;
        this.operand = operand;
    }

    toString() {
        return `(${this.operator.toUpperCase()} ${this.operand})`;
    }
};

exports.BetweenOp = class BetweenOp {
    constructor(value) {
        this.value = value;
    }

    toString() {
        return `${this.value.join(' AND ')}`;
    }
};

exports.Field = class Field {
    constructor(field, name = null) {
        this.field = field;
        this.name = name;
    }

    toString() {
        if (this.name) {
            return `${this.field} AS ${this.name}`;
        }
        else {
            return this.field.toString();
        }
    }
};

exports.Star = class Star {
    toString() {
        return '*';
    }
};
