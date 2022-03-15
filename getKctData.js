const Caver = require('caver-js');
const caver = new Caver('https://public-node-api.klaytnapi.com/v1/cypress');

const { multicall } = require('./utils/multicall');

const KSPABI = require('./abi/klayswapFactory.json');
const DEFABI = require('./abi/definixFactory.json');
const UFOABI = require('./abi/ufoswapFactory.json');
const PALAABI = require('./abi/palaswapFactory.json');
const CLAIMABI = require('./abi/claimFactory.json');
const RRABI = require('./abi/roundFactory.json');
const NRABI = require('./abi/neuronFactory.json');
const LPABI = require('./abi/lpABI.json');
const KIP7ABI = require('./abi/kip7ABI.json');

const KSPADDRESS = '0xc6a2ad8cc6e4a7e08fc37cc5954be07d499e7654';
const DEFADDRESS = '0xdEe3df2560BCEb55d3d7EF12F76DCb01785E6b29';
const UFOADDRESS = '0x165e04633A90ef31fc25958fffbD15966eCfe929';
const PALAADDRESS = '0x8E4049a37401b41e3654E9C4fC7f5a5858a5d1f7';
const CLAIMADDRESS = '0x3679c3766E70133Ee4A7eb76031E49d3d1f2B50c';
const RRADDRESS = '0x01D43Af9c2A1e9c5D542c2299Fe5826A357Eb3fe';
const NRADDRESS = '0xe334e8c7073e9aaae3cab998eecca33f56df6621';

const fs = require('fs');

