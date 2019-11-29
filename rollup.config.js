import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';

const pkg = require('./package.json');

export default {
    input   : 'src/sql_parser.js',
    output  : {
        file     : 'browser/sql-parser.js',
        name     : 'SQLParser',
        exports: 'named',
        format   : 'umd',
        sourcemap: true,
        banner   : `/*!
 * SQLParser (v${pkg.version})
 * @copyright 2012-2015 ${pkg.author.name} <${pkg.author.email}>
 * @copyright 2015-${new Date().getFullYear()} ${pkg.contributors[0].name} <${pkg.contributors[0].email}>
 * @licence ${pkg.license}
 */`,
    },
    plugins : [
        commonjs(),
        babel({
            exclude: 'node_modules/**',
        }),
    ]
};
