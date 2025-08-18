// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin-contracts-5.0.0/token/ERC721/ERC721.sol";
import "@openzeppelin-contracts-5.0.0/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin-contracts-5.0.0/access/Ownable.sol";
import "@openzeppelin-contracts-5.0.0/utils/ReentrancyGuard.sol";

/**
 * @title PixelCanvas
 * @dev 一个去中心化的协作像素艺术平台，支持定期快照和NFT奖励
 * @author PixelCanvas Team
 */
contract PixelCanvas is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    
    // ================================
    // 常量和配置
    // ================================
    
    /// @dev 画布尺寸 (16x16)
    uint8 public constant CANVAS_SIZE = 16;
    
    /// @dev 最大颜色数量 (8色调色板: 0-7)
    uint8 public constant MAX_COLOR = 7;
    
    /// @dev 触发快照的更改次数阈值
    uint256 public constant SNAPSHOT_THRESHOLD = 10;
    
    /// @dev 像素更改的基础费用 (wei)
    uint256 public pixelChangeFee = 0.001 ether;
    
    // ================================
    // 结构体定义
    // ================================
    
    /// @dev 像素更改记录
    struct PixelChange {
        address artist;      // 艺术家地址
        uint8 x;            // X坐标
        uint8 y;            // Y坐标  
        uint8 color;        // 颜色值 (0-7)
        uint256 timestamp;  // 时间戳
    }
    
    /// @dev 快照信息
    struct Snapshot {
        uint256 id;                    // 快照ID
        uint256 timestamp;             // 快照时间戳
        string ipfsHash;               // IPFS元数据哈希
        uint256 totalChanges;          // 总更改次数
        uint256 participantCount;      // 参与者数量
        bool exists;                   // 是否存在
    }
    
    /// @dev 用户在当前周期的参与信息
    struct UserParticipation {
        uint256 changeCount;    // 更改次数
        bool hasParticipated;   // 是否参与过
    }
    
    // ================================
    // 状态变量
    // ================================
    
    /// @dev 当前快照周期ID
    uint256 public currentSnapshotCycle = 1;
    
    /// @dev 当前周期的总更改次数
    uint256 public currentCycleChanges = 0;
    
    /// @dev 下一个NFT token ID
    uint256 private _nextTokenId = 1;
    
    /// @dev 像素更改历史 (按周期存储)
    mapping(uint256 => PixelChange[]) public cycleChanges;
    
    /// @dev 快照信息存储
    mapping(uint256 => Snapshot) public snapshots;
    
    /// @dev 用户在各周期的参与情况
    mapping(uint256 => mapping(address => UserParticipation)) public userParticipation;
    
    /// @dev 用户在各周期是否已认领NFT
    mapping(uint256 => mapping(address => bool)) public hasClaimedNFT;
    
    /// @dev 周期参与者列表
    mapping(uint256 => address[]) public cycleParticipants;
    
    /// @dev 收集的费用总额
    uint256 public collectedFees = 0;
    
    // ================================
    // 事件定义
    // ================================
    
    /// @dev 像素更改事件
    event PixelChanged(
        address indexed artist,
        uint8 x,
        uint8 y,
        uint8 color,
        uint256 timestamp,
        uint256 cycle
    );
    
    /// @dev 快照生成事件
    event SnapshotTaken(
        uint256 indexed snapshotId,
        string ipfsHash,
        uint256 timestamp,
        uint256 totalChanges,
        uint256 participantCount
    );
    
    /// @dev NFT认领事件
    event NFTClaimed(
        address indexed claimer,
        uint256 indexed tokenId,
        uint256 indexed snapshotId
    );
    
    /// @dev 画布重置事件
    event CanvasReset(uint256 indexed newCycle, uint256 timestamp);
    
    // ================================
    // 修饰符
    // ================================
    
    /// @dev 验证坐标有效性
    modifier validCoordinates(uint8 x, uint8 y) {
        require(x < CANVAS_SIZE, "X coordinate out of bounds");
        require(y < CANVAS_SIZE, "Y coordinate out of bounds");
        _;
    }
    
    /// @dev 验证颜色有效性
    modifier validColor(uint8 color) {
        require(color <= MAX_COLOR, "Invalid color");
        _;
    }
    
    // ================================
    // 构造函数
    // ================================
    
    constructor(address initialOwner) 
        ERC721("PixelCanvas Snapshot", "PCS") 
        Ownable(initialOwner)
    {
        // 初始化第一个周期
        // 不需要额外的初始化
    }
    
    // ================================
    // 核心功能：像素更改
    // ================================
    
    /**
     * @dev 更改画布上的一个像素
     * @param x X坐标 (0-15)
     * @param y Y坐标 (0-15)  
     * @param color 颜色值 (0-7)
     */
    function changePixel(uint8 x, uint8 y, uint8 color) 
        external 
        payable 
        validCoordinates(x, y)
        validColor(color)
        nonReentrant
    {
        require(msg.value >= pixelChangeFee, "Insufficient fee");
        
        // 创建像素更改记录
        PixelChange memory newChange = PixelChange({
            artist: msg.sender,
            x: x,
            y: y,
            color: color,
            timestamp: block.timestamp
        });
        
        // 存储更改记录
        cycleChanges[currentSnapshotCycle].push(newChange);
        
        // 更新用户参与信息
        UserParticipation storage userInfo = userParticipation[currentSnapshotCycle][msg.sender];
        if (!userInfo.hasParticipated) {
            userInfo.hasParticipated = true;
            cycleParticipants[currentSnapshotCycle].push(msg.sender);
        }
        userInfo.changeCount++;
        
        // 更新周期统计
        currentCycleChanges++;
        collectedFees += msg.value;
        
        // 发出事件
        emit PixelChanged(msg.sender, x, y, color, block.timestamp, currentSnapshotCycle);
        
        // 检查是否需要触发快照
        if (currentCycleChanges >= SNAPSHOT_THRESHOLD) {
            _triggerSnapshot();
        }
    }
    
    // ================================
    // 快照机制
    // ================================
    
    /**
     * @dev 触发快照生成
     * @dev 内部函数，由像素更改或管理员调用
     */
    function _triggerSnapshot() internal {
        uint256 snapshotId = currentSnapshotCycle;
        uint256 participantCount = cycleParticipants[currentSnapshotCycle].length;
        
        // 创建快照记录（IPFS哈希稍后设置）
        snapshots[snapshotId] = Snapshot({
            id: snapshotId,
            timestamp: block.timestamp,
            ipfsHash: "", // 将由链下服务设置
            totalChanges: currentCycleChanges,
            participantCount: participantCount,
            exists: true
        });
        
        // 发出快照事件
        emit SnapshotTaken(
            snapshotId,
            "", // IPFS哈希稍后设置
            block.timestamp,
            currentCycleChanges,
            participantCount
        );
        
        // 重置画布，开始新周期
        _resetCanvas();
    }
    
    /**
     * @dev 重置画布，开始新的创作周期
     */
    function _resetCanvas() internal {
        currentSnapshotCycle++;
        currentCycleChanges = 0;
        
        emit CanvasReset(currentSnapshotCycle, block.timestamp);
    }
    
    /**
     * @dev 管理员手动触发快照
     * @dev 用于演示或紧急情况
     */
    function manualSnapshot() external onlyOwner {
        require(currentCycleChanges > 0, "No changes to snapshot");
        _triggerSnapshot();
    }
    
    /**
     * @dev 设置快照的IPFS哈希
     * @param snapshotId 快照ID
     * @param ipfsHash IPFS元数据哈希
     */
    function setSnapshotIPFS(uint256 snapshotId, string calldata ipfsHash) 
        external 
        onlyOwner 
    {
        require(snapshots[snapshotId].exists, "Snapshot does not exist");
        require(bytes(ipfsHash).length > 0, "Empty IPFS hash");
        
        snapshots[snapshotId].ipfsHash = ipfsHash;
    }
    
    // ================================
    // NFT功能
    // ================================
    
    /**
     * @dev 认领指定快照的NFT
     * @param snapshotId 快照ID
     */
    function claimSnapshotNFT(uint256 snapshotId) external nonReentrant {
        require(snapshots[snapshotId].exists, "Snapshot does not exist");
        require(bytes(snapshots[snapshotId].ipfsHash).length > 0, "Snapshot metadata not ready");
        require(userParticipation[snapshotId][msg.sender].hasParticipated, "Did not participate in this snapshot");
        require(!hasClaimedNFT[snapshotId][msg.sender], "NFT already claimed");
        
        // 标记为已认领
        hasClaimedNFT[snapshotId][msg.sender] = true;
        
        // 铸造NFT
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, string(abi.encodePacked("ipfs://", snapshots[snapshotId].ipfsHash)));
        
        emit NFTClaimed(msg.sender, tokenId, snapshotId);
    }
    
    /**
     * @dev 批量认领多个快照的NFT
     * @param snapshotIds 快照ID数组
     */
    function claimMultipleNFTs(uint256[] calldata snapshotIds) external nonReentrant {
        require(snapshotIds.length > 0, "Empty snapshot list");
        require(snapshotIds.length <= 10, "Too many snapshots"); // 限制批量数量
        
        for (uint256 i = 0; i < snapshotIds.length; i++) {
            uint256 snapshotId = snapshotIds[i];
            
            // 检查认领条件
            if (snapshots[snapshotId].exists && 
                bytes(snapshots[snapshotId].ipfsHash).length > 0 &&
                userParticipation[snapshotId][msg.sender].hasParticipated &&
                !hasClaimedNFT[snapshotId][msg.sender]) {
                
                // 标记为已认领
                hasClaimedNFT[snapshotId][msg.sender] = true;
                
                // 铸造NFT
                uint256 tokenId = _nextTokenId++;
                _safeMint(msg.sender, tokenId);
                _setTokenURI(tokenId, string(abi.encodePacked("ipfs://", snapshots[snapshotId].ipfsHash)));
                
                emit NFTClaimed(msg.sender, tokenId, snapshotId);
            }
        }
    }
    
    // ================================
    // 查询功能
    // ================================
    
    /**
     * @dev 获取当前画布状态
     * @return 当前周期的所有像素更改
     */
    function getCurrentCanvasState() external view returns (PixelChange[] memory) {
        return cycleChanges[currentSnapshotCycle];
    }
    
    /**
     * @dev 获取指定周期的画布状态
     * @param cycle 周期ID
     * @return 指定周期的所有像素更改
     */
    function getCanvasState(uint256 cycle) external view returns (PixelChange[] memory) {
        return cycleChanges[cycle];
    }
    
    /**
     * @dev 获取用户在当前周期的参与信息
     * @param user 用户地址
     * @return changeCount 更改次数
     * @return hasParticipated 是否参与过
     */
    function getCurrentUserParticipation(address user) 
        external 
        view 
        returns (uint256 changeCount, bool hasParticipated) 
    {
        UserParticipation memory info = userParticipation[currentSnapshotCycle][user];
        return (info.changeCount, info.hasParticipated);
    }
    
    /**
     * @dev 获取用户可认领的快照列表
     * @param user 用户地址
     * @return claimableSnapshots 可认领的快照ID列表
     */
    function getClaimableSnapshots(address user) external view returns (uint256[] memory) {
        uint256[] memory temp = new uint256[](currentSnapshotCycle);
        uint256 count = 0;
        
        for (uint256 i = 1; i < currentSnapshotCycle; i++) {
            if (snapshots[i].exists && 
                bytes(snapshots[i].ipfsHash).length > 0 &&
                userParticipation[i][user].hasParticipated &&
                !hasClaimedNFT[i][user]) {
                temp[count] = i;
                count++;
            }
        }
        
        // 创建正确大小的数组
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = temp[i];
        }
        
        return result;
    }
    
    /**
     * @dev 获取当前周期信息
     * @return cycle 当前周期ID
     * @return changes 当前更改次数
     * @return threshold 快照阈值
     * @return participants 参与者数量
     */
    function getCurrentCycleInfo() 
        external 
        view 
        returns (uint256 cycle, uint256 changes, uint256 threshold, uint256 participants) 
    {
        return (
            currentSnapshotCycle,
            currentCycleChanges,
            SNAPSHOT_THRESHOLD,
            cycleParticipants[currentSnapshotCycle].length
        );
    }
    
    /**
     * @dev 获取快照信息
     * @param snapshotId 快照ID
     * @return snapshot 快照详细信息
     */
    function getSnapshot(uint256 snapshotId) external view returns (Snapshot memory) {
        require(snapshots[snapshotId].exists, "Snapshot does not exist");
        return snapshots[snapshotId];
    }
    
    // ================================
    // 管理功能
    // ================================
    
    /**
     * @dev 设置像素更改费用
     * @param newFee 新的费用金额
     */
    function setPixelChangeFee(uint256 newFee) external onlyOwner {
        pixelChangeFee = newFee;
    }
    
    /**
     * @dev 提取合约中的费用
     * @param to 接收地址
     */
    function withdrawFees(address payable to) external onlyOwner {
        require(to != address(0), "Invalid address");
        require(collectedFees > 0, "No fees to withdraw");
        
        uint256 amount = collectedFees;
        collectedFees = 0;
        
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");
    }
    
    /**
     * @dev 紧急暂停功能预留
     * @dev 可以在此添加Pausable功能
     */
    
    // ================================
    // ERC721 重写函数
    // ================================
    
    function tokenURI(uint256 tokenId) 
        public 
        view 
        override(ERC721, ERC721URIStorage) 
        returns (string memory) 
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(ERC721, ERC721URIStorage) 
        returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }
    
    // ================================
    // 接收ETH功能
    // ================================
    
    receive() external payable {
        collectedFees += msg.value;
    }
    
    fallback() external payable {
        collectedFees += msg.value;
    }
}
