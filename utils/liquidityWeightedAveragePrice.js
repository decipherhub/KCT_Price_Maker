const BigNumber = require('bignumber.js');

function lwapFromSameSource(lps = [], targetToken, sourceToken, targetDecimal, sourceDecimal, sourcePrice) {
	// lps = [
	//   {
	//   target: '0x0',
	//   source: '0x0',
	//   targetAmount: '1234',
	//   sourceAmount: '1234' }
	// ];
	//
	let sourceTotal = new BigNumber(0);
	let targetTotal = new BigNumber(0);

	for (lp of lps) {
		if (lp.source === sourceToken && lp.target === targetToken) {
			sourceTotal = sourceTotal.plus(new BigNumber(lp.sourceAmount));
			targetTotal = targetTotal.plus(new BigNumber(lp.targetAmount));
		} else {
			console.log('err', lp);
		}
	}

	let targetPrice = sourceTotal
		.multipliedBy(sourcePrice)
		.dividedBy(targetTotal)
		.multipliedBy(BigNumber(10).pow(targetDecimal))
		.dividedBy(BigNumber(10).pow(sourceDecimal));
	console.log(targetPrice);
	return targetPrice;
}

module.exports = lwapFromSameSource;
