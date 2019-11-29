const lexer = require('../src/lexer');
const parser = require('../src/parser');

function parse(query) {
    return parser.parse(lexer.tokenize(query)).toString();
}

describe('SQL Grammar', function () {
    describe('SELECT Queries', function () {
        it('parses ORDER BY clauses', function () {
            expect(parse('SELECT * FROM my_table ORDER BY x DESC')).toMatchSnapshot();
        });

        it('parses ORDER BY clauses with OFFSET n ROWS', function () {
            expect(parse('SELECT * FROM my_table ORDER BY x DESC OFFSET 10 ROWS')).toMatchSnapshot();
        });

        it('parses ORDER BY clauses with OFFSET n ROW', function () {
            expect(parse('SELECT * FROM my_table ORDER BY x DESC OFFSET 10 ROW')).toMatchSnapshot();
        });

        it('parses ORDER BY clauses with OFFSET n ROW FETCH FIRST n ONLY', function () {
            expect(parse('SELECT * FROM my_table ORDER BY x DESC OFFSET 10 ROW FETCH FIRST 15 ROW ONLY')).toMatchSnapshot();
        });

        it('parses ORDER BY clauses with OFFSET n ROW FETCH NEXT n ONLY', function () {
            expect(parse('SELECT * FROM my_table ORDER BY x DESC OFFSET 10 ROW FETCH NEXT 15 ROWS ONLY')).toMatchSnapshot();
        });

        it('parses GROUP BY clauses', function () {
            expect(parse('SELECT * FROM my_table GROUP BY x, y')).toMatchSnapshot();
        });

        it('parses LIMIT clauses', function () {
            expect(parse('SELECT * FROM my_table LIMIT 10')).toMatchSnapshot();
        });

        it('parses LIMIT clauses after ORDER BY', function () {
            expect(parse('SELECT * FROM my_table ORDER BY cat DESC LIMIT 10')).toMatchSnapshot();
        });

        it('parses LIMIT clauses with comma separated offset', function () {
            expect(parse('SELECT * FROM my_table LIMIT 30, 10')).toMatchSnapshot();
        });

        it('parses LIMIT clauses with OFFSET keyword', function () {
            expect(parse('SELECT * FROM my_table LIMIT 10 OFFSET 30')).toMatchSnapshot();
        });

        it('parses SELECTs with FUNCTIONs without arguments', function () {
            expect(parse('SELECT X(Y(Z())) FROM X')).toMatchSnapshot();
        });

        it('parses SELECTs with FUNCTIONs', function () {
            expect(parse('SELECT a, COUNT(1, b) FROM my_table LIMIT 10')).toMatchSnapshot();
        });

        it('parses COUNT(DISTINCT field)', function () {
            expect(parse('select a, count(distinct b) FROM my_table limit 10')).toMatchSnapshot();
        });

        it('parses WHERE clauses', function () {
            expect(parse('SELECT * FROM my_table WHERE x > 1 AND y = \'foo\'')).toMatchSnapshot();
        });

        it('parses complex WHERE clauses', function () {
            expect(parse('SELECT * FROM my_table WHERE a > 10 AND (a < 30 OR b = \'c\')')).toMatchSnapshot();
        });

        it('parses WHERE with REGEXP clauses', function () {
            expect(parse('SELECT * FROM my_table WHERE a > 10 AND b REGEXP \'.*\' AND c = 4')).toMatchSnapshot();
        });

        it('parses WHERE with NOT REGEXP clauses', function () {
            expect(parse('SELECT * FROM my_table WHERE a > 10 AND b NOT REGEXP \'.*\' AND c = 4')).toMatchSnapshot();
        });

        it('parses WHERE clauses with BETWEEN operator', function () {
            expect(parse('SELECT * FROM my_table WHERE a > 10 AND b BETWEEN 4 AND 6 AND c = 4')).toMatchSnapshot();
        });

        it('parses WHERE with LIKE and NOT LIKE clauses', function () {
            expect(parse('SELECT * FROM my_table WHERE foo LIKE \'%a\' AND bar NOT LIKE \'b%\'')).toMatchSnapshot();
        });

        it('parses WHERE with ILIKE and NOT ILIKE clauses', function () {
            expect(parse('SELECT * FROM my_table WHERE foo ILIKE \'%a\' AND bar NOT ILIKE \'b%\'')).toMatchSnapshot();
        });

        it('parses WHERE with ORDER BY clauses', function () {
            expect(parse('SELECT * FROM my_table WHERE x > 1 ORDER BY y')).toMatchSnapshot();
        });

        it('parses WHERE with multiple ORDER BY clauses', function () {
            expect(parse('SELECT * FROM my_table WHERE x > 1 ORDER BY x, y DESC')).toMatchSnapshot();
        });

        it('parses WHERE with ORDER BY clauses with direction', function () {
            expect(parse('SELECT * FROM my_table WHERE x > 1 ORDER BY y ASC')).toMatchSnapshot();
        });

        it('parses WHERE with GROUP BY clauses', function () {
            expect(parse('SELECT * FROM my_table WHERE x > 1 GROUP BY x, y')).toMatchSnapshot();
        });

        it('parses WHERE with GROUP BY and ORDER BY clauses', function () {
            expect(parse('SELECT * FROM my_table WHERE x > 1 GROUP BY x, y ORDER BY COUNT(y) ASC')).toMatchSnapshot();
        });

        it('parses WHERE with negative numbers and operaions', function () {
            expect(parse('SELECT * FROM my_table WHERE foo < -5 - 4')).toMatchSnapshot();
        });

        it('parses GROUP BY and HAVING clauses', function () {
            expect(parse('SELECT * FROM my_table GROUP BY x, y HAVING COUNT(`y`) > 1')).toMatchSnapshot();
        });

        it('parses UDFs', function () {
            expect(parse('SELECT LENGTH(a) FROM my_table')).toMatchSnapshot();
        });

        it('parses expressions in place of fields', function () {
            expect(parse('SELECT f+LENGTH(f)/3 AS f1 FROM my_table')).toMatchSnapshot();
        });

        it('supports booleans', function () {
            expect(parse('SELECT null FROM my_table WHERE a = true')).toMatchSnapshot();
        });

        it('supports IS and IS NOT', function () {
            expect(parse('SELECT * FROM my_table WHERE a IS NULL AND b IS NOT NULL')).toMatchSnapshot();
        });

        it('supports nested expressions', function () {
            expect(parse('SELECT * FROM my_table WHERE MOD(LENGTH(a) + LENGTH(b), c)')).toMatchSnapshot();
        });

        it('supports nested fields using dot syntax', function () {
            expect(parse('SELECT a.b.c FROM my_table WHERE a.b > 2')).toMatchSnapshot();
        });

        it('supports time window extensions', function () {
            expect(parse('SELECT * FROM my_table.win:length(123)')).toMatchSnapshot();
        });

        it('parses sub selects', function () {
            expect(parse('select * from (select * from my_table)')).toMatchSnapshot();
        });

        it('parses named sub selects', function () {
            expect(parse('select * from (select * from my_table) t')).toMatchSnapshot();
        });

        it('parses single joins', function () {
            expect(parse('select * from a join b on a.id = b.id')).toMatchSnapshot();
        });

        it('parses right outer joins', function () {
            expect(parse('select * from a right outer join b on a.id = b.id')).toMatchSnapshot();
        });

        it('parses multiple joins', function () {
            expect(parse('select * from a join b on a.id = b.id join c on a.id = c.id')).toMatchSnapshot();
        });

        it('parses UNIONs', function () {
            expect(parse('select * from a union select * from b union select * from c')).toMatchSnapshot();
        });

        it('parses UNION ALL', function () {
            expect(parse('select * from a union all select * from b')).toMatchSnapshot();
        });
    });

    describe('string quoting', function () {
        it('doesn\'t choke on escaped quotes', function () {
            expect(parse('select * from a where foo = \'I\\\'m\'')).toMatchSnapshot();
        });

        it('parses single quote', function () {
            expect(parse('select * from a where foo = \'\'\'\'')).toMatchSnapshot();
        });

        it('allows using double quotes', function () {
            expect(parse('select * from a where foo = "a"')).toMatchSnapshot();
        });

        it('allows using two single quotes', function () {
            expect(parse('select * from a where foo = \'I\'\'m\'')).toMatchSnapshot();
        });

        it('allows nesting different quote styles', function () {
            expect(parse('select * from a where foo = "I\'m" ')).toMatchSnapshot();
        });
    });

    describe('subselect clauses', function () {
        it('parses a subselect field', function () {
            expect(parse('select (select x from y) from a')).toMatchSnapshot();
        });

        it('parses an IN clause containing a list', function () {
            expect(parse('select * from a where x in (1,2,3)')).toMatchSnapshot();
        });

        it('parses an IN clause containing a query', function () {
            expect(parse('select * from a where x in (select foo from bar)')).toMatchSnapshot();
        });

        it('parses a NOT IN clause containing a query', function () {
            expect(parse('select * from a where x not in (select foo from bar)')).toMatchSnapshot();
        });

        it('parses an EXISTS clause containing a query', function () {
            expect(parse('select * from a where exists (select foo from bar)')).toMatchSnapshot();
        });
    });

    describe('aliases', function () {
        it('parses aliased table names', function () {
            expect(parse('select * from a b')).toMatchSnapshot();
        });

        it('parses aliased table names with as', function () {
            expect(parse('select * from a as b')).toMatchSnapshot();
        });
    });

    describe('STARS', function () {
        it('parses stars as multiplication', function () {
            expect(parse('SELECT * FROM foo WHERE a = 1*2')).toMatchSnapshot();
        });
    });

    describe('Parameters', function () {
        it('parses query parameters', function () {
            expect(parse('select * from foo where bar = $12')).toMatchSnapshot();
        });
    });

    describe('functions', function () {
        it('parses function with complex arguments', function () {
            expect(parse('SELECT * FROM foo WHERE bar < DATE_SUB(NOW(), INTERVAL 14 DAYS)')).toMatchSnapshot();
        });
    });

    describe('Case When', function () {
        it('parses case when statements', function () {
            expect(parse('select case when foo = \'a\' then a when foo = \'b\' then b else c end from table')).toMatchSnapshot();
        });
    });

});

