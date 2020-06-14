
export class WorkerPool{
	constructor(){
		this.workers = [];
	}

	getWorker(key, factory){
		if (!this.workers[key]){
			this.workers[key] = [];
		}

		if (this.workers[key].length === 0){
			let worker = factory();
			this.workers[key].push(worker);
		}

		let worker = this.workers[key].pop();

		return worker;
	}

	returnWorker(url, worker){
		this.workers[url].push(worker);
	}
};

//Potree.workerPool = new Potree.WorkerPool();
