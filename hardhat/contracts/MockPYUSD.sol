// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockPYUSD
 * @notice Mock implementation of PayPal USD (PYUSD) for Arcology testnet
 * @dev This is a test token that mimics the real PYUSD interface
 *      Real PYUSD: 0x6c3ea9036406852006290770bedfcaba0e23a0e8 (Ethereum)
 *      This mock version is for development and demonstration on Arcology Network
 */
contract MockPYUSD is ERC20, Ownable {
    uint8 private constant _decimals = 6; // Same as real PYUSD

    event Minted(address indexed to, uint256 amount);
    event Burned(address indexed from, uint256 amount);

    constructor() ERC20("PayPal USD", "PYUSD") Ownable() {
        // Mint initial supply for testing (10 million PYUSD)
        _mint(msg.sender, 10_000_000 * 10**_decimals);
    }

    /**
     * @notice Returns the number of decimals (6, matching real PYUSD)
     */
    function decimals() public pure override returns (uint8) {
        return _decimals;
    }

    /**
     * @notice Mint new PYUSD tokens
     * @dev In production, only Paxos can mint real PYUSD
     *      This is for testing purposes only
     * @param to Address to receive the tokens
     * @param amount Amount to mint (in base units, e.g., 100 PYUSD = 100000000)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
        emit Minted(to, amount);
    }

    /**
     * @notice Burn PYUSD tokens
     * @param from Address to burn from
     * @param amount Amount to burn
     */
    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
        emit Burned(from, amount);
    }

    /**
     * @notice Allow user to burn their own tokens
     * @param amount Amount to burn
     */
    function burnSelf(uint256 amount) external {
        _burn(msg.sender, amount);
        emit Burned(msg.sender, amount);
    }
}
