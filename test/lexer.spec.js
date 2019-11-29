const lexer = require('../src/lexer');

// removes the last two params of each token (line and offset)
function clean(tokens) {
    return tokens.map(function (token) {
        return token.slice(0, 2);
    });
}

describe('SQL Lexer', function () {
    it('eats select queries', function () {
        const tokens = clean(lexer.tokenize('select * from my_table'));
        expect(tokens).toEqual([
            ['SELECT', 'select'],
            ['STAR', '*'],
            ['FROM', 'from'],
            ['LITERAL', 'my_table'],
            ['EOF', '']
        ]);
    });

    it('eats select queries with named values', function () {
        const tokens = clean(lexer.tokenize('select foo , bar from my_table'));
        expect(tokens).toEqual([
            ['SELECT', 'select'],
            ['LITERAL', 'foo'],
            ['SEPARATOR', ','],
            ['LITERAL', 'bar'],
            ['FROM', 'from'],
            ['LITERAL', 'my_table'],
            ['EOF', '']
        ]);
    });

    it('eats select queries with named typed values', function () {
        const tokens = clean(lexer.tokenize('select foo:boolean, bar:number from my_table'));
        expect(tokens).toEqual([
            ['SELECT', 'select'],
            ['LITERAL', 'foo:boolean'],
            ['SEPARATOR', ','],
            ['LITERAL', 'bar:number'],
            ['FROM', 'from'],
            ['LITERAL', 'my_table'],
            ['EOF', '']
        ]);
    });

    it('eats select queries with with parameter', function () {
        const tokens = clean(lexer.tokenize('select * from my_table where a = $foo'));
        expect(tokens).toEqual([
            ['SELECT', 'select'],
            ['STAR', '*'],
            ['FROM', 'from'],
            ['LITERAL', 'my_table'],
            ['WHERE', 'where'],
            ['LITERAL', 'a'],
            ['OPERATOR', '='],
            ['PARAMETER', 'foo'],
            ['EOF', '']
        ]);
    });

    it('eats select queries with with parameter and type', function () {
        const tokens = clean(lexer.tokenize('select * from my_table where a = $foo:number'));
        expect(tokens).toEqual([
            ['SELECT', 'select'],
            ['STAR', '*'],
            ['FROM', 'from'],
            ['LITERAL', 'my_table'],
            ['WHERE', 'where'],
            ['LITERAL', 'a'],
            ['OPERATOR', '='],
            ['PARAMETER', 'foo:number'],
            ['EOF', '']
        ]);
    });

    it('eats select queries with stars and multiplication', function () {
        const tokens = clean(lexer.tokenize('select * from my_table where foo = 1 * 2'));
        expect(tokens).toEqual([
            ['SELECT', 'select'],
            ['STAR', '*'],
            ['FROM', 'from'],
            ['LITERAL', 'my_table'],
            ['WHERE', 'where'],
            ['LITERAL', 'foo'],
            ['OPERATOR', '='],
            ['NUMBER', '1'],
            ['MATH_MULTI', '*'],
            ['NUMBER', '2'],
            ['EOF', '']
        ]);
    });

    it('eats select queries with negative numbers', function () {
        const tokens = clean(lexer.tokenize('select * from my_table where foo < -5'));
        expect(tokens).toEqual([
            ['SELECT', 'select'],
            ['STAR', '*'],
            ['FROM', 'from'],
            ['LITERAL', 'my_table'],
            ['WHERE', 'where'],
            ['LITERAL', 'foo'],
            ['OPERATOR', '<'],
            ['NUMBER', '-5'],
            ['EOF', '']
        ]);
    });

    it('eats select queries with negative numbers and minus sign', function () {
        const tokens = clean(lexer.tokenize('select * from my_table where foo < -5 - 5'));
        expect(tokens).toEqual([
            ['SELECT', 'select'],
            ['STAR', '*'],
            ['FROM', 'from'],
            ['LITERAL', 'my_table'],
            ['WHERE', 'where'],
            ['LITERAL', 'foo'],
            ['OPERATOR', '<'],
            ['NUMBER', '-5'],
            ['MATH', '-'],
            ['NUMBER', '5'],
            ['EOF', '']
        ]);
    });

    it('eats sub selects', function () {
        const tokens = clean(lexer.tokenize('select * from (select * from my_table) t'));
        expect(tokens).toEqual([
            ['SELECT', 'select'],
            ['STAR', '*'],
            ['FROM', 'from'],
            ['LEFT_PAREN', '('],
            ['SELECT', 'select'],
            ['STAR', '*'],
            ['FROM', 'from'],
            ['LITERAL', 'my_table'],
            ['RIGHT_PAREN', ')'],
            ['LITERAL', 't'],
            ['EOF', '']
        ]);
    });

    it('eats joins', function () {
        const tokens = clean(lexer.tokenize('select * from a join b on a.id = b.id'));
        expect(tokens).toEqual([
            ['SELECT', 'select'],
            ['STAR', '*'],
            ['FROM', 'from'],
            ['LITERAL', 'a'],
            ['JOIN', 'join'],
            ['LITERAL', 'b'],
            ['ON', 'on'],
            ['LITERAL', 'a'],
            ['DOT', '.'],
            ['LITERAL', 'id'],
            ['OPERATOR', '='],
            ['LITERAL', 'b'],
            ['DOT', '.'],
            ['LITERAL', 'id'],
            ['EOF', '']
        ]);
    });

    it('eats insert queries', function () {
        const tokens = clean(lexer.tokenize('insert into my_table values (\'a\',1)'));
        expect(tokens).toEqual([
            ['INSERT', 'insert'],
            ['INTO', 'into'],
            ['LITERAL', 'my_table'],
            ['VALUES', 'values'],
            ['LEFT_PAREN', '('],
            ['STRING', 'a'],
            ['SEPARATOR', ','],
            ['NUMBER', '1'],
            ['RIGHT_PAREN', ')'],
            ['EOF', '']
        ]);
    });

    it('eats insert queries with default values', function () {
        const tokens = clean(lexer.tokenize('insert into my_table default values'));
        expect(tokens).toEqual([
            ['INSERT', 'insert'],
            ['INTO', 'into'],
            ['LITERAL', 'my_table'],
            ['DEFAULT', 'default'],
            ['VALUES', 'values'],
            ['EOF', '']
        ]);
    });

    it('eats insert queries with multiple rows', function () {
        const tokens = clean(lexer.tokenize('insert into my_table values (\'a\'),(\'b\')'));
        expect(tokens).toEqual([
            ['INSERT', 'insert'],
            ['INTO', 'into'],
            ['LITERAL', 'my_table'],
            ['VALUES', 'values'],
            ['LEFT_PAREN', '('],
            ['STRING', 'a'],
            ['RIGHT_PAREN', ')'],
            ['SEPARATOR', ','],
            ['LEFT_PAREN', '('],
            ['STRING', 'b'],
            ['RIGHT_PAREN', ')'],
            ['EOF', '']
        ]);
    });

    it('eats insert queries with multiple rows and column names', function () {
        const tokens = clean(lexer.tokenize('insert into my_table (foo) values (\'a\'),(\'b\')'));
        expect(tokens).toEqual([
            ['INSERT', 'insert'],
            ['INTO', 'into'],
            ['LITERAL', 'my_table'],
            ['LEFT_PAREN', '('],
            ['LITERAL', 'foo'],
            ['RIGHT_PAREN', ')'],
            ['VALUES', 'values'],
            ['LEFT_PAREN', '('],
            ['STRING', 'a'],
            ['RIGHT_PAREN', ')'],
            ['SEPARATOR', ','],
            ['LEFT_PAREN', '('],
            ['STRING', 'b'],
            ['RIGHT_PAREN', ')'],
            ['EOF', '']
        ]);
    });

    it('eats case when', function () {
        const tokens = clean(lexer.tokenize('select case when foo = \'a\' then a when foo = \'b\' then b else c end from table'));
        expect(tokens).toEqual([
            ['SELECT', 'select'],
            ['CASE', 'case'],
            ['WHEN', 'when'],
            ['LITERAL', 'foo'],
            ['OPERATOR', '='],
            ['STRING', 'a'],
            ['THEN', 'then'],
            ['LITERAL', 'a'],
            ['WHEN', 'when'],
            ['LITERAL', 'foo'],
            ['OPERATOR', '='],
            ['STRING', 'b'],
            ['THEN', 'then'],
            ['LITERAL', 'b'],
            ['ELSE', 'else'],
            ['LITERAL', 'c'],
            ['END', 'end'],
            ['FROM', 'from'],
            ['LITERAL', 'table'],
            ['EOF', '']
        ]);
    });

});

