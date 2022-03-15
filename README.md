# Klaytn Token Price Calculator

## 국문 설명서

아래의 내용은 디사이퍼 오픈소스 배포물 '클레이튼 덱스 유동성을 통한 토큰 가격(usd/krw) 조회 코드'에 대한 설명입니다. 현재 오픈소스 작성 시점에 Klaytn 네트워크 상의 탈중앙화 거래소 Dex는 Klayswap, Definix, Ufoswap, Pala, Claimswap, Roundrobin, Neuronswap 이 존재하며 해당 덱스들에 대해서는 가격 조회가 정상적으로 가능합니다. 만일 추가적인 덱스가 생긴다면 현재 작성된 코드의 컨벤션을 따라서 추가한다면 확장할 수 있습니다.

DB를 사용하지 않는 환경을 가정하여 코드를 작성하였으므로 활용에 있어 로컬환경의 Read/Write 보다 효율적인 방법이 있다면 그 방식을 적용하는 것을 추천합니다.
해당 readme 에서는 node와 npm을 사용하기에 nodejs 와 node package manager의 설치가 끝난 상태를 가정하고 dependency에 대해 설명하겠습니다. 만일 해당 과정에 어려움을 겪는다면 https://nodejs.org/ko/docs/ 와 https://docs.npmjs.com/ 링크의 문서를 따르는 것을 권장합니다.

먼저 해당 레포를 받아서 `npm install` 을 통해 필요한 패키지를 설치해줍니다.

### 패키지 설명

> caver-js : 클레이튼 네트워크와 통신을 위해 필요한 모듈입니다.
> Caver 인스턴스를 initialize 하면서 klaytn rpc url 이 필요합니다. 현재 클레이튼은 `https://public-node-api.klaytnapi.com/v1/cypress` 을 통해 퍼블릭 rpc url을 제공하기 때문에 이를 사용합니다.
> axios : 기준이 되는 KLAY 가격을 가져오기 위해 필요한 모듈입니다.
> <img width="258" alt="스크린샷 2022-02-24 오후 8 51 09" src="https://user-images.githubusercontent.com/54785113/155518825-7d01c6a2-08bb-4016-8e7b-69e56a8ff04b.png">

해당 프로젝트는 위와 같은 구성을 가집니다. 실행파일은 ./getKctData.js 와 ./getKctPrice.js 입니다.

클레이튼 덱스의 가격데이터를 조회하기 위해 두가지 과정을 거칩니다.

1. 목표로 하는 덱스의 Factory 컨트랙트에 접근하여 해당 덱스에 등록된 LP의 정보를 가져와서 저장.
2. 저장된 LP와 Token들의 정보를 바탕으로 유동성 기반으로 가격을 만드는 과정.

클레이튼의 덱스들의 LP에 대한 정보를 가져와야 합니다. LP 정보는 getKctData 를 호출하여 가져올 수 있습니다.

### getKctData.js

각 덱스별로 사용하는 Factory 컨트랙트가 상이할 수 있습니다. 따라서 각 덱스별로 LP데이터를 만들어서 저장하는 방식도 다를 수 있습니다.
온체인 데이터를 받아오기 위해서는 caver 에서 지원하는 call() 을 사용하는데 call()을 직렬로 처리하게 되면 너무 오랜 시간이 걸리므로 ~/utils 에 추가한 multicall 을 사용합니다.
multicall()은 다른 네트워크와 사용방법이 동일하기에 코드를 확인하면 이해가 어렵지 않을 것입니다.

각 덱스별로 Factory에 접근하여 전체 풀 길이를 가져와서 각 풀별로 접근하여 lpAddress, dex, lpDecimal, tokenAAddress, tokenBAddress 정보를 가져와 lpAddress를 키로 가지는 오브젝트 형태로 만들어 줍니다. 또한 모든 개별 토큰들에 대해서도 address, decimal, symbol의 정보를 가져와 address를 키로 가지는 오브젝트 형태로 만들어 줍니다. DB가 있다면 해당 정보들을 DB로 저장하면 되지만, 앞서 밝혔듯 로컬 환경의 json 파일 형태로 저장하는 것 까지가 해당 파일에서 진행해야 하는 일의 전부입니다.
대신 주의할 점은 Klayswap 에서 사용하는 KLAY 는 네트워크 native 이므로 정보를 가져올 수 없습니다. 따라서 kip7Data에 먼저 initialization 해주어야 합니다.

