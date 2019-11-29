SQL Parser
==========

[![NPM version](https://img.shields.io/npm/v/sql-parser-mistic.svg?style=flat-square)](https://www.npmjs.com/package/sql-parser-mistic)
[![jsDelivr CDN](https://data.jsdelivr.com/v1/package/npm/sql-parser-mistic/badge)](https://www.jsdelivr.com/package/npm/sql-parser-mistic)
[![Build Status](https://github.com/mistic100/sql-parser/workflows/CI/badge.svg)](https://github.com/mistic100/sql-parser/actions)

SQL Parser is a lexer, grammar and parser for SQL written in JS. Currently it is only capable of parsing fairly basic SELECT queries but full SQL support will hopefully come in time. See the specs for examples of currently supported queries.


Installation
----------

The package is distributed on NPM and can be installed with...

    npm install sql-parser-mistic

To build from source you'll need to run the following from the root of the project...

    npm install
    npm run compile

Tests are written using Mocha and can be run with...

    npm test


Lexer
-----

The lexer takes a SQL query string as input and returns a stream of tokens in the format

    ['NAME', 'value', lineNumber]

Here is a simple example...

    lexer.tokenize('select * from my_table')

    [
      ['SELECT','select',1],
      ['STAR','*',1],
      ['FROM','from',1],
      ['LITERAL','my_table',1]
    ]

The tokenized output is in a format compatible with JISON.


Parser
------

The parser only currently supports SELECT queries but is able to produce a Select object with properties for where, group, order, limit. See lib/nodes.coffee for more info of the returned object structure. Calling .toString() on a Select object should give you back a well formatted version of the original SQL input.

    tokens = lexer.tokenize("select * from my_table where foo = 'bar'")
    parser.parse(tokens).toString()

    SELECT *
      FROM `my_table`
      WHERE `foo` = 'bar'


Contributions
-------------

Contributions in the form of pull requests that add syntax support are very welcome but should be supported by both Lexer and Parser level tests.
