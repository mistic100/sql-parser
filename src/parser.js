const parser = require('./compiled_parser').parser;
const nodes = require('./nodes');

parser.lexer = {
    lex          : function () {
        let tag;
        [tag, this.yytext, this.yylineno] = this.tokens[this.pos++] || [''];
        return tag;
    },
    setInput     : function (tokens) {
        this.tokens = tokens;
        return this.pos = 0;
    },
    upcomingInput: function () {
        return '';
    }
};

parser.yy = nodes;

exports.parser = parser;

exports.parse = function (str) {
    return parser.parse(str);
};
