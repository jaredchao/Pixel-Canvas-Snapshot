// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {PixelCanvas} from "../src/PixelCanvas.sol";

contract DeployPixelCanvas is Script {
    function run() external {
        // 获取部署者地址
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying PixelCanvas contract...");
        console.log("Deployer address:", deployer);
        console.log("Deployer balance:", deployer.balance);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 部署PixelCanvas合约
        PixelCanvas pixelCanvas = new PixelCanvas(deployer);
        
        vm.stopBroadcast();
        
        // 记录部署信息
        console.log("PixelCanvas deployed at:", address(pixelCanvas));
        console.log("Owner:", pixelCanvas.owner());
        console.log("Canvas size:", pixelCanvas.CANVAS_SIZE());
        console.log("Max color:", pixelCanvas.MAX_COLOR());
        console.log("Snapshot threshold:", pixelCanvas.SNAPSHOT_THRESHOLD());
        console.log("Pixel change fee:", pixelCanvas.pixelChangeFee());
        
        string memory deploymentInfo = string(abi.encodePacked(
            "PixelCanvas deployed successfully!\n",
            "Contract address: ", 
            vm.toString(address(pixelCanvas)),
            "\nOwner: ",
            vm.toString(deployer),
            "\nCanvas: 16x16 with 8 colors\n",
            "Snapshot triggers at 50 pixel changes\n",
            "Pixel change fee: 0.001 ETH"
        ));
        
        console.log(deploymentInfo);
        
        // 验证合约基本功能
        console.log("\n=== Contract Verification ===");
        console.log("Current snapshot cycle:", pixelCanvas.currentSnapshotCycle());
        console.log("Current cycle changes:", pixelCanvas.currentCycleChanges());
        console.log("Contract name:", pixelCanvas.name());
        console.log("Contract symbol:", pixelCanvas.symbol());
        
        (uint256 cycle, uint256 changes, uint256 threshold, uint256 participants) = 
            pixelCanvas.getCurrentCycleInfo();
        console.log("Cycle info - Cycle:", cycle);
        console.log("Changes:", changes);
        console.log("Threshold:", threshold);
        console.log("Participants:", participants);
    }
}
