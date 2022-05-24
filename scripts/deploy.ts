import { ethers } from 'hardhat';

async function main() {
  const VoteSystem = await ethers.getContractFactory('VoteSystem');
  const voteSystem = await VoteSystem.deploy();
  await voteSystem.deployed();
  console.log('Vote system deployed to:', voteSystem.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
