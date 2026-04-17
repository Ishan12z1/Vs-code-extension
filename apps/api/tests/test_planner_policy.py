from app.planner.policy import PlannerPolicyBuilder


def test_planner_policy_for_explain_has_no_allowed_actions() -> None:
    builder = PlannerPolicyBuilder()

    policy = builder.build("explain")

    assert policy.requestClass == "explain"
    assert policy.supportsPlanning is False
    assert policy.allowedActions == []
    assert len(policy.policyRules) > 0


def test_planner_policy_for_configure_contains_supported_actions() -> None:
    builder = PlannerPolicyBuilder()

    policy = builder.build("configure")

    assert policy.requestClass == "configure"
    assert policy.supportsPlanning is True

    action_types = {action.actionType for action in policy.allowedActions}

    assert "updateUserSettings" in action_types
    assert "updateWorkspaceSettings" in action_types
    assert "patchVscodeSettingsJson" in action_types
    assert "patchTasksJson" in action_types
    assert "patchLaunchJson" in action_types
    assert "patchExtensionsJson" in action_types
    assert "updateKeybindings" in action_types


def test_planner_policy_assigns_expected_default_risk_and_approval() -> None:
    builder = PlannerPolicyBuilder()

    policy = builder.build("configure")

    entries = {entry.actionType: entry for entry in policy.allowedActions}

    assert entries["updateWorkspaceSettings"].defaultRiskLevel == "low"
    assert entries["updateWorkspaceSettings"].requiresApprovalByDefault is False

    assert entries["updateUserSettings"].defaultRiskLevel == "medium"
    assert entries["updateUserSettings"].requiresApprovalByDefault is True

    assert entries["updateKeybindings"].defaultRiskLevel == "medium"
    assert entries["updateKeybindings"].requiresApprovalByDefault is True

    assert entries["patchTasksJson"].defaultRiskLevel == "medium"
    assert entries["patchTasksJson"].requiresApprovalByDefault is True
