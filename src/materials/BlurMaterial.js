
import * as THREE from 'three';
// see http://john-chapman-graphics.blogspot.co.at/2013/01/ssao-tutorial.html

exports.BlurMaterial = class BlurMaterial extends THREE.ShaderMaterial{

	constructor(parameters = {}){
		super();

		let uniforms = {
			near: { type: 'f', value: 0 },
			far: { type: 'f', value: 0 },
			screenWidth: { type: 'f', value: 0 },
			screenHeight: { type: 'f', value: 0 },
			map: { type: 't', value: null }
		};

		this.setValues({
			uniforms: uniforms,
			vertexShader: exports.Shaders['blur.vs'],
			fragmentShader: exports.Shaders['blur.fs']
		});
	}
};

