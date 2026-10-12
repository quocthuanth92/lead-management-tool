@us4 @api
Feature: Lead labels
  As a salesperson
  I want to label a lead as potential or spam
  So that I can triage my inbox

  Scenario: Changing a label leaves exactly one label on the lead
    Given a new lead is ingested through the internal API
    And I am signed in as the lead owner
    When I set the label to "POTENTIAL"
    And I set the label to "SPAM"
    Then the response status should be 200
    And the lead label should be "SPAM"
    And the lead has exactly one label

  Scenario: An unknown label is rejected
    Given a new lead is ingested through the internal API
    And I am signed in as the lead owner
    When I set the label to "VIP"
    Then the response status should be 400
