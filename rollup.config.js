// rollup.config.mjs
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';


export default {
    input: 'modules.js',
    output: {
        dir: 'dist',
        format: 'esm',
    },
    plugins: [
        json(),
        resolve({
            browser: true, // Resolve for browser environment
            preferBuiltins: false // Do not prefer Node.js built-in modules
        }),
        commonjs(),
    ],

};
