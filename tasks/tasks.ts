import { task } from 'hardhat/config';
import { getVotingSystemContract } from './contract';
import { TransactionResponse } from '@ethersproject/abstract-provider';
import fs from 'fs';
import * as path from 'path';
import { Contract } from 'ethers';

task('vote:cast', 'Cast a vote')
  .addParam('ballot', 'id of the ballot')
  .addParam('candidate', 'id of the candidate')
  .setAction(async (taskArgs, hre) => {
    return getVotingSystemContract(hre)
      .then((contract: Contract) => {
        return contract.vote(taskArgs.ballot, taskArgs.candidate, {
          value: hre.ethers.utils.parseEther('0.01'),
        });
      })
      .then((tr: TransactionResponse) => {
        process.stdout.write(`TX hash: ${tr.hash}`);
      });
  });

task('vote:close', 'close a vote')
  .addParam('ballot', 'id of the ballot')
  .setAction(async (taskArgs, hre) => {
    return getVotingSystemContract(hre)
      .then((contract: Contract) => {
        return contract.closeVote(taskArgs.ballot);
      })
      .then((tr: TransactionResponse) => {
        process.stdout.write(`TX hash: ${tr.hash}`);
      });
  });

task('vote:withdraw-fee', "withdraw owner's fee")
  .addParam('ballot', 'id of the ballot')
  .setAction(async (taskArgs, hre) => {
    return getVotingSystemContract(hre)
      .then((contract: Contract) => {
        return contract.withdrawFee(taskArgs.ballot);
      })
      .then((tr: TransactionResponse) => {
        process.stdout.write(`TX hash: ${tr.hash}`);
      });
  });

task('vote:add', 'Create new vote')
  .addParam('description', 'ballot description')
  .addParam(
    'candidates',
    'input file containing candidate date as json array, see candidates.json.example'
  )
  .setAction(async (taskArgs, hre) => {
    return getVotingSystemContract(hre)
      .then((contract: Contract) => {
        const candidateData = JSON.parse(
          fs.readFileSync(path.join(process.cwd(), taskArgs.candidates), 'utf-8')
        );
        return contract.addVoting(taskArgs.description, candidateData);
      })
      .then((tr: TransactionResponse) => {
        process.stdout.write(`TX hash: ${tr.hash}`);
      });
  });
