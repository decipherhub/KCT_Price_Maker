const fetch = require('node-fetch');
const fs = require('fs');
const axios = require('axios');
const Caver = require('caver-js');
const caver = new Caver('https://public-node-api.klaytnapi.com/v1/cypress');
// const caver = new Caver('https://kaikas.cypress.klaytn.net:8651');
const BigNumber = require('bignumber.js');
const tokenABI = require('./abi/tokenABI.json');

const LPs = require('./lpData.json');
const Singles = require('./tokenData.json');

const { lwapFromSameSource } = require('./utils/liquidityWeightedAveragePrice');
// dex flags
// 1 : KLAYSWAP lps
// 2 : uniswap lps
const flag = {
	KLAYSWAP: 1,
	DEFINIX: 2,
	UFOSWAP: 2,
	PALASWAP: 2,
	CLAIMSWAP: 2,
	ROUNDROBIN: 2,
	NEURONSWAP: 2,
};

// add token address in case of WKLAYs
const klays = [
	'0x0000000000000000000000000000000000000000',
	'0x5819b6af194A78511c79C85Ea68D2377a7e9335f',
	'0x8DfbB066e2881C85749cCe3d9ea5c7F1335b46aE',
	'0x2ff5f6dE2287CA3075232127277E53519A77947C',
	'0xe4f05A66Ec68B54A58B17c22107b02e0232cC817',
	'0xF01f433268C277535743231C95c8e46783746D30',
	'0xfd844c2fcA5e595004b17615f891620d1cB9bBB2',
];

// add token address in case of dex pivot token ( tokens with high priority )
const pivots = [
	'0xD51C337147c8033a43F3B5ce0023382320C113Aa', // Finix
	'0x7f1712f846a69bf2a9dbc4D48F45F1D52CA32E28', // Ufo
	'0x7A1CdCA99FE5995ab8E317eDE8495c07Cbf488aD', // Pala
	'0xCF87f94fD8F6B6f0b479771F10dF672f99eADa63', // Claim
	'0xe5bbe3aeB87e37A08fd4dE05654095D25828f1ea', // RRT
	'0x340073962a8561CB9E0c271AAb7E182d5F5aF5C8', // NR
];

// add token address in case of exceptions that needs to be dealt at first
const preException = [
	'0x9CFc059F64D664F92f3d0329844B8ccca4E5215B', // ijm classic
	'0x64a4801EB7433bB543255695f690c6b104c9437E', // Meme Therapy
];

// add token address in case of exceptions that needs to be dealt at last
const postException = [
	'0xce40569d65106C32550626822B91565643c07823', // KASH
	'0xE944134903694EBdbB56aaDcfBdF400fB52ea487', // wsKRNO
];

// add token address in case of test token
const tokenBlackList = [
	'0x9160421eA3D1a24101D985B026a60cB0442322cc', // ATTEN
	'0x2eB108D8598B9F432F3671cecDAfCafFF59183dB', // FROG
	'0xE1A96a55465BD1CaCe938f6FeAfEC33EE6C5AEaB', // KDOGE
	'0x0B430aD7bf84eB307E221F0e66216205502F835D', // tAvelk
	'0xf445E3d0f88c4c2C8a2751180aE4a525789CFe32', // bus
	'0x6339795C8b763aa60Fb7Aa32a176d107C9e32D34', // AAA
	'0xdc229B451798774b2F2DE279Cbf13370BB802Fb5', // CFXT
	'0x2A1B0Fb7E7C5bD249DB0A30114084ddc3Ce1e402', // ADA
	'0x7d921E74B26D08Eb2020615d51A325D1ddA433F6', // GLD
	'0xb60c624A24046876F28feEDDe5E010dBDCE85FCc', // SDSU1,
	'0x196Eb94Ce9337c27fD69E3960F88Da28a12469E5', // VIPS,
];

const lpBlackList = [
	'0x5Ce8558679068A5f55e96680f1aEb051ED29F470', // KLAY-HOOK
];

