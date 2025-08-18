// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {PixelCanvas} from "../src/PixelCanvas.sol";

contract InteractPixelCanvas is Script {
    // Contract address from local deployment
    address payable constant PIXEL_CANVAS_ADDRESS = payable(0x610178dA211FEF7D417bC0e6FeD39F05609AD788);
    
    function run() external {
        // Use Anvil default accounts
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        uint256 user1PrivateKey = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d;
        uint256 user2PrivateKey = 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a;
        
        PixelCanvas pixelCanvas = PixelCanvas(PIXEL_CANVAS_ADDRESS);
        
        console.log("=== PixelCanvas Interaction Test ===");
        console.log("Contract Address:", address(pixelCanvas));
        
        // Test pixel changes
        testPixelChanges(pixelCanvas, user1PrivateKey, user2PrivateKey);
        
        // Test snapshot
        testSnapshot(pixelCanvas, deployerPrivateKey);
        
        // Test NFT claiming
        testNFTClaiming(pixelCanvas, user1PrivateKey, user2PrivateKey);
        
        console.log("\n=== Interaction Test Complete ===");
        console.log("PixelCanvas contract is working properly!");
    }
    
    function testPixelChanges(PixelCanvas pixelCanvas, uint256 user1Key, uint256 user2Key) internal {
        console.log("\n=== Testing Pixel Changes ===");
        
        // User 1 changes pixels
        vm.startBroadcast(user1Key);
        pixelCanvas.changePixel{value: 0.001 ether}(0, 0, 1);
        pixelCanvas.changePixel{value: 0.001 ether}(1, 1, 2);
        pixelCanvas.changePixel{value: 0.001 ether}(2, 2, 3);
        vm.stopBroadcast();
        
        // User 2 changes pixels
        vm.startBroadcast(user2Key);
        pixelCanvas.changePixel{value: 0.001 ether}(3, 3, 4);
        pixelCanvas.changePixel{value: 0.001 ether}(4, 4, 5);
        vm.stopBroadcast();
        
        // Check state
        (uint256 cycle, uint256 changes, uint256 threshold, uint256 participants) = 
            pixelCanvas.getCurrentCycleInfo();
        console.log("Current Cycle:", cycle);
        console.log("Current Changes:", changes);
        console.log("Participants:", participants);
        
        console.log("Collected Fees:", pixelCanvas.collectedFees());
    }
    
    function testSnapshot(PixelCanvas pixelCanvas, uint256 deployerKey) internal {
        console.log("\n=== Testing Snapshot ===");
        
        // Trigger snapshot
        vm.startBroadcast(deployerKey);
        pixelCanvas.manualSnapshot();
        
        // Set IPFS hash
        string memory ipfsHash = "QmExampleHashForTesting123456789";
        pixelCanvas.setSnapshotIPFS(1, ipfsHash);
        vm.stopBroadcast();
        
        // Check snapshot
        PixelCanvas.Snapshot memory snapshot = pixelCanvas.getSnapshot(1);
        console.log("Snapshot 1 Exists:", snapshot.exists);
        console.log("Snapshot 1 Total Changes:", snapshot.totalChanges);
        console.log("Snapshot 1 Participants:", snapshot.participantCount);
    }
    
    function testNFTClaiming(PixelCanvas pixelCanvas, uint256 user1Key, uint256 user2Key) internal {
        console.log("\n=== Testing NFT Claiming ===");
        
        address user1Addr = vm.addr(user1Key);
        address user2Addr = vm.addr(user2Key);
        
        // Check claimable snapshots
        uint256[] memory claimable1 = pixelCanvas.getClaimableSnapshots(user1Addr);
        uint256[] memory claimable2 = pixelCanvas.getClaimableSnapshots(user2Addr);
        
        console.log("User 1 Claimable Count:", claimable1.length);
        console.log("User 2 Claimable Count:", claimable2.length);
        
        // User 1 claims NFT
        if (claimable1.length > 0) {
            vm.startBroadcast(user1Key);
            pixelCanvas.claimSnapshotNFT(claimable1[0]);
            vm.stopBroadcast();
            console.log("User 1 NFT Balance:", pixelCanvas.balanceOf(user1Addr));
        }
        
        // User 2 claims NFT
        if (claimable2.length > 0) {
            vm.startBroadcast(user2Key);
            pixelCanvas.claimSnapshotNFT(claimable2[0]);
            vm.stopBroadcast();
            console.log("User 2 NFT Balance:", pixelCanvas.balanceOf(user2Addr));
        }
    }
}
