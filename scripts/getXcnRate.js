const axios = require('axios');

const BASE_URL = 'https://api.onyx.org/api';
const XCNContractAddress = '0x1961AD247B47F4f2242E55a0E5578C6cf01F8D12';

async function getXcnRate() {
  try {
    const url = `${BASE_URL}/otoken`;
    const response = await axios({
      url,
      method: 'get',
      params: {
        addresses: XCNContractAddress,
      },
    });

    const data = response.data.data;
    const market = data.markets[0];
    const xcnRate = market.tokenPrice;

    return xcnRate;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

async function getXcnRateByBlockNumber(blockNumber) {
  try {
    const url = `${BASE_URL}/market_history/graph`;
    const limit = 365;
    let offset = 0;

    let response;
    let responseResult = [];

    do {
      response = await axios({
        url,
        method: 'get',
        params: {
          asset: XCNContractAddress,
          // type: '1hr',  Pagination doesn't work with type specified
          limit,
          offset,
        },
      });

      const data = response.data.data;
      responseResult = data.result;

      if (responseResult[responseResult.length - 1].blockNumber <= blockNumber) {
        let l = 0;
        let r = responseResult.length - 1;
        let m;

        while (l <= r) {
          m = Math.floor((l + r) / 2);
          if (responseResult[m].blockNumber > blockNumber) {
            l = m + 1;
          } else if (responseResult[m].blockNumber < blockNumber) {
            r =  m - 1;
          } else {
            return responseResult[m].priceUSD;
          }
        }

        return r !== -1  ? responseResult[r].priceUSD : undefined;
      } else {
        offset += limit;
      }
    } while (responseResult.length === offset);
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

// TEST
// async function a() {
//   console.log(await getXcnRateByBlockNumber(18310023));
// }
// a();

module.exports = {
  getXcnRate,
  getXcnRateByBlockNumber,
};