```
let lpData = {
  // sample KLAY-KSP klayswap LP
  0x34cF46c21539e03dEb26E4FA406618650766f3b9: {
  dex: 'KLAYSWAP',
  decimal: '18',
  tokenA: '0x0000000000000000000000000000000000000000',
  tokenB: '0xC6a2Ad8cC6e4A7E08FC37cC5954be07d499E7654',
  }
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
```

### getKctPrice.js

위의 과정이 정상적으로 끝났다면 로컬 환경에 `lpData.json`과 `tokenData.json`파일이 만들어졌을 것입니다.
`getKctPrice.js`가 정상적으로 작동하기 위해서는 위의 두 파일이 필요하나, 외부 DB를 사용한다면 데이터를 불러오는 방식을 변경할 수 있습니다.
가격 조회에 있어 순서는 다음과 같습니다.

1. KLAY 를 비롯한 덱스별로 사용하는 WKLAY의 가격을 형성하는 과정 - axios를 통해 KLAY의 가격(usd/krw)을 가져오고 KLAY와 WKLAY에 해당 가격을 저장합니다.
2. blacklist로 처리한 토큰들에 대해 0의 값을 할당하는 과정 - blacklist는 위에 정의한 `tokenBlacklists`배열에 적혀있는 tokenAddress들이며 해당 토큰들은 테스트용 토큰이거나 거래가 주 목적이 아닌 토큰들이기에 가격을 조회하는 것이 불필요할 때에 추가하는 방식으로 무시할 수 있습니다.
3. Pivot price 형성 - 각 덱스별 가버넌스 토큰(리워드 토큰)에 가격을 저장합니다. 이는 덱스의 유동성을 순차적으로 처리하기 때문에 생기는 bias를 줄이기 위한 과정으로 각 덱스별 리워드 토큰(FINIX, UFO, PALA, CLA, RRT, NR) 등에 대해 큰 유동성을 지닌 풀로부터 가격을 형성하기 위함입니다.
4. preException 처리 - 특정 밈 토큰(IJM, MEM)들은 덱스 외부의 유동성을 사용하는 경우가 있기 때문에 해당 토큰의 가격은 예외처리를 통해 만들어 냅니다. 이때 preException 에서 처리 가능한 토큰들은 그 유동성이 KLAY와 이루어져 KLAY가격만으로 가격결정이 가능한 토큰들에 해당합니다.
5. postExeption 처리 - 특정 토큰(wsKRNO, KASH)등은 덱스 외부의 유동성을 통해 가격을 결정해야 합니다. 이때 postException 에서 처리하는 토큰들은 필요한 토큰들의 가격(KRNO, KSD)이 결정된 이후에 가격을 형성할 수 있기 때문에 postException으로 처리합니다.
   일반적인 덱스의 LP는 두개의 구성 토큰의 가치가 동일하기에 LP를 구성하는 `A 토큰의 수량 * A 토큰의 가격 = B 토큰의 수량 * B 토큰의 가격` 의 식이 성립합니다. 따라서 토큰의 수량은 LP마다 getReserves, getCurrentPool 등의 함수를 통해 받아오며 양쪽의 토큰 중 하나의 가격을 알고 있는 경우 반대편 구성 토큰의 가격을 만들 수 있는 점에 착안하여 전체 토큰 가격을 형성할 수 있습니다.
   getKctPrice.js 내부의 `getKctPrice()`함수는 하나의 boolean 인풋을 받는데 default는 true이며 true 인 경우 토큰가격을 달러단위로, false인 경우에는 토큰 가격을 원화단위로 만들어 냅니다.
   해당 프로젝트에 대한 개선 또는 수정 문의는 github issue를 통해 제보해주시길 바랍니다.

## English description

