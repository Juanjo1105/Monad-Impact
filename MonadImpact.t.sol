// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Run with Foundry after installing forge-std:
// forge install foundry-rs/forge-std --no-commit
// forge test
import "forge-std/Test.sol";
import "../contracts/MonadImpact.sol";

contract MonadImpactTest is Test {
    MonadImpact impact;
    address creator = address(0xA11CE);
    address donor = address(0xB0B);

    function setUp() public {
        impact = new MonadImpact();
        vm.deal(creator, 100 ether);
        vm.deal(donor, 100 ether);
    }

    function _create(uint256 goal, uint64 deadline) internal returns (uint256) {
        vm.prank(creator);
        return impact.createCampaign("Community garden", "A shared neighborhood garden.", goal, deadline);
    }

    function testCreateCampaign() public {
        uint256 id = _create(5 ether, uint64(block.timestamp + 1 days));
        (address payable c, string memory title, , uint256 goal, , uint64 deadline, bool withdrawn) = impact.getCampaign(id);
        assertEq(c, creator);
        assertEq(title, "Community garden");
        assertEq(goal, 5 ether);
        assertGt(deadline, block.timestamp);
        assertFalse(withdrawn);
    }

    function testRejectZeroGoal() public {
        vm.prank(creator);
        vm.expectRevert("Goal must be positive");
        impact.createCampaign("Title", "Description", 0, uint64(block.timestamp + 1 days));
    }

    function testDonateAndReachGoal() public {
        uint256 id = _create(2 ether, uint64(block.timestamp + 1 days));
        vm.prank(donor);
        impact.donate{value: 2 ether}(id);
        assertEq(impact.contributions(id, donor), 2 ether);
        (,,,, uint256 raised,,) = impact.getCampaign(id);
        assertEq(raised, 2 ether);
    }

    function testRejectDonationAboveRemainingGoal() public {
        uint256 id = _create(1 ether, uint64(block.timestamp + 1 days));
        vm.prank(donor);
        vm.expectRevert("Donation exceeds remaining goal");
        impact.donate{value: 2 ether}(id);
    }

    function testOnlyCreatorCanWithdrawAndOnlyOnce() public {
        uint256 id = _create(1 ether, uint64(block.timestamp + 1 days));
        vm.prank(donor);
        impact.donate{value: 1 ether}(id);

        vm.prank(donor);
        vm.expectRevert("Only creator");
        impact.withdraw(id);

        uint256 beforeBalance = creator.balance;
        vm.prank(creator);
        impact.withdraw(id);
        assertEq(creator.balance, beforeBalance + 1 ether);

        vm.prank(creator);
        vm.expectRevert("Already withdrawn");
        impact.withdraw(id);
    }

    function testRefundAfterFailedCampaign() public {
        uint256 id = _create(2 ether, uint64(block.timestamp + 1 days));
        vm.prank(donor);
        impact.donate{value: 1 ether}(id);

        vm.warp(block.timestamp + 1 days);
        uint256 beforeBalance = donor.balance;
        vm.prank(donor);
        impact.refund(id);
        assertEq(donor.balance, beforeBalance + 1 ether);
        assertEq(impact.contributions(id, donor), 0);
    }

    function testCannotRefundSuccessfulCampaign() public {
        uint256 id = _create(1 ether, uint64(block.timestamp + 1 days));
        vm.prank(donor);
        impact.donate{value: 1 ether}(id);
        vm.warp(block.timestamp + 1 days);
        vm.prank(donor);
        vm.expectRevert("Goal was reached");
        impact.refund(id);
    }

    function testCannotDonateAfterDeadline() public {
        uint256 id = _create(2 ether, uint64(block.timestamp + 1 days));
        vm.warp(block.timestamp + 1 days);
        vm.prank(donor);
        vm.expectRevert("Campaign ended");
        impact.donate{value: 1 ether}(id);
    }
}
