// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract VoteSystem is Ownable {
    uint voteDuration = 3 days;
    uint32 ballotCount;
    uint voteFee = 0.01 ether;
    mapping(uint => Ballot) public ballots;

    event BallotCreated(string description, string[] candidates, uint32 expirationTime);
    event VoteCasted(uint _ballotId, uint _candidateId);
    event VoteClosed(uint _ballotId);

    struct CandidateData {
        string name;
        address addr;
    }

    struct Candidate {
        string name;
        address addr;
        uint32 voteCount;
        bool valid;
    }

    struct Ballot {
        string description;
        uint32 expirationTime;
        uint candidateCount;
        uint balance;
        bool isOpen;
        mapping(uint => Candidate) candidates;
        mapping(address => bool) hasVoted;
    }

    constructor() {
        ballotCount = 0;
    }

    function addVoting(string calldata description, CandidateData[] calldata candidates) public onlyOwner returns (uint) {
        Ballot storage newBallot = ballots[ballotCount];
        string[] memory candidateNames = new string[](candidates.length);
        newBallot.description = description;
        newBallot.expirationTime = uint32(block.timestamp + voteDuration);
        newBallot.candidateCount = candidates.length;
        newBallot.balance = 0;
        for (uint i = 0; i < candidates.length; i++) {
            newBallot.candidates[i] = Candidate(candidates[i].name, candidates[i].addr, 0, true);
            candidateNames[i] = candidates[i].name;
        }
        newBallot.isOpen = true;
        emit BallotCreated(newBallot.description, candidateNames, newBallot.expirationTime);
        return ballotCount++;
    }

    function vote(uint _ballotId, uint _candidateId) external payable {
        require(msg.value == voteFee, "Please provide the voting fee of 0.01 eth");
        Ballot storage ballot = ballots[_ballotId];
        require(block.timestamp < ballot.expirationTime, "Vote duration has passed");
        require(!ballot.hasVoted[msg.sender], "User has already voted");
        require(ballot.candidates[_candidateId].valid == true, "Candidate id does not exist");
        ballot.hasVoted[msg.sender] = true;
        ballot.candidates[_candidateId].voteCount++;
        ballot.balance += voteFee;
        emit VoteCasted(_ballotId, _candidateId);
    }

    function closeVote(uint _ballotId) external {
        Ballot storage ballot = ballots[_ballotId];
        require(block.timestamp >= ballot.expirationTime, "Vote duration has not passed yet");
        require(ballot.balance > 0, "Nobody has voted yet");
        require(ballot.isOpen == true, "Vote is already closed");
        address payable winner = payable(_getWinnerCandidateAddress(_ballotId));
        winner.transfer((ballot.balance * 90) / 100);
        ballot.isOpen = false;
        emit VoteClosed(_ballotId);
    }

    function _getWinnerCandidateAddress(uint _ballotId) private view returns (address) {
        return ballots[_ballotId].candidates[_getWinnerCandidateId(_ballotId)].addr;
    }

    function _getWinnerCandidateId(uint _ballotId) private view returns (uint winner_) {
        uint winningVoteCount = 0;
        Ballot storage ballot = ballots[_ballotId];
        for (uint c = 0; c < ballot.candidateCount; c++) {
            if (ballot.candidates[c].voteCount > winningVoteCount) {
                winningVoteCount = ballot.candidates[c].voteCount;
                winner_ = c;
            }
        }
        for (uint x = 0; x < ballot.candidateCount; x++) {
            for (uint y = x + 1; y < ballot.candidateCount; y++) {
                if (
                    winningVoteCount == ballot.candidates[x].voteCount && winningVoteCount == ballot.candidates[y].voteCount
                ) {
                    revert("This is a tie vote");
                }
            }
        }
    }
}
