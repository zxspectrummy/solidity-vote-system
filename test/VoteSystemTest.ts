import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { VoteSystem } from '../typechain';

describe('Vote System', () => {
  let voteSystem: VoteSystem;
  let owner: SignerWithAddress, addr1: SignerWithAddress, addr2: SignerWithAddress;
  let addrs: SignerWithAddress[];
  let ballot: {
    description: string;
    candidates: { name: string; addr: string }[];
  };

  beforeEach(async () => {
    const VoteSystem = await ethers.getContractFactory('VoteSystem');
    voteSystem = await VoteSystem.deploy();
    await voteSystem.deployed();
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    ballot = {
      description: 'Who wears it best?',
      candidates: [
        { name: 'Terry', addr: addr1.address },
        { name: 'Charles', addr: addr2.address },
      ],
    };
  });

  it('should create vote', async () => {
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

  it('should allow users to vote', async () => {
    await voteSystem
      .addVoting(ballot.description, ballot.candidates)
      .then(() =>
        expect(voteSystem.vote(0, 0)).to.be.revertedWith(
          'Please provide the voting fee of 0.01 eth'
        )
      )
      .then(() => voteSystem.connect(addr1).vote(0, 1, { value: ethers.utils.parseEther('0.01') }));
  });

  it('should decline vote if candidate id is invalid', async () => {
    await voteSystem
      .addVoting(ballot.description, ballot.candidates)
      .then(() =>
        expect(
          voteSystem.connect(addr1).vote(0, 10, { value: ethers.utils.parseEther('0.01') })
        ).to.be.revertedWith('Candidate id does not exist')
      );
  });

  it('should allow user to vote only once at the same poll', async () => {
    await voteSystem
      .addVoting(ballot.description, ballot.candidates)
      .then(() => voteSystem.addVoting('Another vote', ballot.candidates))
      .then(() => voteSystem.connect(addr1).vote(0, 1, { value: ethers.utils.parseEther('0.01') }))
      .then(() =>
        expect(
          voteSystem.connect(addr1).vote(0, 1, { value: ethers.utils.parseEther('0.01') })
        ).to.be.revertedWith('User has already voted')
      )
      .then(
        () =>
          expect(voteSystem.connect(addr1).vote(1, 1, { value: ethers.utils.parseEther('0.01') }))
            .to.not.be.reverted
      );
  });

  it('should not allow to vote if voting expired', async () => {
    await voteSystem
      .addVoting(ballot.description, ballot.candidates)
      .then(() => ethers.provider.send('evm_increaseTime', [60 * 60 * 24 * 3]))
      .then(() =>
        expect(
          voteSystem.connect(addr1).vote(0, 1, { value: ethers.utils.parseEther('0.01') })
        ).to.be.revertedWith('Vote duration has passed')
      );
  });

  it('vote can be closed', async () => {
    await voteSystem
      .addVoting(ballot.description, ballot.candidates)
      .then(() => voteSystem.addVoting('another vote', ballot.candidates))
      .then(() => voteSystem.connect(addr2).vote(0, 1, { value: ethers.utils.parseEther('0.01') }))
      .then(() => ethers.provider.send('evm_increaseTime', [60 * 60 * 24 * 3]))
      .then(async () =>
        expect(await voteSystem.connect(addr1).closeVote(0)).to.changeEtherBalance(
          addr2,
          ethers.utils.parseEther('0.009')
        )
      );
  });

  it('should not allow closing vote before the expiration time', async () => {
    await voteSystem
      .addVoting(ballot.description, ballot.candidates)
      .then(() =>
        expect(voteSystem.connect(addr1).closeVote(0)).to.be.revertedWith(
          'Vote duration has not passed yet'
        )
      );
  });

  it('should not allow closing vote if nobody voted', async () => {
    await voteSystem
      .addVoting(ballot.description, ballot.candidates)
      .then(() => ethers.provider.send('evm_increaseTime', [60 * 60 * 24 * 3]))
      .then(() =>
        expect(voteSystem.connect(addr1).closeVote(0)).to.be.revertedWith('Nobody has voted yet')
      );
  });

  it('should not allow closing vote cannot if tie', async () => {
    await voteSystem
      .addVoting(ballot.description, ballot.candidates)
      .then(() => voteSystem.connect(addr1).vote(0, 0, { value: ethers.utils.parseEther('0.01') }))
      .then(() => voteSystem.connect(addr2).vote(0, 1, { value: ethers.utils.parseEther('0.01') }))
      .then(() => ethers.provider.send('evm_increaseTime', [60 * 60 * 24 * 3]))
      .then(() =>
        expect(voteSystem.connect(addr1).closeVote(0)).to.be.revertedWith('This is a tie vote')
      );
  });

  it('should only allow to close once', async () => {
    await voteSystem
      .addVoting(ballot.description, ballot.candidates)
      .then(() => voteSystem.connect(addr1).vote(0, 0, { value: ethers.utils.parseEther('0.01') }))
      .then(() => ethers.provider.send('evm_increaseTime', [60 * 60 * 24 * 3]))
      .then(() => voteSystem.connect(addr1).closeVote(0))
      .then(() =>
        expect(voteSystem.connect(addr1).closeVote(0)).to.be.revertedWith('Vote is already closed')
      );
  });

  it('should allow owner to withdraw fee', async () => {
    await voteSystem
      .addVoting(ballot.description, ballot.candidates)
      .then(() => voteSystem.addVoting('another vote', ballot.candidates))
      .then(() => voteSystem.connect(addr2).vote(0, 1, { value: ethers.utils.parseEther('0.01') }))
      .then(() => ethers.provider.send('evm_increaseTime', [60 * 60 * 24 * 3]))
      .then(() => voteSystem.connect(addr1).closeVote(0))
      .then(async () =>
        expect(await voteSystem.withdrawFee(0)).to.changeEtherBalance(
          owner,
          ethers.utils.parseEther('0.001')
        )
      );
  });

  it('should allow owner to withdraw fee', async () => {
    await voteSystem
      .addVoting(ballot.description, ballot.candidates)
      .then(() => voteSystem.addVoting('another vote', ballot.candidates))
      .then(() => voteSystem.connect(addr2).vote(0, 1, { value: ethers.utils.parseEther('0.01') }))
      .then(() =>
        expect(voteSystem.withdrawFee(0)).to.be.revertedWith(
          'Cannot withdraw fee, the vote is still open'
        )
      );
  });
});