async function getPivotPrice(address, priceObj) {
	try {
		if (address == '0xD51C337147c8033a43F3B5ce0023382320C113Aa') {
			// FINIX pivot price
			const klayFinixContract = new caver.contract(tokenABI, '0x8fD25bb623a988E52c65f68A68E8780014F0892d');
			let res = await klayFinixContract.methods.getReserves().call();
			let finixPrice = BigNumber(res[0])
				.div(res[1])
				.multipliedBy(priceObj['0x0000000000000000000000000000000000000000']);
			// console.log('finixPrice', finixPrice);
			return finixPrice;
		} else if (address == '0x7f1712f846a69bf2a9dbc4D48F45F1D52CA32E28') {
			// UFO pivot price
			const klayUfoContract = new caver.contract(tokenABI, '0xE20614DC76e7fb5B02C6A60e1dc27459E2474336');
			let res = await klayUfoContract.methods.getReserves().call();
			let ufoPrice = BigNumber(res[1]).div(res[0]).multipliedBy(priceObj['0x0000000000000000000000000000000000000000']);
			// console.log('ufoPrice', ufoPrice);
			return ufoPrice;
		} else if (address == '0x7A1CdCA99FE5995ab8E317eDE8495c07Cbf488aD') {
			// PALA pivot price
			const klayPalaContract = new caver.contract(tokenABI, '0xc556be31D170cA00241231371E139C8e4c0fc204');
			let res = await klayPalaContract.methods.getReserves().call();
			let palaPrice = BigNumber(res[0])
				.div(res[1])
				.multipliedBy(priceObj['0x0000000000000000000000000000000000000000']);
			// console.log('palaPrice', palaPrice);
			return palaPrice;
		} else if (address == '0xCF87f94fD8F6B6f0b479771F10dF672f99eADa63') {
			// CLA pivot price
			const claKlayContract = new caver.contract(tokenABI, '0x9ddcBC22bEB97899B5ceDCAbbA50A98314c3bAC1');
			let res = await claKlayContract.methods.getReserves().call();
			let claPrice = BigNumber(res[1]).div(res[0]).multipliedBy(priceObj['0x0000000000000000000000000000000000000000']);
			// console.log('claPrice', claPrice);
			return claPrice;
		} else if (address == '0xe5bbe3aeB87e37A08fd4dE05654095D25828f1ea') {
			// RRT pivot price
			const klayRrtContract = new caver.contract(tokenABI, '0x81b95b6Df65dd84118E7ae54A7E339323c8E29F8');
			let res = await klayRrtContract.methods.getReserves().call();
			let rrtPrice = BigNumber(res[1]).div(res[0]).multipliedBy(priceObj['0x0000000000000000000000000000000000000000']);
			// console.log('rrtPrice', rrtPrice);
			return rrtPrice;
		} else if (address == '0x340073962a8561CB9E0c271AAb7E182d5F5aF5C8') {
			// NR pivot price
			const nrKlayContract = new caver.contract(tokenABI, '0x908a4E95b447bD2e0fd7c020618Ab84b5d6FFc87');
			let res = await nrKlayContract.methods.getReserves().call();
			let nrPrice = BigNumber(res[1]).div(res[0]).multipliedBy(priceObj['0x0000000000000000000000000000000000000000']);
			// console.log('nrPrice', nrPrice);
			return nrPrice;
		}
	} catch (err) {
		console.log(err);
	}
}

