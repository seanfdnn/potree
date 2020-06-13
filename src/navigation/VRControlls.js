import * as THREE from 'three';
export class VRControlls{

	constructor(viewer){

		this.viewer = viewer;

		this.previousPads = [];

		this.selection = [];

		this.triggerStarts = [];

		this.scaleState = null;

		this.selectionBox = this.createBox();
		this.viewer.scene.scene.add(this.selectionBox);

		this.speed = 1;
		this.speedModificationFactor = 50;

		this.snLeft = this.createControllerModel();
		this.snRight = this.createControllerModel();
		
		this.viewer.scene.scene.add(this.snLeft.node);
		this.viewer.scene.scene.add(this.snRight.node);
	}

	createControllerModel(){
		const geometry = new THREE.SphereGeometry(1, 32, 32);
		const material = new THREE.MeshLambertMaterial( { color: 0xff0000, side: THREE.DoubleSide, flatShading: true } );
		const node = new THREE.Mesh(geometry, material);

		node.position.set(0, 0, 0.5);
		node.scale.set(0.02, 0.02, 0.02);
		node.visible = false;

		viewer.scene.scene.add(node);

		const debug = new THREE.Mesh(geometry, new THREE.MeshNormalMaterial());
		debug.position.set(0, 0, 0.5);
		debug.scale.set(0.01, 0.01, 0.01);
		debug.visible = false;


		const controller = {
			node: node,
			debug: debug,
		};

		return controller;
	}

	createBox(){
		const color = 0xffff00;

		const indices = new Uint16Array( [ 0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7 ] );
		const positions = [ 
			1, 1, 1,
			0, 1, 1,
			0, 0, 1,
			1, 0, 1,
			1, 1, 0,
			0, 1, 0,
			0, 0, 0,
			1, 0, 0
		];
		const geometry = new THREE.BufferGeometry();

		geometry.setIndex( new THREE.BufferAttribute( indices, 1 ) );
		geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );

		geometry.computeBoundingSphere();

