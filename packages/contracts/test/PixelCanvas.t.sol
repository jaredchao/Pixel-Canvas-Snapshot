// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {PixelCanvas} from "../src/PixelCanvas.sol";

contract PixelCanvasTest is Test {
    PixelCanvas public pixelCanvas;
    address public owner = address(0x1);
    address public artist1 = address(0x2);
    address public artist2 = address(0x3);
    address public artist3 = address(0x4);
    
    uint256 public constant PIXEL_FEE = 0.001 ether;
    uint8 public constant CANVAS_SIZE = 16;
    uint8 public constant MAX_COLOR = 7;
    uint256 public constant SNAPSHOT_THRESHOLD = 50;
    
    event PixelChanged(
        address indexed artist,
        uint8 x,
        uint8 y,
        uint8 color,
        uint256 timestamp,
        uint256 cycle
    );
    
    event SnapshotTaken(
        uint256 indexed snapshotId,
        string ipfsHash,
        uint256 timestamp,
        uint256 totalChanges,
        uint256 participantCount
    );
    
    event NFTClaimed(
        address indexed claimer,
        uint256 indexed tokenId,
        uint256 indexed snapshotId
    );
    
    function setUp() public {
        vm.prank(owner);
        pixelCanvas = new PixelCanvas(owner);
        
        // 给艺术家们一些ETH用于测试
        vm.deal(artist1, 10 ether);
        vm.deal(artist2, 10 ether);
        vm.deal(artist3, 10 ether);
    }
    
    // ================================
    // 基础功能测试
    // ================================
    
    function test_ContractInitialization() public view {
        assertEq(pixelCanvas.CANVAS_SIZE(), CANVAS_SIZE);
        assertEq(pixelCanvas.MAX_COLOR(), MAX_COLOR);
        assertEq(pixelCanvas.SNAPSHOT_THRESHOLD(), SNAPSHOT_THRESHOLD);
        assertEq(pixelCanvas.currentSnapshotCycle(), 1);
        assertEq(pixelCanvas.currentCycleChanges(), 0);
        assertEq(pixelCanvas.pixelChangeFee(), PIXEL_FEE);
        assertEq(pixelCanvas.owner(), owner);
    }
    
    function test_ChangePixelSuccess() public {
        // 预期事件
        vm.expectEmit(true, true, true, true);
        emit PixelChanged(artist1, 5, 5, 3, block.timestamp, 1);
        
        // 改变像素
        vm.prank(artist1);
        pixelCanvas.changePixel{value: PIXEL_FEE}(5, 5, 3);
        
        // 检查状态
        assertEq(pixelCanvas.currentCycleChanges(), 1);
        assertEq(pixelCanvas.collectedFees(), PIXEL_FEE);
        
        // 检查用户参与信息
        (uint256 changeCount, bool hasParticipated) = pixelCanvas.getCurrentUserParticipation(artist1);
        assertEq(changeCount, 1);
        assertTrue(hasParticipated);
        
        // 检查画布状态
        PixelCanvas.PixelChange[] memory changes = pixelCanvas.getCurrentCanvasState();
        assertEq(changes.length, 1);
        assertEq(changes[0].artist, artist1);
        assertEq(changes[0].x, 5);
        assertEq(changes[0].y, 5);
        assertEq(changes[0].color, 3);
    }
    
    function test_ChangePixelInvalidCoordinates() public {
        // 测试x坐标越界
        vm.prank(artist1);
        vm.expectRevert("X coordinate out of bounds");
        pixelCanvas.changePixel{value: PIXEL_FEE}(16, 5, 3);
        
        // 测试y坐标越界
        vm.prank(artist1);
        vm.expectRevert("Y coordinate out of bounds");
        pixelCanvas.changePixel{value: PIXEL_FEE}(5, 16, 3);
    }
    
    function test_ChangePixelInvalidColor() public {
        vm.prank(artist1);
        vm.expectRevert("Invalid color");
        pixelCanvas.changePixel{value: PIXEL_FEE}(5, 5, 8);
    }
    
    function test_ChangePixelInsufficientFee() public {
        vm.prank(artist1);
        vm.expectRevert("Insufficient fee");
        pixelCanvas.changePixel{value: PIXEL_FEE - 1}(5, 5, 3);
    }
    
    function test_MultiplePixelChanges() public {
        // 艺术家1改变多个像素
        vm.startPrank(artist1);
        pixelCanvas.changePixel{value: PIXEL_FEE}(0, 0, 1);
        pixelCanvas.changePixel{value: PIXEL_FEE}(1, 1, 2);
        pixelCanvas.changePixel{value: PIXEL_FEE}(2, 2, 3);
        vm.stopPrank();
        
        // 艺术家2改变像素
        vm.prank(artist2);
        pixelCanvas.changePixel{value: PIXEL_FEE}(3, 3, 4);
        
        // 检查状态
        assertEq(pixelCanvas.currentCycleChanges(), 4);
        assertEq(pixelCanvas.collectedFees(), PIXEL_FEE * 4);
        
        // 检查参与者信息
        (uint256 changeCount1, bool hasParticipated1) = pixelCanvas.getCurrentUserParticipation(artist1);
        assertEq(changeCount1, 3);
        assertTrue(hasParticipated1);
        
        (uint256 changeCount2, bool hasParticipated2) = pixelCanvas.getCurrentUserParticipation(artist2);
        assertEq(changeCount2, 1);
        assertTrue(hasParticipated2);
        
        // 检查当前周期信息
        (uint256 cycle, uint256 changes, uint256 threshold, uint256 participants) = 
            pixelCanvas.getCurrentCycleInfo();
        assertEq(cycle, 1);
        assertEq(changes, 4);
        assertEq(threshold, SNAPSHOT_THRESHOLD);
        assertEq(participants, 2);
    }
    
    // ================================
    // 快照机制测试
    // ================================
    
    function test_AutoSnapshotTrigger() public {
        // 创建足够的像素更改以触发快照
        vm.startPrank(artist1);
        for (uint8 i = 0; i < SNAPSHOT_THRESHOLD; i++) {
            uint8 x = i % CANVAS_SIZE;
            uint8 y = (i / CANVAS_SIZE) % CANVAS_SIZE;
            pixelCanvas.changePixel{value: PIXEL_FEE}(x, y, i % (MAX_COLOR + 1));
        }
        vm.stopPrank();
        
        // 检查快照是否被触发
        assertEq(pixelCanvas.currentSnapshotCycle(), 2); // 应该已经开始第2个周期
        assertEq(pixelCanvas.currentCycleChanges(), 0); // 新周期应该重置为0
        
        // 检查快照信息
        PixelCanvas.Snapshot memory snapshot = pixelCanvas.getSnapshot(1);
        assertTrue(snapshot.exists);
        assertEq(snapshot.id, 1);
        assertEq(snapshot.totalChanges, SNAPSHOT_THRESHOLD);
        assertEq(snapshot.participantCount, 1);
    }
    
    function test_ManualSnapshot() public {
        // 添加一些像素更改（但不足以自动触发）
        vm.prank(artist1);
        pixelCanvas.changePixel{value: PIXEL_FEE}(5, 5, 3);
        
        // 只有所有者可以手动触发快照
        vm.prank(artist1);
        vm.expectRevert();
        pixelCanvas.manualSnapshot();
        
        // 所有者手动触发快照
        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit SnapshotTaken(1, "", block.timestamp, 1, 1);
        pixelCanvas.manualSnapshot();
        
        // 检查状态
        assertEq(pixelCanvas.currentSnapshotCycle(), 2);
        assertEq(pixelCanvas.currentCycleChanges(), 0);
    }
    
    function test_ManualSnapshotNoChanges() public {
        // 没有更改时不能触发快照
        vm.prank(owner);
        vm.expectRevert("No changes to snapshot");
        pixelCanvas.manualSnapshot();
    }
    
    function test_SetSnapshotIPFS() public {
        // 先创建一个快照
        vm.prank(artist1);
        pixelCanvas.changePixel{value: PIXEL_FEE}(5, 5, 3);
        
        vm.prank(owner);
        pixelCanvas.manualSnapshot();
        
        // 设置IPFS哈希
        string memory ipfsHash = "QmTestHash123";
        vm.prank(owner);
        pixelCanvas.setSnapshotIPFS(1, ipfsHash);
        
        // 检查IPFS哈希是否设置
        PixelCanvas.Snapshot memory snapshot = pixelCanvas.getSnapshot(1);
        assertEq(snapshot.ipfsHash, ipfsHash);
        
        // 非所有者无法设置
        vm.prank(artist1);
        vm.expectRevert();
        pixelCanvas.setSnapshotIPFS(1, "AnotherHash");
        
        // 空哈希应该失败
        vm.prank(owner);
        vm.expectRevert("Empty IPFS hash");
        pixelCanvas.setSnapshotIPFS(1, "");
    }
    
    // ================================
    // NFT功能测试
    // ================================
    
    function test_ClaimSnapshotNFT() public {
        // 创建快照
        vm.prank(artist1);
        pixelCanvas.changePixel{value: PIXEL_FEE}(5, 5, 3);
        
        vm.prank(owner);
        pixelCanvas.manualSnapshot();
        
        // 设置IPFS哈希
        string memory ipfsHash = "QmTestHash123";
        vm.prank(owner);
        pixelCanvas.setSnapshotIPFS(1, ipfsHash);
        
        // 艺术家1认领NFT
        vm.prank(artist1);
        vm.expectEmit(true, true, true, true);
        emit NFTClaimed(artist1, 1, 1);
        pixelCanvas.claimSnapshotNFT(1);
        
        // 检查NFT所有权
        assertEq(pixelCanvas.ownerOf(1), artist1);
        assertEq(pixelCanvas.balanceOf(artist1), 1);
        
        // 检查token URI
        string memory expectedURI = string(abi.encodePacked("ipfs://", ipfsHash));
        assertEq(pixelCanvas.tokenURI(1), expectedURI);
        
        // 不能重复认领
        vm.prank(artist1);
        vm.expectRevert("NFT already claimed");
        pixelCanvas.claimSnapshotNFT(1);
    }
    
    function test_ClaimSnapshotNFTNotParticipated() public {
        // 创建快照（只有artist1参与）
        vm.prank(artist1);
        pixelCanvas.changePixel{value: PIXEL_FEE}(5, 5, 3);
        
        vm.prank(owner);
        pixelCanvas.manualSnapshot();
        
        string memory ipfsHash = "QmTestHash123";
        vm.prank(owner);
        pixelCanvas.setSnapshotIPFS(1, ipfsHash);
        
        // artist2没有参与，不能认领
        vm.prank(artist2);
        vm.expectRevert("Did not participate in this snapshot");
        pixelCanvas.claimSnapshotNFT(1);
    }
    
    function test_ClaimSnapshotNFTNotReady() public {
        // 创建快照但不设置IPFS哈希
        vm.prank(artist1);
        pixelCanvas.changePixel{value: PIXEL_FEE}(5, 5, 3);
        
        vm.prank(owner);
        pixelCanvas.manualSnapshot();
        
        // 尝试认领应该失败
        vm.prank(artist1);
        vm.expectRevert("Snapshot metadata not ready");
        pixelCanvas.claimSnapshotNFT(1);
    }
    
    function test_ClaimMultipleNFTs() public {
        // 创建第一个快照
        vm.prank(artist1);
        pixelCanvas.changePixel{value: PIXEL_FEE}(5, 5, 3);
        
        vm.prank(owner);
        pixelCanvas.manualSnapshot();
        
        vm.prank(owner);
        pixelCanvas.setSnapshotIPFS(1, "QmHash1");
        
        // 创建第二个快照
        vm.prank(artist1);
        pixelCanvas.changePixel{value: PIXEL_FEE}(6, 6, 4);
        
        vm.prank(owner);
        pixelCanvas.manualSnapshot();
        
        vm.prank(owner);
        pixelCanvas.setSnapshotIPFS(2, "QmHash2");
        
        // 批量认领
        uint256[] memory snapshotIds = new uint256[](2);
        snapshotIds[0] = 1;
        snapshotIds[1] = 2;
        
        vm.prank(artist1);
        pixelCanvas.claimMultipleNFTs(snapshotIds);
        
        // 检查NFT所有权
        assertEq(pixelCanvas.balanceOf(artist1), 2);
        assertEq(pixelCanvas.ownerOf(1), artist1);
        assertEq(pixelCanvas.ownerOf(2), artist1);
    }
    
    function test_GetClaimableSnapshots() public {
        // 创建两个快照，artist1参与两个，artist2只参与第二个
        vm.prank(artist1);
        pixelCanvas.changePixel{value: PIXEL_FEE}(5, 5, 3);
        
        vm.prank(owner);
        pixelCanvas.manualSnapshot();
        
        vm.prank(owner);
        pixelCanvas.setSnapshotIPFS(1, "QmHash1");
        
        // 第二个快照
        vm.prank(artist1);
        pixelCanvas.changePixel{value: PIXEL_FEE}(6, 6, 4);
        
        vm.prank(artist2);
        pixelCanvas.changePixel{value: PIXEL_FEE}(7, 7, 5);
        
        vm.prank(owner);
        pixelCanvas.manualSnapshot();
        
        vm.prank(owner);
        pixelCanvas.setSnapshotIPFS(2, "QmHash2");
        
        // artist1可以认领两个快照
        uint256[] memory claimable1 = pixelCanvas.getClaimableSnapshots(artist1);
        assertEq(claimable1.length, 2);
        assertEq(claimable1[0], 1);
        assertEq(claimable1[1], 2);
        
        // artist2只能认领第二个快照
        uint256[] memory claimable2 = pixelCanvas.getClaimableSnapshots(artist2);
        assertEq(claimable2.length, 1);
        assertEq(claimable2[0], 2);
        
        // artist1认领第一个快照后
        vm.prank(artist1);
        pixelCanvas.claimSnapshotNFT(1);
        
        // 可认领列表应该更新
        uint256[] memory claimable1After = pixelCanvas.getClaimableSnapshots(artist1);
        assertEq(claimable1After.length, 1);
        assertEq(claimable1After[0], 2);
    }
    
    // ================================
    // 管理功能测试
    // ================================
    
    function test_SetPixelChangeFee() public {
        uint256 newFee = 0.002 ether;
        
        // 非所有者无法设置
        vm.prank(artist1);
        vm.expectRevert();
        pixelCanvas.setPixelChangeFee(newFee);
        
        // 所有者可以设置
        vm.prank(owner);
        pixelCanvas.setPixelChangeFee(newFee);
        
        assertEq(pixelCanvas.pixelChangeFee(), newFee);
    }
    
    function test_WithdrawFees() public {
        // 先收集一些费用
        vm.prank(artist1);
        pixelCanvas.changePixel{value: PIXEL_FEE}(5, 5, 3);
        
        vm.prank(artist2);
        pixelCanvas.changePixel{value: PIXEL_FEE}(6, 6, 4);
        
        uint256 totalFees = PIXEL_FEE * 2;
        assertEq(pixelCanvas.collectedFees(), totalFees);
        
        address recipient = address(0x999);
        uint256 initialBalance = recipient.balance;
        
        // 非所有者无法提取
        vm.prank(artist1);
        vm.expectRevert();
        pixelCanvas.withdrawFees(payable(recipient));
        
        // 所有者可以提取
        vm.prank(owner);
        pixelCanvas.withdrawFees(payable(recipient));
        
        assertEq(recipient.balance, initialBalance + totalFees);
        assertEq(pixelCanvas.collectedFees(), 0);
    }
    
    function test_WithdrawFeesInvalidAddress() public {
        vm.prank(artist1);
        pixelCanvas.changePixel{value: PIXEL_FEE}(5, 5, 3);
        
        vm.prank(owner);
        vm.expectRevert("Invalid address");
        pixelCanvas.withdrawFees(payable(address(0)));
    }
    
    function test_WithdrawFeesNoFees() public {
        vm.prank(owner);
        vm.expectRevert("No fees to withdraw");
        pixelCanvas.withdrawFees(payable(address(0x999)));
    }
    
    // ================================
    // Gas费用测试
    // ================================
    
    function test_PixelChangeGasCost() public {
        uint256 gasBefore = gasleft();
        
        vm.prank(artist1);
        pixelCanvas.changePixel{value: PIXEL_FEE}(5, 5, 3);
        
        uint256 gasUsed = gasBefore - gasleft();
        console.log("Gas used for pixel change:", gasUsed);
        
        // 确保Gas费用在合理范围内（应该小于250,000）
        assertLt(gasUsed, 250000);
    }
    
    function test_SnapshotGasCost() public {
        // 添加一些像素更改
        vm.startPrank(artist1);
        for (uint8 i = 0; i < 10; i++) {
            pixelCanvas.changePixel{value: PIXEL_FEE}(i, 0, i % (MAX_COLOR + 1));
        }
        vm.stopPrank();
        
        uint256 gasBefore = gasleft();
        
        vm.prank(owner);
        pixelCanvas.manualSnapshot();
        
        uint256 gasUsed = gasBefore - gasleft();
        console.log("Gas used for snapshot:", gasUsed);
        
        // 快照Gas费用检查
        assertLt(gasUsed, 200000);
    }
    
    // ================================
    // 边界条件测试
    // ================================
    
    function test_MaxCoordinates() public {
        // 测试最大有效坐标
        vm.prank(artist1);
        pixelCanvas.changePixel{value: PIXEL_FEE}(CANVAS_SIZE - 1, CANVAS_SIZE - 1, MAX_COLOR);
        
        assertEq(pixelCanvas.currentCycleChanges(), 1);
    }
    
    function test_ReceiveAndFallback() public {
        uint256 sendAmount = 1 ether;
        
        // 测试receive函数
        (bool success,) = address(pixelCanvas).call{value: sendAmount}("");
        assertTrue(success);
        assertEq(pixelCanvas.collectedFees(), sendAmount);
        
        // 测试fallback函数
        (bool success2,) = address(pixelCanvas).call{value: sendAmount}("randomData");
        assertTrue(success2);
        assertEq(pixelCanvas.collectedFees(), sendAmount * 2);
    }
    
    function test_ERC721Functionality() public {
        // 创建快照并设置IPFS
        vm.prank(artist1);
        pixelCanvas.changePixel{value: PIXEL_FEE}(5, 5, 3);
        
        vm.prank(owner);
        pixelCanvas.manualSnapshot();
        
        vm.prank(owner);
        pixelCanvas.setSnapshotIPFS(1, "QmTestHash");
        
        // 认领NFT
        vm.prank(artist1);
        pixelCanvas.claimSnapshotNFT(1);
        
        // 测试ERC721基本功能
        assertEq(pixelCanvas.name(), "PixelCanvas Snapshot");
        assertEq(pixelCanvas.symbol(), "PCS");
        assertEq(pixelCanvas.ownerOf(1), artist1);
        assertEq(pixelCanvas.balanceOf(artist1), 1);
        
        // 测试转移
        vm.prank(artist1);
        pixelCanvas.transferFrom(artist1, artist2, 1);
        
        assertEq(pixelCanvas.ownerOf(1), artist2);
        assertEq(pixelCanvas.balanceOf(artist1), 0);
        assertEq(pixelCanvas.balanceOf(artist2), 1);
    }
}