async function getExceptionPrice(address, priceObj) {
	try {
		if (address == '0x9CFc059F64D664F92f3d0329844B8ccca4E5215B') {
			const ijmContract = new caver.contract(tokenABI, '0x9CFc059F64D664F92f3d0329844B8ccca4E5215B');
			const ijmInPool = await ijmContract.methods
				.balanceOf('0xcefabd4b6544422d74a4645cdd0a3624e36661aa')
				.call()
				.then((res) => BigNumber(res).dividedBy(1e8));
			const klayInPool = await caver.klay
				.getBalance('0xcefabd4b6544422d74a4645cdd0a3624e36661aa')
				.then((res) => BigNumber(res).dividedBy(1e18));
			const ijmPrice = BigNumber(klayInPool)
				.dividedBy(ijmInPool)
				.multipliedBy(priceObj['0x0000000000000000000000000000000000000000']);
			return ijmPrice;
		} else if (address == '0x64a4801EB7433bB543255695f690c6b104c9437E') {
			const memeContract = new caver.contract(tokenABI, '0x64a4801EB7433bB543255695f690c6b104c9437E');
			const memeInPool = await memeContract.methods
				.balanceOf('0x81097096b277CFB1734c8E93FB080441070d6CDe')
				.call()
				.then((res) => BigNumber(res).dividedBy(1e18));
			const klayInPool = await caver.klay
				.getBalance('0x81097096b277CFB1734c8E93FB080441070d6CDe')
				.then((res) => BigNumber(res).dividedBy(1e18));
			const memePrice = BigNumber(klayInPool)
				.dividedBy(memeInPool)
				.multipliedBy(priceObj['0x0000000000000000000000000000000000000000']);
			return memePrice;
		} else if (address == '0xce40569d65106C32550626822B91565643c07823') {
			const i4iContract = new caver.contract(i4iRouter, '0x44ace4b2c239f3a34866bb7e6149e6ba9eb4110e');
			const kashPrice = await i4iContract.methods
				.getDyWithoutFee(1, 0, '1000000000000000000')
				.call()
				.then((res) =>
					BigNumber(res).dividedBy(1e18).multipliedBy(priceObj['0x4Fa62F1f404188CE860c8f0041d6Ac3765a72E67'])
				);
			return kashPrice;
		} else if (address == '0xE944134903694EBdbB56aaDcfBdF400fB52ea487') {
			const sKRNOContract = new caver.contract(tokenABI, '0x6555F93f608980526B5cA79b3bE2d4EdadB5C562');
			const wsKRNOContract = new caver.contract(tokenABI, '0xE944134903694EBdbB56aaDcfBdF400fB52ea487');
			const wsKRNOTotalSupply = await wsKRNOContract.methods
				.totalSupply()
				.call()
				.then((res) => BigNumber(res).dividedBy(1e18));
			const sKRNOInPool = await sKRNOContract.methods
				.balanceOf('0xE944134903694EBdbB56aaDcfBdF400fB52ea487')
				.call()
				.then((res) => BigNumber(res).dividedBy(1e9));
			const wsKRNOPrice = BigNumber(sKRNOInPool)
				.dividedBy(wsKRNOTotalSupply)
				.multipliedBy(priceObj['0xD676e57Ca65b827fEb112AD81Ff738E7B6c1048d']);
			return wsKRNOPrice;
		}
	} catch (err) {
		return '0';
	}
}

async function getKlayPrice(usd = true) {
	if (usd) {
		let url_coingecho = 'https://api.coingecko.com/api/v3/simple/price?ids=klay-token&vs_currencies=usd';
		let klay_price_usd = await axios
			.get(url_coingecho)
			.then((res) => res.data['klay-token']['usd'])
			.catch(async (err) => 0);
		return klay_price_usd;
	}

	let url_bithumb = `https://api.bithumb.com/public/ticker/KLAY_KRW`;
	let klay_price_krw = await fetch(url_bithumb, {
		method: 'GET',
		headers: { Accept: 'application/json' },
	})
		.then((res) => res.json())
		.then((res) => res.data.closing_price)
		.catch(async (err) => getKLAYFromCoinone());
	return klay_price_krw;
}

async function getKLAYFromCoinone() {
	let url_coinone = 'https://api.coinone.co.kr/ticker/?currency=klay';
	let klay_price_krw = await fetch(url_coinone, {
		method: 'GET',
		headers: { Accept: 'application/json' },
	})
		.then((res) => res.json())
		.then((res) => res.last)
		.catch(async (err) => 0);
	return klay_price_krw;
}

async function priceTokenBByDex(dex, lpAddress, tokenAPrice, tokenADecimal, tokenBDecimal) {
	const lpContract = new caver.contract(tokenABI, lpAddress);
	try {
		if (flag[dex] & 1) {
			let res = await lpContract.methods.getCurrentPool().call().catch(console.log);
			let tokenAInLP = BigNumber(res[0]);
			let tokenBInLP = BigNumber(res[1]);

			let tokenBPrice = BigNumber(tokenAInLP)
				.multipliedBy(BigNumber(10).pow(tokenBDecimal))
				.dividedBy(BigNumber(10).pow(tokenADecimal))
				.dividedBy(tokenBInLP)
				.multipliedBy(tokenAPrice)
				.toFixed(6);
			// console.log(tokenBPrice, lpAddress);
			return tokenBPrice;
		} else if (flag[dex] & 2) {
			let res = await lpContract.methods.getReserves().call().catch(console.log);
			let tokenAInLP = BigNumber(res[0]);
			let tokenBInLP = BigNumber(res[1]);

			let tokenBPrice = BigNumber(tokenAInLP)
				.multipliedBy(BigNumber(10).pow(tokenBDecimal))
				.dividedBy(BigNumber(10).pow(tokenADecimal))
				.dividedBy(tokenBInLP)
				.multipliedBy(tokenAPrice)
				.toFixed(6);
			// console.log(tokenBPrice, lpAddress);
			return tokenBPrice;
		} else {
			return 0;
		}
	} catch (err) {
		// console.log(lpAddress, dex, 'err');
		// console.log('from A to B', tokenAPrice, lpAddress, tokenADecimal, tokenBDecimal);
	}
}

