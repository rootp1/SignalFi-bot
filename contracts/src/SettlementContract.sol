// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "./AmmContract.sol"; // Import our local AMM interface

/**
 * @title SettlementContract
 * @author (Your Team Name)
 * @notice This is the core "bank" and "enforcer" contract.
 * It holds all user funds and executes bundled trades.
 */
contract SettlementContract {
    // --- State Variables ---

    IERC20 public usdc;
    IAmm public amm;
    IPyth public pyth; // We won't use this yet, but set it for the ABI

    address public relayerAddress;
    address public broadcasterAddress; // Hard-coded for MVP

    // Tracks on-chain deposits (user address => deposited amount)
    mapping(address => uint256) public deposits;

    // --- Events ---
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);

    // --- Errors ---
    error OnlyRelayer();

    // --- Constructor ---

    constructor(
        address _usdcAddress,
        address _ammAddress,
        address _pythAddress,
        address _broadcasterAddress,
        address _relayerAddress
    ) {
        usdc = IERC20(_usdcAddress);
        amm = IAmm(_ammAddress);
        pyth = IPyth(_pythAddress);
        broadcasterAddress = _broadcasterAddress;
        relayerAddress = _relayerAddress;
    }

    // --- Modifier ---

    modifier onlyRelayer() {
        if (msg.sender != relayerAddress) revert OnlyRelayer();
        _;
    }

    // --- Phase 1 Stub Functions ---

    /**
     * @dev User calls this to deposit funds.
     * This function will be implemented in Phase 2.
     * For Phase 1, we just need the stub.
     */
    function deposit(uint256 amount) external {
        // Phase 2 Logic:
        // usdc.transferFrom(msg.sender, address(this), amount);
        // deposits[msg.sender] += amount;
        // emit Deposit(msg.sender, amount);
    }

    /**
     * @dev The CORE function. Only the Relayer can call this.
     * This will be implemented in Phase 3.
     */
    function settleTrades(bytes[] calldata bundled_agreements)
        external
        onlyRelayer
    {
        // Phase 3 Logic:
        // 1. Loop through bundles, validate signatures (`ecrecover`)
        // 2. Aggregate all trades (e.g., 200 USDC to buy SOL)
        // 3. Call Pyth oracle for price check
        // 4. Call `amm.swap(...)`
        // 5. Update internal balances / process withdrawals
    }

    /**
     * @dev The user's "escape hatch".
     * This will be implemented in Phase 2.
     */
    function forceWithdraw(bytes calldata signed_withdrawal_message) external {
        // Phase 2 Logic:
        // 1. Validate the user's signature.
        // 2. Calculate their share of funds.
        // 3. `usdc.transfer(msg.sender, amount);`
        // 4. `emit Withdraw(msg.sender, amount);`
    }
}
