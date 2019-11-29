const Parser = require('jison').Parser;

const unwrap = /^function\s*\(.*?\)\s*{\s*return\s*([\s\S]*);\s*}/;
const cleanup = /^function\s*\(.*?\)\s*{\s*(.*?)\s*}/s;

function o(patternString, action, options) {
    patternString = patternString.replace(/\s{2,}/g, ' ');

    if (!action) {
        return [patternString, '$$ = $1;', options];
    }

    let match;
    if ((match = unwrap.exec(action.toString()))) {
        action = match[1];
    } else if ((match = cleanup.exec(action.toString()))) {
        action = `(function(){ ${match[1]} }())`;
    } else {
        throw `Invalid action ${action}`;
    }

    action = action.replace(/\bnew /g, '$&yy.');
    action = action.replace(/\s+/g, ' ');

    return [patternString, `$$ = ${action};`, options];
}

const grammar = {
    Root                 : [
        o('Query EOF')
    ],
    Query                : [
        o('SelectQuery'),
        o('SelectQuery Unions', function ($1, $2) {
            $1.unions = $2;
            return $1;
        })
    ],
    SelectQuery          : [
        o('SelectWithLimitQuery'),
        o('BasicSelectQuery')
    ],
    BasicSelectQuery     : [
        o('Select'),
        o('Select OrderClause', function ($1, $2) {
            $1.order = $2;
            return $1;
        }),
        o('Select GroupClause', function ($1, $2) {
            $1.group = $2;
            return $1;
        }),
        o('Select GroupClause OrderClause', function ($1, $2, $3) {
            $1.group = $2;
            $1.order = $3;
            return $1;
        })
    ],
    SelectWithLimitQuery : [
        o('SelectQuery LimitClause', function ($1, $2) {
            $1.limit = $2;
            return $1;
        })
    ],
    Select               : [
        o('SelectClause'),
        o('SelectClause WhereClause', function ($1, $2) {
            $1.where = $2;
            return $1;
        })
    ],
    SelectClause         : [
        o('SELECT Fields FROM Table', function ($2, $4) {
            return new Select($2, $4, false);
        }),
        o('SELECT DISTINCT Fields FROM Table', function ($3, $5) {
            return new Select($3, $5, true);
        }),
        o('SELECT Fields FROM Table Joins', function ($2, $4, $5) {
            return new Select($2, $4, false, $5);
        }),
        o('SELECT DISTINCT Fields FROM Table Joins', function ($3, $5, $6) {
            return new Select($3, $5, true, $6);
        })
    ],
    Table                : [
        o('Literal', function ($1) {
            return new Table($1);
        }),
        o('Literal Literal', function ($1, $2) {
            return new Table($1, $2);
        }),
        o('Literal AS Literal', function ($1, $3) {
            return new Table($1, $3);
        }),
        o('LEFT_PAREN List RIGHT_PAREN', function ($2) {
            return $2;
        }),
        o('LEFT_PAREN Query RIGHT_PAREN', function ($2) {
            return new SubSelect($2);
        }),
        o('LEFT_PAREN Query RIGHT_PAREN Literal', function ($2, $4) {
            return new SubSelect($2, $4);
        }),
        o('Literal WINDOW WINDOW_FUNCTION LEFT_PAREN Number RIGHT_PAREN', function ($1, $2, $3, $5) {
            return new Table($1, null, $2, $3, $5);
        })
    ],
    Unions               : [
        o('Union', function ($1) {
            return [$1];
        }),
        o('Unions Union', function ($1, $2) {
            return $1.concat($2);
        })
    ],
    Union                : [
        o('UNION SelectQuery', function ($2) {
            return new Union($2);
        }),
        o('UNION ALL SelectQuery', function ($3) {
            return new Union($3, true);
        })
    ],
    Joins                : [
        o('Join', function ($1) {
            return [$1];
        }),
        o('Joins Join', function ($1, $2) {
            return $1.concat($2);
        })
    ],
    Join                 : [
        o('JOIN Table ON Expression', function ($2, $4) {
            return new Join($2, $4);
        }),
        o('LEFT JOIN Table ON Expression', function ($3, $5) {
            return new Join($3, $5, 'LEFT');
        }),
        o('RIGHT JOIN Table ON Expression', function ($3, $5) {
            return new Join($3, $5, 'RIGHT');
        }),
        o('LEFT INNER JOIN Table ON Expression', function ($4, $6) {
            return new Join($4, $6, 'LEFT', 'INNER');
        }),
        o('RIGHT INNER JOIN Table ON Expression', function ($4, $6) {
            return new Join($4, $6, 'RIGHT', 'INNER');
        }),
        o('LEFT OUTER JOIN Table ON Expression', function ($4, $6) {
            return new Join($4, $6, 'LEFT', 'OUTER');
        }),
        o('RIGHT OUTER JOIN Table ON Expression', function ($4, $6) {
            return new Join($4, $6, 'RIGHT', 'OUTER');
        })
    ],
    WhereClause          : [
        o('WHERE Expression', function ($2) {
            return new Where($2);
        })
    ],
    LimitClause          : [
        o('LIMIT Number', function ($2) {
            return new Limit($2);
        }),
        o('LIMIT Number SEPARATOR Number', function ($2, $4) {
            return new Limit($4, $2);
        }),
        o('LIMIT Number OFFSET Number', function ($2, $4) {
            return new Limit($2, $4);
        })
    ],
    OrderClause          : [
        o('ORDER BY OrderArgs', function ($3) {
            return new Order($3);
        }),
        o('ORDER BY OrderArgs OffsetClause', function ($3, $4) {
            return new Order($3, $4);
        })
    ],
    OrderArgs            : [
        o('OrderArg', function ($1) {
            return [$1];
        }),
        o('OrderArgs SEPARATOR OrderArg', function ($1, $3) {
            return $1.concat($3);
        })
    ],
    OrderArg             : [
        o('Value', function ($1) {
            return new OrderArgument($1, 'ASC');
        }),
        o('Value DIRECTION', function ($1, $2) {
            return new OrderArgument($1, $2);
        })
    ],
    OffsetClause         : [
        // MS SQL Server 2012+
        o('OFFSET OffsetRows', function ($2) {
            return new Offset($2);
        }),
        o('OFFSET OffsetRows FetchClause', function ($2, $3) {
            return new Offset($2, $3);
        })
    ],
    OffsetRows           : [
        o('Number ROW', function ($1) {
            return $1;
        }),
        o('Number ROWS', function ($1) {
            return $1;
        })
    ],
    FetchClause          : [
        o('FETCH FIRST OffsetRows ONLY', function ($3) {
            return $3;
        }),
        o('FETCH NEXT OffsetRows ONLY', function ($3) {
            return $3;
        })
    ],
    GroupClause          : [
        o('GroupBasicClause', function ($1) {
            return $1;
        }),
        o('GroupBasicClause HavingClause', function ($1, $2) {
            $1.having = $2;
            return $1;
        })
    ],
    GroupBasicClause     : [
        o('GROUP BY ArgumentList', function ($3) {
            return new Group($3);
        })
    ],
    HavingClause         : [
        o('HAVING Expression', function ($2) {
            return new Having($2);
        })
    ],
    Expression           : [
        o('LEFT_PAREN Expression RIGHT_PAREN', function ($2) {
            return $2;
        }),
        o('Expression MATH Expression', function ($1, $2, $3) {
            return new Op($2, $1, $3);
        }),
        o('Expression MATH_MULTI Expression', function ($1, $2, $3) {
            return new Op($2, $1, $3);
        }),
        o('Expression OPERATOR Expression', function ($1, $2, $3) {
            return new Op($2, $1, $3);
        }),
        o('Expression BETWEEN BetweenExpression', function ($1, $2, $3) {
            return new Op($2, $1, $3);
        }),
        o('Expression CONDITIONAL Expression', function ($1, $2, $3) {
            return new Op($2, $1, $3);
        }),
        o('Value SUB_SELECT_OP LEFT_PAREN List RIGHT_PAREN', function ($1, $2, $4) {
            return new Op($2, $1, $4);
        }),
        o('Value SUB_SELECT_OP SubSelectExpression', function ($1, $2, $3) {
            return new Op($2, $1, $3);
        }),
        o('SUB_SELECT_UNARY_OP SubSelectExpression', function ($1, $2) {
            return new UnaryOp($1, $2);
        }),
        o('SubSelectExpression', function ($1) {
            return $1;
        }),
        o('WhitepaceList', function ($1) {
            return new WhitepaceList($1);
        }),
        o('CaseStatement', function ($1) {
            return $1;
        }),
        o('Value', function ($1) {
            return $1;
        })
    ],
    BetweenExpression    : [
        o('Expression CONDITIONAL Expression', function ($1, $3) {
            return new BetweenOp([$1, $3]);
        })
    ],
    CaseStatement        : [
        o('CASE CaseWhens END', function ($2) {
            return new Case($2);
        }),
        o('CASE CaseWhens CaseElse END', function ($2, $3) {
            return new Case($2, $3);
        })
    ],
    CaseWhen             : [
        o('WHEN Expression THEN Expression', function ($2, $4) {
            return new CaseWhen($2, $4);
        })
    ],
    CaseWhens            : [
        o('CaseWhens CaseWhen', function ($1, $2) {
            return $1.concat($2);
        }),
        o('CaseWhen', function ($1) {
            return [$1];
        })
    ],
    CaseElse             : [
        o('ELSE Expression', function ($2) {
            return new CaseElse($2);
        })
    ],
    SubSelectExpression  : [
        o('LEFT_PAREN Query RIGHT_PAREN', function ($2) {
            return new SubSelect($2);
        })
    ],
    Value                : [
        o('Literal'),
        o('Number'),
        o('String'),
        o('Function'),
        o('UserFunction'),
        o('Boolean'),
        o('Parameter')
    ],
    WhitepaceList        : [
        o('Value Value', function ($1, $2) {
            return [$1, $2];
        }),
        o('WhitepaceList Value', function ($1, $2) {
            $1.push($2);
            return $1;
        })
    ],
    List                 : [
        o('ArgumentList', function ($1) {
            return new ListValue($1);
        })
    ],
    Number               : [
        o('NUMBER', function ($1) {
            return new NumberValue($1);
        })
    ],
    Boolean              : [
        o('BOOLEAN', function ($1) {
            return new BooleanValue($1);
        })
    ],
    Parameter            : [
        o('PARAMETER', function ($1) {
            return new ParameterValue($1);
        })
    ],
    String               : [
        o('STRING', function ($1) {
            return new StringValue($1, "'");
        }),
        o('DBLSTRING', function ($1) {
            return new StringValue($1, '"');
        })
    ],
    Literal              : [
        o('LITERAL', function ($1) {
            return new LiteralValue($1);
        }),
        o('Literal DOT LITERAL', function ($1, $3) {
            return new LiteralValue($1, $3);
        })
    ],
    Function             : [
        o('FUNCTION LEFT_PAREN AggregateArgumentList RIGHT_PAREN', function ($1, $3) {
            return new FunctionValue($1, $3);
        })
    ],
    UserFunction         : [
        o('LITERAL LEFT_PAREN RIGHT_PAREN', function ($1) {
            return new FunctionValue($1, null, true);
        }),
        o('LITERAL LEFT_PAREN AggregateArgumentList RIGHT_PAREN', function ($1, $3) {
            return new FunctionValue($1, $3, true);
        }),
        o('LITERAL LEFT_PAREN Case RIGHT_PAREN', function ($1, $3) {
            return new FunctionValue($1, $3, true);
        })
    ],
    AggregateArgumentList: [
        o('ArgumentList', function ($1) {
            return new ArgumentListValue($1);
        }),
        o('DISTINCT ArgumentList', function ($2) {
            return new ArgumentListValue($2, true);
        })
    ],
    ArgumentList         : [
        o('Expression', function ($1) {
            return [$1];
        }),
        o('ArgumentList SEPARATOR Expression', function ($1, $3) {
            return $1.concat($3);
        })
    ],
    Fields               : [
        o('Field', function ($1) {
            return [$1];
        }),
        o('Fields SEPARATOR Field', function ($1, $3) {
            return $1.concat($3);
        })
    ],
    Field                : [
        o('STAR', function () {
            return new Star();
        }),
        o('Expression', function ($1) {
            return new Field($1);
        }),
        o('Expression AS Literal', function ($1, $3) {
            return new Field($1, $3);
        })
    ]
};

const tokens = [];

const operators = [
    ['left', 'Op'],
    ['left', 'MATH_MULTI'],
    ['left', 'MATH'],
    ['left', 'OPERATOR'],
    ['left', 'CONDITIONAL']
];

for (let name in grammar) {
    const alternatives = grammar[name];
    grammar[name] = (function () {
        const results = [];
        for (let i = 0, len = alternatives.length; i < len; i++) {
            const alt = alternatives[i];
            const ref = alt[0].split(' ');
            for (let j = 0, len1 = ref.length; j < len1; j++) {
                token = ref[j];
                if (!grammar[token]) {
                    tokens.push(token);
                }
            }
            if (name === 'Root') {
                alt[1] = `return ${alt[1]}`;
            }
            results.push(alt);
        }
        return results;
    })();
}

exports.parser = new Parser({
    tokens     : tokens.join(' '),
    bnf        : grammar,
    operators  : operators.reverse(),
    startSymbol: 'Root',
}, {
    moduleType: 'js',
});
