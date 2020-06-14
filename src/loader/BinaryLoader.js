import * as THREE from 'three';

import {Version} from "../Version.js";
import {XHRFactory} from "../XHRFactory.js";

import BinaryDecoderWorker from 'web-worker:../workers/BinaryDecoderWorker';

export class BinaryLoader{

	constructor(version, boundingBox, scale){
		if (typeof (version) === 'string') {
			this.version = new Version(version);
		} else {
			this.version = version;
		}

		this.boundingBox = boundingBox;
		this.scale = scale;
	}

	load(node){
		if (node.loaded) {
			return;
		}

		let url = node.getURL();

		if (this.version.equalOrHigher('1.4')) {
			url += '.bin';
		}

		let xhr = XHRFactory.createXMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.responseType = 'arraybuffer';
		xhr.overrideMimeType('text/plain; charset=x-user-defined');
		xhr.onreadystatechange = () => {
			if (xhr.readyState === 4) {
				if((xhr.status === 200 || xhr.status === 0) && xhr.response !== null){
					let buffer = xhr.response;
					this.parse(node, buffer);
				} else {
					//console.error(`Failed to load file! HTTP status: ${xhr.status}, file: ${url}`);
					throw new Error(`Failed to load file! HTTP status: ${xhr.status}, file: ${url}`);
				}
			}
		};
		
		try {
			xhr.send(null);
		} catch (e) {
			console.log('fehler beim laden der punktwolke: ' + e);
		}
	};

	parse(node, buffer){
		let pointAttributes = node.pcoGeometry.pointAttributes;
		let numPoints = buffer.byteLength / node.pcoGeometry.pointAttributes.byteSize;

		if (this.version.upTo('1.5')) {
			node.numPoints = numPoints;
		}

		let workerKey = 'BinaryWorker';
		// eslint-disable-next-line no-new
		let worker = exports.workerPool.getWorker(workerKey, () => { new BinaryDecoderWorker(); } );

		worker.onmessage = function (e) {

			let data = e.data;
			let buffers = data.attributeBuffers;
			let tightBoundingBox = new THREE.Box3(
				new THREE.Vector3().fromArray(data.tightBoundingBox.min),
				new THREE.Vector3().fromArray(data.tightBoundingBox.max)
			);

			exports.workerPool.returnWorker(workerKey, worker);

			let geometry = new THREE.BufferGeometry();

			for(let property in buffers){
				let buffer = buffers[property].buffer;
				let batchAttribute = buffers[property].attribute;

				if (property === "POSITION_CARTESIAN") {
					geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(buffer), 3));
				} else if (property === "rgba") {
					geometry.addAttribute("rgba", new THREE.BufferAttribute(new Uint8Array(buffer), 4, true));
				} else if (property === "NORMAL_SPHEREMAPPED") {
					geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
				} else if (property === "NORMAL_OCT16") {
					geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
				} else if (property === "NORMAL") {
					geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
				} else if (property === "INDICES") {
					let bufferAttribute = new THREE.BufferAttribute(new Uint8Array(buffer), 4);
					bufferAttribute.normalized = true;
					geometry.addAttribute('indices', bufferAttribute);
				} else if (property === "SPACING") {
					let bufferAttribute = new THREE.BufferAttribute(new Float32Array(buffer), 1);
					geometry.addAttribute('spacing', bufferAttribute);
				} else {
					const bufferAttribute = new THREE.BufferAttribute(new Float32Array(buffer), 1);

					bufferAttribute.potree = {
						offset: buffers[property].offset,
						scale: buffers[property].scale,
						preciseBuffer: buffers[property].preciseBuffer,
						range: batchAttribute.range,
					};

					geometry.addAttribute(property, bufferAttribute);

					const attribute = pointAttributes.attributes.find(a => a.name === batchAttribute.name);
					attribute.range[0] = Math.min(attribute.range[0], batchAttribute.range[0]);
					attribute.range[1] = Math.max(attribute.range[1], batchAttribute.range[1]);

					if(node.getLevel() === 0){
						attribute.initialRange = batchAttribute.range;
					}

				}
			}

			tightBoundingBox.max.sub(tightBoundingBox.min);
			tightBoundingBox.min.set(0, 0, 0);

			let numPoints = e.data.buffer.byteLength / pointAttributes.byteSize;
			
			node.numPoints = numPoints;
			node.geometry = geometry;
			node.mean = new THREE.Vector3(...data.mean);
			node.tightBoundingBox = tightBoundingBox;
			node.loaded = true;
			node.loading = false;
			node.estimatedSpacing = data.estimatedSpacing;
			exports.numNodesLoading--;
		};

		let message = {
			buffer: buffer,
			pointAttributes: pointAttributes,
			version: this.version.version,
			min: [ node.boundingBox.min.x, node.boundingBox.min.y, node.boundingBox.min.z ],
			offset: [node.pcoGeometry.offset.x, node.pcoGeometry.offset.y, node.pcoGeometry.offset.z],
			scale: this.scale,
			spacing: node.spacing,
			hasChildren: node.hasChildren,
			name: node.name
		};
		worker.postMessage(message, [message.buffer]);
	};

	
}

