export const TEST_STATUSES = ["Not Run", "Pass", "Fail", "Blocked"];
export const PRIORITIES = ["Low", "Medium", "High", "Critical"];
export const SEVERITIES = ["Minor", "Major", "Critical"];
export const DEFECT_STATUSES = ["Open", "In Progress", "Fixed", "Retest", "Closed", "Reopened"];

export const EMPTY_TEST_CASE = {
  project_id: "",
  title: "",
  module: "",
  priority: "Medium",
  preconditions: "",
  test_steps: "",
  expected_result: "",
  actual_result: "",
  status: "Not Run",
};

export const EMPTY_DEFECT = {
  project_id: "",
  title: "",
  description: "",
  severity: "Major",
  priority: "Medium",
  steps_to_reproduce: "",
  expected_result: "",
  actual_result: "",
  status: "Open",
};
