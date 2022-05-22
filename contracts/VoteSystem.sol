// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract VoteSystem is Ownable {
    uint voteDuration = 3 days;
    uint32 ballotCount;
    uint voteFee = 0.01 ether;
    mapping(uint => Ballot) public ballots;

    event BallotCreated(string description, string[] candidates, uint32 expirationTime);
    event VoteCasted();

    struct Candidate {
        string name;
        address addr;
    }

    struct Ballot {
        string description;
        uint32 expirationTime;
        uint candidateCount;
        uint balance;
        mapping(uint => Candidate) candidates;
        mapping(uint => uint32) votesCount;
        mapping(address => bool) hasVoted;
    }

    constructor() {
        ballotCount = 0;
    }

    function addVoting(string calldata description, Candidate[] calldata candidates) public onlyOwner returns (uint) {
        Ballot storage newBallot = ballots[ballotCount];
        string[] memory candidateNames = new string[](candidates.length);
        newBallot.description = description;
        newBallot.expirationTime = uint32(block.timestamp + voteDuration);
        newBallot.candidateCount = candidates.length;
        newBallot.balance = 0;
        for (uint i = 0; i < candidates.length; i++) {
            newBallot.candidates[i] = candidates[i];
            candidateNames[i] = candidates[i].name;
        }
        emit BallotCreated(newBallot.description, candidateNames, newBallot.expirationTime);
        return ballotCount++;
    }

    function getWinner(uint _ballotId) public view returns (uint winningProposal_) {
        uint winningVoteCount = 0;
        for (uint c = 0; c < ballots[_ballotId].candidateCount; c++) {
            if (ballots[_ballotId].votesCount[c] > winningVoteCount) {
                winningVoteCount = ballots[_ballotId].votesCount[c];
                winningProposal_ = c;
            }
        }
    }

    modifier canVote(uint _ballotId) {
        require(!ballots[_ballotId].hasVoted[msg.sender], "User has already voted");
        _;
    }

    modifier isOpen(uint _ballotId) {
        require(block.timestamp < ballots[_ballotId].expirationTime, "Vote is closed");
        _;
    }

    function vote(uint _ballotId, uint _candidateId) external payable canVote(_ballotId) isOpen(_ballotId) {
        require(msg.value == voteFee, "Please provide the voting fee of 0.01 eth");
        Ballot storage ballot = ballots[_ballotId];
        ballot.hasVoted[msg.sender] = true;
        ballot.votesCount[_candidateId]++;
        ballot.balance += voteFee;
    }
}
