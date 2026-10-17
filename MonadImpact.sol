// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MonadImpact
/// @notice Transparent, goal-based crowdfunding with native MON contributions.
/// @dev Educational hackathon MVP. Audit before any production use.
contract MonadImpact {
    uint256 public campaignCount;

    struct Campaign {
        address payable creator;
        string title;
        string description;
        uint256 goal;
        uint256 totalRaised;
        uint64 deadline;
        bool withdrawn;
    }

    mapping(uint256 => Campaign) private campaigns;
    mapping(uint256 => mapping(address => uint256)) public contributions;

    uint256 private unlocked = 1;
    modifier nonReentrant() {
        require(unlocked == 1, "Reentrant call");
        unlocked = 2;
        _;
        unlocked = 1;
    }

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed creator,
        string title,
        uint256 goal,
        uint256 deadline
    );
    event DonationReceived(uint256 indexed campaignId, address indexed donor, uint256 amount);
    event FundsWithdrawn(uint256 indexed campaignId, address indexed creator, uint256 amount);
    event RefundClaimed(uint256 indexed campaignId, address indexed donor, uint256 amount);

    function createCampaign(
        string calldata title,
        string calldata description,
        uint256 goal,
        uint64 deadline
    ) external returns (uint256 campaignId) {
        require(bytes(title).length > 0 && bytes(title).length <= 80, "Title: 1-80 chars");
        require(bytes(description).length > 0 && bytes(description).length <= 1000, "Description: 1-1000 chars");
        require(goal > 0, "Goal must be positive");
        require(deadline > block.timestamp, "Deadline must be future");

        campaignId = ++campaignCount;
        campaigns[campaignId] = Campaign({
            creator: payable(msg.sender),
            title: title,
            description: description,
            goal: goal,
            totalRaised: 0,
            deadline: deadline,
            withdrawn: false
        });

        emit CampaignCreated(campaignId, msg.sender, title, goal, deadline);
    }

    function donate(uint256 campaignId) external payable {
        Campaign storage c = campaigns[campaignId];
        require(c.creator != address(0), "Campaign does not exist");
        require(block.timestamp < c.deadline, "Campaign ended");
        require(c.totalRaised < c.goal, "Goal already reached");
        require(msg.value > 0, "Donation must be positive");
        require(msg.value <= c.goal - c.totalRaised, "Donation exceeds remaining goal");

        c.totalRaised += msg.value;
        contributions[campaignId][msg.sender] += msg.value;
        emit DonationReceived(campaignId, msg.sender, msg.value);
    }

    /// @notice Creator can withdraw only after the goal has been fully reached.
    /// @dev Effects happen before external interaction; reentrancy guard also protects this path.
    function withdraw(uint256 campaignId) external nonReentrant {
        Campaign storage c = campaigns[campaignId];
        require(c.creator != address(0), "Campaign does not exist");
        require(msg.sender == c.creator, "Only creator");
        require(!c.withdrawn, "Already withdrawn");
        require(c.totalRaised >= c.goal, "Goal not reached");

        uint256 amount = c.totalRaised;
        c.withdrawn = true;
        (bool ok, ) = c.creator.call{value: amount}("");
        require(ok, "Transfer failed");

        emit FundsWithdrawn(campaignId, c.creator, amount);
    }

    /// @notice Donors can reclaim their contribution only after an unsuccessful campaign expires.
    function refund(uint256 campaignId) external nonReentrant {
        Campaign storage c = campaigns[campaignId];
        require(c.creator != address(0), "Campaign does not exist");
        require(block.timestamp >= c.deadline, "Campaign still active");
        require(c.totalRaised < c.goal, "Goal was reached");

        uint256 amount = contributions[campaignId][msg.sender];
        require(amount > 0, "Nothing to refund");

        contributions[campaignId][msg.sender] = 0;
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "Refund transfer failed");

        emit RefundClaimed(campaignId, msg.sender, amount);
    }

    function getCampaign(uint256 campaignId) external view returns (Campaign memory) {
        require(campaigns[campaignId].creator != address(0), "Campaign does not exist");
        return campaigns[campaignId];
    }
}
