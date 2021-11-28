const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider());

const { interface, bytecode } = require('../compile');

let lottery;
let accounts;

beforeEach(async () => {
    accounts = await web3.eth.getAccounts();

    lottery = await new web3.eth.Contract(JSON.parse(interface))
        .deploy({ data: bytecode })
        .send({ from: accounts[0], gas: '1000000' });

});

describe('Lottery contract', () => {
    it('deploys a contract', () => {
        assert.ok(lottery.options.address);
    });

    it('allows accounts to enter', async () => {
        await lottery.methods.enter().send({
            from: accounts[0],
            value: web3.utils.toWei('0.012', 'ether')
        });

        await lottery.methods.enter().send({
            from: accounts[1],
            value: web3.utils.toWei('0.015', 'ether')
        });

        await lottery.methods.enter().send({
            from: accounts[2],
            value: web3.utils.toWei('0.018', 'ether')
        });

        const players = await lottery.methods.getPlayers().call({
            from: accounts[0]
        });

        assert.equal(accounts[0], players[0]);
        assert.equal(accounts[1], players[1]);
        assert.equal(accounts[2], players[2]);
        assert.equal(3, players.length);
    });

    it('does not allow account to enter if insufficient ether', async () => {
        try {
            await lottery.methods.enter().send({
                from: accounts[0],
                value: 0
            });
            assert(false);
        } catch (err) {
            assert(err);
        }
    });

    it('Only the manager can pick a winner', async () => {
        try {
              await lottery.methods.enter().send({
                from: accounts[0],
                value: web3.utils.toWei('0.02', 'ether')
              });

              await lottery.methods.pickWinner().send({
                  from: accounts[1]
              });
        } catch (err) {
            assert(err);
            return;
        }
        assert(false);
    });

    it('Sends money to the winner and resets player array', async () => {
        await lottery.methods.enter().send({
            from: accounts[0],
            value: web3.utils.toWei('2', 'ether')
        });

        const initialBalance = await web3.eth.getBalance(accounts[0]);
        await lottery.methods.pickWinner().send({from: accounts[0]});
        const players = await lottery.methods.getPlayers().call({from: accounts[0]});
        const finalBalance = await web3.eth.getBalance(accounts[0]);

        //sending the transaction costs gas
        const difference = finalBalance - initialBalance;
        assert.equal(0, players.length);
        assert(difference > web3.utils.toWei('1.8', 'ether'));
    });
});