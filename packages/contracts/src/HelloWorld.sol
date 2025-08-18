// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract HelloWorld {
    string private greeting;
    address public owner;
    
    event GreetingChanged(string newGreeting, address changedBy);
    
    constructor() {
        greeting = "Hello World";
        owner = msg.sender;
    }
    
    /**
     * @dev 获取当前的问候语
     * @return string 当前的问候语
     */
    function getHello() public view returns (string memory) {
        return greeting;
    }
    
    /**
     * @dev 设置新的问候语
     * @param _newGreeting 新的问候语
     */
    function setGreeting(string memory _newGreeting) public {
        string memory oldGreeting = greeting;
        greeting = _newGreeting;
        emit GreetingChanged(_newGreeting, msg.sender);
    }
    
    /**
     * @dev 获取合约所有者地址
     * @return address 所有者地址
     */
    function getOwner() public view returns (address) {
        return owner;
    }
    
    /**
     * @dev 重置问候语为默认值
     */
    function resetGreeting() public {
        greeting = "Hello World";
        emit GreetingChanged("Hello World", msg.sender);
    }
}