async function priceTokenAByDex(dex, lpAddress, tokenBPrice, tokenADecimal, tokenBDecimal) {
	const lpContract = new caver.contract(tokenABI, lpAddress);
	try {
		if (flag[dex] & 1) {
			let res = await lpContract.methods.getCurrentPool().call().catch(console.log);
			let tokenAInLP = BigNumber(res[0]);
			let tokenBInLP = BigNumber(res[1]);
			let tokenAPrice = BigNumber(tokenBInLP)
				.multipliedBy(BigNumber(10).pow(tokenADecimal))
				.dividedBy(BigNumber(10).pow(tokenBDecimal))
				.dividedBy(tokenAInLP)
				.multipliedBy(tokenBPrice)
				.toFixed(6);
			// console.log(tokenAPrice, lpAddress);
			return tokenAPrice;
		} else if (flag[dex] & 2) {
			let res = await lpContract.methods.getReserves().call().catch(console.log);
			let tokenAInLP = BigNumber(res[0]);
			let tokenBInLP = BigNumber(res[1]);
			let tokenAPrice = BigNumber(tokenBInLP)
				.multipliedBy(BigNumber(10).pow(tokenADecimal))
				.dividedBy(BigNumber(10).pow(tokenBDecimal))
				.dividedBy(tokenAInLP)
				.multipliedBy(tokenBPrice)
				.toFixed(6);
			// console.log(tokenAPrice, lpAddress);
			return tokenAPrice;
		} else {
			return 0;
		}
	} catch (err) {
		// console.log(lpAddress, dex, 'err');
		// console.log('from B to A', tokenBPrice, lpAddress, tokenADecimal, tokenBDecimal);
	}
}

async function getKctPrice(usd = true) {
	let priceObj = {};
	let klayPrice = await getKlayPrice(usd);
	klays.forEach((address) => (priceObj[address] = klayPrice.toString()));
	tokenBlackList.forEach((address) => (priceObj[address] = '0.000000'));

	// pivotTokenPrices
	for (pivot of pivots) {
		let pivotPrice = await getPivotPrice(pivot, priceObj);
		priceObj[pivot] = BigNumber(pivotPrice).toFixed(6);
	}

	// preException
	for (exc of preException) {
		let klayPerExc = await getExceptionPrice(exc, priceObj);
		priceObj[exc] = BigNumber(klayPerExc).toFixed(6);
	}

	// first iteration.
	for (const [address, lp] of Object.entries(LPs)) {
		try {
			const { token, tokenA, tokenB, dex } = lp;
			if (lpBlackList.includes(address)) continue;
			if (klays.includes(tokenA)) {
				if (priceObj.hasOwnProperty(tokenB)) continue;

				priceObj[tokenB] = await priceTokenBByDex(
					dex,
					address,
					priceObj[tokenA],
					Singles[tokenA].decimal,
					Singles[tokenB].decimal
				);
			} else if (klays.includes(tokenB)) {
				if (priceObj.hasOwnProperty(tokenA)) continue;
				priceObj[tokenA] = await priceTokenAByDex(
					dex,
					address,
					priceObj[tokenB],
					Singles[tokenA].decimal,
					Singles[tokenB].decimal
				);
			}
		} catch (err) {}
	}

	// second iteration.
	for (const [address, lp] of Object.entries(LPs)) {
		try {
			const { token, tokenA, tokenB, dex } = lp;
			if (lpBlackList.includes(address)) continue;
			if (klays.includes(tokenA)) {
				if (priceObj.hasOwnProperty(tokenB)) continue;

				priceObj[tokenB] = await priceTokenBByDex(
					dex,
					address,
					priceObj[tokenA],
					Singles[tokenA].decimal,
					Singles[tokenB].decimal
				);
			} else if (klays.includes(tokenB)) {
				if (priceObj.hasOwnProperty(tokenA)) continue;
				priceObj[tokenA] = await priceTokenAByDex(
					dex,
					address,
					priceObj[tokenB],
					Singles[tokenA].decimal,
					Singles[tokenB].decimal
				);
			}
		} catch (err) {}
	}

	// postExceptions
	for (exc of postException) {
		let excPrice = await getExceptionPrice(exc, priceObj);
		priceObj[exc] = BigNumber(excPrice).toFixed(6);
	}
	fs.writeFile('./KctPrice.json', JSON.stringify(priceObj), () => {});

	return priceObj;
}

getKctPrice(true);
