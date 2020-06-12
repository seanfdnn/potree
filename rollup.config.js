import resolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
export default [
	{
		input: 'src/Potree.js',
		treeshake: false,
		output: {
			file: 'build/potree/potree.js',
			format: 'es',
			name: 'Potree',
			sourcemap: true,
		},
		plugins: [
			resolve(),
			babel({ babelHelpers: 'bundled' })
		]
	}, {
		input: 'src/workers/BinaryDecoderWorker.js',
		output: {
			file: 'build/potree/workers/BinaryDecoderWorker.js',
			format: 'es',
			name: 'Potree',
			sourcemap: false
		}
	}, {
		input: 'src/modules/Loader_1.8/OctreeDecoderWorker.js',
		output: {
			file: 'build/potree/workers/OctreeDecoderWorker.js',
			format: 'es',
			name: 'Potree',
			sourcemap: false
		}
	}
];