import resolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import image from '@rollup/plugin-image';
import webWorkerLoader from 'rollup-plugin-web-worker-loader';
export default [
	{
		input: 'src/Potree.js',
		treeshake: false,
		external: ['jquery', 'stats.js', 'ol'],
		output: {
			file: 'build/potree/potree.js',
			format: 'umd',
			name: 'Potree',
			sourcemap: false,
			globals: {
				jquery: '$'
			}
		},
		plugins: [
			resolve(),
			babel({ babelHelpers: 'bundled' }),
			image(),
			webWorkerLoader({platform: 'browser'}),
		],
	}, 
];