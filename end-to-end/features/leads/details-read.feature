@us2 @api
Feature: Lead details and read tracking
  As a salesperson
  I want opening a lead to show its details and mark it as read
  So that my inbox reflects what I have already reviewed

  Scenario: Opening a lead marks it as read and the inbox reflects it
    Given a new lead is ingested through the internal API
    And I am signed in as the lead owner
    When I open the lead details
    Then the response status should be 200
    And the lead details show the lead as read
    And the lead is no longer unread in the inbox
    And the lead last update did not change

  Scenario: Opening a lead owned by another salesperson returns not found
    Given a new lead is ingested through the internal API
    And I am signed in as the other salesperson
    When I open the lead details
    Then the response status should be 404

  Scenario: Opening a nonexistent lead returns not found
    Given I am signed in as salesperson "A"
    When I open the lead with id "000000000000000000000000"
    Then the response status should be 404

  Scenario: Opening a malformed lead id is rejected
    Given I am signed in as salesperson "A"
    When I open the lead with id "not-an-id"
    Then the response status should be 400
