# vote-system

## Config

### To deploy
create .env file with
```
RINKEBY_URL=https://rinkeby.infura.io/v3/<projectId>
PRIVATE_KEY=<private key>
```
then run
```
npx hardhat deploy
```
to be able to interact with the contract using hardhat task add 
```
NFT_CONTRACT_ADDRESS=<contractAddress>
```
to you .env file

## Available tasks
`vote:add`              
create new vote
```
OPTIONS:
  --candidates  input file containing candidate date as json array, see candidates.json.example
  --description ballot description`
```

`vote:cast`             
cast a vote
```
OPTIONS:
  --ballot      id of the ballot
  --candidate   id of the candidate
```

`vote:close`            
close a vote
```
OPTIONS:

  --ballot      id of the ballot
```

`vote:withdraw-fee`     
withdraw owner's fee for a closed vote
```
OPTIONS:

  --ballot      id of the ballot
```