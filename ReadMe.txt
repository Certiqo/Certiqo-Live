For local deployment:
	1) Start Ganache on port 8545 and copy the Seed phrase.
	2) In your browser, open metamask console and import the accounts using the seed phrase copied in the above step.
	3) Go to Certiqo-contract folder -> Open a new terminal and execute 'truffle migrate --reset --network development'
	4) In the terminal go to the line 'contract address:' and copy the corresponding address.

For Infura deployment:
	1) Copy your Ropsten account seed phrase
	2) In your browser, open metamask console and import the accounts using the seed phrase copied in the above step.
	3) Go to Certiqo-contract folder -> Open a new terminal and execute 'truffle migrate --reset --network ropsten'
	4) In the terminal go to the line 'contract address:' and copy the corresponding address.
	
5) Go to (Certiqo-app > src > js > app.js) and paste the copied address onto line 8. 
6) Go back to Certiqo-app folder, open a new terminal and execute 'npm start'.
7) Open 'localhost:3000' on your browser and when prompted connect accounts using metamask.
8) To close the App, hit 'ctrl + c' on the terminal and choose 'Y' to terminate.

--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
[
In case of: File DB error 
	-> Copy and paste 'Current Hash:' from terminal into certiqo-contract/migrations/2_deploy_contracts.js on line 4 to override the preset hash and re-deploy the contract
	-> Open certiqo-app/db/drugs.json and delete all the json objects leaving only '{}'. This resets the file hash to the one used in the above step
]
This is a safety check to avoid data tampering and will not arise if the node.js application is hosted on cloud (or) similar network.

