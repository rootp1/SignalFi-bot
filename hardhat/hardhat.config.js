require("@nomiclabs/hardhat-waffle");
require('dotenv').config();
const nets = require('./network.json');

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.19",
        settings: { optimizer: { enabled: true, runs: 200 } },
      }
    ]
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  networks: nets
};
