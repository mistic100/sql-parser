const SQL_FUNCTIONS = ['AVG', 'COUNT', 'MIN', 'MAX', 'SUM'];
const SQL_SORT_ORDERS = ['ASC', 'DESC'];
const SQL_OPERATORS = ['=', '!=', '>=', '>', '<=', '<>', '<', 'LIKE', 'NOT LIKE', 'ILIKE', 'NOT ILIKE', 'IS NOT', 'IS', 'REGEXP', 'NOT REGEXP'];
const SUB_SELECT_OP = ['IN', 'NOT IN', 'ANY', 'ALL', 'SOME'];
const SUB_SELECT_UNARY_OP = ['EXISTS'];
const SQL_CONDITIONALS = ['AND', 'OR'];
const SQL_BETWEENS = ['BETWEEN', 'NOT BETWEEN'];
const BOOLEAN = ['TRUE', 'FALSE', 'NULL'];
const MATH = ['+', '-', '||', '&&'];
const MATH_MULTI = ['/', '*'];
const STAR = /^\*/;
const SEPARATOR = /^,/;
const WHITESPACE = /^[ \n\r]+/;
const LITERAL = /^`?([a-z_][a-z0-9_]{0,}(\:(number|float|string|date|boolean))?)`?/i;
const PARAMETER = /^\$([a-z0-9_]+(\:(number|float|string|date|boolean))?)/;
const NUMBER = /^[+-]?[0-9]+(\.[0-9]+)?/;
const STRING = /^'((?:[^\\']+?|\\.|'')*)'(?!')/;
const DBLSTRING = /^"([^\\"]*(?:\\.[^\\"]*)*)"/;

class Lexer {

    constructor(sql, opts = {}) {
        this.sql = sql;
        this.preserveWhitespace = opts.preserveWhitespace || false;
        this.tokens = [];
        this.currentLine = 1;
        this.currentOffset = 0;

        let i = 0;
        while (!!(this.chunk = sql.slice(i))) {
            const bytesConsumed = this.keywordToken() ||
                this.starToken() ||
                this.booleanToken() ||
                this.functionToken() ||
                this.windowExtension() ||
                this.sortOrderToken() ||
                this.seperatorToken() ||
                this.operatorToken() ||
                this.numberToken() ||
                this.mathToken() ||
                this.dotToken() ||
                this.conditionalToken() ||
                this.betweenToken() ||
                this.subSelectOpToken() ||
                this.subSelectUnaryOpToken() ||
                this.stringToken() ||
                this.parameterToken() ||
                this.parensToken() ||
                this.whitespaceToken() ||
                this.literalToken();

            if (bytesConsumed < 1) {
                throw new Error(`NOTHING CONSUMED: Stopped at - '${this.chunk.slice(0, 30)}'`);
            }

            i += bytesConsumed;
            this.currentOffset += bytesConsumed;
        }

        this.token('EOF', '');
        this.postProcess();
    }

    postProcess() {
        const results = [];
        for (let i =0, j = 0, len = this.tokens.length; j < len; i = ++j) {
            const token = this.tokens[i];
            if (token[0] === 'STAR') {
                const next_token = this.tokens[i + 1];
                if (!(next_token[0] === 'SEPARATOR' || next_token[0] === 'FROM')) {
                    results.push(token[0] = 'MATH_MULTI');
                }
                else {
                    results.push(void 0);
                }
            }
            else {
                results.push(void 0);
            }
        }
        return results;
    }

    token(name, value) {
        return this.tokens.push([name, value, this.currentLine, this.currentOffset]);
    }

    tokenizeFromStringRegex(name, regex, part = 0, lengthPart = part, output = true) {
        const match = regex.exec(this.chunk);
        if (!match) {
            return 0;
        }
        const partMatch = match[part].replace(/''/g, '\'');
        if (output) {
            this.token(name, partMatch);
        }
        return match[lengthPart].length;
    }

    tokenizeFromRegex(name, regex, part = 0, lengthPart = part, output = true) {
        const match = regex.exec(this.chunk);
        if (!match) {
            return 0;
        }
        const partMatch = match[part];
        if (output) {
            this.token(name, partMatch);
        }
        return match[lengthPart].length;
    }

    tokenizeFromWord(name, word = name) {
        word = this.regexEscape(word);
        const matcher = /^\w+$/.test(word) ? new RegExp(`^(${word})\\b`, 'ig') : new RegExp(`^(${word})`, 'ig');
        const match = matcher.exec(this.chunk);
        if (!match) {
            return 0;
        }
        this.token(name, match[1]);
        return match[1].length;
    }

    tokenizeFromList(name, list) {
        let ret = 0;
        for (let j = 0, len = list.length; j < len; j++) {
            const entry = list[j];
            ret = this.tokenizeFromWord(name, entry);
            if (ret > 0) {
                break;
            }
        }
        return ret;
    }

    keywordToken() {
        return this.tokenizeFromWord('SELECT') ||
            this.tokenizeFromWord('INSERT') ||
            this.tokenizeFromWord('INTO') ||
            this.tokenizeFromWord('DEFAULT') ||
            this.tokenizeFromWord('VALUES') ||
            this.tokenizeFromWord('DISTINCT') ||
            this.tokenizeFromWord('FROM') ||
            this.tokenizeFromWord('WHERE') ||
            this.tokenizeFromWord('GROUP') ||
            this.tokenizeFromWord('ORDER') ||
            this.tokenizeFromWord('BY') ||
            this.tokenizeFromWord('HAVING') ||
            this.tokenizeFromWord('LIMIT') ||
            this.tokenizeFromWord('JOIN') ||
            this.tokenizeFromWord('LEFT') ||
            this.tokenizeFromWord('RIGHT') ||
            this.tokenizeFromWord('INNER') ||
            this.tokenizeFromWord('OUTER') ||
            this.tokenizeFromWord('ON') ||
            this.tokenizeFromWord('AS') ||
            this.tokenizeFromWord('CASE') ||
            this.tokenizeFromWord('WHEN') ||
            this.tokenizeFromWord('THEN') ||
            this.tokenizeFromWord('ELSE') ||
            this.tokenizeFromWord('END') ||
            this.tokenizeFromWord('UNION') ||
            this.tokenizeFromWord('ALL') ||
            this.tokenizeFromWord('LIMIT') ||
            this.tokenizeFromWord('OFFSET') ||
            this.tokenizeFromWord('FETCH') ||
            this.tokenizeFromWord('ROW') ||
            this.tokenizeFromWord('ROWS') ||
            this.tokenizeFromWord('ONLY') ||
            this.tokenizeFromWord('NEXT') ||
            this.tokenizeFromWord('FIRST');
    }

    dotToken() {
        return this.tokenizeFromWord('DOT', '.');
    }

    operatorToken() {
        return this.tokenizeFromList('OPERATOR', SQL_OPERATORS);
    }

    mathToken() {
        return this.tokenizeFromList('MATH', MATH) || this.tokenizeFromList('MATH_MULTI', MATH_MULTI);
    }

    conditionalToken() {
        return this.tokenizeFromList('CONDITIONAL', SQL_CONDITIONALS);
    }

    betweenToken() {
        return this.tokenizeFromList('BETWEEN', SQL_BETWEENS);
    }

    subSelectOpToken() {
        return this.tokenizeFromList('SUB_SELECT_OP', SUB_SELECT_OP);
    }

    subSelectUnaryOpToken() {
        return this.tokenizeFromList('SUB_SELECT_UNARY_OP', SUB_SELECT_UNARY_OP);
    }

    functionToken() {
        return this.tokenizeFromList('FUNCTION', SQL_FUNCTIONS);
    }

    sortOrderToken() {
        return this.tokenizeFromList('DIRECTION', SQL_SORT_ORDERS);
    }

    booleanToken() {
        return this.tokenizeFromList('BOOLEAN', BOOLEAN);
    }

    starToken() {
        return this.tokenizeFromRegex('STAR', STAR);
    }

    seperatorToken() {
        return this.tokenizeFromRegex('SEPARATOR', SEPARATOR);
    }

    literalToken() {
        return this.tokenizeFromRegex('LITERAL', LITERAL, 1, 0);
    }

    numberToken() {
        return this.tokenizeFromRegex('NUMBER', NUMBER);
    }

    parameterToken() {
        return this.tokenizeFromRegex('PARAMETER', PARAMETER, 1, 0);
    }

    stringToken() {
        return this.tokenizeFromStringRegex('STRING', STRING, 1, 0) || this.tokenizeFromRegex('DBLSTRING', DBLSTRING, 1, 0);
    }

    parensToken() {
        return this.tokenizeFromRegex('LEFT_PAREN', /^\(/) || this.tokenizeFromRegex('RIGHT_PAREN', /^\)/);
    }

    windowExtension() {
        const match = /^\.(win):(length|time)/i.exec(this.chunk);
        if (!match) {
            return 0;
        }
        this.token('WINDOW', match[1]);
        this.token('WINDOW_FUNCTION', match[2]);
        return match[0].length;
    }

    whitespaceToken() {
        const match = WHITESPACE.exec(this.chunk);
        if (!match) {
            return 0;
        }
        const partMatch = match[0];
        if (this.preserveWhitespace) {
            this.token('WHITESPACE', partMatch);
        }
        const newlines = partMatch.match(/\n/g, '');
        this.currentLine += (newlines != null ? newlines.length : void 0) || 0;
        return partMatch.length;
    }

    regexEscape(str) {
        return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    }

}

exports.tokenize = function (sql, opts) {
    return (new Lexer(sql, opts)).tokens;
};
