import { HardhatRuntimeEnvironment } from 'hardhat/types';
import * as dotenv from 'dotenv';
import { VoteSystem } from '../typechain';

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const NFT_CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS!;

export function getVotingSystemContract(hre: HardhatRuntimeEnvironment): Promise<VoteSystem> {
  const ethersProvider = new hre.ethers.providers.InfuraProvider('rinkeby');
  const WALLET = new hre.ethers.Wallet(PRIVATE_KEY, ethersProvider);
  return hre.ethers.getContractAt('VoteSystem', NFT_CONTRACT_ADDRESS, WALLET);
}