Contents below includes instructions on Decipher Open-Source 'KCT price(usd/krw) maker using Klaytn Dex liquidity data'. Currently(24.02.2022),there are 7 Dex including Klayswap, Definix, Ufoswap, Pala, Claimswap, Roundrobin, Neuronswap on Klaytn Network. This code covers tokens that are listed on those 7 Dex. In case of launch of new dex, you could follow the convention of the code to include new dex.
Assuming that the user might not use advantage of external Database, the code uses local file storage. If one could make use of more efficient way of keeping data, I strongly recommand to use that way.
Following description assumes that you are done with setting node and npm, If you are having difficulties with initial settings, plz checkout the links nodejs : https://nodejs.org/ko/docs/ and npm : https://docs.npmjs.com/ .
run `npm install` to install needed packages.

### Packages

> caver-js : module for Klaytn network api uses.
> You need Klaytn RPC url for Caver instance initialization. Currently Klaytn provides public rpc url with`https://public-node-api.klaytnapi.com/v1/cypress`.
> axios : a module to get standard KLAY price(usd/krw)
> <img width="258" alt="스크린샷 2022-02-24 오후 8 51 09" src="https://user-images.githubusercontent.com/54785113/155518825-7d01c6a2-08bb-4016-8e7b-69e56a8ff04b.png">
> This project has architecture of above. The files that are to be run are ./getKctData.js and ./getKctPrice.js.
> You need to follow two steps to get the prices of KCTs.

1. Saving the LP data and Token data from the target Dex Factory Contract.
2. From the LP data and Token data above, making the prices according to the liquidity.
   You can get LP data from getKctData function.

### getKctData.js

Each dex Factory Contract might come with different functions. Therefore, the methods to get the lp Data might differ too. Since we use a lot of call() methods that are provided from caver, it would be very helpfull to use multicall that I added in ~/utils. multicall() works the same way with other networks so it would make sense to look at the code directly.
You need to first get the poolLength of each dex Factory Contract. Then, you access the pools one by one and save as an object with has lpAddress as key and dex, lpDecimal, tokenAAddress, tokenBAddress as its value. Accordingly each KCT should be saved in the same manner with its address as key and decimal and symbol as iths values. If you can use external DB, you can make use of it but if you are not, the data will be saved in the json format on your local project.
One thing to be aware of is that KLAY itself is network native token, therefore you should initialize kip7Data with KLAY included.

```
let lpData = {
  // sample KLAY-KSP klayswap LP
  0x34cF46c21539e03dEb26E4FA406618650766f3b9: {
  dex: 'KLAYSWAP',
  decimal: '18',
  tokenA: '0x0000000000000000000000000000000000000000',
  tokenB: '0xC6a2Ad8cC6e4A7E08FC37cC5954be07d499E7654',
  }
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
```

### getKctPrice.js

If you are done with upper part, you will have `lpData.json`and `tokenData.json`file on your local project.
For `getKctPrice.js` to work, you need those two files but if you are using external database all you have to do is to replace those fields with your storage.
To get the price data, you will go through the following steps. But don't worry, those are mainly autonomous.

1. KLAY & WKLAY prices - you will be give KLAY price from centralized exchange API using axios.
2. initializing 0 value to blacklists - tokens that are listed in `tokenBlacklists` array are given 0 values. These tokens are for tests or mainly not for trading, Therefore you could use this data field to blacklist unneccesary tokens.
3. Pivot prices - You will save prices of governance(reward) tokens for each dex. This process is for reducing bias that might be caused by iterating low liquidity pools.
4. preException process - Some of the meme tokens(IJM, MEM) uses non-dex liquidity pools. Those tokens need to be handled exceptionally. The point of preException is that they require only KLAY prices.
5. postExeption process - Some of the tokens(wsKRNO, KASH) uses non-dex liquidity pools. Those tokens need to be handled exceptionally. The point of preException is that they require specific token(KRNO, KSD) prices.
   The value of two tokens consisting of an LP are in equity. They follow the equation of `A token reserve * A token price = B token reserve * B token price`. Therefore, given both tokens reserve by using methods of getReserves, getCurrentPool, and one of the consisting token's price, you could get the other token's price.
   `getKctPrice()` method requires one boolean input (which is true by default). If the boolean input is true(or not given), the price is given in usd currency and if the boolean input is false, the price is give in krw currency.
   Further development or fixes on this project is open through github issue channel.
