import fs from "fs";
import { ethers } from "hardhat";
import { predictContractAddress } from "./addressPredict";

// Function to parse boolean values from environment variables
function parseBool(str: string) {
  return str.toLowerCase() === "true";
}

// Retrieving configuration from environment variables with default values
const enableMarket = parseBool(process.env.ENABLE_MARKET || "false");
const blocksPerEpoch = parseInt(process.env.BLOCKS_PER_EPOCH || "1000000000");
const lifetimeMonth = parseInt(process.env.LIFETIME_MONTH || "3");
const initHashRate = parseInt(process.env.INIT_HASH_RATE || "1000");

// Constants
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Function to write deployment results to a file
function writeDeployResult(output: string) {
  const deployDir = "./deploy";
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
  }
  fs.writeFileSync(`${deployDir}/localtest.py`, output);
}

// Deploy Simple Market contracts
async function deploySimpleMarket() {
  const [owner] = await ethers.getSigners();

  // Predict contract addresses
  const mineAddress = await predictContractAddress(owner, 1);
  const marketAddress = await predictContractAddress(owner, 2);
  const rewardAddress = await predictContractAddress(owner, 3);
  const flowAddress = await predictContractAddress(owner, 4);

  // Deploy AddressBook contract
  const addressBookABI = await ethers.getContractFactory("AddressBook");
  const addressBook = await addressBookABI.deploy(flowAddress, marketAddress, rewardAddress, mineAddress);

  // Deploy PoraMine contract
  const mineABI = await ethers.getContractFactory("PoraMine");
  const mine = await mineABI.deploy(addressBook.address, initHashRate, 20, 0);

  // Deploy FixedPrice contract
  const marketABI = await ethers.getContractFactory("FixedPrice");
  const market = await marketABI.deploy(addressBook.address, lifetimeMonth);

  // Deploy OnePoolReward contract
  const rewardABI = await ethers.getContractFactory("OnePoolReward");
  const reward = await rewardABI.deploy(addressBook.address, lifetimeMonth);

  // Deploy FixedPriceFlow contract
  const flowABI = await ethers.getContractFactory("FixedPriceFlow");
  const flow = await flowABI.deploy(addressBook.address, BigInt(blocksPerEpoch), 0);

  // Get current block number and owner's account address
  const blockNumber = await ethers.provider.getBlockNumber();
  const account = owner.address;

  // Output deployment results
  const output = `flow = '${flow.address}'\nPoraMine = '${mine.address}'\nmarket = '${market.address}'\nreward = '${reward.address}'\nblockNumber = ${blockNumber}\naccount = '${account}'`;

  console.log(output);
  writeDeployResult(output);
}

// Deploy contracts without Market
async function deployNoMarket() {
  const [owner] = await ethers.getSigners();

  // Predict contract addresses
  const flowAddress = await predictContractAddress(owner, 1);
  const mineAddress = await predictContractAddress(owner, 2);

  // Deploy AddressBook contract
  const addressBookABI = await ethers.getContractFactory("AddressBook");
  const addressBook = await addressBookABI.deploy(flowAddress, ZERO_ADDRESS, ZERO_ADDRESS, mineAddress);

  // Deploy Flow contract
  const flowABI = await ethers.getContractFactory("Flow");
  const flow = await flowABI.deploy(addressBook.address, BigInt(blocksPerEpoch), 0);

  // Get current block number and owner's account address
  const blockNumber = await ethers.provider.getBlockNumber();
  const account = owner.address;

  // Deploy PoraMineTest contract
  const mineABI = await ethers.getContractFactory("PoraMineTest");
  const mine = await mineABI.deploy(addressBook.address, 0);

  // Output deployment results
  const output = `flow = '${flow.address}'\nPoraMine = '${mine.address}'\nblockNumber = ${blockNumber}\naccount = '${account}'`;

  console.log(output);
  writeDeployResult(output);
}

// Main function to decide which deployment to run
async function main() {
  if (enableMarket) {
    await deploySimpleMarket();
  } else {
    await deployNoMarket();
  }
}

// Execute main function and handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
