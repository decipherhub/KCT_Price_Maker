const Caver = require('caver-js');
const caver = new Caver('https://public-node-api.klaytnapi.com/v1/cypress');

const multicallAbi = require('./multicallAbi');
const multicallAddress = '0x778fabd0de783287853372c83dfcaba83bdf5f9c';

function getFunctionSignature(name, inputs) {
	const types = [];
	for (const input of inputs) {
		if (input.type === 'tuple') {
			const tupleString = getFunctionSignature('', input.components);
			types.push(tupleString);
			continue;
		}
		if (input.type === 'tuple[]') {
			const tupleString = getFunctionSignature('', input.components);
			const arrayString = `${tupleString}[]`;
			types.push(arrayString);
			continue;
		}
		types.push(input.type);
	}
	const typeString = types.join(',');
	const functionSignature = `${name}(${typeString})`;
	return functionSignature;
}
function decode(outputs, data) {
	const params = caver.abi.decodeParameters(outputs, data);
	return params;
}
function encode(name, inputs, params) {
	const functionSignature = getFunctionSignature(name, inputs);
	const functionHash = caver.utils.keccak256(functionSignature);

	const functionData = functionHash.substring(2, 10);

	const argumentString = caver.abi.encodeParameters(inputs, params);
	const argumentData = argumentString.substring(2);
	const inputData = `0x${functionData}${argumentData}`;
	return inputData;
}

async function multicall(calls) {
	const multicall = new caver.contract(multicallAbi, multicallAddress);
	const callRequests = calls.map((call) => {
		const callData = encode(call._method.name, call._method.inputs, call.arguments, call._method.signature);
		return {
			target: call._parent._address,
			callData,
		};
	});
	const response = await multicall.methods.aggregate(callRequests).call();
	const callCount = calls.length;
	const callResult = [];
	for (let i = 0; i < callCount; i++) {
		const outputs = calls[i]._method.outputs;
		const returnData = response.returnData[i];
		const params = decode(outputs, returnData);
		const result = outputs.length === 1 ? params[0] : params;
		callResult.push(result);
	}
	return callResult;
}

module.exports = { multicall };
