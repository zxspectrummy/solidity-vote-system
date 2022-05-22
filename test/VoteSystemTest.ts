import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { VoteSystem } from '../typechain';

describe('Vote System', function () {
  let voteSystem: VoteSystem;
  let addr1: SignerWithAddress, addr2: SignerWithAddress;
  let addrs: SignerWithAddress[];
  let ballot: {
    description: string;
    candidates: { name: string; addr: string }[];
  };
  beforeEach(async () => {
    const VoteSystem = await ethers.getContractFactory('VoteSystem');
    voteSystem = await VoteSystem.deploy();
    await voteSystem.deployed();
    [, addr1, addr2, ...addrs] = await ethers.getSigners();
    ballot = {
      description: 'Who wears it best?',
      candidates: [
        { name: 'Terry', addr: addr1.address },
        { name: 'Charles', addr: addr2.address },
      ],
    };
  });

  it('owner can add voting', async () => {
    const tx = await voteSystem.addVoting(ballot.description, ballot.candidates);
    await expect(tx)
      .to.emit(voteSystem, 'BallotCreated')
      .withArgs(
        ballot.description,
        [ballot.candidates[0].name, ballot.candidates[1].name],
        (
          await voteSystem.ballots(0)
        ).expirationTime
      );
    await expect(
      voteSystem.connect(addr1).addVoting(ballot.description, ballot.candidates)
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('users can vote', async () => {
    await voteSystem.addVoting(ballot.description, ballot.candidates);
    await expect(voteSystem.vote(0, 0)).to.be.revertedWith(
      'Please provide the voting fee of 0.01 eth'
    );
    await voteSystem.connect(addr1).vote(0, 1, { value: ethers.utils.parseEther('0.01') });
    await voteSystem.connect(addr2).vote(0, 1, { value: ethers.utils.parseEther('0.01') });
    expect(await voteSystem.getWinner(0)).to.equal(1);
  });

  it('user can only vote once', async () => {
    await voteSystem.addVoting(ballot.description, ballot.candidates);
    await voteSystem.addVoting('Another vote', ballot.candidates);
    await voteSystem.connect(addr1).vote(0, 1, { value: ethers.utils.parseEther('0.01') });
    await expect(
      voteSystem.connect(addr1).vote(0, 1, { value: ethers.utils.parseEther('0.01') })
    ).to.be.revertedWith('User has already voted');
    await voteSystem.connect(addr1).vote(1, 1, { value: ethers.utils.parseEther('0.01') });
  });

  it('user cannot vote if voting expired', async () => {
    await voteSystem.addVoting(ballot.description, ballot.candidates);
    await ethers.provider.send('evm_increaseTime', [60 * 60 * 24 * 3]);
    await expect(
      voteSystem.connect(addr1).vote(0, 1, { value: ethers.utils.parseEther('0.01') })
    ).to.be.revertedWith('Vote is closed');
  });
});
