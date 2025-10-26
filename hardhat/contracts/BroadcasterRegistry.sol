// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title BroadcasterRegistry
 * @notice On-chain registry for copy trading broadcasters
 * @dev Tracks broadcaster reputation, performance, and fee configuration
 */
contract BroadcasterRegistry is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    struct Broadcaster {
        bool isRegistered;
        bool isVerified;
        string name;
        uint256 feePercentage; // Fee in basis points (e.g., 1500 = 15%)
        uint256 followerCount;
        uint256 totalTrades;
        uint256 successfulTrades;
        int256 totalProfitLoss; // In PYUSD (6 decimals), can be negative
        uint256 registrationTime;
        uint256 lastTradeTime;
    }
    
    // Broadcaster address => Broadcaster data
    mapping(address => Broadcaster) public broadcasters;
    
    // Array of all registered broadcaster addresses
    address[] public broadcasterList;
    
    // User => Broadcaster => isFollowing
    mapping(address => mapping(address => bool)) public isFollowing;
    
    // Constants
    uint256 public constant MIN_FEE_BPS = 1000; // 10%
    uint256 public constant MAX_FEE_BPS = 2000; // 20%
    uint256 public constant BASIS_POINTS = 10000;
    
    // Events
    event BroadcasterRegistered(
        address indexed broadcaster,
        string name,
        uint256 feePercentage,
        uint256 timestamp
    );
    event BroadcasterVerified(address indexed broadcaster, uint256 timestamp);
    event BroadcasterUnverified(address indexed broadcaster, uint256 timestamp);
    event FeeUpdated(address indexed broadcaster, uint256 oldFee, uint256 newFee);
    event FollowerAdded(address indexed user, address indexed broadcaster, uint256 timestamp);
    event FollowerRemoved(address indexed user, address indexed broadcaster, uint256 timestamp);
    event TradeRecorded(
        address indexed broadcaster,
        bool success,
        int256 profitLoss,
        uint256 timestamp
    );
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    /**
     * @notice Register as a broadcaster
     * @param name Broadcaster display name
     * @param feePercentage Fee in basis points (1000-2000 = 10-20%)
     */
    function registerBroadcaster(string calldata name, uint256 feePercentage) external {
        require(!broadcasters[msg.sender].isRegistered, "Already registered");
        require(bytes(name).length > 0 && bytes(name).length <= 50, "Invalid name length");
        require(
            feePercentage >= MIN_FEE_BPS && feePercentage <= MAX_FEE_BPS,
            "Fee must be 10-20%"
        );
        
        broadcasters[msg.sender] = Broadcaster({
            isRegistered: true,
            isVerified: false,
            name: name,
            feePercentage: feePercentage,
            followerCount: 0,
            totalTrades: 0,
            successfulTrades: 0,
            totalProfitLoss: 0,
            registrationTime: block.timestamp,
            lastTradeTime: 0
        });
        
        broadcasterList.push(msg.sender);
        
        emit BroadcasterRegistered(msg.sender, name, feePercentage, block.timestamp);
    }
    
    /**
     * @notice Verify a broadcaster (admin only)
     * @param broadcaster Address to verify
     */
    function verifyBroadcaster(address broadcaster) external onlyRole(ADMIN_ROLE) {
        require(broadcasters[broadcaster].isRegistered, "Not registered");
        require(!broadcasters[broadcaster].isVerified, "Already verified");
        
        broadcasters[broadcaster].isVerified = true;
        emit BroadcasterVerified(broadcaster, block.timestamp);
    }
    
    /**
     * @notice Remove verification from a broadcaster (admin only)
     * @param broadcaster Address to unverify
     */
    function unverifyBroadcaster(address broadcaster) external onlyRole(ADMIN_ROLE) {
        require(broadcasters[broadcaster].isVerified, "Not verified");
        
        broadcasters[broadcaster].isVerified = false;
        emit BroadcasterUnverified(broadcaster, block.timestamp);
    }
    
    /**
     * @notice Update broadcaster fee
     * @param newFeePercentage New fee in basis points (1000-2000)
     */
    function updateFee(uint256 newFeePercentage) external {
        require(broadcasters[msg.sender].isRegistered, "Not registered");
        require(
            newFeePercentage >= MIN_FEE_BPS && newFeePercentage <= MAX_FEE_BPS,
            "Fee must be 10-20%"
        );
        
        uint256 oldFee = broadcasters[msg.sender].feePercentage;
        broadcasters[msg.sender].feePercentage = newFeePercentage;
        
        emit FeeUpdated(msg.sender, oldFee, newFeePercentage);
    }
    
    /**
     * @notice Follow a broadcaster
     * @param broadcaster Address to follow
     */
    function followBroadcaster(address broadcaster) external {
        require(broadcasters[broadcaster].isRegistered, "Broadcaster not registered");
        require(!isFollowing[msg.sender][broadcaster], "Already following");
        require(msg.sender != broadcaster, "Cannot follow yourself");
        
        isFollowing[msg.sender][broadcaster] = true;
        broadcasters[broadcaster].followerCount++;
        
        emit FollowerAdded(msg.sender, broadcaster, block.timestamp);
    }
    
    /**
     * @notice Unfollow a broadcaster
     * @param broadcaster Address to unfollow
     */
    function unfollowBroadcaster(address broadcaster) external {
        require(isFollowing[msg.sender][broadcaster], "Not following");
        
        isFollowing[msg.sender][broadcaster] = false;
        broadcasters[broadcaster].followerCount--;
        
        emit FollowerRemoved(msg.sender, broadcaster, block.timestamp);
    }
    
    /**
     * @notice Record a trade result (called by relayer/executor contract)
     * @param broadcaster Broadcaster who initiated the trade
     * @param success Whether the trade was profitable
     * @param profitLoss Profit or loss amount in PYUSD
     */
    function recordTrade(
        address broadcaster,
        bool success,
        int256 profitLoss
    ) external onlyRole(ADMIN_ROLE) {
        require(broadcasters[broadcaster].isRegistered, "Not registered");
        
        broadcasters[broadcaster].totalTrades++;
        if (success) {
            broadcasters[broadcaster].successfulTrades++;
        }
        broadcasters[broadcaster].totalProfitLoss += profitLoss;
        broadcasters[broadcaster].lastTradeTime = block.timestamp;
        
        emit TradeRecorded(broadcaster, success, profitLoss, block.timestamp);
    }
    
    /**
     * @notice Get broadcaster details
     * @param broadcaster Address to query
     * @return Broadcaster struct data
     */
    function getBroadcaster(address broadcaster) external view returns (Broadcaster memory) {
        return broadcasters[broadcaster];
    }
    
    /**
     * @notice Calculate win rate for a broadcaster
     * @param broadcaster Address to query
     * @return Win rate in basis points (e.g., 7500 = 75%)
     */
    function getWinRate(address broadcaster) external view returns (uint256) {
        uint256 totalTrades = broadcasters[broadcaster].totalTrades;
        if (totalTrades == 0) {
            return 0;
        }
        return (broadcasters[broadcaster].successfulTrades * BASIS_POINTS) / totalTrades;
    }
    
    /**
     * @notice Get total number of registered broadcasters
     * @return Count of broadcasters
     */
    function getBroadcasterCount() external view returns (uint256) {
        return broadcasterList.length;
    }
    
    /**
     * @notice Get list of all broadcasters (paginated)
     * @param offset Starting index
     * @param limit Number of results
     * @return Array of broadcaster addresses
     */
    function getBroadcasters(uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory)
    {
        require(offset < broadcasterList.length, "Offset out of bounds");
        
        uint256 end = offset + limit;
        if (end > broadcasterList.length) {
            end = broadcasterList.length;
        }
        
        address[] memory result = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = broadcasterList[i];
        }
        
        return result;
    }
    
    /**
     * @notice Get top broadcasters by follower count
     * @param count Number of top broadcasters to return
     * @return Array of top broadcaster addresses
     */
    function getTopBroadcasters(uint256 count) external view returns (address[] memory) {
        uint256 length = broadcasterList.length;
        if (count > length) {
            count = length;
        }
        
        // Simple selection (not fully sorted, but gets top performers)
        address[] memory top = new address[](count);
        uint256[] memory followers = new uint256[](count);
        
        for (uint256 i = 0; i < length; i++) {
            address broadcaster = broadcasterList[i];
            uint256 followerCount = broadcasters[broadcaster].followerCount;
            
            // Find position in top list
            for (uint256 j = 0; j < count; j++) {
                if (followerCount > followers[j]) {
                    // Shift down
                    for (uint256 k = count - 1; k > j; k--) {
                        top[k] = top[k - 1];
                        followers[k] = followers[k - 1];
                    }
                    // Insert
                    top[j] = broadcaster;
                    followers[j] = followerCount;
                    break;
                }
            }
        }
        
        return top;
    }
    
    /**
     * @notice Check if user is following broadcaster
     * @param user User address
     * @param broadcaster Broadcaster address
     * @return true if following
     */
    function checkFollowing(address user, address broadcaster) external view returns (bool) {
        return isFollowing[user][broadcaster];
    }
}