		const mesh = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial( { color: color } ) );
		mesh.visible = false;

		return mesh;
	}

	debugLine(start, end, index, color){

		if(typeof this.debugLines === "undefined"){

			const geometry = new THREE.SphereGeometry(1, 8, 8);

			this.debugLines = {
				geometry: geometry,
			};
		}

		const n = 100;

		if(!this.debugLines[index]){
			const geometry = this.debugLines.geometry;
			const material = new THREE.MeshBasicMaterial({color: color});
			const nodes = [];

			for(let i = 0; i <= n; i++){
				const u = i / n;

				const node = new THREE.Mesh(geometry, material);

				const position = new THREE.Vector3().addVectors(
					start.clone().multiplyScalar(1 - u),
					end.clone().multiplyScalar(u)
				);

				node.position.copy(position);
				node.scale.set(0.002, 0.002, 0.002);
				this.viewer.scene.scene.add(node);
				nodes.push(node);
			}

			const debugLine = {
				material: material,
				nodes: nodes,
			};

			this.debugLines[index] = debugLine;
		}else{
			const debugLine = this.debugLines[index];

			for(let i = 0; i <= n; i++){
				const node = debugLine.nodes[i];
				const u = i / n;

				const position = new THREE.Vector3().addVectors(
					start.clone().multiplyScalar(1 - u),
					end.clone().multiplyScalar(u)
				);

				node.position.copy(position);
			}
		}


	}

	getPointcloudsAt(pointclouds, position){

		const I = [];
		for(const pointcloud of pointclouds){
			
			const intersects = pointcloud.intersectsPoint(position);

			if(intersects){
				I.push(pointcloud);
			}
		}

		return I;
	}

	copyPad(pad){
		const axes = pad.axes.map(a => a);
		const buttons = pad.buttons.map(b => { return {pressed: b.pressed}; });

		const pose = {
			position: new Float32Array(pad.pose.position),
			orientation: new Float32Array(pad.pose.orientation),
		};

		const copy = {
			axes: axes,
			buttons: buttons,
			pose: pose, 
			hand: pad.hand,
			index: pad.index,
		};

		return copy;
	}

	previousPad(gamepad){
		return this.previousPads.find(c => c.index === gamepad.index);
	}

	toScene(position){

		const vr = viewer.vr;

		vr.node.updateMatrixWorld();
		const world = vr.node.matrixWorld;

		const scenePos = new THREE.Vector3(position.x, -position.z, position.y);
		scenePos.applyMatrix4(world);

		return scenePos;
	}

	update(delta){

		const {selection, viewer, snLeft, snRight} = this;
		const toScene = this.toScene.bind(this);
		const vr = viewer.vr;

		const vrActive = vr && vr.display.isPresenting;

		snLeft.node.visible = vrActive;
		snRight.node.visible = vrActive;

		if(!vrActive){

			return;
		}

		const pointclouds = viewer.scene.pointclouds;

		const gamepads = Array.from(navigator.getGamepads()).filter(p => p !== null).map(this.copyPad);

		const getPad = (list, pattern) => list.find(pad => pad.index === pattern.index);
		
		if(this.previousPads.length !== gamepads.length){
			this.previousPads = gamepads;
		}

		const left = gamepads.find(gp => gp.hand && gp.hand === "left");
		const right = gamepads.find(gp => gp.hand && gp.hand === "right");

		const triggered = gamepads.filter(gamepad => {
			return gamepad.buttons[1].pressed;
		});

		const justTriggered = triggered.filter(gamepad => {
			const prev = this.previousPad(gamepad);
			const previouslyTriggered = prev.buttons[1].pressed;
			const currentlyTriggered = gamepad.buttons[1].pressed;

			return !previouslyTriggered && currentlyTriggered;
		});

		const justUntriggered = gamepads.filter(gamepad => {
			const prev = this.previousPad(gamepad);
			const previouslyTriggered = prev.buttons[1].pressed;
			const currentlyTriggered = gamepad.buttons[1].pressed;

			return previouslyTriggered && !currentlyTriggered;
		});

		if(triggered.length === 0){

			for(const pad of gamepads){
				const position = new THREE.Vector3(...pad.pose.position);

				const I = this.getPointcloudsAt(pointclouds, position);

				let controler = {
					"left": snLeft,
					"right": snRight,
				}[pad.hand];

				if(I.length > 0){
					controler.node.material.color.setRGB(0, 1, 0);
					console.log(pad.hand);
				}else{
					controler.node.material.color.setRGB(1, 0, 0);
				}
			}
		}else{
			if(selection.length > 0){
				const pointcloud = selection[0];
				this.selectionBox.scale.copy(pointcloud.boundingBox.max).multiply(pointcloud.scale);
				this.selectionBox.position.copy(pointcloud.position);
				this.selectionBox.rotation.copy(pointcloud.rotation);
			}
		}

		if(justTriggered.length > 0){

			const pad = justTriggered[0];
			const position = toScene(new THREE.Vector3(...pad.pose.position));
			const I = this.getPointcloudsAt(pointclouds, position);

			const pcs = I.map(p => {
				return {
					node: p,
					position: p.position.clone(),
					rotation: p.rotation.clone(),
					scale: p.scale.clone(),
				};
			});

			const event = {
				pad: pad,
				pointclouds: pcs,
			};

			this.triggerStarts.push(event);
		}

		if(justUntriggered.length > 0){
			for(let untriggeredPad of justUntriggered){
				const p = getPad(this.triggerStarts.map(t => t.pad), untriggeredPad);
				this.triggerStarts = this.triggerStarts.filter(e => e.pad !== p);
			}
		}

		if(triggered.length === 0){
			selection.length = 0;
			this.triggerStarts = [];
		}

		if(justTriggered.length === 1 && triggered.length === 1){
			// one controller was triggered this frame
			const pad = justTriggered[0];
			const position = toScene(new THREE.Vector3(...pad.pose.position));
			const I = this.getPointcloudsAt(pointclouds, position);
			
			if(I.length > 0){
				selection.length = 0;
				selection.push(I[0]);
			}
		}else if(justTriggered.length === 2 && triggered.length === 2){
			// two controllers were triggered this frame
			const pad = justTriggered[0];
			const position = toScene(new THREE.Vector3(...pad.pose.position));
			const I = this.getPointcloudsAt(pointclouds, position);
			
			if(I.length > 0){
				selection.length = 0;
				selection.push(I[0]);
			}
		}

		if(justTriggered.length > 0 && triggered.length === 2){
			// START SCALE/ROTATE

			const pcs = selection.map(p => ({
				node: p,
				position: p.position.clone(),
				rotation: p.rotation.clone(),
				scale: p.scale.clone(),
			}));

			this.scaleState = {
				first: triggered[0],
				second: triggered[1],
				pointclouds: pcs,
			};
		}else if(triggered.length < 2){
			// STOP SCALE/ROTATE
			this.scaleState = null;
		}
		
		if(this.scaleState){
			// SCALE/ROTATE

			const {first, second, pointclouds} = this.scaleState;

			if(pointclouds.length > 0){
				
				const pointcloud = pointclouds[0];
				
				const p1Start = toScene(new THREE.Vector3(...first.pose.position));
				const p2Start = toScene(new THREE.Vector3(...second.pose.position));

				const p1End = toScene(new THREE.Vector3(...getPad(gamepads, first).pose.position));
				const p2End = toScene(new THREE.Vector3(...getPad(gamepads, second).pose.position));

				const diffStart = new THREE.Vector3().subVectors(p2Start, p1Start);
				const diffEnd = new THREE.Vector3().subVectors(p2End, p1End);

				// this.debugLine(p1Start, p2Start, 0, 0xFF0000);
				// this.debugLine(p1End, p2End, 1, 0x00FF00);

				// ROTATION
				const diffStartG = new THREE.Vector3(diffStart.x, diffStart.y, 0);
				const diffEndG = new THREE.Vector3(diffEnd.x, diffEnd.y, 0);
				let sign = Math.sign(diffStartG.clone().cross(diffEndG).z);
				sign = sign === 0 ? 1 : sign;
				const angle = sign * diffStartG.angleTo(diffEndG);
				const newAngle = pointcloud.rotation.z + angle;
				
				// SCALE
				const scale = diffEnd.length() / diffStart.length();
				const newScale = pointcloud.scale.clone().multiplyScalar(scale);

				// POSITION
				const p1ToP = new THREE.Vector3().subVectors(pointcloud.position, p1Start);
				p1ToP.multiplyScalar(scale);
				p1ToP.applyAxisAngle(new THREE.Vector3(0, 0, 1), angle);
				const newPosition = p1End.clone().add(p1ToP);
				
				//this.debugLine(pointcloud.position, newPosition, 0, 0xFF0000);

				//console.log(newScale, p1ToP, angle);

				pointcloud.node.rotation.z = newAngle;
				pointcloud.node.scale.copy(newScale);
				pointcloud.node.position.copy(newPosition);

				pointcloud.node.updateMatrix();
				pointcloud.node.updateMatrixWorld();



			}

		}
		
		if(triggered.length === 1){
			// TRANSLATE POINT CLOUDS
			const pad = triggered[0];
			const prev = this.previousPad(pad);

			const flipWorld = new THREE.Matrix4().fromArray([
					1, 0, 0, 0, 
					0, 0, 1, 0, 
					0, -1, 0, 0,
					0, 0, 0, 1
				]);

			const p1 = new THREE.Vector3(...pad.pose.position).applyMatrix4(flipWorld);
			const p2 = new THREE.Vector3(...prev.pose.position).applyMatrix4(flipWorld);

			p1.applyMatrix4(vr.node.matrixWorld);
			p2.applyMatrix4(vr.node.matrixWorld);

			const diff = new THREE.Vector3().subVectors(p1, p2);

			for(const pc of selection){
				pc.position.add(diff);
			}
		}
	
		{ // MOVE WITH JOYSTICK

			const { display, } = vr;

			const computeMove = (pad) => {
				const axes = pad.axes;

				const opos = new THREE.Vector3(...pad.pose.position);
				const rotation = new THREE.Quaternion(...pad.pose.orientation);
				const d = new THREE.Vector3(0, 0, -1);
				d.applyQuaternion(rotation);
				
				const worldPos = toScene(opos);
				const worldTarget = toScene(new THREE.Vector3().addVectors(opos, d));
				const dir = new THREE.Vector3().subVectors(worldTarget, worldPos).normalize();

				const amount = axes[1] * this.speed;

				const move = dir.clone().multiplyScalar(amount);

				return move;
			};

			let flip = 1;
			if(display.displayName.includes("Oculus")){
				flip = -1;
			}

			let move = null;

			if(left && right){
				move = computeMove(right);

				const leftAdjustAxe = flip * left.axes[1];
				const adjust = this.speedModificationFactor ** leftAdjustAxe;

				move = move.multiplyScalar(adjust);


			}else if(right){
				move = computeMove(right);
			}else if(left){
				move = computeMove(left);
			}

			if(move){
				move.multiplyScalar(delta * flip);

				vr.node.position.add(move);
			}

		}

		{ // MOVE CONTROLLER SCENE NODE
			if(right){
				const { node, } = snRight;
				const opos = new THREE.Vector3(...right.pose.position);
				const position = toScene(opos);
				
				const rotation = new THREE.Quaternion(...right.pose.orientation);
				const d = new THREE.Vector3(0, 0, -1);
				d.applyQuaternion(rotation);

				node.position.copy(position);
			}
			
			if(left){
				const { node, } = snLeft;
				
				const position = toScene(new THREE.Vector3(...left.pose.position));
				node.position.copy(position);
			}
		}

		this.previousPads = gamepads;
	}
};