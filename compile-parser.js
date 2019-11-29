const fs = require('fs');

const parser = require('./src/grammar').parser;

const code = `${parser.generate()}

exports.parser = parser;`;

fs.writeFileSync('src/compiled_parser.js', code);