async function getKctData() {
	const KSPContract = new caver.contract(KSPABI, KSPADDRESS);
	const DEFContract = new caver.contract(DEFABI, DEFADDRESS);
	const UFOContract = new caver.contract(UFOABI, UFOADDRESS);
	const PALAContract = new caver.contract(PALAABI, PALAADDRESS);
	const CLAIMContract = new caver.contract(CLAIMABI, CLAIMADDRESS);
	const RRContracrt = new caver.contract(RRABI, RRADDRESS);
	const NRContract = new caver.contract(NRABI, NRADDRESS);

	let lpData = {
		// sample
		// 0x34cF46c21539e03dEb26E4FA406618650766f3b9: {
		//  dex: 'KLAYSWAP',
		//  decimal: '18',
		//  tokenA: '0x0000000000000000000000000000000000000000',
		//  tokenB: '0xC6a2Ad8cC6e4A7E08FC37cC5954be07d499E7654',
		// }
	};

	let kip7Data = {
		// sample
		// 0xC6a2Ad8cC6e4A7E08FC37cC5954be07d499E7654: {
		//   symbol: 'KSP',
		//   decimal: '18',
		'0x0000000000000000000000000000000000000000': {
			symbol: 'KLAY',
			decimal: '18',
		},
	};

	const KSPres = await KSPContract.methods
		.getPoolCount()
		.call()
		.catch((err) => {
			console.log(err);
			return 0;
		})
		.then((res) => Number(res));

	const DEFres = await DEFContract.methods
		.allPairsLength()
		.call()
		.catch((err) => {
			console.log(err);
			return 0;
		})
		.then((res) => Number(res));

	const UFOres = await UFOContract.methods
		.allPairsLength()
		.call()
		.catch((err) => {
			console.log(err);
			return 0;
		})
		.then((res) => Number(res));

	const PALAres = await PALAContract.methods
		.poolInfos()
		.call()
		.catch((err) => {
			console.log(err);
			return 0;
		})
		.then((res) => res.length);

	const CLAIMres = await CLAIMContract.methods
		.allPairsLength()
		.call()
		.catch((err) => {
			console.log(err);
			return 0;
		})
		.then((res) => Number(res));

	const RRres = await RRContracrt.methods
		.allPairsLength()
		.call()
		.catch((err) => {
			console.log(err);
			return 0;
		})
		.then((res) => Number(res));

	const NRres = await NRContract.methods
		.allPairsLength()
		.call()
		.catch((err) => {
			console.log(err);
			return 0;
		})
		.then((res) => Number(res));

	// add klayswap lp data into lpData
	for (let pId = 0; pId < KSPres; pId++) {
		const lpAddress = await KSPContract.methods.getPoolAddress(pId).call();
		const lpContract = new caver.contract(LPABI, lpAddress);
		let lpCallData = [];
		// lpCallData.push(lpContract.methods.name());
		lpCallData.push(lpContract.methods.decimals());
		lpCallData.push(lpContract.methods.tokenA());
		lpCallData.push(lpContract.methods.tokenB());
		const data = await multicall(lpCallData).catch((err) => {
			console.log(err);
		});
		lpData[lpAddress] = {
			dex: 'KLAYSWAP',
			decimal: data[0],
			tokenA: data[1],
			tokenB: data[2],
		};
		if (!(data[1] in kip7Data)) {
			let kip7Contract = new caver.contract(KIP7ABI, data[1]);
			let tokenCallData = [];
			tokenCallData.push(kip7Contract.methods.symbol());
			tokenCallData.push(kip7Contract.methods.decimals());

			const tokenData = await multicall(tokenCallData).catch(console.log);
			kip7Data[data[1]] = {
				symbol: tokenData[0],
				decimal: tokenData[1],
			};
		}
		if (!(data[2] in kip7Data)) {
			let kip7Contract = new caver.contract(KIP7ABI, data[2]);
			let tokenCallData = [];
			tokenCallData.push(kip7Contract.methods.symbol());
			tokenCallData.push(kip7Contract.methods.decimals());

			const tokenData = await multicall(tokenCallData).catch(console.log);
			kip7Data[data[2]] = {
				symbol: tokenData[0],
				decimal: tokenData[1],
			};
		}
	}

	// add definix lp data into lpData
	for (let pId = 0; pId < DEFres; pId++) {
		const lpAddress = await DEFContract.methods
			.allPairs(pId)
			.call()
			.catch((err) => {
				console.log(err);
			});
		const lpContract = new caver.contract(LPABI, lpAddress);
		let lpCallData = [];
		// lpCallData.push(lpContract.methods.name());
		lpCallData.push(lpContract.methods.decimals());
		lpCallData.push(lpContract.methods.token0());
		lpCallData.push(lpContract.methods.token1());
		const data = await multicall(lpCallData).catch((e) => console.log(e));
		lpData[lpAddress] = {
			dex: 'DEFINIX',
			decimal: data[0],
			tokenA: data[1],
			tokenB: data[2],
		};
		if (!(data[1] in kip7Data)) {
			let kip7Contract = new caver.contract(KIP7ABI, data[1]);
			let tokenCallData = [];
			tokenCallData.push(kip7Contract.methods.symbol());
			tokenCallData.push(kip7Contract.methods.decimals());

			const tokenData = await multicall(tokenCallData).catch(console.log);
			kip7Data[data[1]] = {
				symbol: tokenData[0],
				decimal: tokenData[1],
			};
		}
		if (!(data[2] in kip7Data)) {
			let kip7Contract = new caver.contract(KIP7ABI, data[2]);
			let tokenCallData = [];
			tokenCallData.push(kip7Contract.methods.symbol());
			tokenCallData.push(kip7Contract.methods.decimals());

			const tokenData = await multicall(tokenCallData).catch(console.log);
			kip7Data[data[2]] = {
				symbol: tokenData[0],
				decimal: tokenData[1],
			};
		}
	}

	// add ufoswap lp data into lpData
	for (let pId = 0; pId < UFOres; pId++) {
		const lpAddress = await UFOContract.methods
			.allPairs(pId)
			.call()
			.catch((err) => {
				console.log(err);
			});
		const lpContract = new caver.contract(LPABI, lpAddress);
		let lpCallData = [];
		lpCallData.push(lpContract.methods.decimals());
		lpCallData.push(lpContract.methods.token0());
		lpCallData.push(lpContract.methods.token1());
		const data = await multicall(lpCallData).catch((e) => console.log(e));
		lpData[lpAddress] = {
			dex: 'UFOSWAP',
			decimal: data[0],
			tokenA: data[1],
			tokenB: data[2],
		};
		if (!(data[1] in kip7Data)) {
			let kip7Contract = new caver.contract(KIP7ABI, data[1]);
			let tokenCallData = [];
			tokenCallData.push(kip7Contract.methods.symbol());
			tokenCallData.push(kip7Contract.methods.decimals());

			const tokenData = await multicall(tokenCallData).catch(console.log);
			kip7Data[data[1]] = {
				symbol: tokenData[0],
				decimal: tokenData[1],
			};
		}
		if (!(data[2] in kip7Data)) {
			let kip7Contract = new caver.contract(KIP7ABI, data[2]);
			let tokenCallData = [];
			tokenCallData.push(kip7Contract.methods.symbol());
			tokenCallData.push(kip7Contract.methods.decimals());

			const tokenData = await multicall(tokenCallData).catch(console.log);
			kip7Data[data[2]] = {
				symbol: tokenData[0],
				decimal: tokenData[1],
			};
		}
	}

	// add palaSwap lp data into lpData
	const palaPoolInfos = await PALAContract.methods
		.poolInfos()
		.call()
		.catch((err) => {
			console.log(err);
		});
	for (let pId = 0; pId < PALAres; pId++) {
		data = palaPoolInfos[pId];

		lpData[data[0]] = {
			dex: 'PALA',
			decimal: data[5],
			tokenA: data[1],
			tokenB: data[2],
		};
		if (!(data[1] in kip7Data)) {
			let kip7Contract = new caver.contract(KIP7ABI, data[1]);
			let tokenCallData = [];
			tokenCallData.push(kip7Contract.methods.symbol());
			tokenCallData.push(kip7Contract.methods.decimals());

			const tokenData = await multicall(tokenCallData).catch(console.log);
			kip7Data[data[1]] = {
				symbol: tokenData[0],
				decimal: tokenData[1],
			};
		}
		if (!(data[2] in kip7Data)) {
			let kip7Contract = new caver.contract(KIP7ABI, data[2]);
			let tokenCallData = [];
			tokenCallData.push(kip7Contract.methods.symbol());
			tokenCallData.push(kip7Contract.methods.decimals());

			const tokenData = await multicall(tokenCallData).catch(console.log);
			kip7Data[data[2]] = {
				symbol: tokenData[0],
				decimal: tokenData[1],
			};
		}
	}

	// add claimSwap lp data into lpData
	for (let pId = 0; pId < CLAIMres; pId++) {
		const lpAddress = await CLAIMContract.methods
			.allPairs(pId)
			.call()
			.catch((err) => {
				console.log(err);
			});
		const lpContract = new caver.contract(LPABI, lpAddress);
		let lpCallData = [];
		// lpCallData.push(lpContract.methods.name());
		lpCallData.push(lpContract.methods.decimals());
		lpCallData.push(lpContract.methods.token0());
		lpCallData.push(lpContract.methods.token1());
		const data = await multicall(lpCallData).catch((e) => console.log(e));
		lpData[lpAddress] = {
			dex: 'CLAIMSWAP',
			decimal: data[0],
			tokenA: data[1],
			tokenB: data[2],
		};
		if (!(data[1] in kip7Data)) {
			let kip7Contract = new caver.contract(KIP7ABI, data[1]);
			let tokenCallData = [];
			tokenCallData.push(kip7Contract.methods.symbol());
			tokenCallData.push(kip7Contract.methods.decimals());

			const tokenData = await multicall(tokenCallData).catch(console.log);
			kip7Data[data[1]] = {
				symbol: tokenData[0],
				decimal: tokenData[1],
			};
		}
		if (!(data[2] in kip7Data)) {
			let kip7Contract = new caver.contract(KIP7ABI, data[2]);
			let tokenCallData = [];
			tokenCallData.push(kip7Contract.methods.symbol());
			tokenCallData.push(kip7Contract.methods.decimals());

			const tokenData = await multicall(tokenCallData).catch(console.log);
			kip7Data[data[2]] = {
				symbol: tokenData[0],
				decimal: tokenData[1],
			};
		}
	}

	// add roundrobin lp data into lpData
	for (let pId = 0; pId < RRres; pId++) {
		const lpAddress = await RRContracrt.methods.allPairs(pId).call();
		const lpContract = new caver.contract(LPABI, lpAddress);
		let lpCallData = [];
		// lpCallData.push(lpContract.methods.name());
		lpCallData.push(lpContract.methods.decimals());
		lpCallData.push(lpContract.methods.token0());
		lpCallData.push(lpContract.methods.token1());
		const data = await multicall(lpCallData).catch((e) => console.log(e));
		lpData[lpAddress] = {
			dex: 'ROUNDROBIN',
			decimal: data[0],
			tokenA: data[1],
			tokenB: data[2],
		};
		if (!(data[1] in kip7Data)) {
			let kip7Contract = new caver.contract(KIP7ABI, data[1]);
			let tokenCallData = [];
			tokenCallData.push(kip7Contract.methods.symbol());
			tokenCallData.push(kip7Contract.methods.decimals());

			const tokenData = await multicall(tokenCallData).catch(console.log);
			kip7Data[data[1]] = {
				symbol: tokenData[0],
				decimal: tokenData[1],
			};
		}
		if (!(data[2] in kip7Data)) {
			let kip7Contract = new caver.contract(KIP7ABI, data[2]);
			let tokenCallData = [];
			tokenCallData.push(kip7Contract.methods.symbol());
			tokenCallData.push(kip7Contract.methods.decimals());

			const tokenData = await multicall(tokenCallData).catch(console.log);
			kip7Data[data[2]] = {
				symbol: tokenData[0],
				decimal: tokenData[1],
			};
		}
	}

	// add neuronswap lp data into lpData
	for (let pId = 0; pId < NRres; pId++) {
		const lpAddress = await NRContract.methods.allPairs(pId).call();
		const lpContract = new caver.contract(LPABI, lpAddress);
		let lpCallData = [];
		// lpCallData.push(lpContract.methods.name());
		lpCallData.push(lpContract.methods.decimals());
		lpCallData.push(lpContract.methods.token0());
		lpCallData.push(lpContract.methods.token1());
		const data = await multicall(lpCallData).catch((e) => console.log(e));
		lpData[lpAddress] = {
			dex: 'NEURONSWAP',
			decimal: data[0],
			tokenA: data[1],
			tokenB: data[2],
		};
		if (!(data[1] in kip7Data)) {
			let kip7Contract = new caver.contract(KIP7ABI, data[1]);
			let tokenCallData = [];
			tokenCallData.push(kip7Contract.methods.symbol());
			tokenCallData.push(kip7Contract.methods.decimals());

			const tokenData = await multicall(tokenCallData).catch(console.log);
			kip7Data[data[1]] = {
				symbol: tokenData[0],
				decimal: tokenData[1],
			};
		}
		if (!(data[2] in kip7Data)) {
			let kip7Contract = new caver.contract(KIP7ABI, data[2]);
			let tokenCallData = [];
			tokenCallData.push(kip7Contract.methods.symbol());
			tokenCallData.push(kip7Contract.methods.decimals());

			const tokenData = await multicall(tokenCallData).catch(console.log);
			kip7Data[data[2]] = {
				symbol: tokenData[0],
				decimal: tokenData[1],
			};
		}
	}

	fs.writeFile('./lpData.json', JSON.stringify(lpData), () => {});
	fs.writeFile('./tokenData.json', JSON.stringify(kip7Data), () => {});
	console.log('getKctData done');
}
getKctData();

module.exports = {
	getKctData,
};
