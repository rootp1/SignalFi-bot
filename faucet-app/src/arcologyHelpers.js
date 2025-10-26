/**
 * Arcology Event-Based Query Helpers
 * 
 * Arcology uses events instead of view functions for reading state.
 * These helpers make it easier to work with this pattern.
 */

/**
 * Query balance from Arcology token contract
 * @param {Contract} contract - ethers.js contract instance
 * @param {string} account - Address to query
 * @returns {Promise<BigNumber>} Balance
 */
export async function queryBalance(contract, account) {
  return new Promise(async (resolve, reject) => {
    // Set timeout to prevent hanging
    const timeout = setTimeout(() => {
      reject(new Error('Balance query timeout - event not received'));
    }, 10000); // 10 second timeout

    try {
      // Set up event listener BEFORE sending the transaction
      const filter = contract.filters.BalanceQuery(account);
      
      contract.once(filter, (queriedAccount, balance) => {
        clearTimeout(timeout);
        console.log(`Balance query result for ${queriedAccount}: ${balance.toString()}`);
        resolve(balance);
      });

      // Send the transaction that will emit the event
      const tx = await contract.balanceOf(account);
      const receipt = await tx.wait();
      
      // If event didn't trigger, parse it from receipt
      const event = receipt.events?.find(e => e.event === 'BalanceQuery');
      if (event && event.args) {
        clearTimeout(timeout);
        resolve(event.args.balance);
      }
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

/**
 * Query allowance from Arcology token contract
 * @param {Contract} contract - ethers.js contract instance  
 * @param {string} owner - Owner address
 * @param {string} spender - Spender address
 * @returns {Promise<BigNumber>} Allowance amount
 */
export async function queryAllowance(contract, owner, spender) {
  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Allowance query timeout'));
    }, 10000);

    try {
      const filter = contract.filters.AllowanceQuery(owner, spender);
      
      contract.once(filter, (queriedOwner, queriedSpender, allowance) => {
        clearTimeout(timeout);
        console.log(`Allowance query result: ${allowance.toString()}`);
        resolve(allowance);
      });

      const tx = await contract.allowance(owner, spender);
      const receipt = await tx.wait();

      const event = receipt.events?.find(e => e.event === 'AllowanceQuery');
      if (event && event.args) {
        clearTimeout(timeout);
        resolve(event.args.allowance);
      }
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

/**
 * Query time until next claim from faucet
 * @param {Contract} faucetContract - Faucet contract instance
 * @param {string} userAddress - User address
 * @returns {Promise<BigNumber>} Time remaining in seconds
 */
export async function queryFaucetCooldown(faucetContract, userAddress) {
  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Cooldown query timeout'));
    }, 10000);

    try {
      const filter = faucetContract.filters.CooldownQuery(userAddress);
      
      faucetContract.once(filter, (user, timeRemaining) => {
        clearTimeout(timeout);
        console.log(`Cooldown for ${user}: ${timeRemaining.toString()}s`);
        resolve(timeRemaining);
      });

      const tx = await faucetContract.getTimeUntilNextClaim(userAddress);
      const receipt = await tx.wait();

      const event = receipt.events?.find(e => e.event === 'CooldownQuery');
      if (event && event.args) {
        clearTimeout(timeout);
        resolve(event.args.timeRemaining);
      }
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

/**
 * Check if user can claim from faucet
 * @param {Contract} faucetContract - Faucet contract instance
 * @param {string} userAddress - User address
 * @returns {Promise<boolean>} Whether user can claim
 */
export async function queryCanClaim(faucetContract, userAddress) {
  return new Promise(async (resolve, reject) => {
    try {
      const filter = faucetContract.filters.CanClaimQuery(userAddress);
      
      faucetContract.once(filter, (user, canClaim) => {
        console.log(`Can ${user} claim: ${canClaim}`);
        resolve(canClaim);
      });

      const tx = await faucetContract.canClaim(userAddress);
      await tx.wait();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Parse event from transaction receipt
 * Useful for getting return values from transactions
 * @param {TransactionReceipt} receipt - Transaction receipt
 * @param {Contract} contract - Contract instance
 * @param {string} eventName - Name of the event to parse
 * @returns {any} Event args
 */
export function parseEvent(receipt, contract, eventName) {
  const event = receipt.events?.find(e => e.event === eventName);
  if (!event) {
    throw new Error(`Event ${eventName} not found in receipt`);
  }
  return event.args;
}
